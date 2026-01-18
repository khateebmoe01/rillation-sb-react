import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

export type CampaignStatus = 'active' | 'paused' | 'completed'

interface StatusOption {
  value: CampaignStatus | 'all'
  label: string
  color: string
  dotColor: string
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'All Statuses', color: 'text-slate-300', dotColor: 'bg-slate-400' },
  { value: 'active', label: 'Active', color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  { value: 'paused', label: 'Paused', color: 'text-amber-400', dotColor: 'bg-amber-400' },
  { value: 'completed', label: 'Completed', color: 'text-slate-500', dotColor: 'bg-slate-500' },
]

interface StatusFilterProps {
  selectedStatus: CampaignStatus | 'all'
  onChange: (status: CampaignStatus | 'all') => void
  statusCounts: Record<CampaignStatus | 'all', number>
}

export default function StatusFilter({
  selectedStatus,
  onChange,
  statusCounts,
}: StatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const currentOption = STATUS_OPTIONS.find(opt => opt.value === selectedStatus) || STATUS_OPTIONS[0]

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2 min-w-[160px]
          bg-slate-800/80 backdrop-blur-sm border rounded-lg
          text-sm text-white font-medium
          transition-colors
          ${isOpen ? 'border-white/40' : 'border-slate-600/50 hover:border-slate-500/50'}
        `}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <span className={`w-2 h-2 rounded-full ${currentOption.dotColor}`} />
        <span className={`flex-1 text-left truncate ${currentOption.color}`}>
          {currentOption.label}
        </span>
        <span className="text-slate-500 text-xs">
          ({statusCounts[selectedStatus]})
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-white/90" />
        </motion.div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-2 w-full min-w-[200px] z-50"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-700/50">
                <span className="text-xs font-medium text-white uppercase tracking-wider">
                  Filter by Status
                </span>
              </div>

              {/* Options */}
              <div className="py-1">
                {STATUS_OPTIONS.map((option, index) => (
                  <motion.button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left
                      transition-colors
                      ${selectedStatus === option.value 
                        ? 'bg-white/10 text-white' 
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                      }
                    `}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{ x: 2 }}
                  >
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                      ${selectedStatus === option.value ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-500'}
                    `}>
                      {selectedStatus === option.value && <Check size={12} className="text-emerald-400" />}
                    </div>
                    <span className={`w-2 h-2 rounded-full ${option.dotColor}`} />
                    <span className={`font-medium flex-1 ${option.color}`}>{option.label}</span>
                    <span className="text-slate-500 text-xs">
                      {statusCounts[option.value]}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

