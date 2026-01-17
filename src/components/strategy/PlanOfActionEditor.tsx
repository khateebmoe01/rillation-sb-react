import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database,
  Link,
  Code,
  FileCheck,
  ChevronRight,
  Save,
  Loader2,
  Plus,
  X,
  Check,
  Calendar,
  User,
  ListTodo,
  Settings,
  Layers,
} from 'lucide-react'
import type { PlanOfAction } from '../../hooks/useClientStrategy'

interface PlanOfActionEditorProps {
  client: string
  planOfAction: PlanOfAction | null
  loading: boolean
  onSave: (updates: Partial<PlanOfAction>) => Promise<PlanOfAction | null>
  compact?: boolean
}

type SectionId = 
  | 'list_building_clay'
  | 'tables_architecture'
  | 'prompt_injections'
  | 'expected_quality_outputs'
  | 'table_structure'
  | 'connections'
  | 'campaign_plan'
  | 'tasks'

interface Section {
  id: SectionId
  label: string
  icon: React.ElementType
  description: string
  category: 'clay' | 'implementation' | 'campaign'
}

const SECTIONS: Section[] = [
  { id: 'list_building_clay', label: 'List Building Clay', icon: Database, description: 'Clay table configurations', category: 'clay' },
  { id: 'tables_architecture', label: 'Tables Architecture', icon: Layers, description: 'Table structures and columns', category: 'clay' },
  { id: 'prompt_injections', label: 'Prompt Injections', icon: Code, description: 'AI prompts used in Clay', category: 'clay' },
  { id: 'expected_quality_outputs', label: 'Expected Quality Outputs', icon: FileCheck, description: 'Example outputs for quality reference', category: 'clay' },
  { id: 'table_structure', label: 'Table Structure', icon: Settings, description: 'Detailed table implementation', category: 'implementation' },
  { id: 'connections', label: 'Connections', icon: Link, description: 'Connections between systems', category: 'implementation' },
  { id: 'campaign_plan', label: 'Campaign Plan', icon: Calendar, description: 'Campaign strategy and timing', category: 'campaign' },
  { id: 'tasks', label: 'Tasks', icon: ListTodo, description: 'Action items and to-dos', category: 'campaign' },
]

interface TaskItem {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed'
  due_date?: string
  assignee?: string
}

interface TaskListProps {
  tasks: TaskItem[]
  onChange: (tasks: TaskItem[]) => void
}

function TaskList({ tasks, onChange }: TaskListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', due_date: '', assignee: '' })

  const addTask = () => {
    if (newTask.title) {
      onChange([
        ...tasks,
        {
          id: Date.now().toString(),
          title: newTask.title,
          status: 'pending',
          due_date: newTask.due_date || undefined,
          assignee: newTask.assignee || undefined,
        },
      ])
      setNewTask({ title: '', due_date: '', assignee: '' })
      setIsAdding(false)
    }
  }

  const updateTaskStatus = (id: string, status: TaskItem['status']) => {
    onChange(tasks.map(t => t.id === id ? { ...t, status } : t))
  }

  const removeTask = (id: string) => {
    onChange(tasks.filter(t => t.id !== id))
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={`flex items-center gap-3 p-3 bg-rillation-card border rounded-lg ${
            task.status === 'completed' ? 'border-rillation-green/30' : 'border-rillation-border'
          }`}
        >
          <button
            onClick={() => updateTaskStatus(
              task.id,
              task.status === 'completed' ? 'pending' : 'completed'
            )}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
              task.status === 'completed'
                ? 'bg-rillation-green border-rillation-green'
                : 'border-rillation-border hover:border-rillation-text-muted'
            }`}
          >
            {task.status === 'completed' && <Check size={12} className="text-white" />}
          </button>

          <div className="flex-1 min-w-0">
            <span className={`text-sm ${
              task.status === 'completed' ? 'text-rillation-text-muted line-through' : 'text-rillation-text'
            }`}>
              {task.title}
            </span>
            <div className="flex items-center gap-3 mt-1">
              {task.due_date && (
                <span className="text-xs text-rillation-text-muted flex items-center gap-1">
                  <Calendar size={10} />
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
              {task.assignee && (
                <span className="text-xs text-rillation-text-muted flex items-center gap-1">
                  <User size={10} />
                  {task.assignee}
                </span>
              )}
            </div>
          </div>

          <select
            value={task.status}
            onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskItem['status'])}
            className="text-xs px-2 py-1 bg-rillation-bg border border-rillation-border rounded text-rillation-text"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <button
            onClick={() => removeTask(task.id)}
            className="p-1 hover:bg-rillation-bg rounded"
          >
            <X size={14} className="text-rillation-text-muted" />
          </button>
        </div>
      ))}

      {isAdding ? (
        <div className="p-3 bg-rillation-card border border-rillation-border rounded-lg space-y-3">
          <input
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Task title..."
            className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              className="px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text focus:outline-none"
            />
            <input
              type="text"
              value={newTask.assignee}
              onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
              placeholder="Assignee..."
              className="px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addTask}
              disabled={!newTask.title}
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
          Add Task
        </button>
      )}
    </div>
  )
}

interface PromptEditorProps {
  prompts: any[]
  onChange: (prompts: any[]) => void
}

function PromptEditor({ prompts, onChange }: PromptEditorProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newPrompt, setNewPrompt] = useState({ name: '', prompt: '', description: '' })

  const addPrompt = () => {
    if (newPrompt.name && newPrompt.prompt) {
      onChange([...prompts, { ...newPrompt, id: Date.now().toString() }])
      setNewPrompt({ name: '', prompt: '', description: '' })
      setIsAdding(false)
    }
  }

  const removePrompt = (index: number) => {
    onChange(prompts.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {prompts.map((prompt, index) => (
        <div key={prompt.id || index} className="bg-rillation-card border border-rillation-border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="text-sm font-medium text-rillation-text">{prompt.name}</h4>
              {prompt.description && (
                <p className="text-xs text-rillation-text-muted mt-0.5">{prompt.description}</p>
              )}
            </div>
            <button onClick={() => removePrompt(index)} className="p-1 hover:bg-rillation-bg rounded">
              <X size={14} className="text-rillation-text-muted" />
            </button>
          </div>
          <pre className="text-xs text-rillation-text-muted bg-rillation-bg rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
            {prompt.prompt}
          </pre>
        </div>
      ))}

      {isAdding ? (
        <div className="p-4 bg-rillation-card border border-rillation-border rounded-lg space-y-3">
          <input
            type="text"
            value={newPrompt.name}
            onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
            placeholder="Prompt name..."
            className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none"
          />
          <input
            type="text"
            value={newPrompt.description}
            onChange={(e) => setNewPrompt({ ...newPrompt, description: e.target.value })}
            placeholder="Description (optional)..."
            className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none"
          />
          <textarea
            value={newPrompt.prompt}
            onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
            placeholder="Prompt content..."
            rows={6}
            className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none resize-none font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={addPrompt}
              disabled={!newPrompt.name || !newPrompt.prompt}
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
          Add Prompt
        </button>
      )}
    </div>
  )
}

interface CollapsibleSectionProps {
  section: Section
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
  hasContent?: boolean
}

function CollapsibleSection({ section, isOpen, onToggle, children, hasContent }: CollapsibleSectionProps) {
  const Icon = section.icon

  return (
    <div className="border border-rillation-border rounded-xl overflow-hidden">
      <motion.button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-rillation-card-hover transition-colors text-left"
        whileTap={{ scale: 0.995 }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.1 }}
        >
          <ChevronRight size={16} className="text-rillation-text-muted" />
        </motion.div>
        
        <div className="w-9 h-9 rounded-lg bg-rillation-bg flex items-center justify-center">
          <Icon size={18} className="text-rillation-text-muted" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-rillation-text">{section.label}</span>
            {hasContent && <span className="w-2 h-2 rounded-full bg-rillation-green" />}
          </div>
          <span className="text-xs text-rillation-text-muted">{section.description}</span>
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="p-4 pt-2 border-t border-rillation-border/50 bg-rillation-bg/30">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
}

function TextField({ label, value, onChange, placeholder, multiline }: TextFieldProps) {
  return (
    <div>
      <label className="block text-xs text-rillation-text-muted mb-1.5">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full px-3 py-2 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text-muted resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text-muted"
        />
      )}
    </div>
  )
}

export default function PlanOfActionEditor({
  client,
  planOfAction,
  loading,
  onSave,
  compact = false,
}: PlanOfActionEditorProps) {
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(['tasks']))
  const [localData, setLocalData] = useState<Partial<PlanOfAction>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (planOfAction) {
      setLocalData(planOfAction)
      setHasChanges(false)
    } else {
      setLocalData({
        list_building_clay: {},
        tables_architecture: [],
        prompt_injections: [],
        expected_quality_outputs: [],
        table_structure: {},
        connections: [],
        campaign_plan: {},
        tasks: [],
        analysis_surface: [],
        analysis_effects: [],
      })
    }
  }, [planOfAction])

  const toggleSection = useCallback((sectionId: SectionId) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  const updateField = useCallback((section: SectionId, value: any) => {
    setLocalData(prev => ({ ...prev, [section]: value }))
    setHasChanges(true)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(localData)
    setIsSaving(false)
    setHasChanges(false)
  }

  const hasContent = (sectionId: SectionId): boolean => {
    const data = localData[sectionId]
    if (!data) return false
    if (Array.isArray(data)) return data.length > 0
    if (typeof data === 'object') return Object.keys(data).length > 0
    return Boolean(data)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-rillation-text-muted" />
      </div>
    )
  }

  // Group sections by category
  const clayConfig = SECTIONS.filter(s => s.category === 'clay')
  const implementation = SECTIONS.filter(s => s.category === 'implementation')

  return (
    <div className={compact ? "space-y-4" : "p-6 space-y-6"}>
      {/* Header - only in non-compact mode */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-rillation-text">Plan of Action</h2>
            <p className="text-sm text-rillation-text-muted mt-0.5">
              Clay configuration and campaign planning for {client}
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
            Save Changes
          </button>
        </div>
      )}

      {/* Clay Configuration */}
      <div>
        <h3 className="text-sm font-medium text-rillation-text-muted uppercase tracking-wide mb-3">
          Clay Configuration
        </h3>
        <div className="space-y-3">
          {clayConfig.map((section) => (
            <CollapsibleSection
              key={section.id}
              section={section}
              isOpen={openSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              hasContent={hasContent(section.id)}
            >
              {section.id === 'prompt_injections' ? (
                <PromptEditor
                  prompts={(localData.prompt_injections as any[]) || []}
                  onChange={(v) => updateField('prompt_injections', v)}
                />
              ) : (
                <TextField
                  label="Configuration"
                  value={typeof localData[section.id] === 'object' ? JSON.stringify(localData[section.id], null, 2) : ''}
                  onChange={(v) => {
                    try {
                      updateField(section.id, JSON.parse(v))
                    } catch {
                      // Invalid JSON
                    }
                  }}
                  placeholder="Enter JSON configuration..."
                  multiline
                />
              )}
            </CollapsibleSection>
          ))}
        </div>
      </div>

      {/* Implementation */}
      <div>
        <h3 className="text-sm font-medium text-rillation-text-muted uppercase tracking-wide mb-3">
          Injections & Implementation
        </h3>
        <div className="space-y-3">
          {implementation.map((section) => (
            <CollapsibleSection
              key={section.id}
              section={section}
              isOpen={openSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              hasContent={hasContent(section.id)}
            >
              <TextField
                label="Configuration"
                value={typeof localData[section.id] === 'object' ? JSON.stringify(localData[section.id], null, 2) : ''}
                onChange={(v) => {
                  try {
                    updateField(section.id, JSON.parse(v))
                  } catch {
                    // Invalid JSON
                  }
                }}
                placeholder="Enter JSON configuration..."
                multiline
              />
            </CollapsibleSection>
          ))}
          
          {/* Implementation Notes */}
          <div className="bg-rillation-card border border-rillation-border rounded-xl p-4">
            <TextField
              label="Implementation Notes"
              value={localData.implementation_notes || ''}
              onChange={(v) => {
                setLocalData(prev => ({ ...prev, implementation_notes: v }))
                setHasChanges(true)
              }}
              placeholder="Additional implementation notes..."
              multiline
            />
          </div>
        </div>
      </div>

      {/* Campaign & Tasks */}
      <div>
        <h3 className="text-sm font-medium text-rillation-text-muted uppercase tracking-wide mb-3">
          Campaign & Tasks
        </h3>
        <div className="space-y-3">
          {/* Campaign Plan */}
          <CollapsibleSection
            section={SECTIONS.find(s => s.id === 'campaign_plan')!}
            isOpen={openSections.has('campaign_plan')}
            onToggle={() => toggleSection('campaign_plan')}
            hasContent={hasContent('campaign_plan')}
          >
            <TextField
              label="Campaign Plan"
              value={typeof localData.campaign_plan === 'object' ? JSON.stringify(localData.campaign_plan, null, 2) : ''}
              onChange={(v) => {
                try {
                  updateField('campaign_plan', JSON.parse(v))
                } catch {
                  // Invalid JSON
                }
              }}
              placeholder='{"monthly_volume": 30000, "start_date": "2026-02-09"}'
              multiline
            />
          </CollapsibleSection>

          {/* Tasks */}
          <CollapsibleSection
            section={SECTIONS.find(s => s.id === 'tasks')!}
            isOpen={openSections.has('tasks')}
            onToggle={() => toggleSection('tasks')}
            hasContent={(localData.tasks as any[])?.length > 0}
          >
            <TaskList
              tasks={(localData.tasks as TaskItem[]) || []}
              onChange={(v) => updateField('tasks', v)}
            />
          </CollapsibleSection>
        </div>
      </div>
    </div>
  )
}
