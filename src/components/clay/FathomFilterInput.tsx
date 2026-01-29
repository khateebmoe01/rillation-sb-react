import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Brain,
  Calendar,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useClayFilterGeneration } from '../../hooks/useClayFilterGeneration'
import type { CompanySearchFilters } from '../../../clay-automation/types/company-search'

interface FathomCall {
  id: string
  client: string
  title: string
  call_date?: string
  transcript?: string
  summary?: string
  call_type: string
}

interface FathomFilterInputProps {
  client?: string
  onFiltersGenerated: (filters: CompanySearchFilters, reasoning: string, confidence: number) => void
  className?: string
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
}

// Skeleton component for loading states
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} />
  )
}

const PAGE_SIZE = 20

export default function FathomFilterInput({
  client,
  onFiltersGenerated,
  className = '',
}: FathomFilterInputProps) {
  const [fathomCalls, setFathomCalls] = useState<FathomCall[]>([])
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const [directTranscript, setDirectTranscript] = useState('')
  const [inputMode, setInputMode] = useState<'select' | 'paste'>('select')
  const [isLoadingCalls, setIsLoadingCalls] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)

  const {
    isGenerating,
    generatedFilter,
    error,
    generateFilters,
    reset,
  } = useClayFilterGeneration()

  // Load Fathom calls for this client
  useEffect(() => {
    async function loadCalls() {
      if (!client) return
      setIsLoadingCalls(true)
      setCursor(null)
      setHasMore(false)

      const { data, error } = await supabase
        .from('client_fathom_calls')
        .select('id, client, title, call_date, summary, call_type')
        .eq('client', client)
        .order('call_date', { ascending: false })
        .limit(PAGE_SIZE + 1) // +1 to check if more exist

      if (!error && data) {
        const hasMoreResults = data.length > PAGE_SIZE
        const callsToShow = (hasMoreResults ? data.slice(0, PAGE_SIZE) : data) as FathomCall[]
        setFathomCalls(callsToShow)
        setHasMore(hasMoreResults)
        if (callsToShow.length > 0) {
          const lastCall = callsToShow[callsToShow.length - 1]
          setCursor(lastCall.call_date || null)
        }
      }
      setIsLoadingCalls(false)
    }
    loadCalls()
  }, [client])

  // Load more calls
  const loadMoreCalls = async () => {
    if (!client || !cursor || loadingMore) return
    setLoadingMore(true)

    const { data, error: fetchError } = await supabase
      .from('client_fathom_calls')
      .select('id, client, title, call_date, summary, call_type')
      .eq('client', client)
      .lt('call_date', cursor)
      .order('call_date', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (!fetchError && data) {
      const hasMoreResults = data.length > PAGE_SIZE
      const newCalls = (hasMoreResults ? data.slice(0, PAGE_SIZE) : data) as FathomCall[]
      setFathomCalls(prev => [...prev, ...newCalls])
      setHasMore(hasMoreResults)
      if (newCalls.length > 0) {
        const lastCall = newCalls[newCalls.length - 1]
        setCursor(lastCall.call_date || null)
      }
    }
    setLoadingMore(false)
  }

  // When filters are generated, pass them up to parent
  useEffect(() => {
    if (generatedFilter && !isGenerating) {
      // Convert to CompanySearchFilters format
      // The AI may return sizes as string[], so we cast them
      const filters: CompanySearchFilters = {
        industries: generatedFilter.filters.industries || [],
        sizes: (generatedFilter.filters.sizes || []) as CompanySearchFilters['sizes'],
        country_names: generatedFilter.filters.country_names || [],
        description_keywords: generatedFilter.filters.description_keywords || [],
        semantic_description: generatedFilter.filters.semantic_description || '',
        limit: generatedFilter.filters.limit || 100,
      }
      onFiltersGenerated(
        filters,
        generatedFilter.reasoning || '',
        generatedFilter.confidence || 0.5
      )
    }
  }, [generatedFilter, isGenerating, onFiltersGenerated])

  const handleGenerate = async () => {
    if (inputMode === 'select' && selectedCallId) {
      await generateFilters({ fathom_call_id: selectedCallId })
    } else if (inputMode === 'paste' && directTranscript.trim()) {
      await generateFilters({ transcript: directTranscript, client: client || 'Unknown' })
    }
  }

  const selectedCall = fathomCalls.find(c => c.id === selectedCallId)
  const canGenerate = (inputMode === 'select' && selectedCallId) ||
                      (inputMode === 'paste' && directTranscript.trim())

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          className="p-2 bg-blue-500/20 rounded-lg"
          whileHover={{ scale: 1.05, boxShadow: '0 0 16px rgba(59, 130, 246, 0.3)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Brain size={18} className="text-blue-400" />
        </motion.div>
        <div>
          <h3 className="text-sm font-semibold text-rillation-text">
            AI Filter Generation
          </h3>
          <p className="text-xs text-rillation-text/60">
            Generate filters from a Fathom call transcript
          </p>
        </div>
      </motion.div>

      {/* Input Mode Toggle */}
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <motion.button
          type="button"
          onClick={() => setInputMode('select')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
            inputMode === 'select'
              ? 'bg-white text-black shadow-lg shadow-white/10'
              : 'bg-rillation-card border border-rillation-border text-rillation-text hover:border-white/20'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Phone size={14} />
          Select Call
        </motion.button>
        <motion.button
          type="button"
          onClick={() => setInputMode('paste')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
            inputMode === 'paste'
              ? 'bg-white text-black shadow-lg shadow-white/10'
              : 'bg-rillation-card border border-rillation-border text-rillation-text hover:border-white/20'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FileText size={14} />
          Paste Transcript
        </motion.button>
      </motion.div>

      {/* Call Selector */}
      <AnimatePresence mode="wait">
        {inputMode === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-rillation-bg border border-rillation-border rounded-xl overflow-hidden"
          >
            <div className="p-3 border-b border-rillation-border/50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-rillation-text/70">
                  Select a Fathom Call
                </label>
                {selectedCall && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px]"
                  >
                    <CheckCircle2 size={10} />
                    Selected
                  </motion.span>
                )}
              </div>
            </div>

            <div className="p-3 max-h-[400px] overflow-y-auto">
              {isLoadingCalls ? (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[1, 2, 3].map(i => (
                    <div key={i}>
                      <Skeleton className="h-14" />
                    </div>
                  ))}
                </motion.div>
              ) : fathomCalls.length === 0 ? (
                <motion.div
                  className="text-center py-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Phone size={24} className="mx-auto text-rillation-text/20 mb-2" />
                  <p className="text-xs text-rillation-text/50 mb-2">
                    No Fathom calls found for {client || 'this client'}
                  </p>
                  <motion.button
                    type="button"
                    onClick={() => setInputMode('paste')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-rillation-text text-[10px] font-medium rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FileText size={12} />
                    Paste transcript instead
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  className="space-y-1.5"
                  variants={containerVariants}
                  initial={false}
                  animate="show"
                >
                  {fathomCalls.map(call => (
                    <motion.button
                      key={call.id}
                      type="button"
                      onClick={() => setSelectedCallId(call.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all duration-200 ${
                        selectedCallId === call.id
                          ? 'bg-white/10 border border-white/20'
                          : 'bg-rillation-card border border-transparent hover:border-rillation-border hover:bg-white/5'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          selectedCallId === call.id
                            ? 'bg-white/20'
                            : 'bg-rillation-bg'
                        }`}>
                          <Phone size={12} className="text-rillation-text/60" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-rillation-text truncate">
                            {call.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {call.call_date && (
                              <span className="flex items-center gap-0.5 text-[10px] text-rillation-text/40">
                                <Calendar size={8} />
                                {new Date(call.call_date).toLocaleDateString()}
                              </span>
                            )}
                            <span className="text-[10px] text-rillation-text/40 px-1 py-0.5 bg-white/5 rounded">
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
                            className="shrink-0"
                          >
                            <CheckCircle2 size={16} className="text-green-400" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  ))}
                  {/* Load More Button */}
                  {hasMore && (
                    <motion.button
                      type="button"
                      onClick={loadMoreCalls}
                      disabled={loadingMore}
                      className="w-full mt-2 py-2 text-xs font-medium text-rillation-text/60 hover:text-rillation-text bg-white/5 hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
                      whileHover={{ scale: loadingMore ? 1 : 1.01 }}
                      whileTap={{ scale: loadingMore ? 1 : 0.99 }}
                    >
                      {loadingMore ? (
                        <span className="flex items-center justify-center gap-2">
                          <motion.span
                            className="w-3 h-3 border border-rillation-text/30 border-t-rillation-text/60 rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                          Loading...
                        </span>
                      ) : (
                        'Load more calls'
                      )}
                    </motion.button>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Transcript Paste */}
        {inputMode === 'paste' && (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-rillation-bg border border-rillation-border rounded-xl p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-rillation-text/70">
                Paste Call Transcript
              </label>
              {directTranscript.length > 0 && (
                <span className="text-[10px] text-rillation-text/40">
                  {directTranscript.length.toLocaleString()} chars
                </span>
              )}
            </div>
            <textarea
              value={directTranscript}
              onChange={e => setDirectTranscript(e.target.value)}
              placeholder="Paste the Fathom call transcript here..."
              rows={6}
              className="w-full px-3 py-2 bg-rillation-card border border-rillation-border rounded-lg text-xs text-rillation-text placeholder:text-rillation-text/30 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all duration-200 resize-none"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl"
          >
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-red-400">Error</p>
              <p className="text-xs text-rillation-text/60 mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generating State */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Brain size={18} className="text-blue-400" />
              </motion.div>
              <div className="flex-1">
                <p className="text-xs font-medium text-rillation-text">
                  Analyzing transcript...
                </p>
                <p className="text-[10px] text-rillation-text/50 mt-0.5">
                  AI is extracting target company characteristics
                </p>
              </div>
              <motion.div
                className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Button */}
      <AnimatePresence>
        {!isGenerating && !generatedFilter && (
          <motion.button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            whileHover={canGenerate ? {
              scale: 1.01,
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
            } : {}}
            whileTap={canGenerate ? { scale: 0.99 } : {}}
          >
            <Sparkles size={16} />
            Generate Filters with AI
          </motion.button>
        )}
      </AnimatePresence>

      {/* Success State - Filters Generated */}
      <AnimatePresence>
        {generatedFilter && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-500/10 border border-green-500/20 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <CheckCircle2 size={20} className="text-green-400" />
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-green-400">
                    Filters Generated
                  </p>
                  {generatedFilter.confidence && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      generatedFilter.confidence >= 0.8
                        ? 'bg-green-500/20 text-green-400'
                        : generatedFilter.confidence >= 0.5
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {Math.round(generatedFilter.confidence * 100)}% confident
                    </span>
                  )}
                </div>
                <p className="text-xs text-rillation-text/60 mt-1.5 leading-relaxed">
                  {generatedFilter.reasoning}
                </p>
                <motion.button
                  type="button"
                  onClick={reset}
                  className="mt-3 text-[10px] text-rillation-text/50 hover:text-rillation-text transition-colors"
                  whileHover={{ scale: 1.02 }}
                >
                  Generate new filters
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
