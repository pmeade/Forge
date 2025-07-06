import { PrismaClient } from '@prisma/client'
import { 
  Operation, 
  OperationCreateInput, 
  OperationResult,
  ToolType 
} from '@forge/shared'
import { AppError } from '../middleware/error'
import { ws } from './WebSocketManager'

export class OperationManager {
  private prisma: PrismaClient
  private budgetReserved = new Map<string, number>()
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }
  
  async createOperation(params: OperationCreateInput & { contextIds?: string[] }) {
    // Estimate cost based on tool and task complexity
    const estimate = await this.estimateCost(params)
    
    // Get project with budget info
    const project = await this.prisma.project.findUnique({ 
      where: { id: params.projectId } 
    })
    
    if (!project) {
      throw new AppError(404, 'Project not found')
    }
    
    // Check budget with reservations
    const reserved = this.budgetReserved.get(params.projectId) || 0
    const totalCommitted = Number(project.budgetSpent) + reserved + estimate
    
    if (totalCommitted > Number(project.budgetLimit)) {
      const overage = (totalCommitted - Number(project.budgetLimit)).toFixed(2)
      throw new AppError(400, `Would exceed budget by $${overage}`)
    }
    
    // Reserve budget
    this.budgetReserved.set(params.projectId, reserved + estimate)
    
    // Create operation
    const operation = await this.prisma.operation.create({
      data: {
        projectId: params.projectId,
        agentId: params.agentId,
        task: params.task,
        tool: params.tool,
        costEstimate: estimate,
        status: 'pending_approval'
      },
      include: {
        agent: true,
        project: true
      }
    })
    
    // Log event
    await this.logEvent('operation.created', operation.id, { 
      operation, 
      contextIds: params.contextIds 
    })
    
    // Notify via WebSocket
    ws.operationCreated(operation)
    
    return operation
  }
  
  async approveOperation(operationId: string) {
    const operation = await this.prisma.operation.update({
      where: { id: operationId },
      data: { status: 'approved' }
    })
    
    await this.logEvent('operation.approved', operationId, {})
    ws.operationUpdate(operationId, { status: 'approved' })
    
    return operation
  }
  
  async executeOperation(operationId: string) {
    const operation = await this.prisma.operation.findUnique({ 
      where: { id: operationId },
      include: { agent: true, project: true }
    })
    
    if (!operation) {
      throw new AppError(404, 'Operation not found')
    }
    
    if (operation.status !== 'approved') {
      throw new AppError(400, 'Operation must be approved before execution')
    }
    
    try {
      // Update status to running
      await this.prisma.operation.update({
        where: { id: operationId },
        data: { 
          status: 'running',
          startedAt: new Date()
        }
      })
      
      ws.operationUpdate(operationId, { status: 'running' })
      await this.logEvent('operation.started', operationId, {})
      
      // Get context and execute operation
      const { getContextManager } = await import('./ContextManager')
      const { getToolExecutor } = await import('./ToolExecutor')
      const { getGitManager } = await import('./GitManager')
      
      const contextManager = getContextManager(this.prisma)
      const toolExecutor = getToolExecutor(this.prisma)
      const gitManager = getGitManager(this.prisma)
      
      // Create git snapshot before operation
      await gitManager.createSnapshot(
        operation.projectId,
        `Before: ${operation.task.substring(0, 50)}...`,
        operationId
      )
      
      // Gather context
      const context = await contextManager.gatherContext(operation)
      
      // Execute operation
      const result = await toolExecutor.execute(operation, context)
      
      // Update operation with results
      await this.prisma.operation.update({
        where: { id: operationId },
        data: {
          status: 'complete',
          actualCost: result.cost,
          completedAt: new Date()
        }
      })
      
      // Update project budget
      await this.prisma.project.update({
        where: { id: operation.projectId },
        data: { 
          budgetSpent: { 
            increment: result.cost 
          } 
        }
      })
      
      // Clear reservation
      const reserved = this.budgetReserved.get(operation.projectId) || 0
      const newReserved = Math.max(0, reserved - Number(operation.costEstimate))
      this.budgetReserved.set(operation.projectId, newReserved)
      
      // Update agent stats
      await this.updateAgentStats(operation.agentId, true)
      
      await this.logEvent('operation.completed', operationId, { result })
      ws.operationComplete(operationId, result)
      ws.costUpdate({
        projectId: operation.projectId,
        totalCost: Number(operation.project.budgetSpent) + result.cost,
        operationId,
        increment: result.cost
      })
      
      return result
      
    } catch (error: any) {
      // Handle failure
      await this.prisma.operation.update({
        where: { id: operationId },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date()
        }
      })
      
      // Clear reservation
      const reserved = this.budgetReserved.get(operation.projectId) || 0
      const newReserved = Math.max(0, reserved - Number(operation.costEstimate))
      this.budgetReserved.set(operation.projectId, newReserved)
      
      // Update agent stats
      await this.updateAgentStats(operation.agentId, false)
      
      await this.logEvent('operation.failed', operationId, { 
        error: error.message,
        stack: error.stack 
      })
      
      ws.operationFailed(operationId, error.message)
      
      throw error
    }
  }
  
  async cancelOperation(operationId: string) {
    const operation = await this.prisma.operation.findUnique({
      where: { id: operationId }
    })
    
    if (!operation) {
      throw new AppError(404, 'Operation not found')
    }
    
    if (operation.status === 'complete' || operation.status === 'failed') {
      throw new AppError(400, 'Cannot cancel completed operation')
    }
    
    await this.prisma.operation.update({
      where: { id: operationId },
      data: { 
        status: 'cancelled',
        completedAt: new Date()
      }
    })
    
    // Clear reservation if pending
    if (operation.status === 'pending_approval' || operation.status === 'approved') {
      const reserved = this.budgetReserved.get(operation.projectId) || 0
      const newReserved = Math.max(0, reserved - Number(operation.costEstimate))
      this.budgetReserved.set(operation.projectId, newReserved)
    }
    
    await this.logEvent('operation.cancelled', operationId, {})
    ws.operationUpdate(operationId, { status: 'cancelled' })
    
    return operation
  }
  
  private async estimateCost(params: OperationCreateInput): Promise<number> {
    // Base cost estimates by tool
    const baseCosts: Record<ToolType, number> = {
      'claude_code': 2.00,
      'openai_api': 0.50,
      'web_chat': 0.00 // Manual work
    }
    
    let cost = baseCosts[params.tool] || 1.00
    
    // Adjust based on task complexity (simple heuristic)
    const taskLength = params.task.length
    if (taskLength > 500) cost *= 1.5
    if (taskLength > 1000) cost *= 2
    
    // Round to 2 decimal places
    return Math.round(cost * 100) / 100
  }
  
  private async updateAgentStats(agentId: string, success: boolean) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId }
    })
    
    if (!agent) return
    
    const newTotal = agent.totalOperations + 1
    const successCount = Math.round(agent.successRate * agent.totalOperations / 100) + (success ? 1 : 0)
    const newRate = Math.round(successCount * 100 / newTotal)
    
    await this.prisma.agent.update({
      where: { id: agentId },
      data: {
        totalOperations: newTotal,
        successRate: newRate
      }
    })
  }
  
  private async logEvent(eventType: string, operationId: string | null, data: any) {
    await this.prisma.eventLog.create({
      data: {
        eventType,
        operationId,
        data
      }
    })
  }
  
  // Get operations for a project
  async getProjectOperations(projectId: string) {
    return this.prisma.operation.findMany({
      where: { projectId },
      include: { agent: true },
      orderBy: { createdAt: 'desc' }
    })
  }
  
  // Get pending approvals across all projects
  async getPendingApprovals() {
    return this.prisma.operation.findMany({
      where: { status: 'pending_approval' },
      include: { 
        agent: true,
        project: true 
      },
      orderBy: { createdAt: 'asc' }
    })
  }
}

// Export singleton instance
let operationManager: OperationManager

export function getOperationManager(prisma: PrismaClient) {
  if (!operationManager) {
    operationManager = new OperationManager(prisma)
  }
  return operationManager
}