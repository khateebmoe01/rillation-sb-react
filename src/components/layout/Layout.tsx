import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Header from './Header'
import TabNavigation from './TabNavigation'
import AICopilotPanel from '../insights/AICopilotPanel'
import { useAI } from '../../contexts/AIContext'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { isPanelOpen, panelWidth } = useAI()
  const isInfrastructurePage = location.pathname.startsWith('/infrastructure')
  const isStrategyPage = location.pathname.startsWith('/strategy')
  const isCRMPage = location.pathname.startsWith('/crm')

  // Pages that don't need the reporting header/tabs
  const isStandalonePage = isInfrastructurePage || isStrategyPage || isCRMPage
  
  return (
    <div className="h-[111.111vh] flex overflow-hidden bg-rillation-bg">
      {/* Top border separator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-rillation-border z-50" />
      
      {/* AI Co-Pilot Panel - Available on all pages */}
      <AICopilotPanel />
      
      {/* Spacer that expands when AI panel is open */}
      <motion.div
        className="flex-shrink-0"
        animate={{ width: isPanelOpen ? panelWidth : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-rillation-bg">
        {/* Header */}
        <Header />
        
        {/* Tab Navigation - Only show for reporting pages */}
        {!isStandalonePage && <TabNavigation />}
        
        {/* Page Content */}
        <main className={`flex-1 bg-rillation-bg ${isCRMPage ? 'overflow-hidden' : 'overflow-auto p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}

