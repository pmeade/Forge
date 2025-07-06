export type WebSocketEventType = 
  | 'operation.created'
  | 'operation.update'
  | 'operation.complete'
  | 'operation.failed'
  | 'agent.output'
  | 'cost.update'
  | 'context.update'
  | 'error'

export interface WebSocketMessage {
  event: WebSocketEventType
  data: any
}

export interface OperationUpdateData {
  operationId: string
  status?: string
  progress?: number
  message?: string
}

export interface AgentOutputData {
  agentId: string
  operationId: string
  output: string
  isComplete?: boolean
}

export interface CostUpdateData {
  projectId: string
  totalCost: number
  operationId?: string
  increment?: number
}