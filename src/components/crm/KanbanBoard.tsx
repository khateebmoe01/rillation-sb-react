import { useCallback, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import StageColumn from './StageColumn'
import ContactCard from './ContactCard'
import { CRM_STAGES, type CRMContact } from '../../types/crm'

interface KanbanBoardProps {
  contactsByStage: Record<string, CRMContact[]>
  onContactSelect: (contact: CRMContact) => void
  onStageChange: (contactId: string, newStage: string) => Promise<void>
}

export default function KanbanBoard({
  contactsByStage,
  onContactSelect,
  onStageChange,
}: KanbanBoardProps) {
  const [activeContact, setActiveContact] = useState<CRMContact | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const contactId = active.id as string

    // Find the contact across all stages
    for (const contacts of Object.values(contactsByStage)) {
      const contact = contacts.find((c) => c.id === contactId)
      if (contact) {
        setActiveContact(contact)
        break
      }
    }
  }, [contactsByStage])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveContact(null)

    if (!over) return

    const contactId = active.id as string
    const newStage = over.id as string

    // Find the current stage of the contact
    let currentStage: string | null = null
    for (const [stage, contacts] of Object.entries(contactsByStage)) {
      if (contacts.some((c) => c.id === contactId)) {
        currentStage = stage
        break
      }
    }

    // If dropped on a different stage, update it
    if (currentStage && currentStage !== newStage) {
      await onStageChange(contactId, newStage)
    }
  }, [contactsByStage, onStageChange])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max px-1">
          {CRM_STAGES.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              contacts={contactsByStage[stage.id] || []}
              onContactSelect={onContactSelect}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeContact && (
          <div className="w-72">
            <ContactCard
              contact={activeContact}
              onClick={() => {}}
              isDragging
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
