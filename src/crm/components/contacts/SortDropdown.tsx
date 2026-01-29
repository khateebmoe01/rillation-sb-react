import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpDown, Plus, X, GripVertical, ChevronDown, Check } from 'lucide-react'
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { theme } from '../../config/theme'

// ============================================
// TYPES
// ============================================
export type SortDirection = 'asc' | 'desc'
export type SortFieldType = 'text' | 'date' | 'number' | 'currency' | 'select'

export interface SortRule {
  id: string
  fieldKey: string
  label: string
  type: SortFieldType
  direction: SortDirection
}

export interface SortField {
  key: string
  label: string
  type: SortFieldType
}

// ============================================
// SORT FIELDS CONFIGURATION
// ============================================
export const SORT_FIELDS: SortField[] = [
  { key: 'last_activity', label: 'Last Activity', type: 'date' },
  { key: 'created_at', label: 'Created Date', type: 'date' },
  { key: 'stage', label: 'Stage', type: 'select' },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'epv', label: 'EPV', type: 'currency' },
  { key: 'next_touchpoint', label: 'Next Touchpoint', type: 'date' },
  { key: 'meeting_date', label: 'Meeting Date', type: 'date' },
]

// ============================================
// HELPER FUNCTIONS
// ============================================
export function getDirectionLabels(type: SortFieldType): { asc: string; desc: string } {
  switch (type) {
    case 'date':
      return { asc: 'Earliest → Latest', desc: 'Latest → Earliest' }
    case 'select':
      return { asc: 'First → Last', desc: 'Last → First' }
    case 'currency':
    case 'number':
      return { asc: 'Low → High', desc: 'High → Low' }
    case 'text':
    default:
      return { asc: 'A → Z', desc: 'Z → A' }
  }
}

// ============================================
// SORTABLE ROW COMPONENT
// ============================================
interface SortableRowProps {
  sort: SortRule
  onUpdateField: (fieldKey: string) => void
  onToggleDirection: () => void
  onRemove: () => void
  availableFields: SortField[]
}

function SortableRow({ sort, onUpdateField, onToggleDirection, onRemove, availableFields }: SortableRowProps) {
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false)
  const fieldDropdownRef = useRef<HTMLDivElement>(null)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sort.id })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  
  // Close field dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(event.target as Node)) {
        setFieldDropdownOpen(false)
      }
    }
    if (fieldDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [fieldDropdownOpen])
  
  const directionLabels = getDirectionLabels(sort.type)
  const currentDirectionLabel = sort.direction === 'asc' ? directionLabels.asc : directionLabels.desc
  
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        backgroundColor: isDragging ? theme.bg.hover : 'transparent',
        borderRadius: theme.radius.md,
      }}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          cursor: 'grab',
          color: theme.text.muted,
          flexShrink: 0,
        }}
      >
        <GripVertical size={14} />
      </div>
      
      {/* Field Selector */}
      <div style={{ position: 'relative', flex: 1 }} ref={fieldDropdownRef}>
        <button
          onClick={() => setFieldDropdownOpen(!fieldDropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '6px 10px',
            fontSize: theme.fontSize.sm,
            color: theme.text.primary,
            backgroundColor: theme.bg.muted,
            border: `1px solid ${theme.border.default}`,
            borderRadius: theme.radius.md,
            cursor: 'pointer',
            transition: `all ${theme.transition.fast}`,
          }}
        >
          <span>{sort.label}</span>
          <ChevronDown size={12} style={{ color: theme.text.muted }} />
        </button>
        
        <AnimatePresence>
          {fieldDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.1 }}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                backgroundColor: theme.bg.elevated,
                border: `1px solid ${theme.border.default}`,
                borderRadius: theme.radius.md,
                boxShadow: theme.shadow.dropdown,
                zIndex: 10001,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {availableFields.map(field => (
                <button
                  key={field.key}
                  onClick={() => {
                    onUpdateField(field.key)
                    setFieldDropdownOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: theme.fontSize.sm,
                    color: field.key === sort.fieldKey ? theme.accent.primary : theme.text.primary,
                    fontWeight: field.key === sort.fieldKey ? theme.fontWeight.medium : theme.fontWeight.normal,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: `background-color ${theme.transition.fast}`,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {field.key === sort.fieldKey && <Check size={12} style={{ color: theme.accent.primary }} />}
                  </span>
                  {field.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Direction Toggle */}
      <button
        onClick={onToggleDirection}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 10px',
          fontSize: theme.fontSize.xs,
          color: theme.accent.primary,
          backgroundColor: theme.accent.primaryBg,
          border: `1px solid ${theme.accent.primary}40`,
          borderRadius: theme.radius.md,
          cursor: 'pointer',
          transition: `all ${theme.transition.fast}`,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <ArrowUpDown size={10} />
        {currentDirectionLabel}
      </button>
      
      {/* Remove Button */}
      <button
        onClick={onRemove}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: theme.radius.sm,
          color: theme.text.muted,
          cursor: 'pointer',
          transition: `all ${theme.transition.fast}`,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = theme.status.errorBg
          e.currentTarget.style.color = theme.status.error
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = theme.text.muted
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ============================================
// FIELD PICKER (when no sorts exist)
// ============================================
interface FieldPickerProps {
  availableFields: SortField[]
  onSelectField: (fieldKey: string) => void
}

function FieldPicker({ availableFields, onSelectField }: FieldPickerProps) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ 
        padding: '8px 12px', 
        fontSize: theme.fontSize.xs, 
        color: theme.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Pick a field to sort by
      </div>
      {availableFields.map(field => (
        <button
          key={field.key}
          onClick={() => onSelectField(field.key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 12px',
            fontSize: theme.fontSize.sm,
            color: theme.text.primary,
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            transition: `background-color ${theme.transition.fast}`,
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowUpDown size={14} style={{ color: theme.text.muted }} />
          {field.label}
        </button>
      ))}
    </div>
  )
}

// ============================================
// MAIN SORT DROPDOWN COMPONENT
// ============================================
interface SortDropdownProps {
  sorts: SortRule[]
  onUpdateSorts: (sorts: SortRule[]) => void
  availableFields?: SortField[]
}

export function SortDropdown({ 
  sorts, 
  onUpdateSorts, 
  availableFields = SORT_FIELDS 
}: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )
  
  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (buttonRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
    }
    
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen])
  
  // Add a new sort at the top
  const addSort = (fieldKey: string) => {
    const field = availableFields.find(f => f.key === fieldKey)
    if (!field) return
    
    const newSort: SortRule = {
      id: `sort-${Date.now()}`,
      fieldKey: field.key,
      label: field.label,
      type: field.type,
      direction: 'asc', // Default to ascending
    }
    
    // Add at the top (highest priority)
    onUpdateSorts([newSort, ...sorts])
  }
  
  // Update a sort's field
  const updateSortField = (id: string, fieldKey: string) => {
    const field = availableFields.find(f => f.key === fieldKey)
    if (!field) return
    
    onUpdateSorts(sorts.map(s => 
      s.id === id 
        ? { ...s, fieldKey: field.key, label: field.label, type: field.type }
        : s
    ))
  }
  
  // Toggle sort direction
  const toggleDirection = (id: string) => {
    onUpdateSorts(sorts.map(s => 
      s.id === id 
        ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
        : s
    ))
  }
  
  // Remove a sort
  const removeSort = (id: string) => {
    onUpdateSorts(sorts.filter(s => s.id !== id))
  }
  
  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = sorts.findIndex(s => s.id === active.id)
      const newIndex = sorts.findIndex(s => s.id === over.id)
      onUpdateSorts(arrayMove(sorts, oldIndex, newIndex))
    }
  }
  
  const sortCount = sorts.length
  const hasSorts = sortCount > 0
  
  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: '#fff',
          backgroundColor: theme.accent.primary,
          border: `1px solid ${theme.accent.primary}`,
          borderRadius: theme.radius.md,
          cursor: 'pointer',
          transition: `all ${theme.transition.fast}`,
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.primaryHover}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.accent.primary}
      >
        <ArrowUpDown size={14} />
        <span>Sort</span>
        {hasSorts && (
          <span style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.25)', 
            color: '#fff', 
            borderRadius: theme.radius.full,
            padding: '1px 6px',
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
            minWidth: 18,
            textAlign: 'center',
          }}>
            {sortCount}
          </span>
        )}
      </button>
      
      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              minWidth: 380,
              backgroundColor: theme.bg.elevated,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.lg,
              boxShadow: theme.shadow.dropdown,
              zIndex: 10000,
            }}
          >
            {/* Header */}
            <div style={{ 
              padding: '12px 16px', 
              borderBottom: `1px solid ${theme.border.default}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ 
                fontSize: theme.fontSize.sm, 
                fontWeight: theme.fontWeight.semibold, 
                color: theme.text.primary,
              }}>
                Sort
              </span>
              {hasSorts && (
                <button
                  onClick={() => onUpdateSorts([])}
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: theme.text.muted,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: theme.radius.sm,
                    transition: `all ${theme.transition.fast}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.bg.hover
                    e.currentTarget.style.color = theme.text.secondary
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = theme.text.muted
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
            
            {/* Content */}
            <div style={{ maxHeight: 400, overflowY: 'visible', overflowX: 'visible' }}>
              {!hasSorts ? (
                <FieldPicker 
                  availableFields={availableFields} 
                  onSelectField={addSort} 
                />
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sorts.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div style={{ padding: '8px 4px' }}>
                      {sorts.map(sort => (
                        <SortableRow
                          key={sort.id}
                          sort={sort}
                          onUpdateField={(fieldKey) => updateSortField(sort.id, fieldKey)}
                          onToggleDirection={() => toggleDirection(sort.id)}
                          onRemove={() => removeSort(sort.id)}
                          availableFields={availableFields}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
            
            {/* Footer - Add sort button */}
            {hasSorts && (
              <div style={{ 
                padding: '12px 16px', 
                borderTop: `1px solid ${theme.border.default}`,
              }}>
                <button
                  onClick={() => {
                    // Add first available field that isn't already in sorts
                    const usedFields = new Set(sorts.map(s => s.fieldKey))
                    const nextField = availableFields.find(f => !usedFields.has(f.key))
                    if (nextField) {
                      addSort(nextField.key)
                    } else if (availableFields.length > 0) {
                      // If all fields are used, add the first one anyway
                      addSort(availableFields[0].key)
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    fontSize: theme.fontSize.sm,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.accent.primary,
                    backgroundColor: 'transparent',
                    border: `1px solid ${theme.border.default}`,
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                    transition: `all ${theme.transition.fast}`,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.primaryBg}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Plus size={14} />
                  Add sort
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
