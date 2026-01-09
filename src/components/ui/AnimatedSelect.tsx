import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface AnimatedSelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  labelIcon?: React.ReactNode
  className?: string
  disabled?: boolean
  /** Show checkmark next to selected item */
  showCheck?: boolean
  /** Size variant */
  size?: 'sm' | 'md'
}

export default function AnimatedSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  labelIcon,
  className = '',
  disabled = false,
  showCheck = true,
  size = 'md',
}: AnimatedSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  const selectedOption = options.find(opt => opt.value === value)
  const displayValue = selectedOption?.label || placeholder

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3 py-2 text-sm',
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-white/70 mb-1.5">
          {labelIcon && <span className="inline mr-1.5">{labelIcon}</span>}
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <motion.button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 
          bg-slate-800 border border-slate-700 rounded-lg text-white
          ${sizeClasses[size]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600 focus:outline-none focus:border-violet-500'}
          transition-colors
        `}
        whileHover={disabled ? {} : { scale: 1.005 }}
        whileTap={disabled ? {} : { scale: 0.995 }}
      >
        <span className={`truncate ${!selectedOption ? 'text-white/40' : ''}`}>
          {displayValue}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown size={size === 'sm' ? 12 : 14} className="text-white/60" />
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
            className="absolute top-full left-0 right-0 mt-1.5 z-50"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden">
              <div className="max-h-64 overflow-y-auto py-1">
                {options.map((option, index) => {
                  const isSelected = option.value === value
                  return (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors
                        ${isSelected ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5'}
                      `}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={{ x: 2 }}
                    >
                      {showCheck && (
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-violet-500 border-violet-500'
                              : 'border-slate-500'
                          }`}
                        >
                          {isSelected && <Check size={10} className="text-white" />}
                        </div>
                      )}
                      {option.icon && (
                        <span className="flex-shrink-0">{option.icon}</span>
                      )}
                      <span className="truncate">{option.label}</span>
                    </motion.button>
                  )
                })}
                {options.length === 0 && (
                  <div className="px-3 py-4 text-center text-white/40 text-sm">
                    No options available
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
