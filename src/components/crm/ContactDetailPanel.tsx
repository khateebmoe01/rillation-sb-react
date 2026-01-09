import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  Mail,
  Phone,
  Building2,
  Globe,
  MapPin,
  Calendar,
  Link2,
  User,
  Briefcase,
  FileText,
  Trash2,
  Loader2,
  ExternalLink,
  ChevronDown,
  Check,
  CheckSquare,
} from 'lucide-react'
import { CRM_STAGES, LEAD_SOURCES, type CRMContact } from '../../types/crm'

interface ContactDetailPanelProps {
  contact: CRMContact
  onClose: () => void
  onUpdate: (id: string, updates: Partial<CRMContact>) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

interface EditableFieldProps {
  label: string
  value?: string | number | null
  field: keyof CRMContact
  type?: 'text' | 'date' | 'url' | 'textarea' | 'number'
  icon?: React.ReactNode
  onSave: (field: keyof CRMContact, value: any) => void
}

function EditableField({ label, value, field, type = 'text', icon, onSave }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value ?? '')

  useEffect(() => {
    setEditValue(value ?? '')
  }, [value])

  const handleSave = () => {
    if (editValue !== value) {
      onSave(field, editValue || null)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(value ?? '')
      setIsEditing(false)
    }
  }

  return (
    <div className="group">
      <label className="text-xs text-crm-text-muted mb-1 block">{label}</label>
      <div className="flex items-start gap-2">
        {icon && <span className="text-crm-text-muted mt-1">{icon}</span>}
        {isEditing ? (
          type === 'textarea' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
              rows={4}
              className="flex-1 px-3 py-2 bg-crm-bg border border-crm-text-muted rounded-lg text-sm text-crm-text focus:outline-none resize-none"
            />
          ) : (
            <input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-3 py-2 bg-crm-bg border border-crm-text-muted rounded-lg text-sm text-crm-text focus:outline-none"
            />
          )
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="flex-1 px-3 py-2 rounded-lg cursor-text hover:bg-crm-card-hover transition-colors text-sm min-h-[38px]"
          >
            {value ? (
              type === 'url' && typeof value === 'string' ? (
                <a
                  href={value.startsWith('http') ? value : `https://${value}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  {value}
                  <ExternalLink size={12} />
                </a>
              ) : (
                <span className="text-crm-text whitespace-pre-wrap">{value}</span>
              )
            ) : (
              <span className="text-crm-text-muted">Add {label.toLowerCase()}...</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface StageSelectProps {
  currentStage?: string
  onSave: (stage: string) => void
}

function StageSelect({ currentStage, onSave }: StageSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const stage = CRM_STAGES.find((s) => s.id === currentStage) || CRM_STAGES[0]

  return (
    <div className="relative">
      <label className="text-xs text-crm-text-muted mb-1 block">Stage</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-crm-card-hover border border-crm-border rounded-lg text-sm hover:border-crm-text-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-crm-text">{stage.label}</span>
        </div>
        <ChevronDown size={16} className="text-crm-text-muted" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-crm-card border border-crm-border rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto">
            {CRM_STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSave(s.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-crm-card-hover transition-colors ${
                  s.id === currentStage ? 'bg-crm-card-hover' : ''
                }`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-crm-text">{s.label}</span>
                {s.id === currentStage && <Check size={14} className="ml-auto text-crm-checkbox" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Checkbox tracking component
interface TrackingCheckboxProps {
  label: string
  checked: boolean
  timestamp?: string | null
  onToggle: () => void
}

function TrackingCheckbox({ label, checked, timestamp, onToggle }: TrackingCheckboxProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-crm-card-hover transition-colors"
    >
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          checked
            ? 'bg-crm-checkbox border-crm-checkbox'
            : 'border-crm-border hover:border-crm-text-muted'
        }`}
      >
        {checked && <Check size={14} className="text-white" />}
      </div>
      <div className="flex-1 text-left">
        <span className="text-sm text-crm-text">{label}</span>
        {checked && timestamp && (
          <p className="text-xs text-crm-text-muted mt-0.5">
            {new Date(timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </button>
  )
}

export default function ContactDetailPanel({ contact, onClose, onUpdate, onDelete }: ContactDetailPanelProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleFieldSave = async (field: keyof CRMContact, value: any) => {
    setIsSaving(true)
    await onUpdate(contact.id, { [field]: value })
    setIsSaving(false)
  }

  const handleCheckboxToggle = async (
    field: 'meeting_booked' | 'showed_up_to_disco' | 'qualified' | 'demo_booked' | 'showed_up_to_demo' | 'proposal_sent' | 'closed',
    timestampField: string
  ) => {
    const newValue = !contact[field]
    setIsSaving(true)
    await onUpdate(contact.id, {
      [field]: newValue,
      [timestampField]: newValue ? new Date().toISOString() : null,
    })
    setIsSaving(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    const success = await onDelete(contact.id)
    setIsDeleting(false)
    if (success) {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-crm-card border-l border-crm-border z-50 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-crm-card border-b border-crm-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-crm-card-hover border border-crm-border rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-crm-text-muted">
                {contact.first_name?.[0] || contact.full_name?.[0] || '?'}
                {contact.last_name?.[0] || ''}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-crm-text">
                {contact.full_name || contact.email}
              </h2>
              {contact.job_title && (
                <p className="text-sm text-crm-text-muted">{contact.job_title}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && <Loader2 size={16} className="animate-spin text-crm-text-muted" />}
            <button
              onClick={onClose}
              className="p-2 hover:bg-crm-card-hover rounded-lg transition-colors"
            >
              <X size={20} className="text-crm-text-muted" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Stage & Quick Info */}
          <div className="grid grid-cols-2 gap-4">
            <StageSelect
              currentStage={contact.stage}
              onSave={(stage) => handleFieldSave('stage', stage)}
            />
            <div>
              <label className="text-xs text-crm-text-muted mb-1 block">Lead Source</label>
              <select
                value={contact.lead_source || ''}
                onChange={(e) => handleFieldSave('lead_source', e.target.value || null)}
                className="w-full px-3 py-2 bg-crm-card-hover border border-crm-border rounded-lg text-sm text-crm-text focus:outline-none focus:border-crm-text-muted"
              >
                <option value="">Select source...</option>
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pipeline Progress Checkboxes */}
          <div>
            <h3 className="text-sm font-medium text-crm-text mb-4 flex items-center gap-2">
              <CheckSquare size={16} />
              Pipeline Progress
            </h3>
            <div className="bg-crm-bg/50 rounded-xl divide-y divide-crm-border/50">
              <TrackingCheckbox
                label="Meeting Booked"
                checked={Boolean(contact.meeting_booked)}
                timestamp={contact.meeting_booked_at}
                onToggle={() => handleCheckboxToggle('meeting_booked', 'meeting_booked_at')}
              />
              <TrackingCheckbox
                label="Showed Up to Disco"
                checked={Boolean(contact.showed_up_to_disco)}
                timestamp={contact.showed_up_to_disco_at}
                onToggle={() => handleCheckboxToggle('showed_up_to_disco', 'showed_up_to_disco_at')}
              />
              <TrackingCheckbox
                label="Qualified"
                checked={Boolean(contact.qualified)}
                timestamp={contact.qualified_at}
                onToggle={() => handleCheckboxToggle('qualified', 'qualified_at')}
              />
              <TrackingCheckbox
                label="Demo Booked"
                checked={Boolean(contact.demo_booked)}
                timestamp={contact.demo_booked_at}
                onToggle={() => handleCheckboxToggle('demo_booked', 'demo_booked_at')}
              />
              <TrackingCheckbox
                label="Showed Up to Demo"
                checked={Boolean(contact.showed_up_to_demo)}
                timestamp={contact.showed_up_to_demo_at}
                onToggle={() => handleCheckboxToggle('showed_up_to_demo', 'showed_up_to_demo_at')}
              />
              <TrackingCheckbox
                label="Proposal Sent"
                checked={Boolean(contact.proposal_sent)}
                timestamp={contact.proposal_sent_at}
                onToggle={() => handleCheckboxToggle('proposal_sent', 'proposal_sent_at')}
              />
              <TrackingCheckbox
                label="Closed"
                checked={Boolean(contact.closed)}
                timestamp={contact.closed_at}
                onToggle={() => handleCheckboxToggle('closed', 'closed_at')}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-sm font-medium text-crm-text mb-4 flex items-center gap-2">
              <User size={16} />
              Contact Information
            </h3>
            <div className="space-y-4 bg-crm-bg/50 rounded-xl p-4">
              <EditableField
                label="Full Name"
                value={contact.full_name}
                field="full_name"
                icon={<User size={16} />}
                onSave={handleFieldSave}
              />
              <EditableField
                label="Email"
                value={contact.email}
                field="email"
                type="text"
                icon={<Mail size={16} />}
                onSave={handleFieldSave}
              />
              <EditableField
                label="Phone"
                value={contact.lead_phone}
                field="lead_phone"
                icon={<Phone size={16} />}
                onSave={handleFieldSave}
              />
              <EditableField
                label="LinkedIn"
                value={contact.linkedin_url}
                field="linkedin_url"
                type="url"
                icon={<Globe size={16} />}
                onSave={handleFieldSave}
              />
              <EditableField
                label="Job Title"
                value={contact.job_title}
                field="job_title"
                icon={<Briefcase size={16} />}
                onSave={handleFieldSave}
              />
            </div>
          </div>

          {/* Organization */}
          <div>
            <h3 className="text-sm font-medium text-crm-text mb-4 flex items-center gap-2">
              <Building2 size={16} />
              Organization
            </h3>
            <div className="space-y-4 bg-crm-bg/50 rounded-xl p-4">
              <EditableField
                label="Company"
                value={contact.company}
                field="company"
                icon={<Building2 size={16} />}
                onSave={handleFieldSave}
              />
              <EditableField
                label="Website"
                value={contact.company_website || contact.company_domain}
                field="company_website"
                type="url"
                icon={<Globe size={16} />}
                onSave={handleFieldSave}
              />
              <EditableField
                label="Company Phone"
                value={contact.company_phone}
                field="company_phone"
                icon={<Phone size={16} />}
                onSave={handleFieldSave}
              />
              <div className="grid grid-cols-2 gap-4">
                <EditableField
                  label="Industry"
                  value={contact.industry}
                  field="industry"
                  onSave={handleFieldSave}
                />
                <EditableField
                  label="Company Size"
                  value={contact.company_size}
                  field="company_size"
                  onSave={handleFieldSave}
                />
              </div>
              <EditableField
                label="Headquarters"
                value={[contact.company_hq_city, contact.company_hq_state, contact.company_hq_country].filter(Boolean).join(', ')}
                field="company_hq_city"
                icon={<MapPin size={16} />}
                onSave={handleFieldSave}
              />
              <EditableField
                label="Year Founded"
                value={contact.year_founded}
                field="year_founded"
                type="number"
                onSave={handleFieldSave}
              />
            </div>
          </div>

          {/* Scheduling */}
          <div>
            <h3 className="text-sm font-medium text-crm-text mb-4 flex items-center gap-2">
              <Calendar size={16} />
              Scheduling
            </h3>
            <div className="space-y-4 bg-crm-bg/50 rounded-xl p-4">
              <EditableField
                label="Meeting Date"
                value={contact.meeting_date?.split('T')[0]}
                field="meeting_date"
                type="date"
                icon={<Calendar size={16} />}
                onSave={handleFieldSave}
              />
              <EditableField
                label="Meeting Link"
                value={contact.meeting_link}
                field="meeting_link"
                type="url"
                icon={<Link2 size={16} />}
                onSave={handleFieldSave}
              />
              <EditableField
                label="Rescheduling Link"
                value={contact.rescheduling_link}
                field="rescheduling_link"
                type="url"
                icon={<Link2 size={16} />}
                onSave={handleFieldSave}
              />
              <EditableField
                label="Next Touchpoint"
                value={contact.next_touchpoint}
                field="next_touchpoint"
                type="date"
                icon={<Calendar size={16} />}
                onSave={handleFieldSave}
              />
            </div>
          </div>

          {/* Notes & Context */}
          <div>
            <h3 className="text-sm font-medium text-crm-text mb-4 flex items-center gap-2">
              <FileText size={16} />
              Notes & Context
            </h3>
            <div className="space-y-4 bg-crm-bg/50 rounded-xl p-4">
              <EditableField
                label="Context / Conversation"
                value={contact.context}
                field="context"
                type="textarea"
                onSave={handleFieldSave}
              />
              <EditableField
                label="Notes"
                value={contact.notes}
                field="notes"
                type="textarea"
                onSave={handleFieldSave}
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <EditableField
              label="Assignee"
              value={contact.assignee}
              field="assignee"
              icon={<User size={16} />}
              onSave={handleFieldSave}
            />
          </div>

          {/* Delete */}
          <div className="pt-4 border-t border-crm-border">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-crm-text-muted">Delete this contact?</span>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Confirm
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-crm-text-muted text-sm hover:text-crm-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-sm text-crm-text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
                Delete Contact
              </button>
            )}
          </div>

          {/* Meta Info */}
          <div className="pt-4 border-t border-crm-border text-xs text-crm-text-muted space-y-1">
            <p>Created: {contact.created_at ? new Date(contact.created_at).toLocaleString() : '-'}</p>
            <p>Updated: {contact.updated_at ? new Date(contact.updated_at).toLocaleString() : '-'}</p>
            {contact.campaign_name && <p>Campaign: {contact.campaign_name}</p>}
          </div>
        </div>
      </motion.div>
    </>
  )
}
