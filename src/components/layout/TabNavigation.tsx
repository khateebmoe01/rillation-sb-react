import { NavLink, useLocation } from 'react-router-dom'

const tabs = [
  { path: '/quick-view', label: 'Quick View' },
  { path: '/performance', label: 'Performance Overview' },
  { path: '/gtm-scoreboard', label: 'GTM Scoreboard' },
  { path: '/pipeline', label: 'Pipeline View' },
]

export default function TabNavigation() {
  const location = useLocation()
  
  return (
    <nav className="px-6 border-b border-rillation-border">
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path
          
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`
                relative px-4 py-3 text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'text-rillation-purple'
                  : 'text-rillation-text-muted hover:text-rillation-text'
                }
              `}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rillation-purple to-rillation-magenta" />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
