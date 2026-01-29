import { ReactNode } from 'react'
import { theme } from '../../config/theme'

interface CRMLayoutProps {
  children: ReactNode
}

export function CRMLayout({ children }: CRMLayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        backgroundColor: theme.bg.page,
      }}
    >
      {/* Main Content - No sidebar, uses main app sidebar */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: theme.bg.page,
          minHeight: 0,
        }}
      >
        <div style={{ minHeight: '100%' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
