import { useState, ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, Users, DollarSign, 
  CheckSquare, ChevronLeft, ChevronRight
} from 'lucide-react'
import { theme } from '../../config/theme'

interface CRMLayoutProps {
  children: ReactNode
}

const NAV_ITEMS = [
  { path: '/crm', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/crm/contacts', icon: Users, label: 'Contacts' },
  { path: '/crm/deals', icon: DollarSign, label: 'Deals' },
  { path: '/crm/tasks', icon: CheckSquare, label: 'Tasks' },
]

export function CRMLayout({ children }: CRMLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  
  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 64px)', // Account for main header
        backgroundColor: theme.bg.page,
      }}
    >
      {/* Sidebar */}
      <motion.nav
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.bg.card,
          borderRight: `1px solid ${theme.border.subtle}`,
          overflow: 'hidden',
        }}
      >
        {/* Logo / Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: collapsed ? '16px 12px' : '16px 20px',
            borderBottom: `1px solid ${theme.border.subtle}`,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                fontSize: theme.fontSize.lg,
                fontWeight: theme.fontWeight.bold,
                color: theme.text.primary,
                whiteSpace: 'nowrap',
              }}
            >
              Rillation CRM
            </motion.span>
          )}
        </div>
        
        {/* Navigation */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: '12px 8px',
          }}
        >
          {NAV_ITEMS.map(({ path, icon: Icon, label, exact }) => {
            const isActive = exact 
              ? location.pathname === path 
              : location.pathname.startsWith(path) && path !== '/crm'
            
            return (
              <NavLink
                key={path}
                to={path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: collapsed ? '12px' : '10px 16px',
                  borderRadius: theme.radius.lg,
                  backgroundColor: isActive ? theme.accent.primaryBg : 'transparent',
                  color: isActive ? theme.accent.primary : theme.text.secondary,
                  textDecoration: 'none',
                  transition: `all ${theme.transition.fast}`,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = theme.bg.hover
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <Icon size={20} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span
                    style={{
                      fontSize: theme.fontSize.base,
                      fontWeight: isActive ? theme.fontWeight.medium : theme.fontWeight.normal,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
        
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 12,
            padding: collapsed ? '12px' : '10px 16px',
            margin: 8,
            borderRadius: theme.radius.lg,
            backgroundColor: 'transparent',
            border: 'none',
            color: theme.text.muted,
            cursor: 'pointer',
            transition: `all ${theme.transition.fast}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.bg.hover
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!collapsed && (
            <span style={{ fontSize: theme.fontSize.sm }}>Collapse</span>
          )}
        </button>
      </motion.nav>
      
      {/* Main Content */}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: theme.bg.page,
        }}
      >
        {children}
      </main>
    </div>
  )
}
