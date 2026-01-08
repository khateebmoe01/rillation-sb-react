import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, List, Plus, Search, X } from 'lucide-react'
import { useCRMContacts } from '../hooks/useCRMContacts'
import KanbanBoard from '../components/crm/KanbanBoard'
import ContactsTable from '../components/crm/ContactsTable'
import ContactDetailPanel from '../components/crm/ContactDetailPanel'
import QuickAddContact from '../components/crm/QuickAddContact'
import CRMFilters from '../components/crm/CRMFilters'
import type { CRMContact, CRMViewMode, CRMFilters as CRMFiltersType } from '../types/crm'

export default function CRMView() {
  const [viewMode, setViewMode] = useState<CRMViewMode>('kanban')
  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [filters, setFilters] = useState<CRMFiltersType>({})
  const [searchQuery, setSearchQuery] = useState('')

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
  } = useCRMContacts({ filters: activeFilters })

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-rillation-text">CRM</h1>
            <p className="text-sm text-rillation-text-muted mt-1">
              {contacts.length} contacts • Rillation Revenue
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-rillation-text-muted" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-2 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text/30 w-48 sm:w-64 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-rillation-card-hover rounded"
                >
                  <X size={14} className="text-rillation-text-muted" />
                </button>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-rillation-card border border-rillation-border rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-rillation-card-hover text-rillation-text'
                    : 'text-rillation-text-muted hover:text-rillation-text'
                }`}
                title="Kanban view"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-rillation-card-hover text-rillation-text'
                    : 'text-rillation-text-muted hover:text-rillation-text'
                }`}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>

            {/* Add Contact Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Contact</span>
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <CRMFilters
          filters={filters}
          onFiltersChange={setFilters}
          uniqueAssignees={uniqueAssignees}
        />
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
          <div className="w-8 h-8 border-2 border-rillation-text border-t-transparent rounded-full animate-spin" />
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
