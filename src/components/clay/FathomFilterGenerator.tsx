import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Phone,
  FileText,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit3,
  Send,
  RotateCcw,
  Brain,
  Building2,
  Users,
  MapPin,
  Search,
  Calendar,
  Hash,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClayFilterGeneration } from '../../hooks/useClayFilterGeneration'
import type { ClayCompanySearchFilters } from '../../types/database'
import ChipSelect from './ChipSelect'
import TagInput from './TagInput'
import NumberInput from './NumberInput'
import MultiSelectDropdown from './MultiSelectDropdown'
import CollapsibleSection from './CollapsibleSection'

// Import industries from JSON
import industriesData from '../../../clay-automation/api-docs/filter-options/industries.json'

// Valid size options
const COMPANY_SIZES = [
  'Self-employed',
  '2-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1,000 employees',
  '1,001-5,000 employees',
  '5,001-10,000 employees',
  '10,001+ employees',
]

const COMMON_COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
]

interface FathomCall {
  id: string
  client: string
  title: string
  call_date?: string
  transcript?: string
  summary?: string
  call_type: string
}

interface FathomFilterGeneratorProps {
  client?: string
  onSuccess?: (tableId: string, recordsImported: number) => void
  className?: string
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 30 }
  },
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.25, ease: 'easeOut' },
}

// Skeleton component for loading states
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
  )
}

// Filter summary badge component
function FilterBadge({
  icon: Icon,
  label,
  count
}: {
  icon: React.ElementType
  label: string
  count: number
}) {
  if (count === 0) return null

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full"
    >
      <Icon size={12} className="text-rillation-text/70" />
      <span className="text-xs text-rillation-text">{label}</span>
      <span className="text-xs font-medium text-rillation-text bg-white/10 px-1.5 rounded-full">
        {count}
      </span>
    </motion.div>
  )
}

export default function FathomFilterGenerator({
  client,
  onSuccess,
  className = '',
}: FathomFilterGeneratorProps) {
  const [fathomCalls, setFathomCalls] = useState<FathomCall[]>([])
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [directTranscript, setDirectTranscript] = useState('')
  const [inputMode, setInputMode] = useState<'select' | 'paste'>('select')
  const [isLoadingCalls, setIsLoadingCalls] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [tableName, setTableName] = useState('')

  const {
    isGenerating,
    isSubmitting,
    generatedFilter,
    error,
    generateFilters,
    updateFilters,
    saveEdits,
    submitToClay,
    reset,
  } = useClayFilterGeneration()

  // Calculate active filter counts for badges
  const filterCounts = useMemo(() => {
    if (!generatedFilter?.filters) return { industries: 0, sizes: 0, countries: 0, keywords: 0, total: 0 }

    const filters = generatedFilter.filters
    const industries = filters.industries?.length || 0
    const sizes = filters.sizes?.length || 0
    const countries = filters.country_names?.length || 0
    const keywords = filters.description_keywords?.length || 0

    return {
      industries,
      sizes,
      countries,
      keywords,
      total: industries + sizes + countries + keywords,
    }
  }, [generatedFilter?.filters])

  // Load Fathom calls for this client
  useEffect(() => {
    async function loadCalls() {
      if (!client) return
      setIsLoadingCalls(true)

      const { data, error } = await supabase
        .from('client_fathom_calls')
        .select('id, client, title, call_date, summary, call_type')
        .eq('client', client)
        .order('call_date', { ascending: false })
        .limit(20)

      if (!error && data) {
        setFathomCalls(data as FathomCall[])
      }
      setIsLoadingCalls(false)
    }
    loadCalls()
  }, [client])

  const handleGenerate = async () => {
    if (inputMode === 'select' && selectedCallId) {
      await generateFilters({ fathom_call_id: selectedCallId })
    } else if (inputMode === 'paste' && directTranscript.trim()) {
      await generateFilters({ transcript: directTranscript, client: client || 'Unknown' })
    }
    setShowFilters(true)
  }

  const handleSubmit = async () => {
    // Save any edits first
    if (generatedFilter?.id !== 'local') {
      await saveEdits()
    }

    const result = await submitToClay(tableName || undefined)
    if (result?.success && onSuccess) {
      onSuccess(result.table_id, result.records_imported)
    }
  }

  const updateFilter = <K extends keyof ClayCompanySearchFilters>(
    key: K,
    value: ClayCompanySearchFilters[K]
  ) => {
    updateFilters({ [key]: value } as Partial<ClayCompanySearchFilters>)
  }

  const selectedCall = fathomCalls.find(c => c.id === selectedCallId)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="p-2.5 bg-purple-500/20 rounded-xl"
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Brain size={22} className="text-purple-400" />
        </motion.div>
        <div>
          <h2 className="text-lg font-semibold text-rillation-text">
            Generate Clay Filters from Fathom Call
          </h2>
          <p className="text-sm text-rillation-text/70">
            AI analyzes call transcripts to create optimal Find Companies filters
          </p>
        </div>
      </motion.div>

      {/* Input Mode Toggle */}
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <motion.button
          type="button"
          onClick={() => setInputMode('select')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            inputMode === 'select'
              ? 'bg-white text-black shadow-lg shadow-white/10'
              : 'bg-rillation-card border border-rillation-border text-rillation-text hover:border-white/30'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Phone size={16} />
          Select Call
        </motion.button>
        <motion.button
          type="button"
          onClick={() => setInputMode('paste')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            inputMode === 'paste'
              ? 'bg-white text-black shadow-lg shadow-white/10'
              : 'bg-rillation-card border border-rillation-border text-rillation-text hover:border-white/30'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FileText size={16} />
          Paste Transcript
        </motion.button>
      </motion.div>

      {/* Call Selector */}
      <AnimatePresence mode="wait">
        {inputMode === 'select' && (
          <motion.div
            key="select"
            {...fadeInUp}
            className="bg-rillation-card border border-rillation-border rounded-xl overflow-hidden"
          >
            <div className="p-4 border-b border-rillation-border/50">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-rillation-text">
                  Select a Fathom Call
                </label>
                {selectedCall && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs"
                  >
                    <CheckCircle2 size={12} />
                    Selected
                  </motion.span>
                )}
              </div>
            </div>

            <div className="p-4 max-h-[320px] overflow-y-auto">
              {isLoadingCalls ? (
                <motion.div
                  className="space-y-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {[1, 2, 3, 4].map(i => (
                    <motion.div key={i} variants={itemVariants}>
                      <Skeleton className="h-16" />
                    </motion.div>
                  ))}
                </motion.div>
              ) : fathomCalls.length === 0 ? (
                <motion.div
                  className="text-center py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Phone size={32} className="mx-auto text-rillation-text/30 mb-3" />
                  <p className="text-sm text-rillation-text/70 mb-3">
                    No Fathom calls found for {client || 'this client'}
                  </p>
                  <motion.button
                    type="button"
                    onClick={() => setInputMode('paste')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-rillation-text text-xs font-medium rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FileText size={14} />
                    Paste a transcript instead
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  className="space-y-2"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {fathomCalls.map(call => (
                    <motion.button
                      key={call.id}
                      type="button"
                      variants={itemVariants}
                      onClick={() => setSelectedCallId(call.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all duration-200 ${
                        selectedCallId === call.id
                          ? 'bg-white/10 border-2 border-white/30 shadow-lg shadow-white/5'
                          : 'bg-rillation-bg border-2 border-transparent hover:border-rillation-border hover:bg-white/5'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          selectedCallId === call.id
                            ? 'bg-white/20'
                            : 'bg-rillation-card'
                        }`}>
                          <Phone size={16} className="text-rillation-text/70" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-rillation-text">{call.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {call.call_date && (
                              <span className="flex items-center gap-1 text-xs text-rillation-text/50">
                                <Calendar size={10} />
                                {new Date(call.call_date).toLocaleDateString()}
                              </span>
                            )}
                            <span className="text-xs text-rillation-text/50 px-1.5 py-0.5 bg-white/5 rounded">
                              {call.call_type}
                            </span>
                          </div>
                        </div>
                      </div>
                      <AnimatePresence>
                        {selectedCallId === call.id && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                          >
                            <CheckCircle2 size={20} className="text-green-400" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Transcript Paste */}
        {inputMode === 'paste' && (
          <motion.div
            key="paste"
            {...fadeInUp}
            className="bg-rillation-card border border-rillation-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-rillation-text">
                Paste Call Transcript
              </label>
              {directTranscript.length > 0 && (
                <span className="text-xs text-rillation-text/50">
                  {directTranscript.length.toLocaleString()} characters
                </span>
              )}
            </div>
            <textarea
              value={directTranscript}
              onChange={e => setDirectTranscript(e.target.value)}
              placeholder="Paste the Fathom call transcript here. The AI will analyze it to extract target company characteristics, industries, company sizes, and relevant keywords..."
              rows={10}
              className="w-full px-4 py-3 bg-rillation-bg border border-rillation-border rounded-xl text-sm text-rillation-text placeholder:text-rillation-text/30 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 transition-all duration-200 resize-none"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Button */}
      <AnimatePresence>
        {!generatedFilter && (
          <motion.button
            type="button"
            onClick={handleGenerate}
            disabled={
              isGenerating ||
              (inputMode === 'select' && !selectedCallId) ||
              (inputMode === 'paste' && !directTranscript.trim())
            }
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            whileHover={{
              scale: 1.01,
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)'
            }}
            whileTap={{ scale: 0.99 }}
          >
            {isGenerating ? (
              <>
                <motion.div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <span>Analyzing call transcript...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Generate Filters with AI</span>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Generating Skeleton */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Brain size={20} className="text-purple-400" />
                </motion.div>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
            <div className="bg-rillation-card border border-rillation-border rounded-xl p-4 space-y-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-24" />
              <Skeleton className="h-10" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
          >
            <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Error</p>
              <p className="text-sm text-rillation-text/70 mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Filters Display */}
      <AnimatePresence>
        {generatedFilter && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* AI Reasoning Card */}
            <motion.div
              className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-blue-500/10 border border-purple-500/30 rounded-xl p-5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-start gap-4">
                <motion.div
                  className="p-2 bg-purple-500/20 rounded-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Brain size={20} className="text-purple-400" />
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-rillation-text">AI Analysis</p>
                    {generatedFilter.confidence && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          generatedFilter.confidence >= 0.8
                            ? 'bg-green-500/20 text-green-400'
                            : generatedFilter.confidence >= 0.5
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {Math.round(generatedFilter.confidence * 100)}% confident
                      </motion.span>
                    )}
                  </div>
                  <p className="text-sm text-rillation-text/80 leading-relaxed">
                    {generatedFilter.reasoning}
                  </p>

                  {/* Filter Summary Badges */}
                  {filterCounts.total > 0 && (
                    <motion.div
                      className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-purple-500/20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <FilterBadge icon={Building2} label="Industries" count={filterCounts.industries} />
                      <FilterBadge icon={Users} label="Sizes" count={filterCounts.sizes} />
                      <FilterBadge icon={MapPin} label="Countries" count={filterCounts.countries} />
                      <FilterBadge icon={Search} label="Keywords" count={filterCounts.keywords} />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Filter Review Section */}
            <motion.div
              className="bg-rillation-card border border-rillation-border rounded-xl overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <motion.button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <div className="flex items-center gap-3">
                  <Edit3 size={18} className="text-rillation-text/70" />
                  <span className="text-sm font-medium text-rillation-text">
                    Review & Edit Filters
                  </span>
                  {filterCounts.total > 0 && (
                    <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-rillation-text">
                      {filterCounts.total} active
                    </span>
                  )}
                </div>
                <motion.div
                  animate={{ rotate: showFilters ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={18} className="text-rillation-text/50" />
                </motion.div>
              </motion.button>

              <AnimatePresence initial={false}>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="border-t border-rillation-border overflow-hidden"
                  >
                    <div className="p-4 space-y-5">
                      {/* Industries */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 }}
                      >
                        <MultiSelectDropdown
                          label="Industries"
                          options={industriesData as string[]}
                          value={generatedFilter.filters.industries || []}
                          onChange={val => updateFilter('industries', val)}
                          placeholder="Select industries..."
                          searchable
                        />
                      </motion.div>

                      {/* Company Sizes */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <ChipSelect
                          label="Company Size"
                          options={COMPANY_SIZES}
                          value={generatedFilter.filters.sizes || []}
                          onChange={val =>
                            updateFilter('sizes', val as typeof generatedFilter.filters.sizes)
                          }
                          columns={3}
                        />
                      </motion.div>

                      {/* Countries */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        <MultiSelectDropdown
                          label="Countries"
                          options={COMMON_COUNTRIES}
                          value={generatedFilter.filters.country_names || []}
                          onChange={val => updateFilter('country_names', val)}
                          placeholder="Select countries..."
                        />
                      </motion.div>

                      {/* Keywords */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <TagInput
                          label="Description Keywords"
                          value={generatedFilter.filters.description_keywords || []}
                          onChange={val => updateFilter('description_keywords', val)}
                          placeholder="Add keywords..."
                          variant="include"
                        />
                      </motion.div>

                      {/* Semantic Description - Collapsible */}
                      <CollapsibleSection
                        title="Semantic Description"
                        icon={<Sparkles size={16} />}
                        badge={generatedFilter.filters.semantic_description ? 1 : undefined}
                      >
                        <textarea
                          value={generatedFilter.filters.semantic_description || ''}
                          onChange={e => updateFilter('semantic_description', e.target.value)}
                          placeholder="Describe the types of companies to find using natural language..."
                          rows={3}
                          className="w-full px-3 py-2.5 bg-rillation-bg border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text/30 focus:outline-none focus:border-white/30 transition-colors resize-none"
                        />
                      </CollapsibleSection>

                      {/* Results Limit */}
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                        className="flex items-center gap-4"
                      >
                        <div className="flex-1">
                          <NumberInput
                            label="Results Limit"
                            value={generatedFilter.filters.limit || 100}
                            onChange={val => updateFilter('limit', val || 100)}
                            placeholder="Max results"
                            min={1}
                            max={10000}
                          />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 bg-rillation-bg rounded-lg mt-6">
                          <Hash size={14} className="text-rillation-text/50" />
                          <span className="text-xs text-rillation-text/50">
                            Max 10,000 companies
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Table Name Input */}
            <motion.div
              className="bg-rillation-card border border-rillation-border rounded-xl p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="block text-sm font-medium text-rillation-text mb-2">
                Table Name
              </label>
              <input
                type="text"
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                placeholder={`${generatedFilter.client} - Find Companies ${new Date().toISOString().split('T')[0]}`}
                className="w-full px-4 py-2.5 bg-rillation-bg border border-rillation-border rounded-xl text-sm text-rillation-text placeholder:text-rillation-text/30 focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 transition-all duration-200"
              />
              <p className="mt-2 text-xs text-rillation-text/50">
                This will be the name of your Clay table. Leave empty for auto-generated name.
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <motion.button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2.5 bg-rillation-card border border-rillation-border rounded-xl text-sm font-medium text-rillation-text hover:border-white/30 hover:bg-white/5 transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RotateCcw size={16} />
                Start Over
              </motion.button>

              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || generatedFilter.status === 'submitted'}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-black font-medium rounded-xl hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                whileHover={{
                  scale: 1.01,
                  boxShadow: '0 0 30px rgba(255, 255, 255, 0.3)'
                }}
                whileTap={{ scale: 0.99 }}
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    Creating Clay Table...
                  </>
                ) : generatedFilter.status === 'submitted' ? (
                  <>
                    <CheckCircle2 size={18} />
                    Submitted to Clay
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit to Clay
                  </>
                )}
              </motion.button>
            </motion.div>

            {/* Success Info */}
            <AnimatePresence>
              {generatedFilter.status === 'submitted' && generatedFilter.clay_table_id && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      <CheckCircle2 size={24} className="text-green-400" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-semibold text-green-400">
                        Table created successfully!
                      </p>
                      <p className="text-xs text-rillation-text/60 mt-0.5">
                        Table ID: {generatedFilter.clay_table_id}
                      </p>
                    </div>
                  </div>
                  <motion.a
                    href={`https://app.clay.com/workspaces/161745/tables/${generatedFilter.clay_table_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 text-sm font-medium rounded-lg hover:bg-green-500/30 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Open in Clay
                    <ExternalLink size={14} />
                  </motion.a>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
