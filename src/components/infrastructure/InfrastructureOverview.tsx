import { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  CheckCircle, 
  Flame, 
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClients } from '../../hooks/useClients'
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

export default function InfrastructureOverview() {
  const { clients } = useClients()
  const [summaries, setSummaries] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchSummaries()
  }, [clients])

  const fetchSummaries = async () => {
    setLoading(true)
    const results: ClientSummary[] = []

    for (const client of clients) {
      // Handle both object and string formats
      const clientName = typeof client === 'string' 
        ? client 
        : ((client as any).Business || (client as any).name || String(client))

      // Fetch inbox stats
      const { data: inboxes } = await supabase
        .from('inboxes')
        .select('status, lifecycle_status, warmup_enabled, deliverability_score, warmup_reputation, synced_at')
        .eq('client', clientName)

      // Fetch domain stats (new table - may not exist in types)
      const { data: domains } = await (supabase
        .from('domain_inventory' as any)
        .select('status, inboxes_ordered')
        .eq('client', clientName) as any)

      // Fetch sets count (new table - may not exist in types)
      const { count: setsCount } = await (supabase
        .from('inbox_sets' as any)
        .select('id', { count: 'exact', head: true })
        .eq('client', clientName) as any)

      const inboxList = (inboxes || []) as any[]
      const domainList = (domains || []) as any[]

      const connected = inboxList.filter(i => i.status === 'Connected').length
      const disconnected = inboxList.filter(i => i.status === 'Not connected' || i.lifecycle_status === 'disconnected').length
      const warming = inboxList.filter(i => i.lifecycle_status === 'warming' || i.warmup_enabled).length
      const ready = inboxList.filter(i => i.lifecycle_status === 'ready').length
      const active = inboxList.filter(i => i.lifecycle_status === 'active').length

      const avgDeliverability = inboxList.length > 0
        ? inboxList.reduce((sum, i) => sum + (i.deliverability_score || 0), 0) / inboxList.length
        : 0

      const warmupInboxes = inboxList.filter(i => i.warmup_reputation)
      const avgWarmupReputation = warmupInboxes.length > 0
        ? warmupInboxes.reduce((sum, i) => sum + (i.warmup_reputation || 0), 0) / warmupInboxes.length
        : 0

      const lastSynced = inboxList.length > 0 
        ? inboxList.sort((a, b) => new Date(b.synced_at || 0).getTime() - new Date(a.synced_at || 0).getTime())[0]?.synced_at
        : null

      results.push({
        client: clientName,
        totalInboxes: inboxList.length,
        connected,
        disconnected,
        warming,
        ready,
        active,
        domainsCount: domainList.length,
        domainsUnused: domainList.filter(d => d.status === 'purchased' && d.inboxes_ordered === 0).length,
        setsCount: setsCount || 0,
        avgDeliverability,
        avgWarmupReputation,
        lastSynced,
        needsAttention: disconnected > 0 || (domainList.filter(d => d.status === 'purchased' && d.inboxes_ordered === 0).length > 0),
      })
    }

    setSummaries(results)
    setLoading(false)
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      // Both functions run in background and return immediately
      await Promise.all([
        supabase.functions.invoke('sync-inboxes-bison'),
        supabase.functions.invoke('sync-inbox-tags'),
      ])
      // Refetch after a delay to allow background processing
      setTimeout(() => {
        fetchSummaries()
        setSyncing(false)
      }, 3000)
    } catch (err) {
      console.error('Sync failed:', err)
      setSyncing(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totals = summaries.reduce((acc, s) => ({
    inboxes: acc.inboxes + s.totalInboxes,
    connected: acc.connected + s.connected,
    disconnected: acc.disconnected + s.disconnected,
    warming: acc.warming + s.warming,
    domains: acc.domains + s.domainsCount,
    sets: acc.sets + s.setsCount,
  }), { inboxes: 0, connected: 0, disconnected: 0, warming: 0, domains: 0, sets: 0 })

  return (
    <div className="space-y-6">
      {/* Global Stats Bar */}
      <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-rillation-text-muted">Total Inboxes</p>
              <p className="text-2xl font-bold text-white">{totals.inboxes.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-rillation-text-muted">Connected</p>
              <p className="text-2xl font-bold text-rillation-green">{totals.connected.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-rillation-text-muted">Disconnected</p>
              <p className="text-2xl font-bold text-rillation-red">{totals.disconnected.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-rillation-text-muted">Warming</p>
              <p className="text-2xl font-bold text-rillation-orange">{totals.warming.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-rillation-text-muted">Domains</p>
              <p className="text-2xl font-bold text-rillation-cyan">{totals.domains.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-rillation-text-muted">Sets</p>
              <p className="text-2xl font-bold text-rillation-purple">{totals.sets.toLocaleString()}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </Button>
        </div>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaries.map((summary) => (
          <div 
            key={summary.client}
            className={`bg-rillation-card rounded-xl p-5 border ${
              summary.needsAttention 
                ? 'border-rillation-orange/50' 
                : 'border-rillation-border'
            } hover:border-rillation-purple/50 transition-colors`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">{summary.client}</h3>
              {summary.needsAttention && (
                <span className="px-2 py-1 bg-rillation-orange/20 text-rillation-orange text-xs rounded-full flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Needs Attention
                </span>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-rillation-bg rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-white">{summary.totalInboxes}</p>
                <p className="text-xs text-rillation-text-muted">Inboxes</p>
              </div>
              <div className="bg-rillation-bg rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-rillation-cyan">{summary.domainsCount}</p>
                <p className="text-xs text-rillation-text-muted">Domains</p>
              </div>
              <div className="bg-rillation-bg rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-rillation-purple">{summary.setsCount}</p>
                <p className="text-xs text-rillation-text-muted">Sets</p>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="flex items-center gap-2 mb-3 text-sm">
              <span className="flex items-center gap-1 text-rillation-green">
                <CheckCircle size={14} />
                {summary.connected}
              </span>
              <span className="flex items-center gap-1 text-rillation-red">
                <XCircle size={14} />
                {summary.disconnected}
              </span>
              <span className="flex items-center gap-1 text-rillation-orange">
                <Flame size={14} />
                {summary.warming}
              </span>
            </div>

            {/* Alerts */}
            {summary.domainsUnused > 0 && (
              <div className="text-xs text-rillation-orange mb-2">
                {summary.domainsUnused} domains purchased but unused
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-rillation-text-muted pt-3 border-t border-rillation-border/50">
              <span>Synced: {formatDate(summary.lastSynced)}</span>
              {summary.avgDeliverability > 0 && (
                <span className={summary.avgDeliverability >= 90 ? 'text-rillation-green' : summary.avgDeliverability >= 70 ? 'text-rillation-orange' : 'text-rillation-red'}>
                  {Math.round(summary.avgDeliverability)}% deliverability
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
