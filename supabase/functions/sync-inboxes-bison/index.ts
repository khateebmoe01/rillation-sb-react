// Edge Function: sync-inboxes-bison
// Syncs sender email accounts (inboxes) from EmailBison API for all clients
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

// Normalize inbox type from Bison API to our format
function normalizeType(bisonType: string): string {
  if (!bisonType) {
    console.warn('normalizeType: received null/undefined bisonType, defaulting to custom');
    return 'custom';
  }
  
  const normalized = bisonType.toLowerCase().trim();
  const typeMap: Record<string, string> = {
    'google': 'google_workspace_oauth',
    'google_oauth': 'google_workspace_oauth',
    'google_workspace': 'google_workspace_oauth',
    'google_workspace_oauth': 'google_workspace_oauth',
    'gmail': 'google_workspace_oauth',
    'microsoft': 'microsoft_oauth',
    'microsoft_oauth': 'microsoft_oauth',
    'outlook': 'microsoft_oauth',
    'smtp': 'custom',
    'imap': 'custom',
    'custom': 'custom',
  };
  
  const result = typeMap[normalized];
  if (!result) {
    console.warn(`normalizeType: unmapped type "${bisonType}" (normalized: "${normalized}"), defaulting to custom`);
    return 'custom';
  }
  
  return result;
}

// Map API status to our connection status
function mapConnectionStatus(apiStatus: string): 'Connected' | 'Not connected' {
  const connectedStatuses = ['active', 'connected', 'warming', 'paused'];
  const status = (apiStatus || '').toLowerCase();
  return connectedStatuses.includes(status) ? 'Connected' : 'Not connected';
}

// Derive lifecycle status from inbox data
function deriveLifecycleStatus(inbox: any): string {
  const apiStatus = (inbox.status || '').toLowerCase();
  
  if (['disconnected', 'error', 'failed', 'inactive'].includes(apiStatus)) {
    return 'disconnected';
  }
  
  if (inbox.warmup_enabled || apiStatus === 'warming') {
    return 'warming';
  }
  
  if (inbox.in_campaign) {
    return 'active';
  }
  
  if (apiStatus === 'paused') {
    return 'paused';
  }
  
  if (['active', 'connected', 'ready'].includes(apiStatus)) {
    return 'ready';
  }
  
  return 'ready';
}

// Fetch all sender emails from Bison API
async function fetchSenderEmails(apiKey: string, clientName: string) {
  const allInboxes: any[] = [];
  let nextUrl: string | null = 'https://send.rillationrevenue.com/api/sender-emails';
  let pageCount = 0;

  try {
    while (nextUrl && pageCount < 100) {
      pageCount++;
      console.log(`[${clientName}] Fetching page ${pageCount}: ${nextUrl}`);

      const res = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[${clientName}] API error: ${res.status} - ${errorText}`);
        break;
      }

      const json = await res.json();
      const data = json.data || json;

      if (Array.isArray(data) && data.length > 0) {
        allInboxes.push(...data);
        console.log(`[${clientName}] Page ${pageCount}: got ${data.length} inboxes (total: ${allInboxes.length})`);
      }

      nextUrl = json.links?.next || json.next_page_url || null;
    }

    console.log(`[${clientName}] Total: ${allInboxes.length} inboxes`);
  } catch (err) {
    console.error(`[${clientName}] Exception:`, err);
  }

  return allInboxes;
}

// Fetch all tags for a client
async function fetchTags(apiKey: string, clientName: string) {
  try {
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
    return json.data || json || [];
  } catch (err) {
    console.error(`[${clientName}] Exception fetching tags:`, err);
    return [];
  }
}

// Upsert tags and return a map of bison_id -> uuid
async function upsertTags(tags: any[], clientName: string): Promise<Map<number, string>> {
  const tagMap = new Map<number, string>();

  for (const tag of tags) {
    try {
      const { data, error } = await supabase
        .from('inbox_tags')
        .upsert({
          bison_tag_id: tag.id,
          name: tag.name,
          client: clientName,
          is_default: tag.default || false,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'bison_tag_id,client' })
        .select('id')
        .single();

      if (!error && data) {
        tagMap.set(tag.id, data.id);
      }
    } catch (err) {
      console.error(`Error upserting tag ${tag.name}:`, err);
    }
  }

  return tagMap;
}

// Upsert inboxes to database
async function upsertInboxes(inboxes: any[], clientName: string, tagMap: Map<number, string>) {
  let successCount = 0;
  let errorCount = 0;
  
  // Track unique types from Bison API for debugging
  const typesFromApi = new Set<string>();

  for (const inbox of inboxes) {
    try {
      // Log the raw type from API
      const rawType = inbox.type || inbox.account_type || 'undefined';
      typesFromApi.add(rawType);
      
      // Extract tag UUIDs from inbox tags (if present)
      const inboxTagIds: string[] = [];
      if (inbox.tags && Array.isArray(inbox.tags)) {
        for (const tag of inbox.tags) {
          const tagId = tag.id || tag;
          const uuid = tagMap.get(tagId);
          if (uuid) inboxTagIds.push(uuid);
        }
      }

      const inboxData = {
        bison_inbox_id: inbox.id,
        email: inbox.email || inbox.email_address,
        name: inbox.display_name || inbox.name || inbox.email || inbox.email_address,
        client: clientName,
        type: normalizeType(rawType),
        status: mapConnectionStatus(inbox.status),
        lifecycle_status: deriveLifecycleStatus(inbox),
        warmup_enabled: inbox.warmup_enabled || false,
        warmup_reputation: inbox.warmup_reputation || inbox.reputation || null,
        domain: inbox.email ? inbox.email.split('@')[1] : null,
        provider_inbox_id: String(inbox.id),
        daily_limit: inbox.daily_limit || inbox.sending_limit || 0,
        emails_sent_count: inbox.emails_sent || inbox.sent_count || 0,
        tags: inboxTagIds,
        synced_at: new Date().toISOString(),
      };

      const { data: upsertedInbox, error } = await supabase
        .from('inboxes')
        .upsert(inboxData, { onConflict: 'bison_inbox_id' })
        .select('id')
        .single();

      if (error) {
        console.error(`Error upserting inbox ${inbox.email}:`, error.message);
        errorCount++;
      } else {
        successCount++;

        // Update tag assignments if we have tags and an inbox ID
        if (upsertedInbox && inboxTagIds.length > 0) {
          const assignments = inboxTagIds.map(tagId => ({
            inbox_id: upsertedInbox.id,
            tag_id: tagId
          }));

          await supabase
            .from('inbox_tag_assignments')
            .upsert(assignments, { onConflict: 'inbox_id,tag_id' });
        }
      }
    } catch (err) {
      console.error(`Exception processing inbox:`, err);
      errorCount++;
    }
  }
  
  // Log unique types found from API
  console.log(`[${clientName}] Unique provider types from Bison API:`, Array.from(typesFromApi));

  return { successCount, errorCount };
}

// Background sync function
async function runSync() {
  console.log('========================================');
  console.log('SYNC INBOXES FROM BISON - BACKGROUND START');
  console.log('========================================\n');

  try {
    const { data: clients, error: clientsError } = await supabase
      .from('Clients')
      .select('Business, "Api Key - Bison"');

    if (clientsError) {
      console.error('Error fetching clients:', clientsError.message);
      return;
    }

    if (!clients || clients.length === 0) {
      console.log('No clients found');
      return;
    }

    console.log(`Found ${clients.length} clients\n`);

    let totalInboxes = 0;
    let totalErrors = 0;

    for (const client of clients) {
      const businessName = client.Business;
      const apiKey = client['Api Key - Bison'];

      if (!apiKey) {
        console.log(`Skipping ${businessName}: No API key`);
        continue;
      }

      console.log(`\nProcessing: ${businessName}`);

      // First sync tags
      const tags = await fetchTags(apiKey, businessName);
      const tagMap = await upsertTags(tags, businessName);
      console.log(`[${businessName}] Synced ${tagMap.size} tags`);

      // Then sync inboxes
      const inboxes = await fetchSenderEmails(apiKey, businessName);

      if (inboxes.length > 0) {
        const { successCount, errorCount } = await upsertInboxes(inboxes, businessName, tagMap);
        totalInboxes += successCount;
        totalErrors += errorCount;
      }

      // Small delay between clients to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n========================================');
    console.log('SYNC COMPLETE');
    console.log(`Total inboxes synced: ${totalInboxes}`);
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

  // Start background processing
  EdgeRuntime.waitUntil(runSync());

  // Return immediately
  return new Response(JSON.stringify({
    ok: true,
    message: 'Inbox sync started in background',
    started_at: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
