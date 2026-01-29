import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Bookmark, Trash2, Save, X, Search, Filter, Columns } from 'lucide-react'
import type { WorkbookConfig } from './WorkbookBuilder'

export interface SavedConfig {
  id: string
  name: string
  type: 'company-search' | 'ce-columns' | 'full-workbook'
  config: Partial<WorkbookConfig>
  created_at: string
  usage_count: number
}

interface SavedConfigsSidebarProps {
  configs: SavedConfig[]
  recentConfigs: SavedConfig[]
  onLoad: (config: SavedConfig) => void
  onSave: (name: string, type: SavedConfig['type']) => void
  onDelete: (id: string) => void
  currentConfig: WorkbookConfig
}

export function SavedConfigsSidebar({
  configs,
  recentConfigs,
  onLoad,
  onSave,
  onDelete,
  currentConfig,
}: SavedConfigsSidebarProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveName, setSaveName] = useState('')

  const getConfigType = (): SavedConfig['type'] => {
    const hasFilters = currentConfig.sourceConfig.filters && Object.keys(currentConfig.sourceConfig.filters).length > 0
    const hasColumns = currentConfig.qualificationColumns.length > 0
    if (hasFilters && hasColumns) return 'full-workbook'
    if (hasColumns) return 'ce-columns'
    return 'company-search'
  }

  const handleSave = () => {
    if (saveName.trim()) {
      onSave(saveName.trim(), getConfigType())
      setSaveName('')
      setIsSaving(false)
    }
  }

  const getTypeIcon = (type: SavedConfig['type']) => {
    switch (type) {
      case 'company-search':
        return <Search size={12} />
      case 'ce-columns':
        return <Columns size={12} />
      case 'full-workbook':
        return <Filter size={12} />
    }
  }

  const getTypeBadgeColor = (type: SavedConfig['type']) => {
    switch (type) {
      case 'company-search':
        return 'bg-green-500/20 text-green-400'
      case 'ce-columns':
        return 'bg-blue-500/20 text-blue-400'
      case 'full-workbook':
        return 'bg-purple-500/20 text-purple-400'
    }
  }

  return (
    <div className="w-56 flex-shrink-0 border-r border-rillation-border bg-rillation-bg flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-rillation-border">
        <h3 className="text-sm font-medium text-white">Configurations</h3>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Recent Section */}
        {recentConfigs.length > 0 && (
          <div className="p-3 border-b border-rillation-border/50">
            <div className="flex items-center gap-1.5 text-xs font-medium text-rillation-text/60 uppercase tracking-wider mb-2">
              <Clock size={12} />
              Recent
            </div>
            <div className="space-y-1">
              {recentConfigs.slice(0, 3).map((config) => (
                <ConfigCard
                  key={config.id}
                  config={config}
                  onLoad={() => onLoad(config)}
                  onDelete={() => onDelete(config.id)}
                  getTypeIcon={getTypeIcon}
                  getTypeBadgeColor={getTypeBadgeColor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Saved Section */}
        <div className="p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-rillation-text/60 uppercase tracking-wider mb-2">
            <Bookmark size={12} />
            Saved
          </div>
          {configs.length === 0 ? (
            <p className="text-xs text-rillation-text/50 py-2">No saved configurations</p>
          ) : (
            <div className="space-y-1">
              {configs.map((config) => (
                <ConfigCard
                  key={config.id}
                  config={config}
                  onLoad={() => onLoad(config)}
                  onDelete={() => onDelete(config.id)}
                  getTypeIcon={getTypeIcon}
                  getTypeBadgeColor={getTypeBadgeColor}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Button / Input */}
      <div className="p-3 border-t border-rillation-border">
        <AnimatePresence mode="wait">
          {isSaving ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-2"
            >
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Config name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') setIsSaving(false)
                }}
                className="w-full bg-rillation-card border border-rillation-border rounded px-2 py-1.5 text-sm text-white placeholder-gray-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className="flex-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-rillation-card-hover disabled:text-rillation-text/60 text-white text-xs rounded transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsSaving(false)}
                  className="px-2 py-1 bg-rillation-card-hover hover:bg-gray-600 text-white text-xs rounded"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => setIsSaving(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rillation-card hover:bg-rillation-card-hover text-rillation-text text-xs rounded transition-colors"
            >
              <Save size={12} />
              Save Current Config
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Config Card Component
function ConfigCard({
  config,
  onLoad,
  onDelete,
  getTypeIcon,
  getTypeBadgeColor,
}: {
  config: SavedConfig
  onLoad: () => void
  onDelete: () => void
  getTypeIcon: (type: SavedConfig['type']) => React.ReactNode
  getTypeBadgeColor: (type: SavedConfig['type']) => string
}) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <motion.div
      onHoverStart={() => setShowDelete(true)}
      onHoverEnd={() => setShowDelete(false)}
      className="group"
    >
      <button
        onClick={onLoad}
        className="w-full p-2 rounded bg-rillation-card/50 hover:bg-rillation-card text-left transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {config.name}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${getTypeBadgeColor(config.type)}`}>
                {getTypeIcon(config.type)}
                {config.type.replace('-', ' ')}
              </span>
            </div>
          </div>
          <AnimatePresence>
            {showDelete && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="p-1 text-rillation-text/60 hover:text-red-400"
              >
                <Trash2 size={12} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </button>
    </motion.div>
  )
}

export default SavedConfigsSidebar
