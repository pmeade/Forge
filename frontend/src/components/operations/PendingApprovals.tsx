import { useState } from 'react'
import { useStore } from '@/store'
import { useApi } from '@/hooks/useApi'
import { Operation } from '@forge/shared'

export function PendingApprovals() {
  const { pendingApprovals, agents, updateOperation } = useStore()
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const { post } = useApi()
  
  const approvals = pendingApprovals()
  
  const handleApprove = async (operationId: string) => {
    setProcessingIds(prev => new Set(prev).add(operationId))
    
    try {
      await post(`/operations/${operationId}/approve`)
      updateOperation(operationId, { status: 'approved' })
    } catch (error) {
      console.error('Failed to approve operation:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(operationId)
        return next
      })
    }
  }
  
  const handleApproveAll = async () => {
    const operationIds = approvals.map(op => op.id)
    setProcessingIds(new Set(operationIds))
    
    try {
      await Promise.all(
        operationIds.map(id => post(`/operations/${id}/approve`))
      )
      
      operationIds.forEach(id => {
        updateOperation(id, { status: 'approved' })
      })
    } catch (error) {
      console.error('Failed to approve all operations:', error)
    } finally {
      setProcessingIds(new Set())
    }
  }
  
  const handleModify = (operation: Operation) => {
    // TODO: Open modification dialog
    console.log('Modify operation:', operation)
  }
  
  const handleCancel = async (operationId: string) => {
    setProcessingIds(prev => new Set(prev).add(operationId))
    
    try {
      await post(`/operations/${operationId}/cancel`)
      updateOperation(operationId, { status: 'cancelled' })
    } catch (error) {
      console.error('Failed to cancel operation:', error)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(operationId)
        return next
      })
    }
  }
  
  if (approvals.length === 0) {
    return (
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Pending Approvals</h3>
        <p className="text-sm text-gray-500">No operations pending approval</p>
      </div>
    )
  }
  
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">
          Pending Approvals ({approvals.length})
        </h3>
        {approvals.length > 1 && (
          <button
            onClick={handleApproveAll}
            disabled={processingIds.size > 0}
            className="text-sm text-forge-primary hover:text-forge-primary/80 font-medium disabled:opacity-50"
          >
            Approve All
          </button>
        )}
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {approvals.map((operation) => {
          const agent = agents.get(operation.agentId)
          const isProcessing = processingIds.has(operation.id)
          
          return (
            <div
              key={operation.id}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium text-sm text-gray-800">
                  {agent?.name || 'Unknown Agent'}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  operation.tool === 'web_chat' 
                    ? 'bg-purple-100 text-purple-700'
                    : operation.tool === 'claude_code'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {operation.tool}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {operation.task}
              </p>
              
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Est. Cost: ${Number(operation.costEstimate).toFixed(2)}</span>
                <span>{new Date(operation.createdAt).toLocaleTimeString()}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleApprove(operation.id)}
                  disabled={isProcessing}
                  className="flex-1 px-3 py-1.5 bg-forge-primary text-white text-sm rounded hover:bg-forge-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleModify(operation)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Modify
                </button>
                <button
                  onClick={() => handleCancel(operation.id)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-forge-danger text-sm hover:bg-forge-danger/10 rounded disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}