import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, LayoutDashboard, Users, DollarSign, CheckSquare, TrendingUp, Compass, Mail, Globe, ShoppingCart, Activity, Sparkles, Rocket } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAI } from '../../contexts/AIContext'

// Section-based navigation matching the design
const navSections = [
  {
    id: 'crm',
    label: 'CRM',
    items: [
      { id: 'contacts', icon: Users, label: 'Contacts', path: '/crm/contacts' },
      { id: 'deals', icon: DollarSign, label: 'Deals', path: '/crm/deals' },
      { id: 'tasks', icon: CheckSquare, label: 'Tasks', path: '/crm/tasks' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    items: [
      { id: 'performance', icon: BarChart3, label: 'Performance', path: '/performance' },
      { id: 'pipeline', icon: TrendingUp, label: 'Pipeline', path: '/pipeline' },
    ],
  },
  {
    id: 'strategy',
    label: 'Strategy',
    items: [
      { id: 'gtm-implementation', icon: Rocket, label: 'Implementation', path: '/strategy/implementation' },
      { id: 'client-strategy', icon: Compass, label: 'Client Strategy', path: '/strategy' },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    items: [
      { id: 'inboxes', icon: Mail, label: 'Inboxes', path: '/infrastructure/inboxes' },
      { id: 'domains', icon: Globe, label: 'Domains', path: '/infrastructure/domains' },
      { id: 'orders', icon: ShoppingCart, label: 'Orders', path: '/infrastructure/orders' },
      { id: 'health', icon: Activity, label: 'Health', path: '/infrastructure/health' },
    ],
  },
]

export default function Sidebar() {
  const location = useLocation()
  const { togglePanel, isPanelOpen } = useAI()

  const isItemActive = (path: string, id: string) => {
    // Exact match first
    if (location.pathname === path) return true

    // CRM routes - only exact matches
    if (path.startsWith('/crm')) {
      return location.pathname === path
    }

    // Analytics routes - allow sub-paths
    if (id === 'performance' && location.pathname.startsWith('/performance')) return true

    // Strategy routes - specific sub-paths first, then allow remaining /strategy paths
    if (id === 'gtm-implementation' && location.pathname === '/strategy/implementation') return true
    if (id === 'client-strategy' && location.pathname === '/strategy') return true

    // Infrastructure routes - allow sub-paths
    if (path.startsWith('/infrastructure') && path !== '/infrastructure') {
      return location.pathname.startsWith(path)
    }

    return false
  }
  
  return (
    <aside className="bg-[#060f1a] border-r border-rillation-border flex flex-col py-5 overflow-hidden flex-shrink-0 w-[180px]">
      {/* AI Button at Top */}
      <div className="px-4 mb-4">
        <motion.button
          onClick={togglePanel}
          className={`
            w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg transition-all duration-150
            border
            ${isPanelOpen 
              ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400' 
              : 'bg-zinc-800/50 border-zinc-700/50 text-rillation-text hover:bg-zinc-700/50 hover:text-white hover:border-zinc-600/50'
            }
          `}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            animate={isPanelOpen ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Sparkles size={16} />
          </motion.div>
          <span className="text-[13px] font-medium">AI Assistant</span>
        </motion.button>
      </div>
      
      <div className="flex-1 flex flex-col gap-6 px-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.id}>
            {/* Section Header with Line */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-semibold text-rillation-text/70 uppercase tracking-wider whitespace-nowrap">
                {section.label}
              </span>
              <div className="flex-1 h-px bg-zinc-700/50" />
            </div>
            
            {/* Section Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = isItemActive(item.path, item.id)
                
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={`
                      flex items-center gap-2.5 py-2 px-2.5 rounded-lg transition-all duration-150
                      ${isActive
                        ? 'bg-emerald-600/20 text-emerald-400'
                        : 'text-rillation-text/70 hover:text-zinc-200 hover:bg-zinc-800/50'
                      }
                    `}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      
    </aside>
  )
}
