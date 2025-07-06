export type ContextType = 'document' | 'code' | 'prompt' | 'specification'

export interface ContextItem {
  id: string
  projectId: string
  name: string
  type: ContextType
  content: string
  filePath?: string
  tokens: number
  usageCount: number
  lastUsed?: Date
  createdAt: Date
  updatedAt?: Date
}

export interface ContextRule {
  id: string
  projectId: string
  pattern?: string
  action: 'auto_include' | 'suggest' | 'exclude'
  contextItemId?: string
  agentId?: string
  role?: string
}

export interface ContextCreateInput {
  projectId: string
  name: string
  type: ContextType
  content: string
  filePath?: string
}

export interface ContextRuleCreateInput {
  projectId: string
  pattern?: string
  action: ContextRule['action']
  contextItemId?: string
  agentId?: string
  role?: string
}