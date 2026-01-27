import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  FileSpreadsheet,
  Layers,
  Plus,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  GripVertical,
} from 'lucide-react'
import type { CompanySearchFilters as CompanySearchFiltersType } from '../../../../clay-automation/types/company-search'
import CompanySearchFilters from '../CompanySearchFilters'

// Types
export type LeadSource = 'find-companies' | 'csv-import' | 'other'

export interface QualificationColumn {
  id: string
  name: string
  prompt: string
  condition: 'always' | 'column-not-empty' | 'column-empty'
  conditionColumn: string
  outputFields: {
    qualified: boolean
    score: boolean
    reasoning: boolean
  }
  model: string
}

export interface WorkbookConfig {
  leadSource: LeadSource | null
  sourceConfig: {
    maxRows: number
    filters?: CompanySearchFiltersType
  }
  qualificationColumns: QualificationColumn[]
  workbookName: string
}

export const defaultConfig: WorkbookConfig = {
  leadSource: null,
  sourceConfig: { maxRows: 100 },
  qualificationColumns: [],
  workbookName: '',
}

const AI_MODELS = [
  { id: 'clay-argon', name: 'Clay Argon', credits: 1 },
  { id: 'gpt-4o-mini', name: 'GPT 4o Mini', credits: 1 },
  { id: 'gpt-4o', name: 'GPT 4o', credits: 3 },
  { id: 'gpt-4.1-mini', name: 'GPT 4.1 Mini', credits: 1 },
  { id: 'gpt-4.1', name: 'GPT 4.1', credits: 12 },
]

const TABS = [
  { id: 'source', label: 'Lead Source' },
  { id: 'filters', label: 'Source Filters' },
  { id: 'columns', label: 'CE Columns' },
] as const

type TabId = typeof TABS[number]['id']

interface WorkbookBuilderProps {
  config: WorkbookConfig
  onChange: (config: WorkbookConfig) => void
}

export function WorkbookBuilder({ config, onChange }: WorkbookBuilderProps) {
  const [activeTab, setActiveTab] = useState<TabId>('source')
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null)

  const isTabComplete = (tabId: TabId) => {
    switch (tabId) {
      case 'source':
        return config.leadSource !== null
      case 'filters':
        return config.leadSource === 'find-companies'
          ? config.sourceConfig.maxRows > 0
          : true
      case 'columns':
        return config.qualificationColumns.length > 0
      default:
        return false
    }
  }

  const addColumn = () => {
    const newColumn: QualificationColumn = {
      id: `col_${Date.now()}`,
      name: '',
      prompt: '',
      condition: 'always',
      conditionColumn: '',
      outputFields: { qualified: true, score: true, reasoning: true },
      model: 'clay-argon',
    }
    onChange({
      ...config,
      qualificationColumns: [...config.qualificationColumns, newColumn],
    })
    setExpandedColumn(newColumn.id)
  }

  const updateColumn = (id: string, updates: Partial<QualificationColumn>) => {
    onChange({
      ...config,
      qualificationColumns: config.qualificationColumns.map((col) =>
        col.id === id ? { ...col, ...updates } : col
      ),
    })
  }

  const removeColumn = (id: string) => {
    onChange({
      ...config,
      qualificationColumns: config.qualificationColumns.filter((col) => col.id !== id),
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Horizontal Tab Navigation */}
      <div className="flex items-center gap-1 p-3 border-b border-gray-800 bg-[#0d0d14]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const isComplete = isTabComplete(tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {isComplete && !isActive && (
                <Check size={14} className="text-green-400" />
              )}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {/* Lead Source Tab */}
          {activeTab === 'source' && (
            <motion.div
              key="source"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-lg font-medium text-white mb-4">
                Choose Lead Source
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <LeadSourceCard
                  icon={<Building2 size={24} />}
                  title="Find Companies"
                  description="Search Clay's database"
                  selected={config.leadSource === 'find-companies'}
                  onClick={() => {
                    onChange({ ...config, leadSource: 'find-companies' })
                    setActiveTab('filters')
                  }}
                />
                <LeadSourceCard
                  icon={<FileSpreadsheet size={24} />}
                  title="Import CSV"
                  description="Upload your leads"
                  selected={config.leadSource === 'csv-import'}
                  onClick={() => {
                    onChange({ ...config, leadSource: 'csv-import' })
                    setActiveTab('columns')
                  }}
                />
                <LeadSourceCard
                  icon={<Layers size={24} />}
                  title="Other Source"
                  description="Integrations"
                  selected={config.leadSource === 'other'}
                  onClick={() => {
                    onChange({ ...config, leadSource: 'other' })
                    setActiveTab('columns')
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* Source Filters Tab */}
          {activeTab === 'filters' && (
            <motion.div
              key="filters"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {config.leadSource === 'find-companies' ? (
                <CompanySearchFilters
                  onSearch={(filters) =>
                    onChange({
                      ...config,
                      sourceConfig: { ...config.sourceConfig, filters },
                    })
                  }
                />
              ) : config.leadSource === 'csv-import' ? (
                <CSVUploadPanel />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a lead source first
                </div>
              )}
            </motion.div>
          )}

          {/* CE Columns Tab */}
          {activeTab === 'columns' && (
            <motion.div
              key="columns"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white">CE Columns</h3>
                  <p className="text-sm text-gray-500">AI-powered enrichment columns</p>
                </div>
                <button
                  onClick={addColumn}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Add Column
                </button>
              </div>

              {config.qualificationColumns.length === 0 ? (
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                  <Sparkles size={32} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-500 mb-3 text-sm">
                    No columns yet. Add AI columns to enrich your leads.
                  </p>
                  <button
                    onClick={addColumn}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm"
                  >
                    <Plus size={14} />
                    Add first column
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {config.qualificationColumns.map((column) => (
                    <ColumnCard
                      key={column.id}
                      column={column}
                      expanded={expandedColumn === column.id}
                      onToggle={() =>
                        setExpandedColumn(expandedColumn === column.id ? null : column.id)
                      }
                      onUpdate={(updates) => updateColumn(column.id, updates)}
                      onRemove={() => removeColumn(column.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Lead Source Card
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
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-lg border-2 text-left transition-all ${
        selected
          ? 'border-white bg-white/10'
          : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
      }`}
    >
      <div className={`mb-2 ${selected ? 'text-white' : 'text-gray-400'}`}>
        {icon}
      </div>
      <div className={`font-medium text-sm ${selected ? 'text-white' : 'text-gray-300'}`}>
        {title}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{description}</div>
    </motion.button>
  )
}

// CSV Upload Panel
function CSVUploadPanel() {
  return (
    <div className="border-2 border-dashed border-gray-700 rounded-lg p-12 text-center">
      <FileSpreadsheet size={48} className="mx-auto text-gray-500 mb-4" />
      <p className="text-gray-400 mb-2">Drag and drop your CSV file here</p>
      <button className="text-blue-400 hover:text-blue-300 text-sm">
        or click to browse
      </button>
    </div>
  )
}

// Column Card
function ColumnCard({
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
  const model = AI_MODELS.find((m) => m.id === column.model)

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onToggle}
      >
        <GripVertical size={16} className="text-gray-600" />
        <Sparkles size={16} className="text-blue-400" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {column.name || 'New Column'}
          </div>
          <div className="text-xs text-gray-500">
            {model?.name} ({model?.credits} credits)
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-1 text-gray-500 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
        {expanded ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
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
            <div className="p-3 pt-0 space-y-3 border-t border-gray-700/50">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Column Name
                </label>
                <input
                  type="text"
                  value={column.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  placeholder="e.g., ICP Qualification"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-white text-sm"
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  AI Prompt
                </label>
                <textarea
                  value={column.prompt}
                  onChange={(e) => onUpdate({ prompt: e.target.value })}
                  placeholder="Analyze {{Company Name}} and determine ICP fit..."
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-white text-sm resize-none"
                />
              </div>

              {/* Model Selection - Chips */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Model
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AI_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onUpdate({ model: m.id })}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                        column.model === m.id
                          ? 'bg-white text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {m.name} ({m.credits})
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition - Segmented Control */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Run Condition
                </label>
                <div className="flex gap-1">
                  {[
                    { id: 'always', label: 'Always' },
                    { id: 'column-not-empty', label: 'If Not Empty' },
                    { id: 'column-empty', label: 'If Empty' },
                  ].map((cond) => (
                    <button
                      key={cond.id}
                      onClick={() => onUpdate({ condition: cond.id as QualificationColumn['condition'] })}
                      className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                        column.condition === cond.id
                          ? 'bg-white text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {cond.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Fields */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Output Fields
                </label>
                <div className="flex gap-2">
                  {['qualified', 'score', 'reasoning'].map((field) => (
                    <label key={field} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <input
                        type="checkbox"
                        checked={column.outputFields[field as keyof typeof column.outputFields]}
                        onChange={(e) =>
                          onUpdate({
                            outputFields: { ...column.outputFields, [field]: e.target.checked },
                          })
                        }
                        className="rounded border-gray-600 bg-gray-900 text-blue-500"
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

export default WorkbookBuilder
