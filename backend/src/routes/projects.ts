import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AppError } from '../middleware/error'
import { getGitManager } from '../services/GitManager'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  budgetLimit: z.number().positive(),
  currentPhase: z.string().optional()
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
  currentPhase: z.string().optional(),
  budgetLimit: z.number().positive().optional()
})

// Get all projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(projects)
  } catch (error) {
    next(error)
  }
})

// Get single project
router.get('/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            operations: true,
            contextItems: true
          }
        }
      }
    })
    
    if (!project) {
      throw new AppError(404, 'Project not found')
    }
    
    res.json(project)
  } catch (error) {
    next(error)
  }
})

// Create project
router.post('/', async (req, res, next) => {
  try {
    const data = createProjectSchema.parse(req.body)
    
    const project = await prisma.project.create({
      data: {
        name: data.name,
        budgetLimit: data.budgetLimit,
        currentPhase: data.currentPhase
      }
    })
    
    // Initialize Git repository for project
    const gitManager = getGitManager(prisma)
    await gitManager.initializeProject(project.id)
    
    res.status(201).json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid request data'))
    }
    next(error)
  }
})

// Update project
router.put('/:id', async (req, res, next) => {
  try {
    const data = updateProjectSchema.parse(req.body)
    
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data
    })
    
    res.json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid request data'))
    }
    next(error)
  }
})

// Delete project
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.project.delete({
      where: { id: req.params.id }
    })
    
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// Get project statistics
router.get('/:id/stats', async (req, res, next) => {
  try {
    const projectId = req.params.id
    
    const [project, operations, contextItems] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.operation.findMany({ where: { projectId } }),
      prisma.contextItem.findMany({ where: { projectId } })
    ])
    
    if (!project) {
      throw new AppError(404, 'Project not found')
    }
    
    const stats = {
      totalOperations: operations.length,
      completedOperations: operations.filter(op => op.status === 'complete').length,
      failedOperations: operations.filter(op => op.status === 'failed').length,
      pendingOperations: operations.filter(op => op.status === 'pending_approval').length,
      totalContextItems: contextItems.length,
      totalContextTokens: contextItems.reduce((sum, item) => sum + item.tokens, 0),
      budgetUsed: Number(project.budgetSpent),
      budgetRemaining: Number(project.budgetLimit) - Number(project.budgetSpent),
      budgetPercentage: (Number(project.budgetSpent) / Number(project.budgetLimit)) * 100
    }
    
    res.json(stats)
  } catch (error) {
    next(error)
  }
})

export default router