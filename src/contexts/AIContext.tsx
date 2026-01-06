import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useFilters } from './FilterContext'
import { useLocation } from 'react-router-dom'
import { supabase, formatDateForQuery, formatDateForQueryEndOfDay } from '../lib/supabase'
import type { FirmographicInsightsData } from '../hooks/useFirmographicInsights'
import type { IterationLogEntry } from '../hooks/useIterationLog'

// Types for chart context
export interface ChartContext {
  chartType: string
  chartTitle: string
  data: any
  clickedDataPoint?: any
}

// Campaign summary for AI
interface CampaignSummary {
  campaign_name: string
  campaign_id: string
  client: string
  emails_sent: number
  prospects: number
  replies: number
  real_replies: number
  positive_replies: number
  meetings_booked: number
  bounce_rate: number
  reply_rate: number
  meeting_rate: number
  status: string
}

// Aggregate metrics for AI
interface AggregateMetrics {
  total_emails_sent: number
  total_prospects: number
  total_replies: number
  total_real_replies: number
  total_positive_replies: number
  total_meetings_booked: number
  total_bounces: number
  avg_reply_rate: number
  avg_meeting_rate: number
  total_campaigns: number
  active_campaigns: number
}

// Full data context for Claude
interface AIDataContext {
  campaigns: CampaignSummary[]
  aggregateMetrics: AggregateMetrics
  topPerformingCampaigns: CampaignSummary[]
  recentMeetings: any[]
  replyBreakdown: {
    positive: number
    interested: number
    not_interested: number
    out_of_office: number
    other: number
  }
  clientList: string[]
}

// Screenshot capture context
export interface ScreenshotContext {
  id: string
  dataUrl: string
  elementInfo: string
  timestamp: Date
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
  dashboardData: AIDataContext | null
  screenshots: ScreenshotContext[]
  iterationLogs: IterationLogEntry[]
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
  
  // Dashboard data
  dashboardData: AIDataContext | null
  
  // Iteration logs for AI context
  iterationLogs: IterationLogEntry[]
  setIterationLogs: (logs: IterationLogEntry[]) => void
  
  // Screenshot context
  screenshots: ScreenshotContext[]
  addScreenshot: (dataUrl: string, elementInfo: string) => void
  removeScreenshot: (id: string) => void
  clearScreenshots: () => void
  
  // Build full context for Claude
  buildContext: () => AIFullContext
  
  // Ask AI with full context
  askWithContext: (question: string) => Promise<string>
  
  // Convenience: ask about a specific chart
  askAboutChart: (chart: ChartContext, question?: string) => void
  
  // Loading state
  isAsking: boolean
  isLoadingData: boolean
  
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
  
  // Refresh dashboard data
  refreshDashboardData: () => Promise<void>
  
  // Element picker state
  isElementPickerActive: boolean
  setElementPickerActive: (active: boolean) => void
  
  // Panel dimensions
  panelWidth: number
  setPanelWidth: (width: number) => void
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
  const [dashboardData, setDashboardData] = useState<AIDataContext | null>(null)
  const [iterationLogs, setIterationLogs] = useState<IterationLogEntry[]>([])
  const [screenshots, setScreenshots] = useState<ScreenshotContext[]>([])
  const [isAsking, setIsAsking] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [isElementPickerActive, setElementPickerActive] = useState(false)
  const [panelWidth, setPanelWidth] = useState(620) // Default width - wider for better readability

  // Screenshot management
  const addScreenshot = useCallback((dataUrl: string, elementInfo: string) => {
    const newScreenshot: ScreenshotContext = {
      id: Date.now().toString(),
      dataUrl,
      elementInfo,
      timestamp: new Date(),
    }
    setScreenshots(prev => {
      // Limit to 5 screenshots
      const updated = [...prev, newScreenshot]
      return updated.slice(-5)
    })
    // Deactivate picker after capture
    setElementPickerActive(false)
  }, [])

  const removeScreenshot = useCallback((id: string) => {
    setScreenshots(prev => prev.filter(s => s.id !== id))
  }, [])

  const clearScreenshots = useCallback(() => {
    setScreenshots([])
  }, [])

  // Fetch comprehensive dashboard data for AI
  const fetchDashboardData = useCallback(async (): Promise<AIDataContext | null> => {
    try {
      setIsLoadingData(true)
      
      const startStr = formatDateForQuery(dateRange.start)
      const endStr = formatDateForQuery(dateRange.end)
      const endStrNextDay = formatDateForQueryEndOfDay(dateRange.end)

      // Fetch campaign reporting data
      let campaignQuery = supabase
        .from('campaign_reporting')
        .select('campaign_id, campaign_name, client, emails_sent, total_leads_contacted, bounced, interested, date')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('emails_sent', { ascending: false })
        .limit(1000)

      if (selectedClient) {
        campaignQuery = campaignQuery.eq('client', selectedClient)
      }

      const { data: campaignRows, error: campaignError } = await campaignQuery
      if (campaignError) {
        console.warn('Campaign query error:', campaignError.message)
      }

      // Fetch replies data
      let repliesQuery = supabase
        .from('replies')
        .select('campaign_id, client, category, date_received, lead_id')
        .gte('date_received', startStr)
        .lt('date_received', endStrNextDay)
        .limit(5000)

      if (selectedClient) {
        repliesQuery = repliesQuery.eq('client', selectedClient)
      }

      const { data: repliesData, error: repliesError } = await repliesQuery
      if (repliesError) {
        console.warn('Replies query error:', repliesError.message)
      }

      // Fetch meetings booked
      let meetingsQuery = supabase
        .from('meetings_booked')
        .select('campaign_id, campaign_name, client, created_time, email, industry, annual_revenue, company_hq_state')
        .gte('created_time', startStr)
        .lt('created_time', endStrNextDay)
        .order('created_time', { ascending: false })
        .limit(100)

      if (selectedClient) {
        meetingsQuery = meetingsQuery.eq('client', selectedClient)
      }

      const { data: meetingsData, error: meetingsError } = await meetingsQuery
      if (meetingsError) {
        console.warn('Meetings query error:', meetingsError.message)
      }

      // Fetch campaign statuses
      let statusQuery = supabase
        .from('Campaigns')
        .select('campaign_id, client, status')
      
      if (selectedClient) {
        statusQuery = statusQuery.eq('client', selectedClient)
      }

      const { data: statusData } = await statusQuery

      // Fetch client list
      const { data: clientsData } = await supabase
        .from('Clients')
        .select('Business')
        .order('Business')

      // Build status map
      const statusMap = new Map<string, string>()
      statusData?.forEach((s: any) => {
        if (s.campaign_id && s.client) {
          statusMap.set(`${s.campaign_id}||${s.client}`, s.status || 'unknown')
        }
      })

      // Aggregate campaign data
      const campaignMap = new Map<string, CampaignSummary>()
      
      campaignRows?.forEach((row: any) => {
        if (!row.campaign_id || !row.campaign_name || !row.client) return
        
        const key = `${row.campaign_id}||${row.client}`
        if (!campaignMap.has(key)) {
          campaignMap.set(key, {
            campaign_name: row.campaign_name,
            campaign_id: row.campaign_id,
            client: row.client,
            emails_sent: 0,
            prospects: 0,
            replies: 0,
            real_replies: 0,
            positive_replies: 0,
            meetings_booked: 0,
            bounce_rate: 0,
            reply_rate: 0,
            meeting_rate: 0,
            status: statusMap.get(key) || 'unknown',
          })
        }
        
        const stat = campaignMap.get(key)!
        stat.emails_sent += row.emails_sent || 0
        stat.prospects += row.total_leads_contacted || 0
        stat.positive_replies += row.interested || 0
      })

      // Count replies per campaign
      const replyCountMap = new Map<string, { total: number, real: number }>()
      const replyBreakdown = {
        positive: 0,
        interested: 0,
        not_interested: 0,
        out_of_office: 0,
        other: 0,
      }
      
      repliesData?.forEach((reply: any) => {
        if (!reply.campaign_id || !reply.client) return
        
        const key = `${reply.campaign_id}||${reply.client}`
        if (!replyCountMap.has(key)) {
          replyCountMap.set(key, { total: 0, real: 0 })
        }
        
        const counts = replyCountMap.get(key)!
        counts.total++
        
        const cat = (reply.category || '').toLowerCase()
        const isOOO = cat.includes('out of office') || cat.includes('ooo')
        if (!isOOO) {
          counts.real++
        }
        
        // Reply breakdown
        if (cat.includes('positive') || cat.includes('interested')) {
          replyBreakdown.positive++
          replyBreakdown.interested++
        } else if (cat.includes('not interested') || cat.includes('negative')) {
          replyBreakdown.not_interested++
        } else if (isOOO) {
          replyBreakdown.out_of_office++
        } else {
          replyBreakdown.other++
        }
      })

      // Apply reply counts
      replyCountMap.forEach((counts, key) => {
        const campaign = campaignMap.get(key)
        if (campaign) {
          campaign.replies = counts.total
          campaign.real_replies = counts.real
        }
      })

      // Count meetings per campaign
      const meetingCountMap = new Map<string, number>()
      meetingsData?.forEach((meeting: any) => {
        if (!meeting.campaign_id || !meeting.client) return
        const key = `${meeting.campaign_id}||${meeting.client}`
        meetingCountMap.set(key, (meetingCountMap.get(key) || 0) + 1)
      })

      // Apply meeting counts and calculate rates
      meetingCountMap.forEach((count, key) => {
        const campaign = campaignMap.get(key)
        if (campaign) {
          campaign.meetings_booked = count
        }
      })

      // Calculate rates
      campaignMap.forEach((campaign) => {
        if (campaign.emails_sent > 0) {
          campaign.bounce_rate = 0 // Would need bounces data
          campaign.reply_rate = (campaign.real_replies / campaign.emails_sent) * 100
          campaign.meeting_rate = (campaign.meetings_booked / campaign.emails_sent) * 100
        }
      })

      // Convert to array and sort
      const campaigns = Array.from(campaignMap.values())
        .sort((a, b) => b.emails_sent - a.emails_sent)

      // Calculate aggregate metrics
      const aggregateMetrics: AggregateMetrics = {
        total_emails_sent: campaigns.reduce((sum, c) => sum + c.emails_sent, 0),
        total_prospects: campaigns.reduce((sum, c) => sum + c.prospects, 0),
        total_replies: campaigns.reduce((sum, c) => sum + c.replies, 0),
        total_real_replies: campaigns.reduce((sum, c) => sum + c.real_replies, 0),
        total_positive_replies: campaigns.reduce((sum, c) => sum + c.positive_replies, 0),
        total_meetings_booked: campaigns.reduce((sum, c) => sum + c.meetings_booked, 0),
        total_bounces: 0,
        avg_reply_rate: campaigns.length > 0 
          ? campaigns.reduce((sum, c) => sum + c.reply_rate, 0) / campaigns.length 
          : 0,
        avg_meeting_rate: campaigns.length > 0 
          ? campaigns.reduce((sum, c) => sum + c.meeting_rate, 0) / campaigns.length 
          : 0,
        total_campaigns: campaigns.length,
        active_campaigns: campaigns.filter(c => c.status === 'active' || c.status === 'ACTIVE').length,
      }

      // Top performing campaigns (by meetings booked)
      const topPerformingCampaigns = [...campaigns]
        .sort((a, b) => b.meetings_booked - a.meetings_booked)
        .slice(0, 10)

      // Format recent meetings
      const recentMeetings = (meetingsData || []).slice(0, 20).map((m: any) => ({
        campaign_name: m.campaign_name || 'Unknown Campaign',
        client: m.client || 'Unknown',
        created_time: m.created_time,
        lead_name: m.email || 'Unknown',
        lead_company: m.industry || 'Unknown Industry',
        lead_title: m.company_hq_state || '',
      }))

      const result: AIDataContext = {
        campaigns: campaigns.slice(0, 50), // Top 50 campaigns
        aggregateMetrics,
        topPerformingCampaigns,
        recentMeetings,
        replyBreakdown,
        clientList: (clientsData || []).map((c: any) => c.Business).filter(Boolean),
      }

      setDashboardData(result)
      return result
    } catch (err: any) {
      const errorMessage = err?.message || err?.error_description || JSON.stringify(err)
      console.error('Failed to fetch dashboard data for AI:', errorMessage)
      // Don't throw - just return null and let the AI work without data
      return null
    } finally {
      setIsLoadingData(false)
    }
  }, [dateRange, selectedClient])

  // Fetch dashboard data when filters change or panel opens
  useEffect(() => {
    if (isPanelOpen) {
      fetchDashboardData()
    }
  }, [isPanelOpen, fetchDashboardData])

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
      dashboardData,
      screenshots,
      iterationLogs,
    }
  }, [selectedClient, dateRange, datePreset, location.pathname, chartContext, firmographicData, dashboardData, screenshots, iterationLogs])

  const askWithContext = useCallback(async (question: string): Promise<string> => {
    setIsAsking(true)
    setError(null)
    
    try {
      // Ensure we have fresh data
      let currentData = dashboardData
      if (!currentData) {
        currentData = await fetchDashboardData()
      }
      
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
  }, [buildContext, dashboardData, fetchDashboardData])

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

  const refreshDashboardData = useCallback(async () => {
    await fetchDashboardData()
  }, [fetchDashboardData])

  return (
    <AIContext.Provider value={{
      currentScreen: location.pathname,
      chartContext,
      setChartContext,
      firmographicData,
      setFirmographicData,
      dashboardData,
      iterationLogs,
      setIterationLogs,
      screenshots,
      addScreenshot,
      removeScreenshot,
      clearScreenshots,
      buildContext,
      askWithContext,
      askAboutChart,
      isAsking,
      isLoadingData,
      error,
      clearError,
      isPanelOpen,
      setIsPanelOpen,
      togglePanel,
      pendingQuestion,
      setPendingQuestion,
      refreshDashboardData,
      isElementPickerActive,
      setElementPickerActive,
      panelWidth,
      setPanelWidth,
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
