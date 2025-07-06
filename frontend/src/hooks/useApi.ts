import { useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export interface ApiError {
  error: string
  statusCode?: number
}

export function useApi() {
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_AUTH_TOKEN || localStorage.getItem('authToken') || ''}`
  })
  
  const handleResponse = async (response: Response) => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }
    return response.json()
  }
  
  const get = useCallback(async (endpoint: string) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }, [])
  
  const post = useCallback(async (endpoint: string, data?: any) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined
    })
    return handleResponse(response)
  }, [])
  
  const put = useCallback(async (endpoint: string, data: any) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  }, [])
  
  const del = useCallback(async (endpoint: string) => {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    return handleResponse(response)
  }, [])
  
  return { get, post, put, del }
}