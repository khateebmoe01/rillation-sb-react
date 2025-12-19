import { useState } from 'react'
import DomainsTab from '../components/infrastructure/DomainsTab'
import InboxAnalytics from '../components/infrastructure/InboxAnalytics'
import InboxOrders from '../components/infrastructure/InboxOrders'
import InboxInventory from '../components/infrastructure/InboxInventory'

type MainTab = 'domains' | 'inboxes'
type InboxSubTab = 'analytics' | 'orders' | 'inventory'

export default function Infrastructure() {
  const [mainTab, setMainTab] = useState<MainTab>('domains')
  const [inboxSubTab, setInboxSubTab] = useState<InboxSubTab>('analytics')

  return (
    <div className="space-y-6 fade-in">
      {/* Main Tab Navigation */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex gap-2">
          <button
            onClick={() => setMainTab('domains')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              mainTab === 'domains'
                ? 'bg-gradient-to-r from-rillation-purple to-rillation-magenta text-white'
                : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
            }`}
          >
            Domains
          </button>
          <button
            onClick={() => setMainTab('inboxes')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              mainTab === 'inboxes'
                ? 'bg-gradient-to-r from-rillation-purple to-rillation-magenta text-white'
                : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
            }`}
          >
            Inboxes
          </button>
        </div>
      </div>

      {/* Inbox Sub-Tabs */}
      {mainTab === 'inboxes' && (
        <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
          <div className="flex gap-2">
            <button
              onClick={() => setInboxSubTab('analytics')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                inboxSubTab === 'analytics'
                  ? 'bg-rillation-purple/20 text-rillation-purple border border-rillation-purple/30'
                  : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setInboxSubTab('orders')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                inboxSubTab === 'orders'
                  ? 'bg-rillation-purple/20 text-rillation-purple border border-rillation-purple/30'
                  : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setInboxSubTab('inventory')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                inboxSubTab === 'inventory'
                  ? 'bg-rillation-purple/20 text-rillation-purple border border-rillation-purple/30'
                  : 'bg-rillation-card-hover border border-rillation-border text-rillation-text-muted hover:text-rillation-text'
              }`}
            >
              Inventory
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {mainTab === 'domains' && <DomainsTab />}
      {mainTab === 'inboxes' && inboxSubTab === 'analytics' && <InboxAnalytics />}
      {mainTab === 'inboxes' && inboxSubTab === 'orders' && <InboxOrders />}
      {mainTab === 'inboxes' && inboxSubTab === 'inventory' && <InboxInventory />}
    </div>
  )
}




