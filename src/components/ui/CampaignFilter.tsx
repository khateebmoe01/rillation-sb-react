import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, X } from 'lucide-react'

interface CampaignFilterProps {
  campaigns: string[]
  selectedCampaigns: string[]
  onChange: (campaigns: string[]) => void
}

export default function CampaignFilter({
  campaigns,
  selectedCampaigns,
  onChange,
}: CampaignFilterProps) {
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

  const toggleCampaign = (campaign: string) => {
    if (selectedCampaigns.includes(campaign)) {
      onChange(selectedCampaigns.filter(c => c !== campaign))
    } else {
      onChange([...selectedCampaigns, campaign])
    }
  }

  const clearAll = () => {
    onChange([])
  }

  const displayValue = selectedCampaigns.length === 0 
    ? 'All Campaigns' 
    : selectedCampaigns.length === 1 
      ? selectedCampaigns[0] 
      : `${selectedCampaigns.length} Campaigns`

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2 min-w-[200px]
          bg-slate-800/80 backdrop-blur-sm border rounded-lg
          text-sm text-white font-medium
          transition-colors
          ${isOpen ? 'border-white/40' : 'border-slate-600/50 hover:border-slate-500/50'}
        `}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <span className="flex-1 text-left truncate">{displayValue}</span>
        {selectedCampaigns.length > 0 && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              clearAll()
            }}
            className="p-0.5 hover:bg-white/10 rounded"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X size={14} className="text-white/90" />
          </motion.button>
        )}
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
            className="absolute top-full right-0 mt-2 w-full min-w-[280px] z-50"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
                  Filter by Campaign
                </span>
                {selectedCampaigns.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-white/80 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Options */}
              <div className="max-h-[300px] overflow-y-auto">
                {/* Campaign Options */}
                {campaigns.length === 0 ? (
                  <div className="px-4 py-8 text-center text-white/80 text-sm">
                    No campaigns available
                  </div>
                ) : (
                  campaigns.map((campaign, index) => {
                    const isSelected = selectedCampaigns.includes(campaign)
                    return (
                      <motion.button
                        key={campaign}
                        onClick={() => toggleCampaign(campaign)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 text-left
                          transition-colors
                          ${isSelected 
                            ? 'bg-emerald-500/10 text-white' 
                            : 'text-white/80 hover:bg-white/5 hover:text-white'
                          }
                        `}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={{ x: 2 }}
                      >
                        <div className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                          ${isSelected ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-500'}
                        `}>
                          {isSelected && <Check size={12} className="text-emerald-400" />}
                        </div>
                        <span className="font-medium truncate">{campaign}</span>
                      </motion.button>
                    )
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
