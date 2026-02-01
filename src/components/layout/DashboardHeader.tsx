import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ChevronDown,
  Calendar,
  Search,
  Settings,
  Building2,
  Check
} from 'lucide-react'
import { format } from 'date-fns'
import { DayPicker, DateRange } from 'react-day-picker'

// Types
interface Client {
  id: string
  name: string
}

interface DashboardHeaderProps {
  clients: Client[]
  selectedClient: string | null
  onClientChange: (clientId: string | null) => void
  dateRange: { start: Date; end: Date }
  onDateRangeChange: (start: Date, end: Date) => void
  datePreset: string
  onPresetChange: (preset: string) => void
  onSearch?: (query: string) => void
  onConfigureTargets?: () => void
}

const TIME_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'thisWeek', label: 'This Week' },
  { id: 'lastWeek', label: 'Last Week' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
]

const TABS = [
  { path: '/performance', label: 'Performance' },
  { path: '/pipeline', label: 'Pipeline' },
]

export default function DashboardHeader({
  clients,
  selectedClient,
  onClientChange,
  dateRange,
  onDateRangeChange,
  datePreset,
  onPresetChange,
  onSearch,
  onConfigureTargets,
}: DashboardHeaderProps) {
  const location = useLocation()
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({
    from: dateRange.start,
    to: dateRange.end,
  })

  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const selectedClientData = clients.find(c => c.id === selectedClient)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setIsClientDropdownOpen(false)
      }
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Sync calendar range with props
  useEffect(() => {
    setCalendarRange({ from: dateRange.start, to: dateRange.end })
  }, [dateRange])

  const handlePresetClick = (presetId: string) => {
    onPresetChange(presetId)
  }

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setCalendarRange(range)
    if (range?.from && range?.to) {
      onDateRangeChange(range.from, range.to)
      setIsDatePickerOpen(false)
    }
  }

  const isCustomDateRange = datePreset === 'custom' || !TIME_PRESETS.find(p => p.id === datePreset)

  return (
    <header className="bg-white border-b border-gray-200">
      {/* Main Header Row */}
      <div className="px-6 py-3">
        <div className="flex items-center justify-between gap-6">

          {/* Left Section: Client Selector (Primary) */}
          <div className="flex items-center gap-4">
            <div ref={clientDropdownRef} className="relative">
              <button
                onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors min-w-[180px]"
              >
                <Building2 size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-900 truncate flex-1 text-left">
                  {selectedClientData?.name || 'All Clients'}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isClientDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-[320px] overflow-y-auto">
                  <button
                    onClick={() => {
                      onClientChange(null)
                      setIsClientDropdownOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
                      <Building2 size={12} className="text-gray-500" />
                    </div>
                    <span className={`flex-1 ${!selectedClient ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      All Clients
                    </span>
                    {!selectedClient && <Check size={14} className="text-blue-600" />}
                  </button>

                  <div className="h-px bg-gray-100 my-1" />

                  {clients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => {
                        onClientChange(client.id)
                        setIsClientDropdownOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center">
                        <span className="text-xs font-medium text-blue-600">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className={`flex-1 truncate ${selectedClient === client.id ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                        {client.name}
                      </span>
                      {selectedClient === client.id && <Check size={14} className="text-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200" />

            {/* Tab Navigation */}
            <nav className="flex items-center gap-1">
              {TABS.map(tab => {
                const isActive = location.pathname === tab.path
                return (
                  <NavLink
                    key={tab.path}
                    to={tab.path}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </NavLink>
                )
              })}
            </nav>
          </div>

          {/* Right Section: Time Range + Actions */}
          <div className="flex items-center gap-3">
            {/* Time Presets */}
            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
              {TIME_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    datePreset === preset.id && !isCustomDateRange
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Picker */}
            <div ref={datePickerRef} className="relative">
              <button
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-all ${
                  isCustomDateRange
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <Calendar size={14} />
                <span className="font-medium">
                  {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d, yyyy')}
                </span>
              </button>

              {isDatePickerOpen && (
                <div className="absolute top-full right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-4">
                  <div className="rdp-light">
                    <DayPicker
                      mode="range"
                      selected={calendarRange}
                      onSelect={handleCalendarSelect}
                      numberOfMonths={2}
                      showOutsideDays
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
                    />
                  </div>
                  <div className="border-t border-gray-100 mt-3 pt-3 flex justify-end">
                    <button
                      onClick={() => setIsDatePickerOpen(false)}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200" />

            {/* Search (Collapsible) */}
            <div ref={searchRef} className="relative">
              {isSearchExpanded ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      onSearch?.(e.target.value)
                    }}
                    placeholder="Search..."
                    autoFocus
                    className="w-48 pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search size={14} className="absolute left-3 text-gray-400" />
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchExpanded(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Search size={18} />
                </button>
              )}
            </div>

            {/* Settings */}
            {onConfigureTargets && (
              <button
                onClick={onConfigureTargets}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Configure Targets"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
