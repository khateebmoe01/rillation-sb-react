import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <div className="h-full flex flex-col bg-crm-bg p-6">
      {/* Header - Single Row */}
      <div className="flex-shrink-0 mb-4 flex flex-wrap items-center gap-3">
        {/* Title */}
        <h1 className="text-xl font-bold text-crm-text mr-2">CRM</h1>

        {/* Search with count */}
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-text-muted" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 bg-crm-card border border-crm-border rounded-lg text-sm text-crm-text placeholder:text-crm-text-muted focus:outline-none focus:border-crm-text-muted w-36 sm:w-48 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-crm-card-hover rounded"
            >
              <X size={12} className="text-crm-text-muted" />
            </button>
          )}
          <span className="ml-2 text-sm text-crm-text-muted whitespace-nowrap">
            {contacts.length} contacts
          </span>
        </div>

        {/* Filters - Inline */}
        <CRMFilters
          filters={filters}
          onFiltersChange={setFilters}
          uniqueAssignees={uniqueAssignees}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Toggle */}
        <div className="flex items-center bg-crm-card border border-crm-border rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'kanban'
                ? 'bg-crm-card-hover text-crm-text'
                : 'text-crm-text-muted hover:text-crm-text'
            }`}
            title="Kanban view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-crm-card-hover text-crm-text'
                : 'text-crm-text-muted hover:text-crm-text'
            }`}
            title="List view"
          >
            <List size={16} />
          </button>
        </div>

        {/* Add Contact Button */}
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-crm-checkbox text-white font-medium rounded-lg hover:bg-crm-checkbox-hover transition-colors text-sm"
          title="Press 'n' to add a new contact"
        >
          <motion.div
            animate={{ rotate: [0, 0, 0] }}
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <Plus size={16} />
          </motion.div>
          <span className="hidden sm:inline">Add</span>
        </motion.button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-crm-text border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {viewMode === 'kanban' ? (
              <motion.div
                key="kanban"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <KanbanBoard
                  contactsByStage={contactsByStage}
                  onContactSelect={handleContactSelect}
                  onStageChange={handleStageChange}
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <ContactsTable
                  contacts={contacts}
                  onContactSelect={handleContactSelect}
                  onContactUpdate={handleContactUpdate}
                  sort={sort}
                  onSortChange={setSort}
                  selectedRowIndex={selectedRowIndex}
                  onSelectedRowChange={setSelectedRowIndex}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
