// Edge Function: sync-campaign-status
// Syncs campaign status from Email Bison API to Campaigns table for ALL workspaces
import { createClient } from "npm:@supabase/supabase-js@2.26.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase env vars');
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    persistSession: false
  }
});

// --------------------------------------------------

async function fetchAllClients() {
  try {
    const { data, error } = await supabase
      .from('Clients')
      .select('Business, "Api Key - Bison", "Client ID - Bison"');
    
    if (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error('Exception in fetchAllClients:', err);
    throw err;
  }
}

// --------------------------------------------------

async function fetchAllCampaignsFromBison(apiKey: string, clientName: string) {
  let allCampaigns: any[] = [];
  let nextUrl: string | null = 'https://send.rillationrevenue.com/api/campaigns';
  let pageCount = 0;

  try {
    while (nextUrl) {
      pageCount++;
      console.log(`  [${clientName}] Fetching page ${pageCount}: ${nextUrl}`);
      
      const res = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`  [${clientName}] API error: ${res.status} - ${errorText}`);
        break;
      }

      const json = await res.json();
      
      if (json.data && json.data.length > 0) {
        allCampaigns = allCampaigns.concat(json.data);
        console.log(`  [${clientName}] Page ${pageCount}: got ${json.data.length} campaigns (total: ${allCampaigns.length})`);
      } else {
        console.log(`  [${clientName}] Page ${pageCount}: no data`);
      }

      // Get next page URL from pagination
      nextUrl = json.links?.next || null;
      
      // Safety limit
      if (allCampaigns.length > 10000) {
        console.warn(`  [${clientName}] Reached 10k campaigns limit`);
        break;
      }
    }
    
    console.log(`  [${clientName}] Total: ${allCampaigns.length} campaigns across ${pageCount} pages`);
  } catch (err) {
    console.error(`  [${clientName}] Exception:`, err);
  }

  return allCampaigns;
}

// --------------------------------------------------

async function processCampaignStatuses() {
  try {
    console.log('========================================');
    console.log('SYNC CAMPAIGN STATUS - FULL BACKFILL');
    console.log('========================================\n');
    
    // Step 1: Fetch all clients
    const clients = await fetchAllClients();
    
    if (clients.length === 0) {
      console.error('No clients found in Clients table');
      return;
    }

    console.log(`Found ${clients.length} clients with API keys\n`);

    // Step 2: Fetch ALL campaigns from ALL clients
    const allApiCampaigns: Map<string, { status: string; name: string; id: string }> = new Map();
    
    for (const client of clients) {
      const businessName = client.Business;
      const apiKey = client['Api Key - Bison'];

      if (!apiKey) {
        console.log(`Skipping ${businessName}: No API key`);
        continue;
      }

      console.log(`\nFetching campaigns for: ${businessName}`);
      const campaigns = await fetchAllCampaignsFromBison(apiKey, businessName);
      
      // Add to map - key by campaign_id (numeric id from API)
      for (const c of campaigns) {
        const id = String(c.id);
        const name = c.name || '';
        const status = c.status || '';
        
        if (id && status) {
          allApiCampaigns.set(id, { status, name, id });
          // Also key by name for fallback matching
          if (name) {
            allApiCampaigns.set(`name:${name}`, { status, name, id });
          }
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`Total unique campaigns from API: ${allApiCampaigns.size}`);
    console.log(`========================================\n`);

    // Step 3: Get all campaigns from database
    console.log('Fetching all campaigns from database...');
    const { data: dbCampaigns, error: dbError } = await supabase
      .from('Campaigns')
      .select('id, campaign_id, campaign_name, status, client');

    if (dbError) {
      console.error('Error fetching DB campaigns:', dbError);
      return;
    }

    console.log(`Found ${dbCampaigns?.length || 0} campaigns in database\n`);

    // Step 4: Update each DB campaign with status from API
    let updated = 0;
    let notFound = 0;
    let alreadySet = 0;
    let errors = 0;

    for (const dbCampaign of (dbCampaigns || [])) {
      const dbId = dbCampaign.id;
      const dbCampaignId = dbCampaign.campaign_id;
      const dbCampaignName = dbCampaign.campaign_name;
      const currentStatus = dbCampaign.status;

      // Try to find matching API campaign
      let apiData = allApiCampaigns.get(dbCampaignId);
      
      // Fallback: try by name
      if (!apiData && dbCampaignName) {
        apiData = allApiCampaigns.get(`name:${dbCampaignName}`);
      }

      if (!apiData) {
        console.log(`⚠ No API match for: id=${dbCampaignId}, name="${dbCampaignName}"`);
        notFound++;
        continue;
      }

      const newStatus = apiData.status;

      // Update the status (force update even if already set)
      const { error: updateError } = await supabase
        .from('Campaigns')
        .update({ status: newStatus })
        .eq('id', dbId);

      if (updateError) {
        console.error(`✗ Error updating ${dbCampaignName}: ${updateError.message}`);
        errors++;
      } else {
        if (currentStatus === newStatus) {
          alreadySet++;
        } else {
          console.log(`✓ Updated "${dbCampaignName}" (id=${dbCampaignId}): ${currentStatus || 'NULL'} → ${newStatus}`);
          updated++;
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`=== SYNC COMPLETE ===`);
    console.log(`========================================`);
    console.log(`DB campaigns processed: ${dbCampaigns?.length || 0}`);
    console.log(`Updated (changed): ${updated}`);
    console.log(`Already correct: ${alreadySet}`);
    console.log(`Not found in API: ${notFound}`);
    console.log(`Errors: ${errors}`);

  } catch (err) {
    console.error('FATAL ERROR:', err);
  }
}

// --------------------------------------------------

Deno.serve(async (req) => {
  // Start processing in background and return immediately
  processCampaignStatuses().catch(err => {
    console.error("Background processing error:", err);
  });

  return new Response(JSON.stringify({
    ok: true,
    message: "Campaign status sync started in background. Check function logs for progress."
  }, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
});
