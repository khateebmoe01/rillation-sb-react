import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface NumberInputProps {
  value: number | null
  onChange: (value: number | null) => void
  label?: string
  placeholder?: string
  min?: number
  max?: number
  step?: number
  className?: string
}

export default function NumberInput({
  value,
  onChange,
  label,
  placeholder = 'Enter number...',
  min,
  max,
  step = 1,
  className = '',
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value?.toString() || '')
  const [error, setError] = useState('')

  useEffect(() => {
    setInputValue(value?.toString() || '')
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    setError('')

    if (val === '') {
      onChange(null)
      return
    }

    const num = parseInt(val, 10)
    if (isNaN(num)) {
      setError('Please enter a valid number')
      return
    }

    if (min !== undefined && num < min) {
      setError(`Minimum value is ${min}`)
      return
    }

    if (max !== undefined && num > max) {
      setError(`Maximum value is ${max}`)
      return
    }

    onChange(num)
  }

  const handleBlur = () => {
    if (inputValue && !error) {
      const num = parseInt(inputValue, 10)
      if (!isNaN(num)) {
        if (min !== undefined && num < min) {
          onChange(min)
          setInputValue(min.toString())
        } else if (max !== undefined && num > max) {
          onChange(max)
          setInputValue(max.toString())
        }
      }
    }
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-rillation-text mb-2">
          {label}
        </label>
      )}

      <motion.input
        type="number"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={`w-full px-3 py-2.5 bg-rillation-card border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text/40 focus:outline-none transition-colors ${
          error
            ? 'border-red-500/50 focus:border-red-500'
            : 'border-rillation-border focus:border-white/30'
        }`}
        whileFocus={{ scale: 1.005 }}
      />

      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}

// Range input for min/max values
interface NumberRangeInputProps {
  minValue: number | null
  maxValue: number | null
  onMinChange: (value: number | null) => void
  onMaxChange: (value: number | null) => void
  label?: string
  minPlaceholder?: string
  maxPlaceholder?: string
  className?: string
}

export function NumberRangeInput({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  label,
  minPlaceholder = 'Min',
  maxPlaceholder = 'Max',
  className = '',
}: NumberRangeInputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-rillation-text mb-2">
          {label}
        </label>
      )}

      <div className="flex items-center gap-3">
        <NumberInput
          value={minValue}
          onChange={onMinChange}
          placeholder={minPlaceholder}
          min={0}
          className="flex-1"
        />
        <span className="text-rillation-text/40">to</span>
        <NumberInput
          value={maxValue}
          onChange={onMaxChange}
          placeholder={maxPlaceholder}
          min={minValue || 0}
          className="flex-1"
        />
      </div>
    </div>
  )
}
