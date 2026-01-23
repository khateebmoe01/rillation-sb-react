import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Layout from './components/layout/Layout'
import ConfigError from './components/ui/ConfigError'
import PerformanceOverview from './pages/PerformanceOverview'
import PipelineView from './pages/PipelineView'
import Infrastructure from './pages/Infrastructure'
import ClientStrategyView from './pages/ClientStrategyView'
import DebugView from './pages/DebugView'
import ClientDetailView from './pages/ClientDetailView'
import CustomVariablesDiscovery from './pages/CustomVariablesDiscovery'
import Login from './pages/Login'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { getSupabaseConfigError } from './lib/supabase'

// Redirect component that properly handles URL params
function ClientDetailRedirect() {
  const { clientName } = useParams<{ clientName: string }>()
  return <Navigate to={`/performance/${clientName}`} replace />
}

// Page transition wrapper component
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-full"
    >
      {children}
    </motion.div>
  )
}

function App() {
  const configError = getSupabaseConfigError()
  const location = useLocation()
  
  if (configError) {
    return <ConfigError />
  }
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public route */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<Navigate to="/performance" replace />} />
                    <Route path="/performance" element={<PageTransition><PerformanceOverview /></PageTransition>} />
                    <Route path="/performance/:clientName" element={<PageTransition><ClientDetailView /></PageTransition>} />
                    <Route path="/pipeline" element={<PageTransition><PipelineView /></PageTransition>} />
                    <Route path="/strategy" element={<PageTransition><ClientStrategyView /></PageTransition>} />
                    <Route path="/infrastructure" element={<PageTransition><Infrastructure /></PageTransition>} />
                    <Route path="/infrastructure/overview" element={<PageTransition><Infrastructure defaultTab="overview" /></PageTransition>} />
                    <Route path="/infrastructure/inboxes" element={<PageTransition><Infrastructure defaultTab="inboxes" /></PageTransition>} />
                    <Route path="/infrastructure/domains" element={<PageTransition><Infrastructure defaultTab="domains" /></PageTransition>} />
                    <Route path="/infrastructure/orders" element={<PageTransition><Infrastructure defaultTab="orders" /></PageTransition>} />
                    <Route path="/infrastructure/health" element={<PageTransition><Infrastructure defaultTab="health" /></PageTransition>} />
                    <Route path="/admin/variables" element={<PageTransition><CustomVariablesDiscovery /></PageTransition>} />
                    <Route path="/debug" element={<PageTransition><DebugView /></PageTransition>} />
                    {/* Legacy routes - redirect to new structure */}
                    <Route path="/gtm-scoreboard" element={<Navigate to="/performance" replace />} />
                    <Route path="/quick-view" element={<Navigate to="/performance" replace />} />
                    <Route path="/client-detail/:clientName" element={<ClientDetailRedirect />} />
                  </Routes>
                </AnimatePresence>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

export default App
