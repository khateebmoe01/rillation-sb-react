import { motion } from 'framer-motion'
import { Sparkles, Building2, Columns, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import type { WorkbookConfig } from './WorkbookBuilder'
import type { WorkbookStatus, CreateWorkbookResult } from '../../../hooks/useClayWorkbook'

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
  status: WorkbookStatus
  error?: string | null
  result?: CreateWorkbookResult | null
}

export function WorkbookPreviewPanel({
  config,
  onNameChange,
  onBegin,
  status,
  error,
  result,
}: WorkbookPreviewPanelProps) {
  const estimatedCredits = config.qualificationColumns.reduce((total, col) => {
    const model = AI_MODELS[col.model]
    return total + (model?.credits || 1) * config.sourceConfig.maxRows
  }, 0)

  // Count only meaningful filters (arrays with values), excluding limit
  const filters = config.sourceConfig.filters || {}
  const meaningfulFilterKeys = [
    'industries', 'sizes', 'annual_revenues', 'country_names', 'locations',
    'description_keywords', 'semantic_description', 'types', 'funding_amounts',
    'industries_exclude', 'country_names_exclude', 'locations_exclude',
    'description_keywords_exclude', 'company_identifier'
  ]

  const filterCount = meaningfulFilterKeys.reduce((count, key) => {
    const value = (filters as Record<string, unknown>)[key]
    if (Array.isArray(value) && value.length > 0) return count + 1
    if (typeof value === 'string' && value.trim() !== '') return count + 1
    return count
  }, 0)

  // For find-companies, require at least one meaningful filter
  const hasFilters = config.leadSource !== 'find-companies' || filterCount > 0

  // CE columns are now optional
  const isValid =
    config.leadSource !== null &&
    config.workbookName.trim() !== '' &&
    hasFilters

  return (
    <div className="w-72 flex-shrink-0 border-l border-rillation-border bg-rillation-bg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-rillation-border">
        <h3 className="text-sm font-medium text-rillation-text/70 uppercase tracking-wider">
          Preview
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Workbook Name */}
        <div>
          <label className="block text-xs font-medium text-rillation-text/60 mb-1">
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
          <div className="text-xs font-medium text-rillation-text/70 uppercase tracking-wider">
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
            label="AI Enrichment"
            value={
              config.qualificationColumns.length > 0
                ? `${config.qualificationColumns.length} column${config.qualificationColumns.length !== 1 ? 's' : ''}`
                : 'None (optional)'
            }
            valid={true} // Always valid since optional
          />

          {/* Column List */}
          {config.qualificationColumns.length > 0 && (
            <div className="pl-6 space-y-1">
              {config.qualificationColumns.map((col, i) => (
                <div key={col.id} className="text-xs text-rillation-text/60 flex items-center gap-1.5">
                  <span className="text-rillation-text/50">{i + 1}.</span>
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
          <div className="text-xs font-medium text-rillation-text/70 uppercase tracking-wider mb-2">
            Estimated Cost
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-white">
              {estimatedCredits.toLocaleString()}
            </span>
            <span className="text-sm text-rillation-text/60">credits</span>
          </div>
          <div className="mt-2 text-xs text-rillation-text/60">
            Based on {config.sourceConfig.maxRows} rows × {config.qualificationColumns.length} columns
          </div>
          {config.qualificationColumns.length > 0 && (
            <div className="mt-2 space-y-1">
              {config.qualificationColumns.map((col) => {
                const model = AI_MODELS[col.model]
                const colCredits = (model?.credits || 1) * config.sourceConfig.maxRows
                return (
                  <div key={col.id} className="flex justify-between text-xs text-rillation-text/50">
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
          <StatusDisplay status={status} error={error} result={result} />
        )}
      </div>

      {/* Begin Button */}
      <div className="p-4 border-t border-rillation-border">
        <button
          onClick={onBegin}
          disabled={!isValid || status === 'creating' || status === 'finding' || status === 'importing'}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            isValid && status === 'idle'
              ? 'bg-white text-black hover:bg-gray-200'
              : status === 'creating' || status === 'finding' || status === 'importing'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-800 text-rillation-text/60 cursor-not-allowed'
          }`}
        >
          {status === 'creating' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating...
            </>
          ) : status === 'finding' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Finding...
            </>
          ) : status === 'importing' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Begin Workbook
            </>
          )}
        </button>
        {isValid && status === 'idle' && (
          <p className="text-xs text-rillation-text/50 text-center mt-2">
            Creates workbook and imports companies to Clay
          </p>
        )}
        {!isValid && status === 'idle' && (
          <p className="text-xs text-red-400/60 text-center mt-2">
            {!config.leadSource
              ? 'Select a lead source'
              : !config.workbookName.trim()
              ? 'Enter a workbook name'
              : !hasFilters
              ? 'Select at least one filter (industry, country, etc.)'
              : 'Complete configuration'}
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
      <div className={valid ? 'text-green-400' : 'text-rillation-text/50'}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-rillation-text/60">{label}</div>
        <div className={`text-sm ${valid ? 'text-white' : 'text-rillation-text/50'}`}>
          {value}
        </div>
      </div>
    </div>
  )
}

// Step indicator component
function StepIndicator({
  step,
  label,
  status
}: {
  step: number
  label: string
  status: 'pending' | 'active' | 'complete' | 'error'
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
        status === 'complete' ? 'bg-green-500 text-white' :
        status === 'active' ? 'bg-blue-500 text-white' :
        status === 'error' ? 'bg-red-500 text-white' :
        'bg-gray-700 text-rillation-text/70'
      }`}>
        {status === 'complete' ? <CheckCircle2 size={12} /> :
         status === 'active' ? <Loader2 size={12} className="animate-spin" /> :
         status === 'error' ? <AlertCircle size={12} /> :
         step}
      </div>
      <span className={`text-xs ${
        status === 'complete' ? 'text-green-400' :
        status === 'active' ? 'text-blue-400' :
        status === 'error' ? 'text-red-400' :
        'text-rillation-text/60'
      }`}>
        {label}
      </span>
    </div>
  )
}

// Status Display
function StatusDisplay({
  status,
  error,
  result,
}: {
  status: WorkbookStatus
  error?: string | null
  result?: CreateWorkbookResult | null
}) {
  // Determine step statuses
  const getStepStatus = (stepName: 'create_workbook' | 'find_companies' | 'import_companies') => {
    if (status === 'idle') return 'pending'

    const stepOrder = ['create_workbook', 'find_companies', 'import_companies']
    const currentStepMap: Record<WorkbookStatus, number> = {
      'idle': -1,
      'creating': 0,
      'finding': 1,
      'importing': 2,
      'complete': 3,
      'error': stepOrder.indexOf(result?.step || 'create_workbook')
    }

    const stepIndex = stepOrder.indexOf(stepName)
    const currentIndex = currentStepMap[status]

    if (status === 'error' && result?.step === stepName) return 'error'
    if (stepIndex < currentIndex) return 'complete'
    if (stepIndex === currentIndex && status !== 'error') return 'active'
    return 'pending'
  }

  if (status === 'idle') return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Steps Progress */}
      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
        <StepIndicator step={1} label="Create workbook" status={getStepStatus('create_workbook')} />
        <StepIndicator step={2} label="Find companies" status={getStepStatus('find_companies')} />
        <StepIndicator step={3} label="Import companies" status={getStepStatus('import_companies')} />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-xs text-red-300/80">{error}</p>
        </div>
      )}

      {/* Success result */}
      {status === 'complete' && result?.success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
          <div className="space-y-1 text-xs text-rillation-text/70">
            <div className="flex justify-between">
              <span>Companies Found</span>
              <span className="text-white">{result.companiesFound?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Records Imported</span>
              <span className="text-white">{result.recordsImported?.toLocaleString() || 0}</span>
            </div>
          </div>
          {result.tableUrl && (
            <a
              href={result.tableUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-2 bg-white text-black text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ExternalLink size={12} />
              Open in Clay
            </a>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default WorkbookPreviewPanel
