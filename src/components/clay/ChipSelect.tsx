import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface ChipSelectProps {
  options: readonly string[] | string[]
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  columns?: 2 | 3 | 4
  className?: string
}

export default function ChipSelect({
  options,
  value,
  onChange,
  label,
  columns = 3,
  className = '',
}: ChipSelectProps) {
  const handleToggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  const handleSelectAll = () => {
    onChange([...options])
  }

  const handleClearAll = () => {
    onChange([])
  }

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  }

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-rillation-text">
            {label}
          </label>
          <div className="flex items-center gap-3">
            {value.length > 0 && (
              <span className="text-xs text-rillation-text/60">
                {value.length} selected
              </span>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-rillation-text/60 hover:text-rillation-text transition-colors"
              >
                Select all
              </button>
              <span className="text-rillation-text/30">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-rillation-text/60 hover:text-rillation-text transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`grid ${gridCols[columns]} gap-2`}>
        {options.map((option) => {
          const isSelected = value.includes(option)
          return (
            <motion.button
              key={option}
              type="button"
              onClick={() => handleToggle(option)}
              className={`relative flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-white text-black'
                  : 'bg-rillation-card border border-rillation-border text-rillation-text hover:border-white/20'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute left-2"
                >
                  <Check size={12} />
                </motion.span>
              )}
              <span className={isSelected ? 'pl-3' : ''}>
                {option}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// Compact chip variant for smaller sections
interface CompactChipSelectProps {
  options: readonly string[] | string[]
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  className?: string
}

export function CompactChipSelect({
  options,
  value,
  onChange,
  label,
  className = '',
}: CompactChipSelectProps) {
  const handleToggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  const handleClearAll = () => {
    onChange([])
  }

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-rillation-text">
            {label}
          </label>
          {value.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-rillation-text/60 hover:text-rillation-text transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = value.includes(option)
          return (
            <motion.button
              key={option}
              type="button"
              onClick={() => handleToggle(option)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-white text-black'
                  : 'bg-rillation-card border border-rillation-border text-rillation-text hover:border-white/20'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {option}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
