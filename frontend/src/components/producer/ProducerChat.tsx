import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/store'
import { useApi } from '@/hooks/useApi'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { WorkPlan } from './WorkPlan'

export function ProducerChat() {
  const { activeProject, producerMessages, addProducerMessage } = useStore()
  const [isLoading, setIsLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { post } = useApi()
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [producerMessages])
  
  const handleSendMessage = async (message: string) => {
    if (!activeProject || !message.trim()) return
    
    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      projectId: activeProject.id,
      role: 'user' as const,
      content: message,
      createdAt: new Date()
    }
    addProducerMessage(userMessage)
    
    setIsLoading(true)
    
    try {
      const response = await post('/producer/message', {
        projectId: activeProject.id,
        message
      })
      
      // Add assistant message
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        projectId: activeProject.id,
        role: 'assistant' as const,
        content: response.response,
        createdAt: new Date()
      }
      addProducerMessage(assistantMessage)
      
      // Check if response contains a work plan
      if (response.workPlan) {
        setCurrentPlan(response.workPlan)
      }
      
    } catch (error: any) {
      console.error('Failed to send message:', error)
      
      // Add error message
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        projectId: activeProject.id,
        role: 'assistant' as const,
        content: `Error: ${error.message || 'Failed to communicate with Producer'}`,
        createdAt: new Date()
      }
      addProducerMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handlePlanAction = async (action: string, planData?: any) => {
    switch (action) {
      case 'approve_all':
        // Approve all operations in the plan
        for (const phase of currentPlan.phases) {
          for (const operation of phase.operations) {
            await post(`/operations/${operation.id}/approve`)
          }
        }
        setCurrentPlan(null)
        break
        
      case 'approve_phase':
        // Approve specific phase
        if (planData?.phaseId) {
          const phase = currentPlan.phases.find((p: any) => p.id === planData.phaseId)
          if (phase) {
            for (const operation of phase.operations) {
              await post(`/operations/${operation.id}/approve`)
            }
          }
        }
        break
        
      case 'modify':
        // Open modification dialog
        console.log('Modify plan:', planData)
        break
        
      case 'cancel':
        setCurrentPlan(null)
        break
    }
  }
  
  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          Producer Conversation - {activeProject?.name}
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <MessageList messages={producerMessages} />
        
        {currentPlan && (
          <div className="mt-4">
            <WorkPlan 
              plan={currentPlan} 
              onAction={handlePlanAction}
            />
          </div>
        )}
        
        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-500 mt-4">
            <div className="animate-pulse">●</div>
            <div className="animate-pulse animation-delay-200">●</div>
            <div className="animate-pulse animation-delay-400">●</div>
            <span className="text-sm">Producer is thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <MessageInput 
        onSendMessage={handleSendMessage}
        disabled={isLoading}
      />
    </div>
  )
}