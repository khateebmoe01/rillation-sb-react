import { motion, AnimatePresence } from 'framer-motion'
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
    <motion.div 
      className="relative bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 transition-colors cursor-pointer hover:bg-slate-700/60"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {/* Animated white border */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Animated border glow */}
            <motion.div
              className="absolute inset-0 rounded-xl border-2 border-white"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                boxShadow: [
                  '0 0 0px rgba(255, 255, 255, 0)',
                  '0 0 15px rgba(255, 255, 255, 0.3)',
                  '0 0 0px rgba(255, 255, 255, 0)'
                ]
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                duration: 0.3, 
                boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover border animation */}
      <motion.div
        className="absolute inset-0 rounded-xl border-2 border-white/0 pointer-events-none"
        whileHover={{ borderColor: 'rgba(255, 255, 255, 0.5)' }}
        transition={{ duration: 0.2 }}
      />

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
    </motion.div>
  )
}
