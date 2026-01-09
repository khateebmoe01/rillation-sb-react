import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import ContactCard from './ContactCard'
import type { CRMContact } from '../../types/crm'

interface StageColumnProps {
  stage: {
    id: string
    label: string
    color: string
  }
  contacts: CRMContact[]
  onContactSelect: (contact: CRMContact) => void
}

export default function StageColumn({ stage, contacts, onContactSelect }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  return (
    <div className="flex flex-col w-72 flex-shrink-0 h-full">
      {/* Header */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-medium text-rillation-text">{stage.label}</h3>
          <span className="ml-auto text-sm text-rillation-text-muted bg-rillation-card-hover px-2 py-0.5 rounded-full">
            {contacts.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <motion.div
        ref={setNodeRef}
        className={`
          flex-1 min-h-0 overflow-y-auto rounded-xl p-2 transition-none
          ${isOver ? 'bg-rillation-card-hover/50 ring-2 ring-rillation-text-muted/20' : 'bg-rillation-bg/50'}
        `}
        animate={{
          backgroundColor: isOver ? 'rgba(28, 33, 40, 0.5)' : 'rgba(13, 17, 23, 0.5)',
        }}
        transition={{ duration: 0 }}
      >
        <SortableContext
          items={contacts.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-rillation-text-muted text-sm">
                No contacts
              </div>
            ) : (
              contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onClick={() => onContactSelect(contact)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </motion.div>
    </div>
  )
}
