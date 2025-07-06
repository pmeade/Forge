import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { AppError } from '../middleware/error'
import { getGitManager } from '../services/GitManager'

const router = Router()
const prisma = new PrismaClient()

// Create snapshot
router.post('/snapshot', async (req, res, next) => {
  try {
    const snapshotSchema = z.object({
      projectId: z.string().uuid(),
      description: z.string().min(1)
    })
    
    const data = snapshotSchema.parse(req.body)
    const gitManager = getGitManager(prisma)
    
    const commitHash = await gitManager.createSnapshot(
      data.projectId,
      data.description
    )
    
    res.json({ 
      success: true, 
      commitHash,
      message: commitHash ? 'Snapshot created' : 'No changes to commit'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid request data'))
    }
    next(error)
  }
})

// Get project snapshots
router.get('/project/:projectId/snapshots', async (req, res, next) => {
  try {
    const gitManager = getGitManager(prisma)
    const snapshots = await gitManager.getProjectSnapshots(req.params.projectId)
    res.json(snapshots)
  } catch (error) {
    next(error)
  }
})

// Rollback to snapshot
router.post('/rollback/:snapshotId', async (req, res, next) => {
  try {
    const gitManager = getGitManager(prisma)
    await gitManager.rollback(req.params.snapshotId)
    res.json({ success: true, message: 'Rollback completed' })
  } catch (error) {
    next(error)
  }
})

// Get project Git status
router.get('/project/:projectId/status', async (req, res, next) => {
  try {
    const gitManager = getGitManager(prisma)
    const status = await gitManager.getProjectStatus(req.params.projectId)
    res.json(status)
  } catch (error) {
    next(error)
  }
})

// Get diff
router.get('/project/:projectId/diff', async (req, res, next) => {
  try {
    const { commit } = req.query
    const gitManager = getGitManager(prisma)
    
    const diff = await gitManager.getDiff(
      req.params.projectId,
      commit as string | undefined
    )
    
    res.json({ diff })
  } catch (error) {
    next(error)
  }
})

// Create branch
router.post('/project/:projectId/branch', async (req, res, next) => {
  try {
    const branchSchema = z.object({
      name: z.string().min(1).regex(/^[a-zA-Z0-9\-_/]+$/)
    })
    
    const data = branchSchema.parse(req.body)
    const gitManager = getGitManager(prisma)
    
    await gitManager.createBranch(req.params.projectId, data.name)
    res.json({ success: true, message: `Branch '${data.name}' created` })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid branch name'))
    }
    next(error)
  }
})

// Switch branch
router.post('/project/:projectId/checkout', async (req, res, next) => {
  try {
    const checkoutSchema = z.object({
      branch: z.string().min(1)
    })
    
    const data = checkoutSchema.parse(req.body)
    const gitManager = getGitManager(prisma)
    
    await gitManager.switchBranch(req.params.projectId, data.branch)
    res.json({ success: true, message: `Switched to branch '${data.branch}'` })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid branch name'))
    }
    next(error)
  }
})

export default router