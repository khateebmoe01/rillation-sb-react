import { formatNumber, formatPercentage } from '../../lib/supabase'

interface ClickableMetricCardProps {
  title: string
  value: number
  percentage?: number
  percentageLabel?: string
  colorClass?: string
  isActive?: boolean
  onClick?: () => void
}

export default function ClickableMetricCard({
  title,
  value,
  percentage,
  percentageLabel,
  colorClass = 'text-white',
  isActive = false,
  onClick,
}: ClickableMetricCardProps) {
  return (
    <div 
      className={`
        bg-slate-800/60 rounded-xl p-4 border transition-all cursor-pointer
        hover:border-white/50 hover:bg-slate-700/60
        ${isActive ? 'ring-2 ring-white border-white bg-slate-700/60' : 'border-slate-700/50'}
      `}
      onClick={onClick}
    >
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
    </div>
  )
}
