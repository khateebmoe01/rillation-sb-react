import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, Lock } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import TabNavigation from './TabNavigation'
import DateRangeFilter from '../ui/DateRangeFilter'
import ClientFilter from '../ui/ClientFilter'
import Button from '../ui/Button'
import { useFilters } from '../../contexts/FilterContext'
import { useClients } from '../../hooks/useClients'
import { getDateRange } from '../../lib/supabase'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isInfrastructurePage = location.pathname === '/infrastructure'
  const isPipelinePage = location.pathname === '/pipeline'
  
  // Show global filters for all reporting pages (including pipeline)
  const shouldShowGlobalFilters = !isInfrastructurePage
  
  const { clients } = useClients()
  const {
    selectedClient,
    setSelectedClient,
    datePreset,
    setDatePreset,
    dateRange,
    setDateRange,
    clearFilters,
  } = useFilters()
  
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset)
    setDateRange(getDateRange(preset))
  }
  
  return (
    <div className="min-h-screen flex">
      {/* Top border separator */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-rillation-purple via-rillation-magenta to-rillation-purple z-50" />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <Header />
        
        {/* Global Filters Bar - Show for all reporting pages */}
        {shouldShowGlobalFilters && (
          <div className="px-6 pt-4 pb-2 border-b border-rillation-border">
            <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Client Filter - Locked to "Rillation Revenue" on Pipeline page */}
                  {isPipelinePage ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-rillation-bg border border-rillation-border rounded-lg">
                      <Lock size={12} className="text-rillation-text-muted" />
                      <span className="text-sm text-rillation-text">Rillation Revenue</span>
                    </div>
                  ) : (
                    <ClientFilter
                      clients={clients}
                      selectedClient={selectedClient}
                      onChange={setSelectedClient}
                    />
                  )}
                  <DateRangeFilter
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
                    onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
                    onPresetChange={handlePresetChange}
                    activePreset={datePreset}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                  <Button variant="primary" size="sm">
                    <Download size={14} />
                    Save Report
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Tab Navigation - Only show for reporting pages */}
        {!isInfrastructurePage && <TabNavigation />}
        
        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

