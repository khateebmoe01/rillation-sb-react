import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, Wrench, Compass, LogOut, LayoutDashboard, Mail, Globe, ShoppingCart, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'

const sections = [
  {
    id: 'reporting',
    icon: BarChart3,
    label: 'Analytics',
    path: '/performance',
  },
  {
    id: 'strategy',
    icon: Compass,
    label: 'Client Strategy',
    path: '/strategy',
  },
  {
    id: 'infrastructure',
    icon: Wrench,
    label: 'Infrastructure',
    path: '/infrastructure',
    subItems: [
      { id: 'overview', icon: LayoutDashboard, label: 'Overview', path: '/infrastructure/overview' },
      { id: 'inboxes', icon: Mail, label: 'Inboxes', path: '/infrastructure/inboxes' },
      { id: 'domains', icon: Globe, label: 'Domains', path: '/infrastructure/domains' },
      { id: 'orders', icon: ShoppingCart, label: 'Orders', path: '/infrastructure/orders' },
      { id: 'health', icon: Activity, label: 'Health', path: '/infrastructure/health' },
    ],
  },
]

export default function Sidebar() {
  const location = useLocation()
  const { signOut, user } = useAuth()
  
  const handleSignOut = async () => {
    await signOut()
  }
  
  return (
    <aside
      className="bg-rillation-card border-r border-rillation-border flex flex-col py-4 gap-2 overflow-hidden flex-shrink-0 w-[180px]"
    >
      <div className="flex-1 flex flex-col gap-1">
        {sections.map((section) => {
          const Icon = section.icon
          // Determine active state based on section
          const isActive = section.id === 'infrastructure'
            ? location.pathname.startsWith('/infrastructure')
            : section.id === 'strategy'
              ? location.pathname.startsWith('/strategy')
              : section.id === 'reporting'
                  ? location.pathname.startsWith('/performance') || location.pathname.startsWith('/pipeline')
                  : false
          
          const hasSubItems = section.subItems && section.subItems.length > 0
          
          return (
            <div key={section.id}>
              <NavLink
                to={section.path}
                className={`
                  mx-2 h-12 flex items-center gap-3 rounded-xl transition-all duration-200 px-3
                  ${isActive
                    ? 'bg-rillation-card-hover border border-rillation-border text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Icon size={22} className="flex-shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">
                  {section.label}
                </span>
              </NavLink>
              
              {/* Sub Items */}
              <AnimatePresence>
                {hasSubItems && isActive && (
                  <motion.div
                    className="ml-4 mt-1 space-y-0.5"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {section.subItems!.map((subItem) => {
                      const SubIcon = subItem.icon
                      const isSubActive = location.pathname === subItem.path || 
                        (subItem.id === 'overview' && location.pathname === '/infrastructure')
                      
                      return (
                        <NavLink
                          key={subItem.id}
                          to={subItem.path}
                          className={`
                            mx-2 h-9 flex items-center gap-2 rounded-lg transition-all duration-200 px-3 text-xs
                            ${isSubActive
                              ? 'bg-white/10 text-white'
                              : 'text-white/90 hover:text-white hover:bg-white/5'
                            }
                          `}
                        >
                          <SubIcon size={16} className="flex-shrink-0" />
                          <span className="font-medium whitespace-nowrap">{subItem.label}</span>
                        </NavLink>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
      
      {/* Sign Out Button */}
      {user && (
        <div className="mt-auto pt-2 border-t border-rillation-border/50">
          <button
            onClick={handleSignOut}
            className="mx-2 h-12 w-full flex items-center gap-3 rounded-xl transition-all duration-200 px-3 text-white/80 hover:text-white hover:bg-white/5"
          >
            <LogOut size={22} className="flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">
              Sign Out
            </span>
          </button>
        </div>
      )}
    </aside>
  )
}
