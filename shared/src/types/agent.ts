export interface Agent {
  id: string
  name: string
  capability: string
  basePrompt: string
  successRate: number
  totalOperations: number
  createdAt: Date
}

export interface AgentCreateInput {
  name: string
  capability: string
  basePrompt: string
}

export interface AgentPerformance {
  agentId: string
  successRate: number
  totalOperations: number
  averageCost: number
  averageDuration: number
}