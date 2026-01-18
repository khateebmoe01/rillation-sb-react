import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { formatNumber } from '../../lib/supabase'

interface DayData {
  date: string
  sent: number
  prospects: number
  replied: number
  positiveReplies: number
  meetings: number
}

interface CalendarHeatmapProps {
  data: DayData[]
  dateRange: { start: Date; end: Date }
  onDayClick?: (date: string, data: DayData) => void
}

// Color palette for different metrics - distinct from chart colors (no white, red, yellow, green)
const METRIC_COLORS = {
  sent: { bg: 'bg-violet-500', hex: '#8b5cf6', label: 'Sent' },
  prospects: { bg: 'bg-blue-500', hex: '#3b82f6', label: 'Prospects' },
  replied: { bg: 'bg-cyan-500', hex: '#06b6d4', label: 'Replied' },
  positiveReplies: { bg: 'bg-amber-500', hex: '#f59e0b', label: 'Interested' },
  meetings: { bg: 'bg-fuchsia-500', hex: '#d946ef', label: 'Meetings' },
}

type MetricKey = keyof typeof METRIC_COLORS

// Get intensity based on value relative to max
function getIntensity(value: number, max: number): number {
  if (max === 0) return 0
  return Math.min(Math.max(value / max, 0), 1)
}

// Get background color with opacity based on intensity
function getBackgroundStyle(metric: MetricKey, intensity: number): string {
  const opacity = 0.2 + intensity * 0.8 // Range from 0.2 to 1
  return `rgba(${getColorRGB(metric)}, ${opacity})`
}

function getColorRGB(metric: MetricKey): string {
  const rgbMap: Record<MetricKey, string> = {
    sent: '139, 92, 246',      // violet-500
    prospects: '59, 130, 246', // blue-500
    replied: '6, 182, 212',    // cyan-500
    positiveReplies: '245, 158, 11', // amber-500
    meetings: '217, 70, 239',  // fuchsia-500
  }
  return rgbMap[metric]
}

export default function CalendarHeatmap({ data, dateRange, onDayClick }: CalendarHeatmapProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('meetings')
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Create a map of date -> data for quick lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, DayData>()
    data.forEach(d => map.set(d.date, d))
    return map
  }, [data])

  // Calculate max values for intensity scaling
  const maxValues = useMemo(() => {
    return {
      sent: Math.max(...data.map(d => d.sent), 1),
      prospects: Math.max(...data.map(d => d.prospects), 1),
      replied: Math.max(...data.map(d => d.replied), 1),
      positiveReplies: Math.max(...data.map(d => d.positiveReplies), 1),
      meetings: Math.max(...data.map(d => d.meetings), 1),
    }
  }, [data])

  // Generate weekdays only (no weekends) between start and end dates
  const weekdays = useMemo(() => {
    const days: Date[] = []
    const current = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      // Skip Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days.push(new Date(current))
      }
      current.setDate(current.getDate() + 1)
    }
    return days
  }, [dateRange])

  // Group days by week for grid layout
  const weeks = useMemo(() => {
    const result: Date[][] = []
    let currentWeek: Date[] = []
    
    weekdays.forEach((day, index) => {
      const dayOfWeek = day.getDay()
      
      // If it's Monday and we have a previous week, push it
      if (dayOfWeek === 1 && currentWeek.length > 0) {
        result.push(currentWeek)
        currentWeek = []
      }
      
      currentWeek.push(day)
      
      // If it's the last day, push remaining
      if (index === weekdays.length - 1) {
        result.push(currentWeek)
      }
    })
    
    return result
  }, [weekdays])

  // Handle day click
  const handleDayClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const dayData = dataMap.get(dateStr)
    
    if (dayData) {
      setSelectedDay(dayData)
      setIsDetailOpen(true)
      onDayClick?.(dateStr, dayData)
    }
  }

  // Handle clicking outside to open detail panel
  const handleContainerClick = (e: React.MouseEvent) => {
    // Only open if clicking the container itself, not a day cell
    if (e.target === e.currentTarget) {
      setIsDetailOpen(true)
    }
  }

  // Close detail panel
  const handleCloseDetail = () => {
    setIsDetailOpen(false)
    setSelectedDay(null)
  }

  // Format date for display
  const formatDateLabel = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <motion.div
      className="bg-slate-900/80 rounded-xl border border-slate-700/60 p-5 cursor-pointer"
      onClick={handleContainerClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header with metric selector */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Daily Activity</h3>
        
        {/* Metric Bands - All colored, no white */}
        <div className="flex gap-2">
          {(Object.keys(METRIC_COLORS) as MetricKey[]).map((metric) => (
            <motion.button
              key={metric}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedMetric(metric)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedMetric === metric
                  ? 'ring-2 ring-white ring-opacity-50'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: METRIC_COLORS[metric].hex }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-white">{METRIC_COLORS[metric].label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Calendar Grid - Weekdays only */}
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          {/* Day labels */}
          <div className="flex gap-1 mb-2 pl-12">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
              <div key={day} className="w-12 text-center text-xs text-white/90 font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1 items-center">
                {/* Week label */}
                <div className="w-10 text-xs text-white/80 text-right pr-2">
                  {formatDateLabel(week[0])}
                </div>
                
                {/* Day cells */}
                <div className="flex gap-1">
                  {/* Pad start of week if needed */}
                  {week[0] && Array(week[0].getDay() - 1).fill(null).map((_, i) => (
                    <div key={`pad-${i}`} className="w-12 h-10" />
                  ))}
                  
                  {week.map((day) => {
                    const dateStr = day.toISOString().split('T')[0]
                    const dayData = dataMap.get(dateStr)
                    const value = dayData ? dayData[selectedMetric] : 0
                    const intensity = getIntensity(value, maxValues[selectedMetric])
                    
                    return (
                      <motion.button
                        key={dateStr}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDayClick(day)
                        }}
                        className={`w-12 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:ring-2 hover:ring-white/30 ${
                          selectedDay?.date === dateStr ? 'ring-2 ring-white' : ''
                        }`}
                        style={{
                          backgroundColor: dayData 
                            ? getBackgroundStyle(selectedMetric, intensity)
                            : 'rgba(100, 116, 139, 0.2)',
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span className="text-white">
                          {value > 0 ? formatNumber(value) : '-'}
                        </span>
                      </motion.button>
                    )
                  })}
                  
                  {/* Pad end of week if needed */}
                  {week.length < 5 && Array(5 - week.length).fill(null).map((_, i) => (
                    <div key={`pad-end-${i}`} className="w-12 h-10" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Intensity Legend */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-xs text-white/80">Less</span>
        <div className="flex gap-0.5">
          {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
            <div
              key={opacity}
              className="w-4 h-4 rounded"
              style={{
                backgroundColor: `rgba(${getColorRGB(selectedMetric)}, ${opacity})`,
              }}
            />
          ))}
        </div>
        <span className="text-xs text-white/80">More</span>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {isDetailOpen && selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-4 bg-slate-800/80 rounded-lg border border-slate-700/60"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">
                {new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h4>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCloseDetail()
                }}
                className="p-1 rounded hover:bg-slate-700/50 transition-colors"
              >
                <X size={16} className="text-white/90" />
              </button>
            </div>
            
            <div className="grid grid-cols-5 gap-3">
              {(Object.keys(METRIC_COLORS) as MetricKey[]).map((metric) => (
                <div
                  key={metric}
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: `rgba(${getColorRGB(metric)}, 0.3)` }}
                >
                  <div className="text-lg font-bold text-white">
                    {formatNumber(selectedDay[metric])}
                  </div>
                  <div className="text-xs text-white/90 mt-1">
                    {METRIC_COLORS[metric].label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click hint */}
      {!isDetailOpen && !selectedDay && (
        <div className="text-center mt-3 text-xs text-white/80">
          Click any day to view details
        </div>
      )}
    </motion.div>
  )
}

