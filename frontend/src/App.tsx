import { useEffect } from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { Dashboard } from './components/Dashboard'
import { useStore } from './store'
import { useApi } from './hooks/useApi'

function App() {
  const { setProjects, setAgents } = useStore()
  const { get } = useApi()
  
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load projects
        const projects = await get('/projects')
        setProjects(projects)
        
        // Load agents
        const agents = await get('/agents')
        setAgents(agents)
      } catch (error) {
        console.error('Failed to load initial data:', error)
      }
    }
    
    loadInitialData()
  }, [])
  
  return (
    <Router>
      <MainLayout>
        <Dashboard />
      </MainLayout>
    </Router>
  )
}

export default App