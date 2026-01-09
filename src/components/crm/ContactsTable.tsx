import { useState, memo, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Check, Loader2, ExternalLink, Calendar, GripVertical, Mail, Phone, Copy, ChevronRight, Columns, Eye, EyeOff, Minus, Maximize2 } from 'lucide-react'
import { CRM_STAGES, type CRMContact, type CRMSort } from '../../types/crm'
import ContactHoverCard from './ContactHoverCard'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ContactsTableProps {
  contacts: CRMContact[]
  onContactSelect: (contact: CRMContact) => void
  onContactUpdate: (id: string, updates: Partial<CRMContact>) => Promise<boolean>
  sort?: CRMSort
  onSortChange?: (sort: CRMSort | undefined) => void
  selectedRowIndex?: number
  onSelectedRowChange?: (index: number) => void
}

// Column definition interface
interface ColumnDef {
  key: string
  label: string
  width: string
  sortable: boolean
  dropdown?: boolean
  link?: boolean
}

// Pipeline progress stages with labels and colors
const PIPELINE_STAGES = [
  { key: 'meeting_booked' as const, label: 'Meeting Booked', timestampKey: 'meeting_booked_at' as const, color: '#3b82f6', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  { key: 'showed_up_to_disco' as const, label: 'Disco Show', timestampKey: 'showed_up_to_disco_at' as const, color: '#8b5cf6', bgColor: 'bg-violet-500/20', textColor: 'text-violet-400' },
  { key: 'qualified' as const, label: 'Qualified', timestampKey: 'qualified_at' as const, color: '#06b6d4', bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-400' },
  { key: 'demo_booked' as const, label: 'Demo Booked', timestampKey: 'demo_booked_at' as const, color: '#f59e0b', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400' },
  { key: 'showed_up_to_demo' as const, label: 'Demo Show', timestampKey: 'showed_up_to_demo_at' as const, color: '#ec4899', bgColor: 'bg-pink-500/20', textColor: 'text-pink-400' },
  { key: 'proposal_sent' as const, label: 'Proposal Sent', timestampKey: 'proposal_sent_at' as const, color: '#f97316', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400' },
  { key: 'closed' as const, label: 'Closed', timestampKey: 'closed_at' as const, color: '#22c55e', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
]

// Default column widths in pixels - increased for better spacing
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  'full_name': 200,        // Lead name needs space
  'company': 180,          // Organization
  'stage': 140,            // Stage dropdown
  'pipeline_progress': 160, // Pipeline progress
  'lead_phone': 140,       // Phone numbers
  'company_phone': 140,    // Phone numbers
  'linkedin_url': 100,     // LinkedIn link
  'context': 200,          // Context notes
  'next_touchpoint': 140,  // Date
  'lead_source': 130,      // Source tag
  'industry': 150,         // Industry
  'created_at': 120,       // Date
  'company_website': 120,  // Website link
}

// Column definitions with emojis
const COLUMNS: ColumnDef[] = [
  { key: 'full_name', label: '👤 Lead Name', width: 'w-44', sortable: true },
  { key: 'company', label: '🏢 Organization', width: 'w-40', sortable: true },
  { key: 'stage', label: '📊 Stage', width: 'w-32', sortable: true },
  { key: 'pipeline_progress', label: '🚀 Pipeline', width: 'w-44', sortable: false, dropdown: true },
  { key: 'lead_phone', label: '📱 Lead Phone', width: 'w-32', sortable: true },
  { key: 'company_phone', label: '☎️ Company Phone', width: 'w-32', sortable: true },
  { key: 'linkedin_url', label: '💼 LinkedIn', width: 'w-28', sortable: false, link: true },
  { key: 'context', label: '📝 Context', width: 'w-48', sortable: false },
  { key: 'next_touchpoint', label: '📅 Next Touch', width: 'w-32', sortable: true },
  { key: 'lead_source', label: '🎯 Source', width: 'w-28', sortable: true },
  { key: 'industry', label: '🏭 Industry', width: 'w-32', sortable: true },
  { key: 'created_at', label: '🕐 Created', width: 'w-32', sortable: true },
  { key: 'company_website', label: '🌐 Website', width: 'w-36', sortable: false, link: true },
]

// Pipeline Progress dropdown component
interface PipelineProgressCellProps {
  contact: CRMContact
  onSave: (id: string, updates: Partial<CRMContact>) => Promise<boolean>
}

const PipelineProgressCell = memo(({ contact, onSave }: PipelineProgressCellProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState<string | null>(null)

  // Find the deepest (latest) stage that is checked
  let deepestStage: typeof PIPELINE_STAGES[number] | null = null
  for (let i = PIPELINE_STAGES.length - 1; i >= 0; i--) {
    if (Boolean(contact[PIPELINE_STAGES[i].key])) {
      deepestStage = PIPELINE_STAGES[i]
      break
    }
  }

  const handleToggle = async (stage: typeof PIPELINE_STAGES[number]) => {
    setIsSaving(stage.key)
    const currentValue = Boolean(contact[stage.key])
    const newValue = !currentValue
    
    await onSave(contact.id, {
      [stage.key]: newValue,
      [stage.timestampKey]: newValue ? new Date().toISOString() : null,
    })
    
    setIsSaving(null)
  }

  return (
    <div className="relative flex justify-center" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-none ${
          deepestStage 
            ? `${deepestStage.bgColor} ${deepestStage.textColor}` 
            : 'bg-rillation-card-hover text-rillation-text-muted'
        }`}
      >
        {deepestStage ? (
          <span className="truncate max-w-[90px] font-medium">
            {deepestStage.label}
          </span>
        ) : (
          <span>—</span>
        )}
        <ChevronDown size={11} className="flex-shrink-0 opacity-70" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-72 bg-rillation-card border border-rillation-border rounded-lg shadow-xl z-50 py-2 max-h-96 overflow-y-auto">
            <div className="px-3 pb-2 border-b border-rillation-border mb-2">
              <h4 className="text-xs font-semibold text-rillation-text tracking-wide">Pipeline Progress</h4>
            </div>
            {PIPELINE_STAGES.map((stage) => {
              const isChecked = Boolean(contact[stage.key])
              const timestamp = contact[stage.timestampKey] as string | undefined
              const isLoading = isSaving === stage.key

              return (
                <button
                  key={stage.key}
                  onClick={() => handleToggle(stage)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-rillation-card-hover transition-colors text-left"
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      isChecked
                        ? 'bg-rillation-green border-rillation-green'
                        : 'border-rillation-border hover:border-rillation-text-muted bg-rillation-card'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : isChecked ? (
                      <Check size={14} className="text-white" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-rillation-text">{stage.label}</div>
                    {isChecked && timestamp && (
                      <div className="text-xs text-rillation-text-muted flex items-center gap-1 mt-0.5">
                        <Calendar size={11} />
                        {new Date(timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
})

PipelineProgressCell.displayName = 'PipelineProgressCell'

// Editable cell for inline editing
interface EditableCellProps {
  value: string
  contactId: string
  field: keyof CRMContact
  onSave: (id: string, updates: Partial<CRMContact>) => Promise<boolean>
  rowIndex: number
  totalRows: number
}

const EditableCell = memo(({ value, contactId, field, onSave, rowIndex, totalRows }: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSave = async (moveToNext = false) => {
    if (editValue === value) {
      setIsEditing(false)
      if (moveToNext) focusNextRow()
      return
    }

    setIsSaving(true)
    const success = await onSave(contactId, { [field]: editValue })
    setIsSaving(false)
    
    if (success) {
      setIsEditing(false)
      if (moveToNext) focusNextRow()
    } else {
      setEditValue(value)
    }
  }

  const focusNextRow = () => {
    if (rowIndex < totalRows - 1) {
      // Find the next row's cell with the same field and click it
      setTimeout(() => {
        const nextCell = document.querySelector(
          `[data-editable-cell][data-row="${rowIndex + 1}"][data-field="${field}"]`
        ) as HTMLElement
        if (nextCell) {
          nextCell.click()
        }
      }, 50)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave(true) // Save and move to next row
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => handleSave(false)}
          autoFocus
          className="w-full px-2 py-1 bg-rillation-bg border border-rillation-text-muted rounded text-sm text-rillation-text focus:outline-none"
        />
        {isSaving && <Loader2 size={14} className="animate-spin text-rillation-text-muted" />}
      </div>
    )
  }

  return (
    <span
      data-editable-cell
      data-row={rowIndex}
      data-field={field}
      onClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
      className="cursor-text hover:bg-rillation-card-hover px-2 py-1 -mx-2 -my-1 rounded transition-colors truncate block"
    >
      {value || '-'}
    </span>
  )
})

EditableCell.displayName = 'EditableCell'

// Stage cell with dropdown
interface StageCellProps {
  contact: CRMContact
  onSave: (id: string, updates: Partial<CRMContact>) => Promise<boolean>
}

const StageCell = memo(({ contact, onSave }: StageCellProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const currentStage = CRM_STAGES.find((s) => s.id === contact.stage) || CRM_STAGES[0]

  const handleStageChange = async (stageId: string) => {
    setIsSaving(true)
    await onSave(contact.id, { stage: stageId })
    setIsSaving(false)
    setIsOpen(false)
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSaving}
        className="flex items-center gap-2 px-2 py-1 rounded-lg text-sm transition-colors hover:bg-rillation-card-hover"
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: currentStage.color }}
        />
        <span className="text-rillation-text truncate">{currentStage.label}</span>
        {isSaving ? (
          <Loader2 size={12} className="animate-spin flex-shrink-0" />
        ) : (
          <ChevronDown size={12} className="text-rillation-text-muted flex-shrink-0" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-44 bg-rillation-card border border-rillation-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
            {CRM_STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => handleStageChange(stage.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-rillation-card-hover transition-colors ${
                  stage.id === contact.stage ? 'bg-rillation-card-hover' : ''
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-rillation-text">{stage.label}</span>
                {stage.id === contact.stage && (
                  <Check size={14} className="ml-auto text-rillation-green" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
})

StageCell.displayName = 'StageCell'

// Sortable header component
interface SortableHeaderProps {
  label: string
  field: string
  sortable: boolean
  currentSort?: CRMSort
  onSort?: (sort: CRMSort | undefined) => void
}

function SortableHeader({ label, field, sortable, currentSort, onSort }: SortableHeaderProps) {
  if (!sortable || !onSort) {
    return <span>{label}</span>
  }

  const isActive = currentSort?.field === field
  const direction = isActive ? currentSort.direction : null

  const handleClick = () => {
    if (!isActive) {
      onSort({ field: field as keyof CRMContact, direction: 'asc' })
    } else if (direction === 'asc') {
      onSort({ field: field as keyof CRMContact, direction: 'desc' })
    } else {
      onSort(undefined)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 text-rillation-text hover:opacity-80 transition-opacity group"
    >
      <span>{label}</span>
      <div className="flex flex-col">
        <ChevronUp 
          size={10} 
          className={`-mb-1 ${isActive && direction === 'asc' ? 'text-rillation-text' : 'text-rillation-text/40 group-hover:text-rillation-text/60'}`} 
        />
        <ChevronDown 
          size={10} 
          className={`${isActive && direction === 'desc' ? 'text-rillation-text' : 'text-rillation-text/40 group-hover:text-rillation-text/60'}`} 
        />
      </div>
    </button>
  )
}

// Column resize handle component
interface ColumnResizeHandleProps {
  onResize: (deltaX: number) => void
}

function ColumnResizeHandle({ onResize }: ColumnResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef<number>(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    startXRef.current = e.clientX
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current
      if (Math.abs(deltaX) > 0) {
        onResize(deltaX)
        startXRef.current = e.clientX
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, onResize])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${
        isResizing 
          ? 'bg-rillation-text-muted' 
          : 'hover:bg-rillation-text-muted/50 group-hover:bg-rillation-text-muted/30'
      }`}
      style={{ zIndex: 10 }}
    >
      {/* Invisible wider hit area for easier dragging */}
      <div className="absolute inset-0 -right-2 -left-2" />
    </div>
  )
}

// Draggable column header component
interface DraggableColumnHeaderProps {
  column: ColumnDef
  sort?: CRMSort
  onSortChange?: (sort: CRMSort | undefined) => void
  width: number
  onResize: (columnKey: string, newWidth: number) => void
  isMinimized: boolean
  onToggleMinimize: (columnKey: string) => void
}

function DraggableColumnHeader({ column, sort, onSortChange, width, onResize, isMinimized, onToggleMinimize }: DraggableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key })

  const handleResize = useCallback((deltaX: number) => {
    const newWidth = Math.max(80, Math.min(width + deltaX, 800)) // Min 80px, Max 800px
    onResize(column.key, newWidth)
  }, [width, onResize, column.key])

  const handleDoubleClick = useCallback(() => {
    // Don't allow minimizing the name column
    if (column.key !== 'full_name') {
      onToggleMinimize(column.key)
    }
  }, [column.key, onToggleMinimize])

  const displayWidth = isMinimized ? MINIMIZED_WIDTH : width

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : undefined,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
    width: `${displayWidth}px`,
  }

  // Minimized view - just show expand icon
  if (isMinimized) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex-shrink-0 flex items-center justify-center py-3 cursor-pointer hover:bg-rillation-card-hover transition-colors ${isDragging ? 'bg-rillation-card-hover rounded' : ''}`}
        onClick={handleDoubleClick}
        title={`Expand ${column.label}`}
      >
        <Maximize2 size={12} className="text-rillation-text-muted" />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex-shrink-0 text-left px-3 py-3 text-xs font-medium text-rillation-text tracking-wide whitespace-nowrap flex items-center gap-1 relative ${isDragging ? 'bg-rillation-card-hover rounded' : ''}`}
      onDoubleClick={handleDoubleClick}
      title={column.key !== 'full_name' ? 'Double-click to minimize' : undefined}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 hover:bg-rillation-card-hover rounded opacity-40 hover:opacity-100 transition-opacity"
      >
        <GripVertical size={12} />
      </div>
      <SortableHeader
        label={column.label}
        field={column.key}
        sortable={column.sortable}
        currentSort={sort}
        onSort={onSortChange}
      />
      {/* Minimize button - show on hover */}
      {column.key !== 'full_name' && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleMinimize(column.key)
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-rillation-card-hover rounded transition-opacity ml-auto"
          title="Minimize column"
        >
          <Minus size={10} className="text-rillation-text-muted" />
        </button>
      )}
      <ColumnResizeHandle onResize={handleResize} />
    </div>
  )
}

// Link cell component
function LinkCell({ url, label }: { url?: string | null; label?: string }) {
  if (!url) return <span className="text-rillation-text-muted">-</span>

  const href = url.startsWith('http') ? url : `https://${url}`
  const displayText = label || (url.includes('linkedin') ? 'Profile' : new URL(href).hostname.replace('www.', ''))

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 truncate"
    >
      <span className="truncate">{displayText}</span>
      <ExternalLink size={12} className="flex-shrink-0" />
    </a>
  )
}

// Format date for display - full year
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Row Quick Actions component
interface RowQuickActionsProps {
  contact: CRMContact
  onSave: (id: string, updates: Partial<CRMContact>) => Promise<boolean>
  onSelect: () => void
}

const RowQuickActions = memo(({ contact, onSave, onSelect }: RowQuickActionsProps) => {
  const [isCopied, setIsCopied] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Get current and next stage
  const currentStageIndex = CRM_STAGES.findIndex(s => s.id === contact.stage)
  const nextStage = CRM_STAGES[currentStageIndex + 1]

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (contact.email) {
      await navigator.clipboard.writeText(contact.email)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const handleAdvanceStage = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (nextStage && !isUpdating) {
      setIsUpdating(true)
      await onSave(contact.id, { stage: nextStage.id })
      setIsUpdating(false)
    }
  }

  return (
    <div 
      className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-rillation-card/90 backdrop-blur-sm rounded-lg px-1 py-0.5 border border-rillation-border shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Copy Email */}
      {contact.email && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyEmail}
            className="p-1.5 rounded-md hover:bg-rillation-card-hover transition-none"
            title={isCopied ? 'Copied!' : 'Copy email'}
          >
          {isCopied ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <Copy size={14} className="text-rillation-text-muted" />
          )}
        </motion.button>
      )}

      {/* Email */}
      {contact.email && (
        <motion.a
          href={`mailto:${contact.email}`}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-md hover:bg-rillation-card-hover transition-none"
          title="Send email"
        >
          <Mail size={14} className="text-rillation-text-muted" />
        </motion.a>
      )}

      {/* Phone */}
      {contact.lead_phone && (
        <motion.a
          href={`tel:${contact.lead_phone}`}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-md hover:bg-rillation-card-hover transition-none"
          title="Call"
        >
          <Phone size={14} className="text-rillation-text-muted" />
        </motion.a>
      )}

      {/* Advance Stage */}
      {nextStage && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleAdvanceStage}
          disabled={isUpdating}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-rillation-card-hover transition-none text-xs"
          title={`Move to ${nextStage.label}`}
        >
          {isUpdating ? (
            <Loader2 size={12} className="animate-spin text-rillation-text-muted" />
          ) : (
            <>
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: nextStage.color }}
              />
              <ChevronRight size={12} className="text-rillation-text-muted" />
            </>
          )}
        </motion.button>
      )}

      {/* View Details */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        className="px-2 py-1 rounded-md bg-rillation-green/20 hover:bg-rillation-green/30 transition-none text-xs text-rillation-text"
      >
        View
      </motion.button>
    </div>
  )
})

RowQuickActions.displayName = 'RowQuickActions'

// Get cell value for rendering
function getCellValue(
  contact: CRMContact, 
  column: ColumnDef, 
  onSave: (id: string, updates: Partial<CRMContact>) => Promise<boolean>, 
  onSelect: () => void,
  rowIndex: number,
  totalRows: number
) {
  const key = column.key

  // Pipeline Progress dropdown
  if (column.dropdown && key === 'pipeline_progress') {
    return <PipelineProgressCell contact={contact} onSave={onSave} />
  }

  // Link columns
  if (column.link) {
    const linkValue = key === 'linkedin_url' ? contact.linkedin_url : 
                      key === 'company_website' ? contact.company_website : undefined
    return <LinkCell url={linkValue} />
  }

  switch (key) {
    case 'full_name':
      return (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-rillation-card-hover border border-rillation-border rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-rillation-text-muted">
              {contact.first_name?.[0] || contact.full_name?.[0] || '?'}
              {contact.last_name?.[0] || ''}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className="text-left hover:text-blue-400 transition-colors truncate text-rillation-text"
          >
            {contact.full_name || contact.email}
          </button>
        </div>
      )
    
    case 'company':
      return (
        <EditableCell
          value={contact.company || ''}
          contactId={contact.id}
          field="company"
          onSave={onSave}
          rowIndex={rowIndex}
          totalRows={totalRows}
        />
      )
    
    case 'stage':
      return <StageCell contact={contact} onSave={onSave} />
    
    case 'lead_phone':
    case 'company_phone':
      return (
        <EditableCell
          value={contact[key] || ''}
          contactId={contact.id}
          field={key}
          onSave={onSave}
          rowIndex={rowIndex}
          totalRows={totalRows}
        />
      )
    
    case 'context':
      const contextValue = contact.context || ''
      return (
        <span className="text-rillation-text-muted truncate block max-w-[180px]" title={contextValue}>
          {contextValue || '-'}
        </span>
      )
    
    case 'next_touchpoint':
      return <span className="text-rillation-text-muted">{formatDate(contact.next_touchpoint)}</span>
    
    case 'created_at':
      return <span className="text-rillation-text-muted">{formatDate(contact.created_at)}</span>
    
    case 'lead_source':
      return contact.lead_source ? (
        <span className="text-xs px-2 py-1 bg-rillation-card-hover rounded-full text-rillation-text-muted">
          {contact.lead_source}
        </span>
      ) : (
        <span className="text-rillation-text-muted">-</span>
      )
    
    case 'industry':
      return (
        <EditableCell
          value={contact.industry || ''}
          contactId={contact.id}
          field="industry"
          onSave={onSave}
          rowIndex={rowIndex}
          totalRows={totalRows}
        />
      )
    
    default:
      return <span className="text-rillation-text-muted truncate">-</span>
  }
}

// LocalStorage keys
const COLUMN_ORDER_KEY = 'crm-column-order'
const COLUMN_WIDTHS_KEY = 'crm-column-widths'
const COLUMN_VISIBILITY_KEY = 'crm-column-visibility'
const COLUMN_MINIMIZED_KEY = 'crm-column-minimized'

// Minimized column width
const MINIMIZED_WIDTH = 40

// Default visible columns - show all columns
const DEFAULT_VISIBLE_COLUMNS = new Set([
  'full_name',
  'company',
  'stage',
  'pipeline_progress',
  'lead_phone',
  'company_phone',
  'linkedin_url',
  'context',
  'next_touchpoint',
  'lead_source',
  'industry',
  'created_at',
  'company_website',
])

// Get initial column visibility from localStorage or use defaults
function getInitialColumnVisibility(): Set<string> {
  try {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY)
    if (saved) {
      return new Set(JSON.parse(saved))
    }
  } catch (e) {
    // Ignore
  }
  return new Set(DEFAULT_VISIBLE_COLUMNS)
}

// Get initial minimized columns from localStorage
function getInitialMinimizedColumns(): Set<string> {
  try {
    const saved = localStorage.getItem(COLUMN_MINIMIZED_KEY)
    if (saved) {
      return new Set(JSON.parse(saved))
    }
  } catch (e) {
    // Ignore
  }
  return new Set()
}

// Get initial column order from localStorage or use default
function getInitialColumnOrder(): string[] {
  try {
    const saved = localStorage.getItem(COLUMN_ORDER_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as string[]
      // Validate that all saved columns still exist and add any new ones
      const validKeys = new Set(COLUMNS.map(c => c.key))
      const savedKeys = parsed.filter(key => validKeys.has(key))
      const newKeys = COLUMNS.map(c => c.key).filter(key => !savedKeys.includes(key))
      return [...savedKeys, ...newKeys]
    }
  } catch (e) {
    // Ignore errors
  }
  return COLUMNS.map(c => c.key)
}

// Get initial column widths from localStorage or use defaults
function getInitialColumnWidths(): Record<string, number> {
  try {
    const saved = localStorage.getItem(COLUMN_WIDTHS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, number>
      // Merge saved widths with defaults to handle new columns
      return { ...DEFAULT_COLUMN_WIDTHS, ...parsed }
    }
  } catch (e) {
    // Ignore errors
  }
  return { ...DEFAULT_COLUMN_WIDTHS }
}

export default function ContactsTable({ 
  contacts, 
  onContactSelect, 
  onContactUpdate,
  sort,
  onSortChange,
  selectedRowIndex = -1,
  onSelectedRowChange,
}: ContactsTableProps) {
  const headerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  
  // Column order state with localStorage persistence
  const [columnOrder, setColumnOrder] = useState<string[]>(getInitialColumnOrder)
  
  // Column widths state with localStorage persistence
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(getInitialColumnWidths)

  // Column visibility state with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(getInitialColumnVisibility)
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  
  // Minimized columns state with localStorage persistence
  const [minimizedColumns, setMinimizedColumns] = useState<Set<string>>(getInitialMinimizedColumns)

  // Hover card state
  const [hoveredContact, setHoveredContact] = useState<CRMContact | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle row hover with delay
  const handleRowMouseEnter = useCallback((contact: CRMContact, event: React.MouseEvent) => {
    const rowElement = event.currentTarget as HTMLElement
    const rect = rowElement.getBoundingClientRect()
    
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    
    // Set a delay before showing the hover card
    hoverTimeoutRef.current = setTimeout(() => {
      // Position the card to the right of the viewport, or to the left if not enough space
      const cardWidth = 320
      const viewportWidth = window.innerWidth
      const left = rect.right + 10 + cardWidth > viewportWidth 
        ? Math.max(10, rect.left - cardWidth - 10)
        : rect.right + 10
      
      setHoverPosition({
        top: Math.max(10, Math.min(rect.top, window.innerHeight - 400)),
        left,
      })
      setHoveredContact(contact)
    }, 150) // Quick 150ms delay
  }, [])

  const handleRowMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setHoveredContact(null)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])
  
  // Get ordered and visible columns
  const orderedColumns = columnOrder
    .map(key => COLUMNS.find(c => c.key === key))
    .filter((c): c is ColumnDef => c !== undefined && visibleColumns.has(c.key))

  // Save column order to localStorage
  useEffect(() => {
    localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder))
  }, [columnOrder])

  // Save column widths to localStorage
  useEffect(() => {
    localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(columnWidths))
  }, [columnWidths])

  // Save column visibility to localStorage
  useEffect(() => {
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify([...visibleColumns]))
  }, [visibleColumns])

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnKey)) {
        // Don't allow hiding the first column (full_name)
        if (columnKey === 'full_name') return prev
        next.delete(columnKey)
      } else {
        next.add(columnKey)
      }
      return next
    })
  }, [])

  // Save minimized columns to localStorage
  useEffect(() => {
    localStorage.setItem(COLUMN_MINIMIZED_KEY, JSON.stringify([...minimizedColumns]))
  }, [minimizedColumns])

  // Toggle column minimized state
  const toggleColumnMinimized = useCallback((columnKey: string) => {
    // Don't allow minimizing the first column (full_name)
    if (columnKey === 'full_name') return
    
    setMinimizedColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnKey)) {
        next.delete(columnKey)
      } else {
        next.add(columnKey)
      }
      return next
    })
  }, [])

  // Handle column resize
  const handleColumnResize = useCallback((columnKey: string, newWidth: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: Math.max(80, Math.min(newWidth, 800)), // Min 80px, Max 800px
    }))
  }, [])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle column drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  // Track horizontal scroll for shadow indicator
  const [isScrolled, setIsScrolled] = useState(false)

  // Sync horizontal scroll between header and body
  const handleBodyScroll = useCallback(() => {
    if (bodyRef.current && headerRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft
      // Show shadow when scrolled horizontally
      setIsScrolled(bodyRef.current.scrollLeft > 0)
    }
  }, [])

  // Separate first column from rest for sticky behavior
  const firstColumn = orderedColumns[0]
  const scrollableColumns = orderedColumns.slice(1)
  const firstColumnWidth = firstColumn ? (columnWidths[firstColumn.key] || DEFAULT_COLUMN_WIDTHS[firstColumn.key] || 176) : 176

  return (
    <div className="h-full min-h-0 bg-rillation-card rounded-xl border border-rillation-border flex flex-col overflow-hidden">
      {/* Fixed Header - doesn't scroll vertically */}
      <div 
        className="flex-shrink-0 border-b border-rillation-border flex"
        style={{ backgroundColor: '#0d1117' }}
      >
        {/* Column Picker Button */}
        <div className="flex-shrink-0 px-2 py-2 flex items-center border-r border-rillation-border/50 relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowColumnPicker(!showColumnPicker)}
            className={`p-2 rounded-lg transition-none ${
              showColumnPicker 
                ? 'bg-rillation-green/20 text-rillation-green' 
                : 'hover:bg-rillation-card-hover text-rillation-text-muted hover:text-rillation-text'
            }`}
            title="Toggle columns"
          >
            <Columns size={16} />
          </motion.button>

          {/* Column Picker Dropdown */}
          <AnimatePresence>
            {showColumnPicker && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowColumnPicker(false)} 
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.05 }}
                  className="absolute top-full left-0 mt-1 w-56 bg-rillation-card border border-rillation-border rounded-xl shadow-2xl z-50 py-2 max-h-80 overflow-y-auto"
                >
                  <div className="px-3 py-2 border-b border-rillation-border/50 mb-1">
                    <p className="text-xs font-medium text-rillation-text">Show Columns</p>
                    <p className="text-xs text-rillation-text-muted mt-0.5">
                      {visibleColumns.size} of {COLUMNS.length} visible
                    </p>
                  </div>
                  {COLUMNS.map((col) => {
                    const isVisible = visibleColumns.has(col.key)
                    const isLocked = col.key === 'full_name' // Can't hide name column
                    return (
                      <button
                        key={col.key}
                        onClick={() => !isLocked && toggleColumnVisibility(col.key)}
                        disabled={isLocked}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                          isLocked 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-rillation-card-hover'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isVisible 
                            ? 'bg-rillation-green border-rillation-green' 
                            : 'border-rillation-border'
                        }`}>
                          {isVisible && <Check size={12} className="text-white" />}
                        </div>
                        {isVisible ? (
                          <Eye size={14} className="text-rillation-text-muted" />
                        ) : (
                          <EyeOff size={14} className="text-rillation-text-muted/50" />
                        )}
                        <span className={isVisible ? 'text-rillation-text' : 'text-rillation-text-muted'}>
                          {col.label}
                        </span>
                        {isLocked && (
                          <span className="ml-auto text-xs text-rillation-text-muted">Required</span>
                        )}
                      </button>
                    )
                  })}
                  <div className="px-3 py-2 border-t border-rillation-border/50 mt-1">
                    <button
                      onClick={() => setVisibleColumns(new Set(DEFAULT_VISIBLE_COLUMNS))}
                      className="text-xs text-rillation-text-muted hover:text-rillation-text transition-colors"
                    >
                      Reset to defaults
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        {/* Sticky first column header */}
        {firstColumn && (
          <div 
            className={`flex-shrink-0 sticky left-0 z-20 bg-[#0d1117] transition-shadow ${
              isScrolled ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.4)]' : ''
            }`}
            style={{ width: `${firstColumnWidth}px` }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={[firstColumn.key]}
                strategy={horizontalListSortingStrategy}
              >
                <DraggableColumnHeader
                  column={firstColumn}
                  sort={sort}
                  onSortChange={onSortChange}
                  width={firstColumnWidth}
                  onResize={handleColumnResize}
                  isMinimized={false}
                  onToggleMinimize={toggleColumnMinimized}
                />
              </SortableContext>
            </DndContext>
          </div>
        )}
        
        {/* Scrollable columns header */}
        <div 
          ref={headerRef}
          className="flex-1 overflow-x-hidden"
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={scrollableColumns.map(c => c.key)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex" style={{ minWidth: '1800px' }}>
                {scrollableColumns.map((column) => (
                  <DraggableColumnHeader
                    key={column.key}
                    column={column}
                    sort={sort}
                    onSortChange={onSortChange}
                    width={columnWidths[column.key] || DEFAULT_COLUMN_WIDTHS[column.key] || 128}
                    onResize={handleColumnResize}
                    isMinimized={minimizedColumns.has(column.key)}
                    onToggleMinimize={toggleColumnMinimized}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
      
      {/* Scrollable Body */}
      <div 
        ref={bodyRef}
        className="flex-1 min-h-0 overflow-auto"
        onScroll={handleBodyScroll}
      >
        {contacts.length === 0 ? (
          <div className="px-4 py-12 text-center text-rillation-text-muted">
            No contacts found
          </div>
        ) : (
          contacts.map((contact, index) => {
            const isSelected = index === selectedRowIndex
            return (
              <motion.div
                key={contact.id}
                initial={false}
                animate={{ 
                  backgroundColor: isSelected ? 'rgba(34, 197, 94, 0.2)' : 'transparent'
                }}
                whileHover={{ 
                  backgroundColor: isSelected 
                    ? 'rgba(34, 197, 94, 0.25)' 
                    : 'rgba(255, 255, 255, 0.03)'
                }}
                transition={{ duration: 0 }}
                className={`flex group cursor-pointer border-b border-rillation-border/50 relative ${
                  isSelected ? 'ring-1 ring-inset ring-rillation-green/50' : ''
                }`}
                onClick={() => {
                  onSelectedRowChange?.(index)
                  onContactSelect(contact)
                }}
                onMouseEnter={(e) => handleRowMouseEnter(contact, e)}
                onMouseLeave={handleRowMouseLeave}
                ref={(el) => {
                  // Scroll selected row into view
                  if (isSelected && el) {
                    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                  }
                }}
              >
                {/* Quick Actions */}
                <RowQuickActions
                  contact={contact}
                  onSave={onContactUpdate}
                  onSelect={() => onContactSelect(contact)}
                />
                {/* Spacer to align with column picker button in header */}
                <div className="flex-shrink-0 px-2 py-2 flex items-center border-r border-rillation-border/50">
                  <div className="p-2 w-4" />
                </div>
                {/* Sticky first column cell */}
                {firstColumn && (
                  <div
                    className={`flex-shrink-0 sticky left-0 z-10 px-3 py-4 text-sm text-rillation-text transition-all ${
                      isSelected 
                        ? 'bg-rillation-green/20' 
                        : 'bg-rillation-card group-hover:bg-rillation-card-hover/50'
                    } ${isScrolled ? 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.4)]' : ''}`}
                    style={{ width: `${firstColumnWidth}px` }}
                  >
                    {getCellValue(contact, firstColumn, onContactUpdate, () => onContactSelect(contact), index, contacts.length)}
                  </div>
                )}
                
                {/* Scrollable columns cells */}
                <div className="flex" style={{ minWidth: '1800px' }}>
                  {scrollableColumns.map((column) => {
                    const isMinimized = minimizedColumns.has(column.key)
                    const width = isMinimized ? MINIMIZED_WIDTH : (columnWidths[column.key] || DEFAULT_COLUMN_WIDTHS[column.key] || 128)
                    return (
                      <div
                        key={column.key}
                        className={`flex-shrink-0 text-sm text-rillation-text ${isMinimized ? 'px-1 py-4' : 'px-3 py-4'}`}
                        style={{ width: `${width}px` }}
                        title={isMinimized ? column.label : undefined}
                      >
                        {isMinimized ? (
                          <span className="text-rillation-text-muted text-xs">•</span>
                        ) : (
                          getCellValue(contact, column, onContactUpdate, () => onContactSelect(contact), index, contacts.length)
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Hover Card Portal */}
      <AnimatePresence>
        {hoveredContact && (
          <ContactHoverCard
            contact={hoveredContact}
            position={hoverPosition}
            onOpenDetail={() => {
              setHoveredContact(null)
              onContactSelect(hoveredContact)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
