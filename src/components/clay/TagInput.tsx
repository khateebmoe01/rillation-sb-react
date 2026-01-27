import { useState, useRef, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'

interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  label?: string
  maxTags?: number
  className?: string
  variant?: 'default' | 'include' | 'exclude'
}

export default function TagInput({
  value,
  onChange,
  placeholder = 'Type and press Enter...',
  label,
  maxTags,
  className = '',
  variant = 'default',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue.trim())
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace when input is empty
      onChange(value.slice(0, -1))
    }
  }

  const addTag = (tag: string) => {
    if (maxTags && value.length >= maxTags) return
    if (!value.includes(tag)) {
      onChange([...value, tag])
    }
    setInputValue('')
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  const handleClearAll = () => {
    onChange([])
    inputRef.current?.focus()
  }

  const variantStyles = {
    default: {
      tag: 'bg-white/10 text-rillation-text',
      border: 'border-rillation-border',
    },
    include: {
      tag: 'bg-green-500/20 text-green-400',
      border: 'border-green-500/30',
    },
    exclude: {
      tag: 'bg-red-500/20 text-red-400',
      border: 'border-red-500/30',
    },
  }

  const styles = variantStyles[variant]

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
              Clear all
            </button>
          )}
        </div>
      )}

      <div
        className={`min-h-[44px] flex flex-wrap items-center gap-1.5 p-2 bg-rillation-card border ${styles.border} rounded-lg focus-within:border-white/30 transition-colors cursor-text`}
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence mode="popLayout">
          {value.map((tag) => (
            <motion.span
              key={tag}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              layout
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${styles.tag}`}
            >
              <span className="max-w-[200px] truncate">{tag}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(tag)
                }}
                className="hover:opacity-70 transition-opacity"
              >
                <X size={10} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        {(!maxTags || value.length < maxTags) && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-rillation-text placeholder:text-rillation-text/40 outline-none"
          />
        )}
      </div>

      {maxTags && (
        <p className="mt-1.5 text-xs text-rillation-text/50">
          {value.length}/{maxTags} added
        </p>
      )}
    </div>
  )
}

// URL-specific tag input for lookalike companies
interface UrlTagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  label?: string
  maxUrls?: number
  className?: string
}

export function UrlTagInput({
  value,
  onChange,
  placeholder = 'Enter company LinkedIn URL or domain...',
  label,
  maxUrls = 10,
  className = '',
}: UrlTagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const validateUrl = (url: string): boolean => {
    // Basic validation - accept domains or URLs
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-]*)*\/?$/i
    return urlPattern.test(url)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      addUrl(inputValue.trim())
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
      setError('')
    }
  }

  const addUrl = (url: string) => {
    if (value.length >= maxUrls) {
      setError(`Maximum ${maxUrls} companies allowed`)
      return
    }
    if (!validateUrl(url)) {
      setError('Please enter a valid URL or domain')
      return
    }
    if (!value.includes(url)) {
      onChange([...value, url])
      setError('')
    }
    setInputValue('')
  }

  const removeUrl = (urlToRemove: string) => {
    onChange(value.filter(url => url !== urlToRemove))
    setError('')
  }

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-rillation-text">
            {label}
          </label>
          <span className="text-xs text-rillation-text/50">
            {value.length}/{maxUrls}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {/* URL List */}
        <AnimatePresence mode="popLayout">
          {value.map((url, index) => (
            <motion.div
              key={url}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              layout
              className="flex items-center gap-2 p-2 bg-rillation-card border border-rillation-border rounded-lg"
            >
              <span className="w-5 h-5 flex items-center justify-center bg-white/10 rounded text-xs text-rillation-text/70">
                {index + 1}
              </span>
              <span className="flex-1 text-sm text-rillation-text truncate">
                {url}
              </span>
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="p-1 text-rillation-text/50 hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add URL Input */}
        {value.length < maxUrls && (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setError('')
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 bg-rillation-card border border-rillation-border rounded-lg text-sm text-rillation-text placeholder:text-rillation-text/40 focus:outline-none focus:border-white/30 transition-colors pr-10"
            />
            <button
              type="button"
              onClick={() => inputValue.trim() && addUrl(inputValue.trim())}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-rillation-text/50 hover:text-rillation-text transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    </div>
  )
}
