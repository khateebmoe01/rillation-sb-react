import { ReactNode } from 'react'
import { theme } from '../../config/theme'

interface BadgeProps {
  children: ReactNode
  color?: string
  bgColor?: string
  variant?: 'filled' | 'outline' | 'subtle'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({
  children,
  color = theme.text.primary,
  bgColor = theme.bg.muted,
  variant = 'subtle',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const sizeStyles = {
    sm: {
      fontSize: theme.fontSize.xs,
      padding: '2px 8px',
    },
    md: {
      fontSize: theme.fontSize.sm,
      padding: '4px 10px',
    },
  }
  
  const variantStyles = {
    filled: {
      backgroundColor: color,
      color: theme.text.inverse,
      border: 'none',
    },
    outline: {
      backgroundColor: 'transparent',
      color,
      border: `1px solid ${color}`,
    },
    subtle: {
      backgroundColor: bgColor,
      color,
      border: 'none',
    },
  }
  
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: theme.radius.full,
        fontWeight: theme.fontWeight.medium,
        whiteSpace: 'nowrap',
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
    >
      {children}
    </span>
  )
}

// Pre-styled status badges
interface StatusBadgeProps {
  status: string
  type: 'company' | 'contact' | 'deal'
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  let colorConfig: { color: string; bg: string } = { color: theme.text.muted, bg: theme.bg.muted }
  
  if (type === 'company' && status in theme.companyStatus) {
    colorConfig = theme.companyStatus[status as keyof typeof theme.companyStatus]
  } else if (type === 'contact' && status in theme.contactStatus) {
    colorConfig = theme.contactStatus[status as keyof typeof theme.contactStatus]
  }
  
  // Format the status label
  const label = status
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  return (
    <Badge color={colorConfig.color} bgColor={colorConfig.bg}>
      {label}
    </Badge>
  )
}
