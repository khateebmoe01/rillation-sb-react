import { useState, useEffect, useCallback } from 'react'
import { User, Mail, Phone, Briefcase, Linkedin, Trash2, MessageSquare, Building2, DollarSign, Calendar, Globe, MapPin } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { SlidePanel, PanelFooter, Button, Input, Select, Textarea, Avatar } from '../shared'
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

const STAGE_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'meeting_booked', label: 'Meeting Booked' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
]

export function ContactModal({ isOpen, onClose, contact }: ContactModalProps) {
  const { createContact, updateContact, deleteContact, error } = useCRM()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'personal' | 'company' | 'pipeline'>('personal')
  
  const [formData, setFormData] = useState({
    // Personal Info
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lead_phone: '',
    title: '',
    job_title: '',
    department: '',
    linkedin_url: '',
    profile_url: '',
    seniority_level: '',
    
    // Company Info
    company_name: '',
    company_domain: '',
    company_linkedin: '',
    company_phone: '',
    company_website: '',
    company_size: '',
    company_industry: '',
    annual_revenue: '',
    company_hq_city: '',
    company_hq_state: '',
    company_hq_country: '',
    year_founded: '',
    business_model: '',
    funding_stage: '',
    
    // Pipeline/Sales
    status: 'cold' as ContactStatus,
    stage: 'new',
    epv: '',
    context: '',
    next_touch: '',
    lead_source: '',
    notes: '',
    
    // Meeting Info
    meeting_date: '',
    meeting_link: '',
    rescheduling_link: '',
    
    // Background
    background: '',
  })
  
  // Reset form when contact changes
  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        lead_phone: contact.lead_phone || '',
        title: contact.title || '',
        job_title: contact.job_title || '',
        department: contact.department || '',
        linkedin_url: contact.linkedin_url || '',
        profile_url: contact.profile_url || '',
        seniority_level: contact.seniority_level || '',
        company_name: contact.company_name || '',
        company_domain: contact.company_domain || '',
        company_linkedin: contact.company_linkedin || '',
        company_phone: contact.company_phone || '',
        company_website: contact.company_website || '',
        company_size: contact.company_size || '',
        company_industry: contact.company_industry || '',
        annual_revenue: contact.annual_revenue || '',
        company_hq_city: contact.company_hq_city || '',
        company_hq_state: contact.company_hq_state || '',
        company_hq_country: contact.company_hq_country || '',
        year_founded: contact.year_founded?.toString() || '',
        business_model: contact.business_model || '',
        funding_stage: contact.funding_stage || '',
        status: contact.status || 'cold',
        stage: contact.stage || 'new',
        epv: contact.epv?.toString() || '',
        context: contact.context || '',
        next_touch: contact.next_touch ? contact.next_touch.split('T')[0] : '',
        lead_source: contact.lead_source || '',
        notes: contact.notes || '',
        meeting_date: contact.meeting_date ? contact.meeting_date.split('T')[0] : '',
        meeting_link: contact.meeting_link || '',
        rescheduling_link: contact.rescheduling_link || '',
        background: contact.background || '',
      })
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        lead_phone: '',
        title: '',
        job_title: '',
        department: '',
        linkedin_url: '',
        profile_url: '',
        seniority_level: '',
        company_name: '',
        company_domain: '',
        company_linkedin: '',
        company_phone: '',
        company_website: '',
        company_size: '',
        company_industry: '',
        annual_revenue: '',
        company_hq_city: '',
        company_hq_state: '',
        company_hq_country: '',
        year_founded: '',
        business_model: '',
        funding_stage: '',
        status: 'cold',
        stage: 'new',
        epv: '',
        context: '',
        next_touch: '',
        lead_source: '',
        notes: '',
        meeting_date: '',
        meeting_link: '',
        rescheduling_link: '',
        background: '',
      })
    }
    setShowDeleteConfirm(false)
    setFormError(null)
    setActiveTab('personal')
  }, [contact, isOpen])
  
  // Check if form can be submitted
  const canSubmit = formData.first_name.trim() || formData.email.trim()
  
  const handleSubmit = useCallback(async () => {
    if (!formData.first_name.trim() && !formData.email.trim()) {
      setFormError('Please provide at least a first name or email')
      return
    }
    
    setLoading(true)
    setFormError(null)
    try {
      const data = {
        ...formData,
        year_founded: formData.year_founded ? parseInt(formData.year_founded) : null,
        epv: formData.epv ? parseFloat(formData.epv) : null,
        next_touch: formData.next_touch || null,
        meeting_date: formData.meeting_date || null,
      }
      
      if (contact) {
        const success = await updateContact(contact.id, data)
        if (success) {
          onClose()
        } else {
          setFormError(error || 'Failed to update contact')
        }
      } else {
        const created = await createContact(data)
        if (created) {
          onClose()
        } else {
          setFormError(error || 'Failed to create contact')
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [formData, contact, updateContact, createContact, onClose, error])
  
  
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
  
  const tabs = [
    { id: 'personal', label: 'Personal', icon: <User size={14} /> },
    { id: 'company', label: 'Company', icon: <Building2 size={14} /> },
    { id: 'pipeline', label: 'Pipeline', icon: <DollarSign size={14} /> },
  ] as const
  
  // Handle form submission (Enter key in form fields)
  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (canSubmit && !loading && !showDeleteConfirm) {
      handleSubmit()
    }
  }
  
  // Header component for SlidePanel
  const panelHeader = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Avatar 
        name={fullName || formData.email || 'New Contact'} 
        size="lg" 
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2
          style={{
            fontSize: theme.fontSize.xl,
            fontWeight: theme.fontWeight.semibold,
            color: theme.text.primary,
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fullName || 'New Contact'}
        </h2>
        {(formData.title || formData.company_name) && (
          <p
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.text.secondary,
              margin: '4px 0 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {formData.title && formData.company_name 
              ? `${formData.title} at ${formData.company_name}`
              : formData.title || formData.company_name}
          </p>
        )}
        {formData.email && (
          <p
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.text.muted,
              margin: '2px 0 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {formData.email}
          </p>
        )}
      </div>
    </div>
  )
  
  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      header={panelHeader}
      width={480}
    >
      <form onSubmit={onFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${theme.border.subtle}`, paddingBottom: 0, marginBottom: 4 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                border: 'none',
                background: activeTab === tab.id ? theme.bg.card : 'transparent',
                color: activeTab === tab.id ? theme.accent.primary : theme.text.secondary,
                cursor: 'pointer',
                borderRadius: `${theme.radius.md} ${theme.radius.md} 0 0`,
                borderBottom: activeTab === tab.id ? `2px solid ${theme.accent.primary}` : '2px solid transparent',
                marginBottom: -1,
                fontSize: theme.fontSize.sm,
                fontWeight: activeTab === tab.id ? theme.fontWeight.medium : theme.fontWeight.normal,
                transition: `all ${theme.transition.fast}`,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Personal Info Tab */}
        {activeTab === 'personal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Job Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="CEO"
                icon={<Briefcase size={14} />}
              />
              <Input
                label="Seniority Level"
                value={formData.seniority_level}
                onChange={(e) => setFormData({ ...formData, seniority_level: e.target.value })}
                placeholder="Executive"
              />
            </div>
            <Input
              label="LinkedIn Profile"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/in/..."
              icon={<Linkedin size={14} />}
            />
            
            <SectionHeader icon={<MessageSquare size={16} />} title="Background / Notes" />
            <Textarea
              value={formData.background}
              onChange={(e) => setFormData({ ...formData, background: e.target.value })}
              placeholder="Add notes about this contact..."
              style={{ minHeight: 100 }}
            />
          </div>
        )}
        
        {/* Company Info Tab */}
        {activeTab === 'company' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Company Name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Acme Inc"
              icon={<Building2 size={14} />}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Company Domain"
                value={formData.company_domain}
                onChange={(e) => setFormData({ ...formData, company_domain: e.target.value })}
                placeholder="acme.com"
                icon={<Globe size={14} />}
              />
              <Input
                label="Industry"
                value={formData.company_industry}
                onChange={(e) => setFormData({ ...formData, company_industry: e.target.value })}
                placeholder="Technology"
              />
            </div>
            <Input
              label="Website"
              value={formData.company_website}
              onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
              placeholder="https://acme.com"
            />
            <Input
              label="Company LinkedIn"
              value={formData.company_linkedin}
              onChange={(e) => setFormData({ ...formData, company_linkedin: e.target.value })}
              placeholder="https://linkedin.com/company/..."
              icon={<Linkedin size={14} />}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Company Phone"
                value={formData.company_phone}
                onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                icon={<Phone size={14} />}
              />
              <Input
                label="Company Size"
                value={formData.company_size}
                onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                placeholder="11-50"
              />
            </div>
            <Input
              label="Annual Revenue"
              value={formData.annual_revenue}
              onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })}
              placeholder="$1M-$10M"
            />
            
            <SectionHeader icon={<MapPin size={16} />} title="Location" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Input
                label="City"
                value={formData.company_hq_city}
                onChange={(e) => setFormData({ ...formData, company_hq_city: e.target.value })}
                placeholder="San Francisco"
              />
              <Input
                label="State"
                value={formData.company_hq_state}
                onChange={(e) => setFormData({ ...formData, company_hq_state: e.target.value })}
                placeholder="CA"
              />
              <Input
                label="Country"
                value={formData.company_hq_country}
                onChange={(e) => setFormData({ ...formData, company_hq_country: e.target.value })}
                placeholder="USA"
              />
            </div>
            
            <SectionHeader icon={<Briefcase size={16} />} title="Company Details" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Year Founded"
                value={formData.year_founded}
                onChange={(e) => setFormData({ ...formData, year_founded: e.target.value })}
                placeholder="2015"
                type="number"
              />
              <Input
                label="Business Model"
                value={formData.business_model}
                onChange={(e) => setFormData({ ...formData, business_model: e.target.value })}
                placeholder="B2B SaaS"
              />
            </div>
            <Input
              label="Funding Stage"
              value={formData.funding_stage}
              onChange={(e) => setFormData({ ...formData, funding_stage: e.target.value })}
              placeholder="Series A"
            />
          </div>
        )}
        
        {/* Pipeline Tab */}
        {activeTab === 'pipeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={formData.status}
                onChange={(v) => setFormData({ ...formData, status: v as ContactStatus })}
              />
              <Select
                label="Stage"
                options={STAGE_OPTIONS}
                value={formData.stage}
                onChange={(v) => setFormData({ ...formData, stage: v })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="EPV (Estimated Pipeline Value)"
                value={formData.epv}
                onChange={(e) => setFormData({ ...formData, epv: e.target.value })}
                placeholder="10000"
                type="number"
                icon={<DollarSign size={14} />}
              />
              <Input
                label="Lead Source"
                value={formData.lead_source}
                onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                placeholder="Email Campaign"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Next Touch"
                value={formData.next_touch}
                onChange={(e) => setFormData({ ...formData, next_touch: e.target.value })}
                type="date"
                icon={<Calendar size={14} />}
              />
              <Input
                label="Meeting Date"
                value={formData.meeting_date}
                onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
                type="date"
                icon={<Calendar size={14} />}
              />
            </div>
            <Input
              label="Meeting Link"
              value={formData.meeting_link}
              onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
              placeholder="https://zoom.us/..."
            />
            
            <SectionHeader icon={<MessageSquare size={16} />} title="Context & Notes" />
            <Textarea
              label="Context"
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              placeholder="Conversation context, key points discussed..."
              style={{ minHeight: 80 }}
            />
            <Textarea
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              style={{ minHeight: 60 }}
            />
          </div>
        )}
        
        {/* Error Message */}
        {formError && (
          <div
            style={{
              padding: 12,
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
              }}
            >
              {formError}
            </p>
          </div>
        )}
      
        {/* Delete Confirmation */}
        {showDeleteConfirm && contact && (
          <div
            style={{
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
              <Button type="button" variant="danger" size="sm" onClick={handleDelete} loading={loading}>
                Yes, Delete
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      
        <PanelFooter>
          {contact && !showDeleteConfirm && (
            <Button
              type="button"
              variant="ghost"
              icon={<Trash2 size={16} />}
              onClick={() => setShowDeleteConfirm(true)}
              style={{ marginRight: 'auto' }}
            >
              Delete
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!formData.first_name.trim() && !formData.email.trim()}
          >
            {contact ? 'Save Changes' : 'Create Contact'}
          </Button>
        </PanelFooter>
      </form>
    </SlidePanel>
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
        marginTop: 8,
        marginBottom: 4,
        paddingBottom: 8,
        borderBottom: `1px solid ${theme.border.subtle}`,
      }}
    >
      <span style={{ color: theme.accent.primary }}>{icon}</span>
      <h3
        style={{
          fontSize: theme.fontSize.xs,
          fontWeight: theme.fontWeight.semibold,
          color: theme.text.muted,
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
