import { formatNumber, formatPercentage } from '../../lib/supabase'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: number
  percentage?: number
  percentageLabel?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  colorClass?: string
}

export default function MetricCard({
  title,
  value,
  percentage,
  percentageLabel,
  trend,
  trendValue,
  colorClass = 'text-white',
}: MetricCardProps) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
      {/* Header */}
      <div className="mb-2">
        <span className="text-xs font-medium text-white uppercase tracking-wider">
          {title}
        </span>
      </div>
      
      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${colorClass}`}>
          {formatNumber(value)}
        </span>
        
        {percentage !== undefined && (
          <span className="text-sm text-white">
            {formatPercentage(percentage)}
          </span>
        )}
      </div>
      
      {/* Percentage Label */}
      {percentageLabel && (
        <p className="text-xs text-white/70 mt-1">
          {percentageLabel}
        </p>
      )}
      
      {/* Trend */}
      {trend && trendValue && trendValue !== '-' && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${
          trend === 'up' ? 'text-green-400' : 
          trend === 'down' ? 'text-red-400' : 
          'text-white'
        }`}>
          {trend === 'up' && <TrendingUp size={12} />}
          {trend === 'down' && <TrendingDown size={12} />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  )
}
