import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  CheckSquare, Plus, Calendar, AlertCircle,
  Phone, Mail, Users, Bell, RotateCcw, Check,
  DollarSign, ChevronDown, ChevronRight,
  LayoutList, FolderKanban,
  Clock, Filter, X, Search,
  User,
  Trash2, Edit3, CalendarClock
} from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Button, IconButton, EmptyState, LoadingSkeleton, Badge, Avatar } from '../shared'
import { TaskModal } from './TaskModal'
import type { Task, TaskType, Contact, Deal } from '../../types'
import { TASK_TYPE_INFO } from '../../types'

// ============================================
// TYPES
// ============================================
type ViewMode = 'list' | 'grouped'
type TaskFilter = 'all' | 'pending' | 'overdue' | 'today' | 'upcoming' | 'completed'
type GroupBy = 'contact' | 'deal' | 'type' | 'date'
type SortBy = 'due_date' | 'created_at' | 'type' | 'contact'

interface TaskGroup {
  id: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  tasks: Task[]
  color?: string
}

// ============================================
// CONSTANTS
// ============================================
const VIEW_MODES = [
  { key: 'list' as ViewMode, label: 'List', icon: LayoutList },
  { key: 'grouped' as ViewMode, label: 'Grouped', icon: FolderKanban },
]

const FILTERS: { key: TaskFilter; label: string; color?: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'overdue', label: 'Overdue', color: theme.status.error },
  { key: 'today', label: 'Today', color: theme.status.warning },
  { key: 'upcoming', label: 'Upcoming', color: theme.status.info },
  { key: 'completed', label: 'Completed', color: theme.status.success },
  { key: 'all', label: 'All' },
]

const GROUP_OPTIONS: { key: GroupBy; label: string; icon: React.ReactNode }[] = [
  { key: 'contact', label: 'By Contact', icon: <User size={14} /> },
  { key: 'deal', label: 'By Deal', icon: <DollarSign size={14} /> },
  { key: 'type', label: 'By Type', icon: <FolderKanban size={14} /> },
  { key: 'date', label: 'By Date', icon: <Calendar size={14} /> },
]

const TYPE_ICONS: Record<TaskType, LucideIcon> = {
  task: CheckSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
  follow_up: RotateCcw,
  reminder: Bell,
}

// ============================================
// ANIMATION VARIANTS
// ============================================
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.2 },
  },
}

const groupVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
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

  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getTaskUrgency(task: Task): 'overdue' | 'today' | 'upcoming' | 'none' {
  if (task.done) return 'none'
  if (!task.due_date) return 'none'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dueDate = new Date(task.due_date)

  if (dueDate < now) return 'overdue'
  if (dueDate >= today && dueDate < tomorrow) return 'today'
  if (dueDate >= tomorrow) return 'upcoming'
  return 'none'
}

function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'overdue': return theme.status.error
    case 'today': return theme.status.warning
    case 'upcoming': return theme.status.info
    default: return theme.text.muted
  }
}

function getUrgencyBg(urgency: string): string {
  switch (urgency) {
    case 'overdue': return theme.status.errorBg
    case 'today': return theme.status.warningBg
    case 'upcoming': return theme.status.infoBg
    default: return theme.bg.muted
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
export function TaskList() {
  const { tasks, contacts, deals, loading, toggleTask, deleteTask } = useCRM()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [filter, setFilter] = useState<TaskFilter>('pending')
  const [groupBy, setGroupBy] = useState<GroupBy>('date')
  const [sortBy] = useState<SortBy>('due_date')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showGroupMenu, setShowGroupMenu] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['overdue', 'today', 'upcoming']))
  const [quickAddVisible, setQuickAddVisible] = useState(false)
  const [quickAddText, setQuickAddText] = useState('')
  const quickAddRef = useRef<HTMLInputElement>(null)

  // Create contact and deal maps for efficient lookup
  const contactMap = useMemo(() => {
    const map = new Map<string, Contact>()
    contacts.forEach(c => map.set(c.id, c))
    return map
  }, [contacts])

  const dealMap = useMemo(() => {
    const map = new Map<string, Deal>()
    deals.forEach(d => map.set(d.id, d))
    return map
  }, [deals])

  // Enrich tasks with contact/deal data
  const enrichedTasks = useMemo(() => {
    return tasks.map(task => ({
      ...task,
      contact: task.contact_id ? contactMap.get(task.contact_id) : undefined,
      deal: task.deal_id ? dealMap.get(task.deal_id) : undefined,
    }))
  }, [tasks, contactMap, dealMap])

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    let filtered = enrichedTasks

    // Apply filter
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(t => !t.done)
        break
      case 'overdue':
        filtered = filtered.filter(t => !t.done && t.due_date && new Date(t.due_date) < now)
        break
      case 'today':
        filtered = filtered.filter(t => {
          if (!t.due_date) return false
          const dueDate = new Date(t.due_date)
          return dueDate >= today && dueDate < tomorrow
        })
        break
      case 'upcoming':
        filtered = filtered.filter(t => {
          if (!t.due_date || t.done) return false
          const dueDate = new Date(t.due_date)
          return dueDate >= tomorrow && dueDate < nextWeek
        })
        break
      case 'completed':
        filtered = filtered.filter(t => t.done)
        break
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.text.toLowerCase().includes(query) ||
        t.contact?.full_name?.toLowerCase().includes(query) ||
        t.contact?.company?.toLowerCase().includes(query) ||
        t.deal?.name?.toLowerCase().includes(query)
      )
    }

    // Sort
    return [...filtered].sort((a, b) => {
      // Completed tasks always last
      if (a.done !== b.done) return a.done ? 1 : -1

      switch (sortBy) {
        case 'due_date':
          if (!a.due_date && !b.due_date) return 0
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'type':
          return a.type.localeCompare(b.type)
        case 'contact':
          const aName = a.contact?.full_name || ''
          const bName = b.contact?.full_name || ''
          return aName.localeCompare(bName)
        default:
          return 0
      }
    })
  }, [enrichedTasks, filter, searchQuery, sortBy])

  // Group tasks
  const groupedTasks = useMemo((): TaskGroup[] => {
    if (viewMode !== 'grouped') return []

    const groups = new Map<string, TaskGroup>()

    filteredTasks.forEach(task => {
      let groupId: string
      let groupTitle: string
      let groupSubtitle: string | undefined
      let groupIcon: React.ReactNode | undefined
      let groupColor: string | undefined

      switch (groupBy) {
        case 'contact':
          if (task.contact) {
            groupId = task.contact.id
            groupTitle = task.contact.full_name || task.contact.email || 'Unknown'
            groupSubtitle = task.contact.company || undefined
            groupIcon = <Avatar name={task.contact.full_name} size="sm" />
          } else {
            groupId = 'no-contact'
            groupTitle = 'No Contact'
            groupIcon = <User size={20} style={{ color: theme.text.muted }} />
          }
          break

        case 'deal':
          if (task.deal) {
            groupId = task.deal.id
            groupTitle = task.deal.name
            groupSubtitle = task.deal.contact?.full_name || undefined
            groupIcon = <DollarSign size={20} style={{ color: theme.entity.deal }} />
            groupColor = theme.entity.deal
          } else {
            groupId = 'no-deal'
            groupTitle = 'No Deal'
            groupIcon = <DollarSign size={20} style={{ color: theme.text.muted }} />
          }
          break

        case 'type':
          const typeInfo = TASK_TYPE_INFO[task.type]
          groupId = task.type
          groupTitle = typeInfo.label
          const TypeIcon = TYPE_ICONS[task.type]
          groupIcon = <TypeIcon size={20} style={{ color: typeInfo.color }} />
          groupColor = typeInfo.color
          break

        case 'date':
        default:
          const urgency = getTaskUrgency(task)
          if (task.done) {
            groupId = 'completed'
            groupTitle = 'Completed'
            groupIcon = <Check size={20} style={{ color: theme.status.success }} />
            groupColor = theme.status.success
          } else if (urgency === 'overdue') {
            groupId = 'overdue'
            groupTitle = 'Overdue'
            groupIcon = <AlertCircle size={20} style={{ color: theme.status.error }} />
            groupColor = theme.status.error
          } else if (urgency === 'today') {
            groupId = 'today'
            groupTitle = 'Today'
            groupIcon = <Clock size={20} style={{ color: theme.status.warning }} />
            groupColor = theme.status.warning
          } else if (urgency === 'upcoming') {
            groupId = 'upcoming'
            groupTitle = 'Upcoming'
            groupIcon = <Calendar size={20} style={{ color: theme.status.info }} />
            groupColor = theme.status.info
          } else {
            groupId = 'no-date'
            groupTitle = 'No Due Date'
            groupIcon = <CalendarClock size={20} style={{ color: theme.text.muted }} />
          }
          break
      }

      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          title: groupTitle,
          subtitle: groupSubtitle,
          icon: groupIcon,
          tasks: [],
          color: groupColor,
        })
      }
      groups.get(groupId)!.tasks.push(task)
    })

    // Sort groups
    const sortedGroups = Array.from(groups.values())
    if (groupBy === 'date') {
      const order = ['overdue', 'today', 'upcoming', 'no-date', 'completed']
      sortedGroups.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    } else {
      sortedGroups.sort((a, b) => b.tasks.length - a.tasks.length)
    }

    return sortedGroups
  }, [filteredTasks, viewMode, groupBy])

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return {
      total: tasks.length,
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

  // Handlers
  const handleOpenTask = useCallback((task: Task) => {
    setSelectedTask(task)
    setIsCreating(false)
    setIsModalOpen(true)
  }, [])

  const handleCreateTask = useCallback(() => {
    setSelectedTask(null)
    setIsCreating(true)
    setIsModalOpen(true)
  }, [])

  const handleToggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  // Get createTask from context
  const { createTask } = useCRM()

  const handleQuickAdd = useCallback(async () => {
    if (!quickAddText.trim()) return

    // Quick add creates a task due today
    await createTask({
      text: quickAddText.trim(),
      type: 'task',
      due_date: new Date().toISOString(),
    })

    setQuickAddText('')
    setQuickAddVisible(false)
  }, [quickAddText, createTask])

  // Focus quick add input when visible
  useEffect(() => {
    if (quickAddVisible && quickAddRef.current) {
      quickAddRef.current.focus()
    }
  }, [quickAddVisible])

  // Loading state
  if (loading.tasks) {
    return (
      <div style={{ padding: 24 }}>
        <LoadingSkeleton rows={8} />
      </div>
    )
  }

  return (
    <LayoutGroup>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          padding: 24,
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          {/* Title and Stats */}
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: theme.text.primary,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <CheckSquare size={28} style={{ color: theme.entity.task }} />
              </motion.div>
              Tasks
            </h1>

            {/* Quick Stats */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginTop: 8,
              }}
            >
              <span style={{ color: theme.text.secondary, fontSize: theme.fontSize.sm }}>
                {stats.pending} pending
              </span>
              {stats.overdue > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: theme.status.error,
                    fontSize: theme.fontSize.sm,
                    fontWeight: 600,
                  }}
                >
                  <AlertCircle size={14} />
                  {stats.overdue} overdue
                </motion.span>
              )}
              {stats.today > 0 && (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: theme.status.warning,
                    fontSize: theme.fontSize.sm,
                  }}
                >
                  <Clock size={14} />
                  {stats.today} due today
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Search */}
            <div style={{ position: 'relative', width: 240 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: theme.text.muted,
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px 0 40px',
                  fontSize: theme.fontSize.sm,
                  backgroundColor: theme.bg.card,
                  color: theme.text.primary,
                  border: `1px solid ${theme.border.default}`,
                  borderRadius: theme.radius.lg,
                  outline: 'none',
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
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: 4,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: theme.text.muted,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: theme.radius.sm,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Add Task Button */}
            <Button
              icon={<Plus size={18} />}
              onClick={handleCreateTask}
            >
              Add Task
            </Button>
          </div>
        </motion.div>

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* View Mode Tabs */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: 4,
              backgroundColor: theme.bg.card,
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.border.subtle}`,
            }}
          >
            {VIEW_MODES.map(({ key, label, icon: Icon }) => (
              <motion.button
                key={key}
                onClick={() => setViewMode(key)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  backgroundColor: viewMode === key ? theme.bg.elevated : 'transparent',
                  color: viewMode === key ? theme.text.primary : theme.text.muted,
                  border: 'none',
                  borderRadius: theme.radius.md,
                  fontSize: theme.fontSize.sm,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: `all ${theme.transition.fast}`,
                }}
              >
                <Icon size={16} />
                {label}
              </motion.button>
            ))}
          </div>

          {/* Filters and Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Filter Dropdown */}
            <div style={{ position: 'relative' }}>
              <motion.button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  backgroundColor: theme.bg.card,
                  color: theme.text.secondary,
                  border: `1px solid ${theme.border.default}`,
                  borderRadius: theme.radius.lg,
                  fontSize: theme.fontSize.sm,
                  cursor: 'pointer',
                }}
              >
                <Filter size={14} />
                {FILTERS.find(f => f.key === filter)?.label}
                <ChevronDown size={14} />
              </motion.button>

              <AnimatePresence>
                {showFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      backgroundColor: theme.bg.elevated,
                      border: `1px solid ${theme.border.default}`,
                      borderRadius: theme.radius.lg,
                      padding: 4,
                      minWidth: 160,
                      zIndex: theme.z.dropdown,
                      boxShadow: theme.shadow.dropdown,
                    }}
                  >
                    {FILTERS.map(({ key, label, color }) => (
                      <motion.button
                        key={key}
                        onClick={() => {
                          setFilter(key)
                          setShowFilterMenu(false)
                        }}
                        whileHover={{ backgroundColor: theme.bg.hover }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: filter === key ? theme.bg.active : 'transparent',
                          color: color || theme.text.primary,
                          border: 'none',
                          borderRadius: theme.radius.md,
                          fontSize: theme.fontSize.sm,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {filter === key && <Check size={14} />}
                        {label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Group By (only for grouped view) */}
            {viewMode === 'grouped' && (
              <div style={{ position: 'relative' }}>
                <motion.button
                  onClick={() => setShowGroupMenu(!showGroupMenu)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    backgroundColor: theme.bg.card,
                    color: theme.text.secondary,
                    border: `1px solid ${theme.border.default}`,
                    borderRadius: theme.radius.lg,
                    fontSize: theme.fontSize.sm,
                    cursor: 'pointer',
                  }}
                >
                  <FolderKanban size={14} />
                  {GROUP_OPTIONS.find(g => g.key === groupBy)?.label}
                  <ChevronDown size={14} />
                </motion.button>

                <AnimatePresence>
                  {showGroupMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        backgroundColor: theme.bg.elevated,
                        border: `1px solid ${theme.border.default}`,
                        borderRadius: theme.radius.lg,
                        padding: 4,
                        minWidth: 160,
                        zIndex: theme.z.dropdown,
                        boxShadow: theme.shadow.dropdown,
                      }}
                    >
                      {GROUP_OPTIONS.map(({ key, label, icon }) => (
                        <motion.button
                          key={key}
                          onClick={() => {
                            setGroupBy(key)
                            setShowGroupMenu(false)
                          }}
                          whileHover={{ backgroundColor: theme.bg.hover }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: groupBy === key ? theme.bg.active : 'transparent',
                            color: theme.text.primary,
                            border: 'none',
                            borderRadius: theme.radius.md,
                            fontSize: theme.fontSize.sm,
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          {icon}
                          {label}
                          {groupBy === key && <Check size={14} style={{ marginLeft: 'auto' }} />}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Add Bar */}
        <AnimatePresence>
          {quickAddVisible && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginBottom: 16,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  backgroundColor: theme.bg.card,
                  borderRadius: theme.radius.xl,
                  border: `1px solid ${theme.accent.primary}`,
                }}
              >
                <Plus size={20} style={{ color: theme.accent.primary, flexShrink: 0 }} />
                <input
                  ref={quickAddRef}
                  type="text"
                  value={quickAddText}
                  onChange={(e) => setQuickAddText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickAdd()
                    if (e.key === 'Escape') setQuickAddVisible(false)
                  }}
                  placeholder="Quick add task (press Enter to save, Esc to cancel)..."
                  style={{
                    flex: 1,
                    padding: 0,
                    fontSize: theme.fontSize.base,
                    backgroundColor: 'transparent',
                    color: theme.text.primary,
                    border: 'none',
                    outline: 'none',
                  }}
                />
                <Button size="sm" onClick={handleQuickAdd} disabled={!quickAddText.trim()}>
                  Add
                </Button>
                <IconButton
                  icon={<X size={16} />}
                  label="Cancel"
                  onClick={() => setQuickAddVisible(false)}
                  size="sm"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <AnimatePresence mode="wait">
          {filteredTasks.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <EmptyState
                icon={<CheckSquare size={40} />}
                title={searchQuery ? 'No tasks found' : filter === 'completed' ? 'No completed tasks' : 'No tasks yet'}
                description={
                  searchQuery
                    ? 'Try adjusting your search terms'
                    : filter === 'overdue'
                    ? 'Great job! You have no overdue tasks.'
                    : 'Create your first task to stay organized and never miss a follow-up.'
                }
                action={
                  !searchQuery
                    ? { label: 'Add Task', onClick: handleCreateTask, icon: <Plus size={16} /> }
                    : undefined
                }
              />
            </motion.div>
          ) : viewMode === 'list' ? (
            <motion.div
              key="list"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => handleOpenTask(task)}
                    onToggle={() => toggleTask(task.id)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="grouped"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {groupedTasks.map((group) => (
                <TaskGroupCard
                  key={group.id}
                  group={group}
                  expanded={expandedGroups.has(group.id)}
                  onToggle={() => handleToggleGroup(group.id)}
                  onTaskClick={handleOpenTask}
                  onTaskToggle={toggleTask}
                  onTaskDelete={deleteTask}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Quick Add Button */}
        {!quickAddVisible && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1, boxShadow: '0 0 30px rgba(17, 119, 84, 0.4)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setQuickAddVisible(true)}
            style={{
              position: 'fixed',
              bottom: 32,
              right: 32,
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: theme.accent.primary,
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(17, 119, 84, 0.3)',
              zIndex: 100,
            }}
          >
            <Plus size={24} />
          </motion.button>
        )}

        {/* Task Modal */}
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          task={isCreating ? null : selectedTask}
        />
      </motion.div>
    </LayoutGroup>
  )
}

// ============================================
// TASK CARD COMPONENT
// ============================================
interface TaskCardProps {
  task: Task & { contact?: Contact; deal?: Deal }
  onClick: () => void
  onToggle: () => void
  onDelete: () => void
  compact?: boolean
}

function TaskCard({ task, onClick, onToggle, onDelete, compact = false }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const urgency = getTaskUrgency(task)
  const typeInfo = TASK_TYPE_INFO[task.type]
  const TypeIcon = TYPE_ICONS[task.type]

  return (
    <motion.div
      layout
      variants={itemVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{
        scale: 1.01,
        boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)',
      }}
      whileTap={{ scale: 0.99 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 10 : 14,
        padding: compact ? '10px 14px' : '14px 18px',
        backgroundColor: theme.bg.card,
        borderRadius: theme.radius.xl,
        border: `1px solid ${isHovered ? 'rgba(255, 255, 255, 0.15)' : theme.border.subtle}`,
        cursor: 'pointer',
        opacity: task.done ? 0.6 : 1,
        transition: `all ${theme.transition.fast}`,
      }}
    >
      {/* Checkbox */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: compact ? 20 : 24,
          height: compact ? 20 : 24,
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
        <AnimatePresence>
          {task.done && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Check size={compact ? 12 : 14} style={{ color: 'white' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Type Icon */}
      {!compact && (
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: theme.radius.lg,
            backgroundColor: `${typeInfo.color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <TypeIcon size={18} style={{ color: typeInfo.color }} />
        </motion.div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: compact ? theme.fontSize.sm : theme.fontSize.base,
            fontWeight: 500,
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

        {/* Meta Info */}
        {!compact && (task.contact || task.deal) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 6,
              flexWrap: 'wrap',
            }}
          >
            {task.contact && (
              <motion.span
                whileHover={{ scale: 1.02 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: theme.fontSize.sm,
                  color: theme.text.secondary,
                }}
              >
                <Avatar name={task.contact.full_name} size="xs" />
                {task.contact.full_name || task.contact.email}
                {task.contact.company && (
                  <span style={{ color: theme.text.muted }}>
                    at {task.contact.company}
                  </span>
                )}
              </motion.span>
            )}
            {task.deal && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: theme.fontSize.sm,
                  color: theme.entity.deal,
                }}
              >
                <DollarSign size={14} />
                {task.deal.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Due Date Badge */}
      {task.due_date && (
        <motion.div
          whileHover={{ scale: 1.05 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: compact ? '4px 8px' : '6px 12px',
            borderRadius: theme.radius.full,
            backgroundColor: getUrgencyBg(urgency),
            color: getUrgencyColor(urgency),
            fontSize: theme.fontSize.sm,
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {urgency === 'overdue' && <AlertCircle size={14} />}
          {urgency === 'today' && <Clock size={14} />}
          <Calendar size={14} />
          {formatDueDate(task.due_date)}
        </motion.div>
      )}

      {/* Actions */}
      <AnimatePresence>
        {isHovered && !compact && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            style={{ display: 'flex', gap: 4 }}
          >
            <IconButton
              icon={<Edit3 size={14} />}
              label="Edit"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
            />
            <IconButton
              icon={<Trash2 size={14} />}
              label="Delete"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================
// TASK GROUP CARD COMPONENT
// ============================================
interface TaskGroupCardProps {
  group: TaskGroup
  expanded: boolean
  onToggle: () => void
  onTaskClick: (task: Task) => void
  onTaskToggle: (id: string) => void
  onTaskDelete: (id: string) => void
}

function TaskGroupCard({
  group,
  expanded,
  onToggle,
  onTaskClick,
  onTaskToggle,
  onTaskDelete,
}: TaskGroupCardProps) {
  return (
    <motion.div
      variants={groupVariants}
      initial="hidden"
      animate="show"
      style={{
        backgroundColor: theme.bg.card,
        borderRadius: theme.radius.xl,
        border: `1px solid ${theme.border.subtle}`,
        overflow: 'hidden',
      }}
    >
      {/* Group Header */}
      <motion.button
        onClick={onToggle}
        whileHover={{ backgroundColor: theme.bg.hover }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '16px 20px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <motion.div
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight size={18} style={{ color: theme.text.muted }} />
        </motion.div>

        {group.icon}

        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: theme.fontSize.base,
              fontWeight: 600,
              color: group.color || theme.text.primary,
              margin: 0,
            }}
          >
            {group.title}
          </h3>
          {group.subtitle && (
            <p
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.text.muted,
                margin: '2px 0 0 0',
              }}
            >
              {group.subtitle}
            </p>
          )}
        </div>

        <Badge color={group.color || theme.text.secondary} bgColor={theme.bg.muted}>
          {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
        </Badge>
      </motion.button>

      {/* Tasks */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0 12px 12px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {group.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onToggle={() => onTaskToggle(task.id)}
                  onDelete={() => onTaskDelete(task.id)}
                  compact
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

