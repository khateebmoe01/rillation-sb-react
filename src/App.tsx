import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ConfigError from './components/ui/ConfigError'
import QuickView from './pages/QuickView'
import PerformanceOverview from './pages/PerformanceOverview'
import GTMScoreboard from './pages/DeepView' // Scorecards content
import PipelineView from './pages/PipelineView'
import Infrastructure from './pages/Infrastructure'
import DebugView from './pages/DebugView'
import ClientDetailView from './pages/ClientDetailView'
import { getSupabaseConfigError } from './lib/supabase'

function App() {
  const configError = getSupabaseConfigError()
  
  if (configError) {
    return <ConfigError />
  }
  
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/quick-view" replace />} />
        <Route path="/quick-view" element={<QuickView />} />
        <Route path="/performance" element={<GTMScoreboard />} />
        <Route path="/gtm-scoreboard" element={<PerformanceOverview />} />
        <Route path="/client-detail/:clientName" element={<ClientDetailView />} />
        <Route path="/pipeline" element={<PipelineView />} />
        <Route path="/infrastructure" element={<Infrastructure />} />
        <Route path="/debug" element={<DebugView />} />
      </Routes>
    </Layout>
  )
}

export default App
