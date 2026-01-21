import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { theme } from '../../config/theme'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  loading?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, { bg: string; bgHover: string; color: string; border?: string }> = {
  primary: {
    bg: theme.accent.primary,
    bgHover: theme.accent.primaryHover,
    color: 'white',
  },
  secondary: {
    bg: theme.bg.muted,
    bgHover: theme.bg.hover,
    color: theme.text.primary,
    border: theme.border.default,
  },
  ghost: {
    bg: 'transparent',
    bgHover: theme.bg.hover,
    color: theme.text.secondary,
  },
  danger: {
    bg: theme.status.error,
    bgHover: '#dc2626',
    color: 'white',
  },
  success: {
    bg: theme.status.success,
    bgHover: '#16a34a',
    color: 'white',
  },
}

const sizeStyles: Record<ButtonSize, { padding: string; fontSize: string; height: number; iconSize: number }> = {
  sm: { padding: '0 12px', fontSize: theme.fontSize.sm, height: 32, iconSize: 14 },
  md: { padding: '0 16px', fontSize: theme.fontSize.base, height: 38, iconSize: 16 },
  lg: { padding: '0 24px', fontSize: theme.fontSize.md, height: 44, iconSize: 18 },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps & HTMLMotionProps<'button'>>(
  function Button(
    {
      children,
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      fullWidth = false,
      disabled,
      ...props
    },
    ref
  ) {
    const v = variantStyles[variant]
    const s = sizeStyles[size]
    
    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.98 } : undefined}
        disabled={disabled || loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: s.padding,
          height: s.height,
          fontSize: s.fontSize,
          fontWeight: theme.fontWeight.medium,
          backgroundColor: v.bg,
          color: v.color,
          border: v.border ? `1px solid ${v.border}` : 'none',
          borderRadius: theme.radius.lg,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          width: fullWidth ? '100%' : 'auto',
          transition: `background-color ${theme.transition.fast}`,
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.backgroundColor = v.bgHover
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = v.bg
        }}
        {...props}
      >
        {loading ? (
          <LoadingSpinner size={s.iconSize} />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
            )}
            {children}
            {icon && iconPosition === 'right' && (
              <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>
            )}
          </>
        )}
      </motion.button>
    )
  }
)

function LoadingSpinner({ size }: { size: number }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      style={{
        width: size,
        height: size,
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
      }}
    />
  )
}

// Icon-only button variant
interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  icon: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  label: string // For accessibility
}

export function IconButton({ icon, variant = 'ghost', size = 'md', label, ...props }: IconButtonProps) {
  const v = variantStyles[variant]
  const s = sizeStyles[size]
  
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label={label}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s.height,
        height: s.height,
        backgroundColor: v.bg,
        color: v.color,
        border: v.border ? `1px solid ${v.border}` : 'none',
        borderRadius: theme.radius.lg,
        cursor: 'pointer',
        transition: `background-color ${theme.transition.fast}`,
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = v.bgHover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = v.bg
      }}
      {...props}
    >
      {icon}
    </motion.button>
  )
}
