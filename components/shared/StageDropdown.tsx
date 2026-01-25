import { useRef, useEffect, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { useDropdown } from '../../src/contexts/DropdownContext'
import { theme } from '../../config/theme'

interface Stage {
  value: string
  label: string
  color: string
}

const STAGES: Stage[] = [
  { value: 'interested', label: 'Interested', color: '#60a5fa' },
  { value: 'engaged', label: 'Engaged', color: '#8b5cf6' },
  { value: 'qualified', label: 'Qualified', color: '#f59e0b' },
  { value: 'demo', label: 'Demo', color: '#f97316' },
  { value: 'proposal', label: 'Proposal', color: '#14b8a6' },
  { value: 'closed', label: 'Closed Won', color: '#22c55e' },
  { value: 'disqualified', label: 'Disqualified', color: '#6b7280' },
]

interface StageDropdownProps {
  value: string | null
  onChange: (value: string) => void
  disabled?: boolean
}

export function StageDropdown({ value, onChange, disabled = false }: StageDropdownProps) {
  const dropdownId = useId()
  const { isOpen, toggle, close } = useDropdown(dropdownId)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedStage = STAGES.find(s => s.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        close()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, close])

  const handleSelect = (stageValue: string) => {
    onChange(stageValue)
    close()
  }

  return (
    <div 
      ref={dropdownRef} 
      style={{ position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) toggle()
        }}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          backgroundColor: theme.bg.elevated,
          border: `1px solid ${theme.border.default}`,
          borderRadius: theme.radius.lg,
          color: theme.text.primary,
          fontSize: theme.fontSize.sm,
          cursor: disabled ? 'not-allowed' : 'pointer',
          minWidth: 140,
          justifyContent: 'space-between',
          opacity: disabled ? 0.5 : 1,
          transition: `all ${theme.transition.fast}`,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = theme.border.strong
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = theme.border.default
        }}
      >
        {selectedStage ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: theme.radius.full,
                backgroundColor: selectedStage.color,
                flexShrink: 0,
              }}
            />
            <span>{selectedStage.label}</span>
          </div>
        ) : (
          <span style={{ color: theme.text.muted }}>Select stage</span>
        )}
        <ChevronDown size={14} style={{ color: theme.text.muted, flexShrink: 0 }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              minWidth: 220,
              maxHeight: 400,
              overflowY: 'auto',
              backgroundColor: theme.bg.elevated,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.xl,
              boxShadow: theme.shadow.dropdown,
              zIndex: theme.z.dropdown,
              padding: 4,
            }}
          >
            {STAGES.map((stage) => (
              <button
                key={stage.value}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect(stage.value)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: value === stage.value ? theme.bg.active : 'transparent',
                  border: 'none',
                  borderRadius: theme.radius.lg,
                  color: theme.text.primary,
                  fontSize: theme.fontSize.sm,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: `all ${theme.transition.fast}`,
                }}
                onMouseEnter={(e) => {
                  if (value !== stage.value) {
                    e.currentTarget.style.backgroundColor = theme.bg.hover
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== stage.value) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: theme.radius.full,
                    backgroundColor: stage.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1 }}>{stage.label}</span>
                {value === stage.value && (
                  <Check size={14} style={{ color: theme.accent.primary, flexShrink: 0 }} />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
