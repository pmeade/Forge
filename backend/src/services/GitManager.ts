import { PrismaClient } from '@prisma/client'
import simpleGit, { SimpleGit } from 'simple-git'
import path from 'path'
import { mkdir } from 'fs/promises'
import { AppError } from '../middleware/error'
import { ws } from './WebSocketManager'

export class GitManager {
  private prisma: PrismaClient
  private projectsPath: string
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.projectsPath = process.env.PROJECTS_PATH || path.join(process.cwd(), 'projects')
  }
  
  async initializeProject(projectId: string): Promise<void> {
    const projectPath = path.join(this.projectsPath, projectId)
    
    try {
      // Create project directory
      await mkdir(projectPath, { recursive: true })
      
      // Initialize git repository
      const git = simpleGit(projectPath)
      await git.init()
      
      // Create initial commit
      await git.add('.')
      await git.commit('[Forge] Initial project setup')
      
      console.log(`Git repository initialized for project ${projectId}`)
    } catch (error) {
      console.error('Failed to initialize git repository:', error)
      throw new AppError(500, 'Failed to initialize project repository')
    }
  }
  
  async createSnapshot(
    projectId: string, 
    description: string,
    operationId?: string
  ): Promise<string | null> {
    const project = await this.prisma.project.findUnique({ 
      where: { id: projectId } 
    })
    
    if (!project) {
      throw new AppError(404, 'Project not found')
    }
    
    const projectPath = path.join(this.projectsPath, projectId)
    const git = simpleGit(projectPath)
    
    try {
      // Check if there are changes to commit
      const status = await git.status()
      
      if (status.files.length === 0) {
        console.log('No changes to snapshot')
        return null
      }
      
      // Add all changes
      await git.add('.')
      
      // Create commit with descriptive message
      const commitMessage = operationId 
        ? `[AI Snapshot] ${description} (Operation: ${operationId})`
        : `[Manual Snapshot] ${description}`
        
      const commit = await git.commit(commitMessage)
      const commitHash = commit.commit
      
      // Save snapshot reference in database
      const snapshot = await this.prisma.gitSnapshot.create({
        data: {
          projectId,
          commitHash,
          description
        }
      })
      
      // Log event
      await this.prisma.eventLog.create({
        data: {
          eventType: 'git.snapshot_created',
          operationId,
          data: {
            snapshotId: snapshot.id,
            commitHash,
            description,
            filesChanged: status.files.length
          }
        }
      })
      
      // Notify via WebSocket
      ws.send('git.snapshot', {
        projectId,
        snapshot: {
          id: snapshot.id,
          commitHash,
          description,
          createdAt: snapshot.createdAt
        }
      })
      
      return commitHash
    } catch (error: any) {
      console.error('Git snapshot failed:', error)
      
      // Non-critical failure - log but don't throw
      await this.prisma.eventLog.create({
        data: {
          eventType: 'git.snapshot_failed',
          operationId,
          data: {
            error: error.message,
            description
          }
        }
      })
      
      return null
    }
  }
  
  async rollback(snapshotId: string): Promise<void> {
    const snapshot = await this.prisma.gitSnapshot.findUnique({ 
      where: { id: snapshotId },
      include: { project: true }
    })
    
    if (!snapshot) {
      throw new AppError(404, 'Snapshot not found')
    }
    
    const projectPath = path.join(this.projectsPath, snapshot.projectId)
    const git = simpleGit(projectPath)
    
    try {
      // Create a snapshot before rollback
      await this.createSnapshot(
        snapshot.projectId, 
        `Before rollback to: ${snapshot.description}`
      )
      
      // Perform hard reset to snapshot commit
      await git.reset(['--hard', snapshot.commitHash])
      
      // Log rollback event
      await this.prisma.eventLog.create({
        data: {
          eventType: 'git.rollback_completed',
          data: {
            snapshotId,
            commitHash: snapshot.commitHash,
            description: snapshot.description
          }
        }
      })
      
      // Notify via WebSocket
      ws.send('git.rollback', {
        projectId: snapshot.projectId,
        snapshotId,
        commitHash: snapshot.commitHash,
        status: 'completed'
      })
      
    } catch (error: any) {
      console.error('Git rollback failed:', error)
      
      await this.prisma.eventLog.create({
        data: {
          eventType: 'git.rollback_failed',
          data: {
            snapshotId,
            error: error.message
          }
        }
      })
      
      throw new AppError(500, `Rollback failed: ${error.message}`)
    }
  }
  
  async getProjectSnapshots(projectId: string) {
    const snapshots = await this.prisma.gitSnapshot.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to recent 50 snapshots
    })
    
    return snapshots
  }
  
  async getProjectStatus(projectId: string) {
    const projectPath = path.join(this.projectsPath, projectId)
    const git = simpleGit(projectPath)
    
    try {
      const status = await git.status()
      const branch = await git.branch()
      const log = await git.log({ n: 10 })
      
      return {
        currentBranch: branch.current,
        hasChanges: status.files.length > 0,
        modifiedFiles: status.files.filter(f => f.working_dir === 'M').length,
        untrackedFiles: status.files.filter(f => f.working_dir === '?').length,
        ahead: status.ahead,
        behind: status.behind,
        recentCommits: log.all.map(commit => ({
          hash: commit.hash,
          message: commit.message,
          date: commit.date,
          author: commit.author_name
        }))
      }
    } catch (error: any) {
      console.error('Failed to get git status:', error)
      return {
        error: error.message,
        currentBranch: 'unknown',
        hasChanges: false
      }
    }
  }
  
  async createBranch(projectId: string, branchName: string): Promise<void> {
    const projectPath = path.join(this.projectsPath, projectId)
    const git = simpleGit(projectPath)
    
    try {
      // Create and checkout new branch
      await git.checkoutBranch(branchName, 'HEAD')
      
      await this.prisma.eventLog.create({
        data: {
          eventType: 'git.branch_created',
          data: {
            projectId,
            branchName
          }
        }
      })
      
    } catch (error: any) {
      console.error('Failed to create branch:', error)
      throw new AppError(500, `Failed to create branch: ${error.message}`)
    }
  }
  
  async switchBranch(projectId: string, branchName: string): Promise<void> {
    const projectPath = path.join(this.projectsPath, projectId)
    const git = simpleGit(projectPath)
    
    try {
      // Check for uncommitted changes
      const status = await git.status()
      if (status.files.length > 0) {
        // Create snapshot of current work
        await this.createSnapshot(
          projectId,
          `Auto-save before switching to branch: ${branchName}`
        )
      }
      
      // Switch branch
      await git.checkout(branchName)
      
      await this.prisma.eventLog.create({
        data: {
          eventType: 'git.branch_switched',
          data: {
            projectId,
            branchName
          }
        }
      })
      
    } catch (error: any) {
      console.error('Failed to switch branch:', error)
      throw new AppError(500, `Failed to switch branch: ${error.message}`)
    }
  }
  
  async getDiff(projectId: string, commitHash?: string): Promise<string> {
    const projectPath = path.join(this.projectsPath, projectId)
    const git = simpleGit(projectPath)
    
    try {
      if (commitHash) {
        // Show diff for specific commit
        return await git.show([commitHash])
      } else {
        // Show current uncommitted changes
        return await git.diff()
      }
    } catch (error: any) {
      console.error('Failed to get diff:', error)
      throw new AppError(500, `Failed to get diff: ${error.message}`)
    }
  }
}

// Export singleton instance
let gitManager: GitManager

export function getGitManager(prisma: PrismaClient) {
  if (!gitManager) {
    gitManager = new GitManager(prisma)
  }
  return gitManager
}