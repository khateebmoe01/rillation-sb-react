// Edge Function: clay-create-workbook
// Step 1: Creates an empty workbook in Clay
// Returns workbook ID and table ID for subsequent operations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAY_API_BASE = "https://api.clay.com/v3";
const WORKSPACE_ID = "161745";

interface CreateWorkbookRequest {
  client: string;
  workbookName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client, workbookName } = await req.json() as CreateWorkbookRequest;

    if (!client || !workbookName) {
      return new Response(
        JSON.stringify({ success: false, error: "client and workbookName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Clay session cookie
    const { data: authData, error: authError } = await supabase
      .from("clay_auth")
      .select("session_cookie, expires_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (authError || !authData?.session_cookie) {
      return new Response(
        JSON.stringify({ success: false, error: "Clay authentication not available" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (authData.expires_at && new Date(authData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "Clay session expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionCookie = authData.session_cookie;
    console.log(`[${client}] Creating workbook: ${workbookName}`);

    // Create a new table (which auto-creates a workbook)
    const createTablePayload = {
      name: workbookName,
      workspaceId: WORKSPACE_ID,
      type: "company",  // Required field
    };

    const response = await fetch(`${CLAY_API_BASE}/tables`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": sessionCookie,
        "Accept": "application/json",
        "Origin": "https://app.clay.com",
        "Referer": "https://app.clay.com/"
      },
      body: JSON.stringify(createTablePayload)
    });

    const resultText = await response.text();
    console.log(`[${client}] Create table response:`, resultText);

    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid response: ${resultText.substring(0, 200)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (result.type === "InternalServerError" || result.error) {
      return new Response(
        JSON.stringify({ success: false, error: result.message || result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create workbook: ${resultText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract IDs
    const table = result.table || result;
    const tableId = table.id;
    const viewId = table.firstViewId || table.views?.[0]?.id;
    const workbookId = result.extraData?.newlyCreatedWorkbook?.id || result.workbookId;

    console.log(`[${client}] Workbook created. TableId: ${tableId}, WorkbookId: ${workbookId}`);

    const tableUrl = `https://app.clay.com/workspaces/${WORKSPACE_ID}/tables/${tableId}`;

    // Log to database
    await supabase.from("clay_execution_logs").insert({
      client,
      action: "create_workbook",
      status: "completed",
      config_snapshot: { workbookName },
      result: { tableId, workbookId, viewId, tableUrl },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        tableId,
        workbookId,
        viewId,
        tableUrl,
        workbookName
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in clay-create-workbook:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
