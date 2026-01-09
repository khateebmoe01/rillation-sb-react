import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Building2, Calendar, Mail, GripVertical } from 'lucide-react'
import type { CRMContact } from '../../types/crm'

interface ContactCardProps {
  contact: CRMContact
  onClick: () => void
  isDragging?: boolean
}

function ContactCard({ contact, onClick, isDragging }: ContactCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: contact.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Get initials for avatar
  const getInitials = () => {
    if (contact.first_name && contact.last_name) {
      return `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase()
    }
    if (contact.full_name) {
      const parts = contact.full_name.split(' ')
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : contact.full_name.substring(0, 2).toUpperCase()
    }
    return contact.email?.substring(0, 2).toUpperCase() || '??'
  }

  // Format next touchpoint date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const nextTouchpoint = formatDate(contact.next_touchpoint)
  const isOverdue = contact.next_touchpoint && new Date(contact.next_touchpoint) < new Date()

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout="position"
      initial={false}
      animate={{ opacity: isDragging ? 0.5 : 1 }}
      transition={{ duration: 0 }}
      className={`
        group bg-slate-800 border border-slate-700 rounded-xl p-3 
        cursor-pointer transition-none
        hover:border-slate-600 hover:shadow-lg hover:shadow-black/20
        ${isDragging ? 'shadow-xl shadow-black/40 rotate-2' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-none cursor-grab active:cursor-grabbing mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} className="text-slate-400" />
        </div>

        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-slate-300">
            {getInitials()}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">
            {contact.full_name || contact.email}
          </h4>
          
          {contact.company && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-400">
              <Building2 size={12} />
              <span className="truncate">{contact.company}</span>
            </div>
          )}
          
          {contact.email && !contact.company && (
            <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-400">
              <Mail size={12} />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {(nextTouchpoint || contact.lead_source) && (
        <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between">
          {nextTouchpoint && (
            <div className={`flex items-center gap-1.5 text-xs ${
              isOverdue ? 'text-red-400' : 'text-slate-400'
            }`}>
              <Calendar size={12} />
              <span>{nextTouchpoint}</span>
            </div>
          )}
          
          {contact.lead_source && (
            <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-full text-slate-300">
              {contact.lead_source}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default memo(ContactCard)
