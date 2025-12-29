import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  children: ReactNode
  isOpen: boolean
}

export default function ModalPortal({ children, isOpen }: ModalPortalProps) {
  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {children}
    </div>,
    document.body
  )
}

