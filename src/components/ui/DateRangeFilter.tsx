import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format, addMonths, subMonths } from 'date-fns'

interface DateRangeFilterProps {
  startDate: Date
  endDate: Date
  onStartDateChange: (date: Date) => void
  onEndDateChange: (date: Date) => void
  onDateRangeChange?: (start: Date, end: Date) => void
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
  onDateRangeChange,
  onPresetChange,
  activePreset,
}: DateRangeFilterProps) {
  // isSelectingCustom: true when user is actively picking dates in the calendar
  // This completely blocks prop sync until selection is complete
  const [isSelectingCustom, setIsSelectingCustom] = useState(false)
  // hasCustomSelection: true after user has made a custom selection (for UI indicator)
  const [hasCustomSelection, setHasCustomSelection] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  })
  const [displayMonth, setDisplayMonth] = useState(startDate)
  const containerRef = useRef<HTMLDivElement>(null)

  const handlePrevMonth = () => setDisplayMonth(prev => subMonths(prev, 1))
  const handleNextMonth = () => setDisplayMonth(prev => addMonths(prev, 1))

  // Only sync from props when using PRESETS (not custom dates)
  // When user has custom selection or is actively selecting, don't overwrite
  useEffect(() => {
    if (!isSelectingCustom && !hasCustomSelection) {
      setRange({ from: startDate, to: endDate })
      setDisplayMonth(startDate)
    }
  }, [startDate, endDate, isSelectingCustom, hasCustomSelection])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // When closing by clicking outside, end custom selection mode
        setIsSelectingCustom(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset custom flags when a preset is selected
  useEffect(() => {
    if (activePreset && activePreset !== 'custom') {
      setHasCustomSelection(false)
      setIsSelectingCustom(false)
    }
  }, [activePreset])

  const handleRangeSelect = (newRange: DateRange | undefined) => {
    // Update local state immediately - this is the source of truth during selection
    setRange(newRange)

    // Only propagate to parent when we have a complete range (both dates selected)
    if (newRange?.from && newRange?.to) {
      const start = new Date(newRange.from)
      start.setHours(0, 0, 0, 0)
      const end = new Date(newRange.to)
      end.setHours(23, 59, 59, 999)

      // Use combined callback if available (avoids race condition with debounce)
      if (onDateRangeChange) {
        onDateRangeChange(start, end)
      } else {
        onStartDateChange(start)
        onEndDateChange(end)
      }

      // Mark as having a custom selection for the UI indicator
      setHasCustomSelection(true)
      // Keep isSelectingCustom true until calendar closes to prevent prop sync issues
    }
    // If only from is selected (first click), don't propagate yet - wait for second click
  }

  const formatDisplayDate = (date: Date) => {
    return format(date, 'MMM d, yyyy')
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Preset Buttons */}
      <div className="flex gap-1">
        {presets.map((preset) => {
          const isActive = activePreset === preset.id && !hasCustomSelection
          return (
            <button
              key={preset.id}
              onClick={() => {
                onPresetChange(preset.id)
                setHasCustomSelection(false)
                setIsSelectingCustom(false)
                setIsOpen(false)
              }}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-rillation-card-hover text-white border border-rillation-border'
                  : 'text-white/80 hover:text-white hover:bg-rillation-card-hover border border-transparent'
                }
              `}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {/* Custom indicator - shown when custom dates are selected */}
      <AnimatePresence>
        {hasCustomSelection && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-700/20 text-emerald-400 border border-emerald-700/30"
          >
            <Calendar size={12} />
            <span className="text-xs font-medium">Custom</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Date Range Picker */}
      <div className="relative" ref={containerRef}>
        {/* Date Range Button */}
        <button
          onClick={() => {
            if (!isOpen) {
              // Opening calendar - clear selection for fresh start
              // User explicitly wants to pick new dates from scratch
              setRange(undefined)
              setDisplayMonth(new Date()) // Start at current month
              setIsSelectingCustom(true) // Block prop sync during selection
            } else {
              // Closing calendar
              setIsSelectingCustom(false)
            }
            setIsOpen(!isOpen)
          }}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-xs
            bg-rillation-card border rounded-lg text-white
            transition-all duration-200 hover:border-white/50
            ${isOpen ? 'border-white' : 'border-rillation-border'}
          `}
        >
          <Calendar size={14} className="text-white/70" />
          {isSelectingCustom && range?.from ? (
            <>
              <span>{formatDisplayDate(range.from)}</span>
              <span className="text-white/50">-</span>
              <span>{range.to ? formatDisplayDate(range.to) : '...'}</span>
            </>
          ) : (
            <>
              <span>{formatDisplayDate(startDate)}</span>
              <span className="text-white/50">-</span>
              <span>{formatDisplayDate(endDate)}</span>
            </>
          )}
        </button>

        {/* Calendar Popover */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50"
            >
              <div className="rdp-rillation bg-rillation-card border border-rillation-border rounded-xl shadow-2xl p-4">
                {/* Navigation Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-rillation-border">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium text-white">
                    {format(displayMonth, 'MMMM yyyy')} - {format(addMonths(displayMonth, 1), 'MMMM yyyy')}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={handleRangeSelect}
                  month={displayMonth}
                  onMonthChange={setDisplayMonth}
                  numberOfMonths={2}
                  showOutsideDays
                  hideNavigation
                  classNames={{
                    // Root and layout - v9 API
                    root: 'rdp-root',
                    months: 'rdp-months',
                    month: 'rdp-month',
                    month_caption: 'rdp-month-caption',
                    caption_label: 'rdp-caption-label',
                    nav: 'rdp-nav',
                    button_previous: 'rdp-button-previous',
                    button_next: 'rdp-button-next',
                    chevron: 'rdp-chevron',
                    // Grid structure - v9 API
                    month_grid: 'rdp-month-grid',
                    weekdays: 'rdp-weekdays',
                    weekday: 'rdp-weekday',
                    weeks: 'rdp-weeks',
                    week: 'rdp-week',
                    day: 'rdp-day',
                    day_button: 'rdp-day-button',
                    // Day states - v9 API
                    today: 'rdp-today',
                    outside: 'rdp-outside',
                    disabled: 'rdp-disabled',
                    hidden: 'rdp-hidden',
                    // Selection states - v9 API
                    selected: 'rdp-selected',
                    range_start: 'rdp-range-start',
                    range_middle: 'rdp-range-middle',
                    range_end: 'rdp-range-end',
                  }}
                  components={{
                    Chevron: ({ orientation }) => (
                      orientation === 'left'
                        ? <ChevronLeft className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />
                    ),
                  }}
                />

                {/* Quick actions footer */}
                <div className="border-t border-rillation-border mt-4 pt-3 flex justify-between items-center">
                  <span className="text-xs text-white/50">
                    {range?.from && range?.to
                      ? `${Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} days selected`
                      : range?.from
                        ? 'Select end date'
                        : 'Select start date'
                    }
                  </span>
                  <button
                    onClick={() => {
                      // Explicitly propagate the selected dates on Apply
                      if (range?.from && range?.to) {
                        const start = new Date(range.from)
                        start.setHours(0, 0, 0, 0)
                        const end = new Date(range.to)
                        end.setHours(23, 59, 59, 999)

                        // Use combined callback if available (avoids race condition)
                        if (onDateRangeChange) {
                          onDateRangeChange(start, end)
                        } else {
                          // Fallback to individual callbacks
                          onStartDateChange(start)
                          onEndDateChange(end)
                        }
                        setHasCustomSelection(true)
                      }
                      setIsOpen(false)
                      setIsSelectingCustom(false)
                    }}
                    disabled={!range?.from || !range?.to}
                    className={`px-3 py-1 text-xs font-medium text-white rounded-md transition-colors ${
                      range?.from && range?.to
                        ? 'bg-emerald-700 hover:bg-emerald-600'
                        : 'bg-emerald-700/50 cursor-not-allowed'
                    }`}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
