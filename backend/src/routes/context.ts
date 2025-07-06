import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AppError } from '../middleware/error'
import { getContextManager } from '../services/ContextManager'

const router = Router()
const prisma = new PrismaClient()

// Get context items for project
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const contextManager = getContextManager(prisma)
    const items = await contextManager.getProjectContext(req.params.projectId)
    res.json(items)
  } catch (error) {
    next(error)
  }
})

// Create context item
router.post('/', async (req, res, next) => {
  try {
    const createSchema = z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1).max(255),
      type: z.enum(['document', 'code', 'prompt', 'specification']),
      content: z.string(),
      filePath: z.string().optional()
    })
    
    const data = createSchema.parse(req.body)
    const contextManager = getContextManager(prisma)
    
    const item = await contextManager.createContextItem(data)
    res.status(201).json(item)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid request data'))
    }
    next(error)
  }
})

// Update context item
router.put('/:id', async (req, res, next) => {
  try {
    const updateSchema = z.object({
      content: z.string()
    })
    
    const data = updateSchema.parse(req.body)
    const contextManager = getContextManager(prisma)
    
    const item = await contextManager.updateContextItem(req.params.id, data.content)
    res.json(item)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid request data'))
    }
    next(error)
  }
})

// Delete context item
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.contextItem.delete({
      where: { id: req.params.id }
    })
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// Search context
router.get('/project/:projectId/search', async (req, res, next) => {
  try {
    const { q } = req.query
    if (!q || typeof q !== 'string') {
      return res.json([])
    }
    
    const contextManager = getContextManager(prisma)
    const items = await contextManager.searchContext(req.params.projectId, q)
    res.json(items)
  } catch (error) {
    next(error)
  }
})

// Get context statistics
router.get('/project/:projectId/stats', async (req, res, next) => {
  try {
    const contextManager = getContextManager(prisma)
    const stats = await contextManager.getContextStats(req.params.projectId)
    res.json(stats)
  } catch (error) {
    next(error)
  }
})

// Context rules management
router.get('/project/:projectId/rules', async (req, res, next) => {
  try {
    const rules = await prisma.contextRule.findMany({
      where: { projectId: req.params.projectId },
      include: { contextItem: true }
    })
    res.json(rules)
  } catch (error) {
    next(error)
  }
})

router.post('/rules', async (req, res, next) => {
  try {
    const ruleSchema = z.object({
      projectId: z.string().uuid(),
      pattern: z.string().optional(),
      action: z.enum(['auto_include', 'suggest', 'exclude']),
      contextItemId: z.string().uuid().optional(),
      agentId: z.string().uuid().optional(),
      role: z.string().optional()
    })
    
    const data = ruleSchema.parse(req.body)
    const contextManager = getContextManager(prisma)
    
    const rule = await contextManager.createContextRule(data)
    res.status(201).json(rule)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid request data'))
    }
    next(error)
  }
})

router.delete('/rules/:id', async (req, res, next) => {
  try {
    await prisma.contextRule.delete({
      where: { id: req.params.id }
    })
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export default router