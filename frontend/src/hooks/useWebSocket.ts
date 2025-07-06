import { useEffect, useRef } from 'react'
import { useStore } from '@/store'
import { WebSocketMessage, WebSocketEventType } from '@forge/shared'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
const RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 30000

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectDelayRef = useRef(RECONNECT_DELAY)
  
  const {
    setConnectionStatus,
    updateOperation,
    addOperationOutput,
    updateCostTracking,
    setContextItems,
    activeProject
  } = useStore()
  
  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }
    
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setConnectionStatus(true)
        reconnectDelayRef.current = RECONNECT_DELAY
      }
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      
      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setConnectionStatus(false)
        wsRef.current = null
        
        // Exponential backoff for reconnection
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 2,
          MAX_RECONNECT_DELAY
        )
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Attempting to reconnect in ${reconnectDelayRef.current}ms...`)
          connect()
        }, reconnectDelayRef.current)
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
      setConnectionStatus(false)
    }
  }
  
  const handleMessage = (message: WebSocketMessage) => {
    switch (message.event) {
      case 'operation.created':
        useStore.getState().addOperation(message.data)
        break
        
      case 'operation.update':
        updateOperation(message.data.operationId, message.data)
        break
        
      case 'operation.complete':
        updateOperation(message.data.operationId, {
          status: 'complete',
          actualCost: message.data.cost,
          completedAt: new Date()
        })
        break
        
      case 'operation.failed':
        updateOperation(message.data.operationId, {
          status: 'failed',
          errorMessage: message.data.error,
          completedAt: new Date()
        })
        break
        
      case 'agent.output':
        addOperationOutput(message.data.operationId, message.data.output)
        break
        
      case 'cost.update':
        if (activeProject?.id === message.data.projectId) {
          updateCostTracking(message.data.projectId, message.data.totalCost)
        }
        break
        
      case 'context.update':
        if (activeProject?.id === message.data.projectId) {
          setContextItems(message.data.projectId, message.data.contextItems)
        }
        break
        
      case 'error':
        console.error('WebSocket error:', message.data)
        break
        
      default:
        console.log('Unhandled WebSocket event:', message.event, message.data)
    }
  }
  
  const send = (event: WebSocketEventType, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }))
    } else {
      console.warn('WebSocket not connected, cannot send message')
    }
  }
  
  useEffect(() => {
    connect()
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])
  
  return { send, isConnected: useStore(state => state.isConnected) }
}