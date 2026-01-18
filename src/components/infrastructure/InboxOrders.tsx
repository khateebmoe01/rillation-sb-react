import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Loader2, Save, Calendar, ChevronDown, AlertTriangle, Clock, CheckCircle, RefreshCw } from 'lucide-react'
import { useInboxOrders } from '../../hooks/useInboxOrders'
import { useDomains } from '../../hooks/useDomains'
import { useClients } from '../../hooks/useClients'
import { orderInboxesBulk, getInboxKitRenewals } from '../../lib/infrastructure-api'
import Button from '../ui/Button'
import ClientFilter from '../ui/ClientFilter'
import AnimatedSelect from '../ui/AnimatedSelect'

const PROVIDERS = ['Mission Inbox', 'InboxKit']
const MIN_QUANTITY = 100

// Helper to calculate days until renewal
function getDaysUntilRenewal(renewalDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const renewal = new Date(renewalDate)
  renewal.setHours(0, 0, 0, 0)
  return Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// Get urgency level based on days until renewal
function getRenewalUrgency(days: number): 'urgent' | 'soon' | 'normal' | 'past' {
  if (days < 0) return 'past'
  if (days <= 7) return 'urgent'
  if (days <= 30) return 'soon'
  return 'normal'
}

// InboxKit renewal from API
interface InboxKitRenewal {
  date: string
  count: number
  domains: string[]
  client?: string
}

// Processed renewal for display
interface RenewalGroup {
  renewalDate: string
  inboxCount: number
  domains: string[]
  daysUntil: number
  urgency: 'urgent' | 'soon' | 'normal' | 'past'
  client: string
}

export default function InboxOrders() {
  const { clients } = useClients()
  const { domains } = useDomains()
  const { orders, loading, refetch } = useInboxOrders()

  const [provider, setProvider] = useState('')
  const [quantity, setQuantity] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [ordering, setOrdering] = useState(false)
  const [expandedRenewals, setExpandedRenewals] = useState<Set<string>>(new Set())
  const [loadingRenewals, setLoadingRenewals] = useState(false)
  const [renewalsData, setRenewalsData] = useState<{ total_mailboxes: number; renewals: InboxKitRenewal[] } | null>(null)
  const [renewalClientFilter, setRenewalClientFilter] = useState('')

  // Fetch renewals from InboxKit
  const fetchRenewals = useCallback(async () => {
    setLoadingRenewals(true)
    try {
      const result = await getInboxKitRenewals()
      setRenewalsData(result)
    } catch (err) {
      console.error('Error fetching renewals:', err)
    } finally {
      setLoadingRenewals(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchRenewals()
  }, [fetchRenewals])

  // Get unique clients from renewals for filter dropdown
  const renewalClients = useMemo(() => {
    if (!renewalsData?.renewals) return []
    const clientSet = new Set<string>()
    renewalsData.renewals.forEach(r => {
      if (r.client) clientSet.add(r.client)
    })
    return Array.from(clientSet).sort()
  }, [renewalsData])

  // Process renewals for display (with filter applied)
  const renewalGroups = useMemo((): RenewalGroup[] => {
    if (!renewalsData?.renewals) return []
    
    return renewalsData.renewals
      .filter(renewal => !renewalClientFilter || renewal.client === renewalClientFilter)
      .map(renewal => {
        const daysUntil = getDaysUntilRenewal(renewal.date)
        return {
          renewalDate: renewal.date,
          inboxCount: renewal.count,
          domains: renewal.domains,
          daysUntil,
          urgency: getRenewalUrgency(daysUntil),
          client: renewal.client || 'Unknown',
        }
      }).sort((a, b) => a.daysUntil - b.daysUntil)
  }, [renewalsData, renewalClientFilter])

  const toggleRenewalExpand = (key: string) => {
    setExpandedRenewals(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Refresh renewal data from InboxKit
  const handleRefreshRenewals = async () => {
    await fetchRenewals()
  }

  const handleOrder = async () => {
    if (!provider || !quantity || parseInt(quantity) < MIN_QUANTITY) {
      return
    }

    setOrdering(true)
    try {
      await orderInboxesBulk({
        provider,
        quantity: parseInt(quantity),
        domain: selectedDomain || undefined,
        client: selectedClient || undefined,
      })
      await refetch()
      // Reset form
      setProvider('')
      setQuantity('')
      setSelectedDomain('')
      setSelectedClient('')
    } catch (err) {
      console.error('Error placing order:', err)
    } finally {
      setOrdering(false)
    }
  }

  const estimatedCost = quantity ? parseInt(quantity) * 0.5 : 0 // Placeholder pricing

  return (
    <div className="space-y-6">
      {/* Upcoming Renewals Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden"
      >
        <div className="p-4 border-b border-rillation-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Calendar size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Upcoming Renewals</h3>
              <p className="text-xs text-white/70">
                {renewalGroups.reduce((sum, g) => sum + g.inboxCount, 0)} inboxes across {renewalGroups.length} date{renewalGroups.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {renewalClients.length > 0 && (
              <div className="w-48">
                <AnimatedSelect
                  value={renewalClientFilter}
                  onChange={setRenewalClientFilter}
                  placeholder="All Clients"
                  size="sm"
                  options={[
                    { value: '', label: 'All Clients' },
                    ...renewalClients.map(c => ({ value: c, label: c }))
                  ]}
                />
              </div>
            )}
            
            <button
              onClick={handleRefreshRenewals}
              disabled={loadingRenewals}
              className="flex items-center gap-2 px-3 py-2 bg-rillation-purple/20 hover:bg-rillation-purple/30 text-rillation-purple rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadingRenewals ? 'animate-spin' : ''} />
              {loadingRenewals ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="divide-y divide-rillation-border/30">
          {loadingRenewals ? (
            <div className="p-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : renewalGroups.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar size={32} className="mx-auto text-white/40 mb-3" />
              <p className="text-sm text-white/60">
                No upcoming renewals found
              </p>
            </div>
          ) : (
            renewalGroups.map((group) => {
              const key = `${group.client}-${group.renewalDate}`
              const isExpanded = expandedRenewals.has(key)
              
              return (
                <motion.div 
                  key={key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="overflow-hidden"
                >
                  {/* Renewal Row */}
                  <button
                    onClick={() => toggleRenewalExpand(key)}
                    className="w-full px-4 py-4 flex items-center justify-between hover:bg-rillation-card-hover transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      {/* Urgency Indicator */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        group.urgency === 'past' ? 'bg-red-500/20' :
                        group.urgency === 'urgent' ? 'bg-red-500/20' :
                        group.urgency === 'soon' ? 'bg-amber-500/20' :
                        'bg-emerald-500/20'
                      }`}>
                        {group.urgency === 'past' ? (
                          <AlertTriangle size={18} className="text-red-400" />
                        ) : group.urgency === 'urgent' ? (
                          <AlertTriangle size={18} className="text-red-400" />
                        ) : group.urgency === 'soon' ? (
                          <Clock size={18} className="text-amber-400" />
                        ) : (
                          <CheckCircle size={18} className="text-emerald-400" />
                        )}
                      </div>
                      
                      {/* Inbox Count (prominent) + Client & Domains */}
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[60px]">
                          <div className="text-2xl font-bold text-white">{group.inboxCount}</div>
                          <div className="text-[10px] uppercase tracking-wide text-white/60">
                            inbox{group.inboxCount !== 1 ? 'es' : ''}
                          </div>
                        </div>
                        <div className="border-l border-white/20 pl-4">
                          <div className="font-medium text-white">{group.client}</div>
                          <div className="text-xs text-white/70 mt-0.5">
                            {group.domains.length} domain{group.domains.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Renewal Date */}
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">
                          {new Date(group.renewalDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className={`text-xs ${
                          group.urgency === 'past' ? 'text-red-400' :
                          group.urgency === 'urgent' ? 'text-red-400' :
                          group.urgency === 'soon' ? 'text-amber-400' :
                          'text-white/60'
                        }`}>
                          {group.daysUntil < 0 
                            ? `${Math.abs(group.daysUntil)} days overdue`
                            : group.daysUntil === 0 
                            ? 'Today'
                            : `${group.daysUntil} days`
                          }
                        </div>
                      </div>
                      
                      {/* Expand Icon */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={18} className="text-white/60" />
                      </motion.div>
                    </div>
                  </button>
                  
                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pl-[72px]">
                          <div className="bg-rillation-bg rounded-lg p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs text-white/50 uppercase tracking-wide">Domains</span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {group.domains.slice(0, 5).map(domain => (
                                    <span key={domain} className="px-2 py-0.5 bg-rillation-card rounded text-xs text-white">
                                      {domain}
                                    </span>
                                  ))}
                                  {group.domains.length > 5 && (
                                    <span className="px-2 py-0.5 bg-rillation-card rounded text-xs text-white/60">
                                      +{group.domains.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-white/50 uppercase tracking-wide">Est. Cost</span>
                                <div className="mt-1 text-lg font-semibold text-white">
                                  ${(group.inboxCount * 3).toFixed(2)}
                                  <span className="text-xs text-white/60 font-normal ml-1">/ month</span>
                                </div>
                              </div>
                            </div>
                            
                            {group.urgency !== 'normal' && (
                              <div className={`flex items-center gap-2 p-2 rounded ${
                                group.urgency === 'past' || group.urgency === 'urgent' 
                                  ? 'bg-red-500/10 border border-red-500/20' 
                                  : 'bg-amber-500/10 border border-amber-500/20'
                              }`}>
                                {group.urgency === 'past' ? (
                                  <AlertTriangle size={14} className="text-red-400" />
                                ) : group.urgency === 'urgent' ? (
                                  <AlertTriangle size={14} className="text-red-400" />
                                ) : (
                                  <Clock size={14} className="text-amber-400" />
                                )}
                                <span className={`text-xs ${
                                  group.urgency === 'past' || group.urgency === 'urgent' 
                                    ? 'text-red-300' 
                                    : 'text-amber-300'
                                }`}>
                                  {group.urgency === 'past' 
                                    ? 'Renewal overdue - action required'
                                    : group.urgency === 'urgent'
                                    ? 'Renews within 7 days'
                                    : 'Renews within 30 days'
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })
          )}
        </div>
      </motion.div>

      {/* Order Form */}
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border">
        <h3 className="text-lg font-semibold text-rillation-text mb-4 flex items-center gap-2">
          <ShoppingCart size={20} className="text-rillation-purple" />
          Place Bulk Order
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatedSelect
            label="Provider *"
            value={provider}
            onChange={setProvider}
            placeholder="Select Provider"
            options={[
              { value: '', label: 'Select Provider' },
              ...PROVIDERS.map(p => ({ value: p, label: p }))
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-rillation-text-muted mb-2">
              Quantity * (Min: {MIN_QUANTITY})
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={MIN_QUANTITY}
              placeholder={`${MIN_QUANTITY}+`}
              className="w-full px-4 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-rillation-text focus:outline-none focus:border-rillation-purple"
            />
          </div>

          <AnimatedSelect
            label="Domain (Optional)"
            value={selectedDomain}
            onChange={setSelectedDomain}
            placeholder="Select Domain"
            options={[
              { value: '', label: 'Select Domain' },
              ...domains.map(domain => ({ value: domain.domain, label: domain.domain }))
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-rillation-text-muted mb-2">
              Client (Optional)
            </label>
            <ClientFilter
              clients={clients}
              selectedClient={selectedClient}
              onChange={setSelectedClient}
            />
          </div>
        </div>

        {quantity && parseInt(quantity) >= MIN_QUANTITY && (
          <div className="mt-4 p-4 bg-rillation-bg rounded-lg border border-rillation-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-rillation-text-muted">Estimated Cost:</span>
              <span className="text-lg font-bold text-rillation-text">
                ${estimatedCost.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <Button
          variant="primary"
          onClick={handleOrder}
          disabled={ordering || !provider || !quantity || parseInt(quantity) < MIN_QUANTITY}
          className="mt-4 w-full"
        >
          {ordering ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              <Save size={16} />
              Place Order
            </>
          )}
        </Button>
      </div>

      {/* Order History */}
      <div className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden">
        <div className="p-4 border-b border-rillation-border">
          <h3 className="text-lg font-semibold text-rillation-text">Order History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-rillation-card-hover">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-rillation-text-muted uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rillation-border/30">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-rillation-text-muted">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-rillation-card-hover transition-colors">
                    <td className="px-4 py-3 text-sm text-rillation-text">
                      {order.order_id || `#${order.id}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {order.provider}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {order.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {order.client || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          order.status === 'completed'
                            ? 'bg-rillation-green/20 text-rillation-green'
                            : order.status === 'processing'
                            ? 'bg-rillation-orange/20 text-rillation-orange'
                            : order.status === 'failed'
                            ? 'bg-rillation-red/20 text-rillation-red'
                            : 'bg-rillation-purple/20 text-rillation-purple'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-rillation-text-muted">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}






















