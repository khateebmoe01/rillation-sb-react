import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, Plus } from 'lucide-react'

export interface CheckboxDropdownRef {
  open: () => void
  close: () => void
  isOpen: () => boolean
}

interface CheckboxDropdownProps {
  options: string[]
  selectedOptions: string[]
  onToggle: (option: string) => void
  onAdd?: (option: string) => void
  placeholder?: string
  addPlaceholder?: string
  color?: 'purple' | 'cyan' | 'blue'
  onNavigateLeft?: () => void
  onNavigateRight?: () => void
}

const CheckboxDropdown = forwardRef<CheckboxDropdownRef, CheckboxDropdownProps>(({
  options,
  selectedOptions,
  onToggle,
  onAdd,
  placeholder = 'Select options...',
  addPlaceholder = 'Add new...',
  color = 'purple',
  onNavigateLeft,
  onNavigateRight,
}, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [newValue, setNewValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    open: () => {
      setIsOpen(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    },
    close: () => setIsOpen(false),
    isOpen: () => isOpen,
  }))

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

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return

      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      } else if (event.key === 'ArrowLeft' && onNavigateLeft) {
        event.preventDefault()
        setIsOpen(false)
        onNavigateLeft()
      } else if (event.key === 'ArrowRight' && onNavigateRight) {
        event.preventDefault()
        setIsOpen(false)
        onNavigateRight()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onNavigateLeft, onNavigateRight])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleAdd = () => {
    const trimmed = newValue.trim().toLowerCase()
    if (trimmed && onAdd && !options.includes(trimmed)) {
      onAdd(trimmed)
      setNewValue('')
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
    // Let ArrowLeft/Right bubble up to document handler
  }

  const colorClasses = {
    purple: {
      bg: 'bg-rillation-purple/20',
      text: 'text-rillation-purple',
      border: 'border-rillation-purple/30',
      hover: 'hover:bg-rillation-purple/10',
      checkbox: 'accent-rillation-purple',
    },
    cyan: {
      bg: 'bg-rillation-cyan/20',
      text: 'text-rillation-cyan',
      border: 'border-rillation-cyan/30',
      hover: 'hover:bg-rillation-cyan/10',
      checkbox: 'accent-rillation-cyan',
    },
    blue: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      hover: 'hover:bg-blue-500/10',
      checkbox: 'accent-blue-500',
    },
  }

  const colors = colorClasses[color]

  const displayText = selectedOptions.length > 0
    ? `${selectedOptions.length} selected`
    : placeholder

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2 w-full px-3 py-2
          bg-rillation-bg border border-rillation-border rounded-lg
          text-sm text-white
          transition-colors hover:border-white/30
          ${isOpen ? 'border-white/40' : ''}
        `}
        whileTap={{ scale: 0.99 }}
      >
        <span className={selectedOptions.length > 0 ? colors.text : 'text-rillation-text-muted'}>
          {displayText}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-rillation-text-muted" />
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
            className="absolute top-full left-0 mt-1 w-full z-50"
          >
            <div className="bg-rillation-card border border-rillation-border rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
              {/* Add new input */}
              {onAdd && (
                <div className="p-2 border-b border-rillation-border">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ''))}
                      onKeyDown={handleInputKeyDown}
                      placeholder={addPlaceholder}
                      className="flex-1 px-2 py-1.5 bg-rillation-bg border border-rillation-border rounded text-sm text-white placeholder:text-rillation-text-muted focus:outline-none focus:border-white/30"
                    />
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={!newValue.trim()}
                      className={`p-1.5 rounded ${colors.bg} ${colors.text} disabled:opacity-50`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Options list */}
              <div className="py-1">
                {options.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-rillation-text-muted text-center">
                    No options available
                  </div>
                ) : (
                  options.map((option) => {
                    const isSelected = selectedOptions.includes(option)
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => onToggle(option)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 text-left text-sm
                          transition-colors ${colors.hover}
                          ${isSelected ? colors.bg : ''}
                        `}
                      >
                        <div className={`
                          w-4 h-4 rounded border flex items-center justify-center
                          ${isSelected ? `${colors.bg} ${colors.border}` : 'border-rillation-border'}
                        `}>
                          {isSelected && <Check size={12} className={colors.text} />}
                        </div>
                        <span className={isSelected ? colors.text : 'text-white'}>
                          {option}
                        </span>
                      </button>
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
})

CheckboxDropdown.displayName = 'CheckboxDropdown'

export default CheckboxDropdown
