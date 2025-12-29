import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Wrench } from 'lucide-react'

const sections = [
  {
    id: 'reporting',
    icon: BarChart3,
    label: 'Reporting',
    path: '/quick-view',
  },
  {
    id: 'infrastructure',
    icon: Wrench,
    label: 'Infrastructure',
    path: '/infrastructure',
  },
]

export default function Sidebar() {
  const location = useLocation()
  
  return (
    <aside className="w-16 bg-rillation-card border-r border-rillation-border flex flex-col items-center py-4 gap-2">
      {sections.map((section) => {
        const Icon = section.icon
        // Reporting is active if we're on any reporting page (not infrastructure)
        const isActive = section.id === 'infrastructure'
          ? location.pathname === '/infrastructure'
          : location.pathname.startsWith('/quick-view') || 
            location.pathname.startsWith('/performance') || 
            location.pathname.startsWith('/pipeline')
        
        return (
          <NavLink
            key={section.id}
            to={section.path}
            className={`
              w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200
              ${isActive
                ? 'bg-rillation-card-hover border border-rillation-border text-rillation-text'
                : 'text-rillation-text-muted hover:text-rillation-text hover:bg-rillation-card-hover'
              }
            `}
            title={section.label}
          >
            <Icon size={22} />
          </NavLink>
        )
      })}
    </aside>
  )
}

