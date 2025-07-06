import { PrismaClient } from '@prisma/client'
import { encoding_for_model } from 'tiktoken'
import { 
  ContextItem,
  ContextCreateInput,
  ContextRule,
  ContextRuleCreateInput,
  Operation,
  ToolType
} from '@forge/shared'
import { AppError } from '../middleware/error'
import { ws } from './WebSocketManager'

export class ContextManager {
  private prisma: PrismaClient
  private tokenEncoder = encoding_for_model('gpt-4')
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }
  
  async createContextItem(input: ContextCreateInput) {
    // Count tokens
    const tokens = this.countTokens(input.content)
    
    const contextItem = await this.prisma.contextItem.create({
      data: {
        ...input,
        tokens
      }
    })
    
    // Notify via WebSocket
    const projectContext = await this.getProjectContext(input.projectId)
    ws.contextUpdate(input.projectId, projectContext)
    
    return contextItem
  }
  
  async updateContextItem(id: string, content: string) {
    const tokens = this.countTokens(content)
    
    const contextItem = await this.prisma.contextItem.update({
      where: { id },
      data: { 
        content,
        tokens,
        updatedAt: new Date()
      }
    })
    
    // Notify via WebSocket
    const projectContext = await this.getProjectContext(contextItem.projectId)
    ws.contextUpdate(contextItem.projectId, projectContext)
    
    return contextItem
  }
  
  async createContextRule(input: ContextRuleCreateInput) {
    const rule = await this.prisma.contextRule.create({
      data: input
    })
    
    return rule
  }
  
  async getProjectContext(projectId: string) {
    const items = await this.prisma.contextItem.findMany({
      where: { projectId },
      orderBy: [
        { lastUsed: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ]
    })
    
    return items
  }
  
  async gatherContext(operation: Operation & { agent: any }): Promise<string> {
    // Get all context items for project
    const items = await this.prisma.contextItem.findMany({
      where: { projectId: operation.projectId }
    })
    
    // Get context rules
    const rules = await this.prisma.contextRule.findMany({
      where: { projectId: operation.projectId }
    })
    
    // Apply rules to filter context
    let included = await this.applyContextRules(items, rules, operation)
    
    // Add explicitly requested context
    if (operation.contextIds && operation.contextIds.length > 0) {
      const explicitItems = items.filter(item => 
        operation.contextIds?.includes(item.id) && 
        !included.find(i => i.id === item.id)
      )
      included = [...included, ...explicitItems]
    }
    
    // Prioritize if too large
    const maxTokens = this.getMaxTokensForTool(operation.tool as ToolType)
    included = this.prioritizeContext(included, maxTokens)
    
    // Update usage stats
    for (const item of included) {
      await this.prisma.contextItem.update({
        where: { id: item.id },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date()
        }
      })
    }
    
    // Build context string
    const contextString = included
      .map(item => `### ${item.name}\n\n${item.content}`)
      .join('\n\n---\n\n')
    
    return contextString
  }
  
  private async applyContextRules(
    items: any[],
    rules: any[],
    operation: Operation & { agent: any }
  ): Promise<any[]> {
    const included: any[] = []
    const excluded = new Set<string>()
    
    for (const rule of rules) {
      // Check if rule applies to this operation
      if (rule.pattern && operation.task.toLowerCase().includes(rule.pattern.toLowerCase())) {
        if (rule.action === 'exclude' && rule.contextItemId) {
          excluded.add(rule.contextItemId)
        } else if (rule.action === 'auto_include' && rule.contextItemId) {
          const item = items.find(i => i.id === rule.contextItemId)
          if (item && !excluded.has(item.id)) {
            included.push(item)
          }
        }
      }
      
      // Check agent-specific rules
      if (rule.agentId === operation.agentId) {
        if (rule.action === 'auto_include' && rule.contextItemId) {
          const item = items.find(i => i.id === rule.contextItemId)
          if (item && !excluded.has(item.id) && !included.find(i => i.id === item.id)) {
            included.push(item)
          }
        }
      }
    }
    
    return included
  }
  
  private prioritizeContext(items: any[], maxTokens: number): any[] {
    // Sort by importance: explicit > recent > frequently used > small
    const sorted = [...items].sort((a, b) => {
      // First by last used (recent first)
      if (a.lastUsed && b.lastUsed) {
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      }
      if (a.lastUsed) return -1
      if (b.lastUsed) return 1
      
      // Then by usage count
      if (a.usageCount !== b.usageCount) {
        return b.usageCount - a.usageCount
      }
      
      // Finally by size (smaller first)
      return a.tokens - b.tokens
    })
    
    const included: any[] = []
    let totalTokens = 0
    const tokenLimit = maxTokens * 0.8 // Leave 20% headroom
    
    for (const item of sorted) {
      if (totalTokens + item.tokens <= tokenLimit) {
        included.push(item)
        totalTokens += item.tokens
      }
    }
    
    return included
  }
  
  private getMaxTokensForTool(tool: ToolType): number {
    const limits: Record<ToolType, number> = {
      'claude_code': 100000,
      'openai_api': 120000,
      'web_chat': 150000
    }
    
    return limits[tool] || 50000
  }
  
  private countTokens(text: string): number {
    try {
      const tokens = this.tokenEncoder.encode(text)
      return tokens.length
    } catch (error) {
      // Fallback to character count estimation
      return Math.ceil(text.length / 4)
    }
  }
  
  // Search context items
  async searchContext(projectId: string, query: string) {
    const items = await this.prisma.contextItem.findMany({
      where: {
        projectId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } }
        ]
      },
      orderBy: { lastUsed: 'desc' }
    })
    
    return items
  }
  
  // Get context statistics
  async getContextStats(projectId: string) {
    const items = await this.prisma.contextItem.findMany({
      where: { projectId }
    })
    
    const totalTokens = items.reduce((sum, item) => sum + item.tokens, 0)
    const totalItems = items.length
    const averageTokens = totalItems > 0 ? Math.round(totalTokens / totalItems) : 0
    
    const byType = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      totalItems,
      totalTokens,
      averageTokens,
      byType,
      mostUsed: items.sort((a, b) => b.usageCount - a.usageCount).slice(0, 5),
      recentlyUsed: items.filter(i => i.lastUsed).sort((a, b) => 
        new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime()
      ).slice(0, 5)
    }
  }
}

// Export singleton instance
let contextManager: ContextManager

export function getContextManager(prisma: PrismaClient) {
  if (!contextManager) {
    contextManager = new ContextManager(prisma)
  }
  return contextManager
}