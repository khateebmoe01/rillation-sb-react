// Edge Function: sync-inbox-tags
// Syncs tags from EmailBison API for all clients
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

// Upsert tags to database
async function upsertTags(tags: any[], clientName: string) {
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

      const { error } = await supabase
        .from('inbox_tags')
        .upsert(tagData, { onConflict: 'bison_tag_id,client' });

      if (error) {
        console.error(`Error upserting tag ${tag.name}:`, error.message);
        errorCount++;
      } else {
        successCount++;
      }
    } catch (err) {
      console.error(`Exception processing tag:`, err);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

// Background sync function
async function runSync() {
  console.log('========================================');
  console.log('SYNC INBOX TAGS - BACKGROUND START');
  console.log('========================================\n');

  try {
    // Fetch all clients with API keys
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

    let totalTags = 0;
    let totalErrors = 0;

    for (const client of clients) {
      const businessName = client.Business;
      const apiKey = client['Api Key - Bison'];

      if (!apiKey) {
        console.log(`Skipping ${businessName}: No API key`);
        continue;
      }

      const tags = await fetchTags(apiKey, businessName);

      if (tags.length > 0) {
        const { successCount, errorCount } = await upsertTags(tags, businessName);
        totalTags += successCount;
        totalErrors += errorCount;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('\n========================================');
    console.log('SYNC TAGS COMPLETE');
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

  // Start background processing
  EdgeRuntime.waitUntil(runSync());

  // Return immediately
  return new Response(JSON.stringify({
    ok: true,
    message: 'Tag sync started in background',
    started_at: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
