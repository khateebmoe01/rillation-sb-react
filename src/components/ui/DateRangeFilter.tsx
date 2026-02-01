import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react'
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
  const [isOpen, setIsOpen] = useState(false)
  const [isHoveringCustom, setIsHoveringCustom] = useState(false)
  const [isHoveringCalendar, setIsHoveringCalendar] = useState(false)
  const [isCustom, setIsCustom] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>({
    from: startDate,
    to: endDate,
  })
  const [displayMonth, setDisplayMonth] = useState(startDate)
  const containerRef = useRef<HTMLDivElement>(null)

  const showCalendar = isHoveringCustom || isHoveringCalendar || (isCustom && isOpen)

  const handlePrevMonth = () => setDisplayMonth(prev => subMonths(prev, 1))
  const handleNextMonth = () => setDisplayMonth(prev => addMonths(prev, 1))

  // Sync range from props when not in custom mode
  useEffect(() => {
    if (!isCustom) {
      setRange({ from: startDate, to: endDate })
      setDisplayMonth(startDate)
    }
  }, [startDate, endDate, isCustom])

  // Reset custom flag when a preset is selected externally
  useEffect(() => {
    if (activePreset && activePreset !== 'custom') {
      setIsCustom(false)
    }
  }, [activePreset])

  // Initialize calendar when opening dropdown in custom mode
  useEffect(() => {
    if (isOpen && isCustom) {
      setRange({ from: startDate, to: endDate })
      setDisplayMonth(startDate)
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsHoveringCustom(false)
        setIsHoveringCalendar(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset calendar range when hovering starts
  useEffect(() => {
    if (isHoveringCustom && !isHoveringCalendar) {
      setRange(isCustom ? { from: startDate, to: endDate } : undefined)
      setDisplayMonth(isCustom ? startDate : new Date())
    }
  }, [isHoveringCustom])

  const handlePresetSelect = (presetId: string) => {
    onPresetChange(presetId)
    setIsCustom(false)
    setIsOpen(false)
  }

  const handleRangeSelect = (newRange: DateRange | undefined) => {
    setRange(newRange)

    if (newRange?.from && newRange?.to) {
      const start = new Date(newRange.from)
      start.setHours(0, 0, 0, 0)
      const end = new Date(newRange.to)
      end.setHours(23, 59, 59, 999)

      if (onDateRangeChange) {
        onDateRangeChange(start, end)
      } else {
        onStartDateChange(start)
        onEndDateChange(end)
      }

      setIsCustom(true)
    }
  }

  const handleApply = () => {
    if (range?.from && range?.to) {
      const start = new Date(range.from)
      start.setHours(0, 0, 0, 0)
      const end = new Date(range.to)
      end.setHours(23, 59, 59, 999)

      if (onDateRangeChange) {
        onDateRangeChange(start, end)
      } else {
        onStartDateChange(start)
        onEndDateChange(end)
      }
      setIsCustom(true)
    }
    setIsOpen(false)
    setIsHoveringCustom(false)
    setIsHoveringCalendar(false)
  }

  const formatDisplayDate = (date: Date) => {
    return format(date, 'MMM d, yyyy')
  }

  const getDisplayLabel = () => {
    if (isCustom) {
      return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
    }
    const preset = presets.find(p => p.id === activePreset)
    return preset?.label || 'This Month'
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Main Dropdown Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (isOpen) {
            setIsHoveringCustom(false)
            setIsHoveringCalendar(false)
          }
        }}
        className={`
          flex items-center gap-3 px-5 py-2.5 min-w-[200px]
          text-sm font-medium border rounded-xl text-white
          transition-all duration-200
          ${isOpen
            ? 'bg-rillation-card-hover border-rillation-border'
            : 'bg-rillation-card border-rillation-border hover:border-white/30'
          }
        `}
      >
        <Calendar size={18} className={isCustom ? 'text-emerald-400' : 'text-white/70'} />
        <span className={isCustom ? 'text-emerald-400' : ''}>{getDisplayLabel()}</span>
        <ChevronDown
          size={14}
          className={`text-white/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 flex items-start"
          >
            {/* Calendar Panel - appears on left when hovering Custom */}
            <AnimatePresence>
              {showCalendar && (
                <motion.div
                  initial={{ opacity: 0, x: 10, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="p-8 -m-8 mr-0"
                  onMouseEnter={() => setIsHoveringCalendar(true)}
                  onMouseLeave={() => setIsHoveringCalendar(false)}
                >
                <div className="rdp-rillation bg-rillation-card border border-rillation-border rounded-xl shadow-2xl p-4 mr-2">
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
                      root: 'rdp-root',
                      months: 'rdp-months',
                      month: 'rdp-month',
                      month_caption: 'rdp-month-caption',
                      caption_label: 'rdp-caption-label',
                      nav: 'rdp-nav',
                      button_previous: 'rdp-button-previous',
                      button_next: 'rdp-button-next',
                      chevron: 'rdp-chevron',
                      month_grid: 'rdp-month-grid',
                      weekdays: 'rdp-weekdays',
                      weekday: 'rdp-weekday',
                      weeks: 'rdp-weeks',
                      week: 'rdp-week',
                      day: 'rdp-day',
                      day_button: 'rdp-day-button',
                      today: 'rdp-today',
                      outside: 'rdp-outside',
                      disabled: 'rdp-disabled',
                      hidden: 'rdp-hidden',
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

                  {/* Footer */}
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
                      onClick={handleApply}
                      disabled={!range?.from || !range?.to}
                      className={`px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-colors ${
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

            {/* Preset Options Menu */}
            <div className="bg-rillation-card border border-rillation-border rounded-xl shadow-2xl overflow-hidden min-w-[200px]">
              <div className="py-1">
                {/* Custom Option - hover triggers calendar */}
                <div
                  onMouseEnter={() => setIsHoveringCustom(true)}
                  onMouseLeave={() => setIsHoveringCustom(false)}
                  className="relative"
                >
                  {/* Extended hover zone to the left */}
                  <div className="absolute -left-10 -top-2 -bottom-2 w-12" />
                  <div
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer
                      transition-colors duration-150
                      ${isCustom || showCalendar
                        ? 'bg-emerald-700/20 text-emerald-400'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>Custom Range</span>
                    </div>
                    <ChevronLeft size={14} className={showCalendar ? 'text-emerald-400' : 'text-white/40'} />
                  </div>
                </div>

                {/* Show current custom range if active */}
                {isCustom && (
                  <div className="px-4 py-2 text-xs text-emerald-400">
                    {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
                  </div>
                )}

                {/* Divider */}
                <div className="h-px bg-rillation-border my-1" />

                {presets.map((preset) => {
                  const isActive = activePreset === preset.id && !isCustom
                  return (
                    <div key={preset.id}>
                      <button
                        onClick={() => handlePresetSelect(preset.id)}
                        className={`
                          w-full flex items-center justify-between px-4 py-2.5 text-sm
                          transition-colors duration-150
                          ${isActive
                            ? 'bg-white/10 text-white'
                            : 'text-white/80 hover:bg-white/5 hover:text-white'
                          }
                        `}
                      >
                        <span>{preset.label}</span>
                        {isActive && <Check size={14} className="text-emerald-400" />}
                      </button>
                      {isActive && (
                        <div className="px-4 py-1.5 text-xs text-emerald-400 bg-white/5">
                          {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
