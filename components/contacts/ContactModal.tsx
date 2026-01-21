import { useState, useEffect } from 'react'
import { User, Mail, Phone, Briefcase, Linkedin, Trash2, MessageSquare } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Modal, ModalFooter, Button, Input, Select, Textarea, Avatar } from '../shared'
import type { Contact, ContactStatus } from '../../types'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  contact: Contact | null
}

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'cold', label: 'Cold' },
  { value: 'warm', label: 'Warm' },
  { value: 'hot', label: 'Hot' },
  { value: 'in-contract', label: 'In Contract' },
  { value: 'customer', label: 'Customer' },
  { value: 'inactive', label: 'Inactive' },
]

export function ContactModal({ isOpen, onClose, contact }: ContactModalProps) {
  const { companies, createContact, updateContact, deleteContact } = useCRM()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_id: '',
    title: '',
    department: '',
    linkedin_url: '',
    lead_source: '',
    status: 'cold' as ContactStatus,
    background: '',
  })
  
  // Build company options
  const companyOptions = [
    { value: '', label: 'No company' },
    ...companies.map(c => ({ value: c.id, label: c.name }))
  ]
  
  // Reset form when contact changes
  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company_id: contact.company_id || '',
        title: contact.title || '',
        department: contact.department || '',
        linkedin_url: contact.linkedin_url || '',
        lead_source: contact.lead_source || '',
        status: contact.status || 'cold',
        background: contact.background || '',
      })
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_id: '',
        title: '',
        department: '',
        linkedin_url: '',
        lead_source: '',
        status: 'cold',
        background: '',
      })
    }
    setShowDeleteConfirm(false)
  }, [contact, isOpen])
  
  const handleSubmit = async () => {
    if (!formData.first_name.trim() && !formData.email.trim()) return
    
    setLoading(true)
    try {
      const data = {
        ...formData,
        company_id: formData.company_id || null,
      }
      
      if (contact) {
        await updateContact(contact.id, data)
      } else {
        await createContact(data)
      }
      onClose()
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async () => {
    if (!contact) return
    
    setLoading(true)
    try {
      await deleteContact(contact.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }
  
  const fullName = [formData.first_name, formData.last_name].filter(Boolean).join(' ')
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contact ? 'Edit Contact' : 'New Contact'}
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Contact Avatar Preview */}
        {(fullName || formData.email) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: 16,
              backgroundColor: theme.bg.muted,
              borderRadius: theme.radius.lg,
            }}
          >
            <Avatar name={fullName || formData.email} size="xl" />
            <div>
              <p
                style={{
                  fontSize: theme.fontSize.lg,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.text.primary,
                  margin: 0,
                }}
              >
                {fullName || 'New Contact'}
              </p>
              {formData.email && (
                <p
                  style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.text.muted,
                    margin: '4px 0 0 0',
                  }}
                >
                  {formData.email}
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Personal Info Section */}
        <div>
          <SectionHeader icon={<User size={16} />} title="Personal Information" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="John"
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Doe"
            />
            <Input
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              icon={<Mail size={14} />}
              type="email"
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              icon={<Phone size={14} />}
            />
            <Input
              label="LinkedIn"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/..."
              icon={<Linkedin size={14} />}
              style={{ gridColumn: '1 / -1' }}
            />
          </div>
        </div>
        
        {/* Professional Info Section */}
        <div>
          <SectionHeader icon={<Briefcase size={16} />} title="Professional Information" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select
              label="Company"
              options={companyOptions}
              value={formData.company_id}
              onChange={(v) => setFormData({ ...formData, company_id: v })}
            />
            <Input
              label="Job Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="CEO"
            />
            <Input
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="Sales"
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={formData.status}
              onChange={(v) => setFormData({ ...formData, status: v as ContactStatus })}
            />
            <Input
              label="Lead Source"
              value={formData.lead_source}
              onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
              placeholder="Email Campaign"
              style={{ gridColumn: '1 / -1' }}
            />
          </div>
        </div>
        
        {/* Background / Notes Section */}
        <div>
          <SectionHeader icon={<MessageSquare size={16} />} title="Background" />
          <Textarea
            value={formData.background}
            onChange={(e) => setFormData({ ...formData, background: e.target.value })}
            placeholder="Add notes about this contact..."
            style={{ minHeight: 80 }}
          />
        </div>
      </div>
      
      {/* Delete Confirmation */}
      {showDeleteConfirm && contact && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            backgroundColor: theme.status.errorBg,
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.status.error}`,
          }}
        >
          <p
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.status.error,
              margin: 0,
              marginBottom: 12,
            }}
          >
            Are you sure you want to delete this contact? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={loading}>
              Yes, Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      <ModalFooter>
        {contact && !showDeleteConfirm && (
          <Button
            variant="ghost"
            icon={<Trash2 size={16} />}
            onClick={() => setShowDeleteConfirm(true)}
            style={{ marginRight: 'auto' }}
          >
            Delete
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!formData.first_name.trim() && !formData.email.trim()}
        >
          {contact ? 'Save Changes' : 'Create Contact'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// Section header component
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottom: `1px solid ${theme.border.subtle}`,
      }}
    >
      <span style={{ color: theme.accent.primary }}>{icon}</span>
      <h3
        style={{
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.semibold,
          color: theme.text.secondary,
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </h3>
    </div>
  )
}
