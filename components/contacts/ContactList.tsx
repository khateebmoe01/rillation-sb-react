import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Mail, Phone, Building2, Linkedin, ChevronDown, Check, ArrowUpDown } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Card, Avatar, Button, SearchInput, EmptyState, LoadingSkeleton, StageDropdown } from '../shared'
import { ContactModal } from './ContactModal'
import type { Contact } from '../../types'

// Stage options for filter
const STAGE_OPTIONS = [
  { value: '', label: 'All Stages' },
  { value: 'interested', label: 'Interested' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'disqualified', label: 'Disqualified' },
  { value: 'demo', label: 'Demo' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'closed', label: 'Closed Won' },
]

// Pipeline progress options for filter
const PIPELINE_OPTIONS = [
  { value: '', label: 'All Pipeline' },
  { value: 'no_progress', label: 'No Progress' },
  { value: 'meeting_booked', label: 'Meeting Booked' },
  { value: 'showed_up_to_disco', label: 'Showed Up to Disco' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'demo_booked', label: 'Demo Booked' },
  { value: 'showed_up_to_demo', label: 'Showed Up to Demo' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'closed', label: 'Closed Won' },
]

// Last Activity filter options
const LAST_ACTIVITY_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range...' },
]

// Sort options
const SORT_OPTIONS = [
  { value: 'last_activity_desc', label: 'Last Activity (Newest)' },
  { value: 'last_activity_asc', label: 'Last Activity (Oldest)' },
  { value: 'epv_desc', label: 'EPV (Highest)' },
  { value: 'epv_asc', label: 'EPV (Lowest)' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
]

// Format relative time like "2d ago" or "Jan 21"
function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    // For older dates, show "Jan 21" format
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

export function ContactList() {
  const { contacts, loading, updateContact } = useCRM()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Filter states
  const [stageFilter, setStageFilter] = useState('')
  const [pipelineFilter, setPipelineFilter] = useState('')
  const [lastActivityFilter, setLastActivityFilter] = useState('')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [sortBy, setSortBy] = useState('last_activity_desc')
  
  // Debounce search query for smooth filtering (50ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 50)
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let result = [...contacts]
    
    // Search filter
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase()
      result = result.filter(c => 
        c.full_name?.toLowerCase().includes(query) ||
        c.first_name?.toLowerCase().includes(query) ||
        c.last_name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.job_title?.toLowerCase().includes(query) ||
        c.industry?.toLowerCase().includes(query) ||
        c.campaign_name?.toLowerCase().includes(query)
      )
    }
    
    // Stage filter
    if (stageFilter) {
      result = result.filter(c => c.stage === stageFilter)
    }
    
    // Pipeline filter
    if (pipelineFilter) {
      if (pipelineFilter === 'no_progress') {
        result = result.filter(c => 
          !c.meeting_booked && !c.showed_up_to_disco && !c.qualified && 
          !c.demo_booked && !c.showed_up_to_demo && !c.proposal_sent && !c.closed
        )
      } else {
        result = result.filter(c => c[pipelineFilter as keyof Contact] === true)
      }
    }
    
    // Last Activity filter
    if (lastActivityFilter) {
      if (lastActivityFilter === 'custom' && (customDateFrom || customDateTo)) {
        const fromDate = customDateFrom ? new Date(customDateFrom) : new Date(0)
        const toDate = customDateTo ? new Date(customDateTo + 'T23:59:59') : new Date()
        result = result.filter(c => {
          if (!c.updated_at) return false
          const activityDate = new Date(c.updated_at)
          return activityDate >= fromDate && activityDate <= toDate
        })
      } else if (lastActivityFilter !== 'custom') {
        const now = new Date()
        let cutoff: Date
        switch (lastActivityFilter) {
          case 'today':
            cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case '7d':
            cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case '90d':
            cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          default:
            cutoff = new Date(0)
        }
        result = result.filter(c => {
          if (!c.updated_at) return false
          return new Date(c.updated_at) >= cutoff
        })
      }
    }
    
    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'last_activity_desc':
          return (new Date(b.updated_at || 0).getTime()) - (new Date(a.updated_at || 0).getTime())
        case 'last_activity_asc':
          return (new Date(a.updated_at || 0).getTime()) - (new Date(b.updated_at || 0).getTime())
        case 'epv_desc':
          return (b.epv || 0) - (a.epv || 0)
        case 'epv_asc':
          return (a.epv || 0) - (b.epv || 0)
        case 'name_asc':
          return (a.full_name || a.first_name || '').localeCompare(b.full_name || b.first_name || '')
        case 'name_desc':
          return (b.full_name || b.first_name || '').localeCompare(a.full_name || a.first_name || '')
        default:
          return 0
      }
    })
    
    return result
  }, [contacts, debouncedQuery, stageFilter, pipelineFilter, lastActivityFilter, customDateFrom, customDateTo, sortBy])
  
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
  
  // Keyboard navigation: up/down arrows to navigate between leads when side panel is open
  useEffect(() => {
    if (!isModalOpen || isCreating || !selectedContact) return
    
    const currentContact = selectedContact // Capture for closure
    
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      
      // Don't navigate if focus is in an input field
      const activeElement = document.activeElement
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'SELECT') {
        return
      }
      
      e.preventDefault()
      
      const currentIndex = filteredContacts.findIndex(c => c.id === currentContact.id)
      if (currentIndex === -1) return
      
      let newIndex: number
      if (e.key === 'ArrowUp') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : filteredContacts.length - 1
      } else {
        newIndex = currentIndex < filteredContacts.length - 1 ? currentIndex + 1 : 0
      }
      
      const newContact = filteredContacts[newIndex]
      if (newContact) {
        setSelectedContact(newContact)
        
        // Scroll the row into view
        const row = document.querySelector(`[data-contact-id="${newContact.id}"]`)
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, isCreating, selectedContact, filteredContacts])
  
  if (loading.contacts) {
    return <LoadingSkeleton rows={8} />
  }

  // Grid column widths - CRM scanning flow: identity → company → status → role → recency → action
  // Name, Company, Stage, Pipeline, Title, Last Activity, Actions
  // More space for Stage/Pipeline/Title area
  const gridColumns = 'minmax(200px, 1.5fr) minmax(400px, 1.2fr) 250px 280px minmax(100px, 1.2fr) 90px 70px'
  const minTableWidth = 980
  
  return (
    <div style={{ 
      padding: 20, 
      width: '100%', 
      maxWidth: '100%',
      boxSizing: 'border-box',
      minHeight: '100%',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          gap: 16,
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
            {filteredContacts.length} of {contacts.length} {contacts.length === 1 ? 'lead' : 'leads'}
          </p>
        </div>
        
        <Button
          icon={<Plus size={16} />}
          onClick={handleCreateContact}
        >
          Add Lead
        </Button>
      </div>
      
      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 32,
          padding: '12px 16px',
          backgroundColor: theme.bg.card,
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.border.subtle}`,
          position: 'relative',
          zIndex: 100,
          overflow: 'visible',
        }}
      >
        {/* Search */}
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          placeholder="Search leads..."
          style={{ width: 200, flexShrink: 0 }}
        />
        
        <div style={{ flex: 1 }} />
        
        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, overflow: 'visible' }}>
          <FilterDropdown
            label="Stage"
            value={stageFilter}
            options={STAGE_OPTIONS}
            onChange={setStageFilter}
          />
          
          <FilterDropdown
            label="Pipeline"
            value={pipelineFilter}
            options={PIPELINE_OPTIONS}
            onChange={setPipelineFilter}
          />
          
          <FilterDropdown
            label="Last Activity"
            value={lastActivityFilter}
            options={LAST_ACTIVITY_OPTIONS}
            onChange={setLastActivityFilter}
          />
          
          {/* Custom Date Range Inputs */}
          {lastActivityFilter === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontSize: theme.fontSize.sm,
                  backgroundColor: theme.bg.elevated,
                  color: theme.text.primary,
                  border: `1px solid ${theme.border.default}`,
                  borderRadius: theme.radius.md,
                  outline: 'none',
                }}
              />
              <span style={{ color: theme.text.muted, fontSize: theme.fontSize.sm }}>to</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontSize: theme.fontSize.sm,
                  backgroundColor: theme.bg.elevated,
                  color: theme.text.primary,
                  border: `1px solid ${theme.border.default}`,
                  borderRadius: theme.radius.md,
                  outline: 'none',
                }}
              />
            </div>
          )}
          
          <div style={{ height: 20, width: 1, backgroundColor: theme.border.default }} />
          
          <FilterDropdown
            label="Sort"
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={setSortBy}
            icon={<ArrowUpDown size={14} />}
          />
        </div>
      </div>
      
      {/* Contacts Table */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title={debouncedQuery ? 'No leads found' : 'No leads yet'}
          description={
            debouncedQuery
              ? 'Try adjusting your search terms'
              : 'Start by adding your first lead to the CRM'
          }
          action={
            !debouncedQuery
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
                gap: '0 24px',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: `1px solid ${theme.border.subtle}`,
                backgroundColor: theme.bg.muted,
                minWidth: minTableWidth,
              }}
            >
              <TableHeader>Name</TableHeader>
              <TableHeader>Company</TableHeader>
              <TableHeader>Stage</TableHeader>
              <TableHeader>Pipeline</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Last Activity</TableHeader>
              <TableHeader>Actions</TableHeader>
            </div>
            
            {/* Table Rows - no animation for instant search */}
            {filteredContacts.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                isSelected={selectedContact?.id === contact.id}
                gridColumns={gridColumns}
                minWidth={minTableWidth}
                onClick={() => handleOpenContact(contact)}
                onUpdateStage={(stage) => updateContact(contact.id, { stage })}
                onUpdatePipelineStep={(step, value) => updateContact(contact.id, { [step]: value })}
              />
            ))}
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
    <div
      data-contact-id={contact.id}
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: gridColumns,
        gap: '0 24px',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: `1px solid ${theme.border.subtle}`,
        backgroundColor: isSelected ? theme.bg.hover : 'transparent',
        cursor: 'pointer',
        minWidth: minWidth,
        boxShadow: isSelected ? `inset 3px 0 0 0 ${theme.accent.primary}` : 'none',
        transition: `background-color 0.15s ease`,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = theme.bg.hover
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isSelected ? theme.bg.hover : 'transparent'
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
            <Building2 size={20} style={{ color: theme.text.muted, flexShrink: 0 }} />
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
      
      {/* Last Activity */}
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <span
          style={{
            fontSize: theme.fontSize.xs,
            color: theme.text.muted,
          }}
          title={contact.updated_at ? new Date(contact.updated_at).toLocaleString() : undefined}
        >
          {formatRelativeTime(contact.updated_at)}
        </span>
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
    </div>
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

// Filter Dropdown Component
interface FilterDropdownProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  icon?: React.ReactNode
}

function FilterDropdown({ label, value, options, onChange, icon }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const selectedOption = options.find(o => o.value === value)
  const displayLabel = selectedOption?.label || label
  const hasValue = value !== ''
  
  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          color: hasValue ? theme.accent.primary : theme.text.secondary,
          backgroundColor: hasValue ? theme.accent.primaryBg : 'transparent',
          border: `1px solid ${hasValue ? theme.accent.primary : theme.border.default}`,
          borderRadius: theme.radius.md,
          cursor: 'pointer',
          transition: `all ${theme.transition.fast}`,
          whiteSpace: 'nowrap',
        }}
      >
        {icon}
        <span>{displayLabel}</span>
        <ChevronDown size={14} style={{ opacity: 0.7 }} />
      </button>
      
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
              marginTop: 4,
              minWidth: 180,
              backgroundColor: theme.bg.elevated,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.lg,
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              zIndex: 9999,
              overflow: 'hidden',
              padding: 6,
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: theme.fontSize.sm,
                  color: option.value === value ? theme.accent.primary : theme.text.primary,
                  backgroundColor: option.value === value ? theme.accent.primaryBg : 'transparent',
                  border: 'none',
                  borderRadius: theme.radius.md,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: `all ${theme.transition.fast}`,
                }}
                onMouseEnter={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.backgroundColor = theme.bg.hover
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = option.value === value ? theme.accent.primaryBg : 'transparent'
                }}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
