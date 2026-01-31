import { useState, createContext, useContext, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package,
  List,
  Flame,
  Sparkles,
  Search,
  ShoppingCart,
} from 'lucide-react'
import { useClients } from '../hooks/useClients'
import ClientFilter from '../components/ui/ClientFilter'
import InboxSetsView from '../components/infrastructure/InboxSetsView'
import InboxInventory from '../components/infrastructure/InboxInventory'
import InboxAnalytics from '../components/infrastructure/InboxAnalytics'
import DomainGeneratorV2 from '../components/infrastructure/DomainGeneratorV2'
import DomainInventoryManager from '../components/infrastructure/DomainInventoryManager'
import OrderWorkflow from '../components/infrastructure/OrderWorkflow'
import InboxOrders from '../components/infrastructure/InboxOrders'
import HealthMonitor from '../components/infrastructure/HealthMonitor'

type MainTab = 'inboxes' | 'domains' | 'orders' | 'health'
type InboxSubTab = 'sets' | 'inventory' | 'analytics'
type DomainSubTab = 'generator' | 'inventory'
type OrderSubTab = 'create' | 'history'

// Context for sharing filter state across all infrastructure components
interface InfraFilterContextType {
  selectedClient: string
  setSelectedClient: (client: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
}

const InfraFilterContext = createContext<InfraFilterContextType>({
  selectedClient: '',
  setSelectedClient: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
})

export const useInfraFilter = () => useContext(InfraFilterContext)

interface InfrastructureProps {
  defaultTab?: MainTab
}

export default function Infrastructure({ defaultTab = 'inboxes' }: InfrastructureProps) {
  const [mainTab, setMainTab] = useState<MainTab>(defaultTab)
  const [inboxSubTab, setInboxSubTab] = useState<InboxSubTab>('sets')
  const [domainSubTab, setDomainSubTab] = useState<DomainSubTab>('generator')
  const [orderSubTab, setOrderSubTab] = useState<OrderSubTab>('create')
  
  // Shared filter state
  const [selectedClient, setSelectedClient] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const { clients } = useClients()

  // Update mainTab when defaultTab prop changes (route change)
  useEffect(() => {
    setMainTab(defaultTab)
  }, [defaultTab])

  const inboxSubTabs = [
    { id: 'sets' as InboxSubTab, label: 'Sets', icon: Package },
    { id: 'inventory' as InboxSubTab, label: 'Inventory', icon: List },
    { id: 'analytics' as InboxSubTab, label: 'Analytics', icon: Flame },
  ]

  const domainSubTabs = [
    { id: 'generator' as DomainSubTab, label: 'Generator', icon: Sparkles },
    { id: 'inventory' as DomainSubTab, label: 'Inventory', icon: List },
  ]

  const orderSubTabs = [
    { id: 'create' as OrderSubTab, label: 'Create Order', icon: ShoppingCart },
    { id: 'history' as OrderSubTab, label: 'Order History', icon: List },
  ]

  // Get current sub-tabs based on main tab
  const getCurrentSubTabs = () => {
    switch (mainTab) {
      case 'inboxes': return { tabs: inboxSubTabs, current: inboxSubTab, setter: setInboxSubTab }
      case 'domains': return { tabs: domainSubTabs, current: domainSubTab, setter: setDomainSubTab }
      case 'orders': return { tabs: orderSubTabs, current: orderSubTab, setter: setOrderSubTab }
      default: return null
    }
  }

  const subTabConfig = getCurrentSubTabs()

  return (
    <InfraFilterContext.Provider value={{ selectedClient, setSelectedClient, searchQuery, setSearchQuery }}>
      <div className="space-y-6">
        {/* Top Bar with Sub-tabs and Filters - Only show when there are sub-tabs */}
        {subTabConfig && (
          <motion.div 
            className="bg-rillation-card rounded-xl p-4 border border-rillation-border"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between gap-4">
              {/* Left: Sub-tabs */}
              <div className="flex items-center gap-2">
                {subTabConfig.tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => subTabConfig.setter(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        subTabConfig.current === tab.id
                          ? 'bg-white text-black'
                          : 'bg-rillation-card-hover border border-rillation-border text-white hover:border-white/30'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </motion.button>
                  )
                })}
              </div>

              {/* Right: Filters */}
              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white" size={16} />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm bg-rillation-bg border border-rillation-border rounded-lg text-white placeholder:text-white focus:outline-none focus:border-white/40 w-48"
                  />
                </div>

                {/* Client Filter */}
                <ClientFilter
                  clients={clients}
                  selectedClient={selectedClient}
                  onChange={setSelectedClient}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mainTab}-${inboxSubTab}-${domainSubTab}-${orderSubTab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {mainTab === 'inboxes' && inboxSubTab === 'sets' && <InboxSetsView />}
            {mainTab === 'inboxes' && inboxSubTab === 'inventory' && <InboxInventory />}
            {mainTab === 'inboxes' && inboxSubTab === 'analytics' && <InboxAnalytics />}
            
            {mainTab === 'domains' && domainSubTab === 'generator' && <DomainGeneratorV2 />}
            {mainTab === 'domains' && domainSubTab === 'inventory' && <DomainInventoryManager />}
            
            {mainTab === 'orders' && orderSubTab === 'create' && <OrderWorkflow />}
            {mainTab === 'orders' && orderSubTab === 'history' && <InboxOrders />}
            
            {mainTab === 'health' && <HealthMonitor />}
          </motion.div>
        </AnimatePresence>
      </div>
    </InfraFilterContext.Provider>
  )
}
