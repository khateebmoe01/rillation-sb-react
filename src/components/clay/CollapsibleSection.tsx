import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string | number
  className?: string
}

export default function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
  className = '',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`bg-rillation-card border border-rillation-border rounded-xl overflow-hidden ${className}`}>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-rillation-card-hover transition-colors"
        whileHover={{ backgroundColor: 'rgba(26, 26, 26, 0.5)' }}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="text-rillation-text/80">
              {icon}
            </span>
          )}
          <span className="text-sm font-medium text-rillation-text">
            {title}
          </span>
          {badge !== undefined && badge !== 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-white/10 text-rillation-text rounded-full">
              {badge}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <ChevronDown size={16} className="text-rillation-text/70" />
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="px-4 pb-4 border-t border-rillation-border/50">
              <div className="pt-4">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
