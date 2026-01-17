// CSV generators for MissionInbox and InboxKit providers
import type { MailboxConfig } from '../types/infrastructure'

// ============================================
// MissionInbox CSV Generators
// ============================================

export function generateMissionInboxDomainsCSV(domains: string[], project: string, clientWebsite: string = ''): string {
  const header = 'IP ProviderName,Domain Name,Project,Redirect URL'
  const rows = domains.map(domain => `mo-relay,${domain},${project},${clientWebsite}`)
  return [header, ...rows].join('\n')
}

export function generateMissionInboxMailboxesCSV(
  domains: string[],
  config: MailboxConfig
): string {
  const header = 'first_name,last_name,full_email,password,reply_to,warmup'
  const rows: string[] = []

  const { first_names, last_names, password_pattern, warmup, inboxes_per_domain } = config
  
  // Handle empty names
  if (first_names.length === 0 || last_names.length === 0) {
    return header // Return just header if no names provided
  }
  
  const totalMailboxes = domains.length * inboxes_per_domain
  
  // Calculate how to distribute names evenly
  const getNameForIndex = (globalIndex: number, names: string[]): string => {
    if (names.length === 1) return names[0]
    // Distribute evenly: first N/count get name 0, next N/count get name 1, etc.
    const mailboxesPerName = Math.ceil(totalMailboxes / names.length)
    const nameIndex = Math.floor(globalIndex / mailboxesPerName)
    return names[Math.min(nameIndex, names.length - 1)]
  }

  let globalIndex = 0
  for (const domain of domains) {
    for (let i = 0; i < inboxes_per_domain; i++) {
      const firstName = getNameForIndex(globalIndex, first_names)
      const lastName = getNameForIndex(globalIndex, last_names)
      const username = firstName.toLowerCase()
      const email = `${username}@${domain}`
      
      rows.push(`${firstName},${lastName},${email},${password_pattern},,${warmup}`)
      globalIndex++
    }
  }

  return [header, ...rows].join('\n')
}

// ============================================
// InboxKit CSV Generators
// ============================================

export function generateInboxKitDomainsCSV(domains: string[]): string {
  const header = 'domain'
  return [header, ...domains].join('\n')
}

export function generateInboxKitMailboxesCSV(
  domains: string[],
  config: MailboxConfig,
  profilePictures: string[] = []
): string {
  const header = 'first_name,last_name,username,domain_name,platform,profile_picture'
  const rows: string[] = []

  const { first_names, last_names, inboxes_per_domain, platform = '' } = config

  // Handle empty names
  if (first_names.length === 0 || last_names.length === 0) {
    return header // Return just header if no names provided
  }

  const totalMailboxes = domains.length * inboxes_per_domain
  
  // Calculate how to distribute names evenly
  const getNameForIndex = (globalIndex: number, names: string[]): string => {
    if (names.length === 1) return names[0]
    // Distribute evenly: first N/count get name 0, next N/count get name 1, etc.
    const mailboxesPerName = Math.ceil(totalMailboxes / names.length)
    const nameIndex = Math.floor(globalIndex / mailboxesPerName)
    return names[Math.min(nameIndex, names.length - 1)]
  }

  let globalIndex = 0
  for (const domain of domains) {
    for (let i = 0; i < inboxes_per_domain; i++) {
      const firstName = getNameForIndex(globalIndex, first_names)
      const lastName = getNameForIndex(globalIndex, last_names)
      const username = firstName.toLowerCase()
      // Assign profile pictures in order, cycling if fewer than total mailboxes
      const profilePic = profilePictures.length > 0 
        ? profilePictures[globalIndex % profilePictures.length] 
        : ''
      
      rows.push(`${firstName},${lastName},${username},${domain},${platform},${profilePic}`)
      globalIndex++
    }
  }

  return [header, ...rows].join('\n')
}

// ============================================
// Generic CSV Helpers
// ============================================

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function parseCSV(csvContent: string): string[][] {
  const lines = csvContent.trim().split('\n')
  return lines.map(line => {
    // Handle quoted fields
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    
    return result
  })
}

// ============================================
// Domain Generation
// ============================================

export interface DomainGenerationOptions {
  baseNames: string[]
  prefixes: string[]
  suffixes: string[]
  tlds: string[]
}

export interface GeneratedDomainResult {
  domain: string
  baseName: string
  prefix?: string
  suffix?: string
  tld: string
  type: 'prefix' | 'suffix' | 'base'
}

export function generateDomainCombinations(options: DomainGenerationOptions): GeneratedDomainResult[] {
  const { baseNames, prefixes, suffixes, tlds } = options
  const results: GeneratedDomainResult[] = []

  for (const baseName of baseNames) {
    for (const tld of tlds) {
      // Prefix combinations
      for (const prefix of prefixes) {
        results.push({
          domain: `${prefix}${baseName}${tld}`,
          baseName,
          prefix,
          tld,
          type: 'prefix',
        })
      }

      // Suffix combinations
      for (const suffix of suffixes) {
        results.push({
          domain: `${baseName}${suffix}${tld}`,
          baseName,
          suffix,
          tld,
          type: 'suffix',
        })
      }

      // Base only (no prefix/suffix)
      results.push({
        domain: `${baseName}${tld}`,
        baseName,
        tld,
        type: 'base',
      })
    }
  }

  return results
}

// ============================================
// Provider URLs
// ============================================

export const PROVIDER_URLS = {
  missioninbox: {
    domains: 'https://app.missioninbox.com/domains',
    mailboxes: 'https://app.missioninbox.com/mailboxes',
  },
  inboxkit: {
    domains: 'https://app.inboxkit.com/domains',
    mailboxes: 'https://app.inboxkit.com/mailboxes',
  },
}
