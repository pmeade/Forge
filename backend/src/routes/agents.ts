import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AppError } from '../middleware/error'

const router = Router()
const prisma = new PrismaClient()

// Get all agents
router.get('/', async (req, res, next) => {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { name: 'asc' }
    })
    res.json(agents)
  } catch (error) {
    next(error)
  }
})

// Get single agent
router.get('/:id', async (req, res, next) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id }
    })
    
    if (!agent) {
      throw new AppError(404, 'Agent not found')
    }
    
    res.json(agent)
  } catch (error) {
    next(error)
  }
})

// Get agent performance stats
router.get('/:id/performance', async (req, res, next) => {
  try {
    const agentId = req.params.id
    const { projectId } = req.query
    
    const whereClause: any = { agentId }
    if (projectId) {
      whereClause.projectId = projectId as string
    }
    
    const operations = await prisma.operation.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100 // Last 100 operations
    })
    
    const completedOps = operations.filter(op => op.status === 'complete')
    const failedOps = operations.filter(op => op.status === 'failed')
    
    const totalCost = completedOps.reduce((sum, op) => 
      sum + Number(op.actualCost || 0), 0
    )
    
    const avgDuration = completedOps.length > 0
      ? completedOps.reduce((sum, op) => {
          if (op.startedAt && op.completedAt) {
            return sum + (new Date(op.completedAt).getTime() - new Date(op.startedAt).getTime())
          }
          return sum
        }, 0) / completedOps.length
      : 0
    
    const performance = {
      agentId,
      totalOperations: operations.length,
      completedOperations: completedOps.length,
      failedOperations: failedOps.length,
      successRate: operations.length > 0 
        ? (completedOps.length / operations.length) * 100 
        : 0,
      totalCost,
      averageCost: completedOps.length > 0 ? totalCost / completedOps.length : 0,
      averageDuration: Math.round(avgDuration / 1000), // seconds
      recentOperations: operations.slice(0, 10)
    }
    
    res.json(performance)
  } catch (error) {
    next(error)
  }
})

// Update agent (admin only)
router.put('/:id', async (req, res, next) => {
  try {
    const updateSchema = z.object({
      name: z.string().optional(),
      capability: z.string().optional(),
      basePrompt: z.string().optional()
    })
    
    const data = updateSchema.parse(req.body)
    
    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data
    })
    
    res.json(agent)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid request data'))
    }
    next(error)
  }
})

export default router