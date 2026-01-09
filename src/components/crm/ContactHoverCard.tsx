import { memo } from 'react'
import { motion } from 'framer-motion'
import { 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  Circle,
  ExternalLink,
  Briefcase
} from 'lucide-react'
import { CRM_STAGES, type CRMContact } from '../../types/crm'

interface ContactHoverCardProps {
  contact: CRMContact
  position: { top: number; left: number }
  onOpenDetail: () => void
}

// Pipeline stages for quick visualization
const PIPELINE_STAGES = [
  { key: 'meeting_booked' as const, label: 'Meeting' },
  { key: 'showed_up_to_disco' as const, label: 'Disco' },
  { key: 'qualified' as const, label: 'Qualified' },
  { key: 'demo_booked' as const, label: 'Demo' },
  { key: 'proposal_sent' as const, label: 'Proposal' },
  { key: 'closed' as const, label: 'Closed' },
]

function ContactHoverCard({ contact, position, onOpenDetail }: ContactHoverCardProps) {
  const stage = CRM_STAGES.find((s) => s.id === contact.stage) || CRM_STAGES[0]
  
  // Count pipeline progress
  const completedStages = PIPELINE_STAGES.filter(s => Boolean(contact[s.key])).length

  // Get initials
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

  // Format next touchpoint
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
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 100,
      }}
      className="w-80 bg-rillation-card border border-rillation-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with gradient */}
      <div 
        className="px-4 py-3 border-b border-rillation-border"
        style={{ background: `linear-gradient(135deg, ${stage.color}15, transparent)` }}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-rillation-card-hover border border-rillation-border rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-rillation-text-muted">
              {getInitials()}
            </span>
          </div>
          
          {/* Name & Title */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-rillation-text truncate">
              {contact.full_name || contact.email}
            </h3>
            {contact.job_title && (
              <p className="text-xs text-rillation-text-muted truncate flex items-center gap-1">
                <Briefcase size={10} />
                {contact.job_title}
              </p>
            )}
          </div>

          {/* Stage Badge */}
          <div
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{ 
              backgroundColor: `${stage.color}20`,
              color: stage.color 
            }}
          >
            {stage.label}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Company */}
        {contact.company && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 size={14} className="text-rillation-text-muted flex-shrink-0" />
            <span className="text-rillation-text truncate">{contact.company}</span>
          </div>
        )}

        {/* Email */}
        {contact.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-rillation-text-muted flex-shrink-0" />
            <a 
              href={`mailto:${contact.email}`}
              className="text-blue-400 hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {contact.email}
            </a>
          </div>
        )}

        {/* Phone */}
        {contact.lead_phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone size={14} className="text-rillation-text-muted flex-shrink-0" />
            <a 
              href={`tel:${contact.lead_phone}`}
              className="text-rillation-text hover:text-rillation-text-muted"
              onClick={(e) => e.stopPropagation()}
            >
              {contact.lead_phone}
            </a>
          </div>
        )}

        {/* Next Touchpoint */}
        {nextTouchpoint && (
          <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-400' : ''}`}>
            <Calendar size={14} className="flex-shrink-0" />
            <span>Next: {nextTouchpoint}</span>
          </div>
        )}

        {/* Pipeline Progress */}
        <div className="pt-2 border-t border-rillation-border/50">
          <p className="text-xs text-rillation-text-muted mb-2">
            Pipeline Progress ({completedStages}/{PIPELINE_STAGES.length})
          </p>
          <div className="flex items-center gap-1">
            {PIPELINE_STAGES.map((pStage) => {
              const isComplete = Boolean(contact[pStage.key])
              return (
                <div
                  key={pStage.key}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={pStage.label}
                >
                  {isComplete ? (
                    <CheckCircle2 size={16} className="text-rillation-green" />
                  ) : (
                    <Circle size={16} className="text-rillation-text-muted/30" />
                  )}
                  <span className="text-[10px] text-rillation-text-muted truncate w-full text-center">
                    {pStage.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <motion.button
        onClick={onOpenDetail}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        whileTap={{ scale: 0.98 }}
        className="w-full px-4 py-2.5 border-t border-rillation-border text-sm text-rillation-text-muted hover:text-rillation-text flex items-center justify-center gap-2 transition-colors"
      >
        View Full Details
        <ExternalLink size={14} />
      </motion.button>
    </motion.div>
  )
}

export default memo(ContactHoverCard)
