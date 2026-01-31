import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense } from 'react'
import Layout from './components/layout/Layout'
import ConfigError from './components/ui/ConfigError'
import { getSupabaseConfigError } from './lib/supabase'

// Eager load the most common pages (Performance is the default landing page)
import PerformanceOverview from './pages/PerformanceOverview'
import ClientDetailView from './pages/ClientDetailView'

// Lazy load other pages for better initial bundle size
const PipelineView = lazy(() => import('./pages/PipelineView'))
const Infrastructure = lazy(() => import('./pages/Infrastructure'))
const ClientStrategyView = lazy(() => import('./pages/ClientStrategyView'))
const GTMImplementation = lazy(() => import('./pages/GTMImplementation'))
const DebugView = lazy(() => import('./pages/DebugView'))
const CustomVariablesDiscovery = lazy(() => import('./pages/CustomVariablesDiscovery'))
const AtomicCRM = lazy(() => import('./crm/index'))

// Loading fallback for lazy components
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white/30"></div>
    </div>
  )
}

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
        <Route
          path="/*"
          element={
            <Layout>
              <AnimatePresence mode="wait">
                <Suspense fallback={<PageLoader />}>
                  <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<Navigate to="/crm" replace />} />
                    {/* Eager loaded pages (most common) */}
                    <Route path="/performance" element={<PageTransition><PerformanceOverview /></PageTransition>} />
                    <Route path="/performance/:clientName" element={<PageTransition><ClientDetailView /></PageTransition>} />
                    {/* Lazy loaded pages */}
                    <Route path="/pipeline" element={<PageTransition><PipelineView /></PageTransition>} />
                    <Route path="/strategy" element={<PageTransition><ClientStrategyView /></PageTransition>} />
                    <Route path="/strategy/implementation" element={<PageTransition><GTMImplementation /></PageTransition>} />
                    <Route path="/infrastructure" element={<PageTransition><Infrastructure defaultTab="inboxes" /></PageTransition>} />
                    <Route path="/infrastructure/inboxes" element={<PageTransition><Infrastructure defaultTab="inboxes" /></PageTransition>} />
                    <Route path="/infrastructure/domains" element={<PageTransition><Infrastructure defaultTab="domains" /></PageTransition>} />
                    <Route path="/infrastructure/orders" element={<PageTransition><Infrastructure defaultTab="orders" /></PageTransition>} />
                    <Route path="/infrastructure/health" element={<PageTransition><Infrastructure defaultTab="health" /></PageTransition>} />
                    <Route path="/admin/variables" element={<PageTransition><CustomVariablesDiscovery /></PageTransition>} />
                    <Route path="/debug" element={<PageTransition><DebugView /></PageTransition>} />
                    {/* New Atomic CRM */}
                    <Route path="/crm/*" element={<PageTransition><AtomicCRM /></PageTransition>} />
                    {/* Legacy routes - redirect to new structure */}
                    <Route path="/gtm-scoreboard" element={<Navigate to="/performance" replace />} />
                    <Route path="/quick-view" element={<Navigate to="/performance" replace />} />
                    <Route path="/client-detail/:clientName" element={<ClientDetailRedirect />} />
                  </Routes>
                </Suspense>
              </AnimatePresence>
            </Layout>
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

export default App
