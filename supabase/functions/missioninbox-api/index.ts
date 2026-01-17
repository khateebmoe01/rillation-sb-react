import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const MISSIONINBOX_BASE_URL = "https://api-v2.missioninbox.com";

interface MissionInboxConfig {
  apiKey: string;
  workspaceId?: string;
}

// Get API credentials from inbox_providers table
async function getApiCredentials(supabase: any): Promise<MissionInboxConfig | null> {
  const { data, error } = await supabase
    .from("inbox_providers")
    .select("api_key, workspace_id")
    .eq("provider_name", "missioninbox")
    .eq("is_active", true)
    .single();

  if (error || !data) {
    console.error("Failed to get MissionInbox credentials:", error);
    return null;
  }

  return {
    apiKey: data.api_key,
    workspaceId: data.workspace_id,
  };
}

// Make authenticated request to MissionInbox API
async function missionInboxRequest(
  config: MissionInboxConfig,
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  const url = `${MISSIONINBOX_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Api-Key ${config.apiKey}`,
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
    throw new Error(`MissionInbox API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// API Handlers
const handlers: Record<string, (config: MissionInboxConfig, params: any) => Promise<any>> = {
  // List all domains
  "list-domains": async (config) => {
    return missionInboxRequest(config, "/domains/");
  },

  // Create domain
  "create-domain": async (config, params) => {
    return missionInboxRequest(config, "/domains/", "POST", {
      domain_name: params.domain_name,
      project: params.project,
    });
  },

  // List all mailboxes
  "list-mailboxes": async (config, params) => {
    let endpoint = "/mailboxes/";
    if (params?.limit) endpoint += `?limit=${params.limit}`;
    if (params?.offset) endpoint += `${params.limit ? '&' : '?'}offset=${params.offset}`;
    return missionInboxRequest(config, endpoint);
  },

  // Create mailbox (requires confirmation in UI before calling)
  "create-mailbox": async (config, params) => {
    return missionInboxRequest(config, "/mailboxes/", "POST", {
      domain: params.domain,
      first_name: params.first_name,
      last_name: params.last_name,
      password: params.password,
      warmup: params.warmup ?? true,
    });
  },

  // Cancel mailbox
  "cancel-mailbox": async (config, params) => {
    return missionInboxRequest(config, `/mailboxes/${params.mailbox_id}/cancel/`, "POST");
  },

  // Get mailbox details
  "get-mailbox": async (config, params) => {
    return missionInboxRequest(config, `/mailboxes/${params.mailbox_id}/`);
  },

  // List activities
  "list-activities": async (config, params) => {
    let endpoint = "/activities/";
    const queryParams: string[] = [];
    if (params?.activity_type) queryParams.push(`activity_type=${params.activity_type}`);
    if (params?.limit) queryParams.push(`limit=${params.limit}`);
    if (params?.offset) queryParams.push(`offset=${params.offset}`);
    if (queryParams.length > 0) endpoint += `?${queryParams.join("&")}`;
    return missionInboxRequest(config, endpoint);
  },

  // Get health status
  "health-check": async (config) => {
    return missionInboxRequest(config, "/health/");
  },

  // Get warmup status for a mailbox
  "get-warmup-status": async (config, params) => {
    return missionInboxRequest(config, `/email-warmup/${params.mailbox_id}/`);
  },

  // Update warmup settings
  "update-warmup": async (config, params) => {
    return missionInboxRequest(config, `/email-warmup/${params.mailbox_id}/`, "PUT", {
      enabled: params.enabled,
    });
  },

  // Get account info
  "get-account": async (config) => {
    return missionInboxRequest(config, "/account/");
  },

  // Preview mailbox creation (returns cost estimate without creating)
  "preview-mailbox-creation": async (config, params) => {
    // Get account info for pricing
    const account = await missionInboxRequest(config, "/account/");
    const count = params.count || 1;
    
    return {
      count,
      domains: params.domains,
      estimated_cost: count * (account.mailbox_price || 0),
      currency: account.currency || "USD",
      account_balance: account.balance || 0,
      can_afford: (account.balance || 0) >= count * (account.mailbox_price || 0),
    };
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
        JSON.stringify({ error: "MissionInbox API credentials not found" }),
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
    console.error("MissionInbox API error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
