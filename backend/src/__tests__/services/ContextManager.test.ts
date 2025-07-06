import { PrismaClient } from '@prisma/client'
import { ContextManager } from '../../services/ContextManager'

// Mock tiktoken
jest.mock('tiktoken', () => ({
  encoding_for_model: jest.fn(() => ({
    encode: jest.fn((text: string) => ({ length: Math.ceil(text.length / 4) }))
  }))
}))

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    contextItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    contextRule: {
      create: jest.fn(),
      findMany: jest.fn()
    }
  }
  return { PrismaClient: jest.fn(() => mockPrisma) }
})

// Mock WebSocket
jest.mock('../../services/WebSocketManager', () => ({
  ws: {
    contextUpdate: jest.fn()
  }
}))

describe('ContextManager', () => {
  let prisma: any
  let contextManager: ContextManager
  
  beforeEach(() => {
    prisma = new PrismaClient()
    contextManager = new ContextManager(prisma)
    jest.clearAllMocks()
  })
  
  describe('Context Prioritization', () => {
    it('should prioritize context within token limits', async () => {
      const items = [
        {
          id: '1',
          name: 'huge.md',
          content: 'x'.repeat(200000), // ~50k tokens
          tokens: 50000,
          usageCount: 0,
          lastUsed: null
        },
        {
          id: '2',
          name: 'recent.md',
          content: 'x'.repeat(40000), // ~10k tokens
          tokens: 10000,
          usageCount: 5,
          lastUsed: new Date()
        },
        {
          id: '3',
          name: 'small.md',
          content: 'x'.repeat(4000), // ~1k tokens
          tokens: 1000,
          usageCount: 2,
          lastUsed: null
        }
      ]
      
      prisma.contextItem.findMany.mockResolvedValue(items)
      prisma.contextRule.findMany.mockResolvedValue([])
      
      const operation = {
        id: 'op-1',
        projectId: 'project-1',
        agentId: 'agent-1',
        task: 'test task',
        tool: 'openai_api',
        agent: { id: 'agent-1', name: 'Test Agent' }
      }
      
      const context = await contextManager.gatherContext(operation as any)
      
      // Should include recent.md (10k) and small.md (1k) but not huge.md
      // Max tokens for openai_api is 120k, 80% = 96k
      expect(context).toContain('recent.md')
      expect(context).toContain('small.md')
      expect(context).not.toContain('huge.md')
      
      // Verify usage stats were updated
      expect(prisma.contextItem.update).toHaveBeenCalledTimes(2)
    })
    
    it('should respect context rules', async () => {
      const items = [
        {
          id: '1',
          name: 'always-include.md',
          content: 'Always include this',
          tokens: 100,
          usageCount: 0
        },
        {
          id: '2',
          name: 'exclude-for-test.md',
          content: 'Exclude this for test tasks',
          tokens: 100,
          usageCount: 0
        },
        {
          id: '3',
          name: 'normal.md',
          content: 'Normal context',
          tokens: 100,
          usageCount: 0
        }
      ]
      
      const rules = [
        {
          pattern: 'test',
          action: 'auto_include',
          contextItemId: '1'
        },
        {
          pattern: 'test',
          action: 'exclude',
          contextItemId: '2'
        }
      ]
      
      prisma.contextItem.findMany.mockResolvedValue(items)
      prisma.contextRule.findMany.mockResolvedValue(rules)
      
      const operation = {
        id: 'op-1',
        projectId: 'project-1',
        agentId: 'agent-1',
        task: 'run test suite', // Contains 'test'
        tool: 'openai_api',
        contextIds: ['3'], // Explicitly requested
        agent: { id: 'agent-1', name: 'Test Agent' }
      }
      
      const context = await contextManager.gatherContext(operation as any)
      
      // Should include auto-included and explicitly requested
      expect(context).toContain('Always include this')
      expect(context).toContain('Normal context')
      
      // Should exclude based on rule
      expect(context).not.toContain('Exclude this for test tasks')
    })
  })
  
  describe('Token Counting', () => {
    it('should count tokens when creating context', async () => {
      const content = 'This is a test content with some words'
      const expectedTokens = Math.ceil(content.length / 4)
      
      prisma.contextItem.create.mockResolvedValue({
        id: '1',
        name: 'test.md',
        content,
        tokens: expectedTokens
      })
      
      prisma.contextItem.findMany.mockResolvedValue([])
      
      const result = await contextManager.createContextItem({
        projectId: 'project-1',
        name: 'test.md',
        type: 'document',
        content
      })
      
      expect(prisma.contextItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokens: expectedTokens
        })
      })
    })
  })
})