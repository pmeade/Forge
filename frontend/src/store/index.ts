import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import {
  Project,
  Agent,
  Operation,
  ContextItem,
  Message,
  AgentPerformance
} from '@forge/shared'

export interface AppState {
  // Project state
  activeProject: Project | null
  projects: Project[]
  
  // Agent state
  agents: Map<string, Agent>
  agentPerformance: Map<string, AgentPerformance>
  
  // Operation state
  operations: Map<string, Operation>
  operationOutputs: Map<string, string[]>
  
  // Context state
  contextItems: Map<string, ContextItem>
  activeContextIds: Set<string>
  
  // Conversation state
  producerMessages: Message[]
  
  // UI state
  isConnected: boolean
  pendingApprovalCount: number
  totalCostToday: number
  
  // Actions
  setActiveProject: (project: Project | null) => void
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  
  setAgents: (agents: Agent[]) => void
  updateAgent: (id: string, agent: Agent) => void
  
  addOperation: (operation: Operation) => void
  updateOperation: (id: string, updates: Partial<Operation>) => void
  addOperationOutput: (operationId: string, output: string) => void
  
  setContextItems: (projectId: string, items: ContextItem[]) => void
  addContextItem: (item: ContextItem) => void
  updateContextItem: (id: string, updates: Partial<ContextItem>) => void
  toggleContextItem: (id: string) => void
  
  addProducerMessage: (message: Message) => void
  clearProducerMessages: () => void
  
  setConnectionStatus: (connected: boolean) => void
  updateCostTracking: (projectId: string, cost: number) => void
  
  // Computed values
  pendingApprovals: () => Operation[]
  activeOperations: () => Operation[]
  projectOperations: (projectId: string) => Operation[]
  projectContext: (projectId: string) => ContextItem[]
}

export const useStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeProject: null,
      projects: [],
      agents: new Map(),
      agentPerformance: new Map(),
      operations: new Map(),
      operationOutputs: new Map(),
      contextItems: new Map(),
      activeContextIds: new Set(),
      producerMessages: [],
      isConnected: false,
      pendingApprovalCount: 0,
      totalCostToday: 0,
      
      // Project actions
      setActiveProject: (project) => set({ activeProject: project }),
      
      setProjects: (projects) => set({ projects }),
      
      addProject: (project) => set((state) => ({ 
        projects: [...state.projects, project] 
      })),
      
      updateProject: (id, updates) => set((state) => ({
        projects: state.projects.map(p => 
          p.id === id ? { ...p, ...updates } : p
        ),
        activeProject: state.activeProject?.id === id 
          ? { ...state.activeProject, ...updates }
          : state.activeProject
      })),
      
      // Agent actions
      setAgents: (agents) => set((state) => {
        const agentMap = new Map()
        agents.forEach(agent => agentMap.set(agent.id, agent))
        return { agents: agentMap }
      }),
      
      updateAgent: (id, agent) => set((state) => {
        const agents = new Map(state.agents)
        agents.set(id, agent)
        return { agents }
      }),
      
      // Operation actions
      addOperation: (operation) => set((state) => {
        const operations = new Map(state.operations)
        operations.set(operation.id, operation)
        
        const pendingCount = Array.from(operations.values())
          .filter(op => op.status === 'pending_approval').length
        
        return { 
          operations,
          pendingApprovalCount: pendingCount
        }
      }),
      
      updateOperation: (id, updates) => set((state) => {
        const operations = new Map(state.operations)
        const existing = operations.get(id)
        if (existing) {
          operations.set(id, { ...existing, ...updates })
        }
        
        const pendingCount = Array.from(operations.values())
          .filter(op => op.status === 'pending_approval').length
        
        return { 
          operations,
          pendingApprovalCount: pendingCount
        }
      }),
      
      addOperationOutput: (operationId, output) => set((state) => {
        const outputs = new Map(state.operationOutputs)
        const existing = outputs.get(operationId) || []
        outputs.set(operationId, [...existing, output])
        return { operationOutputs: outputs }
      }),
      
      // Context actions
      setContextItems: (projectId, items) => set((state) => {
        const contextItems = new Map(state.contextItems)
        items.forEach(item => {
          if (item.projectId === projectId) {
            contextItems.set(item.id, item)
          }
        })
        return { contextItems }
      }),
      
      addContextItem: (item) => set((state) => {
        const contextItems = new Map(state.contextItems)
        contextItems.set(item.id, item)
        return { contextItems }
      }),
      
      updateContextItem: (id, updates) => set((state) => {
        const contextItems = new Map(state.contextItems)
        const existing = contextItems.get(id)
        if (existing) {
          contextItems.set(id, { ...existing, ...updates })
        }
        return { contextItems }
      }),
      
      toggleContextItem: (id) => set((state) => {
        const activeContextIds = new Set(state.activeContextIds)
        if (activeContextIds.has(id)) {
          activeContextIds.delete(id)
        } else {
          activeContextIds.add(id)
        }
        return { activeContextIds }
      }),
      
      // Conversation actions
      addProducerMessage: (message) => set((state) => ({
        producerMessages: [...state.producerMessages, message]
      })),
      
      clearProducerMessages: () => set({ producerMessages: [] }),
      
      // UI actions
      setConnectionStatus: (connected) => set({ isConnected: connected }),
      
      updateCostTracking: (projectId, cost) => set((state) => {
        const today = new Date().toDateString()
        const todayOperations = Array.from(state.operations.values())
          .filter(op => 
            op.projectId === projectId &&
            new Date(op.createdAt).toDateString() === today
          )
        
        const totalCostToday = todayOperations.reduce((sum, op) => 
          sum + (op.actualCost || 0), 0
        )
        
        return { totalCostToday }
      }),
      
      // Computed values
      pendingApprovals: () => {
        return Array.from(get().operations.values())
          .filter(op => op.status === 'pending_approval')
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      },
      
      activeOperations: () => {
        return Array.from(get().operations.values())
          .filter(op => op.status === 'running')
      },
      
      projectOperations: (projectId) => {
        return Array.from(get().operations.values())
          .filter(op => op.projectId === projectId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      },
      
      projectContext: (projectId) => {
        return Array.from(get().contextItems.values())
          .filter(item => item.projectId === projectId)
      }
    }),
    {
      name: 'forge-store'
    }
  )
)