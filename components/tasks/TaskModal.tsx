import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Calendar, Trash2, Clock, X,
  CheckSquare, Phone, Mail, Users, RotateCcw, Bell,
  DollarSign, AlertCircle, ChevronDown, User, Building2
} from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Modal, ModalFooter, Button, Avatar } from '../shared'
import type { Task, TaskType, Contact } from '../../types'
import { TASK_TYPE_INFO } from '../../types'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
}

const TYPE_OPTIONS: { value: TaskType; label: string; icon: LucideIcon }[] = [
  { value: 'task', label: 'Task', icon: CheckSquare },
  { value: 'call', label: 'Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'follow_up', label: 'Follow Up', icon: RotateCcw },
  { value: 'reminder', label: 'Reminder', icon: Bell },
]

export function TaskModal({ isOpen, onClose, task }: TaskModalProps) {
  const { contacts, deals, createTask, updateTask, deleteTask, error } = useCRM()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showDealDropdown, setShowDealDropdown] = useState(false)
  const [dealSearch, setDealSearch] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [formData, setFormData] = useState({
    text: '',
    type: 'task' as TaskType,
    due_date: '',
    due_time: '',
    deal_id: '',
    assigned_to: '',
  })

  // Create contact map for efficient lookup
  const contactMap = useMemo(() => {
    const map = new Map<string, Contact>()
    contacts.forEach(c => map.set(c.id, c))
    return map
  }, [contacts])

  // Filter deals based on search (exclude closed/lost deals)
  const filteredDeals = deals
    .filter(d => d.stage !== 'closed' && d.stage !== 'lost')
    .filter(d => {
      if (!dealSearch) return true
      const search = dealSearch.toLowerCase()
      return (
        d.name.toLowerCase().includes(search) ||
        d.contact?.full_name?.toLowerCase().includes(search) ||
        d.contact?.company?.toLowerCase().includes(search)
      )
    })
    .slice(0, 10)

  // Get selected deal and its associated contact
  const selectedDeal = deals.find(d => d.id === formData.deal_id)
  const associatedContact = selectedDeal?.contact_id
    ? (selectedDeal.contact || contactMap.get(selectedDeal.contact_id))
    : null

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      const dueDate = task.due_date ? new Date(task.due_date) : null
      setFormData({
        text: task.text || '',
        type: task.type || 'task',
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : '',
        due_time: dueDate ? dueDate.toTimeString().slice(0, 5) : '',
        deal_id: task.deal_id || '',
        assigned_to: task.assigned_to || '',
      })
    } else {
      // Default to tomorrow for new tasks
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      setFormData({
        text: '',
        type: 'task',
        due_date: tomorrow.toISOString().split('T')[0],
        due_time: '09:00',
        deal_id: '',
        assigned_to: '',
      })
    }
    setShowDeleteConfirm(false)
    setFormError(null)
    setDealSearch('')
  }, [task, isOpen])

  // Focus textarea on open
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Check if form can be submitted
  const canSubmit = formData.text.trim()

  const handleSubmit = useCallback(async () => {
    if (!formData.text.trim()) {
      setFormError('Please provide a task description')
      return
    }

    setLoading(true)
    setFormError(null)
    try {
      // Combine date and time
      let dueDateTime: string | null = null
      if (formData.due_date) {
        const date = new Date(formData.due_date)
        if (formData.due_time) {
          const [hours, minutes] = formData.due_time.split(':')
          date.setHours(parseInt(hours), parseInt(minutes))
        }
        dueDateTime = date.toISOString()
      }

      // Contact is derived from the selected deal
      const contactId = associatedContact?.id || null

      // Only include deal_id if it's a real deal (not a synthetic lead_ deal)
      const dealId = formData.deal_id && !formData.deal_id.startsWith('lead_')
        ? formData.deal_id
        : null

      const data = {
        text: formData.text,
        type: formData.type,
        due_date: dueDateTime,
        contact_id: contactId,
        deal_id: dealId,
        assigned_to: formData.assigned_to || null,
      }

      if (task) {
        const success = await updateTask(task.id, data)
        if (success) {
          onClose()
        } else {
          setFormError(error || 'Failed to update task')
        }
      } else {
        const created = await createTask(data)
        if (created) {
          onClose()
        } else {
          setFormError(error || 'Failed to create task')
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [formData, associatedContact, task, updateTask, createTask, onClose, error])

  // Handle Enter key to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'TEXTAREA') return
    if (showDeleteConfirm) return
    if (loading) return

    if (e.key === 'Enter' && canSubmit) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleDelete = async () => {
    if (!task) return

    setLoading(true)
    try {
      await deleteTask(task.id)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Edit Task' : 'New Task'}
      size="lg"
      onKeyDown={handleKeyDown}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Task Type Selector */}
        <div style={{ position: 'relative' }}>
          <label
            style={{
              display: 'block',
              fontSize: theme.fontSize.sm,
              fontWeight: 500,
              color: theme.text.secondary,
              marginBottom: 8,
            }}
          >
            Task Type
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => {
              const info = TASK_TYPE_INFO[value]
              const isSelected = formData.type === value
              return (
                <motion.button
                  key={value}
                  onClick={() => setFormData({ ...formData, type: value })}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    backgroundColor: isSelected ? `${info.color}20` : theme.bg.muted,
                    color: isSelected ? info.color : theme.text.secondary,
                    border: isSelected ? `1px solid ${info.color}` : `1px solid ${theme.border.subtle}`,
                    borderRadius: theme.radius.lg,
                    fontSize: theme.fontSize.sm,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: `all ${theme.transition.fast}`,
                  }}
                >
                  <Icon size={16} />
                  {label}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Task Text */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: theme.fontSize.sm,
              fontWeight: 500,
              color: theme.text.secondary,
              marginBottom: 8,
            }}
          >
            Description <span style={{ color: theme.status.error }}>*</span>
          </label>
          <textarea
            ref={textareaRef}
            value={formData.text}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            placeholder="What needs to be done?"
            style={{
              width: '100%',
              minHeight: 100,
              padding: 14,
              fontSize: theme.fontSize.base,
              backgroundColor: theme.bg.card,
              color: theme.text.primary,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.lg,
              outline: 'none',
              resize: 'vertical',
              transition: `all ${theme.transition.fast}`,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.border.focus
              e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.accent.primaryBg}`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.border.default
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        {/* Due Date & Time Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.fontSize.sm,
                fontWeight: 500,
                color: theme.text.secondary,
                marginBottom: 8,
              }}
            >
              <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              style={{
                width: '100%',
                height: 44,
                padding: '0 14px',
                fontSize: theme.fontSize.base,
                backgroundColor: theme.bg.card,
                color: theme.text.primary,
                border: `1px solid ${theme.border.default}`,
                borderRadius: theme.radius.lg,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: theme.fontSize.sm,
                fontWeight: 500,
                color: theme.text.secondary,
                marginBottom: 8,
              }}
            >
              <Clock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Time
            </label>
            <input
              type="time"
              value={formData.due_time}
              onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
              style={{
                width: '100%',
                height: 44,
                padding: '0 14px',
                fontSize: theme.fontSize.base,
                backgroundColor: theme.bg.card,
                color: theme.text.primary,
                border: `1px solid ${theme.border.default}`,
                borderRadius: theme.radius.lg,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Related Deal Selector */}
        <div style={{ position: 'relative' }}>
          <label
            style={{
              display: 'block',
              fontSize: theme.fontSize.sm,
              fontWeight: 500,
              color: theme.text.secondary,
              marginBottom: 8,
            }}
          >
            <DollarSign size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Related Deal
          </label>

          <motion.button
            onClick={() => setShowDealDropdown(!showDealDropdown)}
            whileHover={{ borderColor: theme.border.strong }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '10px 14px',
              backgroundColor: theme.bg.card,
              border: `1px solid ${showDealDropdown ? theme.border.focus : theme.border.default}`,
              borderRadius: theme.radius.lg,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {selectedDeal ? (
              <>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.entity.dealBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DollarSign size={16} style={{ color: theme.entity.deal }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: theme.fontSize.sm, color: theme.text.primary, margin: 0 }}>
                    {selectedDeal.name}
                  </p>
                  <p style={{ fontSize: theme.fontSize.xs, color: theme.entity.deal, margin: 0 }}>
                    ${selectedDeal.amount?.toLocaleString() || 0}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFormData({ ...formData, deal_id: '' })
                  }}
                  style={{
                    padding: 4,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: theme.text.muted,
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <DollarSign size={18} style={{ color: theme.text.muted }} />
                <span style={{ flex: 1, color: theme.text.muted, fontSize: theme.fontSize.sm }}>
                  Select a deal...
                </span>
                <ChevronDown size={16} style={{ color: theme.text.muted }} />
              </>
            )}
          </motion.button>

          {/* Deal Dropdown */}
          <AnimatePresence>
            {showDealDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  backgroundColor: theme.bg.elevated,
                  border: `1px solid ${theme.border.default}`,
                  borderRadius: theme.radius.lg,
                  padding: 8,
                  zIndex: theme.z.dropdown,
                  boxShadow: theme.shadow.dropdown,
                  maxHeight: 320,
                  overflow: 'auto',
                }}
              >
                {/* Search */}
                <input
                  type="text"
                  value={dealSearch}
                  onChange={(e) => setDealSearch(e.target.value)}
                  placeholder="Search deals..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    marginBottom: 8,
                    fontSize: theme.fontSize.sm,
                    backgroundColor: theme.bg.card,
                    color: theme.text.primary,
                    border: `1px solid ${theme.border.subtle}`,
                    borderRadius: theme.radius.md,
                    outline: 'none',
                  }}
                />

                {/* Deal List */}
                {filteredDeals.length === 0 ? (
                  <p style={{ padding: 12, color: theme.text.muted, fontSize: theme.fontSize.sm, textAlign: 'center' }}>
                    No deals found
                  </p>
                ) : (
                  filteredDeals.map((deal) => {
                    const dealContact = deal.contact || (deal.contact_id ? contactMap.get(deal.contact_id) : null)
                    return (
                      <motion.button
                        key={deal.id}
                        onClick={() => {
                          setFormData({ ...formData, deal_id: deal.id })
                          setShowDealDropdown(false)
                          setDealSearch('')
                        }}
                        whileHover={{ backgroundColor: theme.bg.hover }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: formData.deal_id === deal.id ? theme.bg.active : 'transparent',
                          border: 'none',
                          borderRadius: theme.radius.md,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: theme.radius.md,
                            backgroundColor: theme.entity.dealBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <DollarSign size={18} style={{ color: theme.entity.deal }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: theme.fontSize.sm,
                              fontWeight: 500,
                              color: theme.text.primary,
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {deal.name}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            <span
                              style={{
                                fontSize: theme.fontSize.xs,
                                color: theme.entity.deal,
                                fontWeight: 600,
                              }}
                            >
                              ${deal.amount?.toLocaleString() || 0}
                            </span>
                            {dealContact && (
                              <span
                                style={{
                                  fontSize: theme.fontSize.xs,
                                  color: theme.text.muted,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {dealContact.full_name || dealContact.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Associated Contact Card (Read-only, derived from deal) */}
        <AnimatePresence>
          {associatedContact && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: theme.fontSize.sm,
                  fontWeight: 500,
                  color: theme.text.secondary,
                  marginBottom: 8,
                }}
              >
                <User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Associated Contact
              </label>
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 14,
                  backgroundColor: theme.bg.muted,
                  borderRadius: theme.radius.xl,
                  border: `1px solid ${theme.border.subtle}`,
                }}
              >
                <Avatar name={associatedContact.full_name} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: theme.fontSize.base,
                      fontWeight: 500,
                      color: theme.text.primary,
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {associatedContact.full_name || associatedContact.email || 'Unknown Contact'}
                  </p>
                  {associatedContact.company && (
                    <p
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: theme.fontSize.sm,
                        color: theme.text.secondary,
                        margin: '4px 0 0 0',
                      }}
                    >
                      <Building2 size={14} style={{ color: theme.text.muted, flexShrink: 0 }} />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {associatedContact.company}
                      </span>
                    </p>
                  )}
                  {associatedContact.job_title && (
                    <p
                      style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.text.muted,
                        margin: '2px 0 0 0',
                      }}
                    >
                      {associatedContact.job_title}
                    </p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assignee */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: theme.fontSize.sm,
              fontWeight: 500,
              color: theme.text.secondary,
              marginBottom: 8,
            }}
          >
            <User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Assigned To
          </label>
          <input
            type="text"
            value={formData.assigned_to}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
            placeholder="Team member name"
            style={{
              width: '100%',
              height: 44,
              padding: '0 14px',
              fontSize: theme.fontSize.base,
              backgroundColor: theme.bg.card,
              color: theme.text.primary,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.lg,
              outline: 'none',
            }}
          />
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 14,
                backgroundColor: theme.status.errorBg,
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.status.error}`,
              }}
            >
              <AlertCircle size={18} style={{ color: theme.status.error, flexShrink: 0 }} />
              <p
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.status.error,
                  margin: 0,
                }}
              >
                {formError}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {showDeleteConfirm && task && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                padding: 16,
                backgroundColor: theme.status.errorBg,
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.status.error}`,
                overflow: 'hidden',
              }}
            >
              <p
                style={{
                  fontSize: theme.fontSize.sm,
                  color: theme.text.primary,
                  margin: 0,
                  marginBottom: 12,
                }}
              >
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="danger" size="sm" onClick={handleDelete} loading={loading}>
                  Yes, Delete Task
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ModalFooter>
        {task && !showDeleteConfirm && (
          <motion.div whileHover={{ scale: 1.02 }} style={{ marginRight: 'auto' }}>
            <Button
              variant="ghost"
              icon={<Trash2 size={16} />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </Button>
          </motion.div>
        )}
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={loading}
          disabled={!formData.text.trim()}
        >
          {task ? 'Save Changes' : 'Create Task'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
