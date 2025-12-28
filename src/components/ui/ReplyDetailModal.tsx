import { X } from 'lucide-react'
import type { Reply } from '../../types/database'
import { formatDateForDisplay } from '../../lib/supabase'

interface ReplyDetailModalProps {
  isOpen: boolean
  onClose: () => void
  reply: Reply | null
}

export default function ReplyDetailModal({ isOpen, onClose, reply }: ReplyDetailModalProps) {
  if (!isOpen || !reply) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rillation-border">
          <h2 className="text-lg font-semibold text-rillation-text">Reply Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rillation-card-hover rounded-lg transition-colors"
          >
            <X size={20} className="text-rillation-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-auto max-h-[60vh] p-6 space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-rillation-text-muted mb-1">From</p>
              <p className="text-rillation-text font-medium">{reply.from_email}</p>
            </div>
            <div>
              <p className="text-xs text-rillation-text-muted mb-1">To</p>
              <p className="text-rillation-text font-medium">{reply.primary_to_email}</p>
            </div>
            <div>
              <p className="text-xs text-rillation-text-muted mb-1">Date Received</p>
              <p className="text-rillation-text">
                {formatDateForDisplay(new Date(reply.date_received))}
              </p>
            </div>
            <div>
              <p className="text-xs text-rillation-text-muted mb-1">Category</p>
              <p className="text-rillation-text font-medium">{reply.category || 'N/A'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-rillation-text-muted mb-1">Subject</p>
              <p className="text-rillation-text font-medium">{reply.subject || '(No Subject)'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-rillation-text-muted mb-1">Client</p>
              <p className="text-rillation-text">{reply.client || 'N/A'}</p>
            </div>
          </div>

          {/* Text Body */}
          <div>
            <p className="text-xs text-rillation-text-muted mb-2">Message</p>
            <div className="bg-rillation-bg rounded-lg p-4 border border-rillation-border">
              <p className="text-sm text-rillation-text whitespace-pre-wrap">
                {reply.text_body || '(No message body)'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}












