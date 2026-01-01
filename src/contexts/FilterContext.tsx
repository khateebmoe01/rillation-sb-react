import { createContext, useContext, useState, ReactNode } from 'react'
import { getDateRange } from '../lib/supabase'

interface FilterContextType {
  // Client filter
  selectedClient: string
  setSelectedClient: (client: string) => void
  
  // Date filter
  datePreset: string
  setDatePreset: (preset: string) => void
  dateRange: { start: Date; end: Date }
  setDateRange: (range: { start: Date; end: Date }) => void
  
  // Clear all filters
  clearFilters: () => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedClient, setSelectedClient] = useState('')
  const [datePreset, setDatePreset] = useState('thisMonth')
  const [dateRange, setDateRange] = useState(() => getDateRange('thisMonth'))
  
  const clearFilters = () => {
    setSelectedClient('')
    setDatePreset('allTime')
    const allTimeRange = {
      start: new Date(2000, 0, 1),
      end: new Date()
    }
    setDateRange(allTimeRange)
  }
  
  return (
    <FilterContext.Provider
      value={{
        selectedClient,
        setSelectedClient,
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





