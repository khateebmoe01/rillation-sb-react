import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ConfigError from './components/ui/ConfigError'
import QuickView from './pages/QuickView'
import PerformanceOverview from './pages/PerformanceOverview'
import PipelineView from './pages/PipelineView'
import Infrastructure from './pages/Infrastructure'
import DebugView from './pages/DebugView'
import ClientDetailView from './pages/ClientDetailView'
import { getSupabaseConfigError } from './lib/supabase'

// Redirect component that properly handles URL params
function ClientDetailRedirect() {
  const { clientName } = useParams<{ clientName: string }>()
  return <Navigate to={`/performance/${clientName}`} replace />
}

function App() {
  const configError = getSupabaseConfigError()
  const location = useLocation()
  
  if (configError) {
    return <ConfigError />
  }
  
  return (
    <Layout>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/quick-view" replace />} />
        <Route path="/quick-view" element={<QuickView />} />
        <Route path="/performance" element={<PerformanceOverview />} />
        <Route path="/performance/:clientName" element={<ClientDetailView />} />
        <Route path="/pipeline" element={<PipelineView />} />
        <Route path="/infrastructure" element={<Infrastructure />} />
        <Route path="/debug" element={<DebugView />} />
        {/* Legacy routes - redirect to new structure */}
        <Route path="/gtm-scoreboard" element={<Navigate to="/performance" replace />} />
        <Route path="/client-detail/:clientName" element={<ClientDetailRedirect />} />
      </Routes>
    </Layout>
  )
}

export default App
