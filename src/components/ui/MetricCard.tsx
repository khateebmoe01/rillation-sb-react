import { ReactNode } from 'react'
import { formatNumber, formatPercentage } from '../../lib/supabase'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: number
  percentage?: number
  percentageLabel?: string
  icon: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  colorClass?: string
}

export default function MetricCard({
  title,
  value,
  percentage,
  percentageLabel,
  icon,
  trend,
  trendValue,
  colorClass = 'text-rillation-text-muted',
}: MetricCardProps) {
  return (
    <div className="metric-card bg-rillation-card rounded-xl p-5 card-glow">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={colorClass}>{icon}</span>
        <span className="text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
          {title}
        </span>
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

