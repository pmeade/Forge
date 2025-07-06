import { useState } from 'react'
import { useStore } from '@/store'
import { useApi } from '@/hooks/useApi'
import { ContextItem } from '@forge/shared'

export function ContextPanel() {
  const { 
    activeProject, 
    agents,
    projectContext,
    activeContextIds,
    toggleContextItem 
  } = useStore()
  const [activeTab, setActiveTab] = useState<'agents' | 'context'>('agents')
  const [searchQuery, setSearchQuery] = useState('')
  const { post } = useApi()
  
  const contextItems = activeProject ? projectContext(activeProject.id) : []
  
  const filteredContext = contextItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const handleAddContext = async () => {
    // TODO: Open file picker or context creation dialog
    console.log('Add context')
  }
  
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">Context & Agent Status</h3>
        
        {/* Tab Switcher */}
        <div className="flex mt-3 space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              activeTab === 'agents'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Agents
          </button>
          <button
            onClick={() => setActiveTab('context')}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              activeTab === 'context'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Context ({contextItems.length})
          </button>
        </div>
      </div>
      
      {activeTab === 'agents' ? (
        <AgentStatusList agents={Array.from(agents.values())} />
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Search Bar */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search context..."
                className="w-full pl-8 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:border-forge-primary focus:outline-none"
              />
              <svg className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* Context List */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <div className="space-y-2">
              {filteredContext.map((item) => (
                <ContextItemCard
                  key={item.id}
                  item={item}
                  isActive={activeContextIds.has(item.id)}
                  onToggle={() => toggleContextItem(item.id)}
                />
              ))}
            </div>
            
            {filteredContext.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No context items match your search' : 'No context items yet'}
              </div>
            )}
          </div>
          
          {/* Add Context Button */}
          <div className="px-4 py-3 border-t border-gray-200">
            <button
              onClick={handleAddContext}
              className="w-full px-4 py-2 bg-forge-primary text-white rounded-lg hover:bg-forge-primary/90 transition-colors text-sm font-medium"
            >
              + Add Context
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface AgentStatusListProps {
  agents: any[]
}

function AgentStatusList({ agents }: AgentStatusListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      <div className="space-y-3">
        {agents.map((agent) => (
          <div key={agent.id} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  agent.status === 'working' ? 'bg-forge-secondary animate-pulse' :
                  agent.status === 'idle' ? 'bg-gray-400' :
                  'bg-forge-warning'
                }`} />
                <h4 className="font-medium text-sm">{agent.name}</h4>
              </div>
              <span className="text-xs text-gray-500">{agent.capability}</span>
            </div>
            
            <div className="text-xs text-gray-600">
              Success Rate: {agent.successRate}% ({agent.totalOperations} ops)
            </div>
            
            <div className="mt-2 flex items-center space-x-2">
              <button className="text-xs text-forge-primary hover:text-forge-primary/80">
                Assign Task
              </button>
              <button className="text-xs text-gray-600 hover:text-gray-800">
                View History
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ContextItemCardProps {
  item: ContextItem
  isActive: boolean
  onToggle: () => void
}

function ContextItemCard({ item, isActive, onToggle }: ContextItemCardProps) {
  const formatSize = (tokens: number) => {
    if (tokens < 1000) return `${tokens} tokens`
    return `${(tokens / 1000).toFixed(1)}k tokens`
  }
  
  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      isActive 
        ? 'border-forge-primary bg-forge-primary/5' 
        : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-sm text-gray-800 line-clamp-1">
            {item.name}
          </h4>
          <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
            <span className={`px-2 py-0.5 rounded-full ${
              item.type === 'code' ? 'bg-blue-100 text-blue-700' :
              item.type === 'document' ? 'bg-green-100 text-green-700' :
              item.type === 'prompt' ? 'bg-purple-100 text-purple-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {item.type}
            </span>
            <span>{formatSize(item.tokens)}</span>
            <span>Used {item.usageCount}x</span>
          </div>
        </div>
        
        <button
          onClick={onToggle}
          className={`ml-3 w-5 h-5 rounded border-2 transition-colors ${
            isActive
              ? 'bg-forge-primary border-forge-primary'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {isActive && (
            <svg className="w-3 h-3 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
      
      {item.lastUsed && (
        <div className="mt-2 text-xs text-gray-500">
          Last used: {new Date(item.lastUsed).toLocaleString()}
        </div>
      )}
    </div>
  )
}