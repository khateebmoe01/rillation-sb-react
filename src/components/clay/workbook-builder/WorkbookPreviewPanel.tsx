import { motion } from 'framer-motion'
import { Sparkles, Building2, Columns, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import type { WorkbookConfig } from './WorkbookBuilder'
import type { OrchestrationStatus, ExecutionPlan } from '../../../hooks/useClayOrchestration'

const AI_MODELS: Record<string, { name: string; credits: number }> = {
  'clay-argon': { name: 'Clay Argon', credits: 1 },
  'gpt-4o-mini': { name: 'GPT 4o Mini', credits: 1 },
  'gpt-4o': { name: 'GPT 4o', credits: 3 },
  'gpt-4.1-mini': { name: 'GPT 4.1 Mini', credits: 1 },
  'gpt-4.1': { name: 'GPT 4.1', credits: 12 },
}

interface WorkbookPreviewPanelProps {
  config: WorkbookConfig
  onNameChange: (name: string) => void
  onBegin: () => void
  status: OrchestrationStatus
  plan?: ExecutionPlan | null
  error?: string | null
}

export function WorkbookPreviewPanel({
  config,
  onNameChange,
  onBegin,
  status,
  plan,
  error,
}: WorkbookPreviewPanelProps) {
  const estimatedCredits = config.qualificationColumns.reduce((total, col) => {
    const model = AI_MODELS[col.model]
    return total + (model?.credits || 1) * config.sourceConfig.maxRows
  }, 0)

  const filterCount = config.sourceConfig.filters
    ? Object.values(config.sourceConfig.filters).filter(
        (v) => v && (Array.isArray(v) ? v.length > 0 : true)
      ).length
    : 0

  const isValid =
    config.leadSource !== null &&
    config.qualificationColumns.length > 0 &&
    config.workbookName.trim() !== ''

  return (
    <div className="w-72 flex-shrink-0 border-l border-gray-800 bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Preview
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Workbook Name */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Workbook Name
          </label>
          <input
            type="text"
            value={config.workbookName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Q1 2026 SaaS Outreach"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm placeholder-gray-600 focus:border-gray-600 focus:outline-none"
          />
        </div>

        {/* Configuration Summary */}
        <div className="bg-gray-800/30 rounded-lg p-3 space-y-3">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Configuration
          </div>

          {/* Lead Source */}
          <SummaryRow
            icon={<Building2 size={14} />}
            label="Lead Source"
            value={
              config.leadSource
                ? config.leadSource.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                : 'Not selected'
            }
            valid={config.leadSource !== null}
          />

          {/* Filters */}
          {config.leadSource === 'find-companies' && (
            <SummaryRow
              icon={<Sparkles size={14} />}
              label="Filters Applied"
              value={filterCount > 0 ? `${filterCount} active` : 'None'}
              valid={filterCount > 0}
            />
          )}

          {/* Columns */}
          <SummaryRow
            icon={<Columns size={14} />}
            label="CE Columns"
            value={`${config.qualificationColumns.length} defined`}
            valid={config.qualificationColumns.length > 0}
          />

          {/* Column List */}
          {config.qualificationColumns.length > 0 && (
            <div className="pl-6 space-y-1">
              {config.qualificationColumns.map((col, i) => (
                <div key={col.id} className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="text-gray-600">{i + 1}.</span>
                  <span className="truncate">
                    {col.name || 'Unnamed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cost Estimate */}
        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
            Estimated Cost
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white">
              {estimatedCredits.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">credits</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Based on {config.sourceConfig.maxRows} rows × {config.qualificationColumns.length} columns
          </div>
          {config.qualificationColumns.length > 0 && (
            <div className="mt-2 space-y-1">
              {config.qualificationColumns.map((col) => {
                const model = AI_MODELS[col.model]
                const colCredits = (model?.credits || 1) * config.sourceConfig.maxRows
                return (
                  <div key={col.id} className="flex justify-between text-xs text-gray-600">
                    <span className="truncate">{col.name || 'Unnamed'}</span>
                    <span>{colCredits}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Status Display */}
        {status !== 'idle' && (
          <StatusDisplay status={status} plan={plan} error={error} />
        )}
      </div>

      {/* Begin Button */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={onBegin}
          disabled={!isValid || status === 'generating' || status === 'executing'}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            isValid && status === 'idle'
              ? 'bg-white text-black hover:bg-gray-200'
              : status === 'generating' || status === 'executing'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {status === 'generating' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating Plan...
            </>
          ) : status === 'executing' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Begin Workbook
            </>
          )}
        </button>
        {isValid && status === 'idle' && (
          <p className="text-xs text-gray-600 text-center mt-2">
            Claude Opus 4.5 will optimize your execution
          </p>
        )}
        {!isValid && status === 'idle' && (
          <p className="text-xs text-red-400/60 text-center mt-2">
            {!config.leadSource
              ? 'Select a lead source'
              : config.qualificationColumns.length === 0
              ? 'Add at least one CE column'
              : 'Enter a workbook name'}
          </p>
        )}
      </div>
    </div>
  )
}

// Summary Row
function SummaryRow({
  icon,
  label,
  value,
  valid,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valid: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <div className={valid ? 'text-green-400' : 'text-gray-600'}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-sm ${valid ? 'text-white' : 'text-gray-600'}`}>
          {value}
        </div>
      </div>
    </div>
  )
}

// Status Display
function StatusDisplay({
  status,
  plan,
  error,
}: {
  status: OrchestrationStatus
  plan?: ExecutionPlan | null
  error?: string | null
}) {
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-500/10 border border-red-500/30 rounded-lg p-3"
      >
        <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
          <AlertCircle size={14} />
          Error
        </div>
        <p className="text-xs text-red-300/80">{error}</p>
      </motion.div>
    )
  }

  if (status === 'complete' && plan) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-500/10 border border-green-500/30 rounded-lg p-3"
      >
        <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-2">
          <CheckCircle2 size={14} />
          Plan Generated
        </div>
        <div className="space-y-1 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Steps</span>
            <span className="text-white">{plan.steps?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Est. Credits</span>
            <span className="text-white">{plan.estimatedTotalCredits?.toLocaleString() || 0}</span>
          </div>
        </div>
        {plan.summary && (
          <p className="text-xs text-gray-500 mt-2">{plan.summary}</p>
        )}
      </motion.div>
    )
  }

  if (status === 'generating') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3"
      >
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
          <Loader2 size={14} className="animate-spin" />
          Generating execution plan...
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Claude is analyzing your configuration
        </p>
      </motion.div>
    )
  }

  return null
}

export default WorkbookPreviewPanel
