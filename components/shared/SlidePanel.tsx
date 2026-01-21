import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { theme } from '../../config/theme'
import { IconButton } from './Button'

interface SlidePanelProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  width?: number | string
  showClose?: boolean
  header?: ReactNode
}

export function SlidePanel({
  isOpen,
  onClose,
  title,
  children,
  width = 460,
  showClose = true,
  header,
}: SlidePanelProps) {
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
          {/* Backdrop - semi-transparent to keep table visible */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: theme.z.modal,
            }}
          />
          
          {/* Slide Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: typeof width === 'number' ? `${width}px` : width,
              maxWidth: '100vw',
              backgroundColor: theme.bg.elevated,
              borderLeft: `1px solid ${theme.border.default}`,
              boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.3)',
              zIndex: theme.z.modal + 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '20px 24px',
                borderBottom: `1px solid ${theme.border.subtle}`,
                backgroundColor: theme.bg.card,
              }}
            >
              {header ? (
                <div style={{ flex: 1, minWidth: 0 }}>{header}</div>
              ) : (
                <h2
                  style={{
                    fontSize: theme.fontSize.xl,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.text.primary,
                    margin: 0,
                  }}
                >
                  {title}
                </h2>
              )}
              {showClose && (
                <IconButton
                  icon={<X size={20} />}
                  label="Close"
                  onClick={onClose}
                  size="md"
                  style={{ marginLeft: 12, flexShrink: 0 }}
                />
              )}
            </div>
            
            {/* Content - scrollable */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: 24,
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

// Panel footer for actions
interface PanelFooterProps {
  children: ReactNode
}

export function PanelFooter({ children }: PanelFooterProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
        paddingTop: 20,
        borderTop: `1px solid ${theme.border.subtle}`,
      }}
    >
      {children}
    </div>
  )
}
