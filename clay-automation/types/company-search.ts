/**
 * Clay Company Search Filter Types
 * Used for the Find Companies enrichment API
 */

// ============================================
// PREDEFINED OPTIONS
// ============================================

export const COMPANY_SIZES = [
  'Self-Employed',
  '2-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1,000 employees',
  '1,001-5,000 employees',
  '5,001-10,000 employees',
  '10,001+ employees',
] as const

export const ANNUAL_REVENUES = [
  '$0 - $500K',
  '$500K - $1M',
  '$1M - $5M',
  '$5M - $10M',
  '$10M - $25M',
  '$25M - $75M',
  '$75M - $200M',
  '$200M - $500M',
  '$500M - $1B',
  '$1B - $10B',
  '$10B - $100B',
  '$100B+',
] as const

export const FUNDING_AMOUNTS = [
  'Under $1M',
  '$1M - $5M',
  '$5M - $10M',
  '$10M - $25M',
  '$25M - $50M',
  '$50M - $100M',
  '$100M - $250M',
  '$250M+',
  'Funding unknown',
] as const

export const COMPANY_TYPES = [
  'Privately Held',
  'Public Company',
  'Partnership',
  'Self Employed',
  'Non Profit',
  'Educational',
  'Self Owned',
  'Government Agency',
] as const

export const BUSINESS_TYPES = [
  'B2B',
  'B2C',
  'Nonprofit',
] as const

// ============================================
// TYPE DEFINITIONS
// ============================================

export type CompanySize = typeof COMPANY_SIZES[number]
export type AnnualRevenue = typeof ANNUAL_REVENUES[number]
export type FundingAmount = typeof FUNDING_AMOUNTS[number]
export type CompanyType = typeof COMPANY_TYPES[number]
export type BusinessType = typeof BUSINESS_TYPES[number]

/**
 * Company Search Filter Configuration
 * All fields are optional - only include filters you want to apply
 */
export interface CompanySearchFilters {
  // Industries (multi-select from 398 options)
  industries?: string[]
  industries_exclude?: string[]

  // Company characteristics
  sizes?: CompanySize[]
  annual_revenues?: AnnualRevenue[]
  funding_amounts?: FundingAmount[]
  types?: CompanyType[]
  derived_business_types?: BusinessType[]

  // Member/follower counts
  minimum_member_count?: number | null
  maximum_member_count?: number | null
  minimum_follower_count?: number | null

  // Keywords
  description_keywords?: string[]
  description_keywords_exclude?: string[]

  // Location filters
  country_names?: string[]
  country_names_exclude?: string[]
  locations?: string[]  // Cities or states to include
  locations_exclude?: string[]  // Cities or states to exclude

  // Semantic search
  semantic_description?: string  // "Describe products and services"

  // Lookalike companies (max 10)
  company_identifier?: string[]  // LinkedIn URLs, domains, etc.

  // Results limit (max 100 for our implementation, Clay allows 50,000)
  limit?: number

  // Domain filtering
  has_resolved_domain?: boolean | null
  resolved_domain_is_live?: boolean | null
}

/**
 * Full API Request Body for Find Companies
 */
export interface FindCompaniesRequest {
  workspaceId: string
  enrichmentType: 'find-lists-of-companies-with-mixrank-source-preview'
  options: {
    sync: boolean
    returnTaskId: boolean
    returnActionMetadata: boolean
  }
  inputs: CompanySearchFilters & {
    // Additional API-specific fields
    domainFieldId?: string | null
    exclude_entities_configuration?: unknown[]
    exclude_entities_bitmap?: string | null
    previous_entities_bitmap?: string | null
    exclude_company_identifiers_mixed?: string[]
    derived_industries?: string[]
    derived_revenue_streams?: string[]
    derived_subindustries?: string[]
    derived_subindustries_exclude?: string[]
    name?: string
    radialKnnMinScore?: number | null
    resolved_domain_redirects?: boolean | null
    startFromCompanyType?: 'company_identifier'
    tableId?: string | null
    useRadialKnn?: boolean
    result_count?: boolean
  }
}

/**
 * Saved Search Configuration
 * Stored in clay_client_configs table
 */
export interface SavedCompanySearch {
  id: string
  name: string
  filters: CompanySearchFilters
  createdAt: string
  updatedAt: string
}

// ============================================
// CONSTANTS
// ============================================

/** Maximum companies to return per search (Rillation limit) */
export const MAX_COMPANY_LIMIT = 100

/** Maximum companies Clay allows per search */
export const CLAY_MAX_LIMIT = 50000

/** Maximum lookalike companies allowed */
export const MAX_LOOKALIKE_COMPANIES = 10

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Creates a default/empty search filter configuration
 */
export function createDefaultFilters(): CompanySearchFilters {
  return {
    industries: [],
    industries_exclude: [],
    sizes: [],
    annual_revenues: [],
    funding_amounts: [],
    types: [],
    derived_business_types: [],
    minimum_member_count: null,
    maximum_member_count: null,
    minimum_follower_count: null,
    description_keywords: [],
    description_keywords_exclude: [],
    country_names: [],
    country_names_exclude: [],
    locations: [],
    locations_exclude: [],
    semantic_description: '',
    company_identifier: [],
    limit: 100,
    has_resolved_domain: null,
    resolved_domain_is_live: null,
  }
}

/**
 * Builds the API request body from filters
 */
export function buildFindCompaniesRequest(
  workspaceId: string,
  filters: CompanySearchFilters
): FindCompaniesRequest {
  return {
    workspaceId,
    enrichmentType: 'find-lists-of-companies-with-mixrank-source-preview',
    options: {
      sync: true,
      returnTaskId: true,
      returnActionMetadata: true,
    },
    inputs: {
      ...filters,
      // Ensure limit doesn't exceed our max
      limit: Math.min(filters.limit || 100, MAX_COMPANY_LIMIT),
      // API-specific defaults
      domainFieldId: null,
      exclude_entities_configuration: [],
      exclude_entities_bitmap: null,
      previous_entities_bitmap: null,
      exclude_company_identifiers_mixed: [],
      derived_industries: [],
      derived_revenue_streams: [],
      derived_subindustries: [],
      derived_subindustries_exclude: [],
      name: '',
      radialKnnMinScore: null,
      resolved_domain_redirects: null,
      startFromCompanyType: 'company_identifier',
      tableId: null,
      useRadialKnn: false,
      result_count: true,
    },
  }
}
