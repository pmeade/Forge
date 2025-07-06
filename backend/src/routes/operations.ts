import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AppError } from '../middleware/error'
import { getOperationManager } from '../services/OperationManager'
import { getToolExecutor } from '../services/ToolExecutor'

const router = Router()
const prisma = new PrismaClient()

// Create operation
router.post('/', async (req, res, next) => {
  try {
    const createSchema = z.object({
      projectId: z.string().uuid(),
      agentId: z.string().uuid(),
      task: z.string().min(1),
      tool: z.enum(['claude_code', 'openai_api', 'web_chat']),
      contextIds: z.array(z.string().uuid()).optional()
    })
    
    const data = createSchema.parse(req.body)
    const operationManager = getOperationManager(prisma)
    
    const operation = await operationManager.createOperation(data)
    res.status(201).json(operation)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid request data'))
    }
    next(error)
  }
})

// Get operations for project
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const operationManager = getOperationManager(prisma)
    const operations = await operationManager.getProjectOperations(req.params.projectId)
    res.json(operations)
  } catch (error) {
    next(error)
  }
})

// Get pending approvals
router.get('/pending', async (req, res, next) => {
  try {
    const operationManager = getOperationManager(prisma)
    const operations = await operationManager.getPendingApprovals()
    res.json(operations)
  } catch (error) {
    next(error)
  }
})

// Get single operation
router.get('/:id', async (req, res, next) => {
  try {
    const operation = await prisma.operation.findUnique({
      where: { id: req.params.id },
      include: {
        agent: true,
        project: true
      }
    })
    
    if (!operation) {
      throw new AppError(404, 'Operation not found')
    }
    
    res.json(operation)
  } catch (error) {
    next(error)
  }
})

// Approve operation
router.post('/:id/approve', async (req, res, next) => {
  try {
    const operationManager = getOperationManager(prisma)
    const operation = await operationManager.approveOperation(req.params.id)
    
    // Start execution immediately after approval
    operationManager.executeOperation(req.params.id).catch(error => {
      console.error('Operation execution failed:', error)
    })
    
    res.json(operation)
  } catch (error) {
    next(error)
  }
})

// Cancel operation
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const operationManager = getOperationManager(prisma)
    const operation = await operationManager.cancelOperation(req.params.id)
    res.json(operation)
  } catch (error) {
    next(error)
  }
})

// Import web chat response
router.post('/:id/import-response', async (req, res, next) => {
  try {
    const responseSchema = z.object({
      response: z.string().min(1),
      additionalContext: z.string().optional()
    })
    
    const data = responseSchema.parse(req.body)
    const toolExecutor = getToolExecutor(prisma)
    
    const result = await toolExecutor.importWebChatResponse(req.params.id, data)
    res.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid response format'))
    }
    next(error)
  }
})

// Get operation output
router.get('/:id/output', async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { operationId: req.params.id },
      orderBy: { createdAt: 'asc' }
    })
    
    res.json(conversations)
  } catch (error) {
    next(error)
  }
})

export default router