import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Filter, X, Trash2, GripVertical, User, Briefcase, Tag, Clock, Factory, MapPin, DollarSign, Calendar, AtSign, Hash, TrendingUp, Building2, Phone, Check, Columns, Eye, EyeOff } from 'lucide-react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import type { ColDef, GridReadyEvent, GridApi, CellValueChangedEvent, CellClickedEvent } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

// Register AG Grid modules (required for v35+)
ModuleRegistry.registerModules([AllCommunityModule])

import { StageCellRenderer, PipelineCellRenderer } from './cells'
import { theme } from '../../config/theme'
import { useCRM } from '../../context/CRMContext'
import { Card, SearchInput, EmptyState, LoadingSkeleton, FilterSelect } from '../shared'
import { ContactModal } from './ContactModal'
import { SortDropdown, type SortRule } from './SortDropdown'
import type { Contact } from '../../types'

// All available columns that can be shown/hidden
const ALL_COLUMNS = [
  { key: 'full_name', label: 'Name', field: 'full_name', defaultVisible: true },
  { key: 'company', label: 'Company', field: 'company', defaultVisible: true },
  { key: 'stage', label: 'Stage', field: 'stage', defaultVisible: true, cellRenderer: StageCellRenderer },
  { key: 'pipeline', label: 'Pipeline', field: null, defaultVisible: true, cellRenderer: PipelineCellRenderer },
  { key: 'job_title', label: 'Title', field: 'job_title', defaultVisible: true },
  { key: 'updated_at', label: 'Last Activity', field: 'updated_at', defaultVisible: true },
  { key: 'email', label: 'Email', field: 'email', defaultVisible: false },
  { key: 'lead_phone', label: 'Phone', field: 'lead_phone', defaultVisible: false },
  { key: 'seniority_level', label: 'Seniority', field: 'seniority_level', defaultVisible: false },
  { key: 'industry', label: 'Industry', field: 'industry', defaultVisible: false },
  { key: 'company_size', label: 'Company Size', field: 'company_size', defaultVisible: false },
  { key: 'annual_revenue', label: 'Revenue', field: 'annual_revenue', defaultVisible: false },
  { key: 'company_hq_city', label: 'HQ City', field: 'company_hq_city', defaultVisible: false },
  { key: 'company_hq_state', label: 'HQ State', field: 'company_hq_state', defaultVisible: false },
  { key: 'company_hq_country', label: 'HQ Country', field: 'company_hq_country', defaultVisible: false },
  { key: 'epv', label: 'EPV', field: 'epv', defaultVisible: false },
  { key: 'assignee', label: 'Assignee', field: 'assignee', defaultVisible: false },
  { key: 'lead_source', label: 'Lead Source', field: 'lead_source', defaultVisible: false },
  { key: 'campaign_name', label: 'Campaign', field: 'campaign_name', defaultVisible: false },
  { key: 'meeting_date', label: 'Meeting Date', field: 'meeting_date', defaultVisible: false },
  { key: 'next_touchpoint', label: 'Next Touchpoint', field: 'next_touchpoint', defaultVisible: false },
  { key: 'created_at', label: 'Created', field: 'created_at', defaultVisible: false },
  { key: 'linkedin_url', label: 'LinkedIn', field: 'linkedin_url', defaultVisible: false },
  { key: 'business_model', label: 'Business Model', field: 'business_model', defaultVisible: false },
  { key: 'funding_stage', label: 'Funding Stage', field: 'funding_stage', defaultVisible: false },
] as const

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
  conjunction: 'and' | 'or'
  groupId?: string
}

interface FilterGroup {
  id: string
  type: 'and' | 'or'
}

// Helper to format relative time
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper to format date
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// localStorage key for column visibility
const COLUMN_VISIBILITY_KEY = 'crm-contacts-visible-columns'

export function ContactList() {
  const { contacts, loading, updateContact } = useCRM()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // AG Grid state
  const [gridApi, setGridApi] = useState<GridApi | null>(null)

  // Column visibility state (persisted in localStorage)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY)
      if (saved) return new Set(JSON.parse(saved))
    } catch {}
    return new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  })
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const columnPickerRef = useRef<HTMLDivElement>(null)

  // Handle contactId URL parameter to open specific contact
  useEffect(() => {
    const contactId = searchParams.get('contactId')
    if (contactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === contactId)
      if (contact) {
        setSelectedContact(contact)
        setIsModalOpen(true)
        searchParams.delete('contactId')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [searchParams, setSearchParams, contacts])

  // Persist column visibility
  useEffect(() => {
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify([...visibleColumns]))
  }, [visibleColumns])

  // Stacked filter states
  const [filters, setFilters] = useState<StackedFilter[]>([])
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const filterPopoverRef = useRef<HTMLDivElement>(null)

  // Sort state
  const [sorts, setSorts] = useState<SortRule[]>([])

  // Close popovers when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false)
      }
      if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
        setShowColumnPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter functions
  const addFilter = (field?: string, keepOpen = true, groupId?: string) => {
    const fieldKey = field || 'company'
    const fieldDef = FILTER_FIELDS.find(f => f.key === fieldKey)
    const defaultOperator = fieldDef?.type === 'select' ? 'has_any_of' : 'contains'
    setFilters([...filters, {
      id: Date.now().toString(),
      field: fieldKey,
      operator: defaultOperator,
      value: '',
      conjunction: 'and',
      groupId
    }])
    if (!keepOpen) setShowFilterMenu(false)
  }

  const toggleConjunction = (filterId: string) => {
    setFilters(filters.map(f =>
      f.id === filterId ? { ...f, conjunction: f.conjunction === 'and' ? 'or' : 'and' } : f
    ))
  }

  const addFilterGroup = () => {
    const groupId = Date.now().toString()
    setFilterGroups([...filterGroups, { id: groupId, type: 'or' }])
    addFilter('company', true, groupId)
  }

  const updateFilterField = (id: string, field: string) => {
    const fieldDef = FILTER_FIELDS.find(f => f.key === field)
    const defaultOperator = fieldDef?.type === 'select' ? 'has_any_of' : 'contains'
    setFilters(filters.map(f => f.id === id ? { ...f, field, operator: defaultOperator, value: '' } : f))
  }

  const updateFilterOperator = (id: string, operator: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, operator } : f))
  }

  const updateFilter = (id: string, value: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, value } : f))
  }

  const removeFilter = (id: string) => {
    const filter = filters.find(f => f.id === id)
    setFilters(filters.filter(f => f.id !== id))
    if (filter?.groupId) {
      const remainingInGroup = filters.filter(f => f.groupId === filter.groupId && f.id !== id)
      if (remainingInGroup.length === 0) {
        setFilterGroups(filterGroups.filter(g => g.id !== filter.groupId))
      }
    }
  }

  const removeFilterGroup = (groupId: string) => {
    setFilters(filters.filter(f => f.groupId !== groupId))
    setFilterGroups(filterGroups.filter(g => g.id !== groupId))
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 50)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Filter and sort contacts
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

    // Apply filters (same logic as before)
    const applyFilter = (c: Contact, filter: StackedFilter): boolean => {
      if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
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
        const value = fieldMap[filter.field]?.(c) ?? null
        return filter.operator === 'is_empty' ? !value : !!value
      }

      if (!filter.value) return true

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

      if (fieldDef?.type === 'select') {
        if (filter.operator === 'has_any_of' || filter.operator === 'is') {
          return fieldValue === filter.value
        } else if (filter.operator === 'has_none_of' || filter.operator === 'is_not') {
          return fieldValue !== filter.value
        }
      }

      if (filter.field === 'last_activity' || filter.field === 'created_at') {
        const dateField = filter.field === 'last_activity' ? c.updated_at : c.created_at
        if (!dateField) return false
        const now = new Date()
        let cutoff: Date
        switch (filter.value) {
          case 'today': cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
          case '7d': cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break
          case '30d': cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break
          case '90d': cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break
          default: return true
        }
        return new Date(dateField) >= cutoff
      }

      return applyTextOperator(fieldValue?.toString(), filter.operator, filter.value)
    }

    const ungroupedFilters = filters.filter(f => !f.groupId)
    const groupedFilters = filters.filter(f => f.groupId)

    if (ungroupedFilters.length > 0) {
      result = result.filter(contact => {
        let currentResult = applyFilter(contact, ungroupedFilters[0])
        for (let i = 1; i < ungroupedFilters.length; i++) {
          const filter = ungroupedFilters[i]
          const filterResult = applyFilter(contact, filter)
          currentResult = filter.conjunction === 'or' ? currentResult || filterResult : currentResult && filterResult
        }
        return currentResult
      })
    }

    filterGroups.forEach(group => {
      const groupFilters = groupedFilters.filter(f => f.groupId === group.id)
      if (groupFilters.length === 0) return
      result = result.filter(c => groupFilters.some(filter => applyFilter(c, filter)))
    })

    // Apply sorting
    if (sorts.length > 0) {
      result.sort((a, b) => {
        for (const sort of sorts) {
          let comparison = 0
          switch (sort.fieldKey) {
            case 'last_activity': comparison = (new Date(a.updated_at || 0).getTime()) - (new Date(b.updated_at || 0).getTime()); break
            case 'epv': comparison = (a.epv || 0) - (b.epv || 0); break
            case 'name': comparison = (a.full_name || a.first_name || '').localeCompare(b.full_name || b.first_name || ''); break
            case 'company': comparison = (a.company || '').localeCompare(b.company || ''); break
            case 'created_at': comparison = (new Date(a.created_at || 0).getTime()) - (new Date(b.created_at || 0).getTime()); break
            case 'stage': comparison = (a.stage || '').localeCompare(b.stage || ''); break
            case 'next_touchpoint': comparison = (new Date(a.next_touchpoint || 0).getTime()) - (new Date(b.next_touchpoint || 0).getTime()); break
            case 'meeting_date': comparison = (new Date(a.meeting_date || 0).getTime()) - (new Date(b.meeting_date || 0).getTime()); break
          }
          if (comparison !== 0) return sort.direction === 'asc' ? comparison : -comparison
        }
        return 0
      })
    } else {
      result.sort((a, b) => (new Date(b.updated_at || 0).getTime()) - (new Date(a.updated_at || 0).getTime()))
    }

    return result
  }, [contacts, debouncedQuery, filters, filterGroups, sorts])

  const handleOpenContact = useCallback((contact: Contact) => {
    setSelectedContact(contact)
    setIsCreating(false)
    setIsModalOpen(true)
  }, [])

  const handleCreateContact = () => {
    setSelectedContact(null)
    setIsCreating(true)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedContact(null)
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isModalOpen || isCreating || !selectedContact) return
    const currentContact = selectedContact

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      const activeElement = document.activeElement
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'SELECT') return

      e.preventDefault()
      const currentIndex = filteredContacts.findIndex(c => c.id === currentContact.id)
      if (currentIndex === -1) return

      const newIndex = e.key === 'ArrowUp'
        ? (currentIndex > 0 ? currentIndex - 1 : filteredContacts.length - 1)
        : (currentIndex < filteredContacts.length - 1 ? currentIndex + 1 : 0)

      const newContact = filteredContacts[newIndex]
      if (newContact) {
        setSelectedContact(newContact)
        if (gridApi) {
          gridApi.ensureIndexVisible(newIndex, 'middle')
          // Highlight the row
          gridApi.deselectAll()
          const rowNode = gridApi.getRowNode(newContact.id)
          if (rowNode) rowNode.setSelected(true, true)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, isCreating, selectedContact, filteredContacts, gridApi])

  // Toggle column visibility
  const toggleColumn = (key: string) => {
    const newVisible = new Set(visibleColumns)
    if (newVisible.has(key)) {
      newVisible.delete(key)
    } else {
      newVisible.add(key)
    }
    setVisibleColumns(newVisible)
  }

  // Generate column definitions based on visibility
  const columnDefs: ColDef<Contact>[] = useMemo(() => {
    // Checkbox selection column (always first)
    const checkboxCol: ColDef<Contact> = {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      maxWidth: 50,
      minWidth: 50,
      resizable: false,
      sortable: false,
      lockPosition: 'left',
      suppressMovable: true,
    }

    const dataCols: ColDef<Contact>[] = ALL_COLUMNS
      .filter(col => visibleColumns.has(col.key))
      .map(col => {
        const baseDef: ColDef<Contact> = {
          headerName: col.label,
          field: col.field as keyof Contact | undefined,
          flex: 1,
          minWidth: 100,
          resizable: true,
          // Make all columns editable EXCEPT Name and Company
          editable: col.key !== 'full_name' && col.key !== 'company' && col.key !== 'pipeline',
        }

        // Special handling for certain columns
        if ('cellRenderer' in col && col.cellRenderer) {
          baseDef.cellRenderer = col.cellRenderer as any
          baseDef.width = col.key === 'stage' ? 140 : 160
          baseDef.flex = undefined
          baseDef.editable = false // Columns with custom renderers are not editable inline
        }

        if (col.key === 'updated_at') {
          baseDef.valueFormatter = (params) => formatRelativeTime(params.value)
          baseDef.width = 120
          baseDef.flex = undefined
          baseDef.editable = false // Date columns not editable inline
        }

        if (col.key === 'created_at' || col.key === 'meeting_date' || col.key === 'next_touchpoint') {
          baseDef.valueFormatter = (params) => formatDate(params.value)
        }

        if (col.key === 'full_name') {
          baseDef.valueGetter = (params) => params.data?.full_name || `${params.data?.first_name || ''} ${params.data?.last_name || ''}`.trim()
          baseDef.minWidth = 150
          baseDef.editable = false
        }

        return baseDef
      })

    return [checkboxCol, ...dataCols]
  }, [visibleColumns])

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api)
  }, [])

  const onCellClicked = useCallback((event: CellClickedEvent<Contact>) => {
    if (!event.data) return

    // Get column key from colDef
    const colKey = event.colDef.field || (event.colDef as any).colId

    // Only open side panel for Name and Company columns
    // - Editable columns: AG Grid handles edit mode via singleClickEdit
    // - Stage/Pipeline: Have custom dropdown renderers that handle their own clicks
    // - Checkbox: Just selects the row
    const columnsToOpenSidePanel = ['full_name', 'company']

    if (columnsToOpenSidePanel.includes(colKey as string)) {
      handleOpenContact(event.data)
      // Highlight the row
      event.api.deselectAll()
      event.node.setSelected(true, true)
    }
  }, [handleOpenContact])

  const getRowId = useCallback((params: { data: Contact }) => params.data.id, [])

  // Handle inline cell editing
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent<Contact>) => {
    const { data, colDef, newValue } = event
    if (!data || !colDef.field) return

    // Update the contact in the database
    await updateContact(data.id, { [colDef.field]: newValue })
  }, [updateContact])

  if (loading.contacts) {
    return <LoadingSkeleton rows={8} />
  }

  return (
    <div style={{ padding: 16, width: '100%', maxWidth: '100%', boxSizing: 'border-box', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 16 }}>
        <h1 style={{ fontSize: theme.fontSize['2xl'], fontWeight: theme.fontWeight.bold, color: theme.text.primary, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Users size={24} style={{ color: theme.entity.contact }} />
          Contacts
        </h1>
        <p style={{ fontSize: '1.02rem', color: theme.text.muted, margin: 0 }}>
          {filteredContacts.length} of {contacts.length} {contacts.length === 1 ? 'lead' : 'leads'}
        </p>
      </div>

      {/* Search & Filter/Sort Bar */}
      <div style={{ marginBottom: 24, padding: '12px 16px', backgroundColor: theme.bg.card, borderRadius: theme.radius.lg, border: `1px solid ${theme.border.subtle}`, position: 'relative', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            placeholder="Search leads..."
            style={{ width: 200, flexShrink: 0 }}
          />

          <div style={{ flex: 1 }}>
            <SortDropdown sorts={sorts} onUpdateSorts={setSorts} />
          </div>

          {/* Column Picker */}
          <div style={{ position: 'relative' }} ref={columnPickerRef}>
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium,
                color: theme.text.primary, backgroundColor: theme.bg.card,
                border: `1px solid ${theme.border.default}`, borderRadius: theme.radius.md,
                cursor: 'pointer', transition: `all ${theme.transition.fast}`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.border.strong}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.border.default}
            >
              <Columns size={14} />
              <span>Columns</span>
            </button>

            <AnimatePresence>
              {showColumnPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    minWidth: 220, maxHeight: 400, overflowY: 'auto',
                    backgroundColor: theme.bg.elevated, border: `1px solid ${theme.border.default}`,
                    borderRadius: 12, boxShadow: theme.shadow.dropdown, zIndex: 9999,
                  }}
                >
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border.subtle}` }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary }}>Show Columns</span>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    {ALL_COLUMNS.map(col => (
                      <button
                        key={col.key}
                        onClick={() => toggleColumn(col.key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '8px 16px', backgroundColor: 'transparent', border: 'none',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {visibleColumns.has(col.key) ? (
                          <Eye size={14} style={{ color: theme.accent.primary }} />
                        ) : (
                          <EyeOff size={14} style={{ color: theme.text.muted }} />
                        )}
                        <span style={{ fontSize: 13, color: visibleColumns.has(col.key) ? theme.text.primary : theme.text.muted }}>
                          {col.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter Button */}
          <div style={{ position: 'relative' }} ref={filterPopoverRef}>
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium,
                color: '#fff', backgroundColor: theme.accent.primary,
                border: `1px solid ${theme.accent.primary}`, borderRadius: theme.radius.md,
                cursor: 'pointer', transition: `all ${theme.transition.fast}`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.primaryHover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.accent.primary}
            >
              <Filter size={14} />
              <span>Filter</span>
              {filters.length > 0 && (
                <span style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: theme.radius.full, padding: '1px 6px', fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold }}>
                  {filters.length}
                </span>
              )}
            </button>

            {/* Filter Popover */}
            <AnimatePresence>
              {showFilterMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    minWidth: 580, backgroundColor: theme.bg.elevated,
                    border: `1px solid ${theme.border.default}`, borderRadius: 12,
                    boxShadow: theme.shadow.dropdown, zIndex: 9999, overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border.subtle}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: theme.text.primary }}>Filter</span>
                    {filters.length > 0 && (
                      <button
                        onClick={() => { setFilters([]); setFilterGroups([]) }}
                        style={{ fontSize: 12, color: theme.text.muted, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div style={{ padding: '8px 16px' }}>
                    {filters.length === 0 ? (
                      <div style={{ padding: '16px 0', textAlign: 'center', color: theme.text.muted, fontSize: 13 }}>No filters applied</div>
                    ) : (
                      (() => {
                        const ungroupedFilters = filters.filter(f => !f.groupId)
                        const groupedFiltersByGroup = filterGroups.map(group => ({ group, filters: filters.filter(f => f.groupId === group.id) })).filter(g => g.filters.length > 0)

                        const renderFilterRow = (filter: StackedFilter, isFirst: boolean, isInGroup: boolean) => {
                          const fieldDef = FILTER_FIELDS.find(f => f.key === filter.field)
                          const FieldIcon = fieldDef?.icon || Building2
                          const operators = fieldDef?.type === 'select' ? SELECT_OPERATORS : TEXT_OPERATORS
                          const showValueInput = !['is_empty', 'is_not_empty'].includes(filter.operator)

                          return (
                            <motion.div key={filter.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', paddingLeft: isInGroup ? 48 : 0 }}>
                              {isFirst ? (
                                <span style={{ fontSize: 13, color: theme.text.muted, width: 48, flexShrink: 0 }}>Where</span>
                              ) : (
                                <button onClick={() => toggleConjunction(filter.id)} style={{ fontSize: 13, color: filter.conjunction === 'or' ? theme.accent.primary : theme.text.muted, width: 48, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontWeight: filter.conjunction === 'or' ? 600 : 400 }} title="Click to toggle">
                                  {filter.conjunction}
                                </button>
                              )}
                              {!isFirst && isInGroup && <span style={{ width: 48, flexShrink: 0 }} />}
                              <FilterSelect options={FILTER_FIELDS.map(field => ({ value: field.key, label: field.label }))} value={filter.field} onChange={(value) => updateFilterField(filter.id, value)} icon={<FieldIcon size={14} style={{ color: '#f59e0b' }} />} minWidth={130} />
                              <FilterSelect options={operators.map(op => ({ value: op.value, label: op.label }))} value={filter.operator} onChange={(value) => updateFilterOperator(filter.id, value)} minWidth={110} />
                              {showValueInput && (
                                fieldDef?.type === 'select' ? (
                                  <div style={{ flex: 1, minWidth: 120 }}>
                                    <FilterSelect options={[{ value: '', label: 'Select...' }, ...fieldDef.options.map(opt => ({ value: opt.value, label: opt.label }))]} value={filter.value} onChange={(value) => updateFilter(filter.id, value)} placeholder="Select..." minWidth={120} />
                                  </div>
                                ) : (
                                  <input type="text" value={filter.value} onChange={(e) => updateFilter(filter.id, e.target.value)} placeholder="Enter a value" style={{ flex: 1, padding: '6px 10px', fontSize: 13, color: theme.text.primary, backgroundColor: theme.bg.elevated, border: `1px solid ${theme.border.default}`, borderRadius: 6, outline: 'none', minWidth: 120 }} />
                                )
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
                                <button onClick={() => removeFilter(filter.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, backgroundColor: 'transparent', border: 'none', borderRadius: 4, color: theme.text.muted, cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = theme.text.muted }}>
                                  <Trash2 size={14} />
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, color: '#d1d5db', cursor: 'grab' }}>
                                  <GripVertical size={14} />
                                </div>
                              </div>
                            </motion.div>
                          )
                        }

                        return (
                          <>
                            {ungroupedFilters.map((filter, idx) => renderFilterRow(filter, idx === 0, false))}
                            {groupedFiltersByGroup.map(({ group, filters: groupFilters }, groupIdx) => {
                              const isFirstGroup = ungroupedFilters.length === 0 && groupIdx === 0
                              return (
                                <div key={group.id} style={{ marginTop: groupIdx > 0 || ungroupedFilters.length > 0 ? 12 : 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingLeft: 48 }}>
                                    <span style={{ fontSize: 13, color: theme.text.muted, fontWeight: 500 }}>{isFirstGroup ? 'Where' : 'and'} (</span>
                                    <button onClick={() => removeFilterGroup(group.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, backgroundColor: 'transparent', border: 'none', borderRadius: 4, color: theme.text.muted, cursor: 'pointer', padding: 0 }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = theme.text.muted }}>
                                      <X size={12} />
                                    </button>
                                    <span style={{ fontSize: 13, color: theme.text.muted, fontWeight: 500 }}>)</span>
                                  </div>
                                  {groupFilters.map((filter, idx) => renderFilterRow(filter, idx === 0, true))}
                                </div>
                              )
                            })}
                          </>
                        )
                      })()
                    )}
                  </div>

                  <div style={{ padding: '12px 16px', borderTop: `1px solid ${theme.border.subtle}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => addFilter()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 13, fontWeight: 500, color: theme.accent.primary, backgroundColor: 'transparent', border: `1px solid ${theme.border.default}`, borderRadius: 6, cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.accent.primaryBg} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Plus size={14} />
                      Add condition
                    </button>
                    <button onClick={addFilterGroup} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', fontSize: 13, fontWeight: 500, color: theme.text.muted, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <Plus size={14} />
                      Add condition group
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
          description={debouncedQuery ? 'Try adjusting your search terms' : 'Start by adding your first lead to the CRM'}
          action={!debouncedQuery ? { label: 'Add Lead', onClick: handleCreateContact, icon: <Plus size={16} /> } : undefined}
        />
      ) : (
        <Card padding="none" style={{ width: '100%', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="ag-theme-alpine-dark" style={{ width: '100%', height: 'calc(100vh - 135px)', minHeight: 500 }}>
            <AgGridReact<Contact>
              theme="legacy"
              rowData={filteredContacts}
              columnDefs={columnDefs}
              defaultColDef={{
                resizable: true,
                sortable: false,
              }}
              onGridReady={onGridReady}
              onCellClicked={onCellClicked}
              onCellValueChanged={onCellValueChanged}
              rowSelection="multiple"
              suppressRowClickSelection={true}
              singleClickEdit={true}
              stopEditingWhenCellsLoseFocus={true}
              pagination={true}
              paginationPageSize={100}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              animateRows={false}
              getRowId={getRowId}
              rowHeight={44}
              headerHeight={40}
              suppressCellFocus={false}
              rowDragManaged={false}
            />
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
