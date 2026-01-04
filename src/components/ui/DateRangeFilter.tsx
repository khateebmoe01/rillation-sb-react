import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar } from 'lucide-react'

interface DateRangeFilterProps {
  startDate: Date
  endDate: Date
  onStartDateChange: (date: Date) => void
  onEndDateChange: (date: Date) => void
  onPresetChange: (preset: string) => void
  activePreset: string
}

const presets = [
  { id: 'today', label: 'Today' },
  { id: 'thisWeek', label: 'This Week' },
  { id: 'lastWeek', label: 'Last Week' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
]

export default function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onPresetChange,
  activePreset,
}: DateRangeFilterProps) {
  const [isCustom, setIsCustom] = useState(false)
  
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    // Parse date as local time to avoid timezone issues
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    
    if (type === 'start') {
      date.setHours(0, 0, 0, 0)
      onStartDateChange(date)
    } else {
      date.setHours(23, 59, 59, 999)
      onEndDateChange(date)
    }
    
    // Mark as custom when user manually changes dates
    setIsCustom(true)
  }
  
  // Reset custom flag when a preset is selected
  useEffect(() => {
    if (activePreset && activePreset !== 'custom') {
      setIsCustom(false)
    }
  }, [activePreset])
  
  // Helper to format date for input without timezone conversion
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Preset Buttons */}
      <div className="flex gap-1">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => {
              onPresetChange(preset.id)
              setIsCustom(false)
            }}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
              ${activePreset === preset.id && !isCustom
                ? 'bg-rillation-card-hover text-white border border-rillation-border'
                : 'text-white/80 hover:text-white hover:bg-rillation-card-hover'
              }
            `}
          >
            {preset.label}
          </button>
        ))}
      </div>
      
      {/* Custom Date Range */}
      <div className="flex items-center gap-2">
        {/* Custom indicator */}
        <AnimatePresence>
          {isCustom && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -10 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30"
            >
              <Calendar size={12} />
              <span className="text-xs font-medium">Custom</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <input
          type="date"
          value={formatDateForInput(startDate)}
          onChange={(e) => handleDateChange('start', e.target.value)}
          className="px-3 py-1.5 text-xs bg-rillation-card border border-rillation-border rounded-lg text-white focus:outline-none focus:border-white"
        />
        <span className="text-white text-xs">to</span>
        <input
          type="date"
          value={formatDateForInput(endDate)}
          onChange={(e) => handleDateChange('end', e.target.value)}
          className="px-3 py-1.5 text-xs bg-rillation-card border border-rillation-border rounded-lg text-white focus:outline-none focus:border-white"
        />
      </div>
    </div>
  )
}

