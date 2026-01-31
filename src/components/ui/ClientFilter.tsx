import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, X, Building2, Search } from 'lucide-react'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients
    const query = searchQuery.toLowerCase()
    return clients.filter(client => client.toLowerCase().includes(query))
  }, [clients, searchQuery])

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

  // Clear search when dropdown closes, focus search input when opens
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setHighlightedIndex(-1)
    } else {
      // Focus search input when dropdown opens
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Reset highlighted index when search query changes
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [searchQuery])

  // Build list of selectable options (includes "All Clients" if applicable)
  const selectableOptions = useMemo(() => {
    const options: { value: string; label: string }[] = []
    if (!requireSelection && !searchQuery) {
      options.push({ value: '', label: 'All Clients' })
    }
    filteredClients.forEach(client => {
      options.push({ value: client, label: client })
    })
    return options
  }, [filteredClients, requireSelection, searchQuery])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const next = prev + 1
          return next >= selectableOptions.length ? 0 : next
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => {
          const next = prev - 1
          return next < 0 ? selectableOptions.length - 1 : next
        })
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < selectableOptions.length) {
          const option = selectableOptions[highlightedIndex]
          onChange(option.value)
          setIsOpen(false)
        }
        break
    }
  }, [isOpen, highlightedIndex, selectableOptions, onChange])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsRef.current) {
      const highlightedElement = optionsRef.current.querySelector(`[data-index="${highlightedIndex}"]`)
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  const displayValue = selectedClient || (requireSelection ? 'Select a client...' : 'All Clients')

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-3 px-3 py-2 w-full
          bg-emerald-800 backdrop-blur-sm border rounded-lg
          text-sm text-white font-medium
          transition-colors hover:bg-emerald-700
          ${isOpen ? 'border-emerald-400/50' : 'border-emerald-600/50'}
        `}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Building2 size={18} className="text-white shrink-0" />
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
            <X size={16} className="text-white/90" />
          </motion.button>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} className="text-white/90" />
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
            <div className="bg-emerald-800 backdrop-blur-xl border border-emerald-600/50 rounded-xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="p-3 border-b border-emerald-600/50">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search clients..."
                    className="w-full pl-9 pr-3 py-2 bg-emerald-900/50 border border-emerald-600/50 rounded-lg text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-emerald-400/50 transition-colors"
                  />
                </div>
              </div>

              {/* Options */}
              <div ref={optionsRef} className="max-h-[300px] overflow-y-auto">
                {/* All Clients Option - Only show if requireSelection is false and no search query */}
                {!requireSelection && !searchQuery && (
                  <>
                    <motion.button
                      data-index={0}
                      onClick={() => {
                        onChange('')
                        setIsOpen(false)
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 text-left
                        transition-colors
                        ${!selectedClient
                          ? 'bg-emerald-600/50 text-white'
                          : highlightedIndex === 0
                            ? 'bg-emerald-700/50 text-white'
                            : 'text-white/80 hover:bg-emerald-700/30 hover:text-white'
                        }
                      `}
                      whileHover={{ x: 2 }}
                    >
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${!selectedClient ? 'border-white bg-white/20' : 'border-white/40'}
                      `}>
                        {!selectedClient && <Check size={12} className="text-white" />}
                      </div>
                      <span className="font-medium">All Clients</span>
                    </motion.button>

                    {/* Divider */}
                    {filteredClients.length > 0 && (
                      <div className="h-px bg-emerald-600/50 mx-4" />
                    )}
                  </>
                )}

                {/* Client Options */}
                {filteredClients.map((client, index) => {
                  // Calculate the actual index in selectableOptions
                  const optionIndex = (!requireSelection && !searchQuery) ? index + 1 : index
                  const isHighlighted = highlightedIndex === optionIndex

                  return (
                    <motion.button
                      key={client}
                      data-index={optionIndex}
                      onClick={() => {
                        onChange(client)
                        setIsOpen(false)
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 text-left
                        transition-colors
                        ${selectedClient === client
                          ? 'bg-emerald-600/50 text-white'
                          : isHighlighted
                            ? 'bg-emerald-700/50 text-white'
                            : 'text-white/80 hover:bg-emerald-700/30 hover:text-white'
                        }
                      `}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.015 }}
                      whileHover={{ x: 2 }}
                    >
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                        ${selectedClient === client ? 'border-white bg-white/20' : 'border-white/40'}
                      `}>
                        {selectedClient === client && <Check size={12} className="text-white" />}
                      </div>
                      <span className="font-medium truncate">{client}</span>
                    </motion.button>
                  )
                })}

                {/* Empty State */}
                {filteredClients.length === 0 && (
                  <div className="px-4 py-8 text-center text-white/70 text-sm">
                    {searchQuery ? 'No clients match your search' : 'No clients available'}
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
