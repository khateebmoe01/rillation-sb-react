import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  Plus,
  X,
  Check,
  Save,
  Loader2,
  Activity,
} from 'lucide-react'
import type { PlanOfAction } from '../../hooks/useClientStrategy'

interface AnalysisPanelProps {
  client: string
  planOfAction: PlanOfAction | null
  onSave: (updates: Partial<PlanOfAction>) => Promise<PlanOfAction | null>
  compact?: boolean
}

interface AnalysisItem {
  id: string
  title: string
  description: string
  type: 'metric' | 'insight' | 'alert'
  priority: 'high' | 'medium' | 'low'
}

interface EffectItem {
  id: string
  title: string
  description: string
  expected_impact: string
  tracking_method: string
}

interface ItemListProps {
  items: any[]
  onChange: (items: any[]) => void
  itemType: 'surface' | 'effect'
}

function ItemList({ items, onChange, itemType }: ItemListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newItem, setNewItem] = useState<any>({
    title: '',
    description: '',
    ...(itemType === 'surface' 
      ? { type: 'metric', priority: 'medium' }
      : { expected_impact: '', tracking_method: '' }
    ),
  })

  const addItem = () => {
    if (newItem.title) {
      onChange([...items, { ...newItem, id: Date.now().toString() }])
      setNewItem({
        title: '',
        description: '',
        ...(itemType === 'surface' 
          ? { type: 'metric', priority: 'medium' }
          : { expected_impact: '', tracking_method: '' }
        ),
      })
      setIsAdding(false)
    }
  }

  const removeItem = (id: string) => {
    onChange(items.filter(i => i.id !== id))
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rillation-card border border-rillation-border rounded-lg p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium text-rillation-text">{item.title}</h4>
                {itemType === 'surface' && (
                  <>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.type === 'metric' ? 'bg-blue-500/20 text-blue-400' :
                      item.type === 'insight' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {item.type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {item.priority}
                    </span>
                  </>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-rillation-text-muted mb-2">{item.description}</p>
              )}
              {itemType === 'effect' && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {item.expected_impact && (
                    <div>
                      <span className="text-xs text-rillation-text-muted">Expected Impact:</span>
                      <p className="text-xs text-rillation-text mt-0.5">{item.expected_impact}</p>
                    </div>
                  )}
                  {item.tracking_method && (
                    <div>
                      <span className="text-xs text-rillation-text-muted">Tracking Method:</span>
                      <p className="text-xs text-rillation-text mt-0.5">{item.tracking_method}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => removeItem(item.id)}
              className="p-1 hover:bg-rillation-bg rounded ml-2"
            >
              <X size={14} className="text-rillation-text-muted" />
            </button>
          </div>
        </motion.div>
      ))}

      {isAdding ? (
        <div className="bg-rillation-card border border-rillation-border rounded-lg p-4 space-y-3">
          <input
            type="text"
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            placeholder={itemType === 'surface' ? 'What to surface...' : 'Effect title...'}
            className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none"
            autoFocus
          />
          <textarea
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="Description..."
            rows={2}
            className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none resize-none"
          />
          
          {itemType === 'surface' ? (
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newItem.type}
                onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                className="px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none"
              >
                <option value="metric">Metric</option>
                <option value="insight">Insight</option>
                <option value="alert">Alert</option>
              </select>
              <select
                value={newItem.priority}
                onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                className="px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newItem.expected_impact}
                onChange={(e) => setNewItem({ ...newItem, expected_impact: e.target.value })}
                placeholder="Expected impact..."
                className="px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none"
              />
              <input
                type="text"
                value={newItem.tracking_method}
                onChange={(e) => setNewItem({ ...newItem, tracking_method: e.target.value })}
                placeholder="How to track..."
                className="px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={addItem}
              disabled={!newItem.title}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 disabled:opacity-50"
            >
              <Check size={14} />
              Add
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-rillation-text-muted hover:text-rillation-text"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-rillation-text-muted hover:text-rillation-text hover:bg-rillation-card rounded-lg transition-colors w-full"
        >
          <Plus size={16} />
          Add {itemType === 'surface' ? 'Item to Surface' : 'Effect to Track'}
        </button>
      )}
    </div>
  )
}

export default function AnalysisPanel({
  client,
  planOfAction,
  onSave,
  compact = false,
}: AnalysisPanelProps) {
  const [surfaceItems, setSurfaceItems] = useState<AnalysisItem[]>([])
  const [effectItems, setEffectItems] = useState<EffectItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [openSection, setOpenSection] = useState<'surface' | 'effects'>('surface')

  useEffect(() => {
    if (planOfAction) {
      setSurfaceItems((planOfAction.analysis_surface as AnalysisItem[]) || [])
      setEffectItems((planOfAction.analysis_effects as EffectItem[]) || [])
      setHasChanges(false)
    }
  }, [planOfAction])

  const handleSurfaceChange = useCallback((items: AnalysisItem[]) => {
    setSurfaceItems(items)
    setHasChanges(true)
  }, [])

  const handleEffectsChange = useCallback((items: EffectItem[]) => {
    setEffectItems(items)
    setHasChanges(true)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    await onSave({
      analysis_surface: surfaceItems,
      analysis_effects: effectItems,
    })
    setIsSaving(false)
    setHasChanges(false)
  }

  return (
    <div className={compact ? "space-y-4" : "p-6 space-y-6"}>
      {/* Header - only in non-compact mode */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-rillation-text">Analysis</h2>
            <p className="text-sm text-rillation-text-muted mt-0.5">
              Define what to surface and track for {client}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {hasChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      )}

      {/* Save button for compact mode */}
      {compact && hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      )}

      {/* Tab Selection */}
      <div className="flex gap-2 bg-rillation-card border border-rillation-border rounded-xl p-1">
        <button
          onClick={() => setOpenSection('surface')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            openSection === 'surface'
              ? 'bg-white text-black'
              : 'text-rillation-text-muted hover:text-rillation-text'
          }`}
        >
          <Eye size={16} />
          What to Surface
        </button>
        <button
          onClick={() => setOpenSection('effects')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            openSection === 'effects'
              ? 'bg-white text-black'
              : 'text-rillation-text-muted hover:text-rillation-text'
          }`}
        >
          <Activity size={16} />
          Effects to Track
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {openSection === 'surface' ? (
          <motion.div
            key="surface"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mb-4">
              <h3 className="text-sm font-medium text-rillation-text mb-1">What do we want to surface?</h3>
              <p className="text-xs text-rillation-text-muted">
                Define the metrics, insights, and alerts that should be visible in the analytics dashboard for this client.
              </p>
            </div>
            
            {surfaceItems.length === 0 && (
              <div className="text-center py-8 bg-rillation-card border border-rillation-border rounded-xl mb-4">
                <Eye size={32} className="mx-auto text-rillation-text-muted mb-3" />
                <p className="text-sm text-rillation-text-muted">
                  No items defined yet. Add what should be surfaced for this client.
                </p>
              </div>
            )}
            
            <ItemList
              items={surfaceItems}
              onChange={handleSurfaceChange}
              itemType="surface"
            />
          </motion.div>
        ) : (
          <motion.div
            key="effects"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mb-4">
              <h3 className="text-sm font-medium text-rillation-text mb-1">What effect does it have?</h3>
              <p className="text-xs text-rillation-text-muted">
                Track the expected effects and impacts of strategy changes and campaigns.
              </p>
            </div>
            
            {effectItems.length === 0 && (
              <div className="text-center py-8 bg-rillation-card border border-rillation-border rounded-xl mb-4">
                <Activity size={32} className="mx-auto text-rillation-text-muted mb-3" />
                <p className="text-sm text-rillation-text-muted">
                  No effects defined yet. Add effects to track for this client.
                </p>
              </div>
            )}
            
            <ItemList
              items={effectItems}
              onChange={handleEffectsChange}
              itemType="effect"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
