export type OperationStatus = 
  | 'pending'
  | 'pending_approval'
  | 'approved'
  | 'running'
  | 'complete'
  | 'failed'
  | 'cancelled'

export type ToolType = 'claude_code' | 'openai_api' | 'web_chat'

export interface Operation {
  id: string
  projectId: string
  agentId: string
  task: string
  tool: ToolType
  status: OperationStatus
  costEstimate: number
  actualCost?: number
  errorMessage?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  contextIds?: string[]
}

export interface OperationCreateInput {
  projectId: string
  agentId: string
  task: string
  tool: ToolType
  contextIds?: string[]
}

export interface OperationResult {
  output: string
  cost: number
  duration?: number
}