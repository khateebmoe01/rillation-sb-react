import { useState, useEffect, useCallback } from 'react'
import { DollarSign, Users, Calendar, Percent, FileText, Trash2 } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Modal, ModalFooter, Button, Input, Select, Textarea } from '../shared'
import { DEAL_STAGES, DEAL_STAGE_INFO, type Deal, type DealStage } from '../../types'

interface DealModalProps {
  isOpen: boolean
  onClose: () => void
  deal: Deal | null
  defaultStage?: DealStage | null
}

export function DealModal({ isOpen, onClose, deal, defaultStage }: DealModalProps) {
  const { contacts, createDeal, updateDeal, deleteDeal, error } = useCRM()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
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
      setFormData({
        name: deal.name || '',
        description: deal.description || '',
        contact_id: deal.contact_id || '',
        stage: deal.stage || 'lead',
        amount: deal.amount?.toString() || '',
        probability: deal.probability?.toString() || '',
        expected_close_date: deal.expected_close_date || '',
      })
    } else {
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
    
    setLoading(true)
    setFormError(null)
    try {
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
        const success = await updateDeal(deal.id, data)
        if (success) {
          onClose()
        } else {
          setFormError(error || 'Failed to update deal')
        }
      } else {
        const created = await createDeal(data)
        if (created) {
          onClose()
        } else {
          setFormError(error || 'Failed to create deal')
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
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
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={deal ? 'Edit Deal' : 'New Deal'}
      size="lg"
      onKeyDown={handleKeyDown}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Deal Summary */}
        {(amount > 0 || formData.name) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              backgroundColor: theme.bg.muted,
              borderRadius: theme.radius.lg,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: theme.fontSize.lg,
                  fontWeight: theme.fontWeight.semibold,
                  color: theme.text.primary,
                  margin: 0,
                }}
              >
                {formData.name || 'New Deal'}
              </p>
              {selectedContact && (
                <p
                  style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.text.secondary,
                    margin: '4px 0',
                  }}
                >
                  {selectedContact.full_name || selectedContact.email}
                  {selectedContact.company && ` @ ${selectedContact.company}`}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: theme.radius.full,
                    backgroundColor: DEAL_STAGE_INFO[formData.stage].bgColor,
                    color: DEAL_STAGE_INFO[formData.stage].color,
                    fontSize: theme.fontSize.xs,
                    fontWeight: theme.fontWeight.medium,
                  }}
                >
                  {DEAL_STAGE_INFO[formData.stage].label}
                </span>
              </div>
            </div>
            
            {amount > 0 && (
              <div style={{ textAlign: 'right' }}>
                <p
                  style={{
                    fontSize: theme.fontSize['2xl'],
                    fontWeight: theme.fontWeight.bold,
                    color: theme.status.success,
                    margin: 0,
                  }}
                >
                  ${amount.toLocaleString()}
                </p>
                <p
                  style={{
                    fontSize: theme.fontSize.sm,
                    color: theme.text.muted,
                    margin: '2px 0 0 0',
                  }}
                >
                  ${weightedValue.toLocaleString()} weighted
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Deal Details Section */}
        <div>
          <SectionHeader icon={<DollarSign size={16} />} title="Deal Details" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          <SectionHeader icon={<Users size={16} />} title="Related Contact" />
          <Select
            label="Contact"
            options={contactOptions}
            value={formData.contact_id}
            onChange={(v) => setFormData({ ...formData, contact_id: v })}
          />
          {selectedContact && selectedContact.company && (
            <p
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.text.muted,
                margin: '8px 0 0 0',
              }}
            >
              Company: {selectedContact.company}
              {selectedContact.industry && ` • ${selectedContact.industry}`}
            </p>
          )}
        </div>
        
        {/* Description Section */}
        <div>
          <SectionHeader icon={<FileText size={16} />} title="Description" />
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
            Are you sure you want to delete this deal? This action cannot be undone.
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
        {deal && !showDeleteConfirm && (
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
          {deal ? 'Save Changes' : 'Create Deal'}
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
