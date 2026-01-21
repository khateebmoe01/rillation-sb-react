import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Mail, Phone, Building2, Linkedin, Clock } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Card, Avatar, StatusBadge, Button, SearchInput, EmptyState, LoadingSkeleton, StageDropdown, PipelineProgressDropdown } from '../shared'
import { ContactModal } from './ContactModal'
import type { Contact } from '../../types'
import type { PipelineProgress } from '../shared/PipelineProgressDropdown'

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
      c.email?.toLowerCase().includes(query) ||
      c.company_name?.toLowerCase().includes(query) ||
      c.title?.toLowerCase().includes(query) ||
      c.company_industry?.toLowerCase().includes(query)
    )
  }, [contacts, searchQuery])
  
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
  
  if (loading.contacts) {
    return <LoadingSkeleton rows={8} />
  }
  
  return (
    <div style={{ padding: 20 }}>
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
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search contacts..."
            style={{ width: 260 }}
          />
          <Button
            icon={<Plus size={16} />}
            onClick={handleCreateContact}
          >
            Add Contact
          </Button>
        </div>
      </div>
      
      {/* Contacts Table */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title={searchQuery ? 'No contacts found' : 'No contacts yet'}
          description={
            searchQuery
              ? 'Try adjusting your search terms'
              : 'Start by adding your first contact to the CRM'
          }
          action={
            !searchQuery
              ? { label: 'Add Contact', onClick: handleCreateContact, icon: <Plus size={16} /> }
              : undefined
          }
        />
      ) : (
        <Card padding="none">
          <div style={{ overflowX: 'auto' }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(200px, 2.5fr) minmax(150px, 1.5fr) minmax(120px, 1fr) 140px 180px 110px 120px',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: `1px solid ${theme.border.subtle}`,
                backgroundColor: theme.bg.muted,
                minWidth: 1020,
              }}
            >
              <TableHeader>Name</TableHeader>
              <TableHeader>Company</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Stage</TableHeader>
              <TableHeader>Pipeline Progress</TableHeader>
              <TableHeader>Last Activity</TableHeader>
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
                    onClick={() => handleOpenContact(contact)}
                    onUpdateStage={(stage) => updateContact(contact.id, { stage })}
                    onUpdatePipeline={(progress) => updateContact(contact.id, { pipeline_progress: progress })}
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
        onClose={() => setIsModalOpen(false)}
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
        paddingRight: 12,
      }}
    >
      {children}
    </span>
  )
}

interface ContactRowProps {
  contact: Contact
  onClick: () => void
  onUpdateStage: (stage: string) => void
  onUpdatePipeline: (progress: PipelineProgress) => void
}

function ContactRow({ contact, onClick, onUpdateStage, onUpdatePipeline }: ContactRowProps) {
  // Format last activity date
  const formatLastActivity = (date: string | null | undefined) => {
    if (!date) return null
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  
  const lastActivity = contact.updated_at || contact.created_at
  
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
        gridTemplateColumns: 'minmax(200px, 2.5fr) minmax(150px, 1.5fr) minmax(120px, 1fr) 140px 180px 110px 120px',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: `1px solid ${theme.border.subtle}`,
        backgroundColor: 'transparent',
        cursor: 'pointer',
        minWidth: 1020,
      }}
    >
      {/* Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingRight: 12, minWidth: 0 }}>
        <Avatar src={contact.avatar_url} name={contact.full_name} size="sm" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: theme.fontSize.base,
              fontWeight: theme.fontWeight.medium,
              color: theme.text.primary,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {contact.full_name || 'Unknown'}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 12, minWidth: 0 }}>
        {contact.company_name ? (
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
                {contact.company_name}
              </span>
              {contact.company_industry && (
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
                  {contact.company_industry}
                </span>
              )}
            </div>
          </>
        ) : (
          <span style={{ fontSize: theme.fontSize.sm, color: theme.text.muted }}>—</span>
        )}
      </div>
      
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12, minWidth: 0 }}>
        <span
          style={{
            fontSize: theme.fontSize.sm,
            color: contact.title ? theme.text.secondary : theme.text.muted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {contact.title || '—'}
        </span>
      </div>
      
      {/* Stage */}
      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12 }}>
        <StageDropdown
          value={contact.stage}
          onChange={(stage) => {
            onUpdateStage(stage)
          }}
        />
      </div>
      
      {/* Pipeline Progress */}
      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12 }}>
        <PipelineProgressDropdown
          value={contact.pipeline_progress}
          onChange={(progress) => {
            onUpdatePipeline(progress)
          }}
        />
      </div>
      
      {/* Last Activity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12 }}>
        <Clock size={12} style={{ color: theme.text.muted, flexShrink: 0 }} />
        <span
          style={{
            fontSize: theme.fontSize.xs,
            color: theme.text.muted,
            whiteSpace: 'nowrap',
          }}
        >
          {formatLastActivity(lastActivity) || '—'}
        </span>
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>
        {contact.email && (
          <ActionButton
            href={`mailto:${contact.email}`}
            icon={<Mail size={14} />}
            label="Email"
          />
        )}
        {contact.phone && (
          <ActionButton
            href={`tel:${contact.phone}`}
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
        width: 28,
        height: 28,
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
