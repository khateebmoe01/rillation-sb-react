import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatNumber, formatPercentage } from '../../lib/supabase'

interface PipelineStage {
  name: string
  value: number
  percentage?: number
  color: string
}

interface SalesPipelineFunnelProps {
  meetingsBooked: number
  showedUp: number
  qualified: number
  demo: number
  proposal: number
  closed: number
  onStageClick?: (stageName: string) => void
  selectedStage?: string | null
}

export default function SalesPipelineFunnel({
  meetingsBooked,
  showedUp,
  qualified,
  demo,
  proposal,
  closed,
  onStageClick,
  selectedStage,
}: SalesPipelineFunnelProps) {
  const [hoveredStage, setHoveredStage] = useState<number | null>(null)

  // Build stages with calculated percentages (effectiveness metrics)
  const stages: PipelineStage[] = [
    {
      name: 'Meetings Booked',
      value: meetingsBooked,
      percentage: 100,
      color: 'from-violet-600 to-violet-500',
    },
    {
      name: 'Showed Up',
      value: showedUp,
      percentage: meetingsBooked > 0 ? (showedUp / meetingsBooked) * 100 : 0,
      color: 'from-blue-600 to-blue-500',
    },
    {
      name: 'Qualified',
      value: qualified,
      percentage: showedUp > 0 ? (qualified / showedUp) * 100 : 0,
      color: 'from-cyan-600 to-cyan-500',
    },
    {
      name: 'Demo Completed',
      value: demo,
      percentage: qualified > 0 ? (demo / qualified) * 100 : 0,
      color: 'from-teal-600 to-teal-500',
    },
    {
      name: 'Proposal Sent',
      value: proposal,
      percentage: demo > 0 ? (proposal / demo) * 100 : 0,
      color: 'from-emerald-600 to-emerald-500',
    },
    {
      name: 'Closed Won',
      value: closed,
      percentage: proposal > 0 ? (closed / proposal) * 100 : 0,
      color: 'from-green-600 to-green-500',
    },
  ]

  // Calculate overall conversion rate
  const overallConversion = meetingsBooked > 0 ? (closed / meetingsBooked) * 100 : 0

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }

  const stageVariants = {
    hidden: { opacity: 0, scaleX: 0 },
    visible: {
      opacity: 1,
      scaleX: 1,
      transition: {
        scaleX: { type: 'spring', stiffness: 100, damping: 15 },
        opacity: { duration: 0.3 },
      },
    },
  }

  return (
    <motion.div
      className="relative overflow-hidden rounded-xl p-6 border border-slate-700/60 bg-gradient-to-b from-slate-900/90 to-slate-900/70"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Sales Pipeline (Effectiveness)</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Overall Conversion:</span>
          <span className={`text-sm font-bold ${overallConversion > 20 ? 'text-emerald-400' : overallConversion > 10 ? 'text-amber-400' : 'text-red-400'}`}>
            {formatPercentage(overallConversion)}
          </span>
        </div>
      </div>

      {/* Funnel */}
      <motion.div
        className="flex flex-col items-center gap-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {stages.map((stage, index) => {
          const totalStages = stages.length
          const widthPercent = Math.max(100 - index * (60 / totalStages), 35)
          const nextWidthPercent = index < totalStages - 1 ? Math.max(100 - (index + 1) * (60 / totalStages), 35) : widthPercent
          const widthDiff = (widthPercent - nextWidthPercent) / 2
          const clipLeft = (widthDiff / widthPercent) * 100
          const clipRight = 100 - clipLeft

          const isHovered = hoveredStage === index
          const isSelected = selectedStage === stage.name
          const isClickable = !!onStageClick

          return (
            <motion.div
              key={stage.name}
              className="w-full flex flex-col items-center"
              variants={stageVariants}
            >
              {/* Stage connector line */}
              {index > 0 && (
                <div className="w-px h-1 bg-gradient-to-b from-slate-600 to-slate-700" />
              )}

              {/* Funnel Stage */}
              <div className="w-full flex justify-center overflow-hidden">
                <motion.div
                  className={`
                    relative py-3 flex items-center justify-between transition-all duration-200 rounded-lg bg-gradient-to-r ${stage.color}
                    ${isClickable ? 'cursor-pointer' : ''}
                    ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}
                  `}
                  style={{
                    width: `${widthPercent}%`,
                    clipPath:
                      index < totalStages - 1
                        ? `polygon(0% 0%, 100% 0%, ${clipRight}% 100%, ${clipLeft}% 100%)`
                        : `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`,
                  }}
                  onMouseEnter={() => setHoveredStage(index)}
                  onMouseLeave={() => setHoveredStage(null)}
                  whileHover={
                    isClickable
                      ? { filter: 'brightness(1.2)', scale: 1.02, transition: { duration: 0.2 } }
                      : { filter: 'brightness(1.1)', transition: { duration: 0.2 } }
                  }
                  whileTap={isClickable ? { scale: 0.98 } : {}}
                  onClick={() => isClickable && onStageClick?.(stage.name)}
                >
                  {/* Shimmer */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Content */}
                  <div className="relative z-10 w-full flex items-center justify-between px-4">
                    <span className="text-sm font-medium text-white truncate">{stage.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-white">{formatNumber(stage.value)}</span>
                      {stage.percentage !== undefined && index > 0 && (
                        <span className="text-xs text-white/90 bg-black/20 px-2 py-0.5 rounded">
                          {formatPercentage(stage.percentage)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Stage-to-stage conversion rates */}
      <div className="mt-6 grid grid-cols-5 gap-2 text-center">
        {stages.slice(1).map((stage, idx) => (
          <div key={stage.name} className="bg-slate-800/50 rounded-lg py-2 px-1">
            <div className="text-xs text-slate-400 truncate">{stages[idx].name.split(' ')[0]} →</div>
            <div className={`text-sm font-bold ${
              stage.percentage && stage.percentage >= 70 ? 'text-emerald-400' : 
              stage.percentage && stage.percentage >= 40 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {formatPercentage(stage.percentage || 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
        <span>Percentages show conversion from previous stage</span>
      </div>
    </motion.div>
  )
}






