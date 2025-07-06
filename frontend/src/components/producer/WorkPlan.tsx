interface WorkPlanProps {
  plan: any
  onAction: (action: string, data?: any) => void
}

export function WorkPlan({ plan, onAction }: WorkPlanProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-semibold text-blue-900 mb-3">Proposed Work Plan</h3>
      
      {plan.phases?.map((phase: any, index: number) => (
        <div key={phase.id || index} className="mb-4">
          <h4 className="font-medium text-blue-800 mb-2">
            Phase {index + 1}: {phase.name}
          </h4>
          
          <div className="space-y-2 ml-4">
            {phase.operations?.map((op: any) => (
              <div 
                key={op.id} 
                className="bg-white rounded p-3 border border-blue-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {op.agent}: {op.task}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Context: {op.context?.join(', ') || 'Default'}
                    </div>
                    <div className="text-xs text-gray-600">
                      Tool: {op.tool} | Est. Cost: ${op.estimatedCost || '0.00'}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onAction('approve_operation', { operationId: op.id })}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onAction('modify_operation', { operationId: op.id })}
                      className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Modify
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-2 ml-4">
            <button
              onClick={() => onAction('approve_phase', { phaseId: phase.id })}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Approve Phase {index + 1} Only
            </button>
          </div>
        </div>
      ))}
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-200">
        <div className="text-sm text-blue-800">
          Total estimated cost: ${plan.totalCost || '0.00'}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onAction('approve_all')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Approve All Phases
          </button>
          <button
            onClick={() => onAction('modify')}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
          >
            Modify Plan
          </button>
          <button
            onClick={() => onAction('cancel')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}