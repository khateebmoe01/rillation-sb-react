import { useState } from 'react'
import { 
  LayoutDashboard, 
  Mail, 
  Globe, 
  ShoppingCart,
  Package,
  Sparkles,
  List,
  Flame
} from 'lucide-react'
import InfrastructureOverview from '../components/infrastructure/InfrastructureOverview'
import InboxSetsView from '../components/infrastructure/InboxSetsView'
import InboxInventory from '../components/infrastructure/InboxInventory'
import InboxAnalytics from '../components/infrastructure/InboxAnalytics'
import DomainGeneratorV2 from '../components/infrastructure/DomainGeneratorV2'
import DomainInventoryManager from '../components/infrastructure/DomainInventoryManager'
import DomainsTab from '../components/infrastructure/DomainsTab'
import OrderWorkflow from '../components/infrastructure/OrderWorkflow'
import InboxOrders from '../components/infrastructure/InboxOrders'

type MainTab = 'overview' | 'inboxes' | 'domains' | 'orders'
type InboxSubTab = 'sets' | 'inventory' | 'analytics'
type DomainSubTab = 'generator' | 'inventory' | 'list'
type OrderSubTab = 'create' | 'history'

export default function Infrastructure() {
  const [mainTab, setMainTab] = useState<MainTab>('overview')
  const [inboxSubTab, setInboxSubTab] = useState<InboxSubTab>('sets')
  const [domainSubTab, setDomainSubTab] = useState<DomainSubTab>('generator')
  const [orderSubTab, setOrderSubTab] = useState<OrderSubTab>('create')

  const mainTabs = [
    { id: 'overview' as MainTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'inboxes' as MainTab, label: 'Inboxes', icon: Mail },
    { id: 'domains' as MainTab, label: 'Domains', icon: Globe },
    { id: 'orders' as MainTab, label: 'Orders', icon: ShoppingCart },
  ]

  const inboxSubTabs = [
    { id: 'sets' as InboxSubTab, label: 'Sets', icon: Package },
    { id: 'inventory' as InboxSubTab, label: 'Inventory', icon: List },
    { id: 'analytics' as InboxSubTab, label: 'Analytics', icon: Flame },
  ]

  const domainSubTabs = [
    { id: 'generator' as DomainSubTab, label: 'Generator', icon: Sparkles },
    { id: 'inventory' as DomainSubTab, label: 'Inventory', icon: List },
    { id: 'list' as DomainSubTab, label: 'Legacy List', icon: Globe },
  ]

  const orderSubTabs = [
    { id: 'create' as OrderSubTab, label: 'Create Order', icon: ShoppingCart },
    { id: 'history' as OrderSubTab, label: 'Order History', icon: List },
  ]

  return (
    <div className="space-y-6 fade-in">
      {/* Main Tab Navigation */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex gap-2">
          {mainTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  mainTab === tab.id
                    ? 'bg-gradient-to-r from-rillation-purple to-rillation-magenta text-white'
                    : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Inbox Sub-Tabs */}
      {mainTab === 'inboxes' && (
        <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
          <div className="flex gap-2">
            {inboxSubTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setInboxSubTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    inboxSubTab === tab.id
                      ? 'bg-rillation-purple/20 text-rillation-purple border border-rillation-purple/30'
                      : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Domain Sub-Tabs */}
      {mainTab === 'domains' && (
        <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
          <div className="flex gap-2">
            {domainSubTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setDomainSubTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    domainSubTab === tab.id
                      ? 'bg-rillation-purple/20 text-rillation-purple border border-rillation-purple/30'
                      : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Order Sub-Tabs */}
      {mainTab === 'orders' && (
        <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
          <div className="flex gap-2">
            {orderSubTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setOrderSubTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    orderSubTab === tab.id
                      ? 'bg-rillation-purple/20 text-rillation-purple border border-rillation-purple/30'
                      : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {mainTab === 'overview' && <InfrastructureOverview />}
      
      {mainTab === 'inboxes' && inboxSubTab === 'sets' && <InboxSetsView />}
      {mainTab === 'inboxes' && inboxSubTab === 'inventory' && <InboxInventory />}
      {mainTab === 'inboxes' && inboxSubTab === 'analytics' && <InboxAnalytics />}
      
      {mainTab === 'domains' && domainSubTab === 'generator' && <DomainGeneratorV2 />}
      {mainTab === 'domains' && domainSubTab === 'inventory' && <DomainInventoryManager />}
      {mainTab === 'domains' && domainSubTab === 'list' && <DomainsTab />}
      
      {mainTab === 'orders' && orderSubTab === 'create' && <OrderWorkflow />}
      {mainTab === 'orders' && orderSubTab === 'history' && <InboxOrders />}
    </div>
  )
}
