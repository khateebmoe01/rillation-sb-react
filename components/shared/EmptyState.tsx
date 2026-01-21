import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { theme } from '../../config/theme'
import { Button } from './Button'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: theme.radius.xl,
          backgroundColor: theme.bg.muted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.text.muted,
          marginBottom: 20,
        }}
      >
        {icon}
      </div>
      
      <h3
        style={{
          fontSize: theme.fontSize.lg,
          fontWeight: theme.fontWeight.semibold,
          color: theme.text.primary,
          margin: 0,
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      
      {description && (
        <p
          style={{
            fontSize: theme.fontSize.base,
            color: theme.text.muted,
            margin: 0,
            maxWidth: 400,
            marginBottom: action ? 24 : 0,
          }}
        >
          {description}
        </p>
      )}
      
      {action && (
        <Button
          onClick={action.onClick}
          icon={action.icon}
        >
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}

// Loading skeleton
export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          style={{
            height: 48,
            backgroundColor: theme.bg.muted,
            borderRadius: theme.radius.lg,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{
              x: ['0%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg, transparent, ${theme.bg.hover}, transparent)`,
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}
