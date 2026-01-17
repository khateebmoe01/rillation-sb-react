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
  Trash2,
  Plus,
  Building2,
  Calendar,
  Settings,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import type { OpportunityMap, FathomCall } from '../../hooks/useClientStrategy'
import { supabase } from '../../lib/supabase'

interface OpportunityMapViewerProps {
  client: string
  opportunityMaps: OpportunityMap[]
  fathomCalls: FathomCall[]
  loading: boolean
  onCreateMap: (map: Partial<OpportunityMap>) => Promise<OpportunityMap | null>
  onDeleteMap?: (id: string) => Promise<boolean>
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
              <h2 className="text-lg font-semibold text-white">Generate Opportunity Map</h2>
              <p className="text-xs text-white/60">AI will analyze calls to create the map</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X size={18} className="text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Map Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Opportunity Map V1"
              className="w-full px-4 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
            />
          </div>

          {/* Call Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Select Fathom Calls to Analyze
            </label>
            {fathomCalls.length === 0 ? (
              <div className="text-center py-6 bg-rillation-bg rounded-lg text-sm text-white/60">
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
                        <div className="text-xs text-white/50">
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
            className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
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

// Normalize old data format for PDF generation
function normalizeMapDataForPDF(rawData: any) {
  if (!rawData) return {}
  
  const data = { ...rawData }
  
  // Handle old 'segments' format -> convert to tier1_segments/tier2_segments
  if (data.segments && !data.tier1_segments) {
    data.tier1_segments = data.segments.filter((s: any) => s.tier === 1).map((s: any) => ({
      name: s.name,
      description: s.description,
      pain_points: s.pain_points,
      value_proposition: s.value_proposition,
      job_titles: s.job_titles ? {
        primary_buyers: s.job_titles.primary || s.job_titles.primary_buyers || [],
        champions: s.job_titles.champions || [],
      } : undefined,
      signals: s.signals,
    }))
    data.tier2_segments = data.segments.filter((s: any) => s.tier === 2).map((s: any) => ({
      name: s.name,
      description: s.description,
      pain_points: s.pain_points,
      value_proposition: s.value_proposition,
      job_titles: s.job_titles ? {
        primary_buyers: s.job_titles.primary || s.job_titles.primary_buyers || [],
        champions: s.job_titles.champions || [],
      } : undefined,
      signals: s.signals,
    }))
  }
  
  // Handle old geographies array format -> convert to tiered object
  if (Array.isArray(data.geographies)) {
    const oldGeos = data.geographies
    data.geographies = {
      tier1: oldGeos.filter((g: any) => g.tier === 1),
      tier2: oldGeos.filter((g: any) => g.tier === 2),
      tier3: oldGeos.filter((g: any) => g.tier === 3),
      deprioritized: [],
      off_limits: [],
    }
  }
  
  return data
}

// PDF Generation Function - Creates a professional document-style PDF
function generatePDF(map: OpportunityMap, client: string) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })
  
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
  pdf.text('OPPORTUNITY MAP', pageWidth / 2, 60, { align: 'center' })
  
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'normal')
  pdf.text(client, pageWidth / 2, 75, { align: 'center' })
  
  pdf.setFontSize(12)
  pdf.text(map.title || 'Strategy Document', pageWidth / 2, 85, { align: 'center' })
  pdf.text(new Date(map.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), pageWidth / 2, 95, { align: 'center' })
  
  // Start content on new page
  pdf.addPage()
  y = margin
  
  // Normalize data for backwards compatibility
  const rawData = map.content_json || {}
  const data = normalizeMapDataForPDF(rawData)
  
  // Helper functions
  const addSectionHeader = (title: string, sectionNumber?: number) => {
    checkPageBreak(15)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    const text = sectionNumber ? `${sectionNumber}. ${title}` : title
    pdf.text(text, margin, y)
    y += 8
    // Add line
    pdf.setDrawColor(200, 200, 200)
    pdf.line(margin, y, pageWidth - margin, y)
    y += 6
  }
  
  const addSubsectionHeader = (title: string) => {
    checkPageBreak(12)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text(title, margin, y)
    y += 6
  }
  
  const addParagraph = (text: string) => {
    checkPageBreak(10)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const lines = pdf.splitTextToSize(text, contentWidth)
    pdf.text(lines, margin, y)
    y += lines.length * 5 + 4
  }
  
  const addBulletList = (items: string[]) => {
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
  
  // Section 1: How We Operate
  if (data.how_we_operate) {
    addSectionHeader('How We Operate', 1)
    addParagraph("Before we dive into the strategy, here's how our campaigns work:")
    y += 4
    
    if (data.how_we_operate.tracking) {
      addSubsectionHeader('Everything In Is Tracked, Everything Out Is Tracked')
      addParagraph(data.how_we_operate.tracking)
    }
    
    if (data.how_we_operate.segmentation) {
      addSubsectionHeader('Industry-First Segmentation')
      addParagraph(data.how_we_operate.segmentation)
    }
    
    if (data.how_we_operate.test_then_scale) {
      addSubsectionHeader('Test-Then-Scale')
      addParagraph(data.how_we_operate.test_then_scale)
    }
    
    if (data.how_we_operate.tracking_variables?.length > 0) {
      addSubsectionHeader('Tracking Variables (Defined Upfront)')
      addBulletList(data.how_we_operate.tracking_variables)
    }
    y += 6
  }
  
  // Section 2: Tier 1 Campaign Segments
  if (data.tier1_segments?.length > 0) {
    addSectionHeader('Tier 1 Campaign Segments', 2)
    
    data.tier1_segments.forEach((segment: any, index: number) => {
      checkPageBreak(40)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Segment ${index + 1}: ${segment.name}`, margin, y)
      y += 5
      
      if (segment.description) {
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'italic')
        const descLines = pdf.splitTextToSize(segment.description, contentWidth)
        pdf.text(descLines, margin, y)
        y += descLines.length * 5 + 4
      }
      
      if (segment.pain_points?.length > 0) {
        addSubsectionHeader('The Pain')
        addBulletList(segment.pain_points)
      }
      
      if (segment.value_proposition) {
        addSubsectionHeader('The Value Proposition')
        addParagraph(segment.value_proposition)
      }
      
      if (segment.job_titles) {
        addSubsectionHeader('Job Titles to Target')
        if (segment.job_titles.primary_buyers?.length > 0) {
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'bold')
          pdf.text('Primary Buyers (Decision Makers)', margin, y)
          y += 5
          addBulletList(segment.job_titles.primary_buyers)
        }
        if (segment.job_titles.champions?.length > 0) {
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'bold')
          pdf.text('Champions / Influencers', margin, y)
          y += 5
          addBulletList(segment.job_titles.champions)
        }
      }
      
      if (segment.signals?.length > 0) {
        addSubsectionHeader('Potential Signals (To Validate)')
        addBulletList(segment.signals)
      }
      
      y += 6
    })
  }
  
  // Section 3: Tier 2 Campaign Segments
  if (data.tier2_segments?.length > 0) {
    addSectionHeader('Tier 2 Campaign Segments', 3)
    
    data.tier2_segments.forEach((segment: any, index: number) => {
      checkPageBreak(30)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Segment ${index + 1}: ${segment.name}`, margin, y)
      y += 5
      
      if (segment.description) {
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'italic')
        const descLines = pdf.splitTextToSize(segment.description, contentWidth)
        pdf.text(descLines, margin, y)
        y += descLines.length * 5 + 4
      }
      
      if (segment.pain_points?.length > 0) {
        addSubsectionHeader('The Pain')
        addBulletList(segment.pain_points)
      }
      
      if (segment.value_proposition) {
        addSubsectionHeader('The Value Proposition')
        addParagraph(segment.value_proposition)
      }
      
      y += 4
    })
  }
  
  // Section 4: Geographies
  if (data.geographies) {
    addSectionHeader('Geographies', 4)
    addParagraph('All campaigns include all approved geographies. We track performance by geography to identify where to focus.')
    y += 4
    
    const addGeoList = (title: string, geos: any[]) => {
      if (geos?.length > 0) {
        addSubsectionHeader(title)
        geos.forEach((geo) => {
          checkPageBreak(8)
          pdf.setFontSize(10)
          pdf.setFont('helvetica', 'normal')
          const geoName = geo.geography || geo
          const reason = geo.reason || ''
          const text = reason ? `${geoName} - ${reason}` : geoName
          const lines = pdf.splitTextToSize(`• ${text}`, contentWidth - 5)
          pdf.text(lines, margin + 3, y)
          y += lines.length * 5 + 2
        })
        y += 4
      }
    }
    
    addGeoList('Tier 1: Registered + Not Price Sensitive + Strategic Priority', data.geographies.tier1)
    addGeoList('Tier 2: Registered + Good Potential', data.geographies.tier2)
    addGeoList('Tier 3: Can Sell + Less Certain', data.geographies.tier3)
    addGeoList('Deprioritized', data.geographies.deprioritized)
    
    if (data.geographies.off_limits?.length > 0) {
      addSubsectionHeader('Off Limits')
      addParagraph(data.geographies.off_limits.join(', '))
    }
  }
  
  // Section 5: Company Size & Revenue
  if (data.company_tracking) {
    addSectionHeader('Company Size & Revenue Tracking', 5)
    addParagraph('We will track responses by company size to identify patterns in who converts best.')
    y += 4
    
    if (data.company_tracking.employee_size_bands?.length > 0) {
      addSubsectionHeader('Employee Size Bands')
      addBulletList(data.company_tracking.employee_size_bands)
    }
    
    if (data.company_tracking.revenue_bands?.length > 0) {
      addSubsectionHeader('Revenue Bands (Where Available)')
      addBulletList(data.company_tracking.revenue_bands)
    }
  }
  
  // Section 6: Social Proof
  if (data.social_proof) {
    addSectionHeader('Social Proof Inventory', 6)
    
    const proofSections = [
      { key: 'case_studies', label: 'Case Studies' },
      { key: 'testimonials', label: 'Testimonials' },
      { key: 'publications', label: 'Publications' },
      { key: 'certifications', label: 'Certifications' },
      { key: 'pilots', label: 'Notable Pilots' },
      { key: 'data_points', label: 'Known Data Points' },
    ]
    
    proofSections.forEach(({ key, label }) => {
      const items = data.social_proof[key]
      if (items?.length > 0) {
        addSubsectionHeader(label)
        addBulletList(items)
      }
    })
  }
  
  // Section 7: Campaign Architecture
  if (data.campaign_architecture) {
    addSectionHeader('Campaign Architecture', 7)
    
    const arch = data.campaign_architecture
    if (arch.monthly_volume) {
      addParagraph(`Volume: ${arch.monthly_volume.toLocaleString()} emails/month = ${(arch.unique_prospects_per_month || arch.monthly_volume / 3).toLocaleString()} unique prospects (${arch.emails_per_prospect || 2}-3 emails per prospect per quarter)`)
    }
    if (arch.segment_distribution) {
      addParagraph(`Segment Distribution: ${arch.segment_distribution}`)
    }
    
    if (arch.monthly_plan?.length > 0) {
      y += 4
      addSubsectionHeader('Month-by-Month Plan')
      arch.monthly_plan.forEach((month: any) => {
        checkPageBreak(8)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`Month ${month.month}:`, margin, y)
        pdf.setFont('helvetica', 'normal')
        const focusLines = pdf.splitTextToSize(month.focus, contentWidth - 25)
        pdf.text(focusLines, margin + 25, y)
        y += focusLines.length * 5 + 3
      })
    }
  }
  
  // Section 8: Events & Conferences
  if (data.events_conferences?.length > 0) {
    addSectionHeader('Events & Conferences', 8)
    data.events_conferences.forEach((event: any) => {
      checkPageBreak(8)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const eventText = event.event + (event.date ? ` (${event.date})` : '') + (event.notes ? ` - ${event.notes}` : '')
      const lines = pdf.splitTextToSize(`• ${eventText}`, contentWidth - 5)
      pdf.text(lines, margin + 3, y)
      y += lines.length * 5 + 2
    })
  }
  
  // Section 9: Next Steps
  if (data.next_steps?.length > 0) {
    addSectionHeader('Next Steps', 9)
    data.next_steps.forEach((step: any) => {
      checkPageBreak(10)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const action = typeof step === 'string' ? step : step.action
      const owner = typeof step === 'object' && step.owner ? ` (${step.owner})` : ''
      const deadline = typeof step === 'object' && step.deadline ? ` - ${step.deadline}` : ''
      const text = `${action}${owner}${deadline}`
      const lines = pdf.splitTextToSize(`• ${text}`, contentWidth - 5)
      pdf.text(lines, margin + 3, y)
      y += lines.length * 5 + 2
    })
  }
  
  // Save the PDF
  pdf.save(`opportunity-map-${client.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`)
}

interface MapCardProps {
  map: OpportunityMap
  client: string
  isExpanded: boolean
  onToggle: () => void
  onExportPDF: () => void
  onDelete: () => void
  isExporting: boolean
  isDeleting: boolean
}

// Normalize old data format to new format for backwards compatibility
function normalizeMapData(rawData: any) {
  if (!rawData) return {}
  
  const data = { ...rawData }
  
  // Handle old 'segments' format -> convert to tier1_segments/tier2_segments
  if (data.segments && !data.tier1_segments) {
    data.tier1_segments = data.segments.filter((s: any) => s.tier === 1).map((s: any) => ({
      name: s.name,
      description: s.description,
      pain_points: s.pain_points,
      value_proposition: s.value_proposition,
      job_titles: s.job_titles ? {
        primary_buyers: s.job_titles.primary || s.job_titles.primary_buyers || [],
        champions: s.job_titles.champions || [],
      } : undefined,
      signals: s.signals,
    }))
    data.tier2_segments = data.segments.filter((s: any) => s.tier === 2).map((s: any) => ({
      name: s.name,
      description: s.description,
      pain_points: s.pain_points,
      value_proposition: s.value_proposition,
      job_titles: s.job_titles ? {
        primary_buyers: s.job_titles.primary || s.job_titles.primary_buyers || [],
        champions: s.job_titles.champions || [],
      } : undefined,
      signals: s.signals,
    }))
  }
  
  // Handle old geographies array format -> convert to tiered object
  if (Array.isArray(data.geographies)) {
    const oldGeos = data.geographies
    data.geographies = {
      tier1: oldGeos.filter((g: any) => g.tier === 1),
      tier2: oldGeos.filter((g: any) => g.tier === 2),
      tier3: oldGeos.filter((g: any) => g.tier === 3),
      deprioritized: [],
      off_limits: [],
    }
  }
  
  return data
}

function MapCard({ map, client, isExpanded, onToggle, onExportPDF, onDelete, isExporting, isDeleting }: MapCardProps) {
  const data = normalizeMapData(map.content_json)
  
  return (
    <div className="bg-rillation-card border border-rillation-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors text-left"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight size={18} className="text-white/60" />
        </motion.div>

        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Map size={20} className="text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">{map.title}</span>
            <span className="text-xs text-white/50">v{map.version}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              map.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
              map.status === 'archived' ? 'bg-white/10 text-white/50' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {map.status}
            </span>
          </div>
          <div className="text-xs text-white/50 mt-0.5">
            {new Date(map.created_at).toLocaleDateString('en-US', { 
              month: 'short', day: 'numeric', year: 'numeric' 
            })}
            {map.generated_by === 'ai' && ' • AI Generated'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onExportPDF()
            }}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 text-white text-xs rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            PDF
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Are you sure you want to delete this opportunity map?')) {
                onDelete()
              }
            }}
            disabled={isDeleting}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 text-xs rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
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
            <div className="border-t border-white/10 bg-black/20 p-6">
              <div className="space-y-8">
                
                {/* How We Operate */}
                {data.how_we_operate && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Settings size={18} className="text-white" />
                      <h3 className="text-base font-semibold text-white">1. How We Operate</h3>
                    </div>
                    <div className="space-y-4 pl-6">
                      {data.how_we_operate.tracking && (
                        <div>
                          <h4 className="text-sm font-medium text-white mb-1">Everything In Is Tracked, Everything Out Is Tracked</h4>
                          <p className="text-sm text-white/70">{data.how_we_operate.tracking}</p>
                        </div>
                      )}
                      {data.how_we_operate.segmentation && (
                        <div>
                          <h4 className="text-sm font-medium text-white mb-1">Industry-First Segmentation</h4>
                          <p className="text-sm text-white/70">{data.how_we_operate.segmentation}</p>
                        </div>
                      )}
                      {data.how_we_operate.test_then_scale && (
                        <div>
                          <h4 className="text-sm font-medium text-white mb-1">Test-Then-Scale</h4>
                          <p className="text-sm text-white/70">{data.how_we_operate.test_then_scale}</p>
                        </div>
                      )}
                      {data.how_we_operate.tracking_variables?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-white mb-2">Tracking Variables</h4>
                          <div className="flex flex-wrap gap-2">
                            {data.how_we_operate.tracking_variables.map((v: string, i: number) => (
                              <span key={i} className="text-xs px-2 py-1 bg-white/10 rounded text-white">{v}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tier 1 Segments */}
                {data.tier1_segments?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Target size={18} className="text-white" />
                      <h3 className="text-base font-semibold text-white">2. Tier 1 Campaign Segments</h3>
                    </div>
                    <div className="grid gap-4">
                      {data.tier1_segments.map((segment: any, i: number) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Tier 1</span>
                            <h4 className="font-medium text-white">{segment.name}</h4>
                          </div>
                          {segment.description && (
                            <p className="text-sm text-white/60 mb-3 italic">{segment.description}</p>
                          )}
                          
                          {segment.pain_points?.length > 0 && (
                            <div className="mb-3">
                              <span className="text-xs font-medium text-white/50 uppercase tracking-wide">The Pain</span>
                              <ul className="mt-1 space-y-1">
                                {segment.pain_points.map((p: string, j: number) => (
                                  <li key={j} className="text-sm text-white flex items-start gap-2">
                                    <span className="text-white/40">•</span> {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {segment.value_proposition && (
                            <div className="mb-3">
                              <span className="text-xs font-medium text-white/50 uppercase tracking-wide">The Value Proposition</span>
                              <p className="mt-1 text-sm text-white">{segment.value_proposition}</p>
                            </div>
                          )}

                          {segment.job_titles && (
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              {segment.job_titles.primary_buyers?.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Primary Buyers</span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {segment.job_titles.primary_buyers.map((t: string, j: number) => (
                                      <span key={j} className="text-xs px-2 py-0.5 bg-white/10 rounded text-white">{t}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {segment.job_titles.champions?.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Champions</span>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {segment.job_titles.champions.map((t: string, j: number) => (
                                      <span key={j} className="text-xs px-2 py-0.5 bg-white/10 rounded text-white">{t}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {segment.signals?.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Potential Signals</span>
                              <ul className="mt-1 space-y-1">
                                {segment.signals.map((s: string, j: number) => (
                                  <li key={j} className="text-sm text-white flex items-start gap-2">
                                    <span className="text-white/40">•</span> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tier 2 Segments */}
                {data.tier2_segments?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Target size={18} className="text-white" />
                      <h3 className="text-base font-semibold text-white">3. Tier 2 Campaign Segments</h3>
                    </div>
                    <div className="grid gap-4">
                      {data.tier2_segments.map((segment: any, i: number) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded">Tier 2</span>
                            <h4 className="font-medium text-white">{segment.name}</h4>
                          </div>
                          {segment.description && (
                            <p className="text-sm text-white/60">{segment.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Geographies */}
                {data.geographies && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Globe size={18} className="text-white" />
                      <h3 className="text-base font-semibold text-white">4. Geographies</h3>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-white/5">
                            <th className="px-4 py-2 text-left text-xs font-medium text-white/50 uppercase">Tier</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-white/50 uppercase">Geography</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-white/50 uppercase">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['tier1', 'tier2', 'tier3'].map((tierKey) => 
                            data.geographies[tierKey]?.map((geo: any, i: number) => (
                              <tr key={`${tierKey}-${i}`} className="border-t border-white/5">
                                <td className="px-4 py-2 text-sm text-white">{tierKey.replace('tier', 'Tier ')}</td>
                                <td className="px-4 py-2 text-sm text-white">{geo.geography}</td>
                                <td className="px-4 py-2 text-sm text-white/60">{geo.reason}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Company Size & Revenue */}
                {data.company_tracking && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Building2 size={18} className="text-white" />
                      <h3 className="text-base font-semibold text-white">5. Company Size & Revenue Tracking</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {data.company_tracking.employee_size_bands?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Employee Size Bands</span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {data.company_tracking.employee_size_bands.map((b: string, i: number) => (
                              <span key={i} className="text-xs px-2 py-1 bg-white/10 rounded text-white">{b}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {data.company_tracking.revenue_bands?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Revenue Bands</span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {data.company_tracking.revenue_bands.map((b: string, i: number) => (
                              <span key={i} className="text-xs px-2 py-1 bg-white/10 rounded text-white">{b}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Proof */}
                {data.social_proof && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Award size={18} className="text-white" />
                      <h3 className="text-base font-semibold text-white">6. Social Proof Inventory</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(data.social_proof).map(([key, items]) => {
                        if (!Array.isArray(items) || items.length === 0) return null
                        const labels: Record<string, string> = {
                          case_studies: 'Case Studies',
                          testimonials: 'Testimonials',
                          publications: 'Publications',
                          certifications: 'Certifications',
                          pilots: 'Notable Pilots',
                          data_points: 'Known Data Points',
                        }
                        return (
                          <div key={key} className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <span className="text-xs font-medium text-white/50 uppercase tracking-wide">{labels[key] || key}</span>
                            <ul className="mt-2 space-y-1">
                              {(items as string[]).map((item, i) => (
                                <li key={i} className="text-sm text-white">• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Campaign Architecture */}
                {data.campaign_architecture && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar size={18} className="text-white" />
                      <h3 className="text-base font-semibold text-white">7. Campaign Architecture</h3>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                      {data.campaign_architecture.monthly_volume && (
                        <p className="text-sm text-white">
                          <strong>Volume:</strong> {data.campaign_architecture.monthly_volume.toLocaleString()} emails/month
                        </p>
                      )}
                      {data.campaign_architecture.segment_distribution && (
                        <p className="text-sm text-white">
                          <strong>Segment Distribution:</strong> {data.campaign_architecture.segment_distribution}
                        </p>
                      )}
                      {data.campaign_architecture.monthly_plan?.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-white/50 uppercase tracking-wide">Monthly Plan</span>
                          <ul className="mt-2 space-y-2">
                            {data.campaign_architecture.monthly_plan.map((m: any, i: number) => (
                              <li key={i} className="text-sm text-white">
                                <strong>Month {m.month}:</strong> {m.focus}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {data.next_steps?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <ListChecks size={18} className="text-white" />
                      <h3 className="text-base font-semibold text-white">9. Next Steps</h3>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <ol className="space-y-2">
                        {data.next_steps.map((step: any, i: number) => {
                          const action = typeof step === 'string' ? step : step.action
                          const owner = typeof step === 'object' && step.owner ? ` (${step.owner})` : ''
                          return (
                            <li key={i} className="flex items-start gap-3 text-sm text-white">
                              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/60 flex-shrink-0">
                                {i + 1}
                              </span>
                              {action}{owner}
                            </li>
                          )
                        })}
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
  onDeleteMap,
  compact = false,
}: OpportunityMapViewerProps) {
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
        content_json: data || {},
        generated_by: 'ai',
        ai_model: 'claude-sonnet-4',
      })

      setIsGenerateModalOpen(false)
    } catch (err) {
      console.error('Error generating opportunity map:', err)
      // Fallback: create empty map for manual editing
      await onCreateMap({
        title,
        status: 'draft',
        source_call_ids: callIds,
        content_json: {},
        generated_by: 'manual',
      })
      setIsGenerateModalOpen(false)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportPDF = async (map: OpportunityMap) => {
    setExportingId(map.id)
    
    try {
      generatePDF(map, client)
    } catch (err) {
      console.error('Error exporting PDF:', err)
    } finally {
      setExportingId(null)
    }
  }

  const handleDelete = async (mapId: string) => {
    if (!onDeleteMap) return
    
    setDeletingId(mapId)
    try {
      await onDeleteMap(mapId)
      if (expandedMapId === mapId) {
        setExpandedMapId(null)
      }
    } catch (err) {
      console.error('Error deleting map:', err)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-white/50" />
      </div>
    )
  }

  return (
    <div className={compact ? "space-y-3" : "p-6 space-y-6"}>
      {/* Header with Generate Button - Always Visible */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Opportunity Maps</h2>
            <p className="text-sm text-white/50 mt-0.5">
              AI-generated strategy documents for {client}
            </p>
          </div>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Generate New Map
          </button>
        </div>
      )}

      {/* Compact mode - Generate button */}
      {compact && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            Generate New Map
          </button>
        </div>
      )}

      {/* Map List */}
      {opportunityMaps.length === 0 ? (
        <div className={`text-center bg-white/5 border border-white/10 rounded-xl ${compact ? 'py-8' : 'py-16'}`}>
          <div className={`mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}>
            <Map size={compact ? 20 : 32} className="text-purple-400" />
          </div>
          <h3 className="text-sm font-medium text-white mb-1">No opportunity maps yet</h3>
          <p className="text-xs text-white/50 mb-3 max-w-sm mx-auto">
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
              client={client}
              isExpanded={expandedMapId === map.id}
              onToggle={() => setExpandedMapId(expandedMapId === map.id ? null : map.id)}
              onExportPDF={() => handleExportPDF(map)}
              onDelete={() => handleDelete(map.id)}
              isExporting={exportingId === map.id}
              isDeleting={deletingId === map.id}
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
