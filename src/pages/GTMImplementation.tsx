import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Rocket,
  ChevronRight,
  LayoutGrid,
  BookOpen,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Table2,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  AlertCircle,
  X,
} from 'lucide-react'
import { useFilters } from '../contexts/FilterContext'
import { useClayConfig, useClayTemplates, useClayExecutionLogs } from '../hooks/useClayConfig'
import { useClayOrchestration } from '../hooks/useClayOrchestration'
import StrategyHeader from '../components/strategy/StrategyHeader'
import { BeginWorkbookWizard } from '../components/clay/BeginWorkbookWizard'

// Tab configuration
type TabId = 'workbooks' | 'templates' | 'summary'

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
}

const TABS: Tab[] = [
  { id: 'workbooks', label: 'Workbooks', icon: BookOpen },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'summary', label: 'Summary', icon: LayoutGrid },
]

export default function GTMImplementation() {
  const [activeTab, setActiveTab] = useState<TabId>('workbooks')
  const [showBeginWizard, setShowBeginWizard] = useState(false)
  const [expandedWorkbook, setExpandedWorkbook] = useState<string | null>(null)
  const { strategyClient } = useFilters()

  // Fetch Clay data for selected client
  const { config, loading: configLoading } = useClayConfig(strategyClient || undefined)
  const { templates, loading: templatesLoading } = useClayTemplates()
  const { logs, loading: logsLoading, refetch: refetchLogs } = useClayExecutionLogs(strategyClient || undefined)

  // AI Orchestration
  const {
    status: orchestrationStatus,
    plan: orchestrationPlan,
    error: orchestrationError,
    beginWorkbook,
    reset: resetOrchestration,
  } = useClayOrchestration()

  const isLoading = configLoading || templatesLoading
  const isOrchestrating = orchestrationStatus === 'generating' || orchestrationStatus === 'executing'

  return (
    <div className="h-full flex flex-col bg-rillation-bg">
      {/* Header with Client Dropdown */}
      <StrategyHeader
        title="Implementation"
        actions={
          <div className="flex items-center gap-3">
            {isLoading && (
              <Loader2 size={18} className="animate-spin text-rillation-text-muted" />
            )}
            {strategyClient && (
              <button
                onClick={() => setShowBeginWizard(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Plus size={14} />
                Begin Workbook
              </button>
            )}
          </div>
        }
      />

      {strategyClient ? (
        <>
          {/* Tabs */}
          <div className="flex-shrink-0 px-6 py-3 border-b border-rillation-border bg-rillation-card/50">
            <div className="flex gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-white text-black font-medium'
                        : 'text-rillation-text-muted hover:bg-rillation-card-hover hover:text-rillation-text'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'workbooks' && (
                <WorkbooksTab
                  key="workbooks"
                  config={config}
                  expandedWorkbook={expandedWorkbook}
                  onToggleWorkbook={(id) => setExpandedWorkbook(expandedWorkbook === id ? null : id)}
                  onBeginWorkbook={() => setShowBeginWizard(true)}
                />
              )}
              {activeTab === 'templates' && (
                <TemplatesTab key="templates" templates={templates} />
              )}
              {activeTab === 'summary' && (
                <SummaryTab
                  key="summary"
                  config={config}
                  templates={templates}
                  logs={logs}
                  logsLoading={logsLoading}
                />
              )}
            </AnimatePresence>
          </div>
        </>
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
              Choose a client from the dropdown above to configure their Clay workbook automation,
              table configurations, and AI prompts.
            </p>
          </motion.div>
        </div>
      )}

      {/* Begin Workbook Wizard */}
      <AnimatePresence>
        {showBeginWizard && (
          <BeginWorkbookWizard
            onClose={() => setShowBeginWizard(false)}
            onComplete={async (wizardConfig) => {
              console.log('Beginning workbook with config:', wizardConfig)
              setShowBeginWizard(false)

              // Call the AI orchestration edge function
              if (strategyClient) {
                await beginWorkbook(
                  {
                    workbookName: wizardConfig.workbookName,
                    leadSource: wizardConfig.leadSource!,
                    sourceConfig: wizardConfig.sourceConfig,
                    qualificationColumns: wizardConfig.qualificationColumns,
                  },
                  strategyClient
                )
                // Refresh logs after execution
                refetchLogs()
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Orchestration Status Modal */}
      <AnimatePresence>
        {(isOrchestrating || orchestrationStatus === 'complete' || orchestrationStatus === 'error') && (
          <OrchestrationModal
            status={orchestrationStatus}
            plan={orchestrationPlan}
            error={orchestrationError}
            onClose={resetOrchestration}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Orchestration Status Modal
function OrchestrationModal({
  status,
  plan,
  error,
  onClose,
}: {
  status: string
  plan: any
  error: string | null
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl max-h-[80vh] bg-[#1a1a2e] rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === 'generating' && (
              <>
                <Loader2 size={20} className="animate-spin text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Generating Execution Plan...</h2>
              </>
            )}
            {status === 'executing' && (
              <>
                <Loader2 size={20} className="animate-spin text-yellow-400" />
                <h2 className="text-lg font-semibold text-white">Executing Plan...</h2>
              </>
            )}
            {status === 'complete' && (
              <>
                <CheckCircle2 size={20} className="text-green-400" />
                <h2 className="text-lg font-semibold text-white">Workbook Created!</h2>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle size={20} className="text-red-400" />
                <h2 className="text-lg font-semibold text-white">Error</h2>
              </>
            )}
          </div>
          {(status === 'complete' || status === 'error') && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {status === 'generating' && (
            <div className="text-center py-8">
              <Sparkles size={48} className="mx-auto text-blue-400 mb-4" />
              <p className="text-gray-400">
                Claude Opus 4.5 is analyzing your configuration and designing the optimal execution plan...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This includes determining column dependencies, crafting AI prompts, and estimating costs.
              </p>
            </div>
          )}

          {status === 'error' && error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {status === 'complete' && plan && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400 font-medium">{plan.summary}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-white">{plan.steps?.length || 0}</p>
                  <p className="text-xs text-gray-400">Steps</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-white">{plan.estimatedRows || 0}</p>
                  <p className="text-xs text-gray-400">Rows</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-semibold text-white">{plan.estimatedTotalCredits || 0}</p>
                  <p className="text-xs text-gray-400">Est. Credits</p>
                </div>
              </div>

              {/* Steps */}
              {plan.steps && plan.steps.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Execution Steps</h3>
                  <div className="space-y-2">
                    {plan.steps.map((step: any) => (
                      <div
                        key={step.order}
                        className="flex items-center gap-3 bg-gray-800/30 rounded-lg p-3"
                      >
                        <span className="w-6 h-6 flex items-center justify-center bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                          {step.order}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-white">{step.description}</p>
                          <p className="text-xs text-gray-500">{step.type}</p>
                        </div>
                        {step.estimatedCredits > 0 && (
                          <span className="text-xs text-gray-400">
                            ~{step.estimatedCredits} credits
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {plan.warnings && plan.warnings.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-400 mb-2">Warnings</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    {plan.warnings.map((warning: string, i: number) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {plan.recommendations && plan.recommendations.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Recommendations</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    {plan.recommendations.map((rec: string, i: number) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(status === 'complete' || status === 'error') && (
          <div className="px-6 py-4 border-t border-gray-700/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// Workbooks Tab Component
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

function WorkbooksTab({
  config,
  expandedWorkbook,
  onToggleWorkbook,
  onBeginWorkbook,
}: {
  config: any
  expandedWorkbook: string | null
  onToggleWorkbook: (id: string) => void
  onBeginWorkbook: () => void
}) {
  // Transform table_configs into workbook structure
  // For now, group tables by their workbook or show as individual workbooks
  const tableConfigs = config?.table_configs || []

  // Mock workbooks structure - in reality this would come from Clay API
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
      ...(table.additionalTables || []),
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
        return <Circle size={14} className="text-zinc-500" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-rillation-text">
          Workbooks ({workbooks.length})
        </h3>
        <button
          onClick={onBeginWorkbook}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus size={14} />
          Begin Workbook
        </button>
      </div>

      {workbooks.length > 0 ? (
        <div className="space-y-2">
          {workbooks.map((workbook) => (
            <div
              key={workbook.id}
              className="bg-rillation-card border border-rillation-border rounded-xl overflow-hidden"
            >
              {/* Workbook Header */}
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
                <div className="flex items-center gap-3">
                  <span className="text-xs text-rillation-text-muted">
                    {new Date(workbook.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </button>

              {/* Tables List (Expanded) */}
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
                            <div className="w-4 h-4 flex items-center justify-center">
                              {idx === 0 ? (
                                <Table2 size={14} className="text-blue-400" />
                              ) : (
                                <div className="w-px h-4 bg-rillation-border ml-1.5" />
                              )}
                            </div>
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
          <p className="text-xs text-rillation-text-muted mt-1 mb-4">
            Begin a workbook to start building your enrichment pipeline
          </p>
          <button
            onClick={onBeginWorkbook}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Sparkles size={16} />
            Begin Your First Workbook
          </button>
        </div>
      )}
    </motion.div>
  )
}

// Templates Tab Component
function TemplatesTab({ templates }: { templates: any[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-rillation-text">Workbook Templates</h3>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-zinc-200 transition-colors">
          <Plus size={14} />
          Create Template
        </button>
      </div>

      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-rillation-card border border-rillation-border rounded-xl p-4 hover:border-white/20 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-rillation-text">{template.name}</p>
                  {template.description && (
                    <p className="text-xs text-rillation-text-muted mt-1">{template.description}</p>
                  )}
                </div>
                <FileText size={18} className="text-rillation-text-muted" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-rillation-bg rounded text-rillation-text-muted">
                  {template.table_configs?.length || 0} tables
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-rillation-card border border-rillation-border rounded-xl p-8 text-center">
          <FileText size={32} className="mx-auto text-rillation-text-muted mb-3" />
          <p className="text-sm text-rillation-text-muted">No templates yet</p>
          <p className="text-xs text-rillation-text-muted mt-1">
            Save workbook configurations as templates for reuse
          </p>
        </div>
      )}
    </motion.div>
  )
}

// Summary Tab Component
function SummaryTab({
  config,
  templates,
  logs,
  logsLoading,
}: {
  config: any
  templates: any[]
  logs: any[]
  logsLoading: boolean
}) {
  const tableConfigs = config?.table_configs || []
  const recentLogs = logs.slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-rillation-card border border-rillation-border rounded-xl p-4">
          <p className="text-2xl font-semibold text-rillation-text">{tableConfigs.length}</p>
          <p className="text-xs text-rillation-text-muted mt-1">Workbooks</p>
        </div>
        <div className="bg-rillation-card border border-rillation-border rounded-xl p-4">
          <p className="text-2xl font-semibold text-rillation-text">{templates.length}</p>
          <p className="text-xs text-rillation-text-muted mt-1">Templates</p>
        </div>
        <div className="bg-rillation-card border border-rillation-border rounded-xl p-4">
          <p className="text-2xl font-semibold text-rillation-text">
            {Object.keys(config?.column_prompts || {}).length}
          </p>
          <p className="text-xs text-rillation-text-muted mt-1">AI Columns</p>
        </div>
        <div className="bg-rillation-card border border-rillation-border rounded-xl p-4">
          <p className="text-2xl font-semibold text-rillation-text">
            {logs.filter((l) => l.status === 'completed').length}
          </p>
          <p className="text-xs text-rillation-text-muted mt-1">Completed Runs</p>
        </div>
      </div>

      {/* Workspace Info */}
      <div className="bg-rillation-card border border-rillation-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-rillation-text mb-3">Workspace</h3>
        {config?.workspace_id ? (
          <p className="text-sm text-rillation-text-muted font-mono">{config.workspace_id}</p>
        ) : (
          <p className="text-sm text-rillation-text-muted">No workspace configured</p>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-rillation-card border border-rillation-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-rillation-text mb-3">Recent Activity</h3>
        {logsLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={16} className="animate-spin text-rillation-text-muted" />
          </div>
        ) : recentLogs.length > 0 ? (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      log.status === 'completed'
                        ? 'bg-green-500'
                        : log.status === 'failed'
                        ? 'bg-red-500'
                        : log.status === 'running'
                        ? 'bg-yellow-500'
                        : 'bg-zinc-500'
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
        ) : (
          <p className="text-sm text-rillation-text-muted py-2">No recent activity</p>
        )}
      </div>
    </motion.div>
  )
}
