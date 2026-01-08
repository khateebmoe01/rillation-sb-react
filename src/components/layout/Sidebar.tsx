import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Wrench, Compass, Users } from 'lucide-react'

const sections = [
  {
    id: 'reporting',
    icon: BarChart3,
    label: 'Reporting',
    path: '/quick-view',
  },
  {
    id: 'crm',
    icon: Users,
    label: 'CRM',
    path: '/crm',
  },
  {
    id: 'strategy',
    icon: Compass,
    label: 'Strategy',
    path: '/strategy',
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
        // Determine active state based on section
        const isActive = section.id === 'infrastructure'
          ? location.pathname === '/infrastructure'
          : section.id === 'strategy'
            ? location.pathname.startsWith('/strategy')
            : section.id === 'crm'
              ? location.pathname.startsWith('/crm')
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

