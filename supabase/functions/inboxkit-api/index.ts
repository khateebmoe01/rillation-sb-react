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
  body?: any
): Promise<any> {
  const url = `${INBOXKIT_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.apiKey}`,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`InboxKit API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

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

  // List mailboxes
  "list-mailboxes": async (config, params) => {
    let endpoint = "/mailboxes";
    const queryParams: string[] = [];
    if (params?.workspace_id) queryParams.push(`workspace_id=${params.workspace_id}`);
    if (params?.page) queryParams.push(`page=${params.page}`);
    if (params?.limit) queryParams.push(`limit=${params.limit}`);
    if (queryParams.length > 0) endpoint += `?${queryParams.join("&")}`;
    return inboxKitRequest(config, endpoint);
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

  // Get mailbox details
  "get-mailbox": async (config, params) => {
    return inboxKitRequest(config, `/mailboxes/${params.mailbox_id}`);
  },

  // Cancel mailboxes
  "cancel-mailboxes": async (config, params) => {
    return inboxKitRequest(config, "/mailboxes/cancel", "POST", {
      mailbox_ids: params.mailbox_ids,
    });
  },

  // Update mailbox
  "update-mailbox": async (config, params) => {
    return inboxKitRequest(config, `/mailboxes/${params.mailbox_id}`, "PUT", params.updates);
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
