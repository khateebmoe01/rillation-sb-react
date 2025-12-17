import { ReactNode } from 'react'
import { formatNumber, formatPercentage } from '../../lib/supabase'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface ClickableMetricCardProps {
  title: string
  value: number
  percentage?: number
  percentageLabel?: string
  icon: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  colorClass?: string
  isClickable?: boolean
  isActive?: boolean
  onClick?: () => void
}

export default function ClickableMetricCard({
  title,
  value,
  percentage,
  percentageLabel,
  icon,
  trend,
  trendValue,
  colorClass = 'text-rillation-purple',
  isClickable = false,
  isActive = false,
  onClick,
}: ClickableMetricCardProps) {
  return (
    <div 
      className={`
        metric-card bg-rillation-card rounded-xl p-5 card-glow
        ${isClickable ? 'cursor-pointer hover:border-rillation-purple/50' : ''}
        ${isActive ? 'ring-2 ring-rillation-purple border-rillation-purple' : ''}
      `}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={colorClass}>{icon}</span>
        <span className="text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
          {title}
        </span>
        {isClickable && (
          <span className="ml-auto text-xs text-rillation-purple opacity-0 group-hover:opacity-100 transition-opacity">
            Click to view
          </span>
        )}
      </div>
      
      {/* Value */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-rillation-text">
          {formatNumber(value)}
        </span>
        
        {percentage !== undefined && (
          <span className="text-sm text-rillation-text-muted">
            {formatPercentage(percentage)}
          </span>
        )}
      </div>
      
      {/* Percentage Label */}
      {percentageLabel && (
        <p className="text-xs text-rillation-text-muted mt-1">
          {percentageLabel}
        </p>
      )}
      
      {/* Trend */}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${
          trend === 'up' ? 'text-rillation-green' : 
          trend === 'down' ? 'text-rillation-red' : 
          'text-rillation-text-muted'
        }`}>
          {trend === 'up' && <TrendingUp size={14} />}
          {trend === 'down' && <TrendingDown size={14} />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  )
}

