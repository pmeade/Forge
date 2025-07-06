export interface Message {
  id: string
  projectId: string
  operationId?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
}

export interface Conversation {
  id: string
  projectId: string
  messages: Message[]
  createdAt: Date
  updatedAt?: Date
}

export interface MessageCreateInput {
  projectId: string
  operationId?: string
  role: Message['role']
  content: string
}