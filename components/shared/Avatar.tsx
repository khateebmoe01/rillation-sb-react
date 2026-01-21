import { theme } from '../../config/theme'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  sm: 28,
  md: 36,
  lg: 44,
  xl: 64,
}

const fontSizeMap = {
  sm: theme.fontSize.xs,
  md: theme.fontSize.sm,
  lg: theme.fontSize.md,
  xl: theme.fontSize.xl,
}

// Generate a consistent color from a string
function stringToColor(str: string): string {
  const colors = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f43f5e', // rose
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#3b82f6', // blue
  ]
  
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const dimension = sizeMap[size]
  const fontSize = fontSizeMap[size]
  const initials = getInitials(name)
  const bgColor = stringToColor(name || 'unknown')
  
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={className}
        style={{
          width: dimension,
          height: dimension,
          borderRadius: theme.radius.full,
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    )
  }
  
  return (
    <div
      className={className}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: theme.radius.full,
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: theme.fontWeight.semibold,
        color: 'white',
        flexShrink: 0,
        textTransform: 'uppercase',
      }}
    >
      {initials}
    </div>
  )
}
