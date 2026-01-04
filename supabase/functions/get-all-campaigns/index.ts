// Edge Function: get-all-campaigns
// Fetches campaigns from Email Bison for ALL clients and ALL workspaces
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

async function fetchCampaignsFromBison(apiKey: string) {
  let allCampaigns: any[] = [];
  let nextUrl: string | null = 'https://send.rillationrevenue.com/api/campaigns';
  let errors: any[] = [];

  try {
    while (nextUrl) {
      console.log(`Fetching: ${nextUrl}`);
      
      const res = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        const error = {
          url: nextUrl,
          status: res.status,
          statusText: res.statusText,
          error: errorText
        };
        console.error('Fetch error:', JSON.stringify(error));
        errors.push(error);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const json = await res.json();
      
      if (json.data && json.data.length > 0) {
        allCampaigns = allCampaigns.concat(json.data);
        console.log(`Fetched ${json.data.length} campaigns (total: ${allCampaigns.length})`);
      }

      nextUrl = json.links?.next || null;
      
      if (allCampaigns.length > 10000) {
        console.warn('Reached 10k campaigns limit');
        break;
      }
    }
  } catch (err) {
    console.error('Exception in fetchCampaignsFromBison:', err);
    errors.push({
      type: 'exception',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
  }

  return { campaigns: allCampaigns, errors };
}

// --------------------------------------------------

async function storeCampaignsInTable(campaigns: any[], clientBusinessName: string) {
  const results: any[] = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const campaign of campaigns) {
    const campaign_name = campaign.name || campaign.campaign_name || '';
    const campaign_id = campaign.id || campaign.campaign_id || '';
    
    if (!campaign_name || !campaign_id) {
      skippedCount++;
      results.push({
        campaign_name: campaign_name || 'N/A',
        campaign_id: campaign_id || 'N/A',
        client: clientBusinessName,
        status: 'skipped',
        reason: 'Missing campaign_name or campaign_id'
      });
      continue;
    }

    try {
      // Check if campaign exists (by campaign_id + client)
      const { data: existing, error: checkError } = await supabase
        .from('Campaigns')
        .select('uuid, campaign_name')
        .eq('campaign_id', campaign_id)
        .eq('client', clientBusinessName)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means "not found", which is fine
        errorCount++;
        results.push({
          campaign_name,
          campaign_id,
          client: clientBusinessName,
          status: 'error',
          error: checkError.message
        });
        continue;
      }

      const updateData: any = {
        campaign_name,
        campaign_id,
        client: clientBusinessName,
      };

      // Add uuid if it exists in campaign data
      if (campaign.uuid) {
        updateData.uuid = campaign.uuid;
      }

      let error = null;

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('Campaigns')
          .update(updateData)
          .eq('campaign_id', campaign_id)
          .eq('client', clientBusinessName);
        
        error = updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('Campaigns')
          .insert(updateData);
        
        error = insertError;
      }

      if (error) {
        errorCount++;
        results.push({
          campaign_name,
          campaign_id,
          client: clientBusinessName,
          status: 'error',
          error: error.message
        });
      } else {
        successCount++;
        // Don't push success results to avoid huge response - just count them
      }
    } catch (err) {
      errorCount++;
      results.push({
        campaign_name,
        campaign_id,
        client: clientBusinessName,
        status: 'error',
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  return {
    results,
    successCount,
    errorCount,
    skippedCount,
    totalProcessed: campaigns.length
  };
}

// --------------------------------------------------

Deno.serve(async (req) => {
  try {
    console.log('Starting get-all-campaigns job...');
    
    // Fetch all clients
    const clients = await fetchAllClients();
    
    if (clients.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'No clients found in Clients table'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`Found ${clients.length} clients to process`);

    const allResults: any[] = [];
    let totalCampaignsFetched = 0;
    let totalCampaignsStored = 0;
    let totalErrors = 0;

    // Loop through each client
    for (const client of clients) {
      const businessName = client.Business;
      const apiKey = client['Api Key - Bison'];
      const clientId = client['Client ID - Bison'];

      if (!apiKey) {
        console.log(`Skipping client ${businessName}: No API key found`);
        allResults.push({
          client: businessName,
          status: 'skipped',
          reason: 'No API key found'
        });
        continue;
      }

      try {
        console.log(`\nProcessing client: ${businessName}`);
        
        // Fetch all campaigns for this client (API key is workspace-scoped)
        // The /api/campaigns endpoint returns all campaigns for the authenticated user
        console.log(`Fetching campaigns for ${businessName}...`);
        
        const { campaigns: clientCampaigns, errors: fetchErrors } = await fetchCampaignsFromBison(apiKey);
        console.log(`Found ${clientCampaigns.length} campaigns for ${businessName}`);
        
        if (clientCampaigns.length > 0) {
          const storeResult = await storeCampaignsInTable(clientCampaigns, businessName);
          totalCampaignsStored += storeResult.successCount;
          totalErrors += storeResult.errorCount;
          
          totalCampaignsFetched += clientCampaigns.length;

          allResults.push({
            client: businessName,
            client_id: clientId,
            campaigns_fetched: clientCampaigns.length,
            campaigns_stored: storeResult.successCount,
            errors: storeResult.errorCount,
            skipped: storeResult.skippedCount,
            fetch_errors: fetchErrors.length > 0 ? fetchErrors : undefined,
            sample_errors: storeResult.results.filter((r: any) => r.status === 'error').slice(0, 3),
            status: fetchErrors.length > 0 ? 'partial_success' : 'success'
          });
        } else {
          allResults.push({
            client: businessName,
            client_id: clientId,
            campaigns_fetched: 0,
            campaigns_stored: 0,
            fetch_errors: fetchErrors.length > 0 ? fetchErrors : undefined,
            sample_errors: fetchErrors.length > 0 ? fetchErrors.slice(0, 3) : undefined,
            status: fetchErrors.length > 0 ? 'error' : 'success',
            message: fetchErrors.length > 0 ? 'Failed to fetch campaigns' : 'No campaigns found'
          });
        }

      } catch (error) {
        console.error(`Error processing client ${businessName}:`, error);
        const errorDetail = {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          type: error instanceof Error ? error.constructor.name : typeof error
        };
        allResults.push({
          client: businessName,
          client_id: clientId,
          status: 'error',
          error: errorDetail
        });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      total_clients_processed: clients.length,
      total_campaigns_fetched: totalCampaignsFetched,
      total_campaigns_stored: totalCampaignsStored,
      total_errors: totalErrors,
      results: allResults
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (err) {
    console.error('Fatal error in get-all-campaigns:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

















