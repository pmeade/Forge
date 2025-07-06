export interface Project {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed' | 'archived'
  currentPhase?: string
  budgetLimit: number
  budgetSpent: number
  createdAt: Date
  updatedAt?: Date
}

export interface ProjectCreateInput {
  name: string
  budgetLimit: number
  currentPhase?: string
}

export interface ProjectUpdateInput {
  name?: string
  status?: Project['status']
  currentPhase?: string
  budgetLimit?: number
}