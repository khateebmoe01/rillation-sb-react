import { useState, useMemo, useRef, useEffect, useId, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Mail, Phone, Building2, Linkedin, ChevronDown, Check, Filter, X, Trash2, GripVertical, User, Briefcase, Tag, Clock, Factory, MapPin, DollarSign, Calendar, AtSign, Hash, TrendingUp } from 'lucide-react'
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
  
  // Sort state - Airtable-style multi-sort
  const [sorts, setSorts] = useState<SortRule[]>([])

  // Column definitions for resizable columns
  const COLUMN_DEFS = useMemo(() => [
    { key: 'name', label: 'Name', defaultWidth: 165, minWidth: 90 },
    { key: 'company', label: 'Company', defaultWidth: 145, minWidth: 90 },
    { key: 'stage', label: 'Stage', defaultWidth: 130, minWidth: 90 },
    { key: 'pipeline', label: 'Pipeline', defaultWidth: 130, minWidth: 90 },
    { key: 'title', label: 'Title', defaultWidth: 165, minWidth: 70 },
    { key: 'lastActivity', label: 'Last Activity', defaultWidth: 110, minWidth: 70 },
    { key: 'actions', label: 'Actions', defaultWidth: 90, minWidth: 70 },
  ], [])

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

  // Generate grid columns string from widths
  const gridColumns = useMemo(() => {
    return COLUMN_DEFS.map(col => `${columnWidths[col.key] || col.defaultWidth}px`).join(' ')
  }, [COLUMN_DEFS, columnWidths])

  const minTableWidth = useMemo(() => {
    return COLUMN_DEFS.reduce((sum, col) => sum + (col.minWidth || 50), 0)
  }, [COLUMN_DEFS])

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
  
  // Single-click to open or switch contact in side panel
  const handleOpenContact = (contact: Contact) => {
    setSelectedContact(contact)
    setIsCreating(false)
    setIsModalOpen(true)
  }
  
  const handleCreateContact = () => {
    setSelectedContact(null)
    setIsCreating(true)
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
      
      const currentIndex = filteredContacts.findIndex(c => c.id === currentContact.id)
      if (currentIndex === -1) return
      
      let newIndex: number
      if (e.key === 'ArrowUp') {
        newIndex = currentIndex > 0 ? currentIndex - 1 : filteredContacts.length - 1
      } else {
        newIndex = currentIndex < filteredContacts.length - 1 ? currentIndex + 1 : 0
      }
      
      const newContact = filteredContacts[newIndex]
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
  }, [isModalOpen, isCreating, selectedContact, filteredContacts])
  
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
          
          {/* Add Lead Button */}
          <button
            onClick={handleCreateContact}
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
            <Plus size={14} />
            <span>Add Lead</span>
          </button>
          
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
          action={
            !debouncedQuery
              ? { label: 'Add Lead', onClick: handleCreateContact, icon: <Plus size={16} /> }
              : undefined
          }
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
          <div style={{
            overflowX: 'auto',
            overflowY: 'auto',
            width: '100%',
            flex: 1,
            scrollbarWidth: 'thin',
            scrollbarColor: `${theme.border.default} transparent`,
          }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: gridColumns,
                gap: '0 20px',
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom: `1px solid ${theme.border.subtle}`,
                backgroundColor: theme.bg.muted,
                minWidth: minTableWidth,
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              {COLUMN_DEFS.map((col, index) => (
                <ResizableTableHeader
                  key={col.key}
                  columnKey={col.key}
                  currentWidth={columnWidths[col.key] || col.defaultWidth}
                  onResize={handleColumnResize}
                  onResetWidth={handleResetColumnWidth}
                  isLast={index === COLUMN_DEFS.length - 1}
                >
                  {col.label}
                </ResizableTableHeader>
              ))}
            </div>
            
            {/* Table Rows - no animation for instant search */}
            {filteredContacts.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                isSelected={selectedContact?.id === contact.id}
                gridColumns={gridColumns}
                minWidth={minTableWidth}
                onClick={() => handleOpenContact(contact)}
                onUpdateStage={(stage) => updateContact(contact.id, { stage })}
                onUpdatePipelineStep={(step, value) => updateContact(contact.id, { [step]: value })}
              />
            ))}
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
          fontSize: theme.fontSize.xs,
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

function ContactRow({ contact, isSelected, gridColumns, minWidth, onClick, onUpdateStage, onUpdatePipelineStep }: ContactRowProps) {
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
        gap: '0 20px',
        alignItems: 'center',
        padding: '10px 16px',
        borderBottom: `1px solid ${theme.border.subtle}`,
        backgroundColor: isSelected ? theme.bg.hover : 'transparent',
        cursor: 'pointer',
        minWidth: minWidth,
        boxShadow: isSelected ? `inset 3px 0 0 0 ${theme.accent.primary}` : 'none',
        transition: `background-color 0.15s ease`,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = theme.bg.hover
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isSelected ? theme.bg.hover : 'transparent'
      }}
    >
      {/* Name with stage-colored left border */}
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
      
      {/* Company */}
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
      
      {/* Stage */}
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
      
      {/* Pipeline Progress Dropdown */}
      <div 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <PipelineProgressDropdown
          contact={contact}
          onUpdateStep={onUpdatePipelineStep}
        />
      </div>
      
      {/* Title */}
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
      
      {/* Last Activity */}
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
      
      {/* Actions */}
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
    </div>
  )
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

