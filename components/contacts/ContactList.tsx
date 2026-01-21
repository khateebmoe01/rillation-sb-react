import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Mail, Phone, Building2, Linkedin } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Card, Avatar, StatusBadge, Button, SearchInput, EmptyState, LoadingSkeleton } from '../shared'
import { ContactModal } from './ContactModal'
import type { Contact } from '../../types'

export function ContactList() {
  const { contacts, loading } = useCRM()
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
      c.company?.name?.toLowerCase().includes(query) ||
      c.title?.toLowerCase().includes(query)
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
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 1fr 1fr 100px',
              gap: 16,
              padding: '12px 16px',
              borderBottom: `1px solid ${theme.border.subtle}`,
              backgroundColor: theme.bg.muted,
            }}
          >
            <TableHeader>Name</TableHeader>
            <TableHeader>Company</TableHeader>
            <TableHeader>Title</TableHeader>
            <TableHeader>Status</TableHeader>
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
                />
              </motion.div>
            ))}
          </AnimatePresence>
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
  onClick: () => void
}

function ContactRow({ contact, onClick }: ContactRowProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.5fr 1fr 1fr 100px',
        gap: 16,
        padding: '12px 16px',
        borderBottom: `1px solid ${theme.border.subtle}`,
        backgroundColor: isHovered ? theme.bg.hover : 'transparent',
        cursor: 'pointer',
        transition: `background-color ${theme.transition.fast}`,
      }}
    >
      {/* Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar src={contact.avatar_url} name={contact.full_name} size="sm" />
        <div style={{ minWidth: 0 }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {contact.company ? (
          <>
            <Building2 size={14} style={{ color: theme.text.muted, flexShrink: 0 }} />
            <span
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.text.secondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {contact.company.name}
            </span>
          </>
        ) : (
          <span style={{ fontSize: theme.fontSize.sm, color: theme.text.muted }}>—</span>
        )}
      </div>
      
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
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
      
      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <StatusBadge status={contact.status} type="contact" />
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
