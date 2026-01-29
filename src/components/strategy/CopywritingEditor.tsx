import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Mail,
  Code,
  Sparkles,
  Download,
  Save,
  Loader2,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Trash2,
  AlertCircle,
  Zap,
  Variable,
} from 'lucide-react'
// jsPDF is dynamically imported when needed (reduces initial bundle)
import { supabase } from '../../lib/supabase'
import type { ClientCopywriting, CopySequence, CopyEmail, ClayPrompt } from '../../hooks/useCopywriting'
import type { KnowledgeBase, FathomCall } from '../../hooks/useClientStrategy'

interface CopywritingEditorProps {
  client: string
  copywriting: ClientCopywriting | null
  knowledgeBase: KnowledgeBase | null
  fathomCalls?: FathomCall[]
  loading: boolean
  onSave: (updates: Partial<ClientCopywriting>) => Promise<ClientCopywriting | null>
}

// Generate Copy Structures Modal
interface GenerateCopyModalProps {
  isOpen: boolean
  onClose: () => void
  fathomCalls: FathomCall[]
  hasKnowledgeBase: boolean
  onGenerate: (callIds: string[]) => Promise<void>
  isGenerating: boolean
}

function GenerateCopyModal({ isOpen, onClose, fathomCalls, hasKnowledgeBase, onGenerate, isGenerating }: GenerateCopyModalProps) {
  const [selectedCalls, setSelectedCalls] = useState<Set<string>>(new Set())

  const toggleCall = (id: string) => {
    const next = new Set(selectedCalls)
    if (next.has(id)) next.delete(id)
    else next.add(id)
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
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Generate Copy Structures</h2>
              <p className="text-xs text-white/90">AI will create email sequences</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X size={18} className="text-white/90" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!hasKnowledgeBase && (
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-200">
                Knowledge Base is required. Please generate the Knowledge Base first.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Optional: Include Fathom Calls for Context
            </label>
            {fathomCalls.length === 0 ? (
              <div className="text-center py-4 bg-rillation-bg rounded-lg text-sm text-white/80">
                No calls available
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {fathomCalls.map((call) => {
                  const isSelected = selectedCalls.has(call.id)
                  return (
                    <button
                      key={call.id}
                      onClick={() => toggleCall(call.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        isSelected ? 'bg-white/10 border border-white/20' : 'bg-rillation-bg hover:bg-white/5 border border-transparent'
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
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/90 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!hasKnowledgeBase || isGenerating}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Copy
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// Generate Clay Prompts Modal
interface GeneratePromptsModalProps {
  isOpen: boolean
  onClose: () => void
  variables: string[]
  existingPrompts: string[]
  onGenerate: (variables: string[]) => Promise<void>
  isGenerating: boolean
}

function GeneratePromptsModal({ isOpen, onClose, variables, existingPrompts, onGenerate, isGenerating }: GeneratePromptsModalProps) {
  const unmappedVars = variables.filter(v => !existingPrompts.includes(v))
  const [selectedVars, setSelectedVars] = useState<Set<string>>(new Set(unmappedVars))

  useEffect(() => {
    setSelectedVars(new Set(unmappedVars))
  }, [variables, existingPrompts])

  const toggleVar = (v: string) => {
    const next = new Set(selectedVars)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    setSelectedVars(next)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-rillation-card border border-rillation-border rounded-xl w-full max-w-lg shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-rillation-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Code size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Generate Clay Prompts</h2>
              <p className="text-xs text-white/90">Create Claygent prompts for variables</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X size={18} className="text-white/90" />
          </button>
        </div>

        <div className="p-4">
          <label className="block text-sm font-medium text-white mb-2">
            Select Variables to Generate Prompts For
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {variables.length === 0 ? (
              <div className="text-center py-6 bg-rillation-bg rounded-lg text-sm text-white/80">
                No variables found. Generate copy structures first.
              </div>
            ) : (
              variables.map((v) => {
                const isSelected = selectedVars.has(v)
                const hasPrompt = existingPrompts.includes(v)
                return (
                  <button
                    key={v}
                    onClick={() => toggleVar(v)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      isSelected ? 'bg-white/10 border border-white/20' : 'bg-rillation-bg hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected ? 'bg-white border-white' : 'border-white/30'
                    }`}>
                      {isSelected && <Check size={12} className="text-black" />}
                    </div>
                    <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded text-sm font-mono">
                      {`{{${v}}}`}
                    </span>
                    {hasPrompt && (
                      <span className="ml-auto text-xs text-emerald-400">Has prompt</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-rillation-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/90 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onGenerate(Array.from(selectedVars))}
            disabled={selectedVars.size === 0 || isGenerating}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap size={16} />
                Generate Prompts
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// Email Card Component - Beautiful display with copy button and expandable prompts
function EmailCard({ 
  email, 
  emailIndex,
  onUpdatePrompt,
  onCopyEmail
}: { 
  email: CopyEmail
  emailIndex: number
  onUpdatePrompt?: (emailId: string, variable: string, prompt: ClayPrompt) => void
  onCopyEmail?: (email: CopyEmail) => void
}) {
  const [showPrompts, setShowPrompts] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [promptDraft, setPromptDraft] = useState('')

  // Extract variables from this email
  const emailVariables = useMemo(() => {
    const vars = new Set<string>()
    email.variables?.forEach(v => vars.add(v))
    const matches = email.body.match(/\{\{([^}]+)\}\}/g)
    matches?.forEach(m => vars.add(m.replace(/\{\{|\}\}/g, '').trim()))
    if (email.subject) {
      const subjectMatches = email.subject.match(/\{\{([^}]+)\}\}/g)
      subjectMatches?.forEach(m => vars.add(m.replace(/\{\{|\}\}/g, '').trim()))
    }
    return Array.from(vars).sort()
  }, [email])

  const handleCopy = () => {
    const content = email.subject 
      ? `Subject: ${email.subject}\n\n${email.body}`
      : email.body
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopyEmail?.(email)
  }

  const handleSavePrompt = (variable: string) => {
    if (promptDraft.trim() && onUpdatePrompt) {
      onUpdatePrompt(email.id, variable, {
        prompt: promptDraft,
        updated_at: new Date().toISOString()
      })
    }
    setEditingPrompt(null)
    setPromptDraft('')
  }

  // Function to render text with highlighted variables
  const renderHighlightedText = (text: string) => {
    const parts = text.split(/(\{\{[^}]+\}\}|\{[^}]+\|[^}]+\})/g)
    
    return parts.map((part, i) => {
      // Variable syntax {{variable}}
      if (part.match(/^\{\{[^}]+\}\}$/)) {
        return (
          <span key={i} className="px-1.5 py-0.5 bg-amber-300 text-amber-900 rounded font-medium">
            {part}
          </span>
        )
      }
      // Alternative syntax {option1|option2}
      if (part.match(/^\{[^}]+\|[^}]+\}$/)) {
        return (
          <span key={i} className="px-1.5 py-0.5 bg-pink-200 text-pink-800 rounded">
            {part}
          </span>
        )
      }
      // Regular text - preserve line breaks
      return part.split('\n').map((line, j, arr) => (
        <span key={`${i}-${j}`}>
          {line}
          {j < arr.length - 1 && <br />}
        </span>
      ))
    })
  }

  return (
    <div className="bg-slate-100 rounded-lg overflow-hidden">
      {/* Email Header with Copy Button */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="font-semibold text-slate-800">Email #{emailIndex + 1}</div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            copied 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-slate-200 text-rillation-text/50 hover:bg-slate-300'
          }`}
        >
          {copied ? (
            <>
              <Check size={12} />
              Copied!
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Email Content */}
      <div className="px-5 pb-4 space-y-3">
        {email.subject && (
          <div className="text-sm text-rillation-text/50">
            <span className="font-medium">Subject:</span> {renderHighlightedText(email.subject)}
          </div>
        )}
        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
          {renderHighlightedText(email.body)}
        </div>
        {email.notes && (
          <div className="text-xs text-rillation-text/60 italic border-t border-slate-200 pt-2 mt-2">
            Note: {email.notes}
          </div>
        )}
      </div>

      {/* Clay Prompts Section */}
      {emailVariables.length > 0 && (
        <div className="border-t border-slate-200">
          <button
            onClick={() => setShowPrompts(!showPrompts)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-200/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Code size={14} className="text-violet-600" />
              <span className="text-xs font-medium text-rillation-text/50">Clay Prompts</span>
              <span className="text-xs text-rillation-text/70">({emailVariables.length} variables)</span>
            </div>
            <ChevronDown 
              size={14} 
              className={`text-rillation-text/70 transition-transform ${showPrompts ? 'rotate-180' : ''}`} 
            />
          </button>

          <AnimatePresence>
            {showPrompts && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 space-y-2">
                  {emailVariables.map(variable => {
                    const prompt = email.clay_prompts?.[variable]
                    const isEditing = editingPrompt === variable
                    
                    return (
                      <div key={variable} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-mono">
                            {`{{${variable}}}`}
                          </span>
                          <div className="flex items-center gap-1">
                            {prompt && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(prompt.prompt)
                                }}
                                className="p-1 text-rillation-text/70 hover:text-rillation-text/50"
                                title="Copy prompt"
                              >
                                <Copy size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  setEditingPrompt(null)
                                  setPromptDraft('')
                                } else {
                                  setEditingPrompt(variable)
                                  setPromptDraft(prompt?.prompt || '')
                                }
                              }}
                              className="p-1 text-rillation-text/70 hover:text-violet-600"
                              title={isEditing ? 'Cancel' : 'Edit prompt'}
                            >
                              {isEditing ? <X size={12} /> : <Zap size={12} />}
                            </button>
                          </div>
                        </div>

                        {prompt && !isEditing && (
                          <div className="px-3 pb-3">
                            {prompt.example_output && (
                              <div className="text-xs text-emerald-600 mb-1">
                                Example: {prompt.example_output}
                              </div>
                            )}
                            <pre className="text-xs text-rillation-text/60 whitespace-pre-wrap font-mono bg-slate-50 rounded p-2 max-h-24 overflow-y-auto">
                              {prompt.prompt}
                            </pre>
                          </div>
                        )}

                        {isEditing && (
                          <div className="px-3 pb-3 space-y-2">
                            <textarea
                              value={promptDraft}
                              onChange={(e) => setPromptDraft(e.target.value)}
                              placeholder="Enter Clay prompt for this variable..."
                              rows={4}
                              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-violet-300"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingPrompt(null)
                                  setPromptDraft('')
                                }}
                                className="px-2 py-1 text-xs text-rillation-text/60 hover:text-slate-700"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSavePrompt(variable)}
                                disabled={!promptDraft.trim()}
                                className="px-3 py-1 text-xs bg-violet-500 text-white rounded hover:bg-violet-600 disabled:opacity-50"
                              >
                                Save Prompt
                              </button>
                            </div>
                          </div>
                        )}

                        {!prompt && !isEditing && (
                          <div className="px-3 pb-3">
                            <button
                              onClick={() => {
                                setEditingPrompt(variable)
                                setPromptDraft('')
                              }}
                              className="text-xs text-violet-500 hover:text-violet-600"
                            >
                              + Add prompt for this variable
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// Sequence Card Component
function SequenceCard({ 
  sequence, 
  onDelete,
  onUpdateEmailPrompt
}: { 
  sequence: CopySequence
  onDelete?: () => void
  onUpdateEmailPrompt?: (emailId: string, variable: string, prompt: ClayPrompt) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-2xl overflow-hidden"
    >
      <div className="h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
      
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 text-left"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 0 : -90 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown size={18} className="text-white/80" />
            </motion.div>
            <div>
              {sequence.phase && (
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                  {sequence.phase}
                </div>
              )}
              <h3 className="text-lg font-semibold text-white">{sequence.name}</h3>
              {sequence.description && (
                <p className="text-sm text-white/80 mt-0.5">{sequence.description}</p>
              )}
            </div>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-white/5 rounded text-xs text-white/80">
              {sequence.emails.length} emails
            </span>
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 text-white/90 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Emails */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 overflow-hidden"
            >
              {sequence.emails.map((email, i) => (
                <EmailCard 
                  key={email.id} 
                  email={email} 
                  emailIndex={i}
                  onUpdatePrompt={onUpdateEmailPrompt}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// Clay Prompt Card
function ClayPromptCard({ 
  variableName, 
  prompt, 
  onDelete,
  onCopy 
}: { 
  variableName: string
  prompt: ClayPrompt
  onDelete: () => void
  onCopy: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 rounded-xl overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-violet-500 to-purple-500" />
      
      <div className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3"
          >
            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
              <ChevronRight size={16} className="text-white/80" />
            </motion.div>
            <span className="px-2 py-1 bg-amber-400/20 text-amber-300 rounded font-mono text-sm">
              {`{{${variableName}}}`}
            </span>
            {prompt.description && (
              <span className="text-sm text-white/80">{prompt.description}</span>
            )}
          </button>
          
          <div className="flex items-center gap-1">
            <button onClick={onCopy} className="p-1.5 text-white/90 hover:text-white transition-colors">
              <Copy size={14} />
            </button>
            <button onClick={onDelete} className="p-1.5 text-white/90 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 space-y-3 overflow-hidden"
            >
              {prompt.example_output && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="text-xs text-emerald-400 font-medium mb-1">Example Output:</div>
                  <div className="text-sm text-emerald-200">{prompt.example_output}</div>
                </div>
              )}
              
              <div className="p-3 bg-rillation-bg rounded-lg">
                <div className="text-xs text-white/80 font-medium mb-2">Clay Prompt:</div>
                <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono leading-relaxed">
                  {prompt.prompt}
                </pre>
              </div>

              {prompt.columns_used && prompt.columns_used.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-white/90">Columns:</span>
                  {prompt.columns_used.map((col, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white/5 rounded text-xs text-white/90 font-mono">
                      {col}
                    </span>
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

// PDF Generation
async function generateCopyPDF(copywriting: ClientCopywriting, client: string) {
  // Dynamic import - only loads jspdf when user exports PDF
  const { jsPDF } = await import('jspdf')
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
  pdf.setFillColor(243, 244, 246) // Light gray background
  pdf.rect(0, 0, pageWidth, pageHeight, 'F')
  
  pdf.setFontSize(28)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(30, 41, 59)
  pdf.text('COPY STRUCTURES', pageWidth / 2, 60, { align: 'center' })
  
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'normal')
  pdf.text(client, pageWidth / 2, 75, { align: 'center' })
  
  pdf.setFontSize(12)
  pdf.text('Email Sequences & Personalization Guide', pageWidth / 2, 85, { align: 'center' })
  pdf.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), pageWidth / 2, 95, { align: 'center' })

  // Content Pages
  copywriting.copy_structures?.forEach((sequence) => {
    pdf.addPage()
    pdf.setFillColor(243, 244, 246)
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')
    y = margin

    // Phase header
    if (sequence.phase) {
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(180, 83, 9) // Amber
      pdf.text(sequence.phase.toUpperCase(), margin, y)
      y += 8
    }

    // Sequence name
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(30, 41, 59)
    pdf.text(sequence.name, margin, y)
    y += 8

    if (sequence.description) {
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 116, 139)
      pdf.text(sequence.description, margin, y)
      y += 8
    }

    y += 5

    // Emails
    sequence.emails.forEach((email, emailIndex) => {
      checkPageBreak(40)
      
      // Email header
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 41, 59)
      pdf.text(`Email ${emailIndex + 1}:`, margin, y)
      y += 6

      // Subject if present
      if (email.subject) {
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'italic')
        pdf.setTextColor(71, 85, 105)
        const subjectLines = pdf.splitTextToSize(`Subject: ${email.subject}`, contentWidth)
        pdf.text(subjectLines, margin, y)
        y += subjectLines.length * 5 + 3
      }

      // Body
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(51, 65, 85)
      
      const bodyLines = pdf.splitTextToSize(email.body, contentWidth)
      bodyLines.forEach((line: string) => {
        checkPageBreak(6)
        pdf.text(line, margin, y)
        y += 5
      })

      y += 8
    })
  })

  pdf.save(`copy-structures-${client.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// Main Component
export default function CopywritingEditor({
  client,
  copywriting,
  knowledgeBase,
  fathomCalls = [],
  loading,
  onSave,
}: CopywritingEditorProps) {
  const [activeTab, setActiveTab] = useState<'copy' | 'prompts'>('copy')
  const [localData, setLocalData] = useState<Partial<ClientCopywriting>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerateCopyOpen, setIsGenerateCopyOpen] = useState(false)
  const [isGeneratePromptsOpen, setIsGeneratePromptsOpen] = useState(false)
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false)
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (copywriting) {
      setLocalData(copywriting)
      setHasChanges(false)
    } else {
      setLocalData({ copy_structures: [], clay_prompts: {}, prompt_templates: [] })
    }
  }, [copywriting])

  // Extract all variables from copy structures
  const allVariables = useMemo(() => {
    const vars = new Set<string>()
    localData.copy_structures?.forEach(seq => {
      seq.emails.forEach(email => {
        email.variables?.forEach(v => vars.add(v))
        const matches = email.body.match(/\{\{([^}]+)\}\}/g)
        matches?.forEach(m => vars.add(m.replace(/\{\{|\}\}/g, '').trim()))
      })
    })
    return Array.from(vars).sort()
  }, [localData.copy_structures])

  const existingPromptVars = Object.keys(localData.clay_prompts || {})

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(localData)
    setIsSaving(false)
    setHasChanges(false)
  }

  const handleGenerateCopy = async (callIds: string[]) => {
    setIsGeneratingCopy(true)
    try {
      const selectedCalls = fathomCalls.filter(c => callIds.includes(c.id))
      const transcripts = selectedCalls.map(c => c.transcript || c.summary || '').join('\n\n---\n\n')

      const { data, error } = await supabase.functions.invoke('generate-copy-structures', {
        body: { client, knowledgeBase, transcripts },
      })

      if (error) throw error
      
      if (data?.sequences) {
        const updatedData = {
          ...localData,
          copy_structures: [...(localData.copy_structures || []), ...data.sequences],
          source_call_ids: callIds,
        }
        setLocalData(updatedData)
        // Auto-save after generation
        await onSave(updatedData)
        setHasChanges(false)
      }
      
      setIsGenerateCopyOpen(false)
    } catch (err) {
      console.error('Error generating copy:', err)
      alert('Failed to generate copy structures. Please try again.')
    } finally {
      setIsGeneratingCopy(false)
    }
  }

  const handleGeneratePrompts = async (variables: string[]) => {
    setIsGeneratingPrompts(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-clay-prompts', {
        body: { client, variables, knowledgeBase },
      })

      if (error) throw error
      
      if (data?.prompts) {
        const updatedData = {
          ...localData,
          clay_prompts: { ...(localData.clay_prompts || {}), ...data.prompts },
        }
        setLocalData(updatedData)
        // Auto-save after generation
        await onSave(updatedData)
        setHasChanges(false)
      }
      
      setIsGeneratePromptsOpen(false)
    } catch (err) {
      console.error('Error generating prompts:', err)
      alert('Failed to generate Clay prompts. Please try again.')
    } finally {
      setIsGeneratingPrompts(false)
    }
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      await generateCopyPDF(localData as ClientCopywriting, client)
    } catch (err) {
      console.error('Error exporting PDF:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteSequence = (seqId: string) => {
    setLocalData(prev => ({
      ...prev,
      copy_structures: prev.copy_structures?.filter(s => s.id !== seqId),
    }))
    setHasChanges(true)
  }

  const handleDeletePrompt = (varName: string) => {
    setLocalData(prev => {
      const { [varName]: removed, ...rest } = prev.clay_prompts || {}
      return { ...prev, clay_prompts: rest }
    })
    setHasChanges(true)
  }

  const handleCopyPrompt = (prompt: ClayPrompt) => {
    navigator.clipboard.writeText(prompt.prompt)
  }

  // Handler to update a prompt on a specific email within a sequence
  const handleUpdateEmailPrompt = useCallback((emailId: string, variable: string, prompt: ClayPrompt) => {
    setLocalData(prev => {
      const updatedStructures = prev.copy_structures?.map(seq => ({
        ...seq,
        emails: seq.emails.map(email => {
          if (email.id === emailId) {
            return {
              ...email,
              clay_prompts: {
                ...(email.clay_prompts || {}),
                [variable]: prompt
              }
            }
          }
          return email
        })
      }))
      return { ...prev, copy_structures: updatedStructures }
    })
    setHasChanges(true)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-white/90" />
      </div>
    )
  }

  // Check if Knowledge Base exists
  const hasKnowledgeBase = !!knowledgeBase

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-rillation-bg/80 backdrop-blur-xl border-b border-white/10 -mx-6 px-6 py-4 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Copywriting</h2>
            <p className="text-sm text-white/90 mt-0.5">Email sequences & Clay prompts for {client}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {activeTab === 'copy' ? (
              <button
                onClick={() => setIsGenerateCopyOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                <Sparkles size={16} />
                Generate Copy
              </button>
            ) : (
              <button
                onClick={() => setIsGeneratePromptsOpen(true)}
                disabled={allVariables.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Zap size={16} />
                Generate Prompts
              </button>
            )}
            
            <button
              onClick={handleExportPDF}
              disabled={isExporting || !localData.copy_structures?.length}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              PDF
            </button>
            
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                hasChanges ? 'bg-white text-black hover:bg-white/90' : 'bg-white/5 border border-white/10 text-white/90'
              }`}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {hasChanges ? 'Save' : 'Saved'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 p-1 bg-white/5 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('copy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'copy' ? 'bg-white text-black' : 'text-white/90 hover:text-white'
            }`}
          >
            <Mail size={16} />
            Copy Structures
            {localData.copy_structures?.length ? (
              <span className="ml-1 px-1.5 py-0.5 bg-black/10 rounded text-xs">
                {localData.copy_structures.length}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'prompts' ? 'bg-white text-black' : 'text-white/90 hover:text-white'
            }`}
          >
            <Variable size={16} />
            Clay Prompts
            {existingPromptVars.length ? (
              <span className="ml-1 px-1.5 py-0.5 bg-black/10 rounded text-xs">
                {existingPromptVars.length}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Knowledge Base Warning */}
      {!hasKnowledgeBase && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertCircle size={20} className="text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-amber-200 font-medium">Knowledge Base Required</p>
            <p className="text-xs text-amber-200/70 mt-0.5">
              Generate the Knowledge Base first to enable AI copy generation.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'copy' ? (
        <div className="space-y-4">
          {localData.copy_structures?.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-2xl">
              <FileText size={40} className="mx-auto text-white/20 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Copy Structures Yet</h3>
              <p className="text-sm text-white/80 mb-4">
                Generate email sequences using AI or add them manually.
              </p>
              <button
                onClick={() => setIsGenerateCopyOpen(true)}
                disabled={!hasKnowledgeBase}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                <Sparkles size={16} />
                Generate Copy Structures
              </button>
            </div>
          ) : (
            localData.copy_structures?.map((sequence) => (
              <SequenceCard
                key={sequence.id}
                sequence={sequence}
                onDelete={() => handleDeleteSequence(sequence.id)}
                onUpdateEmailPrompt={handleUpdateEmailPrompt}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Variables summary */}
          {allVariables.length > 0 && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Variable size={16} className="text-white/80" />
                <span className="text-sm font-medium text-white">Variables in Copy</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allVariables.map(v => {
                  const hasPrompt = existingPromptVars.includes(v)
                  return (
                    <span
                      key={v}
                      className={`px-2 py-1 rounded text-xs font-mono ${
                        hasPrompt
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      }`}
                    >
                      {`{{${v}}}`}
                      {hasPrompt && <Check size={12} className="inline ml-1" />}
                    </span>
                  )
                })}
              </div>
              {allVariables.length > existingPromptVars.length && (
                <p className="text-xs text-white/90 mt-2">
                  {allVariables.length - existingPromptVars.length} variables need prompts
                </p>
              )}
            </div>
          )}

          {/* Info about per-email prompts */}
          <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <Code size={18} className="text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-violet-200 font-medium">Prompts are now per-email</p>
                <p className="text-xs text-violet-200/70 mt-1">
                  Each email in your copy structures has its own Clay prompts. Expand any email in the "Copy Structures" tab to view and edit prompts for that specific email.
                </p>
              </div>
            </div>
          </div>

          {/* Prompt Templates Library */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Prompt Templates</h3>
              <span className="text-xs text-white/80">Reusable prompts for common variables</span>
            </div>

            {existingPromptVars.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl">
                <Code size={32} className="mx-auto text-white/20 mb-3" />
                <h3 className="text-sm font-medium text-white mb-1">No Templates Yet</h3>
                <p className="text-xs text-white/90 mb-3">
                  Generate templates for common variables to reuse across emails.
                </p>
                <button
                  onClick={() => setIsGeneratePromptsOpen(true)}
                  disabled={allVariables.length === 0}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  <Zap size={14} />
                  Generate Templates
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {existingPromptVars.map(varName => (
                  <ClayPromptCard
                    key={varName}
                    variableName={varName}
                    prompt={localData.clay_prompts![varName]}
                    onDelete={() => handleDeletePrompt(varName)}
                    onCopy={() => handleCopyPrompt(localData.clay_prompts![varName])}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isGenerateCopyOpen && (
          <GenerateCopyModal
            isOpen={isGenerateCopyOpen}
            onClose={() => setIsGenerateCopyOpen(false)}
            fathomCalls={fathomCalls}
            hasKnowledgeBase={hasKnowledgeBase}
            onGenerate={handleGenerateCopy}
            isGenerating={isGeneratingCopy}
          />
        )}
        {isGeneratePromptsOpen && (
          <GeneratePromptsModal
            isOpen={isGeneratePromptsOpen}
            onClose={() => setIsGeneratePromptsOpen(false)}
            variables={allVariables}
            existingPrompts={existingPromptVars}
            onGenerate={handleGeneratePrompts}
            isGenerating={isGeneratingPrompts}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
