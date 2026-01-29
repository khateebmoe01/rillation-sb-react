import { ReactNode, CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { theme } from '../../config/theme'

interface GlowCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  hover?: boolean
  animated?: boolean
}

export function GlowCard({ 
  children, 
  className = '', 
  style = {},
  hover = true,
  animated = true
}: GlowCardProps) {
  const Component = animated ? motion.div : 'div'
  
  const baseStyle: CSSProperties = {
    position: 'relative',
    borderRadius: theme.radius.xl,
    backgroundColor: theme.bg.card,
    border: `1px solid ${theme.border.default}`,
    boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.05),
                0 1px 3px rgba(0, 0, 0, 0.5)`,
    ...style,
  }

  const hoverAnimation = hover ? {
    whileHover: {
      boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.15),
                  0 0 20px rgba(17, 119, 84, 0.15),
                  0 1px 3px rgba(0, 0, 0, 0.5)`,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    transition: { duration: 0.2 }
  } : {}

  if (!animated) {
    return (
      <div 
        className={className}
        style={baseStyle}
      >
        {children}
      </div>
    )
  }

  return (
    <Component
      className={className}
      style={baseStyle}
      {...hoverAnimation}
    >
      {children}
    </Component>
  )
}

interface GlowTableRowProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export function GlowTableRow({ 
  children, 
  className = '', 
  style = {},
  onClick 
}: GlowTableRowProps) {
  return (
    <motion.tr
      className={className}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: `1px solid ${theme.border.subtle}`,
        ...style,
      }}
      whileHover={{
        backgroundColor: theme.bg.hover,
        boxShadow: `inset 0 0 0 1px rgba(255, 255, 255, 0.05)`,
      }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
    >
      {children}
    </motion.tr>
  )
}
