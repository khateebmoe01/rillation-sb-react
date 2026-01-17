import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Users,
  Package,
  Target,
  UserCircle,
  FileText,
  Variable,
  Database,
  ShieldCheck,
  Send,
  ChevronRight,
  Save,
  Loader2,
  Plus,
  X,
  Check,
} from 'lucide-react'
import type { KnowledgeBase } from '../../hooks/useClientStrategy'

interface KnowledgeBaseEditorProps {
  client: string
  knowledgeBase: KnowledgeBase | null
  loading: boolean
  onSave: (updates: Partial<KnowledgeBase>) => Promise<KnowledgeBase | null>
  compact?: boolean
}

type SectionId = 
  | 'company' 
  | 'company_people' 
  | 'company_offer' 
  | 'company_competition'
  | 'prospect_companies'
  | 'prospect_people'
  | 'copy_structures'
  | 'copy_variables'
  | 'copy_variable_unique_data'
  | 'data_quality_assurance'
  | 'sending_technicalities'

interface Section {
  id: SectionId
  label: string
  icon: React.ElementType
  description: string
}

const SECTIONS: Section[] = [
  { id: 'company', label: 'Company', icon: Building2, description: 'Client company information' },
  { id: 'company_people', label: 'Company People', icon: Users, description: 'Key stakeholders and contacts' },
  { id: 'company_offer', label: 'Company Offer', icon: Package, description: 'Products, services, value props' },
  { id: 'company_competition', label: 'Company Competition', icon: Target, description: 'Competitor analysis' },
  { id: 'prospect_companies', label: 'Prospect Companies', icon: Building2, description: 'ICP and target criteria' },
  { id: 'prospect_people', label: 'Prospect People', icon: UserCircle, description: 'Target personas and titles' },
  { id: 'copy_structures', label: 'Copy Structures', icon: FileText, description: 'Email templates and sequences' },
  { id: 'copy_variables', label: 'Copy Variables', icon: Variable, description: 'Variables used in copy' },
  { id: 'copy_variable_unique_data', label: 'Copy Variable Unique Data', icon: Database, description: 'Client-specific variable values' },
  { id: 'data_quality_assurance', label: 'Data Quality Assurance', icon: ShieldCheck, description: 'Validation rules and checks' },
  { id: 'sending_technicalities', label: 'Sending Technicalities', icon: Send, description: 'Limits, timing, domains' },
]

// Collapsible Section Component
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
            {hasContent && (
              <span className="w-2 h-2 rounded-full bg-rillation-green" />
            )}
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

// Field Components
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
          rows={3}
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

interface ArrayFieldProps {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}

function ArrayField({ label, items, onChange, placeholder }: ArrayFieldProps) {
  const [newItem, setNewItem] = useState('')

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()])
      setNewItem('')
    }
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-xs text-rillation-text-muted mb-1.5">{label}</label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 bg-rillation-card border border-rillation-border rounded-lg px-3 py-2">
            <span className="flex-1 text-sm text-rillation-text">{item}</span>
            <button
              onClick={() => removeItem(index)}
              className="p-1 hover:bg-rillation-bg rounded"
            >
              <X size={14} className="text-rillation-text-muted" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text-muted"
          />
          <button
            onClick={addItem}
            disabled={!newItem.trim()}
            className="px-3 py-2 bg-rillation-card border border-rillation-border rounded-lg hover:bg-rillation-card-hover transition-colors disabled:opacity-50"
          >
            <Plus size={16} className="text-rillation-text" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface PersonFieldProps {
  people: any[]
  onChange: (people: any[]) => void
}

function PersonField({ people, onChange }: PersonFieldProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newPerson, setNewPerson] = useState({ name: '', title: '', email: '', notes: '' })

  const addPerson = () => {
    if (newPerson.name) {
      onChange([...people, { ...newPerson, id: Date.now().toString() }])
      setNewPerson({ name: '', title: '', email: '', notes: '' })
      setIsAdding(false)
    }
  }

  const removePerson = (index: number) => {
    onChange(people.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {people.map((person, index) => (
        <div key={person.id || index} className="bg-rillation-card border border-rillation-border rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-medium text-sm text-rillation-text">{person.name}</div>
              {person.title && <div className="text-xs text-rillation-text-muted">{person.title}</div>}
              {person.email && <div className="text-xs text-rillation-text-muted">{person.email}</div>}
            </div>
            <button
              onClick={() => removePerson(index)}
              className="p-1 hover:bg-rillation-bg rounded"
            >
              <X size={14} className="text-rillation-text-muted" />
            </button>
          </div>
          {person.notes && <p className="text-xs text-rillation-text-muted mt-2">{person.notes}</p>}
        </div>
      ))}

      {isAdding ? (
        <div className="bg-rillation-card border border-rillation-border rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newPerson.name}
              onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
              placeholder="Name"
              className="px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none"
            />
            <input
              type="text"
              value={newPerson.title}
              onChange={(e) => setNewPerson({ ...newPerson, title: e.target.value })}
              placeholder="Title"
              className="px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none"
            />
          </div>
          <input
            type="email"
            value={newPerson.email}
            onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })}
            placeholder="Email"
            className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none"
          />
          <textarea
            value={newPerson.notes}
            onChange={(e) => setNewPerson({ ...newPerson, notes: e.target.value })}
            placeholder="Notes"
            rows={2}
            className="w-full px-3 py-2 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={addPerson}
              disabled={!newPerson.name}
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
          className="flex items-center gap-2 px-3 py-2 text-sm text-rillation-text-muted hover:text-rillation-text hover:bg-rillation-card rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Person
        </button>
      )}
    </div>
  )
}

export default function KnowledgeBaseEditor({
  client,
  knowledgeBase,
  loading,
  onSave,
  compact = false,
}: KnowledgeBaseEditorProps) {
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(['company']))
  const [localData, setLocalData] = useState<Partial<KnowledgeBase>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize local data from knowledgeBase
  useEffect(() => {
    if (knowledgeBase) {
      setLocalData(knowledgeBase)
      setHasChanges(false)
    } else {
      setLocalData({
        company: {},
        company_people: [],
        company_offer: {},
        company_competition: [],
        prospect_companies: {},
        prospect_people: {},
        copy_structures: [],
        copy_variables: {},
        copy_variable_unique_data: {},
        data_quality_assurance: {},
        sending_technicalities: {},
      })
    }
  }, [knowledgeBase])

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

  const updateField = useCallback((section: SectionId, field: string, value: any) => {
    setLocalData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, any> || {}),
        [field]: value,
      },
    }))
    setHasChanges(true)
  }, [])

  const updateSection = useCallback((section: SectionId, value: any) => {
    setLocalData(prev => ({
      ...prev,
      [section]: value,
    }))
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
    if (typeof data === 'object') return Object.values(data).some(v => v && (typeof v !== 'object' || Object.keys(v).length > 0))
    return Boolean(data)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-rillation-text-muted" />
      </div>
    )
  }

  return (
    <div className={compact ? "space-y-3" : "p-6 space-y-6"}>
      {/* Header - only in non-compact mode */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-rillation-text">Knowledge Base</h2>
            <p className="text-sm text-rillation-text-muted mt-0.5">
              Source of truth for {client}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
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

      {/* Sections */}
      <div className="space-y-3">
        {/* Company */}
        <CollapsibleSection
          section={SECTIONS[0]}
          isOpen={openSections.has('company')}
          onToggle={() => toggleSection('company')}
          hasContent={hasContent('company')}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Company Name"
                value={(localData.company as any)?.name || ''}
                onChange={(v) => updateField('company', 'name', v)}
                placeholder="e.g., SurgiBox"
              />
              <TextField
                label="Industry"
                value={(localData.company as any)?.industry || ''}
                onChange={(v) => updateField('company', 'industry', v)}
                placeholder="e.g., Medical Devices"
              />
            </div>
            <TextField
              label="Description"
              value={(localData.company as any)?.description || ''}
              onChange={(v) => updateField('company', 'description', v)}
              placeholder="Brief description of the company..."
              multiline
            />
            <div className="grid grid-cols-3 gap-4">
              <TextField
                label="Website"
                value={(localData.company as any)?.website || ''}
                onChange={(v) => updateField('company', 'website', v)}
                placeholder="https://..."
              />
              <TextField
                label="Company Size"
                value={(localData.company as any)?.size || ''}
                onChange={(v) => updateField('company', 'size', v)}
                placeholder="e.g., 11-50"
              />
              <TextField
                label="Headquarters"
                value={(localData.company as any)?.headquarters || ''}
                onChange={(v) => updateField('company', 'headquarters', v)}
                placeholder="e.g., Boston, MA"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Company People */}
        <CollapsibleSection
          section={SECTIONS[1]}
          isOpen={openSections.has('company_people')}
          onToggle={() => toggleSection('company_people')}
          hasContent={hasContent('company_people')}
        >
          <PersonField
            people={localData.company_people || []}
            onChange={(people) => updateSection('company_people', people)}
          />
        </CollapsibleSection>

        {/* Company Offer */}
        <CollapsibleSection
          section={SECTIONS[2]}
          isOpen={openSections.has('company_offer')}
          onToggle={() => toggleSection('company_offer')}
          hasContent={hasContent('company_offer')}
        >
          <div className="space-y-4">
            <ArrayField
              label="Products"
              items={(localData.company_offer as any)?.products || []}
              onChange={(v) => updateField('company_offer', 'products', v)}
              placeholder="Add a product..."
            />
            <ArrayField
              label="Services"
              items={(localData.company_offer as any)?.services || []}
              onChange={(v) => updateField('company_offer', 'services', v)}
              placeholder="Add a service..."
            />
            <ArrayField
              label="Value Propositions"
              items={(localData.company_offer as any)?.value_props || []}
              onChange={(v) => updateField('company_offer', 'value_props', v)}
              placeholder="Add a value proposition..."
            />
            <TextField
              label="Pricing Notes"
              value={(localData.company_offer as any)?.pricing || ''}
              onChange={(v) => updateField('company_offer', 'pricing', v)}
              placeholder="Pricing model, ranges, etc."
              multiline
            />
          </div>
        </CollapsibleSection>

        {/* Company Competition */}
        <CollapsibleSection
          section={SECTIONS[3]}
          isOpen={openSections.has('company_competition')}
          onToggle={() => toggleSection('company_competition')}
          hasContent={hasContent('company_competition')}
        >
          <ArrayField
            label="Competitors"
            items={(localData.company_competition as string[]) || []}
            onChange={(v) => updateSection('company_competition', v)}
            placeholder="Add a competitor..."
          />
        </CollapsibleSection>

        {/* Prospect Companies */}
        <CollapsibleSection
          section={SECTIONS[4]}
          isOpen={openSections.has('prospect_companies')}
          onToggle={() => toggleSection('prospect_companies')}
          hasContent={hasContent('prospect_companies')}
        >
          <div className="space-y-4">
            <TextField
              label="ICP Description"
              value={(localData.prospect_companies as any)?.icp_description || ''}
              onChange={(v) => updateField('prospect_companies', 'icp_description', v)}
              placeholder="Describe the ideal customer profile..."
              multiline
            />
            <ArrayField
              label="Target Industries"
              items={(localData.prospect_companies as any)?.industries || []}
              onChange={(v) => updateField('prospect_companies', 'industries', v)}
              placeholder="Add an industry..."
            />
            <ArrayField
              label="Company Size Targets"
              items={(localData.prospect_companies as any)?.company_sizes || []}
              onChange={(v) => updateField('prospect_companies', 'company_sizes', v)}
              placeholder="e.g., 51-200 employees"
            />
            <ArrayField
              label="Geographies"
              items={(localData.prospect_companies as any)?.geographies || []}
              onChange={(v) => updateField('prospect_companies', 'geographies', v)}
              placeholder="Add a geography..."
            />
          </div>
        </CollapsibleSection>

        {/* Prospect People */}
        <CollapsibleSection
          section={SECTIONS[5]}
          isOpen={openSections.has('prospect_people')}
          onToggle={() => toggleSection('prospect_people')}
          hasContent={hasContent('prospect_people')}
        >
          <div className="space-y-4">
            <ArrayField
              label="Target Job Titles"
              items={(localData.prospect_people as any)?.job_titles || []}
              onChange={(v) => updateField('prospect_people', 'job_titles', v)}
              placeholder="Add a job title..."
            />
            <ArrayField
              label="Seniority Levels"
              items={(localData.prospect_people as any)?.seniority_levels || []}
              onChange={(v) => updateField('prospect_people', 'seniority_levels', v)}
              placeholder="e.g., VP, Director, Manager"
            />
            <TextField
              label="Persona Notes"
              value={(localData.prospect_people as any)?.persona_notes || ''}
              onChange={(v) => updateField('prospect_people', 'persona_notes', v)}
              placeholder="Additional notes about target personas..."
              multiline
            />
          </div>
        </CollapsibleSection>

        {/* Copy Structures */}
        <CollapsibleSection
          section={SECTIONS[6]}
          isOpen={openSections.has('copy_structures')}
          onToggle={() => toggleSection('copy_structures')}
          hasContent={hasContent('copy_structures')}
        >
          <div className="space-y-4">
            <TextField
              label="Email Sequence Structure"
              value={Array.isArray(localData.copy_structures) ? '' : ((localData.copy_structures as any)?.sequence_structure || '')}
              onChange={(v) => updateSection('copy_structures', { ...((localData.copy_structures as any) || {}), sequence_structure: v })}
              placeholder="Describe the email sequence structure..."
              multiline
            />
            <TextField
              label="Template Guidelines"
              value={Array.isArray(localData.copy_structures) ? '' : ((localData.copy_structures as any)?.template_guidelines || '')}
              onChange={(v) => updateSection('copy_structures', { ...((localData.copy_structures as any) || {}), template_guidelines: v })}
              placeholder="Guidelines for copy templates..."
              multiline
            />
          </div>
        </CollapsibleSection>

        {/* Copy Variables */}
        <CollapsibleSection
          section={SECTIONS[7]}
          isOpen={openSections.has('copy_variables')}
          onToggle={() => toggleSection('copy_variables')}
          hasContent={hasContent('copy_variables')}
        >
          <TextField
            label="Variables Configuration"
            value={typeof localData.copy_variables === 'object' ? JSON.stringify(localData.copy_variables, null, 2) : ''}
            onChange={(v) => {
              try {
                updateSection('copy_variables', JSON.parse(v))
              } catch {
                // Invalid JSON, ignore
              }
            }}
            placeholder='{"variable_name": "description"}'
            multiline
          />
        </CollapsibleSection>

        {/* Copy Variable Unique Data */}
        <CollapsibleSection
          section={SECTIONS[8]}
          isOpen={openSections.has('copy_variable_unique_data')}
          onToggle={() => toggleSection('copy_variable_unique_data')}
          hasContent={hasContent('copy_variable_unique_data')}
        >
          <TextField
            label="Unique Variable Values"
            value={typeof localData.copy_variable_unique_data === 'object' ? JSON.stringify(localData.copy_variable_unique_data, null, 2) : ''}
            onChange={(v) => {
              try {
                updateSection('copy_variable_unique_data', JSON.parse(v))
              } catch {
                // Invalid JSON, ignore
              }
            }}
            placeholder='{"variable_name": "unique_value"}'
            multiline
          />
        </CollapsibleSection>

        {/* Data Quality Assurance */}
        <CollapsibleSection
          section={SECTIONS[9]}
          isOpen={openSections.has('data_quality_assurance')}
          onToggle={() => toggleSection('data_quality_assurance')}
          hasContent={hasContent('data_quality_assurance')}
        >
          <div className="space-y-4">
            <TextField
              label="Validation Rules"
              value={(localData.data_quality_assurance as any)?.validation_rules || ''}
              onChange={(v) => updateField('data_quality_assurance', 'validation_rules', v)}
              placeholder="Data validation rules..."
              multiline
            />
            <TextField
              label="Quality Checks"
              value={(localData.data_quality_assurance as any)?.quality_checks || ''}
              onChange={(v) => updateField('data_quality_assurance', 'quality_checks', v)}
              placeholder="Quality check procedures..."
              multiline
            />
          </div>
        </CollapsibleSection>

        {/* Sending Technicalities */}
        <CollapsibleSection
          section={SECTIONS[10]}
          isOpen={openSections.has('sending_technicalities')}
          onToggle={() => toggleSection('sending_technicalities')}
          hasContent={hasContent('sending_technicalities')}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Daily Send Limit"
                value={(localData.sending_technicalities as any)?.daily_limit || ''}
                onChange={(v) => updateField('sending_technicalities', 'daily_limit', v)}
                placeholder="e.g., 500"
              />
              <TextField
                label="Send Window"
                value={(localData.sending_technicalities as any)?.send_window || ''}
                onChange={(v) => updateField('sending_technicalities', 'send_window', v)}
                placeholder="e.g., 9am-5pm EST"
              />
            </div>
            <ArrayField
              label="Sending Domains"
              items={(localData.sending_technicalities as any)?.domains || []}
              onChange={(v) => updateField('sending_technicalities', 'domains', v)}
              placeholder="Add a domain..."
            />
            <TextField
              label="Technical Notes"
              value={(localData.sending_technicalities as any)?.notes || ''}
              onChange={(v) => updateField('sending_technicalities', 'notes', v)}
              placeholder="Additional technical notes..."
              multiline
            />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}
