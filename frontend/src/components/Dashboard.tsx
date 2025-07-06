import { useEffect } from 'react'
import { useStore } from '@/store'
import { useApi } from '@/hooks/useApi'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ProducerChat } from './producer/ProducerChat'
import { ContextPanel } from './context/ContextPanel'
import { AgentMonitor } from './agents/AgentMonitor'
import { ActivityFeed } from './activity/ActivityFeed'
import { PendingApprovals } from './operations/PendingApprovals'

export function Dashboard() {
  const { activeProject, addProject, setActiveProject } = useStore()
  const { post } = useApi()
  const { isConnected } = useWebSocket()
  
  const handleCreateProject = async () => {
    const name = prompt('Enter project name:')
    if (!name) return
    
    const budgetStr = prompt('Enter budget limit:')
    if (!budgetStr) return
    
    const budgetLimit = parseFloat(budgetStr)
    if (isNaN(budgetLimit) || budgetLimit <= 0) {
      alert('Please enter a valid budget (positive number)')
      return
    }
    
    try {
      const newProject = await post('/projects', { name, budgetLimit })
      addProject(newProject)
      setActiveProject(newProject)
    } catch (error) {
      alert(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  if (!activeProject) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Welcome to Forge
          </h2>
          <p className="text-gray-600 mb-8">
            Select a project from the dropdown above to get started
          </p>
          <button 
            onClick={handleCreateProject}
            className="px-6 py-3 bg-forge-primary text-white rounded-lg hover:bg-forge-primary/90 transition-colors"
          >
            Create Your First Project
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Left: Producer Chat */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          <ProducerChat />
        </div>
        
        {/* Right: Context & Approvals */}
        <div className="w-96 flex flex-col bg-white">
          <div className="flex-1 overflow-hidden">
            <ContextPanel />
          </div>
          <div className="border-t border-gray-200">
            <PendingApprovals />
          </div>
        </div>
      </div>
      
      {/* Bottom: Agent Monitor & Activity */}
      <div className="h-64 border-t border-gray-200 flex">
        <div className="flex-1 border-r border-gray-200">
          <AgentMonitor />
        </div>
        <div className="w-96">
          <ActivityFeed />
        </div>
      </div>
    </div>
  )
}