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
  return date.toISOString().split('T')[0]
}

export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  })
}

