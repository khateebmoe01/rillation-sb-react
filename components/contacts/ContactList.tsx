import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Mail, Phone, Building2, Linkedin, ChevronDown, Check } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Card, Avatar, Button, SearchInput, EmptyState, LoadingSkeleton, StageDropdown } from '../shared'
import { ContactModal } from './ContactModal'
import type { Contact } from '../../types'

export function ContactList() {
  const { contacts, loading, updateContact } = useCRM()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts
    
    const query = searchQuery.toLowerCase()
    return contacts.filter(c => 
      c.full_name?.toLowerCase().includes(query) ||
      c.first_name?.toLowerCase().includes(query) ||
      c.last_name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.company?.toLowerCase().includes(query) ||
      c.job_title?.toLowerCase().includes(query) ||
      c.industry?.toLowerCase().includes(query) ||
      c.campaign_name?.toLowerCase().includes(query)
    )
  }, [contacts, searchQuery])
  
  // Single-click to open or switch contact in side panel
  const handleOpenContact = (contact: Contact) => {
    setSelectedContact(contact)
    setIsCreating(false)
    setIsModalOpen(true)
  }
  
  const handleCreateContact = () => {
    setSelectedContact(null)
    setIsCreating(true)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedContact(null)
  }
  
  if (loading.contacts) {
    return <LoadingSkeleton rows={8} />
  }

  // Grid column widths - balanced layout (removed Campaign column)
  // Name, Company, Title get flexible space; Stage and Pipeline have fixed widths with more gap between them
  const gridColumns = 'minmax(180px, 1.2fr) minmax(160px, 1fr) minmax(120px, 0.8fr) 150px 60px 200px 70px'
  // Note: 60px empty spacer column between Stage and Pipeline for visual separation
  const minTableWidth = 940
  
  return (
    <div style={{ 
      padding: 20, 
      width: '100%', 
      maxWidth: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: theme.fontSize['2xl'],
              fontWeight: theme.fontWeight.bold,
              color: theme.text.primary,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Users size={24} style={{ color: theme.entity.contact }} />
            Contacts
          </h1>
          <p
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.text.muted,
              margin: '4px 0 0 0',
            }}
          >
            {contacts.length} {contacts.length === 1 ? 'lead' : 'leads'} from engaged_leads
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search leads..."
            style={{ width: 260 }}
          />
          <Button
            icon={<Plus size={16} />}
            onClick={handleCreateContact}
          >
            Add Lead
          </Button>
        </div>
      </div>
      
      {/* Contacts Table */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title={searchQuery ? 'No leads found' : 'No leads yet'}
          description={
            searchQuery
              ? 'Try adjusting your search terms'
              : 'Start by adding your first lead to the CRM'
          }
          action={
            !searchQuery
              ? { label: 'Add Lead', onClick: handleCreateContact, icon: <Plus size={16} /> }
              : undefined
          }
        />
      ) : (
        <Card padding="none" style={{ width: '100%', overflow: 'hidden' }}>
          <div style={{ 
            overflowX: 'auto', 
            width: '100%',
            // Custom scrollbar styling
            scrollbarWidth: 'thin',
            scrollbarColor: `${theme.border.default} transparent`,
          }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
                gap: '0 16px',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: `1px solid ${theme.border.subtle}`,
                backgroundColor: theme.bg.muted,
                minWidth: minTableWidth,
              }}
            >
              <TableHeader>Name</TableHeader>
              <TableHeader>Company</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Stage</TableHeader>
              <div /> {/* Spacer */}
              <TableHeader>Pipeline</TableHeader>
              <TableHeader>Actions</TableHeader>
            </div>
            
            {/* Table Rows */}
            <AnimatePresence mode="popLayout">
              {filteredContacts.map((contact, index) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.02 }}
                  layout
                >
                  <ContactRow
                    contact={contact}
                    isSelected={selectedContact?.id === contact.id}
                    gridColumns={gridColumns}
                    minWidth={minTableWidth}
                    onClick={() => handleOpenContact(contact)}
                    onUpdateStage={(stage) => updateContact(contact.id, { stage })}
                    onUpdatePipelineStep={(step, value) => updateContact(contact.id, { [step]: value })}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>
      )}
      
      {/* Contact Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        contact={isCreating ? null : selectedContact}
      />
    </div>
  )
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        color: theme.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {children}
    </span>
  )
}

interface ContactRowProps {
  contact: Contact
  isSelected: boolean
  gridColumns: string
  minWidth: number
  onClick: () => void
  onUpdateStage: (stage: string) => void
  onUpdatePipelineStep: (step: string, value: boolean) => void
}

// Pipeline steps in order from earliest to deepest
const PIPELINE_STEPS = [
  { key: 'meeting_booked', label: 'Meeting Booked', shortLabel: 'Meeting', color: '#a78bfa' },
  { key: 'showed_up_to_disco', label: 'Showed Up to Disco', shortLabel: 'Disco', color: '#c084fc' },
  { key: 'qualified', label: 'Qualified', shortLabel: 'Qualified', color: '#fbbf24' },
  { key: 'demo_booked', label: 'Demo Booked', shortLabel: 'Demo', color: '#fb923c' },
  { key: 'showed_up_to_demo', label: 'Showed Up to Demo', shortLabel: 'Demo Show', color: '#f97316' },
  { key: 'proposal_sent', label: 'Proposal Sent', shortLabel: 'Proposal', color: '#2dd4bf' },
  { key: 'closed', label: 'Closed Won', shortLabel: 'Won', color: '#22c55e' },
] as const

function ContactRow({ contact, isSelected, gridColumns, minWidth, onClick, onUpdateStage, onUpdatePipelineStep }: ContactRowProps) {
  const displayName = contact.full_name || 
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 
    'Unknown'
  
  return (
    <motion.div
      onClick={onClick}
      initial={false}
      whileHover={{
        backgroundColor: theme.bg.hover,
        boxShadow: `inset 0 0 0 1px rgba(255, 255, 255, 0.05)`,
      }}
      transition={{ duration: 0.15 }}
      style={{
        display: 'grid',
        gridTemplateColumns: gridColumns,
        gap: '0 16px',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: `1px solid ${theme.border.subtle}`,
        backgroundColor: isSelected ? theme.bg.hover : 'transparent',
        cursor: 'pointer',
        minWidth: minWidth,
        boxShadow: isSelected ? `inset 3px 0 0 0 ${theme.accent.primary}` : 'none',
      }}
    >
      {/* Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <Avatar name={displayName} size="sm" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.medium,
              color: theme.text.primary,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </p>
          {contact.email && (
            <p
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.text.muted,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {contact.email}
            </p>
          )}
        </div>
      </div>
      
      {/* Company */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {contact.company ? (
          <>
            <Building2 size={14} style={{ color: theme.text.muted, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.text.secondary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {contact.company}
              </span>
              {contact.industry && (
                <span
                  style={{
                    fontSize: theme.fontSize.xs,
                    color: theme.text.muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {contact.industry}
                </span>
              )}
            </div>
          </>
        ) : (
          <span style={{ fontSize: theme.fontSize.sm, color: theme.text.muted }}>—</span>
        )}
      </div>
      
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <span
          style={{
            fontSize: theme.fontSize.sm,
            color: contact.job_title ? theme.text.secondary : theme.text.muted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {contact.job_title || '—'}
        </span>
      </div>
      
      {/* Stage */}
      <div 
        style={{ display: 'flex', alignItems: 'center' }} 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <StageDropdown
          value={contact.stage}
          onChange={(stage) => {
            onUpdateStage(stage)
          }}
        />
      </div>
      
      {/* Spacer between Stage and Pipeline */}
      <div />
      
      {/* Pipeline Progress Dropdown */}
      <div 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <PipelineProgressDropdown
          contact={contact}
          onUpdateStep={onUpdatePipelineStep}
        />
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 4 }}>
        {contact.email && (
          <ActionButton
            href={`mailto:${contact.email}`}
            icon={<Mail size={14} />}
            label="Email"
          />
        )}
        {contact.lead_phone && (
          <ActionButton
            href={`tel:${contact.lead_phone}`}
            icon={<Phone size={14} />}
            label="Call"
          />
        )}
        {contact.linkedin_url && (
          <ActionButton
            href={contact.linkedin_url}
            icon={<Linkedin size={14} />}
            label="LinkedIn"
            external
          />
        )}
      </div>
    </motion.div>
  )
}

// Pipeline Progress Dropdown - shows deepest stage reached with dropdown for all stages
interface PipelineProgressDropdownProps {
  contact: Contact
  onUpdateStep: (step: string, value: boolean) => void
}

function PipelineProgressDropdown({ contact, onUpdateStep }: PipelineProgressDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Find the deepest completed stage
  const getDeepestStage = () => {
    let deepest: typeof PIPELINE_STEPS[number] | null = null
    for (const step of PIPELINE_STEPS) {
      if (contact[step.key as keyof Contact]) {
        deepest = step
      }
    }
    return deepest
  }

  const deepestStage = getDeepestStage()

  // Format date for display
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return null
    }
  }

  return (
    <div 
      ref={dropdownRef} 
      style={{ position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.border.subtle}`,
          background: deepestStage ? `${deepestStage.color}15` : 'transparent',
          color: deepestStage ? deepestStage.color : theme.text.muted,
          cursor: 'pointer',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          transition: `all ${theme.transition.fast}`,
          minWidth: 100,
          justifyContent: 'space-between',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {deepestStage ? deepestStage.shortLabel : 'No progress'}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              minWidth: 220,
              backgroundColor: theme.bg.card,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.lg,
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
              zIndex: 100,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 8 }}>
              {PIPELINE_STEPS.map((step) => {
                const isChecked = contact[step.key as keyof Contact] as boolean
                const dateKey = `${step.key}_at` as keyof Contact
                const dateValue = contact[dateKey] as string | null | undefined
                const formattedDate = formatDate(dateValue)

                return (
                  <button
                    key={step.key}
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateStep(step.key, !isChecked)
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: theme.radius.md,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      transition: `all ${theme.transition.fast}`,
                      gap: 10,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.bg.hover
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: isChecked ? 'none' : `2px solid ${theme.border.default}`,
                        backgroundColor: isChecked ? step.color : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>

                    {/* Label */}
                    <span
                      style={{
                        flex: 1,
                        textAlign: 'left',
                        fontSize: theme.fontSize.sm,
                        color: isChecked ? theme.text.primary : theme.text.secondary,
                        fontWeight: isChecked ? theme.fontWeight.medium : theme.fontWeight.normal,
                      }}
                    >
                      {step.label}
                    </span>

                    {/* Date */}
                    {formattedDate && (
                      <span
                        style={{
                          fontSize: theme.fontSize.xs,
                          color: theme.text.muted,
                          flexShrink: 0,
                        }}
                      >
                        {formattedDate}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ActionButtonProps {
  href: string
  icon: React.ReactNode
  label: string
  external?: boolean
}

function ActionButton({ href, icon, label, external }: ActionButtonProps) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={(e) => e.stopPropagation()}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: theme.radius.md,
        backgroundColor: 'transparent',
        color: theme.text.muted,
        transition: `all ${theme.transition.fast}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.accent.primaryBg
        e.currentTarget.style.color = theme.accent.primary
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = theme.text.muted
      }}
    >
      {icon}
    </a>
  )
}
