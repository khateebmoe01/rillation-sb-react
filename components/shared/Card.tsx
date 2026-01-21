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
  return (
    <motion.div
      className={className}
      onClick={onClick}
      whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.15 }}
      style={{
        backgroundColor: theme.bg.card,
        borderRadius: theme.radius.xl,
        border: `1px solid ${selected ? theme.accent.primary : theme.border.default}`,
        padding: paddingMap[padding],
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: selected ? theme.shadow.glow : 'none',
        transition: `border-color ${theme.transition.normal}, box-shadow ${theme.transition.normal}`,
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
