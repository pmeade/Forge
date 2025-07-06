import { PrismaClient } from '@prisma/client'
import { OperationManager } from '../../services/OperationManager'
import { AppError } from '../../middleware/error'

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    project: {
      findUnique: jest.fn()
    },
    operation: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn()
    },
    agent: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    eventLog: {
      create: jest.fn()
    }
  }
  return { PrismaClient: jest.fn(() => mockPrisma) }
})

// Mock WebSocket
jest.mock('../../services/WebSocketManager', () => ({
  ws: {
    operationCreated: jest.fn(),
    operationUpdate: jest.fn(),
    operationComplete: jest.fn(),
    operationFailed: jest.fn(),
    costUpdate: jest.fn()
  }
}))

describe('OperationManager', () => {
  let prisma: any
  let operationManager: OperationManager
  
  beforeEach(() => {
    prisma = new PrismaClient()
    operationManager = new OperationManager(prisma)
    jest.clearAllMocks()
  })
  
  describe('Budget Management', () => {
    it('should prevent operations exceeding budget', async () => {
      const project = {
        id: 'project-1',
        budgetLimit: 10.00,
        budgetSpent: 9.00
      }
      
      prisma.project.findUnique.mockResolvedValue(project)
      
      await expect(
        operationManager.createOperation({
          projectId: project.id,
          agentId: 'agent-1',
          task: 'expensive task',
          tool: 'claude_code'
        })
      ).rejects.toThrow('Would exceed budget by $1.00')
    })
    
    it('should reserve budget when creating operation', async () => {
      const project = {
        id: 'project-1',
        budgetLimit: 50.00,
        budgetSpent: 10.00
      }
      
      const operation = {
        id: 'op-1',
        projectId: project.id,
        agentId: 'agent-1',
        task: 'test task',
        tool: 'openai_api',
        costEstimate: 0.50,
        status: 'pending_approval'
      }
      
      prisma.project.findUnique.mockResolvedValue(project)
      prisma.operation.create.mockResolvedValue(operation)
      prisma.eventLog.create.mockResolvedValue({})
      
      const result = await operationManager.createOperation({
        projectId: project.id,
        agentId: 'agent-1',
        task: 'test task',
        tool: 'openai_api'
      })
      
      expect(result).toEqual(operation)
      
      // Try to create another expensive operation
      await expect(
        operationManager.createOperation({
          projectId: project.id,
          agentId: 'agent-1',
          task: 'another expensive task that would exceed budget with reservation',
          tool: 'claude_code'
        })
      ).rejects.toThrow(/Would exceed budget/)
    })
    
    it('should clear budget reservation on completion', async () => {
      const operation = {
        id: 'op-1',
        projectId: 'project-1',
        agentId: 'agent-1',
        task: 'test task',
        tool: 'openai_api',
        costEstimate: 1.00,
        status: 'approved',
        agent: { id: 'agent-1', name: 'Test Agent' },
        project: { id: 'project-1', budgetSpent: 10.00 }
      }
      
      prisma.operation.findUnique.mockResolvedValue(operation)
      prisma.operation.update.mockResolvedValue({ ...operation, status: 'complete' })
      prisma.project.update.mockResolvedValue({})
      prisma.agent.findUnique.mockResolvedValue({
        id: 'agent-1',
        successRate: 100,
        totalOperations: 10
      })
      prisma.agent.update.mockResolvedValue({})
      prisma.eventLog.create.mockResolvedValue({})
      
      // Mock the imported functions
      const mockExecute = jest.fn().mockResolvedValue({ output: 'test', cost: 0.80 })
      const mockGatherContext = jest.fn().mockResolvedValue('test context')
      const mockCreateSnapshot = jest.fn().mockResolvedValue('abc123')
      
      jest.doMock('../../services/ToolExecutor', () => ({
        getToolExecutor: () => ({ execute: mockExecute })
      }))
      
      jest.doMock('../../services/ContextManager', () => ({
        getContextManager: () => ({ gatherContext: mockGatherContext })
      }))
      
      jest.doMock('../../services/GitManager', () => ({
        getGitManager: () => ({ createSnapshot: mockCreateSnapshot })
      }))
      
      await operationManager.executeOperation('op-1')
      
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: { budgetSpent: { increment: 0.80 } }
      })
    })
  })
  
  describe('Operation State Transitions', () => {
    it('should transition through correct states', async () => {
      const operation = {
        id: 'op-1',
        projectId: 'project-1',
        status: 'pending_approval'
      }
      
      // Create -> Pending Approval
      prisma.project.findUnique.mockResolvedValue({
        id: 'project-1',
        budgetLimit: 50.00,
        budgetSpent: 0
      })
      prisma.operation.create.mockResolvedValue(operation)
      prisma.eventLog.create.mockResolvedValue({})
      
      const created = await operationManager.createOperation({
        projectId: 'project-1',
        agentId: 'agent-1',
        task: 'test',
        tool: 'openai_api'
      })
      
      expect(created.status).toBe('pending_approval')
      
      // Pending Approval -> Approved
      prisma.operation.update.mockResolvedValue({
        ...operation,
        status: 'approved'
      })
      
      const approved = await operationManager.approveOperation('op-1')
      expect(approved.status).toBe('approved')
      
      // Cannot execute non-approved operation
      prisma.operation.findUnique.mockResolvedValue({
        ...operation,
        status: 'pending_approval'
      })
      
      await expect(
        operationManager.executeOperation('op-1')
      ).rejects.toThrow('Operation must be approved before execution')
    })
  })
})