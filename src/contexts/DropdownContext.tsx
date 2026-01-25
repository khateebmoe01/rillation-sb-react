import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface DropdownContextType {
  openDropdownId: string | null
  isOpen: (id: string) => boolean
  open: (id: string) => void
  close: () => void
  toggle: (id: string) => void
}

const DropdownContext = createContext<DropdownContextType | null>(null)

export function DropdownProvider({ children }: { children: ReactNode }) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  
  const isOpen = useCallback((id: string) => openDropdownId === id, [openDropdownId])
  const open = useCallback((id: string) => setOpenDropdownId(id), [])
  const close = useCallback(() => setOpenDropdownId(null), [])
  const toggle = useCallback((id: string) => {
    setOpenDropdownId(prev => prev === id ? null : id)
  }, [])
  
  return (
    <DropdownContext.Provider value={{ openDropdownId, isOpen, open, close, toggle }}>
      {children}
    </DropdownContext.Provider>
  )
}

export function useDropdownContext() {
  const context = useContext(DropdownContext)
  if (!context) {
    throw new Error('useDropdownContext must be used within a DropdownProvider')
  }
  return context
}

// Hook for individual dropdown components
export function useDropdown(id: string) {
  const context = useContext(DropdownContext)
  if (!context) {
    throw new Error('useDropdown must be used within a DropdownProvider')
  }
  
  return {
    isOpen: context.openDropdownId === id,
    open: () => context.open(id),
    close: context.close,
    toggle: () => context.toggle(id),
  }
}
