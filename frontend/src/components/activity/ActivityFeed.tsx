import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import { useApi } from '@/hooks/useApi'

interface ActivityItem {
  id: string
  type: 'operation_complete' | 'operation_failed' | 'git_snapshot' | 'context_added' | 'approval' | 'cost_alert'
  timestamp: Date
  title: string
  description: string
  metadata?: any
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'primary' | 'danger'
  }>
}

export function ActivityFeed() {
  const { activeProject, operations, agents } = useStore()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [filter, setFilter] = useState<string>('all')
  const { post } = useApi()
  
  // Generate activities from operations
  useEffect(() => {
    if (!activeProject) return
    
    const projectOps = Array.from(operations.values())
      .filter(op => op.projectId === activeProject.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
    
    const newActivities: ActivityItem[] = projectOps.map(op => {
      const agent = agents.get(op.agentId)
      
      if (op.status === 'complete') {
        return {
          id: op.id,
          type: 'operation_complete',
          timestamp: op.completedAt || op.createdAt,
          title: `${agent?.name || 'Agent'} completed task`,
          description: op.task.substring(0, 100) + (op.task.length > 100 ? '...' : ''),
          metadata: {
            cost: op.actualCost,
            duration: op.completedAt && op.startedAt 
              ? new Date(op.completedAt).getTime() - new Date(op.startedAt).getTime()
              : null
          },
          actions: [
            {
              label: 'View Output',
              action: () => console.log('View output:', op.id)
            }
          ]
        }
      } else if (op.status === 'failed') {
        return {
          id: op.id,
          type: 'operation_failed',
          timestamp: op.completedAt || op.createdAt,
          title: `${agent?.name || 'Agent'} operation failed`,
          description: op.errorMessage || 'Unknown error',
          metadata: {
            task: op.task
          },
          actions: [
            {
              label: 'Retry',
              action: () => console.log('Retry:', op.id)
            },
            {
              label: 'View Error',
              action: () => console.log('View error:', op.id),
              variant: 'danger'
            }
          ]
        }
      } else if (op.status === 'pending_approval') {
        return {
          id: op.id,
          type: 'approval',
          timestamp: op.createdAt,
          title: `${agent?.name || 'Agent'} awaiting approval`,
          description: op.task.substring(0, 100) + (op.task.length > 100 ? '...' : ''),
          metadata: {
            estimatedCost: op.costEstimate
          },
          actions: [
            {
              label: 'Review',
              action: () => console.log('Review:', op.id),
              variant: 'primary'
            }
          ]
        }
      }
      
      return null
    }).filter(Boolean) as ActivityItem[]
    
    setActivities(newActivities)
  }, [activeProject, operations, agents])
  
  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.type === filter)
  
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'operation_complete':
        return '✓'
      case 'operation_failed':
        return '✗'
      case 'git_snapshot':
        return '📸'
      case 'context_added':
        return '📄'
      case 'approval':
        return '⏸'
      case 'cost_alert':
        return '⚠'
      default:
        return '•'
    }
  }
  
  const getIconColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'operation_complete':
        return 'text-forge-secondary'
      case 'operation_failed':
        return 'text-forge-danger'
      case 'git_snapshot':
        return 'text-blue-600'
      case 'context_added':
        return 'text-purple-600'
      case 'approval':
        return 'text-forge-warning'
      case 'cost_alert':
        return 'text-forge-warning'
      default:
        return 'text-gray-600'
    }
  }
  
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Recent Activity</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:border-forge-primary focus:outline-none"
          >
            <option value="all">All</option>
            <option value="operation_complete">Completed</option>
            <option value="operation_failed">Failed</option>
            <option value="approval">Approvals</option>
            <option value="git_snapshot">Snapshots</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredActivities.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <div className={`text-lg ${getIconColor(activity.type)} mt-0.5`}>
                    {getIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">
                      {activity.title}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {activity.description}
                    </div>
                    
                    {activity.metadata && (
                      <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                        {activity.metadata.cost !== undefined && (
                          <span>Cost: ${Number(activity.metadata.cost).toFixed(2)}</span>
                        )}
                        {activity.metadata.duration && (
                          <span>Duration: {Math.round(activity.metadata.duration / 1000)}s</span>
                        )}
                        {activity.metadata.estimatedCost !== undefined && (
                          <span>Est. Cost: ${Number(activity.metadata.estimatedCost).toFixed(2)}</span>
                        )}
                      </div>
                    )}
                    
                    {activity.actions && activity.actions.length > 0 && (
                      <div className="flex items-center space-x-2 mt-2">
                        {activity.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={action.action}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              action.variant === 'primary'
                                ? 'bg-forge-primary text-white hover:bg-forge-primary/90'
                                : action.variant === 'danger'
                                ? 'text-forge-danger hover:bg-forge-danger/10'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No recent activity</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="px-4 py-2 border-t border-gray-200">
        <button className="text-sm text-forge-primary hover:text-forge-primary/80 font-medium">
          View All Activity →
        </button>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}