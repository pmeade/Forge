import { useStore } from '@/store'
import { Operation } from '@forge/shared'

export function AgentMonitor() {
  const { agents, activeOperations, operationOutputs } = useStore()
  const activeOps = activeOperations()
  
  if (activeOps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
          <p className="text-gray-500">No active agent operations</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h3 className="font-semibold text-gray-800">
          Live Agent Operations ({activeOps.length})
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {activeOps.map((operation) => (
          <AgentOperationView 
            key={operation.id} 
            operation={operation}
            agent={agents.get(operation.agentId)}
            output={operationOutputs.get(operation.id) || []}
          />
        ))}
      </div>
    </div>
  )
}

interface AgentOperationViewProps {
  operation: Operation
  agent?: any
  output: string[]
}

function AgentOperationView({ operation, agent, output }: AgentOperationViewProps) {
  const elapsedTime = operation.startedAt 
    ? Math.floor((Date.now() - new Date(operation.startedAt).getTime()) / 1000)
    : 0
    
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-forge-secondary rounded-full animate-pulse" />
            <h4 className="font-medium text-sm">
              {agent?.name || 'Unknown Agent'} - {operation.tool}
            </h4>
          </div>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>Elapsed: {formatTime(elapsedTime)}</span>
            <span>Est. Cost: ${Number(operation.costEstimate).toFixed(2)}</span>
            <button className="text-forge-primary hover:text-forge-primary/80">
              Pause
            </button>
            <button className="text-forge-danger hover:text-forge-danger/80">
              Stop
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
          {operation.task}
        </p>
      </div>
      
      <div className="p-4 bg-gray-900 text-gray-100 font-mono text-xs max-h-48 overflow-y-auto">
        {output.length > 0 ? (
          <div className="space-y-1">
            {output.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))}
            <div className="animate-pulse">█</div>
          </div>
        ) : (
          <div className="text-gray-500">Waiting for output...</div>
        )}
      </div>
      
      <div className="px-4 py-2 bg-gray-50 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-gray-500">Progress:</span>
            <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-forge-primary transition-all duration-300"
                style={{ width: '45%' }}
              />
            </div>
            <span className="text-gray-600">~45%</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">Quality:</span>
            <div className="flex items-center space-x-1">
              <span className="text-forge-secondary">✓</span>
              <span className="text-gray-600">Following patterns</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-forge-secondary">✓</span>
              <span className="text-gray-600">Error handling</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-forge-warning">⚠</span>
              <span className="text-gray-600">Missing tests</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}