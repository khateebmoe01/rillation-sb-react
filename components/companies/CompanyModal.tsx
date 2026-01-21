import { useState, useEffect } from 'react'
import { Building2, Globe, Phone, MapPin, Users, DollarSign, Calendar, Trash2 } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Modal, ModalFooter, Button, Input, Select } from '../shared'
import type { Company, CompanyStatus } from '../../types'

interface CompanyModalProps {
  isOpen: boolean
  onClose: () => void
  company: Company | null
}

const STATUS_OPTIONS: { value: CompanyStatus; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'lead', label: 'Lead' },
  { value: 'customer', label: 'Customer' },
  { value: 'partner', label: 'Partner' },
  { value: 'churned', label: 'Churned' },
  { value: 'inactive', label: 'Inactive' },
]

export function CompanyModal({ isOpen, onClose, company }: CompanyModalProps) {
  const { createCompany, updateCompany, deleteCompany } = useCRM()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    linkedin_url: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    industry: '',
    company_size: '',
    annual_revenue: '',
    year_founded: '',
    status: 'prospect' as CompanyStatus,
  })
  
  // Reset form when company changes
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        website: company.website || '',
        linkedin_url: company.linkedin_url || '',
        phone: company.phone || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        country: company.country || '',
        postal_code: company.postal_code || '',
        industry: company.industry || '',
        company_size: company.company_size || '',
        annual_revenue: company.annual_revenue || '',
        year_founded: company.year_founded?.toString() || '',
        status: company.status || 'prospect',
      })
    } else {
      setFormData({
        name: '',
        website: '',
        linkedin_url: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
        industry: '',
        company_size: '',
        annual_revenue: '',
        year_founded: '',
        status: 'prospect',
      })
    }
    setShowDeleteConfirm(false)
  }, [company, isOpen])
  
  const handleSubmit = async () => {
    if (!formData.name.trim()) return
    
    setLoading(true)
    try {
      const data = {
        ...formData,
        year_founded: formData.year_founded ? parseInt(formData.year_founded) : null,
      }
      
      if (company) {
        await updateCompany(company.id, data)
      } else {
        await createCompany(data)
      }
      onClose()
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async () => {
    if (!company) return
    
    setLoading(true)
    try {
      await deleteCompany(company.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={company ? 'Edit Company' : 'New Company'}
      size="lg"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Basic Info Section */}
        <div>
          <SectionHeader icon={<Building2 size={16} />} title="Basic Information" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Company Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Acme Inc."
              style={{ gridColumn: '1 / -1' }}
            />
            <Input
              label="Website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
              icon={<Globe size={14} />}
            />
            <Input
              label="LinkedIn"
              value={formData.linkedin_url}
              onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              placeholder="https://linkedin.com/company/..."
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
              icon={<Phone size={14} />}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={formData.status}
              onChange={(v) => setFormData({ ...formData, status: v as CompanyStatus })}
            />
          </div>
        </div>
        
        {/* Location Section */}
        <div>
          <SectionHeader icon={<MapPin size={16} />} title="Location" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main St"
              style={{ gridColumn: '1 / -1' }}
            />
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="San Francisco"
            />
            <Input
              label="State / Province"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="California"
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="United States"
            />
            <Input
              label="Postal Code"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              placeholder="94102"
            />
          </div>
        </div>
        
        {/* Business Info Section */}
        <div>
          <SectionHeader icon={<DollarSign size={16} />} title="Business Information" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Industry"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="Technology"
            />
            <Input
              label="Company Size"
              value={formData.company_size}
              onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
              placeholder="51-200"
              icon={<Users size={14} />}
            />
            <Input
              label="Annual Revenue"
              value={formData.annual_revenue}
              onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })}
              placeholder="$10M - $50M"
              icon={<DollarSign size={14} />}
            />
            <Input
              label="Year Founded"
              value={formData.year_founded}
              onChange={(e) => setFormData({ ...formData, year_founded: e.target.value })}
              placeholder="2015"
              icon={<Calendar size={14} />}
              type="number"
            />
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation */}
      {showDeleteConfirm && company && (
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
            Are you sure you want to delete "{company.name}"? This action cannot be undone.
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
        {company && !showDeleteConfirm && (
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
        <Button onClick={handleSubmit} loading={loading} disabled={!formData.name.trim()}>
          {company ? 'Save Changes' : 'Create Company'}
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
