import { NavLink, useLocation } from 'react-router-dom'
import DateRangeFilter from '../ui/DateRangeFilter'
import ClientFilter from '../ui/ClientFilter'
import Button from '../ui/Button'
import { Lock } from 'lucide-react'
import { useFilters } from '../../contexts/FilterContext'
import { useClients } from '../../hooks/useClients'
import { getDateRange } from '../../lib/supabase'

const tabs = [
  { path: '/quick-view', label: 'Quick View' },
  { path: '/performance', label: 'Performance' },
  { path: '/pipeline', label: 'Pipeline' },
]

export default function TabNavigation() {
  const location = useLocation()
  const isInfrastructurePage = location.pathname === '/infrastructure'
  const isPipelinePage = location.pathname === '/pipeline'
  const shouldShowFilters = !isInfrastructurePage
  
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
  
  if (isInfrastructurePage) {
    return null
  }
  
  return (
    <nav className="px-6 border-b border-rillation-border">
      <div className="flex items-center justify-between gap-4 py-2">
        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path
            
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={`
                  relative px-4 py-3 text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'text-rillation-text'
                    : 'text-rillation-text-muted hover:text-rillation-text'
                  }
                `}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rillation-text" />
                )}
              </NavLink>
            )
          })}
        </div>
        
        {/* Filters */}
        {shouldShowFilters && (
          <div className="flex items-center gap-4">
            {/* Client Filter */}
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
            
            {/* Date Range Filter */}
            <DateRangeFilter
              startDate={dateRange.start}
              endDate={dateRange.end}
              onStartDateChange={(date) => setDateRange({ ...dateRange, start: date })}
              onEndDateChange={(date) => setDateRange({ ...dateRange, end: date })}
              onPresetChange={handlePresetChange}
              activePreset={datePreset}
            />
            
            {/* Clear Button */}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
