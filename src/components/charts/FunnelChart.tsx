import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatNumber, formatPercentage } from '../../lib/supabase'
import type { FunnelStage } from '../../types/database'

interface FunnelChartProps {
  stages: FunnelStage[]
  onStageClick?: (stageName: string, stageIndex: number) => void
  clickableFromIndex?: number
  selectedStageName?: string | null
}

export default function FunnelChart({ 
  stages, 
  onStageClick,
  clickableFromIndex = 4,
  selectedStageName
}: FunnelChartProps) {
  const [hoveredStage, setHoveredStage] = useState<number | null>(null)
  
  // Sales Hand-Off index
  const salesHandoffIndex = stages.findIndex((s) => 
    s.name === 'Showed Up to Disco' || s.name === 'Showed Up to Discovery'
  )

  // Container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
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
        scaleX: { type: "spring", stiffness: 100, damping: 15 },
        opacity: { duration: 0.3 }
      }
    }
  }

  return (
    <motion.div 
      className="bg-rillation-card rounded-xl p-4 sm:p-6 border border-rillation-border card-glow w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-lg font-semibold text-rillation-text mb-4">Pipeline Funnel</h3>
      
      {/* Funnel Visualization - True Funnel Shape */}
      <motion.div 
        className="flex flex-col items-center gap-0"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {stages.map((stage, index) => {
          // Calculate width - funnel shape: starts at 100% and decreases
          const totalStages = stages.length
          const widthPercent = Math.max(100 - (index * (70 / totalStages)), 30)
          
          // Calculate trapezoid clip path for funnel effect
          const nextWidthPercent = index < totalStages - 1 
            ? Math.max(100 - ((index + 1) * (70 / totalStages)), 30)
            : widthPercent
          
          const widthDiff = (widthPercent - nextWidthPercent) / 2
          const clipLeft = (widthDiff / widthPercent) * 100
          const clipRight = 100 - clipLeft
          
          const isAfterHandoff = salesHandoffIndex > 0 && index >= salesHandoffIndex
          const isClickable = onStageClick && index >= clickableFromIndex
          const isHovered = hoveredStage === index
          const isSelected = selectedStageName === stage.name
          
          return (
            <motion.div 
              key={stage.name} 
              className="w-full flex flex-col items-center"
              variants={stageVariants}
            >
              {/* Sales Hand-Off divider */}
              <AnimatePresence>
                {index === salesHandoffIndex && (
                  <motion.div 
                    className="w-full flex items-center justify-center my-2"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="flex-1 border-t border-dashed border-rillation-orange/50" />
                    <span className="px-3 text-xs text-rillation-orange whitespace-nowrap font-medium">
                      Sales Hand-Off
                    </span>
                    <div className="flex-1 border-t border-dashed border-rillation-orange/50" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Funnel Stage - Trapezoid shape */}
              <div className="w-full flex justify-center overflow-hidden">
                <motion.div
                  className={`
                    relative py-2 sm:py-2.5 flex items-center justify-center transition-all duration-200 rounded-lg
                    ${isAfterHandoff 
                      ? 'bg-gradient-to-r from-green-600 to-green-500' 
                      : 'bg-gradient-to-r from-rillation-purple-dark to-rillation-purple'
                    }
                    ${isClickable ? 'cursor-pointer' : ''}
                    ${isSelected ? 'ring-2 ring-rillation-magenta ring-offset-2 ring-offset-rillation-card' : ''}
                  `}
                  style={{ 
                    width: `${widthPercent}%`,
                    clipPath: index < totalStages - 1 
                      ? `polygon(0% 0%, 100% 0%, ${clipRight}% 100%, ${clipLeft}% 100%)`
                      : `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`,
                  }}
                  onMouseEnter={() => setHoveredStage(index)}
                  onMouseLeave={() => setHoveredStage(null)}
                  whileHover={isClickable ? { 
                    filter: "brightness(1.2)",
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  } : {
                    filter: "brightness(1.1)",
                    transition: { duration: 0.2 }
                  }}
                  whileTap={isClickable ? { scale: 0.98 } : {}}
                  onClick={() => isClickable && onStageClick?.(stage.name, index)}
                >
                  {/* Shimmer effect on hover */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        initial={{ x: "-100%" }}
                        animate={{ x: "200%" }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                      />
                    )}
                  </AnimatePresence>
                  
                  {/* Stage content - properly constrained */}
                  <div className="relative z-10 w-full flex items-center justify-center gap-2 sm:gap-3 text-white px-3 sm:px-4 py-2 overflow-hidden">
                    <span className="text-xs sm:text-sm font-medium truncate min-w-0 max-w-full">
                      {stage.name}
                    </span>
                    <span className="text-xs sm:text-sm md:text-base font-bold whitespace-nowrap flex-shrink-0">
                      {formatNumber(stage.value)}
                    </span>
                    {stage.percentage !== undefined && index > 0 && (
                      <span className="text-xs text-white/70 whitespace-nowrap flex-shrink-0">
                        {formatPercentage(stage.percentage)}
                      </span>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
