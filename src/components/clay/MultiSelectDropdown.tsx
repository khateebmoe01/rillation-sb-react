import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Search, Check, X } from 'lucide-react'

interface MultiSelectDropdownProps {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  label?: string
  searchable?: boolean
  maxHeight?: number
  className?: string
}

export default function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  label,
  searchable = true,
  maxHeight = 280,
  className = '',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const query = searchQuery.toLowerCase()
    return options.filter(option => option.toLowerCase().includes(query))
  }, [options, searchQuery])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleToggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const displayText = value.length === 0
    ? placeholder
    : value.length === 1
      ? value[0]
      : `${value.length} selected`

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-rillation-text mb-2">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text hover:border-white/20 focus:outline-none focus:border-white/40 transition-colors"
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <span className={`truncate ${value.length === 0 ? 'text-rillation-text/60' : ''}`}>
          {displayText}
        </span>
        <div className="flex items-center gap-2">
          {value.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center w-5 h-5 bg-white/10 rounded-full text-xs font-medium"
              onClick={handleClearAll}
            >
              <X size={12} />
            </motion.span>
          )}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={14} className="text-rillation-text/70" />
          </motion.div>
        </div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50"
          >
            <div className="bg-rillation-card border border-rillation-border rounded-xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              {searchable && (
                <div className="p-2 border-b border-rillation-border/50">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rillation-text/50" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-9 pr-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text/40 focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Options List */}
              <div
                className="overflow-y-auto py-1"
                style={{ maxHeight }}
              >
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => {
                    const isSelected = value.includes(option)
                    return (
                      <motion.button
                        key={option}
                        type="button"
                        onClick={() => handleToggle(option)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                          isSelected
                            ? 'bg-white/10 text-rillation-text'
                            : 'text-rillation-text/80 hover:bg-white/5'
                        }`}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.01, 0.2) }}
                        whileHover={{ x: 2 }}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-white border-white'
                              : 'border-rillation-border hover:border-white/40'
                          }`}
                        >
                          {isSelected && <Check size={10} className="text-black" />}
                        </div>
                        <span className="truncate">{option}</span>
                      </motion.button>
                    )
                  })
                ) : (
                  <div className="px-3 py-6 text-center text-rillation-text/60 text-sm">
                    No options found
                  </div>
                )}
              </div>

              {/* Footer with selection count and clear */}
              {value.length > 0 && (
                <div className="p-2 border-t border-rillation-border/50 flex items-center justify-between">
                  <span className="text-xs text-rillation-text/70">
                    {value.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-rillation-text/70 hover:text-rillation-text transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Tags (show first 3) */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.slice(0, 3).map((item) => (
            <motion.span
              key={item}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 rounded-md text-xs text-rillation-text"
            >
              <span className="truncate max-w-[150px]">{item}</span>
              <button
                type="button"
                onClick={() => handleToggle(item)}
                className="hover:text-red-400 transition-colors"
              >
                <X size={10} />
              </button>
            </motion.span>
          ))}
          {value.length > 3 && (
            <span className="px-2 py-1 text-xs text-rillation-text/70">
              +{value.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}
