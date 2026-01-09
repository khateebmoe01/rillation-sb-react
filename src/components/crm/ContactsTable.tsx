import { useState, memo, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, Check, Loader2, ExternalLink, Calendar } from 'lucide-react'
import { CRM_STAGES, type CRMContact, type CRMSort } from '../../types/crm'

interface ContactsTableProps {
  contacts: CRMContact[]
  onContactSelect: (contact: CRMContact) => void
  onContactUpdate: (id: string, updates: Partial<CRMContact>) => Promise<boolean>
  sort?: CRMSort
  onSortChange?: (sort: CRMSort | undefined) => void
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

// Pipeline progress stages with labels
const PIPELINE_STAGES = [
  { key: 'meeting_booked' as const, label: 'Meeting Booked', timestampKey: 'meeting_booked_at' as const },
  { key: 'showed_up_to_disco' as const, label: 'Disco Show', timestampKey: 'showed_up_to_disco_at' as const },
  { key: 'qualified' as const, label: 'Qualified', timestampKey: 'qualified_at' as const },
  { key: 'demo_booked' as const, label: 'Demo Booked', timestampKey: 'demo_booked_at' as const },
  { key: 'showed_up_to_demo' as const, label: 'Demo Show', timestampKey: 'showed_up_to_demo_at' as const },
  { key: 'proposal_sent' as const, label: 'Proposal Sent', timestampKey: 'proposal_sent_at' as const },
  { key: 'closed' as const, label: 'Closed', timestampKey: 'closed_at' as const },
]

// Column definitions - Lead Name first, removed assignee, combined checkboxes into Pipeline Progress
const COLUMNS: ColumnDef[] = [
  { key: 'full_name', label: 'Lead Name', width: 'w-44', sortable: true },
  { key: 'company', label: 'Organization', width: 'w-40', sortable: true },
  { key: 'stage', label: 'Stage', width: 'w-32', sortable: true },
  { key: 'pipeline_progress', label: 'Pipeline Progress', width: 'w-44', sortable: false, dropdown: true },
  { key: 'lead_phone', label: 'Lead Phone', width: 'w-32', sortable: true },
  { key: 'company_phone', label: 'Company Phone', width: 'w-32', sortable: true },
  { key: 'linkedin_url', label: 'LinkedIn', width: 'w-28', sortable: false, link: true },
  { key: 'context', label: 'Context', width: 'w-48', sortable: false },
  { key: 'next_touchpoint', label: 'Next Touchpoint', width: 'w-32', sortable: true },
  { key: 'lead_source', label: 'Lead Source', width: 'w-28', sortable: true },
  { key: 'industry', label: 'Industry', width: 'w-32', sortable: true },
  { key: 'created_at', label: 'Created Time', width: 'w-32', sortable: true },
  { key: 'company_website', label: 'Company Website', width: 'w-36', sortable: false, link: true },
]

// Pipeline Progress dropdown component
interface PipelineProgressCellProps {
  contact: CRMContact
  onSave: (id: string, updates: Partial<CRMContact>) => Promise<boolean>
}

const PipelineProgressCell = memo(({ contact, onSave }: PipelineProgressCellProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState<string | null>(null)

  // Count how many are checked
  const checkedCount = PIPELINE_STAGES.filter(stage => Boolean(contact[stage.key])).length

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
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg text-sm transition-colors hover:bg-crm-card-hover text-crm-text"
      >
        <span className="text-xs text-crm-text-muted">
          {checkedCount}/{PIPELINE_STAGES.length}
        </span>
        <ChevronDown size={14} className="text-crm-text-muted" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-72 bg-crm-card border border-crm-border rounded-lg shadow-xl z-50 py-2 max-h-96 overflow-y-auto">
            <div className="px-3 pb-2 border-b border-crm-border mb-2">
              <h4 className="text-xs font-semibold text-crm-text-muted uppercase tracking-wider">Pipeline Progress</h4>
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-crm-card-hover transition-colors text-left"
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      isChecked
                        ? 'bg-crm-checkbox border-crm-checkbox'
                        : 'border-crm-border hover:border-crm-text-muted bg-crm-card'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 size={14} className="animate-spin text-white" />
                    ) : isChecked ? (
                      <Check size={14} className="text-white" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-crm-text">{stage.label}</div>
                    {isChecked && timestamp && (
                      <div className="text-xs text-crm-text-muted flex items-center gap-1 mt-0.5">
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
          className="w-full px-2 py-1 bg-crm-bg border border-crm-text-muted rounded text-sm text-crm-text focus:outline-none"
        />
        {isSaving && <Loader2 size={14} className="animate-spin text-crm-text-muted" />}
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
      className="cursor-text hover:bg-crm-card-hover px-2 py-1 -mx-2 -my-1 rounded transition-colors truncate block"
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
        className="flex items-center gap-2 px-2 py-1 rounded-lg text-sm transition-colors hover:bg-crm-card-hover"
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: currentStage.color }}
        />
        <span className="text-crm-text truncate">{currentStage.label}</span>
        {isSaving ? (
          <Loader2 size={12} className="animate-spin flex-shrink-0" />
        ) : (
          <ChevronDown size={12} className="text-crm-text-muted flex-shrink-0" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-44 bg-crm-card border border-crm-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
            {CRM_STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => handleStageChange(stage.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-crm-card-hover transition-colors ${
                  stage.id === contact.stage ? 'bg-crm-card-hover' : ''
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-crm-text">{stage.label}</span>
                {stage.id === contact.stage && (
                  <Check size={14} className="ml-auto text-crm-checkbox" />
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
      className="flex items-center gap-1 hover:text-crm-text transition-colors group"
    >
      <span>{label}</span>
      <div className="flex flex-col">
        <ChevronUp 
          size={10} 
          className={`-mb-1 ${isActive && direction === 'asc' ? 'text-crm-text' : 'text-crm-text-muted/50 group-hover:text-crm-text-muted'}`} 
        />
        <ChevronDown 
          size={10} 
          className={`${isActive && direction === 'desc' ? 'text-crm-text' : 'text-crm-text-muted/50 group-hover:text-crm-text-muted'}`} 
        />
      </div>
    </button>
  )
}

// Link cell component
function LinkCell({ url, label }: { url?: string | null; label?: string }) {
  if (!url) return <span className="text-crm-text-muted">-</span>

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

// Format date for display
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  })
}

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
          <div className="w-8 h-8 bg-crm-card-hover border border-crm-border rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-crm-text-muted">
              {contact.first_name?.[0] || contact.full_name?.[0] || '?'}
              {contact.last_name?.[0] || ''}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className="text-left hover:text-blue-400 transition-colors truncate text-crm-text"
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
        <span className="text-crm-text-muted truncate block max-w-[180px]" title={contextValue}>
          {contextValue || '-'}
        </span>
      )
    
    case 'next_touchpoint':
      return <span className="text-crm-text-muted">{formatDate(contact.next_touchpoint)}</span>
    
    case 'created_at':
      return <span className="text-crm-text-muted">{formatDate(contact.created_at)}</span>
    
    case 'lead_source':
      return contact.lead_source ? (
        <span className="text-xs px-2 py-1 bg-crm-card-hover rounded-full text-crm-text-muted">
          {contact.lead_source}
        </span>
      ) : (
        <span className="text-crm-text-muted">-</span>
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
      return <span className="text-crm-text-muted truncate">-</span>
  }
}

export default function ContactsTable({ 
  contacts, 
  onContactSelect, 
  onContactUpdate,
  sort,
  onSortChange,
}: ContactsTableProps) {
  const headerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Sync horizontal scroll between header and body
  const handleBodyScroll = useCallback(() => {
    if (bodyRef.current && headerRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft
    }
  }, [])

  return (
    <div className="h-full min-h-0 bg-crm-card rounded-xl border border-crm-border flex flex-col overflow-hidden">
      {/* Fixed Header - doesn't scroll vertically */}
      <div 
        ref={headerRef}
        className="flex-shrink-0 border-b border-crm-border overflow-x-hidden"
        style={{ backgroundColor: '#0d1117' }}
      >
        <div className="flex" style={{ minWidth: '2000px' }}>
          {COLUMNS.map((column) => (
            <div
              key={column.key}
              className={`flex-shrink-0 text-left px-3 py-3 text-xs font-medium text-crm-text-muted uppercase tracking-wider ${column.width} whitespace-nowrap`}
            >
              <SortableHeader
                label={column.label}
                field={column.key}
                sortable={column.sortable}
                currentSort={sort}
                onSort={onSortChange}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Scrollable Body */}
      <div 
        ref={bodyRef}
        className="flex-1 min-h-0 overflow-auto"
        onScroll={handleBodyScroll}
      >
        <div style={{ minWidth: '2000px' }}>
          {contacts.length === 0 ? (
            <div className="px-4 py-12 text-center text-crm-text-muted">
              No contacts found
            </div>
          ) : (
            contacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(index * 0.01, 0.5) }}
                className="flex group hover:bg-crm-card-hover/50 transition-colors cursor-pointer border-b border-crm-border/50"
                onClick={() => onContactSelect(contact)}
              >
                {COLUMNS.map((column) => (
                  <div
                    key={column.key}
                    className={`flex-shrink-0 px-3 py-4 text-sm text-crm-text ${column.width}`}
                  >
                    {getCellValue(contact, column, onContactUpdate, () => onContactSelect(contact), index, contacts.length)}
                  </div>
                ))}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
