import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Building2, Zap, MessageSquare, Loader2, CheckCircle } from 'lucide-react'
import type { CRMContact } from '../../types/crm'

interface CloseWonConfirmModalProps {
  isOpen: boolean
  contact: CRMContact
  onConfirm: () => Promise<void>
  onCancel: () => void
  isProcessing: boolean
}

export default function CloseWonConfirmModal({
  isOpen,
  contact,
  onConfirm,
  onCancel,
  isProcessing,
}: CloseWonConfirmModalProps) {
  const [mounted, setMounted] = useState(false)

  // Ensure we only render portal after mount (for SSR safety)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const actions = [
    {
      icon: <Building2 size={18} className="text-emerald-400" />,
      title: 'Add to Clients',
      description: `Create client record for ${contact.company || 'this company'}`,
    },
    {
      icon: <Zap size={18} className="text-amber-400" />,
      title: 'Create Bison Workspace',
      description: 'Set up new workspace and generate API key',
    },
    {
      icon: <MessageSquare size={18} className="text-blue-400" />,
      title: 'Send Slack Notification',
      description: 'Notify the team about the new client',
    },
  ]

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[9999]"
            onClick={!isProcessing ? onCancel : undefined}
          />

          {/* Modal - centered using flexbox for reliability */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Close Won</h2>
                    <p className="text-sm text-slate-400">Confirm client conversion</p>
                  </div>
                </div>
                {!isProcessing && (
                  <button
                    onClick={onCancel}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X size={18} className="text-slate-400" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Warning */}
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6">
                  <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-200 font-medium">
                      Are you sure you want to close this deal?
                    </p>
                    <p className="text-sm text-amber-200/70 mt-1">
                      This will trigger the following actions for{' '}
                      <span className="font-medium text-white">
                        {contact.full_name || contact.email}
                      </span>
                      {contact.company && (
                        <>
                          {' '}from{' '}
                          <span className="font-medium text-white">{contact.company}</span>
                        </>
                      )}
                      :
                    </p>
                  </div>
                </div>

                {/* Actions List */}
                <div className="space-y-3">
                  {actions.map((action, index) => (
                    <motion.div
                      key={action.title}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="mt-0.5">{action.icon}</div>
                      <div>
                        <p className="text-sm font-medium text-white">{action.title}</p>
                        <p className="text-xs text-slate-400">{action.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 bg-slate-800/30">
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Confirm Close Won
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  // Use portal to render at document body level, ensuring proper centering
  // regardless of parent transforms from framer-motion
  if (!mounted) return null
  
  return createPortal(modalContent, document.body)
}
