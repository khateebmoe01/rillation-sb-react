import { useState } from 'react'
import { formatNumber, formatPercentage } from '../../lib/supabase'
import type { FunnelStage } from '../../types/database'

interface FunnelChartProps {
  stages: FunnelStage[]
  onStageClick?: (stageName: string, stageIndex: number) => void
  clickableFromIndex?: number
}

export default function FunnelChart({ 
  stages, 
  onStageClick,
  clickableFromIndex = 4
}: FunnelChartProps) {
  const [hoveredStage, setHoveredStage] = useState<number | null>(null)
  
  // Find max value for scaling
  const maxValue = Math.max(...stages.map((s) => s.value), 1)
  
  // Sales Hand-Off index
  const salesHandoffIndex = stages.findIndex((s) => 
    s.name === 'Showed Up to Disco' || s.name === 'Showed Up to Discovery'
  )

  return (
    <div className="bg-rillation-card rounded-xl p-6 border border-rillation-border card-glow">
      <h3 className="text-lg font-semibold text-rillation-text mb-6">Pipeline Funnel</h3>
      
      {/* Funnel Visualization - Descending width style */}
      <div className="relative flex flex-col items-center gap-0 py-4">
        {stages.map((stage, index) => {
          // Calculate width - starts at 100% and decreases more dramatically
          // First stage is 100%, last stage is ~25%, with smooth decrease
          const progress = index / (stages.length - 1)
          const widthPercent = Math.max(100 - (progress * 75), 25)
          
          // Calculate next stage width for trapezoid effect
          const nextProgress = (index + 1) / (stages.length - 1)
          const nextWidthPercent = index < stages.length - 1 
            ? Math.max(100 - (nextProgress * 75), 25)
            : widthPercent
          
          // Determine if stage is too narrow to show text inside
          const isNarrow = widthPercent < 35
          
          const isAfterHandoff = salesHandoffIndex > 0 && index >= salesHandoffIndex
          const isClickable = onStageClick && index >= clickableFromIndex
          const isHovered = hoveredStage === index
          
          return (
            <div 
              key={stage.name} 
              className="relative flex flex-col items-center w-full"
              onMouseEnter={() => setHoveredStage(index)}
              onMouseLeave={() => setHoveredStage(null)}
            >
              {/* Sales Hand-Off divider */}
              {index === salesHandoffIndex && (
                <div className="w-full flex items-center justify-center my-2">
                  <div className="flex-1 border-t border-dashed border-rillation-orange/50" />
                  <span className="px-3 text-xs text-rillation-orange whitespace-nowrap">
                    Sales Hand-Off
                  </span>
                  <div className="flex-1 border-t border-dashed border-rillation-orange/50" />
                </div>
              )}
              
              {/* Funnel Bar - Trapezoid shape */}
              <div className="relative w-full flex items-center">
                <div 
                  className={`
                    relative h-16 flex items-center justify-center transition-all duration-300
                    ${isAfterHandoff 
                      ? 'bg-gradient-to-r from-green-600 to-green-500' 
                      : 'bg-gradient-to-r from-rillation-purple-dark to-rillation-purple'
                    }
                    ${isClickable ? 'cursor-pointer' : ''}
                    ${isHovered ? 'brightness-110 scale-[1.02]' : ''}
                  `}
                  style={{ 
                    width: `${widthPercent}%`,
                    marginLeft: `${(100 - widthPercent) / 2}%`,
                    clipPath: index < stages.length - 1 
                      ? `polygon(${(100 - widthPercent) / 2}% 0%, ${(100 + widthPercent) / 2}% 0%, ${(100 + nextWidthPercent) / 2}% 100%, ${(100 - nextWidthPercent) / 2}% 100%)`
                      : `polygon(${(100 - widthPercent) / 2}% 0%, ${(100 + widthPercent) / 2}% 0%, ${(100 + widthPercent) / 2}% 100%, ${(100 - widthPercent) / 2}% 100%)`,
                  }}
                  onClick={() => isClickable && onStageClick?.(stage.name, index)}
                >
                  {/* Stage name and value - only show if not narrow */}
                  {!isNarrow && (
                    <div className="flex items-center gap-4 px-4 min-w-0">
                      <span className="text-white text-sm font-medium truncate flex-shrink-0" style={{ maxWidth: '180px' }}>
                        {stage.name}
                      </span>
                      <span className="text-white text-lg font-bold flex-shrink-0">
                        {formatNumber(stage.value)}
                      </span>
                      {stage.percentage !== undefined && index > 0 && (
                        <span className="text-white/70 text-xs flex-shrink-0">
                          {formatPercentage(stage.percentage)}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Show only value if narrow */}
                  {isNarrow && (
                    <div className="flex items-center justify-center px-2">
                      <span className="text-white text-lg font-bold">
                        {formatNumber(stage.value)}
                      </span>
                    </div>
                  )}
                  
                  {/* Hover tooltip */}
                  {isHovered && (
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 translate-x-full bg-rillation-bg border border-rillation-border rounded-lg px-3 py-2 shadow-xl z-20 whitespace-nowrap">
                      <p className="text-xs font-medium text-rillation-text">{stage.name}</p>
                      <p className="text-xs text-rillation-text-muted">
                        Count: {formatNumber(stage.value)}
                        {stage.percentage !== undefined && ` | Conv: ${formatPercentage(stage.percentage)}`}
                      </p>
                      {isClickable && (
                        <p className="text-xs text-rillation-purple mt-1">Click to view leads</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Side label with arrow for narrow stages */}
                {isNarrow && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                    <div className="flex items-center gap-1">
                      <span className="text-rillation-text-muted text-xs font-medium">
                        {stage.name}
                      </span>
                      <span className="text-rillation-purple">→</span>
                    </div>
                    {stage.percentage !== undefined && index > 0 && (
                      <span className="text-rillation-text-muted text-xs">
                        {formatPercentage(stage.percentage)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
