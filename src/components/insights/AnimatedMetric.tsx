import { useEffect, useRef, useState } from 'react'
import { motion, useSpring, useTransform, useInView } from 'framer-motion'

interface AnimatedMetricProps {
  value: number
  label: string
  icon?: React.ReactNode
  colorClass?: string
  suffix?: string
  prefix?: string
  decimals?: number
  onClick?: () => void
  isActive?: boolean
  subLabel?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

export default function AnimatedMetric({
  value,
  label,
  icon,
  colorClass = 'text-slate-400',
  suffix = '',
  prefix = '',
  decimals = 0,
  onClick,
  isActive = false,
  subLabel,
  trend,
  trendValue,
}: AnimatedMetricProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [hasAnimated, setHasAnimated] = useState(false)

  // Spring animation for the number
  const spring = useSpring(0, {
    stiffness: 75,
    damping: 30,
    mass: 1,
  })

  const displayValue = useTransform(spring, (latest) => {
    if (decimals > 0) {
      return latest.toFixed(decimals)
    }
    return Math.round(latest).toLocaleString()
  })

  useEffect(() => {
    if (isInView && !hasAnimated) {
      spring.set(value)
      setHasAnimated(true)
    }
  }, [isInView, value, spring, hasAnimated])

  // Update value when it changes (after initial animation)
  useEffect(() => {
    if (hasAnimated) {
      spring.set(value)
    }
  }, [value, spring, hasAnimated])

  const getTrendColor = () => {
    if (trend === 'up') return 'text-rillation-green'
    if (trend === 'down') return 'text-rillation-red'
    return 'text-rillation-text-muted'
  }

  const getTrendIcon = () => {
    if (trend === 'up') return '↑'
    if (trend === 'down') return '↓'
    return ''
  }

  return (
    <motion.div
      ref={ref}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl p-4 
        bg-rillation-card border border-rillation-border
        transition-all duration-300
        ${onClick ? 'cursor-pointer hover:border-slate-400/50 hover:shadow-lg hover:shadow-slate-400/10' : ''}
        ${isActive ? 'border-slate-400 shadow-lg shadow-slate-400/20 ring-1 ring-slate-400/30' : ''}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Gradient glow effect on hover */}
      <motion.div
        className={`absolute inset-0 opacity-0 ${isActive ? 'opacity-100' : ''}`}
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(148, 163, 184, 0.1), transparent 70%)',
        }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative z-10">
        {/* Icon and Label Row */}
        <div className="flex items-center gap-2 mb-2">
          {icon && (
            <motion.div
              className={colorClass}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
            >
              {icon}
            </motion.div>
          )}
          <span className="text-xs font-medium text-rillation-text-muted uppercase tracking-wider">
            {label}
          </span>
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1">
          {prefix && <span className={`text-lg ${colorClass}`}>{prefix}</span>}
          <motion.span className={`text-2xl font-bold ${colorClass}`}>
            {displayValue}
          </motion.span>
          {suffix && <span className={`text-sm ${colorClass}`}>{suffix}</span>}
        </div>

        {/* Sub label or trend */}
        {(subLabel || (trend && trendValue)) && (
          <div className="mt-1 flex items-center gap-2">
            {subLabel && (
              <span className="text-xs text-rillation-text-muted">{subLabel}</span>
            )}
            {trend && trendValue && (
              <span className={`text-xs ${getTrendColor()}`}>
                {getTrendIcon()} {trendValue}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Active indicator line */}
      {isActive && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-400 to-slate-300"
          layoutId="activeIndicator"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </motion.div>
  )
}









