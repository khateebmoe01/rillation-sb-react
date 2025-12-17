import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import QuickView from './pages/QuickView'
import PerformanceOverview from './pages/PerformanceOverview'
import GTMScoreboard from './pages/DeepView' // Renamed from DeepView
import PipelineView from './pages/PipelineView'
import Infrastructure from './pages/Infrastructure'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/quick-view" replace />} />
        <Route path="/quick-view" element={<QuickView />} />
        <Route path="/performance" element={<PerformanceOverview />} />
        <Route path="/gtm-scoreboard" element={<GTMScoreboard />} />
        <Route path="/pipeline" element={<PipelineView />} />
        <Route path="/infrastructure" element={<Infrastructure />} />
      </Routes>
    </Layout>
  )
}

export default App
