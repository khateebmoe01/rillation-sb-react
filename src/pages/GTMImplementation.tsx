import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Rocket,
  ChevronRight,
  BookOpen,
  Loader2,
  Plus,
  Sparkles,
  Table2,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  List,
  PanelLeft,
} from 'lucide-react'
import { useFilters } from '../contexts/FilterContext'
import { useClayConfig, useClayTemplates, useClayExecutionLogs } from '../hooks/useClayConfig'
import { useClayWorkbook } from '../hooks/useClayWorkbook'
import { useSavedConfigs } from '../hooks/useSavedConfigs'
import StrategyHeader from '../components/strategy/StrategyHeader'
import {
  WorkbookBuilder,
  SavedConfigsSidebar,
  WorkbookPreviewPanel,
  defaultConfig,
} from '../components/clay/workbook-builder'
import type { WorkbookConfig, SavedConfig } from '../components/clay/workbook-builder'

// View modes
type ViewMode = 'builder' | 'workbooks'

export default function GTMImplementation() {
  const [viewMode, setViewMode] = useState<ViewMode>('builder')
  const [workbookConfig, setWorkbookConfig] = useState<WorkbookConfig>(defaultConfig)
  const [expandedWorkbook, setExpandedWorkbook] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const { strategyClient } = useFilters()

  // Data hooks
  const { config, loading: configLoading } = useClayConfig(strategyClient || undefined)
  const { templates } = useClayTemplates()
  const { logs, refetch: refetchLogs } = useClayExecutionLogs(strategyClient || undefined)

  // Clay Workbook
  const {
    status: workbookStatus,
    result: workbookResult,
    error: workbookError,
    createWorkbook,
  } = useClayWorkbook()

  // Saved configs
  const handleLoadConfig = useCallback((configData: Partial<WorkbookConfig>) => {
    setWorkbookConfig((prev) => ({
      ...prev,
      sourceConfig: configData.sourceConfig || prev.sourceConfig,
      qualificationColumns: configData.qualificationColumns || prev.qualificationColumns,
    }))
  }, [])

  const {
    configs: savedConfigs,
    recentConfigs,
    saveConfig,
    deleteConfig,
    loadConfig,
  } = useSavedConfigs(strategyClient, handleLoadConfig)

  const handleBeginWorkbook = async () => {
    if (!strategyClient || !workbookConfig.leadSource) return

    const filters = workbookConfig.sourceConfig.filters || {}
    console.log('[GTMImplementation] Starting workbook with filters:', JSON.stringify(filters, null, 2))

    await createWorkbook({
      client: strategyClient,
      workbookName: workbookConfig.workbookName,
      filters,
    })
    refetchLogs()
  }

  const handleSaveConfig = (name: string, type: SavedConfig['type']) => {
    saveConfig(name, type, workbookConfig)
  }

  return (
    <div className="h-full flex flex-col bg-rillation-bg">
      {/* Header */}
      <StrategyHeader
        title="Implementation"
        actions={
          <div className="flex items-center gap-2">
            {configLoading && (
              <Loader2 size={16} className="animate-spin text-rillation-text-muted" />
            )}
            {strategyClient && (
              <>
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className={`p-1.5 rounded transition-colors ${
                    showSidebar ? 'bg-white/10 text-white' : 'text-rillation-text/50 hover:text-white'
                  }`}
                  title="Toggle saved configs"
                >
                  <PanelLeft size={16} />
                </button>
                <div className="h-4 w-px bg-rillation-border" />
                <button
                  onClick={() => setViewMode('builder')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === 'builder'
                      ? 'bg-white text-black'
                      : 'text-rillation-text/50 hover:text-white'
                  }`}
                >
                  <Plus size={12} />
                  Builder
                </button>
                <button
                  onClick={() => setViewMode('workbooks')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === 'workbooks'
                      ? 'bg-white text-black'
                      : 'text-rillation-text/50 hover:text-white'
                  }`}
                >
                  <List size={12} />
                  Workbooks
                </button>
              </>
            )}
          </div>
        }
      />

      {strategyClient ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Saved Configs */}
          <AnimatePresence>
            {showSidebar && viewMode === 'builder' && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 224, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SavedConfigsSidebar
                  configs={savedConfigs}
                  recentConfigs={recentConfigs}
                  onLoad={loadConfig}
                  onSave={handleSaveConfig}
                  onDelete={deleteConfig}
                  currentConfig={workbookConfig}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content */}
          <AnimatePresence mode="wait">
            {viewMode === 'builder' ? (
              <motion.div
                key="builder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex overflow-hidden"
              >
                {/* Builder Panel */}
                <WorkbookBuilder
                  config={workbookConfig}
                  onChange={setWorkbookConfig}
                  client={strategyClient || undefined}
                />

                {/* Preview Panel */}
                <WorkbookPreviewPanel
                  config={workbookConfig}
                  onNameChange={(name) => setWorkbookConfig({ ...workbookConfig, workbookName: name })}
                  onBegin={handleBeginWorkbook}
                  status={workbookStatus}
                  error={workbookError}
                  result={workbookResult}
                />
              </motion.div>
            ) : (
              <motion.div
                key="workbooks"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto p-6"
              >
                <WorkbooksView
                  config={config}
                  templates={templates}
                  logs={logs}
                  expandedWorkbook={expandedWorkbook}
                  onToggleWorkbook={(id) =>
                    setExpandedWorkbook(expandedWorkbook === id ? null : id)
                  }
                  onNewWorkbook={() => setViewMode('builder')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-rillation-card border border-rillation-border flex items-center justify-center">
              <Rocket size={28} className="text-rillation-text-muted" />
            </div>
            <h2 className="text-xl font-semibold text-rillation-text mb-2">
              Select a Client
            </h2>
            <p className="text-rillation-text-muted text-sm leading-relaxed">
              Choose a client from the dropdown above to configure their Clay workbook automation.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  )
}

// Workbooks View
interface WorkbookTableInfo {
  id: string
  name: string
  rowCount: number
  status: 'running' | 'complete' | 'pending' | 'error'
}

interface WorkbookInfo {
  id: string
  name: string
  createdAt: string
  tables: WorkbookTableInfo[]
}

function WorkbooksView({
  config,
  templates,
  logs,
  expandedWorkbook,
  onToggleWorkbook,
  onNewWorkbook,
}: {
  config: any
  templates: any[]
  logs: any[]
  expandedWorkbook: string | null
  onToggleWorkbook: (id: string) => void
  onNewWorkbook: () => void
}) {
  const tableConfigs = config?.table_configs || []

  const workbooks: WorkbookInfo[] = tableConfigs.map((table: any, index: number) => ({
    id: table.tableId || `wb_${index}`,
    name: table.workbookName || table.tableName || `Workbook ${index + 1}`,
    createdAt: table.createdAt || new Date().toISOString(),
    tables: [
      {
        id: table.tableId || `t_${index}`,
        name: 'CE Table',
        rowCount: table.rowCount || 0,
        status: table.status || 'pending',
      },
    ],
  }))

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <PlayCircle size={14} className="text-yellow-400" />
      case 'complete':
        return <CheckCircle2 size={14} className="text-green-400" />
      case 'error':
        return <Circle size={14} className="text-red-400" />
      default:
        return <Circle size={14} className="text-rillation-text/60" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Workbooks" value={workbooks.length} />
        <StatCard label="Templates" value={templates.length} />
        <StatCard label="AI Columns" value={Object.keys(config?.column_prompts || {}).length} />
        <StatCard label="Completed" value={logs.filter((l) => l.status === 'completed').length} />
      </div>

      {/* Workbooks List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Workbooks ({workbooks.length})</h3>
          <button
            onClick={onNewWorkbook}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus size={14} />
            New Workbook
          </button>
        </div>

        {workbooks.length > 0 ? (
          <div className="space-y-2">
            {workbooks.map((workbook) => (
              <div
                key={workbook.id}
                className="bg-rillation-card border border-rillation-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => onToggleWorkbook(workbook.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-rillation-card-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: expandedWorkbook === workbook.id ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight size={16} className="text-rillation-text-muted" />
                    </motion.div>
                    <BookOpen size={18} className="text-blue-400" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-rillation-text">{workbook.name}</p>
                      <p className="text-xs text-rillation-text-muted">
                        {workbook.tables.length} table{workbook.tables.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-rillation-text-muted">
                    {new Date(workbook.createdAt).toLocaleDateString()}
                  </span>
                </button>

                <AnimatePresence>
                  {expandedWorkbook === workbook.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-rillation-border bg-rillation-bg/50 px-4 py-2">
                        {workbook.tables.map((table, idx) => (
                          <div
                            key={table.id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-rillation-card transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Table2 size={14} className="text-blue-400" />
                              <span className="text-sm text-rillation-text">{table.name}</span>
                              {idx === 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                  CE
                                </span>
                              )}
                              <span className="text-xs text-rillation-text-muted">
                                ({table.rowCount} rows)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(table.status)}
                              <span className="text-xs text-rillation-text-muted capitalize">
                                {table.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-rillation-card border border-rillation-border rounded-xl p-8 text-center">
            <BookOpen size={32} className="mx-auto text-rillation-text-muted mb-3" />
            <p className="text-sm text-rillation-text-muted">No workbooks yet</p>
            <button
              onClick={onNewWorkbook}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Sparkles size={16} />
              Create Your First Workbook
            </button>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {logs.length > 0 && (
        <div className="bg-rillation-card border border-rillation-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-white mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      log.status === 'completed'
                        ? 'bg-green-500'
                        : log.status === 'failed'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                  />
                  <span className="text-sm text-rillation-text">{log.action}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-rillation-text-muted" />
                  <span className="text-xs text-rillation-text-muted">
                    {new Date(log.started_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Stat Card
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-rillation-card border border-rillation-border rounded-xl p-4">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-rillation-text-muted mt-1">{label}</p>
    </div>
  )
}
