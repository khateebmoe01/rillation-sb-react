import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Users,
  Package,
  Target,
  UserCircle,
  FileText,
  Shield,
  Send,
  Save,
  Loader2,
  Plus,
  X,
  Check,
  Sparkles,
  Download,
  Briefcase,
  Globe,
  MapPin,
  Link,
  User,
  MessageSquare,
  Zap,
  Clock,
  Database,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import type { KnowledgeBase, FathomCall } from '../../hooks/useClientStrategy'
import { supabase } from '../../lib/supabase'

interface KnowledgeBaseEditorProps {
  client: string
  knowledgeBase: KnowledgeBase | null
  fathomCalls?: FathomCall[]
  loading: boolean
  onSave: (updates: Partial<KnowledgeBase>) => Promise<KnowledgeBase | null>
  compact?: boolean
}

// Generate Knowledge Base Modal
interface GenerateModalProps {
  isOpen: boolean
  onClose: () => void
  fathomCalls: FathomCall[]
  onGenerate: (callIds: string[]) => Promise<void>
  isGenerating: boolean
}

function GenerateModal({ isOpen, onClose, fathomCalls, onGenerate, isGenerating }: GenerateModalProps) {
  const [selectedCalls, setSelectedCalls] = useState<Set<string>>(new Set())

  const toggleCall = (id: string) => {
    const next = new Set(selectedCalls)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedCalls(next)
  }

  const handleGenerate = async () => {
    await onGenerate(Array.from(selectedCalls))
    setSelectedCalls(new Set())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-rillation-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Generate Knowledge Base</h2>
              <p className="text-xs text-white/90">AI will analyze calls to extract client info</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X size={18} className="text-white/90" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Select Fathom Calls to Analyze
            </label>
            {fathomCalls.length === 0 ? (
              <div className="text-center py-6 bg-rillation-bg rounded-lg text-sm text-white/90">
                No calls available. Add Fathom calls first.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {fathomCalls.map((call) => {
                  const isSelected = selectedCalls.has(call.id)
                  return (
                    <button
                      key={call.id}
                      onClick={() => toggleCall(call.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        isSelected
                          ? 'bg-white/10 border border-white/20'
                          : 'bg-rillation-bg hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-white border-white' : 'border-white/30'
                      }`}>
                        {isSelected && <Check size={12} className="text-black" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{call.title}</div>
                        <div className="text-xs text-white/80">
                          {call.call_date ? new Date(call.call_date).toLocaleDateString() : 'No date'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-rillation-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/90 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={selectedCalls.size === 0 || isGenerating}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// PDF Generation Function
function generateKnowledgeBasePDF(data: Partial<KnowledgeBase>, client: string) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let y = margin

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      pdf.addPage()
      y = margin
    }
  }

  // Title Page
  pdf.setFontSize(28)
  pdf.setFont('helvetica', 'bold')
  pdf.text('KNOWLEDGE BASE', pageWidth / 2, 60, { align: 'center' })
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'normal')
  pdf.text(client, pageWidth / 2, 75, { align: 'center' })
  pdf.setFontSize(12)
  pdf.text('Client Strategy Document', pageWidth / 2, 85, { align: 'center' })
  pdf.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), pageWidth / 2, 95, { align: 'center' })

  pdf.addPage()
  y = margin

  const addSectionHeader = (title: string, sectionNumber: number) => {
    checkPageBreak(15)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${sectionNumber}. ${title}`, margin, y)
    y += 8
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 6
  }

  const addSubsectionHeader = (title: string) => {
    checkPageBreak(12)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, margin, y)
    y += 5
  }

  const addKeyValue = (key: string, value: string) => {
    if (!value) return
    checkPageBreak(10)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${key}: `, margin, y)
    pdf.setFont('helvetica', 'normal')
    const keyWidth = pdf.getTextWidth(`${key}: `)
    const valueLines = pdf.splitTextToSize(value, contentWidth - keyWidth)
    pdf.text(valueLines[0], margin + keyWidth, y)
    if (valueLines.length > 1) {
      y += 5
      for (let i = 1; i < valueLines.length; i++) {
        pdf.text(valueLines[i], margin, y)
        y += 5
      }
    } else {
      y += 5
    }
    y += 2
  }

  const addParagraph = (text: string) => {
    if (!text) return
    checkPageBreak(10)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const lines = pdf.splitTextToSize(text, contentWidth)
    pdf.text(lines, margin, y)
    y += lines.length * 5 + 4
  }

  const addBulletList = (items: string[]) => {
    if (!items || items.length === 0) return
    items.forEach((item) => {
      checkPageBreak(8)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const lines = pdf.splitTextToSize(`• ${item}`, contentWidth - 5)
      pdf.text(lines, margin + 3, y)
      y += lines.length * 5 + 2
    })
    y += 2
  }

  // Sections
  const company = data.company as Record<string, any> || {}
  addSectionHeader('Company Information', 1)
  addKeyValue('Company Name', company.name)
  addKeyValue('Industry', company.industry)
  addKeyValue('Company Size', company.size)
  addKeyValue('Website', company.website)
  addKeyValue('Headquarters', company.headquarters)
  if (company.description) {
    addSubsectionHeader('Description')
    addParagraph(company.description)
  }
  y += 4

  const people = data.company_people || []
  if (people.length > 0) {
    addSectionHeader('Company People', 2)
    people.forEach((person: any, index: number) => {
      checkPageBreak(20)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${index + 1}. ${person.name || 'Unknown'}`, margin, y)
      y += 5
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      if (person.title) { pdf.text(`Title: ${person.title}`, margin + 5, y); y += 5 }
      if (person.email) { pdf.text(`Email: ${person.email}`, margin + 5, y); y += 5 }
      if (person.notes) { pdf.text(`Notes: ${person.notes}`, margin + 5, y); y += 5 }
      y += 3
    })
  }

  const offer = data.company_offer as Record<string, any> || {}
  addSectionHeader('Company Offer', 3)
  if (offer.products?.length > 0) { addSubsectionHeader('Products'); addBulletList(offer.products) }
  if (offer.services?.length > 0) { addSubsectionHeader('Services'); addBulletList(offer.services) }
  if (offer.value_props?.length > 0) { addSubsectionHeader('Value Propositions'); addBulletList(offer.value_props) }
  if (offer.pricing) { addSubsectionHeader('Pricing'); addParagraph(offer.pricing) }

  const competition = data.company_competition as string[] || []
  if (competition.length > 0) {
    addSectionHeader('Competition', 4)
    addBulletList(competition)
  }

  const prospectCompanies = data.prospect_companies as Record<string, any> || {}
  addSectionHeader('Ideal Customer Profile', 5)
  if (prospectCompanies.icp_description) { addParagraph(prospectCompanies.icp_description) }
  if (prospectCompanies.industries?.length > 0) { addSubsectionHeader('Industries'); addBulletList(prospectCompanies.industries) }
  if (prospectCompanies.company_sizes?.length > 0) { addSubsectionHeader('Company Sizes'); addBulletList(prospectCompanies.company_sizes) }
  if (prospectCompanies.geographies?.length > 0) { addSubsectionHeader('Geographies'); addBulletList(prospectCompanies.geographies) }

  const prospectPeople = data.prospect_people as Record<string, any> || {}
  addSectionHeader('Target Personas', 6)
  if (prospectPeople.job_titles?.length > 0) { addSubsectionHeader('Job Titles'); addBulletList(prospectPeople.job_titles) }
  if (prospectPeople.seniority_levels?.length > 0) { addSubsectionHeader('Seniority Levels'); addBulletList(prospectPeople.seniority_levels) }
  if (prospectPeople.persona_notes) { addSubsectionHeader('Notes'); addParagraph(prospectPeople.persona_notes) }

  const sending = data.sending_technicalities as Record<string, any> || {}
  if (sending.daily_limit || sending.send_window || sending.domains?.length > 0) {
    addSectionHeader('Sending Configuration', 7)
    addKeyValue('Daily Limit', sending.daily_limit)
    addKeyValue('Send Window', sending.send_window)
    if (sending.domains?.length > 0) { addSubsectionHeader('Domains'); addBulletList(sending.domains) }
  }

  pdf.save(`knowledge-base-${client.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// Tag/Chip Component
function Tag({ children, onRemove }: { children: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-white/80 group hover:bg-white/10 transition-colors">
      {children}
      {onRemove && (
        <button onClick={onRemove} className="opacity-50 hover:opacity-100 transition-opacity">
          <X size={12} />
        </button>
      )}
    </span>
  )
}

// Editable Tag Input
function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('')

  const addTag = () => {
    if (input.trim() && !tags.includes(input.trim())) {
      onChange([...tags, input.trim()])
      setInput('')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, i) => (
          <Tag key={i} onRemove={() => onChange(tags.filter((_, idx) => idx !== i))}>
            {tag}
          </Tag>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/90 focus:outline-none focus:border-white/30 transition-colors"
        />
        <button
          onClick={addTag}
          disabled={!input.trim()}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

// Section Card Component
function SectionCard({ 
  icon: Icon, 
  title, 
  gradient, 
  children 
}: { 
  icon: React.ElementType
  title: string
  gradient: string
  children: React.ReactNode 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-2xl overflow-hidden"
    >
      <div className={`h-1 bg-gradient-to-r ${gradient}`} />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Icon size={20} className="text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {children}
      </div>
    </motion.div>
  )
}

// Input Field Component
function InputField({ 
  label, 
  value, 
  onChange, 
  placeholder,
  icon: Icon,
  multiline = false 
}: { 
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: React.ElementType
  multiline?: boolean
}) {
  const inputClasses = "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/90 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
  
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-xs font-medium text-white/80 uppercase tracking-wide">
        {Icon && <Icon size={12} />}
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${inputClasses} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}
    </div>
  )
}

// Person Card Component
function PersonCard({ person, onRemove }: { person: any; onRemove: () => void }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl group hover:bg-white/[0.07] transition-colors">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
        {person.name?.charAt(0) || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white text-sm">{person.name}</div>
        {person.title && <div className="text-xs text-white/80">{person.title}</div>}
        {person.email && <div className="text-xs text-white/90 mt-0.5">{person.email}</div>}
        {person.notes && <div className="text-xs text-white/90 mt-1 italic">{person.notes}</div>}
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 text-white/90 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// Add Person Form
function AddPersonForm({ onAdd }: { onAdd: (person: any) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [person, setPerson] = useState({ name: '', title: '', email: '', notes: '' })

  const handleAdd = () => {
    if (person.name) {
      onAdd({ ...person, id: Date.now().toString() })
      setPerson({ name: '', title: '', email: '', notes: '' })
      setIsOpen(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-white/20 rounded-xl text-sm text-white/80 hover:text-white hover:border-white/40 transition-colors w-full justify-center"
      >
        <Plus size={16} />
        Add Person
      </button>
    )
  }

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={person.name}
          onChange={(e) => setPerson({ ...person, name: e.target.value })}
          placeholder="Name"
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/90 focus:outline-none focus:border-white/30"
        />
        <input
          type="text"
          value={person.title}
          onChange={(e) => setPerson({ ...person, title: e.target.value })}
          placeholder="Title"
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/90 focus:outline-none focus:border-white/30"
        />
      </div>
      <input
        type="email"
        value={person.email}
        onChange={(e) => setPerson({ ...person, email: e.target.value })}
        placeholder="Email"
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/90 focus:outline-none focus:border-white/30"
      />
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={!person.name}
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-black text-xs font-medium rounded-lg hover:bg-white/90 disabled:opacity-50 transition-colors"
        >
          <Check size={14} />
          Add
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 text-xs text-white/80 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function KnowledgeBaseEditor({
  client,
  knowledgeBase,
  fathomCalls = [],
  loading,
  onSave,
}: KnowledgeBaseEditorProps) {
  const [localData, setLocalData] = useState<Partial<KnowledgeBase>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

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
        data_quality_assurance: {},
        sending_technicalities: {},
      })
    }
  }, [knowledgeBase])

  const updateField = useCallback((section: string, field: string, value: any) => {
    setLocalData(prev => ({
      ...prev,
      [section]: { ...(prev[section as keyof KnowledgeBase] as Record<string, any> || {}), [field]: value },
    }))
    setHasChanges(true)
  }, [])

  const updateSection = useCallback((section: string, value: any) => {
    setLocalData(prev => ({ ...prev, [section]: value }))
    setHasChanges(true)
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(localData)
    setIsSaving(false)
    setHasChanges(false)
  }

  const handleGenerate = async (callIds: string[]) => {
    setIsGenerating(true)
    try {
      const selectedCalls = fathomCalls.filter(c => callIds.includes(c.id))
      const transcripts = selectedCalls.map(c => c.transcript || c.summary || '').join('\n\n---\n\n')
      const { data, error } = await supabase.functions.invoke('generate-knowledge-base', {
        body: { client, transcripts, callIds },
      })
      if (error) throw error
      if (data) {
        const updatedData = { ...localData, ...data }
        setLocalData(updatedData)
        // Auto-save after generation
        await onSave(updatedData)
        setHasChanges(false)
      }
      setIsGenerateModalOpen(false)
    } catch (err) {
      console.error('Error generating knowledge base:', err)
      alert('Failed to generate knowledge base. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    try { generateKnowledgeBasePDF(localData, client) }
    catch (err) { console.error('Error exporting PDF:', err) }
    finally { setIsExporting(false) }
  }

  // Shorthand getters
  const company = (localData.company || {}) as Record<string, any>
  const offer = (localData.company_offer || {}) as Record<string, any>
  const prospectCompanies = (localData.prospect_companies || {}) as Record<string, any>
  const prospectPeople = (localData.prospect_people || {}) as Record<string, any>
  const dqa = (localData.data_quality_assurance || {}) as Record<string, any>
  const sending = (localData.sending_technicalities || {}) as Record<string, any>

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-white/90" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-rillation-bg/80 backdrop-blur-xl border-b border-white/10 -mx-6 px-6 py-4 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Knowledge Base</h2>
            <p className="text-sm text-white/90 mt-0.5">Everything about {client}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              <Sparkles size={16} />
              Generate
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              PDF
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                hasChanges 
                  ? 'bg-white text-black hover:bg-white/90' 
                  : 'bg-white/5 border border-white/10 text-white/90'
              }`}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {hasChanges ? 'Save' : 'Saved'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Company Info */}
        <SectionCard icon={Building2} title="Company" gradient="from-blue-500 to-cyan-500">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Company Name"
                icon={Building2}
                value={company.name || ''}
                onChange={(v) => updateField('company', 'name', v)}
                placeholder="e.g., Acme Corp"
              />
              <InputField
                label="Industry"
                icon={Briefcase}
                value={company.industry || ''}
                onChange={(v) => updateField('company', 'industry', v)}
                placeholder="e.g., SaaS, Healthcare"
              />
            </div>
            <InputField
              label="Description"
              icon={FileText}
              value={company.description || ''}
              onChange={(v) => updateField('company', 'description', v)}
              placeholder="Brief description of the company..."
              multiline
            />
            <div className="grid grid-cols-3 gap-3">
              <InputField
                label="Website"
                icon={Link}
                value={company.website || ''}
                onChange={(v) => updateField('company', 'website', v)}
                placeholder="https://..."
              />
              <InputField
                label="Size"
                icon={Users}
                value={company.size || ''}
                onChange={(v) => updateField('company', 'size', v)}
                placeholder="11-50"
              />
              <InputField
                label="HQ"
                icon={MapPin}
                value={company.headquarters || ''}
                onChange={(v) => updateField('company', 'headquarters', v)}
                placeholder="City, State"
              />
            </div>
          </div>
        </SectionCard>

        {/* Company People */}
        <SectionCard icon={Users} title="Team Contacts" gradient="from-violet-500 to-purple-500">
          <div className="space-y-3">
            {(localData.company_people || []).map((person: any, i: number) => (
              <PersonCard
                key={person.id || i}
                person={person}
                onRemove={() => updateSection('company_people', (localData.company_people || []).filter((_: any, idx: number) => idx !== i))}
              />
            ))}
            <AddPersonForm onAdd={(person) => updateSection('company_people', [...(localData.company_people || []), person])} />
          </div>
        </SectionCard>

        {/* Products & Services */}
        <SectionCard icon={Package} title="Products & Services" gradient="from-orange-500 to-amber-500">
          <div className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                <Zap size={12} /> Products
              </label>
              <TagInput
                tags={offer.products || []}
                onChange={(v) => updateField('company_offer', 'products', v)}
                placeholder="Add product..."
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                <Briefcase size={12} /> Services
              </label>
              <TagInput
                tags={offer.services || []}
                onChange={(v) => updateField('company_offer', 'services', v)}
                placeholder="Add service..."
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                <MessageSquare size={12} /> Value Propositions
              </label>
              <TagInput
                tags={offer.value_props || []}
                onChange={(v) => updateField('company_offer', 'value_props', v)}
                placeholder="Add value prop..."
              />
            </div>
            <InputField
              label="Pricing Notes"
              value={offer.pricing || ''}
              onChange={(v) => updateField('company_offer', 'pricing', v)}
              placeholder="Pricing model, ranges..."
              multiline
            />
          </div>
        </SectionCard>

        {/* Competition */}
        <SectionCard icon={Target} title="Competition" gradient="from-red-500 to-rose-500">
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
              Competitors
            </label>
            <TagInput
              tags={(localData.company_competition as string[]) || []}
              onChange={(v) => updateSection('company_competition', v)}
              placeholder="Add competitor..."
            />
          </div>
        </SectionCard>

        {/* ICP */}
        <SectionCard icon={Globe} title="Ideal Customer Profile" gradient="from-emerald-500 to-green-500">
          <div className="space-y-5">
            <InputField
              label="ICP Description"
              value={prospectCompanies.icp_description || ''}
              onChange={(v) => updateField('prospect_companies', 'icp_description', v)}
              placeholder="Describe the ideal customer..."
              multiline
            />
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                <Briefcase size={12} /> Target Industries
              </label>
              <TagInput
                tags={prospectCompanies.industries || []}
                onChange={(v) => updateField('prospect_companies', 'industries', v)}
                placeholder="Add industry..."
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                <Users size={12} /> Company Sizes
              </label>
              <TagInput
                tags={prospectCompanies.company_sizes || []}
                onChange={(v) => updateField('prospect_companies', 'company_sizes', v)}
                placeholder="e.g., 51-200 employees"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                <MapPin size={12} /> Geographies
              </label>
              <TagInput
                tags={prospectCompanies.geographies || []}
                onChange={(v) => updateField('prospect_companies', 'geographies', v)}
                placeholder="Add geography..."
              />
            </div>
          </div>
        </SectionCard>

        {/* Target Personas */}
        <SectionCard icon={UserCircle} title="Target Personas" gradient="from-pink-500 to-rose-500">
          <div className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                <User size={12} /> Job Titles
              </label>
              <TagInput
                tags={prospectPeople.job_titles || []}
                onChange={(v) => updateField('prospect_people', 'job_titles', v)}
                placeholder="e.g., VP of Sales"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                Seniority Levels
              </label>
              <TagInput
                tags={prospectPeople.seniority_levels || []}
                onChange={(v) => updateField('prospect_people', 'seniority_levels', v)}
                placeholder="e.g., VP, Director"
              />
            </div>
            <InputField
              label="Persona Notes"
              value={prospectPeople.persona_notes || ''}
              onChange={(v) => updateField('prospect_people', 'persona_notes', v)}
              placeholder="Additional notes about personas..."
              multiline
            />
          </div>
        </SectionCard>

        {/* Sending Config */}
        <SectionCard icon={Send} title="Sending Configuration" gradient="from-cyan-500 to-teal-500">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Daily Limit"
                icon={Database}
                value={sending.daily_limit || ''}
                onChange={(v) => updateField('sending_technicalities', 'daily_limit', v)}
                placeholder="e.g., 500"
              />
              <InputField
                label="Send Window"
                icon={Clock}
                value={sending.send_window || ''}
                onChange={(v) => updateField('sending_technicalities', 'send_window', v)}
                placeholder="e.g., 9am-5pm EST"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                <Globe size={12} /> Sending Domains
              </label>
              <TagInput
                tags={sending.domains || []}
                onChange={(v) => updateField('sending_technicalities', 'domains', v)}
                placeholder="Add domain..."
              />
            </div>
            <InputField
              label="Technical Notes"
              value={sending.notes || ''}
              onChange={(v) => updateField('sending_technicalities', 'notes', v)}
              placeholder="Additional notes..."
              multiline
            />
          </div>
        </SectionCard>

        {/* Data Quality */}
        <SectionCard icon={Shield} title="Data Quality" gradient="from-slate-500 to-gray-600">
          <div className="space-y-4">
            <InputField
              label="Validation Rules"
              value={dqa.validation_rules || ''}
              onChange={(v) => updateField('data_quality_assurance', 'validation_rules', v)}
              placeholder="Data validation rules..."
              multiline
            />
            <InputField
              label="Quality Checks"
              value={dqa.quality_checks || ''}
              onChange={(v) => updateField('data_quality_assurance', 'quality_checks', v)}
              placeholder="Quality check procedures..."
              multiline
            />
          </div>
        </SectionCard>
      </div>

      {/* Generate Modal */}
      <AnimatePresence>
        {isGenerateModalOpen && (
          <GenerateModal
            isOpen={isGenerateModalOpen}
            onClose={() => setIsGenerateModalOpen(false)}
            fathomCalls={fathomCalls}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        )}
      </AnimatePresence>
    </div>
  )
}








