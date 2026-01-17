import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, 
  CheckCircle, 
  Flame, 
  XCircle,
  RefreshCw,
  Globe,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Wifi,
  WifiOff,
  Search,
  ShoppingCart,
  Calendar,
  Clock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { dataCache } from '../../lib/cache'
import { useClients } from '../../hooks/useClients'
import { useInfraFilter } from '../../pages/Infrastructure'
import Button from '../ui/Button'
import ClientFilter from '../ui/ClientFilter'

interface OrderSummary {
  id: string
  provider: string
  status: string
  quantity: number
  created_at: string
  activated_at: string | null
  renewal_date: string | null
  cancelled_at: string | null
  daysActive: number
  milestone: '30d' | '60d' | '90d' | null
  renewalSoon: boolean
}

interface ClientSummary {
  client: string
  totalInboxes: number
  connected: number
  disconnected: number
  warming: number
  ready: number
  active: number
  domainsCount: number
  domainsUnused: number
  setsCount: number
  avgDeliverability: number
  avgWarmupReputation: number
  lastSynced: string | null
  needsAttention: boolean
  activeOrders: OrderSummary[]
  totalOrders: number
}

interface ClientDetailData {
  inboxes: any[]
  domains: any[]
  sets: any[]
  orders: any[]
}

const CACHE_KEY_PREFIX = 'infra:client:'

// Helper to calculate days between dates
function daysBetween(start: string | null, end: string | Date | null): number {
  if (!start) return 0
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
}

// Helper to get milestone badge
function getMilestone(daysActive: number): '30d' | '60d' | '90d' | null {
  if (daysActive >= 90) return '90d'
  if (daysActive >= 60) return '60d'
  if (daysActive >= 30) return '30d'
  return null
}

// Helper to check if renewal is soon (within 7 days)
function isRenewalSoon(renewalDate: string | null): boolean {
  if (!renewalDate) return false
  const renewal = new Date(renewalDate)
  const now = new Date()
  const daysUntil = Math.floor((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntil >= 0 && daysUntil <= 7
}

// Fetch all client summaries in parallel for speed
async function fetchAllClientSummaries(clientNames: string[]): Promise<ClientSummary[]> {
  // Fetch all data in parallel with single queries
  const [inboxesResult, domainsResult, tagsResult, ordersResult] = await Promise.all([
    supabase
        .from('inboxes')
      .select('client, status, lifecycle_status, warmup_enabled, deliverability_score, warmup_reputation, synced_at')
      .in('client', clientNames),
    supabase
        .from('domain_inventory' as any)
      .select('client, status, inboxes_ordered')
      .in('client', clientNames) as any,
    supabase
      .from('inbox_tags')
      .select('client, id, name')
      .in('client', clientNames),
    supabase
      .from('provider_orders')
      .select('id, client, provider, status, quantity, created_at, activated_at, renewal_date, cancelled_at')
      .in('client', clientNames)
      .order('created_at', { ascending: false }),
  ])

  const inboxes = (inboxesResult.data || []) as any[]
  const domains = (domainsResult.data || []) as any[]
  const tags = (tagsResult.data || []) as any[]
  const orders = (ordersResult.data || []) as any[]

  // Group by client
  const inboxesByClient = inboxes.reduce((acc, inbox) => {
    const client = inbox.client || 'Unknown'
    if (!acc[client]) acc[client] = []
    acc[client].push(inbox)
    return acc
  }, {} as Record<string, any[]>)

  const domainsByClient = domains.reduce((acc, domain) => {
    const client = domain.client || 'Unknown'
    if (!acc[client]) acc[client] = []
    acc[client].push(domain)
    return acc
  }, {} as Record<string, any[]>)

  // Filter tags to only those with "Set" in the name and group by client
  const setsByClient = tags
    .filter((tag: any) => tag.name?.toLowerCase().includes('set'))
    .reduce((acc: Record<string, any[]>, tag: any) => {
      const client = tag.client || 'Unknown'
      if (!acc[client]) acc[client] = []
      acc[client].push(tag)
      return acc
    }, {} as Record<string, any[]>)

  // Group orders by client
  const ordersByClient = orders.reduce((acc, order) => {
    const client = order.client || 'Unknown'
    if (!acc[client]) acc[client] = []
    acc[client].push(order)
    return acc
  }, {} as Record<string, any[]>)

  // Build summaries
  return clientNames.map(clientName => {
    const clientInboxes = inboxesByClient[clientName] || []
    const clientDomains = domainsByClient[clientName] || []
    const clientSets = setsByClient[clientName] || []
    const clientOrders = ordersByClient[clientName] || []

    const connected = clientInboxes.filter((i: any) => i.status === 'Connected').length
    const disconnected = clientInboxes.filter((i: any) => i.status === 'Not connected' || i.lifecycle_status === 'disconnected').length
    const warming = clientInboxes.filter((i: any) => i.lifecycle_status === 'warming' || i.warmup_enabled).length
    const ready = clientInboxes.filter((i: any) => i.lifecycle_status === 'ready').length
    const active = clientInboxes.filter((i: any) => i.lifecycle_status === 'active').length

    const avgDeliverability = clientInboxes.length > 0
      ? clientInboxes.reduce((sum: number, i: any) => sum + (i.deliverability_score || 0), 0) / clientInboxes.length
      : 0

    const warmupInboxes = clientInboxes.filter((i: any) => i.warmup_reputation)
      const avgWarmupReputation = warmupInboxes.length > 0
      ? warmupInboxes.reduce((sum: number, i: any) => sum + (i.warmup_reputation || 0), 0) / warmupInboxes.length
      : 0

    const sortedInboxes = [...clientInboxes].sort((a, b) => 
      new Date(b.synced_at || 0).getTime() - new Date(a.synced_at || 0).getTime()
    )
    const lastSynced = sortedInboxes[0]?.synced_at || null

    const domainsUnused = clientDomains.filter((d: any) => d.status === 'purchased' && d.inboxes_ordered === 0).length

    // Process orders - get active orders with milestones
    const activeOrders: OrderSummary[] = clientOrders
      .filter((o: any) => o.status !== 'cancelled')
      .slice(0, 5) // Limit to 5 most recent
      .map((o: any) => {
        const daysActive = daysBetween(o.activated_at || o.created_at, o.cancelled_at)
        return {
          id: o.id,
          provider: o.provider,
          status: o.status,
          quantity: o.quantity || 0,
          created_at: o.created_at,
          activated_at: o.activated_at,
          renewal_date: o.renewal_date,
          cancelled_at: o.cancelled_at,
          daysActive,
          milestone: getMilestone(daysActive),
          renewalSoon: isRenewalSoon(o.renewal_date),
        }
      })

    return {
        client: clientName,
      totalInboxes: clientInboxes.length,
        connected,
        disconnected,
        warming,
        ready,
        active,
      domainsCount: clientDomains.length,
      domainsUnused,
      setsCount: clientSets.length,
        avgDeliverability,
        avgWarmupReputation,
        lastSynced,
      needsAttention: disconnected > 0 || domainsUnused > 0 || activeOrders.some(o => o.renewalSoon),
      activeOrders,
      totalOrders: clientOrders.length,
    }
  })
}

// Client Card Component
function ClientCard({ 
  summary, 
  onClick 
}: { 
  summary: ClientSummary
  onClick: () => void
}) {
  const healthScore = summary.totalInboxes > 0 
    ? Math.round((summary.connected / summary.totalInboxes) * 100) 
    : 0

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-xl p-5 border bg-gradient-to-b from-slate-900/90 to-slate-900/70 
        cursor-pointer transition-all
        ${summary.needsAttention 
          ? 'border-amber-500/40 hover:border-amber-400/60' 
          : 'border-slate-700/60 hover:border-white/40'
        }
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
    >
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">{summary.client}</h3>
          {summary.needsAttention && (
            <motion.span 
              className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full flex items-center gap-1"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <AlertTriangle size={10} />
              Attention
            </motion.span>
          )}
        </div>
        <ChevronRight size={18} className="text-white" />
      </div>

      {/* Metrics Grid - 6 columns */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-xs text-white">Connected</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{summary.connected}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <XCircle size={14} className="text-red-400" />
            <span className="text-xs text-white">Disconnected</span>
          </div>
          <p className="text-xl font-bold text-red-400">{summary.disconnected}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flame size={14} className="text-amber-400" />
            <span className="text-xs text-white">Warming</span>
          </div>
          <p className="text-xl font-bold text-amber-400">{summary.warming}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Globe size={14} className="text-white" />
            <span className="text-xs text-white">Domains</span>
          </div>
          <p className="text-xl font-bold text-white">{summary.domainsCount}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Package size={14} className="text-white" />
            <span className="text-xs text-white">Sets</span>
          </div>
          <p className="text-xl font-bold text-white">{summary.setsCount}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {healthScore >= 90 ? (
              <TrendingUp size={14} className="text-emerald-400" />
            ) : healthScore >= 70 ? (
              <Minus size={14} className="text-amber-400" />
            ) : (
              <TrendingDown size={14} className="text-red-400" />
            )}
            <span className="text-xs text-white">Health</span>
          </div>
          <p className={`text-xl font-bold ${
            healthScore >= 90 ? 'text-emerald-400' : 
            healthScore >= 70 ? 'text-amber-400' : 
            'text-red-400'
          }`}>{healthScore}%</p>
        </div>
      </div>

      {/* Active Orders Section */}
      {summary.activeOrders.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={12} className="text-white/60" />
            <span className="text-xs text-white/60">Active Orders ({summary.totalOrders})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.activeOrders.slice(0, 3).map((order) => (
              <div 
                key={order.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                  order.renewalSoon 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                    : 'bg-slate-800/50 text-white/80'
                }`}
              >
                <span className="capitalize">{order.provider}</span>
                {order.milestone && (
                  <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                    order.milestone === '90d' ? 'bg-emerald-500/30 text-emerald-400' :
                    order.milestone === '60d' ? 'bg-cyan-500/30 text-cyan-400' :
                    'bg-slate-600/50 text-white/70'
                  }`}>
                    {order.milestone}
                  </span>
                )}
                {order.renewalSoon && (
                  <Calendar size={10} className="text-amber-400" />
                )}
              </div>
            ))}
            {summary.activeOrders.length > 3 && (
              <span className="text-xs text-white/50">+{summary.activeOrders.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="flex items-center justify-end mt-3">
        <span className="text-xs text-white/60">
          {formatDate(summary.lastSynced)}
        </span>
      </div>
    </motion.div>
  )
}

// Client Detail View Component
function ClientDetailView({ 
  clientName, 
  summary 
}: { 
  clientName: string
  summary: ClientSummary | undefined
}) {
  const [detailData, setDetailData] = useState<ClientDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      
      // Check cache first
      const cacheKey = `${CACHE_KEY_PREFIX}detail:${clientName}`
      const cached = dataCache.get<ClientDetailData>(cacheKey)
      if (cached && !cached.isStale) {
        setDetailData(cached.data)
        setLoading(false)
        return
      }

      // Fetch fresh data
      const [inboxesRes, domainsRes, tagsRes, ordersRes] = await Promise.all([
        supabase
          .from('inboxes')
          .select('*')
          .eq('client', clientName)
          .order('email'),
        supabase
          .from('domain_inventory' as any)
          .select('*')
          .eq('client', clientName) as any,
        supabase
          .from('inbox_tags')
          .select('*')
          .eq('client', clientName),
        supabase
          .from('provider_orders')
          .select('*')
          .eq('client', clientName)
          .order('created_at', { ascending: false }),
      ])

      // Filter tags to only those with "Set" in the name
      const sets = (tagsRes.data || []).filter((tag: any) => 
        tag.name?.toLowerCase().includes('set')
      )

      const data = {
        inboxes: inboxesRes.data || [],
        domains: domainsRes.data || [],
        sets,
        orders: ordersRes.data || [],
      }

      dataCache.set(cacheKey, data)
      setDetailData(data)
    setLoading(false)
  }

    fetchDetails()
  }, [clientName])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  const inboxes = detailData?.inboxes || []
  const connectedInboxes = inboxes.filter((i: any) => i.status === 'Connected')
  const disconnectedInboxes = inboxes.filter((i: any) => i.status === 'Not connected')
  const warmingInboxes = inboxes.filter((i: any) => i.lifecycle_status === 'warming' || i.warmup_enabled)

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (
        <motion.div
          className="bg-rillation-card rounded-xl p-5 border border-rillation-border"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">{clientName} Overview</h3>
          <div className="grid grid-cols-5 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{summary.connected}</p>
              <p className="text-xs text-white">Connected</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{summary.disconnected}</p>
              <p className="text-xs text-white">Disconnected</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{summary.warming}</p>
              <p className="text-xs text-white">Warming</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{summary.domainsCount}</p>
              <p className="text-xs text-white">Domains</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${
                summary.avgDeliverability >= 90 ? 'text-emerald-400' : 
                summary.avgDeliverability >= 70 ? 'text-amber-400' : 
                'text-red-400'
              }`}>{Math.round(summary.avgDeliverability)}%</p>
              <p className="text-xs text-white">Avg Deliverability</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Inbox Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connected Inboxes */}
        <motion.div
          className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-4 border-b border-rillation-border flex items-center gap-2">
            <Wifi size={16} className="text-emerald-400" />
            <h4 className="font-medium text-white">Connected ({connectedInboxes.length})</h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {connectedInboxes.length === 0 ? (
              <p className="p-4 text-sm text-white">No connected inboxes</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-rillation-border/30">
                  {connectedInboxes.slice(0, 20).map((inbox: any) => (
                    <tr key={inbox.id} className="hover:bg-rillation-card-hover">
                      <td className="px-4 py-2 text-white">{inbox.email}</td>
                      <td className="px-4 py-2 text-right text-white">{inbox.emails_sent_count || 0} sent</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

        {/* Disconnected Inboxes */}
        <motion.div
          className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="p-4 border-b border-rillation-border flex items-center gap-2">
            <WifiOff size={16} className="text-red-400" />
            <h4 className="font-medium text-white">Disconnected ({disconnectedInboxes.length})</h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {disconnectedInboxes.length === 0 ? (
              <p className="p-4 text-sm text-white">No disconnected inboxes</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-rillation-border/30">
                  {disconnectedInboxes.slice(0, 20).map((inbox: any) => (
                    <tr key={inbox.id} className="hover:bg-rillation-card-hover">
                      <td className="px-4 py-2 text-white/80">{inbox.email}</td>
                      <td className="px-4 py-2 text-right text-red-400">Disconnected</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>

      {/* Warming Inboxes */}
      {warmingInboxes.length > 0 && (
        <motion.div
          className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="p-4 border-b border-rillation-border flex items-center gap-2">
            <Flame size={16} className="text-amber-400" />
            <h4 className="font-medium text-white">Warming ({warmingInboxes.length})</h4>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-white border-b border-rillation-border/30">
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-right">Reputation</th>
                  <th className="px-4 py-2 text-right">Deliverability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rillation-border/30">
                {warmingInboxes.slice(0, 15).map((inbox: any) => (
                  <tr key={inbox.id} className="hover:bg-rillation-card-hover">
                    <td className="px-4 py-2 text-white">{inbox.email}</td>
                    <td className="px-4 py-2 text-right text-amber-400">{inbox.warmup_reputation || '-'}%</td>
                    <td className="px-4 py-2 text-right text-white">{inbox.deliverability_score || '-'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Orders History */}
      {detailData?.orders && detailData.orders.length > 0 && (
        <motion.div
          className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="p-4 border-b border-rillation-border flex items-center gap-2">
            <ShoppingCart size={16} className="text-white" />
            <h4 className="font-medium text-white">Orders ({detailData.orders.length})</h4>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-white border-b border-rillation-border/30">
                  <th className="px-4 py-2 text-left">Provider</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Created</th>
                  <th className="px-4 py-2 text-right">Days Active</th>
                  <th className="px-4 py-2 text-right">Renewal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rillation-border/30">
                {detailData.orders.map((order: any) => {
                  const daysActive = daysBetween(order.activated_at || order.created_at, order.cancelled_at)
                  const milestone = getMilestone(daysActive)
                  const renewalSoon = isRenewalSoon(order.renewal_date)
                  
                  return (
                    <tr key={order.id} className="hover:bg-rillation-card-hover">
                      <td className="px-4 py-2 text-white capitalize">{order.provider}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          order.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                          'bg-slate-500/20 text-white/70'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-white">{order.quantity || '-'}</td>
                      <td className="px-4 py-2 text-right text-white/70">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-white">{daysActive}d</span>
                          {milestone && (
                            <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${
                              milestone === '90d' ? 'bg-emerald-500/30 text-emerald-400' :
                              milestone === '60d' ? 'bg-cyan-500/30 text-cyan-400' :
                              'bg-slate-600/50 text-white/70'
                            }`}>
                              {milestone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {order.renewal_date ? (
                          <span className={renewalSoon ? 'text-amber-400 font-medium' : 'text-white/70'}>
                            {new Date(order.renewal_date).toLocaleDateString()}
                            {renewalSoon && <Clock size={10} className="inline ml-1" />}
                          </span>
                        ) : (
                          <span className="text-white/40">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never synced'
  const date = new Date(dateStr)
  const now = new Date()
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

interface InfrastructureOverviewProps {
  drillDownClient: string | null
  onClientClick: (client: string) => void
}

export default function InfrastructureOverview({ drillDownClient, onClientClick }: InfrastructureOverviewProps) {
  const { clients } = useClients()
  const { selectedClient, setSelectedClient, searchQuery, setSearchQuery } = useInfraFilter()
  const [summaries, setSummaries] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const fetchSummaries = useCallback(async () => {
    if (clients.length === 0) return
    
    // Check cache
    const cacheKey = 'infra:summaries:all'
    const cached = dataCache.get<ClientSummary[]>(cacheKey)
    if (cached && !cached.isStale) {
      setSummaries(cached.data)
      setLoading(false)
      return
    }

    setLoading(true)
    
    try {
      const results = await fetchAllClientSummaries(clients)
      setSummaries(results)
      dataCache.set(cacheKey, results)
    } catch (err) {
      console.error('Failed to fetch summaries:', err)
    } finally {
      setLoading(false)
    }
  }, [clients])

  useEffect(() => {
    fetchSummaries()
  }, [fetchSummaries])

  // Filter summaries based on selected client and search
  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => {
      if (selectedClient && s.client !== selectedClient) return false
      if (searchQuery && !s.client.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [summaries, selectedClient, searchQuery])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await Promise.all([
        supabase.functions.invoke('sync-inboxes-bison'),
        supabase.functions.invoke('sync-inbox-tags'),
      ])
      // Invalidate cache and refetch
      dataCache.invalidatePrefix('infra:')
      setTimeout(() => {
        fetchSummaries()
        setSyncing(false)
      }, 3000)
    } catch (err) {
      console.error('Sync failed:', err)
      setSyncing(false)
    }
  }

  // Totals
  const totals = useMemo(() => {
    return filteredSummaries.reduce((acc, s) => ({
      inboxes: acc.inboxes + s.totalInboxes,
      connected: acc.connected + s.connected,
      disconnected: acc.disconnected + s.disconnected,
      warming: acc.warming + s.warming,
      domains: acc.domains + s.domainsCount,
      sets: acc.sets + s.setsCount,
    }), { inboxes: 0, connected: 0, disconnected: 0, warming: 0, domains: 0, sets: 0 })
  }, [filteredSummaries])

  // If drill-down view
  if (drillDownClient) {
    const summary = summaries.find(s => s.client === drillDownClient)
    return <ClientDetailView clientName={drillDownClient} summary={summary} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global Stats Bar with Filters */}
      <motion.div 
        className="bg-rillation-card rounded-xl p-4 border border-rillation-border"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Stats */}
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-white mb-0.5">Connected</p>
              <p className="text-xl font-bold text-emerald-400">{totals.connected.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white mb-0.5">Disconnected</p>
              <p className="text-xl font-bold text-red-400">{totals.disconnected.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white mb-0.5">Warming</p>
              <p className="text-xl font-bold text-amber-400">{totals.warming.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white mb-0.5">Domains</p>
              <p className="text-xl font-bold text-white">{totals.domains.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white mb-0.5">Sets</p>
              <p className="text-xl font-bold text-white">{totals.sets.toLocaleString()}</p>
            </div>
          </div>

          {/* Right: Filters and Actions */}
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

          <Button variant="secondary" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </Button>
        </div>
      </div>
      </motion.div>

      {/* Client Cards Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05,
              },
            },
          }}
          initial="hidden"
          animate="show"
        >
          {filteredSummaries.map((summary) => (
            <motion.div
            key={summary.client}
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <ClientCard
                summary={summary}
                onClick={() => onClientClick(summary.client)}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Empty State */}
      {filteredSummaries.length === 0 && !loading && (
        <motion.div 
          className="text-center py-12 text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {searchQuery || selectedClient 
            ? 'No clients match your filters.'
            : 'No clients found.'}
        </motion.div>
      )}
    </div>
  )
}
