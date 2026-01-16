// Edge Function: sync-inboxes-bison
// Syncs sender email accounts (inboxes) from EmailBison API for all clients
// Endpoint: GET /api/sender-emails

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
  const typeMap: Record<string, string> = {
    'google': 'google_workspace_oauth',
    'google_oauth': 'google_workspace_oauth',
    'google_workspace': 'google_workspace_oauth',
    'microsoft': 'microsoft_oauth',
    'microsoft_oauth': 'microsoft_oauth',
    'outlook': 'microsoft_oauth',
    'smtp': 'custom',
    'imap': 'custom',
    'custom': 'custom',
  };
  return typeMap[bisonType?.toLowerCase()] || 'custom';
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
  
  // Check for disconnected/error states
  if (['disconnected', 'error', 'failed', 'inactive'].includes(apiStatus)) {
    return 'disconnected';
  }
  
  // Check warmup status
  if (inbox.warmup_enabled || apiStatus === 'warming') {
    return 'warming';
  }
  
  // Check if in campaign
  if (inbox.in_campaign) {
    return 'active';
  }
  
  // Check for paused
  if (apiStatus === 'paused') {
    return 'paused';
  }
  
  // Default to ready if connected
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
    while (nextUrl && pageCount < 100) { // Safety limit
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

      // Handle pagination
      nextUrl = json.links?.next || json.next_page_url || null;
    }

    console.log(`[${clientName}] Total: ${allInboxes.length} inboxes`);
  } catch (err) {
    console.error(`[${clientName}] Exception:`, err);
  }

  return allInboxes;
}

// Upsert inboxes to database
async function upsertInboxes(inboxes: any[], clientName: string) {
  let successCount = 0;
  let errorCount = 0;

  for (const inbox of inboxes) {
    try {
      const inboxData = {
        bison_inbox_id: inbox.id,
        email: inbox.email || inbox.email_address,
        name: inbox.display_name || inbox.name || inbox.email || inbox.email_address,
        client: clientName,
        type: normalizeType(inbox.type || inbox.account_type),
        status: mapConnectionStatus(inbox.status),
        lifecycle_status: deriveLifecycleStatus(inbox),
        warmup_enabled: inbox.warmup_enabled || false,
        warmup_reputation: inbox.warmup_reputation || inbox.reputation || null,
        domain: inbox.email ? inbox.email.split('@')[1] : null,
        provider_inbox_id: String(inbox.id),
        daily_limit: inbox.daily_limit || inbox.sending_limit || 0,
        emails_sent_count: inbox.emails_sent || inbox.sent_count || 0,
        synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('inboxes')
        .upsert(inboxData, { onConflict: 'bison_inbox_id' });

      if (error) {
        console.error(`Error upserting inbox ${inbox.email}:`, error.message);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err) {
      console.error(`Exception processing inbox:`, err);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('========================================');
    console.log('SYNC INBOXES FROM BISON - START');
    console.log('========================================\n');

    // Fetch all clients with API keys
    const { data: clients, error: clientsError } = await supabase
      .from('Clients')
      .select('Business, "Api Key - Bison"');

    if (clientsError) {
      throw new Error(`Error fetching clients: ${clientsError.message}`);
    }

    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'No clients found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${clients.length} clients\n`);

    const results: any[] = [];
    let totalInboxes = 0;
    let totalErrors = 0;

    // Process each client
    for (const client of clients) {
      const businessName = client.Business;
      const apiKey = client['Api Key - Bison'];

      if (!apiKey) {
        console.log(`Skipping ${businessName}: No API key`);
        results.push({
          client: businessName,
          status: 'skipped',
          reason: 'No API key'
        });
        continue;
      }

      console.log(`\nProcessing: ${businessName}`);

      // Fetch inboxes from Bison
      const inboxes = await fetchSenderEmails(apiKey, businessName);

      if (inboxes.length > 0) {
        // Upsert to database
        const { successCount, errorCount } = await upsertInboxes(inboxes, businessName);
        
        totalInboxes += successCount;
        totalErrors += errorCount;

        results.push({
          client: businessName,
          status: 'success',
          inboxes_fetched: inboxes.length,
          inboxes_synced: successCount,
          errors: errorCount
        });
      } else {
        results.push({
          client: businessName,
          status: 'success',
          inboxes_fetched: 0,
          message: 'No inboxes found'
        });
      }

      // Small delay between clients to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n========================================');
    console.log('SYNC COMPLETE');
    console.log(`Total inboxes synced: ${totalInboxes}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log('========================================');

    return new Response(JSON.stringify({
      ok: true,
      total_clients: clients.length,
      total_inboxes_synced: totalInboxes,
      total_errors: totalErrors,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Fatal error:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
