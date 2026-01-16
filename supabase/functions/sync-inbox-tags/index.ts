// Edge Function: sync-inbox-tags
// Syncs tags from EmailBison API for all clients and updates inbox-to-tag assignments
// Uses background processing to avoid timeout limits

import { createClient } from "npm:@supabase/supabase-js@2.26.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch all tags from Bison API
async function fetchTags(apiKey: string, clientName: string) {
  try {
    console.log(`[${clientName}] Fetching tags...`);
    
    const res = await fetch('https://send.rillationrevenue.com/api/tags', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!res.ok) {
      console.error(`[${clientName}] Tags API error: ${res.status}`);
      return [];
    }

    const json = await res.json();
    const tags = json.data || json || [];
    
    console.log(`[${clientName}] Fetched ${tags.length} tags`);
    return tags;
  } catch (err) {
    console.error(`[${clientName}] Exception fetching tags:`, err);
    return [];
  }
}

// Upsert tags to database and return a map of bison_tag_id -> uuid
async function upsertTags(tags: any[], clientName: string): Promise<{ tagMap: Map<number, string>, successCount: number, errorCount: number }> {
  const tagMap = new Map<number, string>();
  let successCount = 0;
  let errorCount = 0;

  for (const tag of tags) {
    try {
      const tagData = {
        bison_tag_id: tag.id,
        name: tag.name,
        client: clientName,
        is_default: tag.default || false,
        synced_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('inbox_tags')
        .upsert(tagData, { onConflict: 'bison_tag_id,client' })
        .select('id')
        .single();

      if (error) {
        console.error(`Error upserting tag ${tag.name}:`, error.message);
        errorCount++;
      } else {
        successCount++;
        if (data) {
          tagMap.set(tag.id, data.id);
        }
      }
    } catch (err) {
      console.error(`Exception processing tag:`, err);
      errorCount++;
    }
  }

  console.log(`[${clientName}] Synced ${successCount} tags, ${errorCount} errors`);
  return { tagMap, successCount, errorCount };
}

// Fetch all inboxes from Bison API
async function fetchInboxes(apiKey: string, clientName: string) {
  const allInboxes: any[] = [];
  let nextUrl: string | null = 'https://send.rillationrevenue.com/api/sender-emails';
  let pageCount = 0;

  try {
    while (nextUrl && pageCount < 100) {
      pageCount++;
      console.log(`[${clientName}] Fetching inboxes page ${pageCount}...`);

      const res = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!res.ok) {
        console.error(`[${clientName}] Inboxes API error: ${res.status}`);
        break;
      }

      const json = await res.json();
      const data = json.data || json;

      if (Array.isArray(data) && data.length > 0) {
        allInboxes.push(...data);
      }

      nextUrl = json.links?.next || json.next_page_url || null;
    }

    console.log(`[${clientName}] Fetched ${allInboxes.length} inboxes`);
    return allInboxes;
  } catch (err) {
    console.error(`[${clientName}] Exception fetching inboxes:`, err);
    return [];
  }
}

// Sync inbox-to-tag assignments
async function syncInboxTagAssignments(apiKey: string, clientName: string, tagMap: Map<number, string>) {
  if (tagMap.size === 0) {
    console.log(`[${clientName}] No tags to assign`);
    return { assigned: 0, errors: 0 };
  }

  const inboxes = await fetchInboxes(apiKey, clientName);
  if (inboxes.length === 0) {
    console.log(`[${clientName}] No inboxes to process`);
    return { assigned: 0, errors: 0 };
  }

  let assigned = 0;
  let errors = 0;

  // Get all existing inboxes for this client from our database
  const { data: existingInboxes } = await supabase
    .from('inboxes')
    .select('id, bison_inbox_id')
    .eq('client', clientName);

  if (!existingInboxes || existingInboxes.length === 0) {
    console.log(`[${clientName}] No existing inboxes in database`);
    return { assigned: 0, errors: 0 };
  }

  console.log(`[${clientName}] Found ${existingInboxes.length} inboxes in database`);

  // Create a map of bison_inbox_id -> database inbox id
  const inboxIdMap = new Map<number, number>();
  for (const inbox of existingInboxes) {
    if (inbox.bison_inbox_id) {
      inboxIdMap.set(inbox.bison_inbox_id, inbox.id);
    }
  }

  // Track which inboxes we've processed from Bison
  const processedInboxIds = new Set<number>();
  let inboxesWithTags = 0;
  let inboxesMatched = 0;

  // Collect assignments to create (we'll delete all and re-insert for efficiency)
  const assignmentsToInsert: Array<{ inbox_id: number; tag_id: string }> = [];

  // Process each inbox from Bison and collect assignments
  for (const inbox of inboxes) {
    try {
      const dbInboxId = inboxIdMap.get(inbox.id);
      if (!dbInboxId) {
        continue; // Inbox not in our database yet
      }

      inboxesMatched++;
      processedInboxIds.add(dbInboxId);

      // Extract tag IDs from inbox
      const inboxTagIds: string[] = [];
      if (inbox.tags && Array.isArray(inbox.tags) && inbox.tags.length > 0) {
        inboxesWithTags++;
        for (const tag of inbox.tags) {
          const bisonTagId = tag.id || tag;
          const tagUuid = tagMap.get(bisonTagId);
          if (tagUuid) {
            inboxTagIds.push(tagUuid);
          }
        }
      }

      // Collect assignments to create
      for (const tagId of inboxTagIds) {
        assignmentsToInsert.push({ inbox_id: dbInboxId, tag_id: tagId });
      }
    } catch (err) {
      console.error(`[${clientName}] Exception processing inbox:`, err);
      errors++;
    }
  }

  // Delete all existing assignments for processed inboxes, then re-insert (more efficient)
  if (processedInboxIds.size > 0) {
    const inboxIdsArray = Array.from(processedInboxIds);
    // Delete in batches of 500
    for (let i = 0; i < inboxIdsArray.length; i += 500) {
      const batch = inboxIdsArray.slice(i, i + 500);
      await supabase
        .from('inbox_tag_assignments')
        .delete()
        .in('inbox_id', batch);
    }
  }

  // Batch insert new assignments
  if (assignmentsToInsert.length > 0) {
    // Insert in batches of 500 for efficiency
    for (let i = 0; i < assignmentsToInsert.length; i += 500) {
      const batch = assignmentsToInsert.slice(i, i + 500);
      const { error } = await supabase
        .from('inbox_tag_assignments')
        .insert(batch);

      if (error) {
        console.error(`[${clientName}] Error batch inserting assignments:`, error.message);
        errors += batch.length;
      } else {
        assigned += batch.length;
      }
    }
  }

  console.log(`[${clientName}] Summary: ${inboxesMatched} inboxes matched, ${inboxesWithTags} had tags, ${assigned} assignments created, ${errors} errors`);
  return { assigned, errors };
}

// Background sync function
async function runSync(specificClient?: string, skipAssignments = false, limit?: number) {
  console.log('========================================');
  console.log('SYNC INBOX TAGS - BACKGROUND START');
  if (specificClient) {
    console.log(`Syncing only: ${specificClient}`);
  }
  if (skipAssignments) {
    console.log('Skipping inbox-to-tag assignments (tags only)');
  }
  if (limit) {
    console.log(`Processing limit: ${limit} clients`);
  }
  console.log('========================================\n');

  try {
    // Fetch clients with API keys
    let query = supabase
      .from('Clients')
      .select('Business, "Api Key - Bison"');

    // Filter to specific client if provided
    if (specificClient) {
      query = query.eq('Business', specificClient);
    }

    const { data: clients, error: clientsError } = await query;

    if (clientsError) {
      console.error('Error fetching clients:', clientsError.message);
      return;
    }

    if (!clients || clients.length === 0) {
      console.log('No clients found');
      return;
    }

    console.log(`Found ${clients.length} client(s)\n`);

    // Sort clients to prioritize Rillation Revenue (if not filtering to specific client)
    if (!specificClient) {
      clients.sort((a, b) => {
        if (a.Business === 'Rillation Revenue') return -1;
        if (b.Business === 'Rillation Revenue') return 1;
        return 0;
      });
    }

    let totalTags = 0;
    let totalErrors = 0;
    let processedCount = 0;

    for (const client of clients) {
      // Apply limit if specified
      if (limit && processedCount >= limit) {
        console.log(`\nReached limit of ${limit} clients. Stopping.`);
        break;
      }
      
      processedCount++;
      const businessName = client.Business;
      const apiKey = client['Api Key - Bison'];

      console.log(`\n[${businessName}] Starting sync...`);

      if (!apiKey) {
        console.log(`[${businessName}] Skipping: No API key`);
        continue;
      }

      // Sync tags first
      const tags = await fetchTags(apiKey, businessName);
      console.log(`[${businessName}] Fetched ${tags.length} tags from Bison`);
      
      let tagMap = new Map<number, string>();

      if (tags.length > 0) {
        const { tagMap: syncedTagMap, successCount, errorCount } = await upsertTags(tags, businessName);
        tagMap = syncedTagMap;
        totalTags += successCount;
        totalErrors += errorCount;
        console.log(`[${businessName}] Synced ${successCount} tags to database, tagMap size: ${tagMap.size}`);
      } else {
        console.log(`[${businessName}] No tags found in Bison`);
      }

      // Then sync inbox-to-tag assignments (unless skipped)
      if (!skipAssignments && tagMap.size > 0) {
        console.log(`[${businessName}] Starting inbox-to-tag assignment sync...`);
        const { assigned, errors } = await syncInboxTagAssignments(apiKey, businessName, tagMap);
        totalErrors += errors;
        console.log(`[${businessName}] Completed: ${assigned} inbox-tag assignments synced, ${errors} errors\n`);
      } else if (skipAssignments) {
        console.log(`[${businessName}] Skipping assignment sync (tags only mode)\n`);
      } else {
        console.log(`[${businessName}] Skipping assignment sync: No tags in tagMap\n`);
      }

      // Small delay to avoid rate limiting (reduced for faster processing)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n========================================');
    console.log('SYNC TAGS AND ASSIGNMENTS COMPLETE');
    console.log(`Total tags synced: ${totalTags}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log('========================================');

  } catch (err) {
    console.error('Fatal error in background sync:', err);
  }
}

// Main handler - returns immediately, runs sync in background
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Parse optional query params
  const url = new URL(req.url);
  const clientName = url.searchParams.get('client'); // Optional: sync only one client
  const skipAssignments = url.searchParams.get('skip_assignments') === 'true'; // Optional: only sync tags, not assignments
  const limit = url.searchParams.get('limit'); // Optional: limit number of clients to process

  // Start background processing
  EdgeRuntime.waitUntil(runSync(
    clientName || undefined, 
    skipAssignments,
    limit ? parseInt(limit) : undefined
  ));

  // Return immediately
  return new Response(JSON.stringify({
    ok: true,
    message: clientName ? `Tag sync started for ${clientName}` : 'Tag sync started in background',
    started_at: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
