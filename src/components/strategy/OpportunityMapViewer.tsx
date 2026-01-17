import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Download,
  ChevronRight,
  Check,
  X,
  Loader2,
  Map,
  Target,
  Globe,
  ListChecks,
  Award,
} from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { OpportunityMap, FathomCall } from '../../hooks/useClientStrategy'
import { supabase } from '../../lib/supabase'

interface OpportunityMapViewerProps {
  client: string
  opportunityMaps: OpportunityMap[]
  fathomCalls: FathomCall[]
  loading: boolean
  onCreateMap: (map: Partial<OpportunityMap>) => Promise<OpportunityMap | null>
  compact?: boolean
}

interface GenerateModalProps {
  isOpen: boolean
  onClose: () => void
  fathomCalls: FathomCall[]
  onGenerate: (callIds: string[], title: string) => Promise<void>
  isGenerating: boolean
}

function GenerateModal({ isOpen, onClose, fathomCalls, onGenerate, isGenerating }: GenerateModalProps) {
  const [selectedCalls, setSelectedCalls] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('')

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
    await onGenerate(Array.from(selectedCalls), title || 'Opportunity Map')
    setSelectedCalls(new Set())
    setTitle('')
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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rillation-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-rillation-text">Generate Opportunity Map</h2>
              <p className="text-xs text-rillation-text-muted">AI will analyze calls to create the map</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rillation-card-hover rounded-lg">
            <X size={18} className="text-rillation-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-rillation-text mb-2">Map Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Opportunity Map V1"
              className="w-full px-4 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text-muted focus:outline-none focus:border-rillation-text-muted"
            />
          </div>

          {/* Call Selection */}
          <div>
            <label className="block text-sm font-medium text-rillation-text mb-2">
              Select Fathom Calls to Analyze
            </label>
            {fathomCalls.length === 0 ? (
              <div className="text-center py-6 bg-rillation-bg rounded-lg text-sm text-rillation-text-muted">
                No calls available. Add Fathom calls first.
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
                        isSelected
                          ? 'bg-white/10 border border-white/20'
                          : 'bg-rillation-bg hover:bg-rillation-card-hover border border-transparent'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-white border-white' : 'border-rillation-border'
                      }`}>
                        {isSelected && <Check size={12} className="text-black" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-rillation-text truncate">{call.title}</div>
                        <div className="text-xs text-rillation-text-muted">
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-rillation-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-rillation-text-muted hover:text-rillation-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={selectedCalls.size === 0 || isGenerating}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Map
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

interface MapCardProps {
  map: OpportunityMap
  isExpanded: boolean
  onToggle: () => void
  onExportPDF: () => void
  isExporting: boolean
  onRefChange: (el: HTMLDivElement | null) => void
}

function MapCard({ map, isExpanded, onToggle, onExportPDF, isExporting, onRefChange }: MapCardProps) {
  return (
    <div className="bg-rillation-card border border-rillation-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-rillation-card-hover transition-colors text-left"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight size={18} className="text-rillation-text-muted" />
        </motion.div>

        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Map size={20} className="text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-rillation-text">{map.title}</span>
            <span className="text-xs text-rillation-text-muted">v{map.version}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              map.status === 'confirmed' ? 'bg-rillation-green/20 text-rillation-green' :
              map.status === 'archived' ? 'bg-rillation-text-muted/20 text-rillation-text-muted' :
              'bg-rillation-yellow/20 text-rillation-yellow'
            }`}>
              {map.status}
            </span>
          </div>
          <div className="text-xs text-rillation-text-muted mt-0.5">
            {new Date(map.created_at).toLocaleDateString('en-US', { 
              month: 'short', day: 'numeric', year: 'numeric' 
            })}
            {map.generated_by === 'ai' && ' • AI Generated'}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onExportPDF()
          }}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-1.5 bg-rillation-bg text-rillation-text text-xs rounded-lg hover:bg-rillation-card-hover transition-colors disabled:opacity-50"
        >
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          PDF
        </button>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div ref={onRefChange} className="border-t border-rillation-border/50 bg-rillation-bg/30 p-6">
              {/* Opportunity Map Content - Styled for PDF export */}
              <div className="space-y-8">
                {/* Segments */}
                {map.segments && map.segments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Target size={18} className="text-rillation-text" />
                      <h3 className="text-base font-semibold text-rillation-text">Campaign Segments</h3>
                    </div>
                    <div className="grid gap-4">
                      {map.segments.map((segment, i) => (
                        <div key={i} className="bg-rillation-card border border-rillation-border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                              Tier {segment.tier}
                            </span>
                            <h4 className="font-medium text-rillation-text">{segment.name}</h4>
                          </div>
                          {segment.description && (
                            <p className="text-sm text-rillation-text-muted mb-3">{segment.description}</p>
                          )}
                          
                          {segment.pain_points && segment.pain_points.length > 0 && (
                            <div className="mb-3">
                              <span className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide">Pain Points</span>
                              <ul className="mt-1 space-y-1">
                                {segment.pain_points.map((p, j) => (
                                  <li key={j} className="text-sm text-rillation-text flex items-start gap-2">
                                    <span className="text-rillation-text-muted">•</span> {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {segment.value_proposition && (
                            <div className="mb-3">
                              <span className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide">Value Proposition</span>
                              <p className="mt-1 text-sm text-rillation-text">{segment.value_proposition}</p>
                            </div>
                          )}

                          {segment.job_titles && (
                            <div className="grid grid-cols-2 gap-4">
                              {segment.job_titles.primary && segment.job_titles.primary.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide">Primary Buyers</span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {segment.job_titles.primary.map((t, j) => (
                                      <span key={j} className="text-xs px-2 py-0.5 bg-rillation-bg rounded text-rillation-text">{t}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {segment.job_titles.champions && segment.job_titles.champions.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide">Champions</span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {segment.job_titles.champions.map((t, j) => (
                                      <span key={j} className="text-xs px-2 py-0.5 bg-rillation-bg rounded text-rillation-text">{t}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Geographies */}
                {map.geographies && map.geographies.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Globe size={18} className="text-rillation-text" />
                      <h3 className="text-base font-semibold text-rillation-text">Geographies</h3>
                    </div>
                    <div className="bg-rillation-card border border-rillation-border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-rillation-bg/50">
                            <th className="px-4 py-2 text-left text-xs font-medium text-rillation-text-muted uppercase">Tier</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-rillation-text-muted uppercase">Geography</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-rillation-text-muted uppercase">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {map.geographies.map((geo, i) => (
                            <tr key={i} className="border-t border-rillation-border/50">
                              <td className="px-4 py-2 text-sm text-rillation-text">Tier {geo.tier}</td>
                              <td className="px-4 py-2 text-sm text-rillation-text">{geo.geography}</td>
                              <td className="px-4 py-2 text-sm text-rillation-text-muted">{geo.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Social Proof */}
                {map.social_proof && Object.keys(map.social_proof).some(k => (map.social_proof as any)[k]?.length > 0) && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Award size={18} className="text-rillation-text" />
                      <h3 className="text-base font-semibold text-rillation-text">Social Proof</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {map.social_proof.case_studies && map.social_proof.case_studies.length > 0 && (
                        <div className="bg-rillation-card border border-rillation-border rounded-lg p-4">
                          <span className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide">Case Studies</span>
                          <ul className="mt-2 space-y-1">
                            {map.social_proof.case_studies.map((c, i) => (
                              <li key={i} className="text-sm text-rillation-text">• {c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {map.social_proof.testimonials && map.social_proof.testimonials.length > 0 && (
                        <div className="bg-rillation-card border border-rillation-border rounded-lg p-4">
                          <span className="text-xs font-medium text-rillation-text-muted uppercase tracking-wide">Testimonials</span>
                          <ul className="mt-2 space-y-1">
                            {map.social_proof.testimonials.map((t, i) => (
                              <li key={i} className="text-sm text-rillation-text">• {t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {map.next_steps && map.next_steps.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <ListChecks size={18} className="text-rillation-text" />
                      <h3 className="text-base font-semibold text-rillation-text">Next Steps</h3>
                    </div>
                    <div className="bg-rillation-card border border-rillation-border rounded-lg p-4">
                      <ol className="space-y-2">
                        {map.next_steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-rillation-text">
                            <span className="w-6 h-6 rounded-full bg-rillation-bg flex items-center justify-center text-xs font-medium text-rillation-text-muted flex-shrink-0">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function OpportunityMapViewer({
  client,
  opportunityMaps,
  fathomCalls,
  loading,
  onCreateMap,
  compact = false,
}: OpportunityMapViewerProps) {
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const mapRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const handleGenerate = async (callIds: string[], title: string) => {
    setIsGenerating(true)
    
    try {
      // Get transcripts from selected calls
      const selectedCalls = fathomCalls.filter(c => callIds.includes(c.id))
      const transcripts = selectedCalls.map(c => c.transcript || c.summary || '').join('\n\n---\n\n')

      // Call AI generation edge function
      const { data, error } = await supabase.functions.invoke('generate-opportunity-map', {
        body: {
          client,
          title,
          transcripts,
          callIds,
        },
      })

      if (error) throw error

      // Create the opportunity map with AI-generated content
      await onCreateMap({
        title,
        status: 'draft',
        source_call_ids: callIds,
        segments: data?.segments || [],
        geographies: data?.geographies || [],
        company_size_bands: data?.company_size_bands || [],
        revenue_bands: data?.revenue_bands || [],
        social_proof: data?.social_proof || {},
        campaign_architecture: data?.campaign_architecture || {},
        events_conferences: data?.events_conferences || [],
        next_steps: data?.next_steps || [],
        content_json: data || {},
        generated_by: 'ai',
        ai_model: 'claude-3-5-sonnet',
      })

      setIsGenerateModalOpen(false)
    } catch (err) {
      console.error('Error generating opportunity map:', err)
      // Fallback: create empty map for manual editing
      await onCreateMap({
        title,
        status: 'draft',
        source_call_ids: callIds,
        segments: [],
        geographies: [],
        generated_by: 'manual',
      })
      setIsGenerateModalOpen(false)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportPDF = async (mapId: string) => {
    const mapRef = mapRefs.current[mapId]
    if (!mapRef) return

    setExportingId(mapId)
    
    try {
      const canvas = await html2canvas(mapRef, {
        backgroundColor: '#141414',
        scale: 2,
        logging: false,
        useCORS: true,
      })
      
      // Get canvas dimensions
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      
      // Create PDF with proper dimensions (A4 or auto-sized)
      const pdfWidth = 210 // A4 width in mm
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth
      
      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      })
      
      // Add the image to PDF
      const imgData = canvas.toDataURL('image/png')
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      
      // Download the PDF
      pdf.save(`opportunity-map-${client}-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Error exporting PDF:', err)
    } finally {
      setExportingId(null)
    }
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
            <h2 className="text-lg font-semibold text-rillation-text">Opportunity Maps</h2>
            <p className="text-sm text-rillation-text-muted mt-0.5">
              AI-generated strategy documents for {client}
            </p>
          </div>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <Sparkles size={16} />
            Generate Map
          </button>
        </div>
      )}

      {/* Map List */}
      {opportunityMaps.length === 0 ? (
        <div className={`text-center bg-rillation-card border border-rillation-border rounded-xl ${compact ? 'py-8' : 'py-16'}`}>
          <div className={`mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}>
            <Map size={compact ? 20 : 32} className="text-purple-400" />
          </div>
          <h3 className="text-sm font-medium text-rillation-text mb-1">No opportunity maps yet</h3>
          <p className="text-xs text-rillation-text-muted mb-3 max-w-sm mx-auto">
            Generate your first map from Fathom calls using AI.
          </p>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-lg hover:opacity-90"
          >
            <Sparkles size={14} />
            Generate Map
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {opportunityMaps.map((map) => (
            <MapCard
              key={map.id}
              map={map}
              isExpanded={expandedMapId === map.id}
              onToggle={() => setExpandedMapId(expandedMapId === map.id ? null : map.id)}
              onExportPDF={() => handleExportPDF(map.id)}
              isExporting={exportingId === map.id}
              onRefChange={(el) => { mapRefs.current[map.id] = el }}
            />
          ))}
        </div>
      )}

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
