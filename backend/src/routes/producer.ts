import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import OpenAI from 'openai'
import { AppError } from '../middleware/error'
import { ws } from '../services/WebSocketManager'

const router = Router()
const prisma = new PrismaClient()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const PRODUCER_SYSTEM_PROMPT = `You are the Producer AI for Forge, an AI team management system. Your role is to:

1. Understand user requests and break them down into actionable tasks
2. Assign appropriate agents to tasks based on their capabilities
3. Suggest context and tool selection for each operation
4. Coordinate multi-step workflows across different agents
5. Provide clear work plans with cost estimates

Available Agents:
- Lead Engineer: Full-stack development and architecture
- QA Specialist: Testing and quality assurance
- Designer: UI/UX design and frontend development
- Security Specialist: Security analysis and implementation
- Documentation Writer: Technical documentation and communication

Available Tools:
- claude_code: For complex implementation tasks (est. $2-5 per operation)
- openai_api: For quick analysis and generation tasks (est. $0.50-2 per operation)
- web_chat: For strategic planning requiring human input (no API cost)

When creating work plans:
1. Break down complex requests into phases
2. Assign the most appropriate agent for each task
3. Consider dependencies between tasks
4. Provide realistic cost estimates
5. Suggest relevant context items

Format work plans as structured JSON when appropriate for the UI to parse.`

// Send message to Producer
router.post('/message', async (req, res, next) => {
  try {
    const messageSchema = z.object({
      projectId: z.string().uuid(),
      message: z.string().min(1)
    })
    
    const data = messageSchema.parse(req.body)
    
    // Get project and recent conversation history
    const [project, recentMessages] = await Promise.all([
      prisma.project.findUnique({ where: { id: data.projectId } }),
      prisma.conversation.findMany({
        where: { projectId: data.projectId },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])
    
    if (!project) {
      throw new AppError(404, 'Project not found')
    }
    
    // Build conversation history
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: PRODUCER_SYSTEM_PROMPT },
      { 
        role: 'system', 
        content: `Current project: ${project.name}
Budget: $${Number(project.budgetSpent).toFixed(2)} / $${Number(project.budgetLimit).toFixed(2)}
Phase: ${project.currentPhase || 'Not specified'}`
      }
    ]
    
    // Add recent conversation history (in chronological order)
    recentMessages.reverse().forEach(msg => {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })
    })
    
    // Add current message
    messages.push({ role: 'user', content: data.message })
    
    // Save user message
    await prisma.conversation.create({
      data: {
        projectId: data.projectId,
        role: 'user',
        content: data.message
      }
    })
    
    // Get Producer response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 2000
    })
    
    const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.'
    
    // Save assistant response
    await prisma.conversation.create({
      data: {
        projectId: data.projectId,
        role: 'assistant',
        content: response
      }
    })
    
    // Parse work plan if present
    let workPlan = null
    try {
      // Look for JSON work plan in the response
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        workPlan = JSON.parse(jsonMatch[1])
      }
    } catch (error) {
      // Not a structured work plan, that's fine
    }
    
    res.json({ 
      response,
      workPlan,
      projectId: data.projectId
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid request data'))
    }
    next(error)
  }
})

// Get conversation history
router.get('/project/:projectId/history', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    
    const messages = await prisma.conversation.findMany({
      where: { 
        projectId: req.params.projectId,
        operationId: null // Only Producer conversations
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    })
    
    res.json(messages.reverse()) // Return in chronological order
  } catch (error) {
    next(error)
  }
})

// Clear conversation history
router.delete('/project/:projectId/history', async (req, res, next) => {
  try {
    await prisma.conversation.deleteMany({
      where: { 
        projectId: req.params.projectId,
        operationId: null
      }
    })
    
    res.json({ success: true, message: 'Conversation history cleared' })
  } catch (error) {
    next(error)
  }
})

// Generate work plan from description
router.post('/generate-plan', async (req, res, next) => {
  try {
    const planSchema = z.object({
      projectId: z.string().uuid(),
      description: z.string().min(1),
      contextIds: z.array(z.string().uuid()).optional()
    })
    
    const data = planSchema.parse(req.body)
    
    // Get project and agents
    const [project, agents] = await Promise.all([
      prisma.project.findUnique({ where: { id: data.projectId } }),
      prisma.agent.findMany()
    ])
    
    if (!project) {
      throw new AppError(404, 'Project not found')
    }
    
    const planPrompt = `Generate a detailed work plan for the following task:

Task Description: ${data.description}

Available Agents:
${agents.map(a => `- ${a.name}: ${a.capability}`).join('\n')}

Budget Remaining: $${(Number(project.budgetLimit) - Number(project.budgetSpent)).toFixed(2)}

Create a structured JSON work plan with:
- phases: Array of work phases
- Each phase should have:
  - name: Phase name
  - operations: Array of operations
  - Each operation should have:
    - agent: Agent name
    - task: Specific task description
    - tool: One of [claude_code, openai_api, web_chat]
    - estimatedCost: Estimated cost in dollars
    - context: Array of context descriptions needed

Keep the total estimated cost under budget.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: PRODUCER_SYSTEM_PROMPT },
        { role: 'user', content: planPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
    
    const workPlan = JSON.parse(completion.choices[0]?.message?.content || '{}')
    
    res.json(workPlan)
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, 'Invalid request data'))
    }
    next(error)
  }
})

export default router