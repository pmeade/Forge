import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'
import { 
  Operation,
  OperationResult,
  ToolType
} from '@forge/shared'
import { AppError } from '../middleware/error'
import { ws } from './WebSocketManager'
import { getContextManager } from './ContextManager'

const execAsync = promisify(exec)

export class ToolExecutor {
  private prisma: PrismaClient
  private openai: OpenAI
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  
  async execute(operation: Operation & { agent: any }, context: string): Promise<OperationResult> {
    switch (operation.tool as ToolType) {
      case 'claude_code':
        return this.executeClaudeCode(operation, context)
      case 'openai_api':
        return this.executeOpenAI(operation, context)
      case 'web_chat':
        return this.generateWebChatHandoff(operation, context)
      default:
        throw new AppError(400, `Unknown tool: ${operation.tool}`)
    }
  }
  
  private async executeClaudeCode(
    operation: Operation & { agent: any }, 
    context: string
  ): Promise<OperationResult> {
    const claudePath = process.env.CLAUDE_CODE_PATH || 'claude-code'
    
    // Create prompt combining agent prompt, context, and task
    const prompt = `${operation.agent.basePrompt}

Context:
${context}

Task: ${operation.task}`
    
    // Write prompt to temporary file
    const tempFile = path.join('/tmp', `claude-${operation.id}-${randomUUID()}.txt`)
    await writeFile(tempFile, prompt, 'utf-8')
    
    try {
      // Execute claude-code
      const projectPath = process.env.PROJECTS_PATH || '/tmp'
      const command = `${claudePath} --file ${tempFile} --project ${path.join(projectPath, operation.projectId)}`
      
      ws.agentOutput({
        agentId: operation.agentId,
        operationId: operation.id,
        output: `Executing: ${command}\n`
      })
      
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 600000 // 10 minute timeout
      })
      
      if (stderr) {
        console.error('Claude Code stderr:', stderr)
      }
      
      // Stream output to client
      ws.agentOutput({
        agentId: operation.agentId,
        operationId: operation.id,
        output: stdout,
        isComplete: true
      })
      
      // Parse cost from output (this is a placeholder - actual implementation would parse claude-code output)
      const cost = this.parseClaudeCost(stdout) || Number(operation.costEstimate)
      
      return {
        output: stdout,
        cost,
        duration: Date.now() - new Date(operation.startedAt || operation.createdAt).getTime()
      }
      
    } finally {
      // Clean up temp file
      try {
        await unlink(tempFile)
      } catch (error) {
        console.error('Failed to delete temp file:', error)
      }
    }
  }
  
  private async executeOpenAI(
    operation: Operation & { agent: any }, 
    context: string
  ): Promise<OperationResult> {
    const startTime = Date.now()
    
    // Create messages for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: operation.agent.basePrompt },
      { role: 'user', content: `Context:\n${context}\n\nTask: ${operation.task}` }
    ]
    
    // Stream response
    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      stream: true
    })
    
    let fullResponse = ''
    let promptTokens = 0
    let completionTokens = 0
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      fullResponse += content
      
      // Stream to client
      if (content) {
        ws.agentOutput({
          agentId: operation.agentId,
          operationId: operation.id,
          output: content,
          isComplete: false
        })
      }
      
      // Track token usage (approximation)
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens || 0
        completionTokens = chunk.usage.completion_tokens || 0
      }
    }
    
    // Mark stream as complete
    ws.agentOutput({
      agentId: operation.agentId,
      operationId: operation.id,
      output: '',
      isComplete: true
    })
    
    // Calculate cost (GPT-4 Turbo pricing as of 2024)
    const promptCost = (promptTokens / 1000) * 0.03
    const completionCost = (completionTokens / 1000) * 0.06
    const totalCost = Math.round((promptCost + completionCost) * 100) / 100
    
    return {
      output: fullResponse,
      cost: totalCost || Number(operation.costEstimate),
      duration: Date.now() - startTime
    }
  }
  
  private async generateWebChatHandoff(
    operation: Operation & { agent: any }, 
    context: string
  ): Promise<OperationResult> {
    const handoff = {
      task: operation.task,
      context: context,
      agent: operation.agent.name,
      agentPrompt: operation.agent.basePrompt,
      projectId: operation.projectId,
      operationId: operation.id,
      timestamp: new Date().toISOString(),
      returnFormat: `Please paste your complete response back into the app using the "Import Web Chat Response" feature.
      
Expected format:
{
  "operationId": "${operation.id}",
  "response": "Your complete response here",
  "additionalContext": "Any new context or findings that should be saved"
}`
    }
    
    // Save handoff document
    await this.prisma.eventLog.create({
      data: {
        eventType: 'web_chat.handoff_created',
        operationId: operation.id,
        data: handoff
      }
    })
    
    const output = `Web Chat Handoff Document Generated:

${JSON.stringify(handoff, null, 2)}

Instructions:
1. Copy the above JSON document
2. Open your web chat interface (Claude.ai, ChatGPT, etc.)
3. Paste the document as your first message
4. After receiving the response, copy it back into this app
5. Use the "Import Web Chat Response" feature to complete this operation`
    
    ws.agentOutput({
      agentId: operation.agentId,
      operationId: operation.id,
      output,
      isComplete: true
    })
    
    return {
      output,
      cost: 0, // Manual work has no API cost
      duration: 0
    }
  }
  
  // Import web chat response
  async importWebChatResponse(operationId: string, response: any): Promise<OperationResult> {
    const operation = await this.prisma.operation.findUnique({
      where: { id: operationId }
    })
    
    if (!operation) {
      throw new AppError(404, 'Operation not found')
    }
    
    if (operation.tool !== 'web_chat') {
      throw new AppError(400, 'This operation does not use web chat')
    }
    
    if (operation.status !== 'running') {
      throw new AppError(400, 'Operation is not in running state')
    }
    
    // Validate response format
    if (!response.response) {
      throw new AppError(400, 'Invalid response format - missing response field')
    }
    
    // Save additional context if provided
    if (response.additionalContext) {
      const contextManager = getContextManager(this.prisma)
      await contextManager.createContextItem({
        projectId: operation.projectId,
        name: `Web Chat Response - ${new Date().toISOString()}`,
        type: 'document',
        content: response.additionalContext
      })
    }
    
    // Log import
    await this.prisma.eventLog.create({
      data: {
        eventType: 'web_chat.response_imported',
        operationId,
        data: response
      }
    })
    
    return {
      output: response.response,
      cost: 0,
      duration: Date.now() - new Date(operation.startedAt || operation.createdAt).getTime()
    }
  }
  
  private parseClaudeCost(output: string): number | null {
    // This is a placeholder - actual implementation would parse claude-code output
    // for cost information if available
    const costMatch = output.match(/Cost: \$(\d+\.\d+)/)
    if (costMatch) {
      return parseFloat(costMatch[1])
    }
    return null
  }
  
  private sendWebSocketUpdate(operationId: string, data: any) {
    ws.send('operation.update', {
      operationId,
      ...data
    })
  }
}

// Export singleton instance
let toolExecutor: ToolExecutor

export function getToolExecutor(prisma: PrismaClient) {
  if (!toolExecutor) {
    toolExecutor = new ToolExecutor(prisma)
  }
  return toolExecutor
}