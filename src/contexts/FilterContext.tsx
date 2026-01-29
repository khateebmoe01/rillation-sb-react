import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react'
import { getDateRange } from '../lib/supabase'

interface FilterContextType {
  // Client filter (Analytics)
  selectedClient: string
  setSelectedClient: (client: string) => void

  // Strategy client filter (persists across Strategy pages)
  strategyClient: string
  setStrategyClient: (client: string) => void

  // Date filter
  datePreset: string
  setDatePreset: (preset: string) => void
  dateRange: { start: Date; end: Date }
  setDateRange: (range: { start: Date; end: Date }) => void

  // Clear all filters
  clearFilters: () => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

const DEBOUNCE_DELAY = 300 // ms

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedClient, setSelectedClient] = useState('')
  const [strategyClient, setStrategyClient] = useState('Rillation Revenue')
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [dateRange, setDateRangeInternal] = useState(() => getDateRange('thisMonth'))
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced date range setter to prevent excessive re-renders/API calls
  const setDateRange = useCallback((range: { start: Date; end: Date }) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setDateRangeInternal(range)
    }, DEBOUNCE_DELAY)
  }, [])

  const clearFilters = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    setSelectedClient('')
    setDatePreset('thisMonth')
    setDateRangeInternal(getDateRange('thisMonth'))
  }

  return (
    <FilterContext.Provider
      value={{
        selectedClient,
        setSelectedClient,
        strategyClient,
        setStrategyClient,
        datePreset,
        setDatePreset,
        dateRange,
        setDateRange,
        clearFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  )
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider')
  }
  return context
}











