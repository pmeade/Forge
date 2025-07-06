import { useState } from 'react'
import { useStore } from '@/store'
import { useApi } from '@/hooks/useApi'

export function Header() {
  const { 
    activeProject, 
    projects, 
    setActiveProject,
    addProject,
    isConnected,
    totalCostToday 
  } = useStore()
  const { post } = useApi()
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  
  const budget = activeProject?.budgetLimit || 0
  const spent = activeProject?.budgetSpent || 0
  const budgetPercent = budget > 0 ? (Number(spent) / Number(budget)) * 100 : 0
  
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
      setShowProjectDropdown(false)
    } catch (error) {
      alert(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-forge-dark">Forge</h1>
          
          {/* Project Selector */}
          <div className="relative">
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium">
                {activeProject?.name || 'Select Project'}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showProjectDropdown && (
              <div className="absolute top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setActiveProject(project)
                      setShowProjectDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                      activeProject?.id === project.id ? 'bg-forge-primary/10' : ''
                    }`}
                  >
                    <div className="font-medium">{project.name}</div>
                    <div className="text-sm text-gray-500">
                      Budget: ${Number(project.budgetSpent).toFixed(2)} / ${Number(project.budgetLimit).toFixed(2)}
                    </div>
                  </button>
                ))}
                
                <div className="border-t border-gray-200">
                  <button 
                    onClick={handleCreateProject}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-forge-primary font-medium"
                  >
                    + Create New Project
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Cost Display */}
        <div className="flex items-center space-x-6">
          {activeProject && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">Cost:</span>
                <span className="font-bold text-forge-dark">
                  ${totalCostToday.toFixed(2)}
                </span>
              </div>
              
              <div className="w-px h-6 bg-gray-300" />
              
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">Budget:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        budgetPercent > 80 ? 'bg-forge-danger' : 
                        budgetPercent > 60 ? 'bg-forge-warning' : 
                        'bg-forge-secondary'
                      }`}
                      style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                    />
                  </div>
                  <span className="font-medium">
                    ${Number(spent).toFixed(2)} / ${Number(budget).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {budgetPercent > 80 && (
                <span className="text-forge-danger font-medium">
                  ⚠ {budgetPercent.toFixed(0)}%
                </span>
              )}
            </div>
          )}
          
          {/* Connection Status */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
            isConnected 
              ? 'bg-forge-secondary/20 text-forge-secondary' 
              : 'bg-forge-danger/20 text-forge-danger'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-forge-secondary' : 'bg-forge-danger'
            }`} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          {/* Settings */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}