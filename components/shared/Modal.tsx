import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { theme } from '../../config/theme'
import { IconButton } from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showClose?: boolean
}

const sizeMap = {
  sm: 400,
  md: 520,
  lg: 680,
  xl: 900,
  full: '95vw',
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
}: ModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: theme.z.modal,
            }}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: typeof sizeMap[size] === 'number' ? sizeMap[size] : sizeMap[size],
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 64px)',
              backgroundColor: theme.bg.elevated,
              borderRadius: theme.radius['2xl'],
              border: `1px solid ${theme.border.default}`,
              boxShadow: theme.shadow.xl,
              zIndex: theme.z.modal + 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            {(title || showClose) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderBottom: `1px solid ${theme.border.subtle}`,
                }}
              >
                <h2
                  style={{
                    fontSize: theme.fontSize.lg,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.text.primary,
                    margin: 0,
                  }}
                >
                  {title}
                </h2>
                {showClose && (
                  <IconButton
                    icon={<X size={18} />}
                    label="Close"
                    onClick={onClose}
                    size="sm"
                  />
                )}
              </div>
            )}
            
            {/* Content */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: 20,
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// Modal footer for actions
interface ModalFooterProps {
  children: ReactNode
}

export function ModalFooter({ children }: ModalFooterProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
        paddingTop: 16,
        borderTop: `1px solid ${theme.border.subtle}`,
      }}
    >
      {children}
    </div>
  )
}
