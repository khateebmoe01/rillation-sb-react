import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckSquare, Plus, Calendar, AlertCircle, 
  Phone, Mail, Users, Bell, RotateCcw, Check,
  DollarSign
} from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Card, Button, SearchInput, EmptyState, LoadingSkeleton } from '../shared'
import { TaskModal } from './TaskModal'
import type { Task } from '../../types'
import { TASK_TYPE_INFO } from '../../types'

type TaskFilter = 'all' | 'pending' | 'overdue' | 'today' | 'completed'

export function TaskList() {
  const { tasks, loading, toggleTask } = useCRM()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<TaskFilter>('pending')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Filter tasks
  const filteredTasks = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    let filtered = tasks
    
    // Apply filter
    switch (filter) {
      case 'pending':
        filtered = tasks.filter(t => !t.done)
        break
      case 'overdue':
        filtered = tasks.filter(t => !t.done && t.due_date && new Date(t.due_date) < now)
        break
      case 'today':
        filtered = tasks.filter(t => {
          if (!t.due_date) return false
          const dueDate = new Date(t.due_date)
          return dueDate >= today && dueDate < tomorrow
        })
        break
      case 'completed':
        filtered = tasks.filter(t => t.done)
        break
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => 
        t.text.toLowerCase().includes(query) ||
        t.contact?.full_name?.toLowerCase().includes(query) ||
        t.deal?.name?.toLowerCase().includes(query)
      )
    }
    
    // Sort: overdue first, then by due date
    return filtered.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  }, [tasks, filter, searchQuery])
  
  // Count stats
  const stats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    return {
      all: tasks.length,
      pending: tasks.filter(t => !t.done).length,
      overdue: tasks.filter(t => !t.done && t.due_date && new Date(t.due_date) < now).length,
      today: tasks.filter(t => {
        if (!t.due_date) return false
        const dueDate = new Date(t.due_date)
        return dueDate >= today && dueDate < tomorrow
      }).length,
      completed: tasks.filter(t => t.done).length,
    }
  }, [tasks])
  
  const handleOpenTask = (task: Task) => {
    setSelectedTask(task)
    setIsCreating(false)
    setIsModalOpen(true)
  }
  
  const handleCreateTask = () => {
    setSelectedTask(null)
    setIsCreating(true)
    setIsModalOpen(true)
  }
  
  if (loading.tasks) {
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
            <CheckSquare size={24} style={{ color: theme.entity.task }} />
            Tasks
          </h1>
          <p
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.text.muted,
              margin: '4px 0 0 0',
            }}
          >
            {stats.pending} pending • {stats.overdue > 0 && (
              <span style={{ color: theme.status.error }}>{stats.overdue} overdue</span>
            )}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search tasks..."
            style={{ width: 240 }}
          />
          <Button
            icon={<Plus size={16} />}
            onClick={handleCreateTask}
          >
            Add Task
          </Button>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 20,
          padding: 4,
          backgroundColor: theme.bg.card,
          borderRadius: theme.radius.lg,
          width: 'fit-content',
        }}
      >
        {[
          { key: 'pending' as TaskFilter, label: 'Pending', count: stats.pending },
          { key: 'today' as TaskFilter, label: 'Today', count: stats.today },
          { key: 'overdue' as TaskFilter, label: 'Overdue', count: stats.overdue, alert: stats.overdue > 0 },
          { key: 'completed' as TaskFilter, label: 'Completed', count: stats.completed },
          { key: 'all' as TaskFilter, label: 'All', count: stats.all },
        ].map(({ key, label, count, alert }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: filter === key ? theme.bg.elevated : 'transparent',
              color: filter === key ? theme.text.primary : theme.text.muted,
              border: 'none',
              borderRadius: theme.radius.md,
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              cursor: 'pointer',
              transition: `all ${theme.transition.fast}`,
            }}
          >
            {label}
            <span
              style={{
                fontSize: theme.fontSize.xs,
                padding: '2px 6px',
                borderRadius: theme.radius.full,
                backgroundColor: alert ? theme.status.errorBg : theme.bg.muted,
                color: alert ? theme.status.error : theme.text.muted,
              }}
            >
              {count}
            </span>
          </button>
        ))}
      </div>
      
      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={32} />}
          title={searchQuery ? 'No tasks found' : filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
          description={
            searchQuery
              ? 'Try adjusting your search terms'
              : 'Create your first task to stay organized'
          }
          action={
            !searchQuery
              ? { label: 'Add Task', onClick: handleCreateTask, icon: <Plus size={16} /> }
              : undefined
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: index * 0.02 }}
                layout
              >
                <TaskRow
                  task={task}
                  onClick={() => handleOpenTask(task)}
                  onToggle={() => toggleTask(task.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      
      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={isCreating ? null : selectedTask}
      />
    </div>
  )
}

// Task Row
interface TaskRowProps {
  task: Task
  onClick: () => void
  onToggle: () => void
}

function TaskRow({ task, onClick, onToggle }: TaskRowProps) {
  const [, setIsHovered] = useState(false)
  
  const now = new Date()
  const isOverdue = !task.done && task.due_date && new Date(task.due_date) < now
  
  const typeInfo = TASK_TYPE_INFO[task.type]
  const TypeIcon = {
    task: CheckSquare,
    call: Phone,
    email: Mail,
    meeting: Users,
    follow_up: RotateCcw,
    reminder: Bell,
  }[task.type]
  
  return (
    <Card
      padding="none"
      hover
      onClick={onClick}
      style={{
        opacity: task.done ? 0.6 : 1,
      }}
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
        }}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          style={{
            width: 22,
            height: 22,
            borderRadius: theme.radius.md,
            border: `2px solid ${task.done ? theme.status.success : theme.border.strong}`,
            backgroundColor: task.done ? theme.status.success : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: `all ${theme.transition.fast}`,
          }}
        >
          {task.done && <Check size={14} style={{ color: 'white' }} />}
        </button>
        
        {/* Type Icon */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: theme.radius.md,
            backgroundColor: `${typeInfo.color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <TypeIcon size={16} style={{ color: typeInfo.color }} />
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: theme.fontSize.base,
              fontWeight: theme.fontWeight.medium,
              color: theme.text.primary,
              margin: 0,
              textDecoration: task.done ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.text}
          </p>
          
          {/* Related items */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            {task.contact && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: theme.fontSize.sm,
                  color: theme.text.muted,
                }}
              >
                <Users size={12} />
                {task.contact.full_name}
              </span>
            )}
            {task.deal && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: theme.fontSize.sm,
                  color: theme.text.muted,
                }}
              >
                <DollarSign size={12} />
                {task.deal.name}
              </span>
            )}
          </div>
        </div>
        
        {/* Due Date */}
        {task.due_date && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: theme.radius.full,
              backgroundColor: isOverdue ? theme.status.errorBg : theme.bg.muted,
              color: isOverdue ? theme.status.error : theme.text.muted,
              fontSize: theme.fontSize.sm,
            }}
          >
            {isOverdue && <AlertCircle size={12} />}
            <Calendar size={12} />
            {formatDueDate(task.due_date)}
          </div>
        )}
      </div>
    </Card>
  )
}

// Format due date
function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date >= today && date < tomorrow) return 'Today'
  if (date >= tomorrow && date < new Date(tomorrow.getTime() + 86400000)) return 'Tomorrow'
  if (date >= yesterday && date < today) return 'Yesterday'
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
