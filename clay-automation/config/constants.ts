// Magic numbers and default values

export const BATCH_SIZE = 500
export const API_DELAY_MS = 500
export const MAX_RETRIES = 3
export const SCREENSHOT_DIR = '/tmp/clay-screenshots'

export const LOG_LEVELS = {
  info: 0,
  status: 1,
  success: 2,
  warning: 3,
  error: 4,
} as const

export const WORKFLOW_NAMES = {
  login: 'login',
  createTable: 'createTable',
  uploadCSV: 'uploadCSV',
  addEnrichment: 'addEnrichment',
  writePrompt: 'writePrompt',
  runEnrichment: 'runEnrichment',
  exportResults: 'exportResults',
  fullPipeline: 'fullPipeline',
} as const

export const ENRICHMENT_TYPES = {
  apollo_person: 'Find Person (Apollo)',
  apollo_company: 'Find Company (Apollo)',
  clearbit_person: 'Enrich Person (Clearbit)',
  clearbit_company: 'Enrich Company (Clearbit)',
  email_finder: 'Find Email',
  company_search: 'Company Search',
  linkedin_profile: 'LinkedIn Profile',
  phone_finder: 'Find Phone Number',
  custom_api: 'Custom API',
} as const
