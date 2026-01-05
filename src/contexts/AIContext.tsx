import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useFilters } from './FilterContext'
import { useLocation } from 'react-router-dom'
import type { FirmographicInsightsData } from '../hooks/useFirmographicInsights'

// Types for chart context
export interface ChartContext {
  chartType: string
  chartTitle: string
  data: any
  clickedDataPoint?: any
}

// Full context sent to Claude
export interface AIFullContext {
  filters: {
    client: string
    datePreset: string
    dateRange: {
      start: string
      end: string
    }
  }
  currentScreen: string
  screenName: string
  chartContext: ChartContext | null
  firmographicData: FirmographicInsightsData | null
}

interface AIContextType {
  // Current screen context
  currentScreen: string
  
  // Active chart context (when user clicks a chart)
  chartContext: ChartContext | null
  setChartContext: (ctx: ChartContext | null) => void
  
  // Firmographic data for deep insights
  firmographicData: FirmographicInsightsData | null
  setFirmographicData: (data: FirmographicInsightsData | null) => void
  
  // Build full context for Claude
  buildContext: () => AIFullContext
  
  // Ask AI with full context
  askWithContext: (question: string) => Promise<string>
  
  // Convenience: ask about a specific chart
  askAboutChart: (chart: ChartContext, question?: string) => void
  
  // Loading state
  isAsking: boolean
  
  // Error state
  error: string | null
  clearError: () => void
  
  // Panel state
  isPanelOpen: boolean
  setIsPanelOpen: (open: boolean) => void
  togglePanel: () => void
  
  // Pre-populated question (from chart click)
  pendingQuestion: string | null
  setPendingQuestion: (q: string | null) => void
}

const AIContext = createContext<AIContextType | undefined>(undefined)

// Screen name mapping for better context
const SCREEN_NAMES: Record<string, string> = {
  '/quick-view': 'Quick View Dashboard',
  '/performance': 'Performance Overview',
  '/pipeline': 'Pipeline View',
  '/infrastructure': 'Infrastructure Management',
  '/admin/variables': 'Custom Variables Discovery',
  '/debug': 'Debug View',
}

function getScreenName(pathname: string): string {
  // Check for client detail view
  if (pathname.startsWith('/performance/')) {
    const clientName = decodeURIComponent(pathname.split('/performance/')[1] || '')
    return `Client Detail: ${clientName}`
  }
  return SCREEN_NAMES[pathname] || 'Dashboard'
}

export function AIProvider({ children }: { children: ReactNode }) {
  const { selectedClient, dateRange, datePreset } = useFilters()
  const location = useLocation()
  
  const [chartContext, setChartContext] = useState<ChartContext | null>(null)
  const [firmographicData, setFirmographicData] = useState<FirmographicInsightsData | null>(null)
  const [isAsking, setIsAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)

  // Clear chart context when navigating
  useEffect(() => {
    setChartContext(null)
  }, [location.pathname])

  // Build the full context object for Claude
  const buildContext = useCallback((): AIFullContext => {
    return {
      filters: {
        client: selectedClient || 'All Clients',
        datePreset,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
      },
      currentScreen: location.pathname,
      screenName: getScreenName(location.pathname),
      chartContext,
      firmographicData,
    }
  }, [selectedClient, dateRange, datePreset, location.pathname, chartContext, firmographicData])

  const askWithContext = useCallback(async (question: string): Promise<string> => {
    setIsAsking(true)
    setError(null)
    
    try {
      const context = buildContext()
      
      // Call the Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing')
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          question,
          context,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }
      
      const data = await response.json()
      return data.response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      console.error('AI Error:', err)
      setError(errorMessage)
      return `Sorry, I couldn't process that request. ${errorMessage}`
    } finally {
      setIsAsking(false)
    }
  }, [buildContext])

  const askAboutChart = useCallback((chart: ChartContext, question?: string) => {
    setChartContext(chart)
    
    // Generate a smart question based on the chart
    const autoQuestion = question || (
      chart.clickedDataPoint
        ? `Tell me about "${chart.clickedDataPoint.campaign_name || chart.clickedDataPoint.value || chart.clickedDataPoint.name || 'this data point'}" from the "${chart.chartTitle}" chart. What insights can you provide?`
        : `Analyze the "${chart.chartTitle}" chart for me. What are the key insights and recommendations?`
    )
    
    setPendingQuestion(autoQuestion)
    
    // Open the panel if not already open
    if (!isPanelOpen) {
      setIsPanelOpen(true)
    }
  }, [isPanelOpen])

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <AIContext.Provider value={{
      currentScreen: location.pathname,
      chartContext,
      setChartContext,
      firmographicData,
      setFirmographicData,
      buildContext,
      askWithContext,
      askAboutChart,
      isAsking,
      error,
      clearError,
      isPanelOpen,
      setIsPanelOpen,
      togglePanel,
      pendingQuestion,
      setPendingQuestion,
    }}>
      {children}
    </AIContext.Provider>
  )
}

export function useAI() {
  const ctx = useContext(AIContext)
  if (!ctx) {
    throw new Error('useAI must be used within an AIProvider')
  }
  return ctx
}

