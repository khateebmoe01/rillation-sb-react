// Helper for accessing tables that aren't in Supabase generated types
// These are new tables added via migrations that haven't been regenerated

import { supabase } from './supabase'

// Create a typed table accessor that bypasses type checking for new tables
export function getTable(tableName: string) {
  // Use type assertion to bypass strict typing for tables not in generated types
  return supabase.from(tableName) as ReturnType<typeof supabase.from> & {
    insert: (data: any) => any
    update: (data: any) => any
    upsert: (data: any) => any
    delete: () => any
    select: (columns?: string, options?: any) => any
  }
}

// Shorthand for common new tables
export const tables = {
  inbox_sets: () => getTable('inbox_sets'),
  domain_inventory: () => getTable('domain_inventory'),
  provider_orders: () => getTable('provider_orders'),
  domain_generation_templates: () => getTable('domain_generation_templates'),
  purchase_batches: () => getTable('purchase_batches'),
  inbox_tags: () => getTable('inbox_tags'),
  inbox_tag_assignments: () => getTable('inbox_tag_assignments'),
}
