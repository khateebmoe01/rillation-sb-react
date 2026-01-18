import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const INBOXKIT_BASE_URL = "https://api.inboxkit.com/v1";

interface InboxKitConfig {
  apiKey: string;
}

// Get API credentials from inbox_providers table
async function getApiCredentials(supabase: any): Promise<InboxKitConfig | null> {
  const { data, error } = await supabase
    .from("inbox_providers")
    .select("api_key")
    .eq("provider_name", "inboxkit")
    .eq("is_active", true)
    .single();

  if (error || !data) {
    console.error("Failed to get InboxKit credentials:", error);
    return null;
  }

  return {
    apiKey: data.api_key,
  };
}

// Make authenticated request to InboxKit API
async function inboxKitRequest(
  config: InboxKitConfig,
  endpoint: string,
  method: string = "GET",
  body?: any,
  workspaceId?: string
): Promise<any> {
  const url = `${INBOXKIT_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.apiKey}`,
  };
  
  // Add X-Workspace-Id header if provided (required for most endpoints)
  if (workspaceId) {
    headers["X-Workspace-Id"] = workspaceId;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  console.log(`InboxKit API: ${method} ${url}`, workspaceId ? `(workspace: ${workspaceId})` : "");

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`InboxKit API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Supabase client for sync operations
let syncSupabase: any = null;

// API Handlers
const handlers: Record<string, (config: InboxKitConfig, params: any) => Promise<any>> = {
  // Get account details
  "get-account": async (config) => {
    return inboxKitRequest(config, "/account");
  },

  // List workspaces
  "list-workspaces": async (config) => {
    return inboxKitRequest(config, "/workspaces");
  },

  // Get workspace details
  "get-workspace": async (config, params) => {
    return inboxKitRequest(config, `/workspaces/${params.workspace_id}`);
  },

  // Search available domains
  "search-domains": async (config, params) => {
    return inboxKitRequest(config, "/domains/search", "POST", {
      query: params.query,
      tlds: params.tlds || [".com", ".co", ".io"],
    });
  },

  // Check domain availability
  "check-domain": async (config, params) => {
    return inboxKitRequest(config, `/domains/check?domain=${params.domain}`);
  },

  // Register domains
  "register-domains": async (config, params) => {
    return inboxKitRequest(config, "/domains/register", "POST", {
      domains: params.domains,
      workspace_id: params.workspace_id,
    });
  },

  // List domains
  "list-domains": async (config, params) => {
    return inboxKitRequest(config, "/domains/list", "POST", {
      workspace_id: params.workspace_id,
      page: params.page || 1,
      limit: params.limit || 100,
    });
  },

  // List mailboxes - POST /api/mailboxes/list with X-Workspace-Id header
  "list-mailboxes": async (config, params) => {
    if (!params?.workspace_id) {
      throw new Error("workspace_id is required for list-mailboxes");
    }
    return inboxKitRequest(
      config, 
      "/api/mailboxes/list", 
      "POST", 
      { page: params?.page || 1, limit: params?.limit || 100 },
      params.workspace_id // Pass as header
    );
  },

  // Buy mailboxes (requires confirmation in UI before calling)
  "buy-mailboxes": async (config, params) => {
    return inboxKitRequest(config, "/mailboxes/buy", "POST", {
      domain: params.domain,
      quantity: params.quantity,
      first_names: params.first_names,
      last_names: params.last_names,
      workspace_id: params.workspace_id,
    });
  },

  // Check mailbox status
  "check-mailbox-status": async (config, params) => {
    return inboxKitRequest(config, `/mailboxes/check-status?mailbox_id=${params.mailbox_id}`);
  },

  // Get mailbox details - GET /api/mailboxes/details?uid=...
  "get-mailbox": async (config, params) => {
    return inboxKitRequest(config, `/api/mailboxes/details?uid=${params.mailbox_id}`);
  },

  // Cancel mailboxes
  "cancel-mailboxes": async (config, params) => {
    return inboxKitRequest(config, "/mailboxes/cancel", "POST", {
      mailbox_ids: params.mailbox_ids,
    });
  },

  // Update mailbox - POST /api/mailboxes/update
  "update-mailbox": async (config, params) => {
    return inboxKitRequest(config, "/api/mailboxes/update", "POST", {
      uid: params.mailbox_id,
      ...params.updates,
    });
  },

  // Get wallet details
  "get-wallet": async (config) => {
    return inboxKitRequest(config, "/billing/wallet");
  },

  // Get pricing plans
  "get-pricing": async (config) => {
    return inboxKitRequest(config, "/billing/pricing");
  },

  // List tags
  "list-tags": async (config) => {
    return inboxKitRequest(config, "/tags");
  },

  // Assign tags
  "assign-tags": async (config, params) => {
    return inboxKitRequest(config, "/tags/assign", "POST", {
      tag_ids: params.tag_ids,
      resource_type: params.resource_type, // "domain" or "mailbox"
      resource_ids: params.resource_ids,
    });
  },

  // Preview mailbox purchase (returns cost estimate without purchasing)
  "preview-mailbox-purchase": async (config, params) => {
    // Get wallet and pricing info
    const [wallet, pricing] = await Promise.all([
      inboxKitRequest(config, "/billing/wallet"),
      inboxKitRequest(config, "/billing/pricing"),
    ]);
    
    const count = params.quantity || 1;
    const mailboxPrice = pricing?.mailbox_price || 0;
    const totalCost = count * mailboxPrice;
    
    return {
      quantity: count,
      domains: params.domains,
      price_per_mailbox: mailboxPrice,
      total_cost: totalCost,
      currency: wallet.currency || "USD",
      wallet_balance: wallet.balance || 0,
      can_afford: (wallet.balance || 0) >= totalCost,
    };
  },

  // Search prewarmed domains
  "search-prewarm-domains": async (config, params) => {
    return inboxKitRequest(config, "/prewarm/domains", "POST", {
      query: params.query,
    });
  },

  // Buy prewarmed mailboxes
  "buy-prewarm-mailboxes": async (config, params) => {
    return inboxKitRequest(config, "/prewarm/buy", "POST", {
      domain_ids: params.domain_ids,
      quantity: params.quantity,
    });
  },

  // Get renewal summary directly from InboxKit (no DB linking)
  "get-renewals": async (config, params) => {
    // Track workspaces with their names (for client display)
    let workspaceData: { id: string; name: string }[] = [];
    
    if (params.workspace_id) {
      workspaceData = [{ id: params.workspace_id, name: params.workspace_name || 'Unknown' }];
    } else {
      const workspaceEndpoints = [
        "/api/workspaces/list",
        "/api/workspaces",
        "/workspaces/list",
        "/workspaces",
        "/account",
      ];
      
      for (const endpoint of workspaceEndpoints) {
        try {
          console.log(`[get-renewals] Trying to fetch workspaces from ${endpoint}...`);
          const response = await inboxKitRequest(config, endpoint);
          
          let workspaces: any[] = [];
          if (response.workspaces) {
            workspaces = response.workspaces;
          } else if (response.data) {
            workspaces = Array.isArray(response.data) ? response.data : [response.data];
          } else if (Array.isArray(response)) {
            workspaces = response;
          } else if (response.workspace_id || response.id || response.uid) {
            workspaces = [response];
          }
          
          if (workspaces.length > 0) {
            workspaceData = workspaces.map((ws: any) => ({
              id: ws.id || ws.uid || ws.workspace_id || ws._id,
              name: ws.name || ws.title || ws.workspace_name || 'Unknown',
            })).filter(ws => ws.id);
            console.log(`[get-renewals] Found ${workspaceData.length} workspaces from ${endpoint}`);
            break;
          }
        } catch (wsErr: any) {
          console.log(`[get-renewals] Endpoint ${endpoint} failed:`, wsErr.message);
        }
      }
    }

    if (workspaceData.length === 0) {
      return { total_mailboxes: 0, renewals: [], message: "No workspaces found" };
    }

    // Fetch mailboxes with workspace/client info
    let allMailboxes: any[] = [];
    
    for (const workspace of workspaceData) {
      let page = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        try {
          const response = await inboxKitRequest(
            config, 
            "/api/mailboxes/list", 
            "POST", 
            { page, limit },
            workspace.id
          );
          
          const mailboxes = response.data || response.mailboxes || [];
          
          if (Array.isArray(mailboxes) && mailboxes.length > 0) {
            // Add workspace/client info to each mailbox
            const mailboxesWithClient = mailboxes.map((mb: any) => ({
              ...mb,
              _client: workspace.name,
            }));
            allMailboxes = allMailboxes.concat(mailboxesWithClient);
            page++;
            hasMore = response.pagination?.has_more || mailboxes.length === limit;
          } else {
            hasMore = false;
          }
        } catch (err) {
          console.error(`[get-renewals] Error fetching mailboxes for workspace ${workspace.id}, page ${page}:`, err);
          hasMore = false;
        }
      }
    }
    
    console.log(`[get-renewals] Fetched ${allMailboxes.length} mailboxes from ${workspaceData.length} workspaces`);

    // Find domains that have ANY failed/cancelled/inactive mailboxes
    const failedDomains = new Set<string>();
    for (const mailbox of allMailboxes) {
      const status = (mailbox.status || '').toLowerCase();
      const isFailed = status === 'failed' || status === 'cancelled' || status === 'canceled' || 
                       status === 'suspended' || status === 'inactive' || status === 'error' ||
                       status === 'disabled' || status === 'renewal_failed';
      if (isFailed && mailbox.domain_name) {
        failedDomains.add(mailbox.domain_name);
      }
    }
    
    console.log(`[get-renewals] Found ${failedDomains.size} domains with failed mailboxes to exclude`);

    // Filter for active mailboxes and exclude failed domains
    const activeMailboxes = allMailboxes.filter(mailbox => {
      const status = (mailbox.status || '').toLowerCase();
      const isActive = status === 'active' || status === 'connected' || status === 'enabled' || 
                       status === 'running' || status === 'live' || !status;
      
      // Exclude if domain has any failed mailboxes
      if (mailbox.domain_name && failedDomains.has(mailbox.domain_name)) {
        return false;
      }
      
      return isActive;
    });
    
    console.log(`[get-renewals] ${activeMailboxes.length} of ${allMailboxes.length} mailboxes are active (after excluding failed domains)`);

    // Group by client AND date
    const renewalsByClientDate: Record<string, { count: number; domains: Set<string>; client: string }> = {};
    
    for (const mailbox of activeMailboxes) {
      const renewalDate = mailbox.renewal_date || mailbox.next_renewal || mailbox.billing_date;
      
      if (!renewalDate || renewalDate === "1970-01-01T00:00:00.000Z") {
        continue;
      }
      
      const dateKey = new Date(renewalDate).toISOString().split('T')[0];
      const domain = mailbox.domain_name || 'Unknown';
      const client = mailbox._client || 'Unknown';
      const key = `${client}|||${dateKey}`;
      
      if (!renewalsByClientDate[key]) {
        renewalsByClientDate[key] = { count: 0, domains: new Set(), client };
      }
      renewalsByClientDate[key].count++;
      renewalsByClientDate[key].domains.add(domain);
    }

    const renewals = Object.entries(renewalsByClientDate)
      .map(([key, data]) => {
        const [, date] = key.split('|||');
        return {
          date,
          client: data.client,
          count: data.count,
          domains: Array.from(data.domains),
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      total_mailboxes: activeMailboxes.length,
      renewals,
    };
  },

  // Sync InboxKit mailboxes with renewal dates to our inboxes table
  "sync-inboxes": async (config, params) => {
    if (!syncSupabase) {
      throw new Error("Supabase client not initialized for sync");
    }

    let synced = 0;
    let notFound = 0;
    let errors = 0;
    const syncDetails: any[] = [];

    try {
      // First, get all workspaces if no specific workspace_id provided
      let workspaceIds: string[] = [];
      
      if (params.workspace_id) {
        workspaceIds = [params.workspace_id];
      } else {
        // Try to fetch workspaces from InboxKit using different endpoint paths
        const workspaceEndpoints = [
          "/api/workspaces/list",
          "/api/workspaces",
          "/workspaces/list",
          "/workspaces",
          "/account", // Account endpoint might include workspaces
        ];
        
        for (const endpoint of workspaceEndpoints) {
          try {
            console.log(`Trying to fetch workspaces from ${endpoint}...`);
            const response = await inboxKitRequest(config, endpoint);
            
            // Extract workspace IDs from various possible response structures
            let workspaces: any[] = [];
            if (response.workspaces) {
              workspaces = response.workspaces;
            } else if (response.data) {
              workspaces = Array.isArray(response.data) ? response.data : [response.data];
            } else if (Array.isArray(response)) {
              workspaces = response;
            } else if (response.workspace_id || response.id || response.uid) {
              // Single workspace from account endpoint
              workspaces = [response];
            }
            
            if (workspaces.length > 0) {
              workspaceIds = workspaces
                .map((ws: any) => ws.id || ws.uid || ws.workspace_id || ws._id)
                .filter(Boolean);
              console.log(`Found ${workspaceIds.length} workspaces from ${endpoint}:`, workspaceIds);
              break;
            }
          } catch (wsErr: any) {
            console.log(`Endpoint ${endpoint} failed:`, wsErr.message);
            // Continue to next endpoint
          }
        }
        
        // If still no workspaces, try to get workspace from inbox_providers table
        if (workspaceIds.length === 0) {
          const { data: providerData } = await syncSupabase
            .from("inbox_providers")
            .select("workspace_id")
            .eq("provider_name", "inboxkit")
            .eq("is_active", true)
            .single();
          
          if (providerData?.workspace_id) {
            workspaceIds = [providerData.workspace_id];
            console.log("Using workspace_id from database:", providerData.workspace_id);
          }
        }
      }

      if (workspaceIds.length === 0) {
        return {
          total_mailboxes: 0,
          synced: 0,
          not_found: 0,
          errors: 0,
          message: "No workspaces found. Please set workspace_id in inbox_providers table or provide it in the request.",
        };
      }

      // Fetch mailboxes from each workspace
      let allMailboxes: any[] = [];
      
      for (const workspaceId of workspaceIds) {
        let page = 1;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
          try {
            // Use POST /api/mailboxes/list endpoint with pagination and X-Workspace-Id header
            const response = await inboxKitRequest(
              config, 
              "/api/mailboxes/list", 
              "POST", 
              { page, limit },
              workspaceId // Pass workspace ID for header
            );
            
            // Response structure: { data: [...], pagination: { ... } }
            const mailboxes = response.data || response.mailboxes || [];
            
            if (Array.isArray(mailboxes) && mailboxes.length > 0) {
              allMailboxes = allMailboxes.concat(mailboxes);
              page++;
              // Check pagination info if available
              const hasNextPage = response.pagination?.has_more || response.pagination?.next_page || mailboxes.length === limit;
              hasMore = hasNextPage;
            } else {
              hasMore = false;
            }
          } catch (pageErr) {
            console.error(`Error fetching mailboxes for workspace ${workspaceId}, page ${page}:`, pageErr);
            hasMore = false;
          }
        }
      }

      console.log(`Fetched ${allMailboxes.length} mailboxes from InboxKit across ${workspaceIds.length} workspaces`);

      // For each InboxKit mailbox, try to update the corresponding inbox
      for (const mailbox of allMailboxes) {
        try {
          // InboxKit stores email components separately - construct the email
          let email = mailbox.email || mailbox.email_address || mailbox.mailbox_email;
          
          // If no direct email, construct from first_name, last_name, domain_name
          if (!email && mailbox.domain_name) {
            const firstName = (mailbox.first_name || '').toLowerCase().replace(/\s+/g, '');
            const lastName = (mailbox.last_name || '').toLowerCase().replace(/\s+/g, '');
            if (firstName && lastName) {
              email = `${firstName}.${lastName}@${mailbox.domain_name}`;
            } else if (firstName) {
              email = `${firstName}@${mailbox.domain_name}`;
            }
          }
          
          // InboxKit returns renewal_date field
          const renewalDate = mailbox.renewal_date || mailbox.next_renewal || mailbox.billing_date || mailbox.renews_at;
          
          if (!email) {
            console.warn("Mailbox missing email:", { uid: mailbox.uid, domain: mailbox.domain_name });
            continue;
          }

          if (!renewalDate || renewalDate === "1970-01-01T00:00:00.000Z") {
            // No renewal date or unset value in InboxKit response, skip
            syncDetails.push({ email, status: "no_renewal_date" });
            continue;
          }

          // Try to find matching inbox by email
          const { data: inbox, error: findError } = await syncSupabase
            .from("inboxes")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          if (findError) {
            console.error(`Error finding inbox for ${email}:`, findError);
            errors++;
            continue;
          }

          if (!inbox) {
            // No matching inbox found - could be an InboxKit-only mailbox
            notFound++;
            syncDetails.push({ email, status: "not_found_in_db" });
            continue;
          }

          // Update the inbox with renewal date
          const { error: updateError } = await syncSupabase
            .from("inboxes")
            .update({ 
              renewal_date: renewalDate,
              synced_at: new Date().toISOString()
            })
            .eq("id", inbox.id);

          if (updateError) {
            console.error(`Error updating inbox ${email}:`, updateError);
            errors++;
            syncDetails.push({ email, status: "update_error", error: updateError.message });
          } else {
            synced++;
            syncDetails.push({ email, status: "synced", renewal_date: renewalDate });
          }
        } catch (mailboxErr) {
          console.error("Error processing mailbox:", mailboxErr);
          errors++;
        }
      }

      return {
        total_mailboxes: allMailboxes.length,
        synced,
        not_found: notFound,
        errors,
        details: params.include_details ? syncDetails : undefined,
      };
    } catch (err) {
      console.error("Sync error:", err);
      throw err;
    }
  },
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Set global supabase client for sync operations
    syncSupabase = supabase;

    // Get API credentials
    const config = await getApiCredentials(supabase);
    if (!config) {
      return new Response(
        JSON.stringify({ error: "InboxKit API credentials not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { action, ...params } = await req.json();

    if (!action || !handlers[action]) {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}`, available: Object.keys(handlers) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute handler
    const result = await handlers[action](config, params);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("InboxKit API error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
