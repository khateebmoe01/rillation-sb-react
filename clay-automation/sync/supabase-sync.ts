import { supabase } from '../config/env.config.js'
import type { ClayEnrichmentResult, EnrichmentType } from '../types/clay.types.js'

export interface SyncResult {
  success: boolean
  synced: number
  errors: number
  errorDetails?: string[]
}

// Sync enrichment results to Supabase
export async function syncEnrichmentResults(
  tableId: string,
  results: ClayEnrichmentResult[]
): Promise<SyncResult> {
  console.log(`Syncing ${results.length} enrichment results to Supabase...`)

  let synced = 0
  let errors = 0
  const errorDetails: string[] = []

  for (const result of results) {
    try {
      // Upsert to clay_enrichment_results table
      const { error } = await supabase
        .from('clay_enrichment_results')
        .upsert(
          {
            clay_table_id: tableId,
            lead_email: result.email,
            enrichment_type: result.type,
            enrichment_data: result.data,
            enriched_at: result.enrichedAt || new Date().toISOString(),
          },
          {
            onConflict: 'clay_table_id,lead_email,enrichment_type',
          }
        )

      if (error) {
        errors++
        errorDetails.push(`${result.email}: ${error.message}`)
        continue
      }

      synced++

      // Optionally sync to storeleads table
      if (result.syncToStoreLeads) {
        await syncToStoreLeads(result)
      }
    } catch (err) {
      errors++
      errorDetails.push(`${result.email}: ${(err as Error).message}`)
    }
  }

  console.log(`Sync complete: ${synced} synced, ${errors} errors`)

  return {
    success: errors === 0,
    synced,
    errors,
    errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
  }
}

// Sync enriched data to storeleads table
async function syncToStoreLeads(result: ClayEnrichmentResult): Promise<void> {
  const data = result.data as Record<string, unknown>

  // Check if lead exists
  const { data: existingLead } = await supabase
    .from('storeleads')
    .select('id, email')
    .eq('email', result.email)
    .maybeSingle()

  // Map enrichment data to storeleads columns
  const updateData: Record<string, unknown> = {}

  if (data.company) updateData.company = data.company
  if (data.title) updateData.title = data.title
  if (data.linkedin_url) updateData.linkedin = data.linkedin_url
  if (data.phone) updateData.phone = data.phone
  if (data.first_name) updateData.first_name = data.first_name
  if (data.last_name) updateData.last_name = data.last_name

  // Add enrichment metadata
  updateData.clay_enriched_at = new Date().toISOString()
  updateData.clay_enrichment_type = result.type

  if (existingLead) {
    // Update existing lead
    await supabase.from('storeleads').update(updateData).eq('id', existingLead.id)
  } else {
    // Insert new lead
    await supabase.from('storeleads').insert({
      email: result.email,
      ...updateData,
      source: 'clay_enrichment',
    })
  }
}

// Save Clay table metadata
export async function saveClayTable(
  tableId: string,
  tableName: string,
  client?: string
): Promise<void> {
  const { error } = await supabase.from('clay_tables').upsert(
    {
      clay_table_id: tableId,
      table_name: tableName,
      client,
      created_at: new Date().toISOString(),
      status: 'active',
    },
    {
      onConflict: 'clay_table_id',
    }
  )

  if (error) {
    console.error('Failed to save Clay table:', error.message)
  } else {
    console.log(`Clay table saved: ${tableName} (${tableId})`)
  }
}

// Update Clay table row count
export async function updateTableRowCount(tableId: string, rowCount: number): Promise<void> {
  const { error } = await supabase
    .from('clay_tables')
    .update({
      row_count: rowCount,
      updated_at: new Date().toISOString(),
    })
    .eq('clay_table_id', tableId)

  if (error) {
    console.error('Failed to update row count:', error.message)
  }
}

// Get pending leads for enrichment (future use)
export async function getPendingLeads(
  client?: string,
  limit: number = 100
): Promise<{ email: string; data: Record<string, unknown> }[]> {
  let query = supabase
    .from('storeleads')
    .select('email, first_name, last_name, company, title')
    .is('clay_enriched_at', null)
    .limit(limit)

  if (client) {
    query = query.eq('client', client)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch pending leads:', error.message)
    return []
  }

  return (data || []).map((lead) => ({
    email: lead.email,
    data: lead as Record<string, unknown>,
  }))
}

// Mark enrichment results as synced
export async function markAsSynced(
  tableId: string,
  emails: string[],
  enrichmentType: EnrichmentType
): Promise<void> {
  const { error } = await supabase
    .from('clay_enrichment_results')
    .update({ synced_to_storeleads: true })
    .eq('clay_table_id', tableId)
    .eq('enrichment_type', enrichmentType)
    .in('lead_email', emails)

  if (error) {
    console.error('Failed to mark as synced:', error.message)
  }
}

export default {
  syncEnrichmentResults,
  syncToStoreLeads,
  saveClayTable,
  updateTableRowCount,
  getPendingLeads,
  markAsSynced,
}
