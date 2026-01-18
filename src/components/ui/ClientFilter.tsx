import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, X, Building2 } from 'lucide-react'

interface ClientFilterProps {
  clients: string[]
  selectedClient: string
  onChange: (client: string) => void
  label?: string
  requireSelection?: boolean // If true, hides "All Clients" option
}

export default function ClientFilter({
  clients,
  selectedClient,
  onChange,
  requireSelection = false,
}: ClientFilterProps) {
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

  const displayValue = selectedClient || (requireSelection ? 'Select a client...' : 'All Clients')

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2 min-w-[180px]
          bg-slate-800/80 backdrop-blur-sm border rounded-lg
          text-sm text-white font-medium
          transition-colors
          ${isOpen ? 'border-white/40' : 'border-slate-600/50 hover:border-slate-500/50'}
        `}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Building2 size={14} className="text-white shrink-0" />
        <span className="flex-1 text-left truncate">{displayValue}</span>
        {selectedClient && !requireSelection && (
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
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
            className="absolute top-full right-0 mt-2 w-full min-w-[220px] z-50"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-700/50">
                <span className="text-xs font-medium text-white uppercase tracking-wider">
                  Select Client
                </span>
              </div>

              {/* Options */}
              <div className="max-h-[300px] overflow-y-auto">
                {/* All Clients Option - Only show if requireSelection is false */}
                {!requireSelection && (
                  <>
                    <motion.button
                      onClick={() => {
                        onChange('')
                        setIsOpen(false)
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 text-left
                        transition-colors
                        ${!selectedClient 
                          ? 'bg-white/10 text-white' 
                          : 'text-white/80 hover:bg-white/5 hover:text-white'
                        }
                      `}
                      whileHover={{ x: 2 }}
                    >
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${!selectedClient ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-500'}
                      `}>
                        {!selectedClient && <Check size={12} className="text-emerald-400" />}
                      </div>
                      <span className="font-medium">All Clients</span>
                    </motion.button>

                    {/* Divider */}
                    {clients.length > 0 && (
                      <div className="h-px bg-slate-700/50 mx-4" />
                    )}
                  </>
                )}

                {/* Client Options */}
                {clients.map((client, index) => (
                  <motion.button
                    key={client}
                    onClick={() => {
                      onChange(client)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left
                      transition-colors
                      ${selectedClient === client 
                        ? 'bg-white/10 text-white' 
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                      }
                    `}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.015 }}
                    whileHover={{ x: 2 }}
                  >
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                      ${selectedClient === client ? 'border-emerald-400 bg-emerald-400/20' : 'border-slate-500'}
                    `}>
                      {selectedClient === client && <Check size={12} className="text-emerald-400" />}
                    </div>
                    <span className="font-medium truncate">{client}</span>
                  </motion.button>
                ))}

                {/* Empty State */}
                {clients.length === 0 && (
                  <div className="px-4 py-8 text-center text-white/80 text-sm">
                    No clients available
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
