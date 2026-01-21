// Rillation CRM Design Theme
// A distinctive, modern dark theme with Rillation Green accents

export const theme = {
  // Background layers
  bg: {
    page: '#09090b',        // zinc-950 - deepest
    card: '#0f0f12',        // card surfaces
    elevated: '#16161a',    // modals, dropdowns
    hover: '#1c1c21',       // hover states
    active: '#232329',      // active/selected
    muted: '#27272a',       // muted backgrounds
  },
  
  // Borders
  border: {
    subtle: '#1f1f23',
    default: '#27272a',     // zinc-800
    strong: '#3f3f46',      // zinc-700
    focus: '#117754',       // rillation-green
  },
  
  // Text
  text: {
    primary: '#fafafa',     // zinc-50
    secondary: '#e8e7e3',   // pearly white - warm off-white
    muted: '#d4d3cf',       // pearly white muted - soft luminous
    disabled: '#a8a7a3',    // pearly white disabled
    inverse: '#09090b',
  },
  
  // Primary accent - Rillation Green
  accent: {
    primary: '#117754',     // rillation-green
    primaryHover: '#0d5f43', // rillation-green-dark
    primaryLight: '#15a374', // rillation-green-light
    primaryBg: 'rgba(17, 119, 84, 0.15)',
  },
  
  // Secondary accent - Teal
  secondary: {
    main: '#14b8a6',        // teal-500
    hover: '#0d9488',       // teal-600
    bg: 'rgba(20, 184, 166, 0.15)',
  },
  
  // Status colors
  status: {
    success: '#22c55e',     // green-500
    successBg: 'rgba(34, 197, 94, 0.15)',
    warning: '#f59e0b',     // amber-500
    warningBg: 'rgba(245, 158, 11, 0.15)',
    error: '#ef4444',       // red-500
    errorBg: 'rgba(239, 68, 68, 0.15)',
    info: '#3b82f6',        // blue-500
    infoBg: 'rgba(59, 130, 246, 0.15)',
  },
  
  // Entity-specific colors
  entity: {
    company: '#8b5cf6',     // violet-500
    companyBg: 'rgba(139, 92, 246, 0.15)',
    contact: '#06b6d4',     // cyan-500
    contactBg: 'rgba(6, 182, 212, 0.15)',
    deal: '#f59e0b',        // amber-500
    dealBg: 'rgba(245, 158, 11, 0.15)',
    task: '#22c55e',        // green-500
    taskBg: 'rgba(34, 197, 94, 0.15)',
  },
  
  // Contact status colors
  contactStatus: {
    cold: { color: '#c4c3bf', bg: '#1e293b' },  // pearly gray-blue
    warm: { color: '#fbbf24', bg: '#422006' },
    hot: { color: '#f87171', bg: '#450a0a' },
    'in-contract': { color: '#a78bfa', bg: '#3d2f5c' },
    customer: { color: '#22c55e', bg: '#14532d' },
    inactive: { color: '#d4d3cf', bg: '#27272a' },  // pearly white
  },
  
  // Company status colors
  companyStatus: {
    prospect: { color: '#c4c3bf', bg: '#1e293b' },  // pearly gray-blue
    lead: { color: '#60a5fa', bg: '#1e3a5f' },
    customer: { color: '#22c55e', bg: '#14532d' },
    partner: { color: '#a78bfa', bg: '#3d2f5c' },
    churned: { color: '#f87171', bg: '#450a0a' },
    inactive: { color: '#d4d3cf', bg: '#27272a' },  // pearly white
  },
  
  // Shadows
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px rgba(99, 102, 241, 0.3)',
    dropdown: '0 10px 40px -4px rgba(0, 0, 0, 0.7)',
  },
  
  // Border radius
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '9999px',
  },
  
  // Typography
  font: {
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  },
  
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '30px',
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Transitions
  transition: {
    fast: '100ms ease',
    normal: '150ms ease',
    slow: '250ms ease',
    spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  
  // Z-index scale
  z: {
    base: 0,
    dropdown: 50,
    sticky: 100,
    modal: 200,
    toast: 300,
    tooltip: 400,
  },
  
  // Spacing (based on 4px)
  space: {
    0: '0',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
} as const

export type Theme = typeof theme
