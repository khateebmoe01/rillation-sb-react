import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, Users, Calendar, Percent, FileText, Trash2, ArrowUpRight, Building2, Phone, Trophy, XCircle } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { SlidePanel, PanelFooter, Button, Input, Select, Textarea, Avatar } from '../shared'
import { DEAL_STAGES, DEAL_STAGE_INFO, type Deal, type DealStage } from '../../types'

interface DealModalProps {
  isOpen: boolean
  onClose: () => void
  deal: Deal | null
  defaultStage?: DealStage | null
}

export function DealModal({ isOpen, onClose, deal, defaultStage }: DealModalProps) {
  const { contacts, createDeal, updateDeal, deleteDeal, error } = useCRM()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const originalAmountRef = useRef<number | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contact_id: '',
    stage: 'lead' as DealStage,
    amount: '',
    probability: '',
    expected_close_date: '',
  })
  
  // Build contact options with company name
  const contactOptions = [
    { value: '', label: 'No contact' },
    ...contacts.map(c => ({ 
      value: c.id, 
      label: `${c.full_name || c.email || 'Unknown'}${c.company ? ` (${c.company})` : ''}` 
    }))
  ]
  
  const stageOptions = DEAL_STAGES.map(stage => ({
    value: stage,
    label: DEAL_STAGE_INFO[stage].label,
  }))
  
  // Reset form when deal changes
  useEffect(() => {
    if (deal) {
      // Store original amount to check if it was null/0
      originalAmountRef.current = deal.amount ?? null
      setFormData({
        name: deal.name || '',
        description: deal.description || '',
        contact_id: deal.contact_id || '',
        stage: deal.stage || 'lead',
        amount: (deal.amount && deal.amount > 0) ? deal.amount.toString() : '',
        probability: deal.probability?.toString() || '',
        expected_close_date: deal.expected_close_date || '',
      })
    } else {
      originalAmountRef.current = null
      setFormData({
        name: '',
        description: '',
        contact_id: '',
        stage: defaultStage || 'interested',
        amount: '',
        probability: DEAL_STAGE_INFO[defaultStage || 'interested'].probability.toString(),
        expected_close_date: '',
      })
    }
    setShowDeleteConfirm(false)
    setFormError(null)
  }, [deal, isOpen, defaultStage])
  
  // Auto-update probability when stage changes
  const handleStageChange = (stage: DealStage) => {
    setFormData({
      ...formData,
      stage,
      probability: DEAL_STAGE_INFO[stage].probability.toString(),
    })
  }
  
  // Get selected contact info for display
  const selectedContact = contacts.find(c => c.id === formData.contact_id)
  
  // Check if form can be submitted
  const canSubmit = formData.name.trim()
  
  const handleSubmit = useCallback(async () => {
    if (!formData.name.trim()) {
      setFormError('Please provide a deal name')
      return
    }
    
    setFormError(null)
    const data = {
      name: formData.name,
      description: formData.description || null,
      contact_id: formData.contact_id || null,
      stage: formData.stage,
      amount: parseFloat(formData.amount) || 0,
      probability: parseInt(formData.probability) || 0,
      expected_close_date: formData.expected_close_date || null,
    }
    
    if (deal) {
      // Optimistic update: close immediately, save in background
      setSaving(true)
      onClose()
      
      // Fire and forget - update happens in background
      updateDeal(deal.id, data).then(success => {
        if (!success) {
          console.error('Failed to update deal:', error)
        }
      }).finally(() => {
        setSaving(false)
      })
    } else {
      // For new deals, we need to wait for creation
      setLoading(true)
      try {
        const created = await createDeal(data)
        if (created) {
          onClose()
        } else {
          setFormError(error || 'Failed to create deal')
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
  }, [formData, deal, updateDeal, createDeal, onClose, error])
  
  // Handle Enter key to save - passed to Modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't trigger if typing in a textarea
    const target = e.target as HTMLElement
    if (target.tagName === 'TEXTAREA') return
    
    // Don't trigger if delete confirmation is showing
    if (showDeleteConfirm) return
    
    // Don't trigger if already loading
    if (loading) return
    
    // Enter key to submit
    if (e.key === 'Enter' && canSubmit) {
      e.preventDefault()
      handleSubmit()
    }
  }
  
  const handleDelete = async () => {
    if (!deal) return
    
    setLoading(true)
    try {
      await deleteDeal(deal.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }
  
  // Calculate weighted value
  const amount = parseFloat(formData.amount) || 0
  const probability = parseInt(formData.probability) || 0
  const weightedValue = amount * (probability / 100)
  
  // Build subtitle: contact's job title at company
  const subtitle = selectedContact 
    ? (selectedContact.job_title && selectedContact.company 
        ? `${selectedContact.job_title} at ${selectedContact.company}`
        : selectedContact.job_title || selectedContact.company || selectedContact.email)
    : null
  
  // Header component matching ContactModal style
  const panelHeader = (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
        <Avatar 
          name={formData.name || selectedContact?.full_name || 'New Deal'} 
          size="lg" 
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: theme.fontWeight.semibold,
              color: theme.text.primary,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {formData.name || 'New Deal'}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: '16px',
                color: theme.text.secondary,
                margin: '4px 0 0 0',
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {/* View Contact button - top right, green */}
      {selectedContact && (
        <button
          onClick={() => {
            if (selectedContact.id) {
              navigate(`/crm/contacts?contactId=${selectedContact.id}`)
              onClose()
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            backgroundColor: theme.accent.primary,
            border: 'none',
            borderRadius: theme.radius.md,
            color: theme.text.primary,
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
            cursor: 'pointer',
            transition: `all ${theme.transition.fast}`,
            flexShrink: 0,
            marginLeft: 12,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.accent.primaryHover
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.accent.primary
          }}
        >
          <ArrowUpRight size={14} />
          <span>View Contact</span>
        </button>
      )}
    </div>
  )
  
  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={onClose}
      header={panelHeader}
      width={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }} onKeyDown={handleKeyDown}>
        
        {/* Deal Details Section */}
        <div>
          <SectionHeader icon={<DollarSign size={18} />} title="Deal Details" />
          
          {/* Value Summary - only show if there's an amount */}
          {amount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                marginBottom: 20,
                backgroundColor: theme.bg.muted,
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.border.subtle}`,
              }}
            >
              <div>
                <p style={{ fontSize: theme.fontSize.xs, color: theme.text.muted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Deal Value
                </p>
                <p style={{ fontSize: theme.fontSize['2xl'], fontWeight: theme.fontWeight.bold, color: theme.status.success, margin: '4px 0 0 0' }}>
                  ${amount.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: theme.fontSize.xs, color: theme.text.muted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Weighted ({probability}%)
                </p>
                <p style={{ fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.semibold, color: theme.text.secondary, margin: '4px 0 0 0' }}>
                  ${weightedValue.toLocaleString()}
                </p>
              </div>
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Input
              label="Deal Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enterprise Contract - Acme"
              style={{ gridColumn: '1 / -1' }}
            />
            <Select
              label="Stage"
              options={stageOptions}
              value={formData.stage}
              onChange={(v) => handleStageChange(v as DealStage)}
            />
            <Input
              label="Amount"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              onFocus={(e) => {
                // Clear field if original amount was null or 0
                const input = e.target as HTMLInputElement
                const currentValue = parseFloat(input.value) || 0
                if (currentValue === 0 && (originalAmountRef.current === null || originalAmountRef.current === 0)) {
                  setFormData({ ...formData, amount: '' })
                  // Use setTimeout to ensure the value is cleared before selecting
                  setTimeout(() => input.select(), 0)
                }
              }}
              placeholder="50000"
              type="number"
              icon={<DollarSign size={14} />}
            />
            <Input
              label="Probability %"
              value={formData.probability}
              onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
              placeholder="50"
              type="number"
              icon={<Percent size={14} />}
            />
            <Input
              label="Expected Close Date"
              value={formData.expected_close_date}
              onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              type="date"
              icon={<Calendar size={14} />}
            />
          </div>
        </div>
        
        {/* Contact Section */}
        <div>
          <SectionHeader icon={<Users size={18} />} title="Related Contact" />
          
          {/* Show dropdown only for new deals or deals without a contact */}
          {!deal || !selectedContact ? (
            <Select
              label="Contact"
              options={contactOptions}
              value={formData.contact_id}
              onChange={(v) => setFormData({ ...formData, contact_id: v })}
            />
          ) : null}
          
          {/* Contact info display - read only */}
          {selectedContact && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Company */}
              {selectedContact.company && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    backgroundColor: theme.bg.muted,
                    borderRadius: theme.radius.lg,
                  }}
                >
                  <span style={{ color: theme.accent.primary, display: 'flex', alignItems: 'center' }}>
                    <Building2 size={16} />
                  </span>
                  <p
                    style={{
                      fontSize: theme.fontSize.base,
                      fontWeight: theme.fontWeight.medium,
                      color: theme.text.primary,
                      margin: 0,
                    }}
                  >
                    {selectedContact.company}
                    {selectedContact.industry && (
                      <span style={{ color: theme.text.muted, fontWeight: theme.fontWeight.normal }}>
                        {' · '}{selectedContact.industry}
                      </span>
                    )}
                  </p>
                </div>
              )}
              
              {/* Phone */}
              {selectedContact.lead_phone && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    backgroundColor: theme.bg.muted,
                    borderRadius: theme.radius.lg,
                  }}
                >
                  <span style={{ color: theme.accent.primary, display: 'flex', alignItems: 'center' }}>
                    <Phone size={16} />
                  </span>
                  <a
                    href={`tel:${selectedContact.lead_phone}`}
                    style={{
                      fontSize: theme.fontSize.base,
                      fontWeight: theme.fontWeight.medium,
                      color: theme.text.primary,
                      textDecoration: 'none',
                    }}
                  >
                    {selectedContact.lead_phone}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Description Section */}
        <div>
          <SectionHeader icon={<FileText size={18} />} title="Description" />
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add notes about this deal..."
            style={{ minHeight: 80 }}
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
      </div>
      
      {/* Delete Confirmation */}
      {showDeleteConfirm && deal && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            backgroundColor: theme.status.errorBg,
            borderRadius: theme.radius.lg,
            border: `1px solid ${theme.status.error}30`,
          }}
        >
          <p
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.text.primary,
              margin: 0,
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            Are you sure you want to delete <strong>{deal.name}</strong>? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={loading}>
              Yes, Delete Deal
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Keep It
            </Button>
          </div>
        </div>
      )}
      
      {/* Won/Lost Quick Actions - only for existing deals */}
      {deal && !showDeleteConfirm && formData.stage !== 'closed' && formData.stage !== 'lost' && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 24,
            paddingTop: 20,
            borderTop: `1px solid ${theme.border.subtle}`,
          }}
        >
          <button
            onClick={() => {
              handleStageChange('closed')
              // Auto-save and close
              const data = {
                ...formData,
                stage: 'closed' as DealStage,
                probability: '100',
              }
              setSaving(true)
              onClose()
              updateDeal(deal.id, {
                name: data.name,
                description: data.description || null,
                contact_id: data.contact_id || null,
                stage: 'closed',
                amount: parseFloat(data.amount) || 0,
                probability: 100,
                expected_close_date: data.expected_close_date || null,
              }).finally(() => setSaving(false))
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              backgroundColor: theme.status.successBg,
              border: `1px solid ${theme.status.success}40`,
              borderRadius: theme.radius.lg,
              color: theme.status.success,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              cursor: 'pointer',
              transition: `all ${theme.transition.fast}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.status.success
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.status.successBg
              e.currentTarget.style.color = theme.status.success
            }}
          >
            <Trophy size={16} />
            <span>Mark as Won</span>
          </button>
          
          <button
            onClick={() => {
              handleStageChange('lost')
              // Auto-save and close
              const data = {
                ...formData,
                stage: 'lost' as DealStage,
                probability: '0',
              }
              setSaving(true)
              onClose()
              updateDeal(deal.id, {
                name: data.name,
                description: data.description || null,
                contact_id: data.contact_id || null,
                stage: 'lost',
                amount: parseFloat(data.amount) || 0,
                probability: 0,
                expected_close_date: data.expected_close_date || null,
              }).finally(() => setSaving(false))
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 16px',
              backgroundColor: theme.status.errorBg,
              border: `1px solid ${theme.status.error}40`,
              borderRadius: theme.radius.lg,
              color: theme.status.error,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.semibold,
              cursor: 'pointer',
              transition: `all ${theme.transition.fast}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.status.error
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.status.errorBg
              e.currentTarget.style.color = theme.status.error
            }}
          >
            <XCircle size={16} />
            <span>Mark as Lost</span>
          </button>
        </div>
      )}
      
      <PanelFooter>
        {deal && !showDeleteConfirm && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: theme.radius.md,
              color: theme.text.muted,
              fontSize: theme.fontSize.sm,
              cursor: 'pointer',
              marginRight: 'auto',
              transition: `all ${theme.transition.fast}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.status.errorBg
              e.currentTarget.style.color = theme.status.error
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = theme.text.muted
            }}
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={loading || saving} disabled={!formData.name.trim()}>
          {saving ? 'Saving...' : deal ? 'Save Changes' : 'Create Deal'}
        </Button>
      </PanelFooter>
    </SlidePanel>
  )
}

// Section header component - matches ContactModal style
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: `1px solid ${theme.border.subtle}`,
      }}
    >
      <span style={{ color: theme.accent.primary, display: 'flex', alignItems: 'center' }}>
        {icon}
      </span>
      <h3
        style={{
          fontSize: '19px',
          fontWeight: theme.fontWeight.semibold,
          color: theme.text.primary,
          margin: 0,
        }}
      >
        {title}
      </h3>
    </div>
  )
}
