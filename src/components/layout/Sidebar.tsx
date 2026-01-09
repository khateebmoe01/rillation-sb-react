import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Wrench, Compass, Users } from 'lucide-react'
import { motion } from 'framer-motion'

const sections = [
  {
    id: 'reporting',
    icon: BarChart3,
    label: 'Analytics',
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
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <motion.aside
      className="bg-rillation-card border-r border-rillation-border flex flex-col py-4 gap-2 overflow-hidden flex-shrink-0"
      initial={false}
      animate={{ width: isExpanded ? 180 : 64 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
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
              mx-2 h-12 flex items-center gap-3 rounded-xl transition-all duration-200 px-3
              ${isActive
                ? 'bg-rillation-card-hover border border-rillation-border text-rillation-text'
                : 'text-rillation-text-muted hover:text-rillation-text hover:bg-rillation-card-hover'
              }
            `}
          >
            <Icon size={22} className="flex-shrink-0" />
            <motion.span
              className="text-sm font-medium whitespace-nowrap overflow-hidden"
              initial={false}
              animate={{ 
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? 'auto' : 0,
              }}
              transition={{ duration: 0.15 }}
            >
              {section.label}
            </motion.span>
          </NavLink>
        )
      })}
    </motion.aside>
  )
}
