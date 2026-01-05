import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div 
      className="relative bg-slate-800/60 rounded-xl p-4 border border-slate-700/50"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Animated white border on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              boxShadow: [
                '0 0 0px rgba(255, 255, 255, 0)',
                '0 0 15px rgba(255, 255, 255, 0.3)',
                '0 0 0px rgba(255, 255, 255, 0)'
              ]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.2,
              boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
            }}
            style={{ border: '2px solid white' }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative z-10 mb-2">
        <span className="text-xs font-medium text-white uppercase tracking-wider">
          {title}
        </span>
      </div>
      
      {/* Value */}
      <div className="relative z-10 flex items-baseline gap-2">
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
        <p className="relative z-10 text-xs text-white/70 mt-1">
          {percentageLabel}
        </p>
      )}
      
      {/* Trend */}
      {trend && trendValue && trendValue !== '-' && (
        <div className={`relative z-10 flex items-center gap-1 mt-2 text-xs ${
          trend === 'up' ? 'text-green-400' : 
          trend === 'down' ? 'text-red-400' : 
          'text-white'
        }`}>
          {trend === 'up' && <TrendingUp size={12} />}
          {trend === 'down' && <TrendingDown size={12} />}
          <span>{trendValue}</span>
        </div>
      )}
    </motion.div>
  )
}
