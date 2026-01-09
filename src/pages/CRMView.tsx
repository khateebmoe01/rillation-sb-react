import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { LayoutGrid, List, Plus, Search, X } from 'lucide-react'
import { useCRMContacts } from '../hooks/useCRMContacts'
import KanbanBoard from '../components/crm/KanbanBoard'
import ContactsTable from '../components/crm/ContactsTable'
import ContactDetailPanel from '../components/crm/ContactDetailPanel'
import QuickAddContact from '../components/crm/QuickAddContact'
import CRMFilters from '../components/crm/CRMFilters'
import type { CRMContact, CRMViewMode, CRMFilters as CRMFiltersType, CRMSort } from '../types/crm'

export default function CRMView() {
  const [viewMode, setViewMode] = useState<CRMViewMode>('list')
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [filters, setFilters] = useState<CRMFiltersType>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<CRMSort | undefined>(undefined)
  
  // Keyboard navigation state
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Memoize active filters to prevent infinite re-renders
  const activeFilters = useMemo(() => ({
    ...filters,
    search: searchQuery || undefined,
  }), [filters, searchQuery])

  const {
    contacts,
    loading,
    error,
    updateContact,
    createContact,
    deleteContact,
    updateStage,
    updateEstimatedValue,
    contactsByStage,
    uniqueAssignees,
  } = useCRMContacts({ filters: activeFilters, sort })

  // Handle contact selection
  const handleContactSelect = useCallback((contact: CRMContact) => {
    setSelectedContact(contact)
  }, [])

  // Handle contact close
  const handleContactClose = useCallback(() => {
    setSelectedContact(null)
  }, [])

  // Handle contact update from detail panel
  const handleContactUpdate = useCallback(async (id: string, updates: Partial<CRMContact>) => {
    const success = await updateContact(id, updates)
    if (success && selectedContact?.id === id) {
      setSelectedContact(prev => prev ? { ...prev, ...updates } : null)
    }
    return success
  }, [updateContact, selectedContact])

  // Handle new contact creation
  const handleCreateContact = useCallback(async (contact: Partial<CRMContact>) => {
    const newContact = await createContact(contact)
    if (newContact) {
      setIsAddModalOpen(false)
      setSelectedContact(newContact)
    }
    return newContact
  }, [createContact])

  // Handle stage change (for kanban drag)
  const handleStageChange = useCallback(async (contactId: string, newStage: string) => {
    await updateStage(contactId, newStage)
  }, [updateStage])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow Escape to blur the input
        if (e.key === 'Escape') {
          target.blur()
        }
        return
      }

      // Only handle keyboard nav in list view
      if (viewMode !== 'list') return

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault()
          setSelectedRowIndex(prev => {
            const next = prev + 1
            return next >= contacts.length ? contacts.length - 1 : next
          })
          break
          
        case 'k':
        case 'ArrowUp':
          e.preventDefault()
          setSelectedRowIndex(prev => {
            const next = prev - 1
            return next < 0 ? 0 : next
          })
          break
          
        case 'Enter':
          if (selectedRowIndex >= 0 && selectedRowIndex < contacts.length) {
            e.preventDefault()
            setSelectedContact(contacts[selectedRowIndex])
          }
          break
          
        case 'Escape':
          if (selectedContact) {
            e.preventDefault()
            setSelectedContact(null)
          } else if (isAddModalOpen) {
            e.preventDefault()
            setIsAddModalOpen(false)
          } else if (selectedRowIndex >= 0) {
            e.preventDefault()
            setSelectedRowIndex(-1)
          }
          break
          
        case 'n':
          if (!selectedContact) {
            e.preventDefault()
            setIsAddModalOpen(true)
          }
          break
          
        case '/':
          e.preventDefault()
          searchInputRef.current?.focus()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, contacts, selectedRowIndex, selectedContact, isAddModalOpen])

  // Reset selected row when contacts change
  useEffect(() => {
    setSelectedRowIndex(-1)
  }, [contacts.length])

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#0c1929' }}>
      {/* Top Bar - Airtable Style */}
      <div className="flex-shrink-0 bg-[#0f2847] border-b border-[#1e3a5f] mt-2 mx-4 rounded-xl">
        {/* Primary Row */}
        <div className="flex items-center h-12 px-5 gap-4">
          {/* View Tabs */}
          <div className="flex items-center gap-1 bg-[#0c1929] rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-none ${
                viewMode === 'list'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-blue-300/50 hover:text-blue-300 hover:bg-blue-500/10'
              }`}
            >
              <List size={15} />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-none ${
                viewMode === 'kanban'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-blue-300/50 hover:text-blue-300 hover:bg-blue-500/10'
              }`}
            >
              <LayoutGrid size={15} />
              <span>Kanban</span>
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-[#1e3a5f]" />

          {/* Filters */}
          <CRMFilters
            filters={filters}
            onFiltersChange={setFilters}
            uniqueAssignees={uniqueAssignees}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search */}
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/50" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="🔍 Find a record..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-[#0c1929] border border-[#1e3a5f] rounded-lg text-sm text-rillation-text placeholder:text-blue-300/40 focus:outline-none focus:border-blue-400/50 w-48 transition-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-blue-500/20 rounded"
              >
                <X size={12} className="text-blue-300/60" />
              </button>
            )}
          </div>

          {/* Record Count */}
          <span className="text-xs text-blue-300/60 font-medium">
            {contacts.length} records
          </span>

          {/* Divider */}
          <div className="w-px h-6 bg-[#1e3a5f]" />

          {/* Add Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-none"
            title="Press 'n' to add a new contact"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <div className="flex-1 min-h-0 overflow-hidden px-4 pt-4 pb-4">
          {viewMode === 'kanban' ? (
            <div className="h-full">
              <KanbanBoard
                contactsByStage={contactsByStage}
                onContactSelect={handleContactSelect}
                onStageChange={handleStageChange}
              />
            </div>
          ) : (
            <div className="h-full">
              <ContactsTable
                contacts={contacts}
                onContactSelect={handleContactSelect}
                onContactUpdate={handleContactUpdate}
                onEstimatedValueUpdate={updateEstimatedValue}
                sort={sort}
                onSortChange={setSort}
                selectedRowIndex={selectedRowIndex}
                onSelectedRowChange={setSelectedRowIndex}
              />
            </div>
          )}
        </div>
      )}

      {/* Contact Detail Panel (Slide-over) */}
      <AnimatePresence>
        {selectedContact && (
          <ContactDetailPanel
            contact={selectedContact}
            onClose={handleContactClose}
            onUpdate={handleContactUpdate}
            onDelete={deleteContact}
          />
        )}
      </AnimatePresence>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <QuickAddContact
            onClose={() => setIsAddModalOpen(false)}
            onCreate={handleCreateContact}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
