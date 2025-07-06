import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/error'
import { ws } from './services/WebSocketManager'

dotenv.config()

const app = express()
const server = createServer(app)
const prisma = new PrismaClient()

// Initialize WebSocket
ws.initialize(server)

// Middleware
app.use(cors())
app.use(express.json())

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Apply auth middleware to all routes except health check
app.use('/api', authMiddleware)

// Import routes
import projectRoutes from './routes/projects'
import agentRoutes from './routes/agents'
import operationRoutes from './routes/operations'
import contextRoutes from './routes/context'
import gitRoutes from './routes/git'
import producerRoutes from './routes/producer'

// Mount routes
app.use('/api/projects', projectRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/operations', operationRoutes)
app.use('/api/context', contextRoutes)
app.use('/api/git', gitRoutes)
app.use('/api/producer', producerRoutes)

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const agentCount = await prisma.agent.count()
    res.json({ 
      status: 'connected', 
      agentCount,
      timestamp: new Date().toISOString() 
    })
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' })
  }
})

// Error handling middleware (must be last)
app.use(errorHandler)

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`WebSocket server ready`)
})