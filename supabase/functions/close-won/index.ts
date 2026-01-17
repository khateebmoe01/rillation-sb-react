// Close Won Edge Function - Handles client onboarding when a deal is closed
// Deploy with: supabase functions deploy close-won

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CloseWonPayload {
  contact: {
    id: string;
    email: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    company?: string;
    company_domain?: string;
    company_website?: string;
    job_title?: string;
    lead_phone?: string;
    industry?: string;
    company_size?: string;
    annual_revenue?: string;
  };
  closedBy?: string;
}

interface BisonWorkspaceResponse {
  data?: {
    id: number;
    name: string;
    team_id?: number;
  };
  error?: string;
}

interface BisonApiTokenResponse {
  data?: {
    token?: string;
    plainTextToken?: string;
    plain_text_token?: string; // API returns snake_case
    id?: number;
    name?: string;
    abilities?: string[];
  };
  error?: string;
  success?: boolean;
}

// Get super admin API key for creating workspaces (from environment variable)
function getSuperAdminApiKey(): string | null {
  console.log("[getSuperAdminApiKey] Getting BISON_SUPER_ADMIN from environment...");
  const apiKey = Deno.env.get("BISON_SUPER_ADMIN");
  
  if (!apiKey) {
    console.error("[getSuperAdminApiKey] BISON_SUPER_ADMIN not configured in secrets");
    return null;
  }

  console.log(`[getSuperAdminApiKey] Got API key: ${apiKey.substring(0, 10)}...`);
  return apiKey;
}

// Create a new Bison workspace
async function createBisonWorkspace(
  workspaceName: string,
  masterApiKey: string
): Promise<{ teamId: number | null; error: string | null }> {
  console.log(`[createBisonWorkspace] Creating workspace: "${workspaceName}"`);
  try {
    const requestBody = JSON.stringify({ name: workspaceName });
    console.log(`[createBisonWorkspace] Request body: ${requestBody}`);
    
    const response = await fetch("https://send.rillationrevenue.com/api/workspaces/v1.1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${masterApiKey}`,
      },
      body: requestBody,
    });

    console.log(`[createBisonWorkspace] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[createBisonWorkspace] Failed:", response.status, errorText);
      return { teamId: null, error: `Failed to create workspace: ${response.status} - ${errorText}` };
    }

    const responseText = await response.text();
    console.log(`[createBisonWorkspace] Raw response: ${responseText}`);
    
    const result: BisonWorkspaceResponse = JSON.parse(responseText);
    console.log(`[createBisonWorkspace] Parsed response:`, JSON.stringify(result));
    
    if (result.error) {
      console.error("[createBisonWorkspace] API error:", result.error);
      return { teamId: null, error: result.error };
    }

    const teamId = result.data?.id || result.data?.team_id;
    console.log(`[createBisonWorkspace] Team ID: ${teamId}`);
    
    if (!teamId) {
      console.error("[createBisonWorkspace] No team ID in response");
      return { teamId: null, error: "No team ID returned from workspace creation" };
    }

    console.log(`[createBisonWorkspace] Successfully created workspace with team ID: ${teamId}`);
    return { teamId, error: null };
  } catch (err) {
    console.error("[createBisonWorkspace] Exception:", err);
    return { teamId: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// Generate API token for the new workspace with api-user role
async function generateBisonApiToken(
  teamId: number,
  superAdminApiKey: string
): Promise<{ token: string | null; error: string | null }> {
  console.log(`[generateBisonApiToken] Generating api-user token for team: ${teamId}`);
  try {
    // Note: endpoint is "api-tokens" (plural), not "api-token"
    const url = `https://send.rillationrevenue.com/api/workspaces/v1.1/${teamId}/api-tokens`;
    console.log(`[generateBisonApiToken] URL: ${url}`);
    
    // Request body with role = "api-user" to get standard API access, not super-admin
    const requestBody = JSON.stringify({
      name: "CRM Generated Token",
      abilities: ["api-user"], // Request api-user role, not super-admin
    });
    console.log(`[generateBisonApiToken] Request body: ${requestBody}`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${superAdminApiKey}`,
      },
      body: requestBody,
    });

    console.log(`[generateBisonApiToken] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generateBisonApiToken] Failed:", response.status, errorText);
      return { token: null, error: `Failed to generate API token: ${response.status} - ${errorText}` };
    }

    const responseText = await response.text();
    console.log(`[generateBisonApiToken] Raw response: ${responseText.substring(0, 200)}...`);
    
    const result: BisonApiTokenResponse = JSON.parse(responseText);
    console.log(`[generateBisonApiToken] Parsed response:`, JSON.stringify(result));
    
    if (result.error) {
      console.error("[generateBisonApiToken] API error:", result.error);
      return { token: null, error: result.error };
    }

    // Token might be in different locations in the response (API returns snake_case: plain_text_token)
    const token = result.data?.plain_text_token || result.data?.plainTextToken || result.data?.token;
    console.log(`[generateBisonApiToken] Token generated: ${token ? token.substring(0, 15) + "..." : "null"}`);
    return { token: token || null, error: null };
  } catch (err) {
    console.error("[generateBisonApiToken] Exception:", err);
    return { token: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// Build Slack Block Kit message for new client announcement
function buildClientClosedSlackMessage(
  contact: CloseWonPayload["contact"],
  clientName: string,
  closedBy: string,
  workspaceCreated: boolean,
  hasApiToken: boolean
): object {
  const blocks: object[] = [
    // Header - celebratory
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🎉 New Client Closed!",
        emoji: true,
      },
    },
    // Divider
    {
      type: "divider",
    },
    // Client and Contact info
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*🏢 Client*\n${clientName}`,
        },
        {
          type: "mrkdwn",
          text: `*👤 Contact*\n${contact.full_name || contact.email}`,
        },
      ],
    },
    // Title and Industry
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*💼 Title*\n${contact.job_title || "_Not provided_"}`,
        },
        {
          type: "mrkdwn",
          text: `*🏭 Industry*\n${contact.industry || "_Not provided_"}`,
        },
      ],
    },
    // Closed by
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*✅ Closed By*\n${closedBy}`,
        },
        {
          type: "mrkdwn",
          text: `*📧 Email*\n${contact.email}`,
        },
      ],
    },
    // Divider
    {
      type: "divider",
    },
    // Status section
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📋 Onboarding Status*\n• Client Record: ✅ Created\n• Bison Workspace: ${workspaceCreated ? "✅ Created" : "⚠️ Pending"}\n• API Key: ${hasApiToken ? "✅ Generated" : "⚠️ Pending"}`,
      },
    },
    // Timestamp footer
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `⏰ Closed on <!date^${Math.floor(Date.now() / 1000)}^{date_long_pretty} at {time}|${new Date().toISOString()}>`,
        },
      ],
    },
  ];

  return {
    blocks,
    text: `🎉 New Client Closed: ${clientName} by ${closedBy}`,
  };
}

// Send Slack notification about the closed deal - directly to webhook
async function sendSlackNotification(
  contact: CloseWonPayload["contact"],
  clientName: string,
  closedBy: string,
  workspaceCreated: boolean,
  hasApiToken: boolean
): Promise<{ success: boolean; error: string | null }> {
  console.log("[sendSlackNotification] Preparing to send notification...");
  
  try {
    const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (!slackWebhookUrl) {
      console.warn("[sendSlackNotification] SLACK_WEBHOOK_URL not configured");
      return { success: false, error: "Slack webhook not configured" };
    }

    const slackMessage = buildClientClosedSlackMessage(
      contact,
      clientName,
      closedBy,
      workspaceCreated,
      hasApiToken
    );

    console.log("[sendSlackNotification] Sending message to Slack...");
    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[sendSlackNotification] Slack webhook error:", response.status, errorText);
      return { success: false, error: `Slack webhook error: ${errorText}` };
    }

    console.log("[sendSlackNotification] Slack notification sent successfully");
    return { success: true, error: null };
  } catch (err) {
    console.error("[sendSlackNotification] Exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  console.log("=".repeat(60));
  console.log("[close-won] Request received at", new Date().toISOString());

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    console.log("[close-won] Supabase URL:", supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: CloseWonPayload = await req.json();
    const { contact, closedBy } = payload;
    console.log("[close-won] Payload received:", JSON.stringify(payload, null, 2));

    if (!contact || !contact.email) {
      console.error("[close-won] Missing contact data");
      return new Response(
        JSON.stringify({ error: "Missing contact data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[close-won] Processing Close Won for: ${contact.full_name || contact.email} from ${contact.company}`);

    // Generate client name for the Clients table
    const clientName = contact.company || `Client - ${contact.email}`;
    console.log(`[close-won] Client name: "${clientName}"`);

    // Step 1: Check if client already exists
    console.log("[close-won] Step 1: Checking if client exists...");
    const { data: existingClient, error: checkError } = await supabase
      .from("Clients")
      .select("*")
      .eq("Business", clientName)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is expected if client doesn't exist
      console.error("[close-won] Error checking for existing client:", checkError);
    }

    if (existingClient) {
      console.log(`[close-won] Client "${clientName}" already exists:`, JSON.stringify(existingClient));
      
      // Still update the engaged_lead record
      console.log(`[close-won] Updating engaged_lead stage to closed_won for: ${contact.id}`);
      const { error: updateError } = await supabase
        .from("engaged_leads")
        .update({
          stage: "closed_won",
          closed: true,
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", contact.id);

      if (updateError) {
        console.error("[close-won] Failed to update engaged_lead:", updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Client already exists",
          clientName,
          alreadyExists: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[close-won] Client does not exist, proceeding with creation...");

    // Step 2: Get super admin API key
    console.log("[close-won] Step 2: Getting super admin API key...");
    const superAdminApiKey = getSuperAdminApiKey();
    if (!superAdminApiKey) {
      console.error("[close-won] Failed to retrieve super admin API key");
      return new Response(
        JSON.stringify({ error: "Failed to retrieve super admin API key - BISON_SUPER_ADMIN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Create Bison workspace
    console.log("[close-won] Step 3: Creating Bison workspace...");
    const { teamId, error: workspaceError } = await createBisonWorkspace(clientName, superAdminApiKey);
    
    let workspaceCreated = false;
    if (workspaceError || !teamId) {
      console.error("[close-won] Workspace creation failed:", workspaceError);
      // Continue anyway - we'll add the client without Bison integration
    } else {
      workspaceCreated = true;
      console.log(`[close-won] Workspace created with team ID: ${teamId}`);
    }

    // Step 4: Generate API token if workspace was created
    let apiToken: string | null = null;
    if (teamId) {
      console.log("[close-won] Step 4: Generating API token...");
      const { token, error: tokenError } = await generateBisonApiToken(teamId, superAdminApiKey);
      if (tokenError) {
        console.error("[close-won] API token generation failed:", tokenError);
      } else {
        apiToken = token;
        console.log("[close-won] API token generated successfully");
      }
    } else {
      console.log("[close-won] Step 4: Skipping API token generation (no workspace)");
    }

    // Step 5: Insert into Clients table
    console.log("[close-won] Step 5: Inserting client record...");
    const clientRecord = {
      Business: clientName,
      Website: contact.company_website || contact.company_domain || null,
      "Api Key - Bison": apiToken || null,
      "Client ID - Bison": teamId ? String(teamId) : null,
      "App URL- Bison": "https://send.rillationrevenue.com",
    };
    console.log("[close-won] Client record:", JSON.stringify(clientRecord));
    
    const { error: insertError } = await supabase.from("Clients").insert(clientRecord);

    if (insertError) {
      console.error("[close-won] Failed to insert client:", insertError);
      return new Response(
        JSON.stringify({ error: `Failed to create client record: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("[close-won] Client record inserted successfully");

    // Step 6: Send Slack notification
    console.log("[close-won] Step 6: Sending Slack notification...");
    const { success: slackSuccess, error: slackError } = await sendSlackNotification(
      contact,
      clientName,
      closedBy || "CRM User",
      workspaceCreated,
      !!apiToken
    );
    
    if (!slackSuccess) {
      console.warn("[close-won] Slack notification failed (non-critical):", slackError);
    }

    // Step 7: Update the engaged_leads record to mark as closed
    console.log("[close-won] Step 7: Updating engaged_lead stage...");
    const { error: updateError } = await supabase
      .from("engaged_leads")
      .update({
        stage: "closed_won",
        closed: true,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact.id);

    if (updateError) {
      console.error("[close-won] Failed to update engaged_lead:", updateError);
      // Non-critical - the client was still created
    } else {
      console.log("[close-won] Engaged lead updated successfully");
    }

    console.log(`[close-won] ✅ Close Won completed successfully for: ${clientName}`);
    console.log("=".repeat(60));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Client onboarded successfully",
        clientName,
        teamId,
        hasApiToken: !!apiToken,
        workspaceCreated,
        slackNotified: slackSuccess,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[close-won] ❌ Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
