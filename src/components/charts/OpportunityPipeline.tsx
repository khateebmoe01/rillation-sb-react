import { motion } from 'framer-motion'
import { formatNumber } from '../../lib/supabase'
import { useOpportunities, type OpportunityStage } from '../../hooks/useOpportunities'

interface OpportunityPipelineProps {
  client?: string
}

export default function OpportunityPipeline({ client }: OpportunityPipelineProps) {
  const { stages, loading, error } = useOpportunities({ client })

  if (loading) {
    return (
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-rillation-text mb-6">Estimated Pipeline Value</h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-rillation-purple border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-rillation-text mb-6">Estimated Pipeline Value</h3>
        <div className="text-sm text-red-400">{error}</div>
      </div>
    )
  }

  // Calculate max value for sizing bars
  const maxValue = Math.max(...stages.map((s) => s.value), 1)

  // Dark purple color - darker variant
  const darkPurple = 'bg-[#5b21b6]' // purple-800

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

  // Stage animation variants
  const stageVariants = {
    hidden: { opacity: 0, scaleX: 0 },
    visible: { 
      opacity: 1, 
      scaleX: 1,
      transition: {
        scaleX: { type: "spring", stiffness: 200, damping: 20 },
        opacity: { duration: 0.3 }
      }
    }
  }

  // Card animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  }

  return (
    <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border max-w-2xl mx-auto w-full">
      <h3 className="text-lg font-semibold text-rillation-text mb-6">Estimated Pipeline Value</h3>
      
      {/* Compact Triangle Funnel */}
      <motion.div
        className="relative flex flex-col items-center gap-0 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {stages.map((stage, index) => {
          // Calculate width for triangle effect - more compact
          const progress = index / (stages.length - 1)
          const widthPercent = Math.max(100 - (progress * 60), 25)
          
          // Calculate next stage width for smooth trapezoid
          const nextProgress = (index + 1) / (stages.length - 1)
          const nextWidthPercent = index < stages.length - 1 
            ? Math.max(100 - (nextProgress * 60), 25)
            : widthPercent
          
          // Value-based width scaling (if needed)
          const valueWidth = maxValue > 0 ? (stage.value / maxValue) * 100 : 0

          return (
            <motion.div
              key={stage.stage}
              className="relative flex flex-col items-center w-full mb-1"
              variants={stageVariants}
            >
              {/* Stage Row */}
              <div className="relative w-full flex items-center gap-3">
                {/* Stage name on left */}
                <div className="flex-shrink-0 w-32 text-right pr-3">
                  <span className="text-sm text-rillation-text-muted font-medium">
                    {stage.stage}
                  </span>
                </div>
                
                {/* Triangle funnel bar */}
                <div className="flex-1 flex items-center">
                  <motion.div
                    className={`relative ${darkPurple} flex items-center justify-end px-4 rounded-sm`}
                    style={{
                      width: `${widthPercent}%`,
                      height: '40px',
                      clipPath: index < stages.length - 1 
                        ? `polygon(0% 0%, 100% 0%, ${100 - ((widthPercent - nextWidthPercent) / widthPercent * 100)}% 100%, 0% 100%)`
                        : `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`,
                    }}
                  >
                    {/* Value inside bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-bold">
                        ${formatNumber(stage.value)}
                      </span>
                      <span className="text-white/70 text-xs">
                        ({stage.count})
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Scorecard Cards Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {stages.map((stage, index) => (
          <motion.div
            key={`card-${stage.stage}`}
            variants={cardVariants}
            className="bg-rillation-bg rounded-lg p-4 border border-rillation-border hover:border-rillation-purple/30 transition-all duration-200"
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
          >
            {/* Card header with purple accent */}
            <div className="flex items-start gap-3">
              <div className="w-1 h-10 bg-gradient-to-b from-rillation-purple to-rillation-purple-dark rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-rillation-text-muted mb-2 truncate">
                  {stage.stage}
                </h4>
                <div className="space-y-0.5">
                  <p className="text-lg font-bold text-rillation-text">
                    ${formatNumber(stage.value)}
                  </p>
                  <p className="text-xs text-rillation-text-muted">
                    {stage.count} {stage.count === 1 ? 'opportunity' : 'opportunities'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
