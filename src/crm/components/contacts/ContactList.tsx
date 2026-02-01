import { useState, useMemo, useRef, useEffect, useId, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Users, Plus, Mail, Phone, Building2, Linkedin, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Check, Filter, X, Trash2, GripVertical, User, Briefcase, Tag, Clock, Factory, MapPin, DollarSign, Calendar, AtSign, Hash, TrendingUp, Columns } from 'lucide-react'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { useDropdown } from '../../../contexts/DropdownContext'
import { Card, SearchInput, EmptyState, LoadingSkeleton, StageDropdown, FilterSelect } from '../shared'
import { ContactModal } from './ContactModal'
import { SortDropdown, type SortRule } from './SortDropdown'
import type { Contact } from '../../types'

// Filter field definitions with icons - matching Contact type from engaged_leads
const FILTER_FIELDS = [
  // Personal Info
  { key: 'full_name', label: 'Lead Name', type: 'text', icon: User },
  { key: 'email', label: 'Email', type: 'text', icon: AtSign },
  { key: 'job_title', label: 'Job Title', type: 'text', icon: Briefcase },
  { key: 'seniority_level', label: 'Seniority Level', type: 'text', icon: Hash },
  { key: 'lead_phone', label: 'Phone', type: 'text', icon: Phone },
  // Company Info
  { key: 'company', label: 'Organization', type: 'text', icon: Building2 },
  { key: 'company_domain', label: 'Company Domain', type: 'text', icon: Building2 },
  { key: 'company_size', label: 'Company Size', type: 'text', icon: Building2 },
  { key: 'industry', label: 'Industry', type: 'text', icon: Factory },
  { key: 'annual_revenue', label: 'Annual Revenue', type: 'text', icon: DollarSign },
  { key: 'company_hq_city', label: 'HQ City', type: 'text', icon: MapPin },
  { key: 'company_hq_state', label: 'HQ State', type: 'text', icon: MapPin },
  { key: 'company_hq_country', label: 'HQ Country', type: 'text', icon: MapPin },
  { key: 'business_model', label: 'Business Model', type: 'text', icon: Building2 },
  { key: 'funding_stage', label: 'Funding Stage', type: 'text', icon: DollarSign },
  { key: 'is_hiring', label: 'Is Hiring', type: 'select', icon: TrendingUp, options: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ]},
  // Pipeline & Status
  { key: 'stage', label: 'Stage', type: 'select', icon: Tag, options: [
    { value: 'new', label: 'New' },
    { value: 'engaged', label: 'Engaged' },
    { value: 'meeting_booked', label: 'Meeting Booked' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'demo', label: 'Demo' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'closed', label: 'Closed Won' },
  ]},
  { key: 'meeting_booked', label: 'Meeting Booked', type: 'select', icon: Calendar, options: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ]},
  { key: 'qualified', label: 'Qualified', type: 'select', icon: Check, options: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ]},
  { key: 'closed', label: 'Closed Won', type: 'select', icon: Check, options: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ]},
  // Sales & Pipeline
  { key: 'epv', label: 'EPV', type: 'text', icon: DollarSign },
  { key: 'assignee', label: 'Assignee', type: 'text', icon: User },
  // Campaign Info
  { key: 'campaign_name', label: 'Campaign Name', type: 'text', icon: Tag },
  { key: 'lead_source', label: 'Lead Source', type: 'text', icon: Tag },
  // Dates
  { key: 'last_activity', label: 'Last Activity', type: 'select', icon: Clock, options: [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
  ]},
  { key: 'created_at', label: 'Created Date', type: 'select', icon: Calendar, options: [
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
  ]},
] as const

// Operator definitions per field type
const TEXT_OPERATORS = [
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'equals', label: 'is' },
  { value: 'not_equals', label: 'is not' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
] as const

const SELECT_OPERATORS = [
  { value: 'has_any_of', label: 'has any of' },
  { value: 'has_none_of', label: 'has none of' },
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
] as const

interface StackedFilter {
  id: string
  field: string
  operator: string
  value: string
  conjunction: 'and' | 'or' // How this filter connects to the previous one
  groupId?: string // Optional group ID for OR conditions
}

interface FilterGroup {
  id: string
  type: 'and' | 'or'
}

// Format relative time like "2d ago" or "Jan 21"
function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    // For older dates, show "Jan 21" format
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

// Sortable column item component for drag-and-drop reordering
interface SortableColumnItemProps {
  id: string
  label: string
  isVisible: boolean
  isProtected: boolean
  onToggle: () => void
  theme: typeof import('../../config/theme').theme
}

function SortableColumnItem({ id, label, isVisible, isProtected, onToggle, theme }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Handle checkbox click without triggering drag
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isProtected) {
      onToggle()
    }
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '6px 8px',
        borderRadius: theme.radius.md,
        border: 'none',
        background: isDragging ? theme.bg.hover : 'transparent',
        gap: 8,
        marginBottom: 2,
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      {/* Drag handle icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.text.muted,
          padding: 2,
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        <GripVertical size={14} />
      </div>

      {/* Checkbox - clickable without dragging */}
      <div
        onClick={handleCheckboxClick}
        style={{
          width: 16,
          height: 16,
          borderRadius: 3,
          border: isVisible ? 'none' : `2px solid ${theme.border.default}`,
          backgroundColor: isVisible ? theme.accent.primary : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: isProtected ? 'not-allowed' : 'pointer',
          opacity: isProtected ? 0.6 : 1,
        }}
      >
        {isVisible && <Check size={10} color="#fff" strokeWidth={3} />}
      </div>

      {/* Label */}
      <span
        style={{
          flex: 1,
          textAlign: 'left',
          fontSize: 13,
          color: isVisible ? theme.text.primary : theme.text.muted,
          fontWeight: isVisible ? 500 : 400,
          opacity: isProtected ? 0.6 : 1,
        }}
      >
        {label}
      </span>

      {/* Protected indicator */}
      {isProtected && (
        <span
          style={{
            fontSize: 10,
            color: theme.text.muted,
            flexShrink: 0,
            padding: '1px 4px',
            backgroundColor: theme.bg.hover,
            borderRadius: 3,
          }}
        >
          Required
        </span>
      )}
    </div>
  )
}

export function ContactList() {
  const { contacts, loading, updateContact } = useCRM()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  
  // Handle contactId URL parameter to open specific contact
  useEffect(() => {
    const contactId = searchParams.get('contactId')
    if (contactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === contactId)
      if (contact) {
        setSelectedContact(contact)
        setIsModalOpen(true)
        // Remove the parameter from URL
        searchParams.delete('contactId')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [searchParams, setSearchParams, contacts])
  
  // Stacked filter states
  const [filters, setFilters] = useState<StackedFilter[]>([])
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const filterPopoverRef = useRef<HTMLDivElement>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Column visibility state
  const [showColumnsMenu, setShowColumnsMenu] = useState(false)
  const columnsPopoverRef = useRef<HTMLDivElement>(null)

  // Protected columns that cannot be hidden
  const PROTECTED_COLUMNS = ['name', 'company']

  // All available column definitions with categories (like AG Grid)
  // Define this FIRST so other hooks can reference it
  const ALL_COLUMN_DEFS = useMemo(() => [
    // Core columns (always shown in table by default)
    { key: 'name', label: 'Name', defaultWidth: 165, minWidth: 90, category: 'Core', defaultVisible: true },
    { key: 'company', label: 'Company', defaultWidth: 145, minWidth: 90, category: 'Core', defaultVisible: true },
    { key: 'stage', label: 'Stage', defaultWidth: 130, minWidth: 90, category: 'Core', defaultVisible: true },
    { key: 'pipeline', label: 'Pipeline', defaultWidth: 130, minWidth: 90, category: 'Core', defaultVisible: true },
    { key: 'title', label: 'Title', defaultWidth: 165, minWidth: 70, category: 'Core', defaultVisible: true },
    { key: 'lastActivity', label: 'Last Activity', defaultWidth: 110, minWidth: 70, category: 'Core', defaultVisible: true },
    { key: 'actions', label: 'Actions', defaultWidth: 90, minWidth: 70, category: 'Core', defaultVisible: true },

    // Personal Info
    { key: 'email', label: 'Email', defaultWidth: 200, minWidth: 120, category: 'Personal', defaultVisible: false },
    { key: 'phone', label: 'Phone', defaultWidth: 130, minWidth: 90, category: 'Personal', defaultVisible: false },
    { key: 'seniority', label: 'Seniority', defaultWidth: 120, minWidth: 80, category: 'Personal', defaultVisible: false },
    { key: 'linkedin', label: 'LinkedIn', defaultWidth: 100, minWidth: 80, category: 'Personal', defaultVisible: false },

    // Company Info
    { key: 'domain', label: 'Domain', defaultWidth: 150, minWidth: 100, category: 'Company', defaultVisible: false },
    { key: 'companySize', label: 'Company Size', defaultWidth: 120, minWidth: 90, category: 'Company', defaultVisible: false },
    { key: 'industry', label: 'Industry', defaultWidth: 140, minWidth: 100, category: 'Company', defaultVisible: false },
    { key: 'revenue', label: 'Annual Revenue', defaultWidth: 130, minWidth: 100, category: 'Company', defaultVisible: false },
    { key: 'hqCity', label: 'HQ City', defaultWidth: 120, minWidth: 80, category: 'Company', defaultVisible: false },
    { key: 'hqState', label: 'HQ State', defaultWidth: 100, minWidth: 70, category: 'Company', defaultVisible: false },
    { key: 'hqCountry', label: 'HQ Country', defaultWidth: 110, minWidth: 80, category: 'Company', defaultVisible: false },
    { key: 'yearFounded', label: 'Year Founded', defaultWidth: 110, minWidth: 80, category: 'Company', defaultVisible: false },
    { key: 'businessModel', label: 'Business Model', defaultWidth: 130, minWidth: 100, category: 'Company', defaultVisible: false },
    { key: 'fundingStage', label: 'Funding Stage', defaultWidth: 120, minWidth: 90, category: 'Company', defaultVisible: false },
    { key: 'isHiring', label: 'Is Hiring', defaultWidth: 90, minWidth: 70, category: 'Company', defaultVisible: false },

    // Campaign & Source
    { key: 'campaignName', label: 'Campaign', defaultWidth: 150, minWidth: 100, category: 'Campaign', defaultVisible: false },
    { key: 'leadSource', label: 'Lead Source', defaultWidth: 120, minWidth: 90, category: 'Campaign', defaultVisible: false },

    // Sales & Pipeline
    { key: 'epv', label: 'EPV', defaultWidth: 100, minWidth: 70, category: 'Sales', defaultVisible: false },
    { key: 'assignee', label: 'Assignee', defaultWidth: 120, minWidth: 90, category: 'Sales', defaultVisible: false },
    { key: 'nextTouchpoint', label: 'Next Touchpoint', defaultWidth: 130, minWidth: 100, category: 'Sales', defaultVisible: false },

    // Dates
    { key: 'createdAt', label: 'Created Date', defaultWidth: 120, minWidth: 90, category: 'Dates', defaultVisible: false },
    { key: 'meetingDate', label: 'Meeting Date', defaultWidth: 120, minWidth: 90, category: 'Dates', defaultVisible: false },
  ], [])

  // For the table, we use COLUMN_DEFS which is the same as ALL_COLUMN_DEFS
  const COLUMN_DEFS = ALL_COLUMN_DEFS


  // Load column visibility from localStorage
  const loadColumnVisibility = useCallback(() => {
    try {
      const saved = localStorage.getItem('crm-contacts-column-visibility')
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>
        // Merge with defaults for any new columns
        const merged: Record<string, boolean> = {}
        ALL_COLUMN_DEFS.forEach(col => {
          merged[col.key] = parsed[col.key] !== undefined ? parsed[col.key] : col.defaultVisible
        })
        return merged
      }
    } catch (e) {
      console.warn('Failed to load column visibility:', e)
    }
    // Default: use defaultVisible from column definitions
    const defaults: Record<string, boolean> = {}
    ALL_COLUMN_DEFS.forEach(col => {
      defaults[col.key] = col.defaultVisible
    })
    return defaults
  }, [ALL_COLUMN_DEFS])

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(loadColumnVisibility)

  // Save column visibility to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('crm-contacts-column-visibility', JSON.stringify(columnVisibility))
    } catch (e) {
      console.warn('Failed to save column visibility:', e)
    }
  }, [columnVisibility])

  // Column order state - determines display order in both dropdown and grid
  const loadColumnOrder = useCallback(() => {
    try {
      const saved = localStorage.getItem('crm-contacts-column-order')
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        // Ensure all columns are included, adding any new ones at the end
        const existingKeys = new Set(parsed)
        const allKeys = ALL_COLUMN_DEFS.map(c => c.key)
        const missingKeys = allKeys.filter(k => !existingKeys.has(k))
        return [...parsed.filter(k => allKeys.includes(k)), ...missingKeys]
      }
    } catch (e) {
      console.warn('Failed to load column order:', e)
    }
    return ALL_COLUMN_DEFS.map(c => c.key)
  }, [ALL_COLUMN_DEFS])

  const [columnOrder, setColumnOrder] = useState<string[]>(loadColumnOrder)

  // Save column order to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('crm-contacts-column-order', JSON.stringify(columnOrder))
    } catch (e) {
      console.warn('Failed to save column order:', e)
    }
  }, [columnOrder])

  // DnD sensors for column reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  // Handle drag end for column reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setColumnOrder(items => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    if (PROTECTED_COLUMNS.includes(columnKey)) return
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }))
  }

  // Show all columns
  const showAllColumns = () => {
    const allVisible: Record<string, boolean> = {}
    ALL_COLUMN_DEFS.forEach(col => {
      allVisible[col.key] = true
    })
    setColumnVisibility(allVisible)
  }

  // Hide all hideable columns (keep only protected)
  const hideAllColumns = () => {
    const allHidden: Record<string, boolean> = {}
    ALL_COLUMN_DEFS.forEach(col => {
      allHidden[col.key] = PROTECTED_COLUMNS.includes(col.key)
    })
    setColumnVisibility(allHidden)
  }

  // Count hidden columns
  const hiddenColumnCount = Object.entries(columnVisibility).filter(([key, visible]) => !visible && !PROTECTED_COLUMNS.includes(key)).length

  // Sort state - Airtable-style multi-sort
  const [sorts, setSorts] = useState<SortRule[]>([])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Check if column widths are saved in localStorage
  const hasSavedColumnWidths = useCallback(() => {
    try {
      return localStorage.getItem('crm-contacts-column-widths') !== null
    } catch {
      return false
    }
  }, [])

  // Load saved column widths from localStorage
  const loadColumnWidths = useCallback(() => {
    try {
      const saved = localStorage.getItem('crm-contacts-column-widths')
      if (saved) {
        return JSON.parse(saved) as Record<string, number>
      }
    } catch (e) {
      console.warn('Failed to load column widths:', e)
    }
    return COLUMN_DEFS.reduce((acc, col) => {
      acc[col.key] = col.defaultWidth
      return acc
    }, {} as Record<string, number>)
  }, [COLUMN_DEFS])

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(loadColumnWidths)
  const [hasInitializedFitToScreen, setHasInitializedFitToScreen] = useState(hasSavedColumnWidths)

  // Fit columns to screen on first load (when no saved widths exist)
  useEffect(() => {
    if (hasInitializedFitToScreen) return
    if (!tableContainerRef.current) return

    const containerWidth = tableContainerRef.current.offsetWidth
    if (containerWidth <= 0) return

    // Get visible columns for calculation
    const visibleCols = columnOrder
      .map(key => COLUMN_DEFS.find(col => col.key === key))
      .filter((col): col is typeof COLUMN_DEFS[0] => col !== undefined && columnVisibility[col.key] !== false)

    if (visibleCols.length === 0) return

    // Calculate total default width of visible columns
    const totalDefaultWidth = visibleCols.reduce((sum, col) => sum + col.defaultWidth, 0)

    // Account for gaps (40px between columns) and padding (32px total)
    const gapsWidth = (visibleCols.length - 1) * 40
    const paddingWidth = 32
    const availableWidth = containerWidth - gapsWidth - paddingWidth

    // Only scale up if columns would fit (don't compress below defaults)
    if (availableWidth > totalDefaultWidth) {
      const scale = availableWidth / totalDefaultWidth
      const scaledWidths = COLUMN_DEFS.reduce((acc, col) => {
        const isVisible = visibleCols.some(v => v.key === col.key)
        // Scale visible columns, keep default for hidden ones
        acc[col.key] = isVisible ? Math.round(col.defaultWidth * scale) : col.defaultWidth
        return acc
      }, {} as Record<string, number>)

      setColumnWidths(scaledWidths)
    }

    setHasInitializedFitToScreen(true)
  }, [hasInitializedFitToScreen, columnOrder, columnVisibility, COLUMN_DEFS])

  // Save column widths to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('crm-contacts-column-widths', JSON.stringify(columnWidths))
    } catch (e) {
      console.warn('Failed to save column widths:', e)
    }
  }, [columnWidths])

  // Handle column resize
  const handleColumnResize = useCallback((columnKey: string, newWidth: number) => {
    const colDef = COLUMN_DEFS.find(c => c.key === columnKey)
    const minWidth = colDef?.minWidth || 50
    setColumnWidths(prev => ({
      ...prev,
      [columnKey]: Math.max(minWidth, newWidth)
    }))
  }, [COLUMN_DEFS])

  // Reset column to default width (double-click)
  const handleResetColumnWidth = useCallback((columnKey: string) => {
    const colDef = COLUMN_DEFS.find(c => c.key === columnKey)
    if (colDef) {
      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: colDef.defaultWidth
      }))
    }
  }, [COLUMN_DEFS])

  // Get visible columns only, respecting column order
  const visibleColumnDefs = useMemo(() => {
    return columnOrder
      .map(key => COLUMN_DEFS.find(col => col.key === key))
      .filter((col): col is typeof COLUMN_DEFS[0] => col !== undefined && columnVisibility[col.key] !== false)
  }, [COLUMN_DEFS, columnVisibility, columnOrder])

  // Generate grid columns string from widths (only visible columns)
  const gridColumns = useMemo(() => {
    return visibleColumnDefs.map(col => `${columnWidths[col.key] || col.defaultWidth}px`).join(' ')
  }, [visibleColumnDefs, columnWidths])

  const minTableWidth = useMemo(() => {
    // Calculate actual table width based on current column widths + gaps + padding
    const columnsWidth = visibleColumnDefs.reduce((sum, col) => sum + (columnWidths[col.key] || col.defaultWidth), 0)
    const gapsWidth = (visibleColumnDefs.length - 1) * 40 // gap: 0 40px between columns
    const paddingWidth = 32 // padding: 10px 16px = 32px horizontal
    return columnsWidth + gapsWidth + paddingWidth
  }, [visibleColumnDefs, columnWidths])

  // Close filter popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close columns popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnsPopoverRef.current && !columnsPopoverRef.current.contains(event.target as Node)) {
        setShowColumnsMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Add a new filter
  const addFilter = (field?: string, keepOpen = true, groupId?: string) => {
    const fieldKey = field || 'company'
    const fieldDef = FILTER_FIELDS.find(f => f.key === fieldKey)
    const defaultOperator = fieldDef?.type === 'select' ? 'has_any_of' : 'contains'
    const defaultValue = ''
    setFilters([...filters, { 
      id: Date.now().toString(), 
      field: fieldKey, 
      operator: defaultOperator, 
      value: defaultValue, 
      conjunction: 'and', // Default to AND
      groupId 
    }])
    if (!keepOpen) {
      setShowFilterMenu(false)
    }
  }
  
  // Toggle conjunction between 'and' and 'or'
  const toggleConjunction = (filterId: string) => {
    setFilters(filters.map(f => 
      f.id === filterId 
        ? { ...f, conjunction: f.conjunction === 'and' ? 'or' : 'and' }
        : f
    ))
  }
  
  // Add a new condition group (OR group)
  const addFilterGroup = () => {
    const groupId = Date.now().toString()
    setFilterGroups([...filterGroups, { id: groupId, type: 'or' }])
    // Add first filter to the group
    addFilter('company', true, groupId)
  }
  
  // Update a filter field
  const updateFilterField = (id: string, field: string) => {
    const fieldDef = FILTER_FIELDS.find(f => f.key === field)
    const defaultOperator = fieldDef?.type === 'select' ? 'has_any_of' : 'contains'
    setFilters(filters.map(f => f.id === id ? { ...f, field, operator: defaultOperator, value: '' } : f))
  }
  
  // Update a filter operator
  const updateFilterOperator = (id: string, operator: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, operator } : f))
  }
  
  // Update a filter value
  const updateFilter = (id: string, value: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, value } : f))
  }
  
  // Remove a filter
  const removeFilter = (id: string) => {
    const filter = filters.find(f => f.id === id)
    setFilters(filters.filter(f => f.id !== id))
    // If this was the last filter in a group, remove the group
    if (filter?.groupId) {
      const remainingInGroup = filters.filter(f => f.groupId === filter.groupId && f.id !== id)
      if (remainingInGroup.length === 0) {
        setFilterGroups(filterGroups.filter(g => g.id !== filter.groupId))
      }
    }
  }
  
  // Remove a filter group
  const removeFilterGroup = (groupId: string) => {
    setFilters(filters.filter(f => f.groupId !== groupId))
    setFilterGroups(filterGroups.filter(g => g.id !== groupId))
  }
  
  // Debounce search query for smooth filtering (50ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 50)
    return () => clearTimeout(timer)
  }, [searchQuery])
  
  // Filter and sort contacts using stacked filters
  const filteredContacts = useMemo(() => {
    let result = [...contacts]
    
    // Search filter
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase()
      result = result.filter(c => 
        c.full_name?.toLowerCase().includes(query) ||
        c.first_name?.toLowerCase().includes(query) ||
        c.last_name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.job_title?.toLowerCase().includes(query) ||
        c.industry?.toLowerCase().includes(query) ||
        c.campaign_name?.toLowerCase().includes(query)
      )
    }
    
    // Helper function to apply a single filter to a contact
    const applyFilter = (c: Contact, filter: StackedFilter): boolean => {
      // Handle empty operators
      if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
        const fieldValue = (c: Contact) => {
          const fieldMap: Record<string, (c: Contact) => any> = {
            company: (c) => c.company,
            full_name: (c) => c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' '),
            email: (c) => c.email,
            job_title: (c) => c.job_title,
            seniority_level: (c) => c.seniority_level,
            lead_phone: (c) => c.lead_phone,
            company_domain: (c) => c.company_domain,
            company_size: (c) => c.company_size,
            industry: (c) => c.industry,
            annual_revenue: (c) => c.annual_revenue,
            company_hq_city: (c) => c.company_hq_city,
            company_hq_state: (c) => c.company_hq_state,
            company_hq_country: (c) => c.company_hq_country,
            business_model: (c) => c.business_model,
            funding_stage: (c) => c.funding_stage,
            epv: (c) => c.epv,
            assignee: (c) => c.assignee,
            campaign_name: (c) => c.campaign_name,
            lead_source: (c) => c.lead_source,
          }
          return fieldMap[filter.field]?.(c) ?? null
        }
        const value = fieldValue(c)
        if (filter.operator === 'is_empty') {
          return !value
        } else {
          return !!value
        }
      }
      
      if (!filter.value) return true // Skip empty filters
      
      // Helper function to apply text operators
      const applyTextOperator = (fieldValue: string | null | undefined, operator: string, filterValue: string): boolean => {
        const field = (fieldValue || '').toLowerCase()
        const value = filterValue.toLowerCase()
        switch (operator) {
          case 'contains': return field.includes(value)
          case 'not_contains': return !field.includes(value)
          case 'equals': case 'is': return field === value
          case 'not_equals': case 'is_not': return field !== value
          case 'starts_with': return field.startsWith(value)
          case 'ends_with': return field.endsWith(value)
          default: return field.includes(value)
        }
      }
      
      // Get field value from contact
      const getFieldValue = (c: Contact, field: string): any => {
        const fieldMap: Record<string, (c: Contact) => any> = {
          company: (c) => c.company,
          full_name: (c) => c.full_name || [c.first_name, c.last_name].filter(Boolean).join(' '),
          email: (c) => c.email,
          job_title: (c) => c.job_title,
          seniority_level: (c) => c.seniority_level,
          lead_phone: (c) => c.lead_phone,
          company_domain: (c) => c.company_domain,
          company_size: (c) => c.company_size,
          industry: (c) => c.industry,
          annual_revenue: (c) => c.annual_revenue,
          company_hq_city: (c) => c.company_hq_city,
          company_hq_state: (c) => c.company_hq_state,
          company_hq_country: (c) => c.company_hq_country,
          business_model: (c) => c.business_model,
          funding_stage: (c) => c.funding_stage,
          epv: (c) => c.epv?.toString(),
          assignee: (c) => c.assignee,
          campaign_name: (c) => c.campaign_name,
          lead_source: (c) => c.lead_source,
          stage: (c) => c.stage,
          meeting_booked: (c) => c.meeting_booked ? 'true' : 'false',
          qualified: (c) => c.qualified ? 'true' : 'false',
          closed: (c) => c.closed ? 'true' : 'false',
          is_hiring: (c) => c.is_hiring ? 'true' : 'false',
        }
        return fieldMap[field]?.(c) ?? null
      }
      
      const fieldValue = getFieldValue(c, filter.field)
      const fieldDef = FILTER_FIELDS.find(f => f.key === filter.field)
      
      // Handle select fields
      if (fieldDef?.type === 'select') {
        if (filter.operator === 'has_any_of' || filter.operator === 'is') {
          return fieldValue === filter.value
        } else if (filter.operator === 'has_none_of' || filter.operator === 'is_not') {
          return fieldValue !== filter.value
        }
      }
      
      // Handle date fields
      if (filter.field === 'last_activity' || filter.field === 'created_at') {
        const dateField = filter.field === 'last_activity' ? c.updated_at : c.created_at
        if (!dateField) return false
        const now = new Date()
        let cutoff: Date
        switch (filter.value) {
          case 'today':
            cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case '7d':
            cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30d':
            cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case '90d':
            cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          default:
            return true
        }
        return new Date(dateField) >= cutoff
      }
      
      // Handle text fields
      return applyTextOperator(fieldValue?.toString(), filter.operator, filter.value)
    }
    
    // Separate filters into groups and ungrouped
    const ungroupedFilters = filters.filter(f => !f.groupId)
    const groupedFilters = filters.filter(f => f.groupId)
    
    // Apply ungrouped filters with AND/OR logic based on conjunction
    if (ungroupedFilters.length > 0) {
      result = result.filter(contact => {
        // First filter always applies (no conjunction for the first one)
        let currentResult = applyFilter(contact, ungroupedFilters[0])
        
        // Apply subsequent filters based on their conjunction
        for (let i = 1; i < ungroupedFilters.length; i++) {
          const filter = ungroupedFilters[i]
          const filterResult = applyFilter(contact, filter)
          
          if (filter.conjunction === 'or') {
            currentResult = currentResult || filterResult
          } else {
            currentResult = currentResult && filterResult
          }
        }
        
        return currentResult
      })
    }
    
    // Apply grouped filters (OR logic within groups, AND between groups)
    filterGroups.forEach(group => {
      const groupFilters = groupedFilters.filter(f => f.groupId === group.id)
      if (groupFilters.length === 0) return
      
      result = result.filter(c => {
        // OR logic: contact matches if ANY filter in the group matches
        return groupFilters.some(filter => applyFilter(c, filter))
      })
    })
    
    // Apply multi-sort (priority = array order, index 0 = highest)
    if (sorts.length > 0) {
      result.sort((a, b) => {
        for (const sort of sorts) {
          let comparison = 0
          
          switch (sort.fieldKey) {
            case 'last_activity':
              comparison = (new Date(a.updated_at || 0).getTime()) - (new Date(b.updated_at || 0).getTime())
              break
            case 'epv':
              comparison = (a.epv || 0) - (b.epv || 0)
              break
            case 'name':
              comparison = (a.full_name || a.first_name || '').localeCompare(b.full_name || b.first_name || '')
              break
            case 'company':
              comparison = (a.company || '').localeCompare(b.company || '')
              break
            case 'created_at':
              comparison = (new Date(a.created_at || 0).getTime()) - (new Date(b.created_at || 0).getTime())
              break
            case 'stage':
              comparison = (a.stage || '').localeCompare(b.stage || '')
              break
            case 'next_touchpoint':
              comparison = (new Date(a.next_touchpoint || 0).getTime()) - (new Date(b.next_touchpoint || 0).getTime())
              break
            case 'meeting_date':
              comparison = (new Date(a.meeting_date || 0).getTime()) - (new Date(b.meeting_date || 0).getTime())
              break
          }
          
          if (comparison !== 0) {
            return sort.direction === 'asc' ? comparison : -comparison
          }
        }
        return 0
      })
    } else {
      // Default sort by last activity (desc) when no sorts are active
      result.sort((a, b) => {
        const comparison = (new Date(a.updated_at || 0).getTime()) - (new Date(b.updated_at || 0).getTime())
        return -comparison
      })
    }
    
    return result
  }, [contacts, debouncedQuery, filters, filterGroups, sorts])

  // Pagination calculations
  const totalPages = Math.ceil(filteredContacts.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, filteredContacts.length)

  const paginatedContacts = useMemo(() => {
    return filteredContacts.slice(startIndex, endIndex)
  }, [filteredContacts, startIndex, endIndex])

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedQuery, filters, filterGroups, sorts])

  // Single-click to open or switch contact in side panel
  const handleOpenContact = (contact: Contact) => {
    setSelectedContact(contact)
    setIsCreating(false)
    setIsModalOpen(true)
  }
  
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedContact(null)
  }
  
  // Keyboard navigation: up/down arrows to navigate between leads when side panel is open
  useEffect(() => {
    if (!isModalOpen || isCreating || !selectedContact) return
    
    const currentContact = selectedContact // Capture for closure
    
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      
      // Don't navigate if focus is in an input field
      const activeElement = document.activeElement
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'SELECT') {
        return
      }
      
      e.preventDefault()
      
      const currentIndex = paginatedContacts.findIndex(c => c.id === currentContact.id)
      if (currentIndex === -1) return

      let newIndex: number
      if (e.key === 'ArrowUp') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : paginatedContacts.length - 1
      } else {
        newIndex = currentIndex < paginatedContacts.length - 1 ? currentIndex + 1 : 0
      }

      const newContact = paginatedContacts[newIndex]
      if (newContact) {
        setSelectedContact(newContact)
        
        // Scroll the row into view
        const row = document.querySelector(`[data-contact-id="${newContact.id}"]`)
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, isCreating, selectedContact, paginatedContacts])
  
  if (loading.contacts) {
    return <LoadingSkeleton rows={8} />
  }

  return (
    <div style={{
      padding: '24px 32px',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          gap: 16,
        }}
      >
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
          <Users size={24} style={{ color: theme.entity.contact }} />
          Contacts
        </h1>
        <p
          style={{
            fontSize: '1.02rem', // 20% larger than sm (0.85rem)
            color: theme.text.muted,
            margin: 0,
          }}
        >
          {filteredContacts.length} of {contacts.length} {contacts.length === 1 ? 'lead' : 'leads'}
        </p>
      </div>
      
      {/* Search & Filter/Sort Bar */}
      <div
        style={{
          marginBottom: 24,
          padding: '12px 16px',
          backgroundColor: theme.bg.card,
          borderRadius: theme.radius.lg,
          border: `1px solid ${theme.border.subtle}`,
          position: 'relative',
          zIndex: 100,
        }}
      >
        {/* Top row: Search + Sort indicator + Filter/Sort buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search leads..."
            style={{ width: 200, flexShrink: 0 }}
          />
          
          {/* Sort Dropdown */}
          <div style={{ flex: 1 }}>
            <SortDropdown
              sorts={sorts}
              onUpdateSorts={setSorts}
            />
          </div>

          {/* Columns Popover Button */}
          <div style={{ position: 'relative' }} ref={columnsPopoverRef}>
            <button
              onClick={() => setShowColumnsMenu(!showColumnsMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                color: theme.text.secondary,
                backgroundColor: 'transparent',
                border: `1px solid ${theme.border.default}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                transition: `all ${theme.transition.fast}`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Columns size={14} />
              <span>Columns</span>
              {hiddenColumnCount > 0 && (
                <span style={{
                  backgroundColor: theme.bg.hover,
                  color: theme.text.muted,
                  borderRadius: theme.radius.full,
                  padding: '1px 6px',
                  fontSize: theme.fontSize.xs,
                  fontWeight: theme.fontWeight.semibold,
                }}>
                  {hiddenColumnCount}
                </span>
              )}
              <ChevronDown size={14} style={{ opacity: 0.6 }} />
            </button>

            {/* Columns Popover - Dark themed with drag-and-drop */}
            <AnimatePresence>
              {showColumnsMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    minWidth: 240,
                    backgroundColor: theme.bg.elevated,
                    border: `1px solid ${theme.border.default}`,
                    borderRadius: 12,
                    boxShadow: theme.shadow.dropdown,
                    zIndex: 9999,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Header */}
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${theme.border.subtle}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: theme.text.primary,
                    }}>
                      Columns
                    </span>
                    <button
                      onClick={() => setShowColumnsMenu(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        borderRadius: 4,
                        color: theme.text.muted,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Column List - Scrollable flat list with drag-and-drop */}
                  <div style={{
                    maxHeight: 400,
                    overflowY: 'auto',
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${theme.border.default} transparent`,
                    padding: '8px',
                  }}>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={columnOrder}
                        strategy={verticalListSortingStrategy}
                      >
                        {columnOrder.map((colKey) => {
                          const col = ALL_COLUMN_DEFS.find(c => c.key === colKey)
                          if (!col) return null
                          const isProtected = PROTECTED_COLUMNS.includes(col.key)
                          const isVisible = columnVisibility[col.key] !== false

                          return (
                            <SortableColumnItem
                              key={col.key}
                              id={col.key}
                              label={col.label}
                              isVisible={isVisible}
                              isProtected={isProtected}
                              onToggle={() => toggleColumnVisibility(col.key)}
                              theme={theme}
                            />
                          )
                        })}
                      </SortableContext>
                    </DndContext>
                  </div>

                  {/* Footer with Show all / Hide all buttons */}
                  <div style={{
                    padding: '12px 16px',
                    borderTop: `1px solid ${theme.border.subtle}`,
                    display: 'flex',
                    gap: 8,
                  }}>
                    <button
                      onClick={showAllColumns}
                      style={{
                        flex: 1,
                        fontSize: 12,
                        fontWeight: 500,
                        color: theme.accent.primary,
                        backgroundColor: theme.accent.primaryBg,
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: 6,
                        transition: `all ${theme.transition.fast}`,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Show all
                    </button>
                    <button
                      onClick={hideAllColumns}
                      style={{
                        flex: 1,
                        fontSize: 12,
                        fontWeight: 500,
                        color: theme.text.secondary,
                        backgroundColor: theme.bg.hover,
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        borderRadius: 6,
                        transition: `all ${theme.transition.fast}`,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      Hide all
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter Popover Button */}
          <div style={{ position: 'relative' }} ref={filterPopoverRef}>
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                color: '#fff',
                backgroundColor: theme.accent.primary,
                border: `1px solid ${theme.accent.primary}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                transition: `all ${theme.transition.fast}`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.primaryHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.accent.primary}
            >
              <Filter size={14} />
              <span>Filter</span>
              {filters.length > 0 && (
                <span style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.25)', 
                  color: '#fff', 
                  borderRadius: theme.radius.full,
                  padding: '1px 6px',
                  fontSize: theme.fontSize.xs,
                  fontWeight: theme.fontWeight.semibold,
                }}>
                  {filters.length}
                </span>
              )}
            </button>
            
            {/* Filter Popover - Dark themed */}
            <AnimatePresence>
              {showFilterMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    minWidth: 580,
                    backgroundColor: theme.bg.elevated,
                    border: `1px solid ${theme.border.default}`,
                    borderRadius: 12,
                    boxShadow: theme.shadow.dropdown,
                    zIndex: 9999,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <div style={{ 
                    padding: '12px 16px', 
                    borderBottom: `1px solid ${theme.border.subtle}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: theme.text.primary,
                    }}>
                      Filter
                    </span>
                    {filters.length > 0 && (
                      <button
                        onClick={() => {
                          setFilters([])
                          setFilterGroups([])
                        }}
                        style={{
                          fontSize: 12,
                          color: theme.text.muted,
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: 4,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  
                  {/* Filter Rows */}
                  <div style={{ padding: '8px 16px' }}>
                    {filters.length === 0 ? (
                      <div style={{ 
                        padding: '16px 0', 
                        textAlign: 'center', 
                        color: theme.text.muted,
                        fontSize: 13,
                      }}>
                        No filters applied
                      </div>
                    ) : (
                      (() => {
                        // Separate filters into groups and ungrouped
                        const ungroupedFilters = filters.filter(f => !f.groupId)
                        const groupedFiltersByGroup = filterGroups.map(group => ({
                          group,
                          filters: filters.filter(f => f.groupId === group.id)
                        })).filter(g => g.filters.length > 0)
                        
                        // Helper function to render a filter row
                        const renderFilterRow = (filter: StackedFilter, isFirst: boolean, isInGroup: boolean) => {
                          const fieldDef = FILTER_FIELDS.find(f => f.key === filter.field)
                          const FieldIcon = fieldDef?.icon || Building2
                          const operators = fieldDef?.type === 'select' ? SELECT_OPERATORS : TEXT_OPERATORS
                          const showValueInput = !['is_empty', 'is_not_empty'].includes(filter.operator)
                          
                          return (
                            <motion.div
                              key={filter.id}
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 0',
                                paddingLeft: isInGroup ? 48 : 0,
                              }}
                            >
                              {/* Prefix: Where / and / or - clickable to toggle */}
                              {isFirst ? (
                                <span style={{ 
                                  fontSize: 13, 
                                  color: theme.text.muted, 
                                  width: 48,
                                  flexShrink: 0,
                                }}>
                                  Where
                                </span>
                              ) : (
                                <button
                                  onClick={() => toggleConjunction(filter.id)}
                                  style={{ 
                                    fontSize: 13, 
                                    color: filter.conjunction === 'or' ? theme.accent.primary : theme.text.muted, 
                                    width: 48,
                                    flexShrink: 0,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textAlign: 'left',
                                    fontWeight: filter.conjunction === 'or' ? 600 : 400,
                                  }}
                                  title="Click to toggle between 'and' / 'or'"
                                >
                                  {filter.conjunction}
                                </button>
                              )}
                              {!isFirst && isInGroup && (
                                <span style={{ width: 48, flexShrink: 0 }} />
                              )}
                              
                              {/* Field Dropdown */}
                              <FilterSelect
                                options={FILTER_FIELDS.map(field => ({ value: field.key, label: field.label }))}
                                value={filter.field}
                                onChange={(value) => updateFilterField(filter.id, value)}
                                icon={<FieldIcon size={14} style={{ color: '#f59e0b' }} />}
                                minWidth={130}
                              />
                              
                              {/* Operator Dropdown */}
                              <FilterSelect
                                options={operators.map(op => ({ value: op.value, label: op.label }))}
                                value={filter.operator}
                                onChange={(value) => updateFilterOperator(filter.id, value)}
                                minWidth={110}
                              />
                              
                              {/* Value Input */}
                              {showValueInput && (
                                fieldDef?.type === 'select' ? (
                                  <div style={{ flex: 1, minWidth: 120 }}>
                                    <FilterSelect
                                      options={[
                                        { value: '', label: 'Select...' },
                                        ...fieldDef.options.map(opt => ({ value: opt.value, label: opt.label }))
                                      ]}
                                      value={filter.value}
                                      onChange={(value) => updateFilter(filter.id, value)}
                                      placeholder="Select..."
                                      minWidth={120}
                                    />
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={filter.value}
                                    onChange={(e) => updateFilter(filter.id, e.target.value)}
                                    placeholder="Enter a value"
                                    style={{
                                      flex: 1,
                                      padding: '6px 10px',
                                      fontSize: 13,
                                      color: theme.text.primary,
                                      backgroundColor: theme.bg.elevated,
                                      border: `1px solid ${theme.border.default}`,
                                      borderRadius: 6,
                                      outline: 'none',
                                      minWidth: 120,
                                    }}
                                  />
                                )
                              )}
                              
                              {/* Actions */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
                                <button
                                  onClick={() => removeFilter(filter.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 28,
                                    height: 28,
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: 4,
                                    color: theme.text.muted,
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'
                                    e.currentTarget.style.color = '#ef4444'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent'
                                    e.currentTarget.style.color = theme.text.muted
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 28,
                                    height: 28,
                                    color: '#d1d5db',
                                    cursor: 'grab',
                                  }}
                                >
                                  <GripVertical size={14} />
                                </div>
                              </div>
                            </motion.div>
                          )
                        }
                        
                        return (
                          <>
                            {/* Ungrouped filters */}
                            {ungroupedFilters.map((filter, idx) => {
                              const isFirst = idx === 0
                              return renderFilterRow(filter, isFirst, false)
                            })}
                            
                            {/* Grouped filters */}
                            {groupedFiltersByGroup.map(({ group, filters: groupFilters }, groupIdx) => {
                              const isFirstGroup = ungroupedFilters.length === 0 && groupIdx === 0
                              return (
                                <div key={group.id} style={{ marginTop: groupIdx > 0 || ungroupedFilters.length > 0 ? 12 : 0 }}>
                                  {/* Group header */}
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 8, 
                                    marginBottom: 8,
                                    paddingLeft: 48,
                                  }}>
                                    <span style={{ 
                                      fontSize: 13, 
                                      color: theme.text.muted,
                                      fontWeight: 500,
                                    }}>
                                      {isFirstGroup ? 'Where' : 'and'} (
                                    </span>
                                    <button
                                      onClick={() => removeFilterGroup(group.id)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 20,
                                        height: 20,
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        borderRadius: 4,
                                        color: theme.text.muted,
                                        cursor: 'pointer',
                                        padding: 0,
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'
                                        e.currentTarget.style.color = '#ef4444'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent'
                                        e.currentTarget.style.color = theme.text.muted
                                      }}
                                    >
                                      <X size={12} />
                                    </button>
                                    <span style={{ 
                                      fontSize: 13, 
                                      color: theme.text.muted,
                                      fontWeight: 500,
                                    }}>
                                      )
                                    </span>
                                  </div>
                                  
                                  {/* Group filters */}
                                  {groupFilters.map((filter, idx) => {
                                    return renderFilterRow(filter, idx === 0, true)
                                  })}
                                </div>
                              )
                            })}
                          </>
                        )
                      })()
                    )}
                  </div>
                  
                  {/* Footer: Add condition buttons */}
                  <div style={{ 
                    padding: '12px 16px', 
                    borderTop: `1px solid ${theme.border.subtle}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}>
                    <button
                      onClick={() => addFilter()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        fontSize: 13,
                        fontWeight: 500,
                        color: theme.accent.primary,
                        backgroundColor: 'transparent',
                        border: `1px solid ${theme.border.default}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.primaryBg}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Plus size={14} />
                      Add condition
                    </button>
                    <button
                      onClick={addFilterGroup}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        fontSize: 13,
                        fontWeight: 500,
                        color: theme.text.muted,
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Plus size={14} />
                      Add condition group
                      <span style={{ 
                        fontSize: 11, 
                        padding: '1px 4px', 
                        backgroundColor: theme.bg.hover, 
                        borderRadius: 4,
                        marginLeft: 4,
                      }}>
                        ⓘ
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
      
      {/* Contacts Table */}
      {filteredContacts.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title={debouncedQuery ? 'No leads found' : 'No leads yet'}
          description={
            debouncedQuery
              ? 'Try adjusting your search terms'
              : 'Start by adding your first lead to the CRM'
          }
          action={undefined}
        />
      ) : (
        <Card padding="none" style={{
          width: '100%',
          overflow: 'hidden',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          zoom: 0.94,
        }}>
          <div
            ref={tableContainerRef}
            style={{
              overflowX: 'auto',
              overflowY: 'auto',
              width: '100%',
              flex: 1,
              scrollbarWidth: 'thin',
              scrollbarColor: `${theme.border.default} transparent`,
              backgroundColor: theme.bg.row,
              scrollBehavior: 'smooth',
            }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
                gap: '0 40px',
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom: '1px solid #1a3a4d',
                backgroundColor: theme.bg.card,
                minWidth: minTableWidth,
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              {visibleColumnDefs.map((col, index) => (
                <ResizableTableHeader
                  key={col.key}
                  columnKey={col.key}
                  currentWidth={columnWidths[col.key] || col.defaultWidth}
                  onResize={handleColumnResize}
                  onResetWidth={handleResetColumnWidth}
                  isLast={index === visibleColumnDefs.length - 1}
                >
                  {col.label}
                </ResizableTableHeader>
              ))}
            </div>
            
            {/* Table Rows - no animation for instant search */}
            {paginatedContacts.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                isSelected={selectedContact?.id === contact.id}
                gridColumns={gridColumns}
                minWidth={minTableWidth}
                onClick={() => handleOpenContact(contact)}
                onUpdateStage={(stage) => updateContact(contact.id, { stage })}
                onUpdatePipelineStep={(step, value) => updateContact(contact.id, { [step]: value })}
                columnVisibility={columnVisibility}
              />
            ))}
          </div>

          {/* Pagination Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: `1px solid ${theme.border.subtle}`,
              backgroundColor: theme.bg.muted,
              fontSize: theme.fontSize.sm,
              color: theme.text.secondary,
            }}
          >
            {/* Left side - results range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: theme.text.muted }}>[</span>
              <span style={{ fontWeight: theme.fontWeight.semibold, color: theme.text.primary }}>{filteredContacts.length > 0 ? startIndex + 1 : 0}</span>
              <span style={{ color: theme.text.muted }}>]</span>
              <span style={{ color: theme.text.muted }}>to</span>
              <span style={{ color: theme.text.muted }}>[</span>
              <span style={{ fontWeight: theme.fontWeight.semibold, color: theme.text.primary }}>{endIndex}</span>
              <span style={{ color: theme.text.muted }}>]</span>
              <span style={{ color: theme.text.muted }}>of</span>
              <span style={{ color: theme.text.muted }}>[</span>
              <span style={{ fontWeight: theme.fontWeight.semibold, color: theme.text.primary }}>{filteredContacts.length.toLocaleString()}</span>
              <span style={{ color: theme.text.muted }}>]</span>
            </div>

            {/* Center - page navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* First page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: theme.radius.sm,
                  color: currentPage === 1 ? theme.text.muted : theme.text.secondary,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  transition: `all ${theme.transition.fast}`,
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) e.currentTarget.style.backgroundColor = theme.bg.hover
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Previous page */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: theme.radius.sm,
                  color: currentPage === 1 ? theme.text.muted : theme.text.secondary,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                  transition: `all ${theme.transition.fast}`,
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) e.currentTarget.style.backgroundColor = theme.bg.hover
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: theme.text.muted }}>Page</span>
                <span style={{ color: theme.text.muted }}>[</span>
                <span style={{ fontWeight: theme.fontWeight.semibold, color: theme.text.primary }}>{currentPage}</span>
                <span style={{ color: theme.text.muted }}>]</span>
                <span style={{ color: theme.text.muted }}>of</span>
                <span style={{ color: theme.text.muted }}>[</span>
                <span style={{ fontWeight: theme.fontWeight.semibold, color: theme.text.primary }}>{totalPages.toLocaleString()}</span>
                <span style={{ color: theme.text.muted }}>]</span>
              </div>

              {/* Next page */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: theme.radius.sm,
                  color: currentPage === totalPages || totalPages === 0 ? theme.text.muted : theme.text.secondary,
                  cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages || totalPages === 0 ? 0.5 : 1,
                  transition: `all ${theme.transition.fast}`,
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages && totalPages !== 0) e.currentTarget.style.backgroundColor = theme.bg.hover
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <ChevronRight size={16} />
              </button>

              {/* Last page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: theme.radius.sm,
                  color: currentPage === totalPages || totalPages === 0 ? theme.text.muted : theme.text.secondary,
                  cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages || totalPages === 0 ? 0.5 : 1,
                  transition: `all ${theme.transition.fast}`,
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages && totalPages !== 0) e.currentTarget.style.backgroundColor = theme.bg.hover
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <ChevronsRight size={16} />
              </button>
            </div>

            {/* Right side - page size selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {[10, 20, 50, 100].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size)
                    setCurrentPage(1)
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: theme.fontSize.sm,
                    fontWeight: pageSize === size ? theme.fontWeight.semibold : theme.fontWeight.normal,
                    color: pageSize === size ? theme.accent.primary : theme.text.secondary,
                    backgroundColor: pageSize === size ? `${theme.accent.primary}15` : 'transparent',
                    border: pageSize === size ? `1px solid ${theme.accent.primary}40` : `1px solid transparent`,
                    borderRadius: theme.radius.sm,
                    cursor: 'pointer',
                    transition: `all ${theme.transition.fast}`,
                  }}
                  onMouseEnter={(e) => {
                    if (pageSize !== size) {
                      e.currentTarget.style.backgroundColor = theme.bg.hover
                      e.currentTarget.style.borderColor = theme.border.default
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pageSize !== size) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.borderColor = 'transparent'
                    }
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}
      
      {/* Contact Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        contact={isCreating ? null : selectedContact}
      />
    </div>
  )
}

interface ResizableTableHeaderProps {
  children: React.ReactNode
  columnKey: string
  onResize: (key: string, width: number) => void
  onResetWidth: (key: string) => void
  currentWidth: number
  isLast?: boolean
}

function ResizableTableHeader({ children, columnKey, onResize, onResetWidth, currentWidth, isLast }: ResizableTableHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = currentWidth
  }, [currentWidth])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onResetWidth(columnKey)
  }, [columnKey, onResetWidth])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current
      const newWidth = startWidthRef.current + delta
      onResize(columnKey, newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, columnKey, onResize])

  return (
    <div
      ref={headerRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        height: '100%',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: '13px', // 10% bigger than xs (12px)
          fontWeight: theme.fontWeight.semibold,
          color: theme.text.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>

      {/* Resize Handle - Always visible */}
      {!isLast && (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          title="Drag to resize, double-click to reset"
          style={{
            position: 'absolute',
            right: -10,
            top: 0,
            bottom: 0,
            width: 20,
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 4,
              height: '50%',
              backgroundColor: isResizing
                ? theme.accent.primary
                : isHovering
                  ? theme.accent.primary
                  : 'rgba(74, 222, 128, 0.5)',
              borderRadius: 2,
              transition: isResizing ? 'none' : 'background-color 0.15s ease',
            }}
          />
        </div>
      )}
    </div>
  )
}

interface ContactRowProps {
  contact: Contact
  isSelected: boolean
  gridColumns: string
  minWidth: number
  onClick: () => void
  onUpdateStage: (stage: string) => void
  onUpdatePipelineStep: (step: string, value: boolean) => void
  columnVisibility: Record<string, boolean>
}

// Pipeline steps in order from earliest to deepest
const PIPELINE_STEPS = [
  { key: 'meeting_booked', label: 'Meeting Booked', shortLabel: 'Meeting', color: '#a78bfa' },
  { key: 'showed_up_to_disco', label: 'Showed Up to Disco', shortLabel: 'Disco', color: '#c084fc' },
  { key: 'qualified', label: 'Qualified', shortLabel: 'Qualified', color: '#fbbf24' },
  { key: 'demo_booked', label: 'Demo Booked', shortLabel: 'Demo', color: '#fb923c' },
  { key: 'showed_up_to_demo', label: 'Showed Up to Demo', shortLabel: 'Demo Show', color: '#f97316' },
  { key: 'proposal_sent', label: 'Proposal Sent', shortLabel: 'Proposal', color: '#2dd4bf' },
  { key: 'closed', label: 'Closed Won', shortLabel: 'Won', color: '#22c55e' },
] as const

// Stage colors for the left border line
const STAGE_COLORS: Record<string, string> = {
  interested: '#60a5fa',
  engaged: '#8b5cf6',
  qualified: '#f59e0b',
  demo: '#f97316',
  proposal: '#14b8a6',
  closed: '#22c55e',
  disqualified: '#6b7280',
}

function ContactRow({ contact, isSelected, gridColumns, minWidth, onClick, onUpdateStage, onUpdatePipelineStep, columnVisibility }: ContactRowProps) {
  const displayName = contact.full_name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
    'Unknown'

  const stageColor = STAGE_COLORS[contact.stage || ''] || theme.border.default

  return (
    <div
      data-contact-id={contact.id}
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: gridColumns,
        gap: '0 40px',
        alignItems: 'center',
        padding: '10px 16px',
        borderBottom: '1px solid #1a3a4d',
        backgroundColor: isSelected ? theme.bg.rowHover : theme.bg.row,
        cursor: 'pointer',
        minWidth: minWidth,
        boxShadow: isSelected ? `inset 3px 0 0 0 ${theme.accent.primary}` : 'none',
        transition: `background-color 0.15s ease`,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = theme.bg.rowHover
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isSelected ? theme.bg.rowHover : theme.bg.row
      }}
    >
      {/* Name with stage-colored left border */}
      {columnVisibility.name !== false && (
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {/* Stage color vertical line */}
          <div
            style={{
              width: 3,
              height: 20,
              backgroundColor: stageColor,
              borderRadius: 2,
              marginRight: 10,
              flexShrink: 0,
            }}
          />
          <p
            style={{
              fontSize: '14px', // Same size as company text (13px + 10%)
              fontWeight: theme.fontWeight.medium,
              color: theme.text.primary,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </p>
        </div>
      )}

      {/* Company */}
      {columnVisibility.company !== false && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {contact.company ? (
            <>
              <Building2 size={14} style={{ color: theme.text.muted, flexShrink: 0 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: '14px', // 10% bigger than xs (12px)
                    color: theme.text.secondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {contact.company}
                </span>
              </div>
            </>
          ) : (
            <span style={{ fontSize: '14px', color: theme.text.muted }}>—</span>
          )}
        </div>
      )}

      {/* Stage */}
      {columnVisibility.stage !== false && (
        <div
          style={{ display: 'flex', alignItems: 'center' }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <StageDropdown
            value={contact.stage}
            onChange={(stage) => {
              onUpdateStage(stage)
            }}
          />
        </div>
      )}

      {/* Pipeline Progress Dropdown */}
      {columnVisibility.pipeline !== false && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <PipelineProgressDropdown
            contact={contact}
            onUpdateStep={onUpdatePipelineStep}
          />
        </div>
      )}

      {/* Title */}
      {columnVisibility.title !== false && (
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <span
            style={{
              fontSize: theme.fontSize.xs,
              color: contact.job_title ? theme.text.secondary : theme.text.muted,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {contact.job_title || '—'}
          </span>
        </div>
      )}

      {/* Last Activity */}
      {columnVisibility.lastActivity !== false && (
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <span
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.text.muted,
            }}
            title={contact.updated_at ? new Date(contact.updated_at).toLocaleString() : undefined}
          >
            {formatRelativeTime(contact.updated_at)}
          </span>
        </div>
      )}

      {/* Actions */}
      {columnVisibility.actions !== false && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 4 }}>
          {contact.email && (
            <ActionButton
              href={`mailto:${contact.email}`}
              icon={<Mail size={14} />}
              label="Email"
            />
          )}
          {contact.lead_phone && (
            <ActionButton
              href={`tel:${contact.lead_phone}`}
              icon={<Phone size={14} />}
              label="Call"
            />
          )}
          {contact.linkedin_url && (
            <ActionButton
              href={contact.linkedin_url}
              icon={<Linkedin size={14} />}
              label="LinkedIn"
              external
            />
          )}
        </div>
      )}

      {/* === Personal Info Columns === */}
      {columnVisibility.email !== false && (
        <CellText value={contact.email} />
      )}
      {columnVisibility.phone !== false && (
        <CellText value={contact.lead_phone} />
      )}
      {columnVisibility.seniority !== false && (
        <CellText value={contact.seniority_level} />
      )}
      {columnVisibility.linkedin !== false && (
        <CellLink url={contact.linkedin_url} label="LinkedIn" />
      )}

      {/* === Company Info Columns === */}
      {columnVisibility.domain !== false && (
        <CellText value={contact.company_domain} />
      )}
      {columnVisibility.companySize !== false && (
        <CellText value={contact.company_size} />
      )}
      {columnVisibility.industry !== false && (
        <CellText value={contact.industry} />
      )}
      {columnVisibility.revenue !== false && (
        <CellText value={contact.annual_revenue} />
      )}
      {columnVisibility.hqCity !== false && (
        <CellText value={contact.company_hq_city} />
      )}
      {columnVisibility.hqState !== false && (
        <CellText value={contact.company_hq_state} />
      )}
      {columnVisibility.hqCountry !== false && (
        <CellText value={contact.company_hq_country} />
      )}
      {columnVisibility.yearFounded !== false && (
        <CellText value={contact.year_founded?.toString()} />
      )}
      {columnVisibility.businessModel !== false && (
        <CellText value={contact.business_model} />
      )}
      {columnVisibility.fundingStage !== false && (
        <CellText value={contact.funding_stage} />
      )}
      {columnVisibility.isHiring !== false && (
        <CellBoolean value={contact.is_hiring} />
      )}

      {/* === Campaign Columns === */}
      {columnVisibility.campaignName !== false && (
        <CellText value={contact.campaign_name} />
      )}
      {columnVisibility.leadSource !== false && (
        <CellText value={contact.lead_source} />
      )}

      {/* === Sales Columns === */}
      {columnVisibility.epv !== false && (
        <CellCurrency value={contact.epv} />
      )}
      {columnVisibility.assignee !== false && (
        <CellText value={contact.assignee} />
      )}
      {columnVisibility.nextTouchpoint !== false && (
        <CellDate value={contact.next_touchpoint} />
      )}

      {/* === Date Columns === */}
      {columnVisibility.createdAt !== false && (
        <CellDate value={contact.created_at} />
      )}
      {columnVisibility.meetingDate !== false && (
        <CellDate value={contact.meeting_date} />
      )}
    </div>
  )
}

// === Cell Renderer Components ===
function CellText({ value }: { value: string | null | undefined }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <span
        style={{
          fontSize: theme.fontSize.xs,
          color: value ? theme.text.secondary : theme.text.muted,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value || '—'}
      </span>
    </div>
  )
}

function CellLink({ url, label }: { url: string | null | undefined; label: string }) {
  if (!url) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <span style={{ fontSize: theme.fontSize.xs, color: theme.text.muted }}>—</span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          fontSize: theme.fontSize.xs,
          color: theme.accent.primary,
          textDecoration: 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </a>
    </div>
  )
}

function CellBoolean({ value }: { value: boolean | null | undefined }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <span
        style={{
          fontSize: theme.fontSize.xs,
          color: value ? '#22c55e' : theme.text.muted,
          fontWeight: value ? 500 : 400,
        }}
      >
        {value === true ? 'Yes' : value === false ? 'No' : '—'}
      </span>
    </div>
  )
}

function CellCurrency({ value }: { value: number | null | undefined }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <span
        style={{
          fontSize: theme.fontSize.xs,
          color: value ? theme.text.secondary : theme.text.muted,
          fontFamily: 'monospace',
        }}
      >
        {value != null ? `$${value.toLocaleString()}` : '—'}
      </span>
    </div>
  )
}

function CellDate({ value }: { value: string | null | undefined }) {
  if (!value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <span style={{ fontSize: theme.fontSize.xs, color: theme.text.muted }}>—</span>
      </div>
    )
  }
  try {
    const date = new Date(value)
    return (
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <span
          style={{
            fontSize: theme.fontSize.xs,
            color: theme.text.secondary,
          }}
          title={date.toLocaleString()}
        >
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    )
  } catch {
    return (
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
        <span style={{ fontSize: theme.fontSize.xs, color: theme.text.muted }}>—</span>
      </div>
    )
  }
}

// Pipeline Progress Dropdown - shows deepest stage reached with dropdown for all stages
interface PipelineProgressDropdownProps {
  contact: Contact
  onUpdateStep: (step: string, value: boolean) => void
}

function PipelineProgressDropdown({ contact, onUpdateStep }: PipelineProgressDropdownProps) {
  const dropdownId = useId()
  const { isOpen, toggle, close } = useDropdown(dropdownId)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        close()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [close])

  // Find the deepest completed stage
  const getDeepestStage = () => {
    let deepest: typeof PIPELINE_STEPS[number] | null = null
    for (const step of PIPELINE_STEPS) {
      if (contact[step.key as keyof Contact]) {
        deepest = step
      }
    }
    return deepest
  }

  const deepestStage = getDeepestStage()

  // Format date for display
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return null
    }
  }

  return (
    <div 
      ref={dropdownRef} 
      style={{ position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Trigger Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.border.subtle}`,
          background: deepestStage ? `${deepestStage.color}15` : 'transparent',
          color: deepestStage ? deepestStage.color : theme.text.muted,
          cursor: 'pointer',
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.medium,
          transition: `all ${theme.transition.fast}`,
          minWidth: 100,
          justifyContent: 'space-between',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {deepestStage ? deepestStage.shortLabel : 'No progress'}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              minWidth: 220,
              backgroundColor: theme.bg.card,
              border: `1px solid ${theme.border.default}`,
              borderRadius: theme.radius.lg,
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
              zIndex: 100,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 8 }}>
              {PIPELINE_STEPS.map((step) => {
                const isChecked = contact[step.key as keyof Contact] as boolean
                const dateKey = `${step.key}_at` as keyof Contact
                const dateValue = contact[dateKey] as string | null | undefined
                const formattedDate = formatDate(dateValue)

                return (
                  <button
                    key={step.key}
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateStep(step.key, !isChecked)
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: theme.radius.md,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      transition: `all ${theme.transition.fast}`,
                      gap: 10,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.bg.hover
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: isChecked ? 'none' : `2px solid ${theme.border.default}`,
                        backgroundColor: isChecked ? step.color : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>

                    {/* Label */}
                    <span
                      style={{
                        flex: 1,
                        textAlign: 'left',
                        fontSize: theme.fontSize.sm,
                        color: isChecked ? theme.text.primary : theme.text.secondary,
                        fontWeight: isChecked ? theme.fontWeight.medium : theme.fontWeight.normal,
                      }}
                    >
                      {step.label}
                    </span>

                    {/* Date */}
                    {formattedDate && (
                      <span
                        style={{
                          fontSize: theme.fontSize.xs,
                          color: theme.text.muted,
                          flexShrink: 0,
                        }}
                      >
                        {formattedDate}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ActionButtonProps {
  href: string
  icon: React.ReactNode
  label: string
  external?: boolean
}

function ActionButton({ href, icon, label, external }: ActionButtonProps) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={(e) => e.stopPropagation()}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: theme.radius.md,
        backgroundColor: 'transparent',
        color: theme.text.muted,
        transition: `all ${theme.transition.fast}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = theme.accent.primaryBg
        e.currentTarget.style.color = theme.accent.primary
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = theme.text.muted
      }}
    >
      {icon}
    </a>
  )
}

