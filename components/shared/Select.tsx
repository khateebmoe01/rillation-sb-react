import { useState, useRef, useEffect, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { theme } from '../../config/theme'

interface Option {
  value: string
  label: string
  icon?: ReactNode
  color?: string
}

interface SelectProps {
  options: Option[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  error,
  disabled = false,
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(o => o.value === value)
  
  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  return (
    <div ref={containerRef} className={className} style={{ width: '100%', position: 'relative' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            color: theme.text.secondary,
            marginBottom: 6,
          }}
        >
          {label}
        </label>
      )}
      
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: '100%',
          height: 40,
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: theme.fontSize.base,
          backgroundColor: theme.bg.card,
          color: selectedOption ? theme.text.primary : theme.text.muted,
          border: `1px solid ${error ? theme.status.error : isOpen ? theme.border.focus : theme.border.default}`,
          borderRadius: theme.radius.lg,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          outline: 'none',
          textAlign: 'left',
          transition: `border-color ${theme.transition.fast}`,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflow: 'hidden' }}>
          {selectedOption?.icon}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedOption?.label || placeholder}
          </span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} style={{ color: theme.text.muted }} />
        </motion.div>
      </button>
      
      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              backgroundColor: theme.bg.elevated,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.lg,
              boxShadow: theme.shadow.dropdown,
              zIndex: theme.z.dropdown,
              overflow: 'hidden',
              maxHeight: 280,
              overflowY: 'auto',
            }}
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: theme.fontSize.base,
                    backgroundColor: isSelected ? theme.accent.primaryBg : 'transparent',
                    color: isSelected ? theme.accent.primary : theme.text.primary,
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: `background-color ${theme.transition.fast}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = theme.bg.hover
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isSelected ? theme.accent.primaryBg : 'transparent'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {option.icon}
                    {option.label}
                  </span>
                  {isSelected && <Check size={14} />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
      
      {error && (
        <p
          style={{
            fontSize: theme.fontSize.xs,
            color: theme.status.error,
            marginTop: 4,
          }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
