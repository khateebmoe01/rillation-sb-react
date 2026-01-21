import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Phone, Briefcase, Linkedin, Trash2, MessageSquare, Building2, DollarSign, Calendar, Globe, MapPin, CheckCircle2, ChevronDown } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { SlidePanel, PanelFooter, Button, Input, Select, Textarea, Avatar } from '../shared'
import type { Contact } from '../../types'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  contact: Contact | null
}

const STAGE_OPTIONS = [
  { value: 'new', label: 'New', color: '#6b7280' },
  { value: 'contacted', label: 'Contacted', color: '#3b82f6' },
  { value: 'engaged', label: 'Engaged', color: '#8b5cf6' },
  { value: 'qualified', label: 'Qualified', color: '#f59e0b' },
  { value: 'disqualified', label: 'Disqualified', color: '#6b7280' },
  { value: 'demo', label: 'Demo', color: '#f97316' },
  { value: 'proposal', label: 'Proposal', color: '#14b8a6' },
  { value: 'closed', label: 'Closed Won', color: '#22c55e' },
]

const LEAD_SOURCE_OPTIONS = [
  { value: 'email_campaign', label: 'Email Campaign' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'conference', label: 'Conference' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'partner', label: 'Partner' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'other', label: 'Other' },
]

// Pipeline steps from engaged_leads
const PIPELINE_STEPS = [
  { key: 'meeting_booked', label: 'Meeting Booked', color: '#a78bfa' },
  { key: 'showed_up_to_disco', label: 'Showed Up to Disco', color: '#c084fc' },
  { key: 'qualified', label: 'Qualified', color: '#fbbf24' },
  { key: 'demo_booked', label: 'Demo Booked', color: '#fb923c' },
  { key: 'showed_up_to_demo', label: 'Showed Up to Demo', color: '#f97316' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#2dd4bf' },
  { key: 'closed', label: 'Closed Won', color: '#22c55e' },
] as const

export function ContactModal({ isOpen, onClose, contact }: ContactModalProps) {
  const { createContact, updateContact, deleteContact, error } = useCRM()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    // Personal Info
    first_name: '',
    last_name: '',
    email: '',
    lead_phone: '',
    job_title: '',
    seniority_level: '',
    linkedin_url: '',
    
    // Company Info (engaged_leads uses 'company' not 'company_name')
    company: '',
    company_domain: '',
    company_linkedin: '',
    company_phone: '',
    company_website: '',
    company_size: '',
    industry: '', // engaged_leads uses 'industry' not 'company_industry'
    annual_revenue: '',
    company_hq_city: '',
    company_hq_state: '',
    company_hq_country: '',
    year_founded: '',
    business_model: '',
    funding_stage: '',
    
    // Pipeline/Sales
    stage: 'new',
    epv: '',
    context: '',
    next_touchpoint: '',
    lead_source: '',
    notes: '',
    assignee: '',
    
    // Pipeline Progress (boolean flags)
    meeting_booked: false,
    showed_up_to_disco: false,
    qualified: false,
    demo_booked: false,
    showed_up_to_demo: false,
    proposal_sent: false,
    closed: false,
    
    // Meeting Info
    meeting_date: '',
    meeting_link: '',
    rescheduling_link: '',
    
    // Campaign info (read-only, synced from API)
    campaign_name: '',
    campaign_id: '',
  })
  
  // Reset form when contact changes
  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        lead_phone: contact.lead_phone || '',
        job_title: contact.job_title || '',
        seniority_level: contact.seniority_level || '',
        linkedin_url: contact.linkedin_url || '',
        company: contact.company || '',
        company_domain: contact.company_domain || '',
        company_linkedin: contact.company_linkedin || '',
        company_phone: contact.company_phone || '',
        company_website: contact.company_website || '',
        company_size: contact.company_size || '',
        industry: contact.industry || '',
        annual_revenue: contact.annual_revenue || '',
        company_hq_city: contact.company_hq_city || '',
        company_hq_state: contact.company_hq_state || '',
        company_hq_country: contact.company_hq_country || '',
        year_founded: contact.year_founded?.toString() || '',
        business_model: contact.business_model || '',
        funding_stage: contact.funding_stage || '',
        stage: contact.stage || 'new',
        epv: contact.epv?.toString() || '',
        context: contact.context || '',
        next_touchpoint: contact.next_touchpoint ? contact.next_touchpoint.split('T')[0] : '',
        lead_source: contact.lead_source || '',
        notes: contact.notes || '',
        assignee: contact.assignee || '',
        meeting_booked: contact.meeting_booked || false,
        showed_up_to_disco: contact.showed_up_to_disco || false,
        qualified: contact.qualified || false,
        demo_booked: contact.demo_booked || false,
        showed_up_to_demo: contact.showed_up_to_demo || false,
        proposal_sent: contact.proposal_sent || false,
        closed: contact.closed || false,
        meeting_date: contact.meeting_date ? contact.meeting_date.split('T')[0] : '',
        meeting_link: contact.meeting_link || '',
        rescheduling_link: contact.rescheduling_link || '',
        campaign_name: contact.campaign_name || '',
        campaign_id: contact.campaign_id || '',
      })
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        lead_phone: '',
        job_title: '',
        seniority_level: '',
        linkedin_url: '',
        company: '',
        company_domain: '',
        company_linkedin: '',
        company_phone: '',
        company_website: '',
        company_size: '',
        industry: '',
        annual_revenue: '',
        company_hq_city: '',
        company_hq_state: '',
        company_hq_country: '',
        year_founded: '',
        business_model: '',
        funding_stage: '',
        stage: 'new',
        epv: '',
        context: '',
        next_touchpoint: '',
        lead_source: '',
        notes: '',
        assignee: '',
        meeting_booked: false,
        showed_up_to_disco: false,
        qualified: false,
        demo_booked: false,
        showed_up_to_demo: false,
        proposal_sent: false,
        closed: false,
        meeting_date: '',
        meeting_link: '',
        rescheduling_link: '',
        campaign_name: '',
        campaign_id: '',
      })
    }
    setShowDeleteConfirm(false)
    setFormError(null)
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
        next_touchpoint: formData.next_touchpoint || null,
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
        name={fullName || formData.email || 'New Lead'} 
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
          {fullName || 'New Lead'}
        </h2>
        {(formData.job_title || formData.company) && (
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
            {formData.job_title && formData.company 
              ? `${formData.job_title} at ${formData.company}`
              : formData.job_title || formData.company}
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
      width={640}
    >
      <form onSubmit={onFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Personal Info Section */}
        <SectionHeader icon={<User size={16} />} title="Personal Info" />
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
            value={formData.lead_phone}
            onChange={(e) => setFormData({ ...formData, lead_phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
            icon={<Phone size={14} />}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Job Title"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
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
        </div>
        
        {/* Company Info Section */}
        <SectionHeader icon={<Building2 size={16} />} title="Company Info" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Company Name"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
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
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
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
        
        {/* Pipeline Section */}
        <SectionHeader icon={<DollarSign size={16} />} title="Pipeline & Sales" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pipeline Progress Dropdown */}
          <PipelineProgressMultiSelect
            steps={PIPELINE_STEPS}
            formData={formData}
            onToggle={(key: string, checked: boolean) => setFormData({ ...formData, [key]: checked })}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select
              label="Stage"
              options={STAGE_OPTIONS}
              value={formData.stage}
              onChange={(v) => setFormData({ ...formData, stage: v })}
            />
            <Input
              label="Assignee"
              value={formData.assignee}
              onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
              placeholder="John Doe"
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
            <Select
              label="Lead Source"
              options={LEAD_SOURCE_OPTIONS}
              value={formData.lead_source}
              onChange={(v) => setFormData({ ...formData, lead_source: v })}
              placeholder="Select source..."
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Next Touchpoint"
              value={formData.next_touchpoint}
              onChange={(e) => setFormData({ ...formData, next_touchpoint: e.target.value })}
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
              Are you sure you want to delete this lead? This action cannot be undone.
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
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                marginRight: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                color: theme.text.muted,
                backgroundColor: 'transparent',
                border: `1px solid ${theme.border.subtle}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                transition: `all ${theme.transition.fast}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.status.error
                e.currentTarget.style.borderColor = theme.status.error
                e.currentTarget.style.backgroundColor = theme.status.errorBg
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.text.muted
                e.currentTarget.style.borderColor = theme.border.subtle
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!formData.first_name.trim() && !formData.email.trim()}
          >
            {contact ? 'Save Changes' : 'Create Lead'}
          </Button>
        </PanelFooter>
      </form>
    </SlidePanel>
  )
}

// Pipeline Progress Multi-Select Dropdown
interface PipelineProgressMultiSelectProps {
  steps: readonly { key: string; label: string; color: string }[]
  formData: Record<string, any>
  onToggle: (key: string, checked: boolean) => void
}

function PipelineProgressMultiSelect({ steps, formData, onToggle }: PipelineProgressMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Get completed steps count
  const completedSteps = steps.filter(step => formData[step.key])
  const deepestStep = completedSteps.length > 0 ? completedSteps[completedSteps.length - 1] : null
  
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
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: 40,
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: theme.fontSize.base,
          backgroundColor: theme.bg.card,
          color: deepestStep ? deepestStep.color : theme.text.muted,
          border: `1px solid ${isOpen ? theme.border.focus : theme.border.default}`,
          borderRadius: theme.radius.lg,
          cursor: 'pointer',
          textAlign: 'left',
          transition: `all ${theme.transition.fast}`,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {deepestStep && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: deepestStep.color,
              }}
            />
          )}
          <span>
            {deepestStep ? deepestStep.label : 'No progress'}
            {completedSteps.length > 1 && (
              <span style={{ color: theme.text.muted, marginLeft: 4 }}>
                (+{completedSteps.length - 1})
              </span>
            )}
          </span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} style={{ color: theme.text.muted }} />
        </motion.div>
      </button>
      
      {/* Dropdown */}
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
              right: 0,
              marginTop: 4,
              backgroundColor: theme.bg.elevated,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.lg,
              boxShadow: theme.shadow.dropdown,
              zIndex: theme.z.dropdown,
              overflow: 'hidden',
              padding: 8,
            }}
          >
            {steps.map((step) => {
              const isChecked = formData[step.key] as boolean
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => onToggle(step.key, !isChecked)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: theme.fontSize.sm,
                    backgroundColor: isChecked ? `${step.color}15` : 'transparent',
                    color: isChecked ? step.color : theme.text.primary,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: `all ${theme.transition.fast}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isChecked) {
                      e.currentTarget.style.backgroundColor = theme.bg.hover
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isChecked ? `${step.color}15` : 'transparent'
                  }}
                >
                  {/* Custom Checkbox */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: theme.radius.sm,
                      border: `2px solid ${isChecked ? step.color : theme.border.default}`,
                      backgroundColor: isChecked ? step.color : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: `all ${theme.transition.fast}`,
                    }}
                  >
                    {isChecked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{ fontWeight: isChecked ? theme.fontWeight.medium : theme.fontWeight.normal }}>
                    {step.label}
                  </span>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
