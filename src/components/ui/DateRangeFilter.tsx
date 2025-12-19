import { formatDateForDisplay } from '../../lib/supabase'

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
  }
  
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
            onClick={() => onPresetChange(preset.id)}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
              ${activePreset === preset.id
                ? 'bg-rillation-card-hover text-rillation-text border border-rillation-border'
                : 'text-rillation-text-muted hover:text-rillation-text hover:bg-rillation-card-hover'
              }
            `}
          >
            {preset.label}
          </button>
        ))}
      </div>
      
      {/* Custom Date Range */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={formatDateForInput(startDate)}
          onChange={(e) => handleDateChange('start', e.target.value)}
          className="px-3 py-1.5 text-xs bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple"
        />
        <span className="text-rillation-text-muted text-xs">to</span>
        <input
          type="date"
          value={formatDateForInput(endDate)}
          onChange={(e) => handleDateChange('end', e.target.value)}
          className="px-3 py-1.5 text-xs bg-rillation-card border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple"
        />
      </div>
    </div>
  )
}

