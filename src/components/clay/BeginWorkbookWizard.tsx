import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import CompanySearchFilters from './CompanySearchFilters'
import type { CompanySearchFilters as CompanySearchFiltersType } from '../../../clay-automation/types/company-search'

// Types
type LeadSource = 'find-companies' | 'csv-import' | 'other'

interface QualificationColumn {
  id: string
  name: string
  prompt: string
  condition: string
  conditionColumn: string
  outputFields: {
    qualified: boolean
    score: boolean
    reasoning: boolean
  }
  model: string
}

interface WizardState {
  leadSource: LeadSource | null
  sourceConfig: {
    maxRows: number
    filters?: CompanySearchFiltersType
  }
  qualificationColumns: QualificationColumn[]
  workbookName: string
}

const STEPS = [
  { id: 1, title: 'Lead Source', description: 'Choose where to get leads' },
  { id: 2, title: 'Configure Source', description: 'Set up source parameters' },
  { id: 3, title: 'CE Columns', description: 'Define AI columns for CE table' },
  { id: 4, title: 'Review & Begin', description: 'AI orchestration preview' },
]

const AI_MODELS = [
  { id: 'clay-argon', name: 'Clay Argon', credits: 1 },
  { id: 'gpt-4o', name: 'GPT 4o', credits: 3 },
  { id: 'gpt-4o-mini', name: 'GPT 4o Mini', credits: 1 },
  { id: 'gpt-4.1', name: 'GPT 4.1', credits: 12 },
  { id: 'gpt-4.1-mini', name: 'GPT 4.1 Mini', credits: 1 },
  { id: 'gpt-5-reasoning', name: 'GPT 5 (reasoning)', credits: 4 },
]

export function BeginWorkbookWizard({
  onClose,
  onComplete,
}: {
  onClose: () => void
  onComplete: (config: WizardState) => void
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [state, setState] = useState<WizardState>({
    leadSource: null,
    sourceConfig: {
      maxRows: 100,
    },
    qualificationColumns: [],
    workbookName: '',
  })
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null)

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return state.leadSource !== null
      case 2:
        return state.sourceConfig.maxRows > 0 && state.sourceConfig.maxRows <= 100
      case 3:
        return state.qualificationColumns.length > 0
      case 4:
        return state.workbookName.trim() !== ''
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceed() && currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    if (canProceed()) {
      onComplete(state)
    }
  }

  const addQualificationColumn = () => {
    const newColumn: QualificationColumn = {
      id: `col_${Date.now()}`,
      name: '',
      prompt: '',
      condition: 'always',
      conditionColumn: '',
      outputFields: {
        qualified: true,
        score: true,
        reasoning: true,
      },
      model: 'clay-argon',
    }
    setState({
      ...state,
      qualificationColumns: [...state.qualificationColumns, newColumn],
    })
    setExpandedColumn(newColumn.id)
  }

  const updateColumn = (id: string, updates: Partial<QualificationColumn>) => {
    setState({
      ...state,
      qualificationColumns: state.qualificationColumns.map((col) =>
        col.id === id ? { ...col, ...updates } : col
      ),
    })
  }

  const removeColumn = (id: string) => {
    setState({
      ...state,
      qualificationColumns: state.qualificationColumns.filter((col) => col.id !== id),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] bg-[#1a1a2e] rounded-xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Begin Workbook</h2>
          <button
            onClick={onClose}
            className="text-rillation-text/70 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-700/30">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      currentStep > step.id
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-rillation-text/70'
                    }`}
                  >
                    {currentStep > step.id ? <Check size={16} /> : step.id}
                  </div>
                  <div className="hidden sm:block">
                    <div
                      className={`text-sm font-medium ${
                        currentStep >= step.id ? 'text-white' : 'text-rillation-text/60'
                      }`}
                    >
                      {step.title}
                    </div>
                    <div className="text-xs text-rillation-text/60">{step.description}</div>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Lead Source */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-lg font-medium text-white mb-4">
                  Choose your lead source
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <LeadSourceCard
                    icon={<Building2 size={24} />}
                    title="Find Companies"
                    description="Search and filter companies using Clay's database"
                    selected={state.leadSource === 'find-companies'}
                    onClick={() => setState({ ...state, leadSource: 'find-companies' })}
                  />
                  <LeadSourceCard
                    icon={<FileSpreadsheet size={24} />}
                    title="Import CSV"
                    description="Upload a CSV file with your leads"
                    selected={state.leadSource === 'csv-import'}
                    onClick={() => setState({ ...state, leadSource: 'csv-import' })}
                  />
                  <LeadSourceCard
                    icon={<Layers size={24} />}
                    title="Other Source"
                    description="Connect to external integrations"
                    selected={state.leadSource === 'other'}
                    onClick={() => setState({ ...state, leadSource: 'other' })}
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Configure Source */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {state.leadSource === 'find-companies' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white">
                        Configure Company Search
                      </h3>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-rillation-text/70">Max rows:</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={state.sourceConfig.maxRows}
                          onChange={(e) =>
                            setState({
                              ...state,
                              sourceConfig: {
                                ...state.sourceConfig,
                                maxRows: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)),
                              },
                            })
                          }
                          className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                        />
                      </div>
                    </div>
                    <CompanySearchFilters
                      onSearch={(filters: CompanySearchFiltersType) =>
                        setState({
                          ...state,
                          sourceConfig: { ...state.sourceConfig, filters },
                        })
                      }
                    />
                  </div>
                )}

                {state.leadSource === 'csv-import' && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">Upload CSV</h3>
                    <div className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center">
                      <FileSpreadsheet size={48} className="mx-auto text-rillation-text/60 mb-4" />
                      <p className="text-rillation-text/70 mb-2">
                        Drag and drop your CSV file here
                      </p>
                      <button className="text-blue-400 hover:text-blue-300">
                        or click to browse
                      </button>
                    </div>
                  </div>
                )}

                {state.leadSource === 'other' && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4">
                      Connect Integration
                    </h3>
                    <p className="text-rillation-text/70">
                      Integration connections coming soon...
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Qualification Columns */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Qualification Columns
                    </h3>
                    <p className="text-sm text-rillation-text/70 mt-1">
                      Add AI-powered columns to qualify and analyze leads
                    </p>
                  </div>
                  <button
                    onClick={addQualificationColumn}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add Column
                  </button>
                </div>

                {state.qualificationColumns.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center">
                    <Sparkles size={48} className="mx-auto text-rillation-text/60 mb-4" />
                    <p className="text-rillation-text/70 mb-4">
                      No qualification columns yet. Add AI columns to analyze and
                      qualify leads.
                    </p>
                    <button
                      onClick={addQualificationColumn}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <Plus size={16} />
                      Add your first column
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {state.qualificationColumns.map((column) => (
                      <QualificationColumnCard
                        key={column.id}
                        column={column}
                        expanded={expandedColumn === column.id}
                        onToggle={() =>
                          setExpandedColumn(
                            expandedColumn === column.id ? null : column.id
                          )
                        }
                        onUpdate={(updates) => updateColumn(column.id, updates)}
                        onRemove={() => removeColumn(column.id)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h3 className="text-lg font-medium text-white mb-4">
                  Review & Begin Workbook
                </h3>

                {/* Workbook Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-rillation-text mb-2">
                    Workbook Name
                  </label>
                  <input
                    type="text"
                    value={state.workbookName}
                    onChange={(e) => setState({ ...state, workbookName: e.target.value })}
                    placeholder="e.g., Q1 2026 SaaS Outreach"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500"
                  />
                  <p className="text-xs text-rillation-text/60 mt-1">
                    This will create a new workbook with a CE (Company Enrichment) table
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
                  <div>
                    <div className="text-sm font-medium text-rillation-text/70">Lead Source</div>
                    <div className="text-white capitalize">
                      {state.leadSource?.replace('-', ' ')}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-rillation-text/70">Max Rows</div>
                    <div className="text-white">{state.sourceConfig.maxRows}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-rillation-text/70">
                      CE Table Columns ({state.qualificationColumns.length})
                    </div>
                    <div className="mt-2 space-y-2">
                      {state.qualificationColumns.map((col) => (
                        <div
                          key={col.id}
                          className="flex items-center gap-2 text-sm text-rillation-text"
                        >
                          <Sparkles size={14} className="text-blue-400" />
                          <span>{col.name || 'Unnamed column'}</span>
                          {col.condition !== 'always' && (
                            <span className="text-xs text-rillation-text/60">
                              (conditional)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Orchestration Preview */}
                <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="text-blue-400 mt-0.5" size={20} />
                    <div>
                      <div className="text-sm font-medium text-blue-300">
                        AI Orchestration (Opus 4.5)
                      </div>
                      <p className="text-sm text-rillation-text/70 mt-1">
                        When you begin this workbook, Claude will analyze your configuration
                        and generate the optimal execution plan:
                      </p>
                      <ul className="text-sm text-rillation-text/70 mt-2 space-y-1 list-disc list-inside">
                        <li>Create the workbook with CE table and data source</li>
                        <li>Design optimal column dependencies and execution order</li>
                        <li>Author AI prompts with proper JSON schemas</li>
                        <li>Estimate costs and optimize for your budget</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-between">
          <button
            onClick={currentStep === 1 ? onClose : handleBack}
            className="flex items-center gap-2 px-4 py-2 text-rillation-text/70 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          <button
            onClick={currentStep === 4 ? handleComplete : handleNext}
            disabled={!canProceed()}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              canProceed()
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-700 text-rillation-text/60 cursor-not-allowed'
            }`}
          >
            {currentStep === 4 ? (
              <>
                <Sparkles size={16} />
                Begin Workbook
              </>
            ) : (
              <>
                Next
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// Lead Source Card Component
function LeadSourceCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
      }`}
    >
      <div
        className={`mb-4 ${selected ? 'text-blue-400' : 'text-rillation-text/70'}`}
      >
        {icon}
      </div>
      <div className={`font-medium ${selected ? 'text-white' : 'text-rillation-text'}`}>
        {title}
      </div>
      <div className="text-sm text-rillation-text/60 mt-1">{description}</div>
    </button>
  )
}

// Qualification Column Card Component
function QualificationColumnCard({
  column,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
}: {
  column: QualificationColumn
  expanded: boolean
  onToggle: () => void
  onUpdate: (updates: Partial<QualificationColumn>) => void
  onRemove: () => void
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <Sparkles size={18} className="text-blue-400" />
          <div>
            <div className="text-white font-medium">
              {column.name || 'New Qualification Column'}
            </div>
            <div className="text-xs text-rillation-text/60">
              {AI_MODELS.find((m) => m.id === column.model)?.name} •{' '}
              {AI_MODELS.find((m) => m.id === column.model)?.credits} credits
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="p-1 text-rillation-text/60 hover:text-red-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
          {expanded ? (
            <ChevronUp size={20} className="text-rillation-text/70" />
          ) : (
            <ChevronDown size={20} className="text-rillation-text/70" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4 border-t border-gray-700/50">
              {/* Column Name */}
              <div>
                <label className="block text-sm font-medium text-rillation-text mb-1">
                  Column Name
                </label>
                <input
                  type="text"
                  value={column.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="e.g., ICP Qualification"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 text-sm"
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium text-rillation-text mb-1">
                  AI Prompt
                </label>
                <textarea
                  value={column.prompt}
                  onChange={(e) => onUpdate({ prompt: e.target.value })}
                  placeholder="e.g., Analyze {{Company Name}} and determine if they meet our ICP criteria..."
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 text-sm resize-none"
                />
                <p className="text-xs text-rillation-text/60 mt-1">
                  Use {'{{Column Name}}'} to reference other columns
                </p>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-rillation-text mb-1">
                  AI Model
                </label>
                <select
                  value={column.model}
                  onChange={(e) => onUpdate({ model: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                >
                  {AI_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.credits} credits)
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-rillation-text mb-1">
                  Run Condition
                </label>
                <select
                  value={column.condition}
                  onChange={(e) => onUpdate({ condition: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                >
                  <option value="always">Always run</option>
                  <option value="column-not-empty">Run if column is not empty</option>
                  <option value="column-empty">Run if column is empty</option>
                </select>
                {column.condition !== 'always' && (
                  <input
                    type="text"
                    value={column.conditionColumn}
                    onChange={(e) => onUpdate({ conditionColumn: e.target.value })}
                    placeholder="Column name (e.g., Company Website)"
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 text-sm mt-2"
                  />
                )}
              </div>

              {/* Output Fields */}
              <div>
                <label className="block text-sm font-medium text-rillation-text mb-2">
                  Output Fields
                </label>
                <div className="flex flex-wrap gap-2">
                  {['qualified', 'score', 'reasoning'].map((field) => (
                    <label
                      key={field}
                      className="flex items-center gap-2 text-sm text-rillation-text"
                    >
                      <input
                        type="checkbox"
                        checked={column.outputFields[field as keyof typeof column.outputFields]}
                        onChange={(e) =>
                          onUpdate({
                            outputFields: {
                              ...column.outputFields,
                              [field]: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="capitalize">{field}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BeginWorkbookWizard
