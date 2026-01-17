import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity,
  RefreshCw,
  Play,
  Check,
  AlertTriangle,
  Zap,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClients } from '../../hooks/useClients'
import Button from '../ui/Button'
import ClientFilter from '../ui/ClientFilter'

interface HealthCheck {
  id: string
  inbox_email: string
  domain: string
  client: string
  sent_count: number
  reply_count: number
  reply_rate: number
  bounce_count: number
  health_score: number
  recommendation: 'keep' | 'watch' | 'rotate' | 'cancel'
  checked_at: string
}

interface RebatchRun {
  id: string
  run_date: string
  client: string
  daily_send_goal: number
  active_domains: number
  insurance_domains: number
  domains_to_cancel: string[]
  domains_to_activate: string[]
  domains_to_buy: number
  inboxes_analyzed: number
  avg_reply_rate: number
  status: 'preview' | 'approved' | 'executing' | 'executed' | 'failed'
  executed_at: string | null
  created_at: string
}

const recommendationColors = {
  keep: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: Check },
  watch: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: AlertTriangle },
  rotate: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', icon: RotateCw },
  cancel: { bg: 'bg-red-500/20', text: 'text-red-400', icon: Trash2 },
}

export default function HealthMonitor() {
  const { clients } = useClients()
  const [selectedClient, setSelectedClient] = useState('')
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [rebatchRuns, setRebatchRuns] = useState<RebatchRun[]>([])
  const [loading, setLoading] = useState(true)
  const [runningPreview, setRunningPreview] = useState(false)
  const [executingRun, setExecutingRun] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'health' | 'rebatch'>('health')

  // Fetch data
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch latest health checks
      let healthQuery = supabase
        .from('inbox_health_checks')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(500)

      if (selectedClient) {
        healthQuery = healthQuery.eq('client', selectedClient)
      }

      const { data: healthData } = await healthQuery
      setHealthChecks(healthData || [])

      // Fetch rebatch runs
      let runsQuery = supabase
        .from('rebatch_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (selectedClient) {
        runsQuery = runsQuery.eq('client', selectedClient)
      }

      const { data: runsData } = await runsQuery
      setRebatchRuns(runsData || [])
    } catch (err) {
      console.error('Failed to fetch health data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedClient])

  // Aggregate health by domain
  const domainHealth = useMemo(() => {
    const domains: Record<string, {
      domain: string
      client: string
      inboxCount: number
      avgHealth: number
      avgReply: number
      recommendations: Record<string, number>
    }> = {}

    for (const check of healthChecks) {
      if (!domains[check.domain]) {
        domains[check.domain] = {
          domain: check.domain,
          client: check.client,
          inboxCount: 0,
          avgHealth: 0,
          avgReply: 0,
          recommendations: { keep: 0, watch: 0, rotate: 0, cancel: 0 },
        }
      }
      domains[check.domain].inboxCount++
      domains[check.domain].avgHealth += check.health_score
      domains[check.domain].avgReply += check.reply_rate
      domains[check.domain].recommendations[check.recommendation]++
    }

    // Calculate averages
    return Object.values(domains).map(d => ({
      ...d,
      avgHealth: d.inboxCount > 0 ? Math.round(d.avgHealth / d.inboxCount) : 0,
      avgReply: d.inboxCount > 0 ? d.avgReply / d.inboxCount : 0,
      primaryRecommendation: Object.entries(d.recommendations)
        .sort((a, b) => b[1] - a[1])[0]?.[0] as 'keep' | 'watch' | 'rotate' | 'cancel' || 'keep',
    })).sort((a, b) => a.avgHealth - b.avgHealth)
  }, [healthChecks])

  // Run preview
  const runPreview = async () => {
    setRunningPreview(true)
    try {
      await supabase.functions.invoke('global-rebatch', {
        body: { action: 'preview', client: selectedClient || undefined },
      })
      await fetchData()
    } catch (err) {
      console.error('Preview failed:', err)
    } finally {
      setRunningPreview(false)
    }
  }

  // Approve run
  const approveRun = async (runId: string) => {
    await supabase.functions.invoke('global-rebatch', {
      body: { action: 'approve', run_id: runId },
    })
    await fetchData()
  }

  // Execute run
  const executeRun = async (runId: string) => {
    setExecutingRun(runId)
    try {
      await supabase.functions.invoke('global-rebatch', {
        body: { action: 'execute', run_id: runId },
      })
      await fetchData()
    } catch (err) {
      console.error('Execute failed:', err)
    } finally {
      setExecutingRun(null)
    }
  }

  // Summary stats
  const stats = useMemo(() => {
    const total = healthChecks.length
    const healthy = healthChecks.filter(h => h.health_score >= 80).length
    const warning = healthChecks.filter(h => h.health_score >= 60 && h.health_score < 80).length
    const critical = healthChecks.filter(h => h.health_score < 60).length
    const avgReply = total > 0 
      ? healthChecks.reduce((sum, h) => sum + h.reply_rate, 0) / total 
      : 0

    return { total, healthy, warning, critical, avgReply }
  }, [healthChecks])

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={24} className="text-emerald-400" />
          <h2 className="text-xl font-semibold text-white">Health Monitor</h2>
        </div>
        <div className="flex items-center gap-3">
          <ClientFilter
            clients={clients}
            selectedClient={selectedClient}
            onChange={setSelectedClient}
          />
          <Button variant="secondary" onClick={fetchData}>
            <RefreshCw size={16} />
            Refresh
          </Button>
          <Button variant="primary" onClick={runPreview} disabled={runningPreview}>
            <Play size={16} className={runningPreview ? 'animate-pulse' : ''} />
            {runningPreview ? 'Running...' : 'Preview Rebatch'}
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <motion.div
        className="grid grid-cols-5 gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
          <p className="text-xs text-white/60 mb-1">Inboxes Analyzed</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-rillation-card rounded-xl p-4 border border-emerald-500/30">
          <p className="text-xs text-emerald-400 mb-1">Healthy (80+)</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.healthy}</p>
        </div>
        <div className="bg-rillation-card rounded-xl p-4 border border-amber-500/30">
          <p className="text-xs text-amber-400 mb-1">Warning (60-79)</p>
          <p className="text-2xl font-bold text-amber-400">{stats.warning}</p>
        </div>
        <div className="bg-rillation-card rounded-xl p-4 border border-red-500/30">
          <p className="text-xs text-red-400 mb-1">Critical (&lt;60)</p>
          <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
        </div>
        <div className="bg-rillation-card rounded-xl p-4 border border-rillation-border">
          <p className="text-xs text-white/60 mb-1">Avg Reply Rate</p>
          <p className="text-2xl font-bold text-white">{stats.avgReply.toFixed(2)}%</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-rillation-border pb-2">
        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === 'health'
              ? 'bg-white text-slate-900'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Domain Health
        </button>
        <button
          onClick={() => setActiveTab('rebatch')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === 'rebatch'
              ? 'bg-white text-slate-900'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Rebatch History ({rebatchRuns.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'health' ? (
          <motion.div
            key="health"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rillation-card rounded-xl border border-rillation-border overflow-hidden"
          >
            {domainHealth.length === 0 ? (
              <div className="p-8 text-center text-white/60">
                No health data yet. Run a preview to analyze inbox health.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-white/60 border-b border-rillation-border">
                    <th className="px-4 py-3 text-left">Domain</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-right">Inboxes</th>
                    <th className="px-4 py-3 text-right">Avg Health</th>
                    <th className="px-4 py-3 text-right">Avg Reply Rate</th>
                    <th className="px-4 py-3 text-center">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rillation-border/30">
                  {domainHealth.slice(0, 50).map((domain) => {
                    const recConfig = recommendationColors[domain.primaryRecommendation]
                    const RecIcon = recConfig.icon
                    
                    return (
                      <tr key={domain.domain} className="hover:bg-rillation-card-hover">
                        <td className="px-4 py-3 text-white font-mono text-xs">{domain.domain}</td>
                        <td className="px-4 py-3 text-white/80">{domain.client}</td>
                        <td className="px-4 py-3 text-right text-white">{domain.inboxCount}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-medium ${
                            domain.avgHealth >= 80 ? 'text-emerald-400' :
                            domain.avgHealth >= 60 ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {domain.avgHealth}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {domain.avgReply.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${recConfig.bg} ${recConfig.text}`}>
                            <RecIcon size={12} />
                            {domain.primaryRecommendation}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="rebatch"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {rebatchRuns.length === 0 ? (
              <div className="bg-rillation-card rounded-xl p-8 text-center text-white/60 border border-rillation-border">
                No rebatch runs yet. Click "Preview Rebatch" to generate recommendations.
              </div>
            ) : (
              rebatchRuns.map((run) => (
                <motion.div
                  key={run.id}
                  className="bg-rillation-card rounded-xl p-5 border border-rillation-border"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{run.client}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          run.status === 'executed' ? 'bg-emerald-500/20 text-emerald-400' :
                          run.status === 'approved' ? 'bg-cyan-500/20 text-cyan-400' :
                          run.status === 'preview' ? 'bg-amber-500/20 text-amber-400' :
                          run.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          'bg-slate-500/20 text-white/60'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      <p className="text-xs text-white/60">
                        {new Date(run.created_at).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {run.status === 'preview' && (
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => approveRun(run.id)}
                        >
                          <Check size={14} />
                          Approve
                        </Button>
                      )}
                      {run.status === 'approved' && (
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => executeRun(run.id)}
                          disabled={executingRun === run.id}
                        >
                          <Zap size={14} className={executingRun === run.id ? 'animate-pulse' : ''} />
                          {executingRun === run.id ? 'Executing...' : 'Execute'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-white/60 mb-1">Daily Goal</p>
                      <p className="text-white font-medium">{run.daily_send_goal}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 mb-1">Active</p>
                      <p className="text-white font-medium">{run.active_domains}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 mb-1">Insurance</p>
                      <p className="text-white font-medium">{run.insurance_domains}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/60 mb-1">Avg Reply</p>
                      <p className="text-white font-medium">{run.avg_reply_rate?.toFixed(2) || 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-400 mb-1">Cancel</p>
                      <p className="text-red-400 font-medium">{run.domains_to_cancel?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-400 mb-1">Activate</p>
                      <p className="text-emerald-400 font-medium">{run.domains_to_activate?.length || 0}</p>
                    </div>
                  </div>

                  {(run.domains_to_cancel?.length > 0 || run.domains_to_activate?.length > 0) && (
                    <div className="mt-4 pt-4 border-t border-rillation-border/50 grid grid-cols-2 gap-4">
                      {run.domains_to_cancel?.length > 0 && (
                        <div>
                          <p className="text-xs text-red-400 mb-2">Domains to Cancel:</p>
                          <div className="flex flex-wrap gap-1">
                            {run.domains_to_cancel.slice(0, 10).map((d) => (
                              <span key={d} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs font-mono">
                                {d}
                              </span>
                            ))}
                            {run.domains_to_cancel.length > 10 && (
                              <span className="text-xs text-white/50">+{run.domains_to_cancel.length - 10} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      {run.domains_to_activate?.length > 0 && (
                        <div>
                          <p className="text-xs text-emerald-400 mb-2">Domains to Activate:</p>
                          <div className="flex flex-wrap gap-1">
                            {run.domains_to_activate.slice(0, 10).map((d) => (
                              <span key={d} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs font-mono">
                                {d}
                              </span>
                            ))}
                            {run.domains_to_activate.length > 10 && (
                              <span className="text-xs text-white/50">+{run.domains_to_activate.length - 10} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
