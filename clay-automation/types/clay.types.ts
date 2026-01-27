// Clay.com specific types

export interface ClayTable {
  id: string
  name: string
  rowCount: number
  createdAt: string
  updatedAt: string
  columns: ClayColumn[]
}

export interface ClayColumn {
  id: string
  name: string
  type: ClayColumnType
  enrichmentType?: EnrichmentType
  settings?: Record<string, unknown>
}

export type ClayColumnType =
  | 'text'
  | 'number'
  | 'email'
  | 'url'
  | 'date'
  | 'enrichment'
  | 'ai_prompt'
  | 'formula'

export type EnrichmentType =
  | 'apollo_person'
  | 'apollo_company'
  | 'clearbit_person'
  | 'clearbit_company'
  | 'email_finder'
  | 'company_search'
  | 'linkedin_profile'
  | 'phone_finder'
  | 'custom_api'

export interface EnrichmentConfig {
  type: EnrichmentType
  columnName: string
  sourceColumn: string
  settings?: Record<string, unknown>
}

export interface AIPromptConfig {
  columnName: string
  prompt: string
  sourceColumns: string[]
  model?: 'gpt-4' | 'gpt-3.5' | 'claude'
  maxTokens?: number
}

export interface ClayEnrichmentResult {
  email: string
  type: EnrichmentType
  data: Record<string, unknown>
  enrichedAt: string
  syncToStoreLeads?: boolean
}

export interface CSVUploadConfig {
  filePath: string
  tableId: string
  mappings?: Record<string, string> // CSV column -> Clay column
  skipDuplicates?: boolean
}

export interface ExportConfig {
  tableId: string
  outputPath: string
  format: 'csv' | 'json'
  includeColumns?: string[]
}
