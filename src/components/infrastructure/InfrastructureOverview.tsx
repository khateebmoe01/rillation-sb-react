import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertTriangle, 
  CheckCircle, 
  Flame, 
  XCircle,
  RefreshCw,
  Mail,
  Globe,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { dataCache } from '../../lib/cache'
import { useClients } from '../../hooks/useClients'
import { useInfraFilter } from '../../pages/Infrastructure'
import Button from '../ui/Button'

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
}

interface ClientDetailData {
  inboxes: any[]
  domains: any[]
  sets: any[]
}

const CACHE_KEY_PREFIX = 'infra:client:'

// Fetch all client summaries in parallel for speed
async function fetchAllClientSummaries(clientNames: string[]): Promise<ClientSummary[]> {
  // Fetch all data in parallel with single queries
  const [inboxesResult, domainsResult, setsResult] = await Promise.all([
    supabase
      .from('inboxes')
      .select('client, status, lifecycle_status, warmup_enabled, deliverability_score, warmup_reputation, synced_at')
      .in('client', clientNames),
    supabase
      .from('domain_inventory' as any)
      .select('client, status, inboxes_ordered')
      .in('client', clientNames) as any,
    supabase
      .from('inbox_sets' as any)
      .select('client, id')
      .in('client', clientNames) as any,
  ])

  const inboxes = (inboxesResult.data || []) as any[]
  const domains = (domainsResult.data || []) as any[]
  const sets = (setsResult.data || []) as any[]

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

  const setsByClient = sets.reduce((acc, set) => {
    const client = set.client || 'Unknown'
    if (!acc[client]) acc[client] = []
    acc[client].push(set)
    return acc
  }, {} as Record<string, any[]>)

  // Build summaries
  return clientNames.map(clientName => {
    const clientInboxes = inboxesByClient[clientName] || []
    const clientDomains = domainsByClient[clientName] || []
    const clientSets = setsByClient[clientName] || []

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
      needsAttention: disconnected > 0 || domainsUnused > 0,
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

      {/* Metrics Grid - 4 columns */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Mail size={14} className="text-white" />
            <span className="text-xs text-white">Inboxes</span>
          </div>
          <p className="text-xl font-bold text-white">{summary.totalInboxes}</p>
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

      {/* Status Bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <CheckCircle size={14} />
          {summary.connected}
        </span>
        <span className="flex items-center gap-1.5 text-red-400">
          <XCircle size={14} />
          {summary.disconnected}
        </span>
        <span className="flex items-center gap-1.5 text-amber-400">
          <Flame size={14} />
          {summary.warming}
        </span>
        <span className="ml-auto text-xs text-white">
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
      const [inboxesRes, domainsRes, setsRes] = await Promise.all([
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
          .from('inbox_sets' as any)
          .select('*')
          .eq('client', clientName) as any,
      ])

      const data = {
        inboxes: inboxesRes.data || [],
        domains: domainsRes.data || [],
        sets: setsRes.data || [],
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
          <div className="grid grid-cols-6 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{summary.totalInboxes}</p>
              <p className="text-xs text-white">Total Inboxes</p>
            </div>
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
  const { selectedClient, searchQuery } = useInfraFilter()
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
      {/* Global Stats Bar */}
      <motion.div 
        className="bg-rillation-card rounded-xl p-5 border border-rillation-border"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div>
              <p className="text-xs text-white mb-1">Total Inboxes</p>
              <p className="text-2xl font-bold text-white">{totals.inboxes.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white mb-1">Connected</p>
              <p className="text-2xl font-bold text-emerald-400">{totals.connected.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white mb-1">Disconnected</p>
              <p className="text-2xl font-bold text-red-400">{totals.disconnected.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white mb-1">Warming</p>
              <p className="text-2xl font-bold text-amber-400">{totals.warming.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white mb-1">Domains</p>
              <p className="text-2xl font-bold text-white">{totals.domains.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-white mb-1">Sets</p>
              <p className="text-2xl font-bold text-white">{totals.sets.toLocaleString()}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </Button>
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
