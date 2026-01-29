import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { theme } from '../../config/theme'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
  onClear?: () => void
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, icon, onClear, className = '', style, ...props }, ref) {
    return (
      <div className={className} style={{ width: '100%' }}>
        {label && (
          <label
            style={{
              display: 'block',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              color: theme.text.secondary,
              marginBottom: 6,
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          {icon && (
            <div
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: theme.text.muted,
                pointerEvents: 'none',
              }}
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            style={{
              width: '100%',
              height: 40,
              padding: icon ? '0 36px 0 40px' : '0 12px',
              paddingRight: onClear ? 36 : 12,
              fontSize: theme.fontSize.base,
              backgroundColor: theme.bg.card,
              color: theme.text.primary,
              border: `1px solid ${error ? theme.status.error : theme.border.default}`,
              borderRadius: theme.radius.lg,
              outline: 'none',
              transition: `border-color ${theme.transition.fast}, box-shadow ${theme.transition.fast}`,
              ...style,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.border.focus
              e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.accent.primaryBg}`
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? theme.status.error : theme.border.default
              e.currentTarget.style.boxShadow = 'none'
            }}
            {...props}
          />
          {onClear && props.value && (
            <button
              type="button"
              onClick={onClear}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                padding: 4,
                backgroundColor: 'transparent',
                border: 'none',
                color: theme.text.muted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radius.sm,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {error && (
          <p
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.status.error,
              marginTop: 4,
            }}
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

// Search input variant
interface SearchInputProps extends Omit<InputProps, 'icon'> {
  onSearch?: (value: string) => void
}

export function SearchInput({ onSearch, onChange, ...props }: SearchInputProps) {
  return (
    <Input
      icon={<Search size={16} />}
      placeholder="Search..."
      onChange={(e) => {
        onChange?.(e)
        onSearch?.(e.target.value)
      }}
      {...props}
    />
  )
}

// Textarea
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, className = '', style, ...props }, ref) {
    return (
      <div className={className} style={{ width: '100%' }}>
        {label && (
          <label
            style={{
              display: 'block',
              fontSize: theme.fontSize.sm,
              fontWeight: theme.fontWeight.medium,
              color: theme.text.secondary,
              marginBottom: 6,
            }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          style={{
            width: '100%',
            minHeight: 100,
            padding: 12,
            fontSize: theme.fontSize.base,
            backgroundColor: theme.bg.card,
            color: theme.text.primary,
            border: `1px solid ${error ? theme.status.error : theme.border.default}`,
            borderRadius: theme.radius.lg,
            outline: 'none',
            resize: 'vertical',
            transition: `border-color ${theme.transition.fast}, box-shadow ${theme.transition.fast}`,
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.border.focus
            e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.accent.primaryBg}`
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? theme.status.error : theme.border.default
            e.currentTarget.style.boxShadow = 'none'
          }}
          {...props}
        />
        {error && (
          <p
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.status.error,
              marginTop: 4,
            }}
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)
