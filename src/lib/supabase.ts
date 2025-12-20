import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper function to format numbers with commas
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

// Helper function to format percentages
export function formatPercentage(num: number, decimals: number = 1): string {
  return `${num.toFixed(decimals)}%`
}

// Helper function to format currency
export function formatCurrency(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

// Date helpers
export function getDateRange(preset: string): { start: Date; end: Date } {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  
  switch (preset) {
    case 'today':
      return { start, end: today }
    
    case 'thisWeek': {
      const dayOfWeek = start.getDay()
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      start.setDate(diff)
      return { start, end: today }
    }
    
    case 'lastWeek': {
      const dayOfWeek = start.getDay()
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) - 7
      start.setDate(diff)
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    
    case 'thisMonth':
      start.setDate(1)
      return { start, end: today }
    
    case 'lastMonth': {
      start.setMonth(start.getMonth() - 1)
      start.setDate(1)
      const end = new Date(start)
      end.setMonth(end.getMonth() + 1)
      end.setDate(0)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    
    default:
      return { start, end: today }
  }
}

export function formatDateForQuery(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// For timestamp fields, format the END of day to include the entire day
export function formatDateForQueryEndOfDay(date: Date): string {
  const nextDay = new Date(date)
  nextDay.setDate(nextDay.getDate() + 1)
  const year = nextDay.getFullYear()
  const month = String(nextDay.getMonth() + 1).padStart(2, '0')
  const day = String(nextDay.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  })
}

// Normalize provider names for display
export function normalizeProviderName(provider: string | null | undefined): string {
  if (!provider) return '-'
  
  const normalized = provider.toLowerCase().trim()
  
  // Google variants
  if (normalized.includes('google') || normalized === 'google_workplace_auth' || normalized === 'google_workspace' || normalized === 'gmail') {
    return 'Google'
  }
  
  // Microsoft/Outlook variants
  if (normalized === 'microsoft' || normalized.includes('outlook') || normalized === 'microsoft_oauth') {
    return 'Outlook'
  }
  
  // Custom/SMTP variants
  if (normalized === 'custom' || normalized === 'smtp' || normalized === 'custom_smtp') {
    return 'SMTP'
  }
  
  // Return original with first letter capitalized if no match
  return provider.charAt(0).toUpperCase() + provider.slice(1).replace(/_/g, ' ')
}

