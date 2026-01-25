import { useState, useRef, useEffect, ReactNode, useId } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { useDropdown } from '../../src/contexts/DropdownContext'

interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  options: FilterSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: ReactNode
  minWidth?: number
  disabled?: boolean
}

export function FilterSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  icon,
  minWidth = 130,
  disabled = false,
}: FilterSelectProps) {
  const dropdownId = useId()
  const { isOpen, toggle, close } = useDropdown(dropdownId)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const selectedOption = options.find(o => o.value === value)
  
  // Filter options based on search term
  const filteredOptions = searchTerm
    ? options.filter(o => o.label.toLowerCase().startsWith(searchTerm.toLowerCase()))
    : options
  
  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setHighlightedIndex(-1)
    }
  }, [isOpen])
  
  // Handle keyboard navigation and search
  useEffect(() => {
    if (!isOpen) return
    
    function handleKeyDown(e: KeyboardEvent) {
      // Arrow key navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        )
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault()
        const option = filteredOptions[highlightedIndex]
        if (option) {
          onChange(option.value)
          close()
        }
      } else if (e.key === 'Escape') {
        close()
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        // Type-ahead search: accumulate typed characters
        e.preventDefault()
        
        // Clear previous timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
        
        // Add character to search term
        const newSearchTerm = searchTerm + e.key
        setSearchTerm(newSearchTerm)
        
        // Find first matching option and highlight it
        const matchIndex = options.findIndex(o => 
          o.label.toLowerCase().startsWith(newSearchTerm.toLowerCase())
        )
        if (matchIndex >= 0) {
          setHighlightedIndex(matchIndex)
          // Scroll the highlighted option into view
          const optionElements = dropdownRef.current?.querySelectorAll('button')
          if (optionElements && optionElements[matchIndex]) {
            optionElements[matchIndex].scrollIntoView({ block: 'nearest' })
          }
        }
        
        // Clear search term after 1 second of inactivity
        searchTimeoutRef.current = setTimeout(() => {
          setSearchTerm('')
        }, 1000)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [isOpen, highlightedIndex, filteredOptions, options, searchTerm, onChange, close])
  
  // Calculate dropdown position
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  
  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }
  
  useEffect(() => {
    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isOpen])
  
  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        close()
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, close])
  
  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width || minWidth,
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
            zIndex: 100000,
            overflow: 'hidden',
            maxHeight: 280,
            overflowY: 'auto',
            minWidth: minWidth,
          }}
        >
          {/* Search indicator */}
          {searchTerm && (
            <div style={{
              padding: '6px 12px',
              fontSize: 11,
              color: '#6b7280',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            }}>
              Searching: <strong>{searchTerm}</strong>
            </div>
          )}
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isHighlighted = index === highlightedIndex
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  close()
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 13,
                  backgroundColor: isHighlighted ? '#e0f2fe' : isSelected ? '#eff6ff' : 'transparent',
                  color: isSelected ? '#3b82f6' : '#111827',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.1s ease',
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={14} style={{ color: '#3b82f6' }} />}
              </button>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
  
  return (
    <>
      <div ref={containerRef} style={{ position: 'relative', minWidth }}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => !disabled && toggle()}
          disabled={disabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            outline: 'none',
            width: '100%',
            minWidth,
          }}
        >
          {icon && <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>}
          <span
            style={{
              flex: 1,
              fontSize: 13,
              color: selectedOption ? '#111827' : '#9ca3af',
              textAlign: 'left',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedOption?.label || placeholder}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            style={{ flexShrink: 0 }}
          >
            <ChevronDown size={14} style={{ color: '#9ca3af' }} />
          </motion.div>
        </button>
      </div>
      
      {/* Dropdown - rendered via portal to avoid clipping */}
      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  )
}
