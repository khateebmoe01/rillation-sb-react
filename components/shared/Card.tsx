import { ReactNode, CSSProperties } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { theme } from '../../config/theme'

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'style'> {
  children: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  selected?: boolean
  onClick?: () => void
  style?: CSSProperties
  className?: string
}

const paddingMap = {
  none: 0,
  sm: 12,
  md: 16,
  lg: 24,
}

export function Card({
  children,
  padding = 'md',
  hover = false,
  selected = false,
  onClick,
  style,
  className = '',
  ...motionProps
}: CardProps) {
  const baseBoxShadow = `0 0 0 1px rgba(255, 255, 255, 0.05), 0 1px 3px rgba(0, 0, 0, 0.5)`
  const hoverBoxShadow = `0 0 0 1px rgba(255, 255, 255, 0.15), 0 0 20px rgba(17, 119, 84, 0.15), 0 1px 3px rgba(0, 0, 0, 0.5)`
  const selectedBoxShadow = `0 0 0 1px ${theme.accent.primary}, 0 0 25px rgba(17, 119, 84, 0.25), 0 1px 3px rgba(0, 0, 0, 0.5)`
  
  return (
    <motion.div
      className={className}
      onClick={onClick}
      initial={false}
      whileHover={hover ? { 
        scale: 1.01, 
        y: -2,
        boxShadow: hoverBoxShadow,
        borderColor: 'rgba(255, 255, 255, 0.15)',
      } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.15 }}
      style={{
        backgroundColor: theme.bg.card,
        borderRadius: theme.radius.xl,
        border: `1px solid ${selected ? theme.accent.primary : theme.border.default}`,
        padding: paddingMap[padding],
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: selected ? selectedBoxShadow : baseBoxShadow,
        ...style,
      }}
      {...motionProps}
    >
      {children}
    </motion.div>
  )
}

// Section header for cards
interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 16,
      }}
    >
      <div>
        <h3
          style={{
            fontSize: theme.fontSize.lg,
            fontWeight: theme.fontWeight.semibold,
            color: theme.text.primary,
            margin: 0,
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            style={{
              fontSize: theme.fontSize.sm,
              color: theme.text.muted,
              margin: '4px 0 0 0',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
