import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import { 
  WebSocketMessage, 
  WebSocketEventType,
  OperationUpdateData,
  AgentOutputData,
  CostUpdateData
} from '@forge/shared'

export class WebSocketManager {
  private wss: WebSocketServer
  private client: WebSocket | null = null
  
  initialize(server: Server) {
    this.wss = new WebSocketServer({ server })
    
    this.wss.on('connection', (ws) => {
      console.log('Client connected')
      this.client = ws
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(message)
        } catch (error) {
          console.error('Invalid WebSocket message:', error)
        }
      })
      
      ws.on('close', () => {
        console.log('Client disconnected')
        this.client = null
      })
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
      })
      
      // Send initial connection confirmation
      this.send('connection', { status: 'connected' })
    })
  }
  
  private handleMessage(message: any) {
    // Handle incoming messages from client if needed
    console.log('Received message:', message)
  }
  
  send(event: WebSocketEventType | string, data: any) {
    if (this.client && this.client.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { event: event as WebSocketEventType, data }
      this.client.send(JSON.stringify(message))
    }
  }
  
  // Convenience methods
  operationUpdate(operationId: string, update: Partial<OperationUpdateData>) {
    this.send('operation.update', { operationId, ...update })
  }
  
  operationCreated(operation: any) {
    this.send('operation.created', operation)
  }
  
  operationComplete(operationId: string, result: any) {
    this.send('operation.complete', { operationId, ...result })
  }
  
  operationFailed(operationId: string, error: string) {
    this.send('operation.failed', { operationId, error })
  }
  
  agentOutput(data: AgentOutputData) {
    this.send('agent.output', data)
  }
  
  costUpdate(data: CostUpdateData) {
    this.send('cost.update', data)
  }
  
  contextUpdate(projectId: string, contextItems: any[]) {
    this.send('context.update', { projectId, contextItems })
  }
  
  error(message: string, details?: any) {
    this.send('error', { message, details })
  }
}

// Global instance
export const ws = new WebSocketManager()