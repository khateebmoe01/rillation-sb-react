import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings } from 'lucide-react'
import { formatNumber } from '../../lib/supabase'
import type { OpportunityStage } from '../../hooks/useOpportunities'
import OpportunityStageDropdown from '../ui/OpportunityStageDropdown'

interface OpportunityPipelineProps {
  stages: OpportunityStage[]
  loading?: boolean
  error?: string | null
  onStageClick?: (stageName: string, stageIndex: number) => void
  onSetEstimatedValue?: () => void
  client?: string
  startDate?: Date
  endDate?: Date
  onOpportunitySaved?: () => void
}

export default function OpportunityPipeline({ 
  stages, 
  loading, 
  error, 
  onStageClick, 
  onSetEstimatedValue,
  client,
  startDate,
  endDate,
  onOpportunitySaved,
}: OpportunityPipelineProps) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  if (loading) {
    return (
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border w-full">
        <h3 className="text-lg font-semibold text-rillation-text mb-6">Current Pipeline Value</h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border w-full">
        <h3 className="text-lg font-semibold text-rillation-text mb-6">Current Pipeline Value</h3>
        <div className="text-sm text-red-400">{error}</div>
      </div>
    )
  }

  // Calculate max value for progress bars
  const maxValue = Math.max(...stages.map((s) => s.value), 1)

  // Container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  }

  // Card animation variants with 3D flip effect
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9,
      rotateX: -20,
      z: -50
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      rotateX: 0,
      z: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20,
        mass: 0.5
      }
    }
  }

  // Shimmer animation for progress bars
  const shimmerVariants = {
    initial: { x: '-100%' },
    animate: {
      x: '200%',
      transition: {
        repeat: Infinity,
        repeatDelay: 2,
        duration: 1.5,
        ease: 'easeInOut'
      }
    }
  }

  return (
    <div className="bg-rillation-card rounded-xl p-4 sm:p-6 border border-rillation-border w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-rillation-text">Current Pipeline Value</h3>
        {onSetEstimatedValue && (
          <button
            onClick={onSetEstimatedValue}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-rillation-purple hover:bg-rillation-purple/80 rounded-lg transition-colors"
          >
            <Settings size={12} />
            <span className="hidden sm:inline">Set Values</span>
          </button>
        )}
      </div>
      
      {/* Unified Enhanced Cards with Inline Dropdowns */}
      <motion.div
        className="flex flex-col gap-1.5 flex-1"
        style={{ perspective: '1000px' }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {stages.map((stage, index) => {
          // Calculate progress percentage for progress bar
          const progressPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0

          // Use dropdown if we have the necessary props
          if (client && startDate && endDate) {
            return (
              <motion.div
                key={stage.stage}
                variants={cardVariants}
              >
                <OpportunityStageDropdown
                  stageName={stage.stage}
                  stageValue={stage.value}
                  stageCount={stage.count}
                  isExpanded={expandedStages.has(stage.stage)}
                  onToggle={() => {
                    setExpandedStages(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has(stage.stage)) {
                        newSet.delete(stage.stage)
                      } else {
                        newSet.add(stage.stage)
                      }
                      return newSet
                    })
                  }}
                  client={client}
                  startDate={startDate}
                  endDate={endDate}
                  onSave={onOpportunitySaved}
                />
              </motion.div>
            )
          }

          // Fallback to original card behavior
          return (
            <motion.div
              key={stage.stage}
              variants={cardVariants}
              style={{ transformStyle: 'preserve-3d' }}
              className={`rounded-lg px-4 py-3.5 border-l-4 bg-rillation-bg border-l-[#EB1A1A] transition-all duration-200 ${
                onStageClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onStageClick?.(stage.stage, index)}
              whileHover={onStageClick ? { 
                rotateX: -8,
                y: -8,
                scale: 1.05,
                z: 40,
                boxShadow: '0 20px 40px rgba(235, 26, 26, 0.4), 0 0 0 2px rgba(235, 26, 26, 0.2)',
                transition: { 
                  type: "spring",
                  stiffness: 1200,
                  damping: 35,
                  duration: 0.05
                } 
              } : {}}
              whileTap={onStageClick ? { 
                scale: 0.98,
                rotateX: 0,
                transition: { duration: 0.1 }
              } : {}}
            >
              {/* Card Content */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-white truncate flex-1 min-w-0">
                  {stage.stage}
                </h4>
                <p className="text-xl font-bold text-white ml-4 flex-shrink-0">
                  ${formatNumber(stage.value)}
                </p>
              </div>

              {/* Progress Bar with Shimmer Effect - Always show red line */}
              <div className="mb-2 relative overflow-hidden rounded-full h-1.5 bg-[#EB1A1A]/20">
                {/* Filled portion based on value */}
                <motion.div
                  className="h-full bg-[#EB1A1A] rounded-full relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(progressPercent, 2)}%` }}
                  transition={{ 
                    duration: 0.8, 
                    delay: index * 0.08 + 0.1,
                    type: "spring",
                    stiffness: 100,
                    damping: 20
                  }}
                >
                  {/* Shimmer effect only when there's actual value */}
                  {progressPercent > 0 && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      variants={shimmerVariants}
                      initial="initial"
                      animate="animate"
                    />
                  )}
                </motion.div>
              </div>

              {/* Opportunity Count */}
              <p className="text-xs text-white/60 font-medium">
                {stage.count} {stage.count === 1 ? 'opportunity' : 'opportunities'}
              </p>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
