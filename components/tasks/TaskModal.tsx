import { useState, useEffect, useCallback } from 'react'
import { Calendar, User, Trash2 } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Modal, ModalFooter, Button, Input, Select, Textarea } from '../shared'
import type { Task, TaskType } from '../../types'
import { TASK_TYPE_INFO } from '../../types'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
}

const TYPE_OPTIONS: { value: TaskType; label: string }[] = Object.entries(TASK_TYPE_INFO).map(
  ([value, info]) => ({ value: value as TaskType, label: info.label })
)

export function TaskModal({ isOpen, onClose, task }: TaskModalProps) {
  const { contacts, deals, createTask, updateTask, deleteTask, error } = useCRM()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    text: '',
    type: 'task' as TaskType,
    due_date: '',
    contact_id: '',
    deal_id: '',
    assigned_to: '',
  })
  
  // Build options with company name for better context
  const contactOptions = [
    { value: '', label: 'No contact' },
    ...contacts.map(c => ({ 
      value: c.id, 
      label: `${c.full_name || c.email || 'Unknown'}${c.company ? ` (${c.company})` : ''}` 
    }))
  ]
  
  const dealOptions = [
    { value: '', label: 'No deal' },
    ...deals.filter(d => d.stage !== 'closed' && d.stage !== 'lost').map(d => ({ value: d.id, label: d.name }))
  ]
  
  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        text: task.text || '',
        type: task.type || 'task',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        contact_id: task.contact_id || '',
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
        contact_id: '',
        deal_id: '',
        assigned_to: '',
      })
    }
    setShowDeleteConfirm(false)
    setFormError(null)
  }, [task, isOpen])
  
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
      const data = {
        text: formData.text,
        type: formData.type,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        contact_id: formData.contact_id || null,
        deal_id: formData.deal_id || null,
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
  }, [formData, task, updateTask, createTask, onClose, error])
  
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
      size="md"
      onKeyDown={handleKeyDown}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Task Text */}
        <Textarea
          label="Task Description *"
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
          placeholder="What needs to be done?"
          style={{ minHeight: 80 }}
        />
        
        {/* Type & Due Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select
            label="Type"
            options={TYPE_OPTIONS}
            value={formData.type}
            onChange={(v) => setFormData({ ...formData, type: v as TaskType })}
          />
          <Input
            label="Due Date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            type="date"
            icon={<Calendar size={14} />}
          />
        </div>
        
        {/* Related Records */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select
            label="Related Contact"
            options={contactOptions}
            value={formData.contact_id}
            onChange={(v) => setFormData({ ...formData, contact_id: v })}
          />
          <Select
            label="Related Deal"
            options={dealOptions}
            value={formData.deal_id}
            onChange={(v) => setFormData({ ...formData, deal_id: v })}
          />
        </div>
        
        {/* Assignee */}
        <Input
          label="Assigned To"
          value={formData.assigned_to}
          onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
          placeholder="Team member name"
          icon={<User size={14} />}
        />
        
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
      {showDeleteConfirm && task && (
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
            Are you sure you want to delete this task?
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
        {task && !showDeleteConfirm && (
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
        <Button onClick={handleSubmit} loading={loading} disabled={!formData.text.trim()}>
          {task ? 'Save Changes' : 'Create Task'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
