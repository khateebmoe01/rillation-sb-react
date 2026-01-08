import { useState, memo } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { CRM_STAGES, type CRMContact } from '../../types/crm'

interface ContactsTableProps {
  contacts: CRMContact[]
  onContactSelect: (contact: CRMContact) => void
  onContactUpdate: (id: string, updates: Partial<CRMContact>) => Promise<boolean>
}

interface EditableCellProps {
  value: string
  contactId: string
  field: keyof CRMContact
  onSave: (id: string, updates: Partial<CRMContact>) => Promise<boolean>
}

const EditableCell = memo(({ value, contactId, field, onSave }: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    const success = await onSave(contactId, { [field]: editValue })
    setIsSaving(false)
    
    if (success) {
      setIsEditing(false)
    } else {
      setEditValue(value)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          className="w-full px-2 py-1 bg-rillation-bg border border-rillation-text/30 rounded text-sm text-rillation-text focus:outline-none"
        />
        {isSaving && <Loader2 size={14} className="animate-spin text-rillation-text-muted" />}
      </div>
    )
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className="cursor-text hover:bg-rillation-card-hover px-2 py-1 -mx-2 -my-1 rounded transition-colors"
    >
      {value || '-'}
    </span>
  )
})

EditableCell.displayName = 'EditableCell'

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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSaving}
        className="flex items-center gap-2 px-2 py-1 rounded-lg text-sm transition-colors hover:bg-rillation-card-hover"
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: currentStage.color }}
        />
        <span className="text-rillation-text">{currentStage.label}</span>
        {isSaving ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <ChevronDown size={12} className="text-rillation-text-muted" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-40 bg-rillation-card border border-rillation-border rounded-lg shadow-xl z-50 py-1">
            {CRM_STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => handleStageChange(stage.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-rillation-card-hover transition-colors ${
                  stage.id === contact.stage ? 'bg-rillation-card-hover' : ''
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full"
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

export default function ContactsTable({ contacts, onContactSelect, onContactUpdate }: ContactsTableProps) {
  return (
    <div className="h-full overflow-auto bg-rillation-card rounded-xl border border-rillation-border">
      <table className="w-full min-w-[900px]">
        <thead className="sticky top-0 bg-rillation-card-hover z-10">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
              Contact
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
              Company
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
              Stage
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
              Email
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
              Phone
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
              Next Touchpoint
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
              Source
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rillation-border/30">
          {contacts.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-rillation-text-muted">
                No contacts found
              </td>
            </tr>
          ) : (
            contacts.map((contact, index) => (
              <motion.tr
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="group hover:bg-rillation-card-hover/50 transition-colors cursor-pointer"
                onClick={() => onContactSelect(contact)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-rillation-card-hover border border-rillation-border rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-rillation-text-muted">
                        {contact.first_name?.[0] || contact.full_name?.[0] || '?'}
                        {contact.last_name?.[0] || ''}
                      </span>
                    </div>
                    <div>
                      <EditableCell
                        value={contact.full_name || ''}
                        contactId={contact.id}
                        field="full_name"
                        onSave={onContactUpdate}
                      />
                      {contact.job_title && (
                        <div className="text-xs text-rillation-text-muted mt-0.5">
                          {contact.job_title}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-rillation-text" onClick={(e) => e.stopPropagation()}>
                  <EditableCell
                    value={contact.company || ''}
                    contactId={contact.id}
                    field="company"
                    onSave={onContactUpdate}
                  />
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <StageCell contact={contact} onSave={onContactUpdate} />
                </td>
                <td className="px-4 py-3 text-sm text-rillation-text-muted">
                  {contact.email}
                </td>
                <td className="px-4 py-3 text-sm text-rillation-text-muted" onClick={(e) => e.stopPropagation()}>
                  <EditableCell
                    value={contact.lead_phone || ''}
                    contactId={contact.id}
                    field="lead_phone"
                    onSave={onContactUpdate}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-rillation-text-muted">
                  {contact.next_touchpoint
                    ? new Date(contact.next_touchpoint).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '-'}
                </td>
                <td className="px-4 py-3">
                  {contact.lead_source ? (
                    <span className="text-xs px-2 py-1 bg-rillation-card-hover rounded-full text-rillation-text-muted">
                      {contact.lead_source}
                    </span>
                  ) : (
                    <span className="text-rillation-text-muted">-</span>
                  )}
                </td>
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
