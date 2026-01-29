// Edge Function: clay-import-companies
// Step 3: Imports found companies to the CE table in a workbook
// Uses the taskId from clay-find-companies

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { v4 as uuidv4 } from "npm:uuid";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAY_API_BASE = "https://api.clay.com/v3";
const WORKSPACE_ID = "161745";

// Basic fields for company table
const BASIC_FIELDS = [
  { name: "Name", dataType: "text", formulaText: "{{source}}.name" },
  { name: "Description", dataType: "text", formulaText: "{{source}}.description" },
  { name: "Primary Industry", dataType: "text", formulaText: "{{source}}.industry" },
  {
    name: "Size",
    dataType: "select",
    formulaText: "{{source}}.size",
    options: [
      { id: "d84c757f-2e85-4c86-a906-ee58f9e67ff5", text: "Self-employed", color: "yellow" },
      { id: "0a6c5b94-d606-4e65-a14e-0cccfdbe451a", text: "2-10 employees", color: "blue" },
      { id: "47162660-fe09-46dc-9ee2-6fb0863fa87d", text: "11-50 employees", color: "green" },
      { id: "ae2d4c77-9f2f-4a0b-9977-c51fc7a92bdc", text: "51-200 employees", color: "red" },
      { id: "abf125d7-c104-4079-a499-0b83273bc402", text: "201-500 employees", color: "violet" },
      { id: "b3d556bc-7235-4c19-8d4d-0a7ef35eb641", text: "501-1,000 employees", color: "grey" },
      { id: "99f3077b-c62f-49fa-9c5a-17bd491502d5", text: "1,001-5,000 employees", color: "orange" },
      { id: "94ec907c-6f15-4913-8b10-dd07b67909ce", text: "5,001-10,000 employees", color: "pink" },
      { id: "a9f27362-ea22-4751-82c2-ef66240dda10", text: "10,001+ employees", color: "yellow" }
    ]
  },
  { name: "Type", dataType: "text", formulaText: "{{source}}.type" },
  { name: "Location", dataType: "text", formulaText: "{{source}}.location" },
  { name: "Country", dataType: "text", formulaText: "{{source}}.country" },
  { name: "Domain", dataType: "url", formulaText: "{{source}}.domain" },
  { name: "LinkedIn URL", dataType: "url", formulaText: "{{source}}.linkedin_url", isDedupeField: true }
];

interface ImportCompaniesRequest {
  client: string;
  workbookName: string;
  workbookId?: string | null;  // Optional - wizard creates new workbook if null
  tableId?: string | null;     // Optional - not used when creating new workbook
  taskId: string;              // The task ID from find-companies step
  filters: Record<string, unknown>;  // The original filters used
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client, workbookName, workbookId, tableId, taskId, filters } = await req.json() as ImportCompaniesRequest;

    if (!client || !taskId) {
      return new Response(
        JSON.stringify({ success: false, error: "client and taskId are required" }),
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

    const sessionCookie = authData.session_cookie;
    console.log(`[${client}] Creating workbook and importing companies. taskId: ${taskId}`);
    console.log(`[${client}] RAW filters received:`, JSON.stringify(filters, null, 2));
    console.log(`[${client}] Industries in filters:`, filters?.industries);
    console.log(`[${client}] Sizes in filters:`, filters?.sizes);

    // Build the wizard import payload
    // Use the workbookId and tableId from step 1 (clay-create-workbook)
    const sessionId = uuidv4();
    console.log(`[${client}] Using workbookId: ${workbookId}, tableId: ${tableId}`);
    const wizardPayload = {
      workbookId: null,  // ALWAYS null - existing workbookId causes empty tables
      wizardId: "find-companies",
      wizardStepId: "companies-search",
      formInputs: {
        clientSettings: { tableType: "company" },
        requiredDataPoint: null,
        basicFields: BASIC_FIELDS,
        previewActionTaskId: taskId,
        type: "companies",
        typeSettings: {
          name: "Find companies",
          iconType: "Buildings",
          actionKey: "find-lists-of-companies-with-mixrank-source",
          actionPackageId: "e251a70e-46d7-4f3a-b3ef-a211ad3d8bd2",
          previewTextPath: "name",
          defaultPreviewText: "Profile",
          recordsPath: "companies",
          idPath: "linkedin_company_id",
          scheduleConfig: { runSettings: "once" },
          // All inputs should be EMPTY - the previewActionTaskId already contains the results
          inputs: {
            types: [],
            country_names: [],
            country_names_exclude: [],
            sizes: [],
            funding_amounts: [],
            annual_revenues: [],
            industries: [],
            industries_exclude: [],
            description_keywords_exclude: [],
            description_keywords: [],
            minimum_follower_count: null,
            minimum_member_count: null,
            maximum_member_count: null,
            locations: [],
            locations_exclude: [],
            semantic_description: "",
            company_identifier: [],
            startFromCompanyType: "company_identifier",
            exclude_company_identifiers_mixed: [],
            exclude_entities_configuration: [],
            exclude_entities_bitmap: null,
            previous_entities_bitmap: null,
            derived_industries: [],
            derived_subindustries: [],
            derived_subindustries_exclude: [],
            derived_revenue_streams: [],
            derived_business_types: [],
            limit: filters?.limit || 100,
            tableId: null,
            domainFieldId: null,
            useRadialKnn: false,
            radialKnnMinScore: null,
            has_resolved_domain: null,
            resolved_domain_is_live: null,
            resolved_domain_redirects: null,
            name: ""
          },
          hasEvaluatedInputs: true,
          previewActionKey: "find-lists-of-companies-with-mixrank-source-preview"
        }
      },
      sessionId: sessionId,
      currentStepIndex: 0,
      outputs: [],
      firstUseCase: null,
      parentFolderId: null
    };

    console.log(`[${client}] Wizard payload:`, JSON.stringify(wizardPayload, null, 2));

    const response = await fetch(`${CLAY_API_BASE}/workspaces/${WORKSPACE_ID}/wizard/evaluate-step`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": sessionCookie,
        "Accept": "application/json",
        "Origin": "https://app.clay.com",
        "Referer": "https://app.clay.com/"
      },
      body: JSON.stringify(wizardPayload)
    });

    const resultText = await response.text();

    // ===== DETAILED LOGGING: Full wizard response structure =====
    console.log(`[${client}] === FULL WIZARD RESPONSE ===`);
    console.log(resultText);
    console.log(`[${client}] === END WIZARD RESPONSE ===`);

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
      console.error(`[${client}] Clay wizard error:`, JSON.stringify(result));
      return new Response(
        JSON.stringify({
          success: false,
          error: result.message || result.error,
          clayResponse: result,
          debug: { taskId, workbookName, httpStatus: response.status }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Import failed: ${resultText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract results - use existing IDs if not returned
    const newTableId = result.output?.table?.tableId || result.tableId || tableId;
    const newWorkbookId = result.workbookId || result.output?.workbookId || workbookId;

    // ===== EXTRACT sourceId from multiple possible paths =====
    const sourceId = result.output?.source?.id
      || result.output?.sourceId
      || result.sourceId
      || result.output?.table?.sourceId
      || result.output?.source?.sourceId
      || null;

    console.log(`[${client}] === EXTRACTED IDs ===`);
    console.log(`[${client}] tableId: ${newTableId}`);
    console.log(`[${client}] workbookId: ${newWorkbookId}`);
    console.log(`[${client}] sourceId: ${sourceId}`);
    console.log(`[${client}] === END EXTRACTED IDs ===`);

    // Step 2: Call bulk-fetch-records to actually populate the table
    console.log(`[${client}] Calling bulk-fetch-records to populate table...`);

    // Try passing sourceId if we found one
    const bulkFetchBody = sourceId ? { sourceId } : {};
    console.log(`[${client}] Bulk fetch body:`, JSON.stringify(bulkFetchBody));

    const bulkFetchResponse = await fetch(`${CLAY_API_BASE}/tables/${newTableId}/bulk-fetch-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": sessionCookie,
        "Accept": "application/json",
        "Origin": "https://app.clay.com",
        "Referer": "https://app.clay.com/"
      },
      body: JSON.stringify(bulkFetchBody)
    });

    const bulkFetchText = await bulkFetchResponse.text();
    console.log(`[${client}] Bulk fetch response status: ${bulkFetchResponse.status}`);
    console.log(`[${client}] Bulk fetch response: ${bulkFetchText.substring(0, 1000)}`);

    if (!bulkFetchResponse.ok) {
      console.error(`[${client}] Bulk fetch failed, but table was created. Continuing...`);
      // Don't fail entirely - the table exists, data may populate eventually
    }

    // ===== Step 3: Try Source-Specific Run Endpoints (if sourceId exists) =====
    // This may trigger the actual data import from the source
    if (sourceId) {
      console.log(`[${client}] Trying source-specific run endpoints...`);

      // Attempt 1: POST /v3/sources/{sourceId}/run
      try {
        console.log(`[${client}] Trying POST /v3/sources/${sourceId}/run`);
        const sourceRunResponse = await fetch(`${CLAY_API_BASE}/sources/${sourceId}/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cookie": sessionCookie,
            "Accept": "application/json",
            "Origin": "https://app.clay.com",
            "Referer": "https://app.clay.com/"
          },
          body: JSON.stringify({})
        });
        const sourceRunText = await sourceRunResponse.text();
        console.log(`[${client}] Source run response status: ${sourceRunResponse.status}`);
        console.log(`[${client}] Source run response: ${sourceRunText.substring(0, 1000)}`);
      } catch (e) {
        console.log(`[${client}] Source run attempt 1 failed: ${e.message}`);
      }

      // Attempt 2: PATCH /v3/tables/{tableId}/sources/{sourceId}/run
      try {
        console.log(`[${client}] Trying PATCH /v3/tables/${newTableId}/sources/${sourceId}/run`);
        const tableSourceRunResponse = await fetch(`${CLAY_API_BASE}/tables/${newTableId}/sources/${sourceId}/run`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Cookie": sessionCookie,
            "Accept": "application/json",
            "Origin": "https://app.clay.com",
            "Referer": "https://app.clay.com/"
          },
          body: JSON.stringify({})
        });
        const tableSourceRunText = await tableSourceRunResponse.text();
        console.log(`[${client}] Table source run response status: ${tableSourceRunResponse.status}`);
        console.log(`[${client}] Table source run response: ${tableSourceRunText.substring(0, 1000)}`);
      } catch (e) {
        console.log(`[${client}] Source run attempt 2 failed: ${e.message}`);
      }

      // Attempt 3: POST /v3/tables/{tableId}/sources/{sourceId}/fetch
      try {
        console.log(`[${client}] Trying POST /v3/tables/${newTableId}/sources/${sourceId}/fetch`);
        const sourceFetchResponse = await fetch(`${CLAY_API_BASE}/tables/${newTableId}/sources/${sourceId}/fetch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cookie": sessionCookie,
            "Accept": "application/json",
            "Origin": "https://app.clay.com",
            "Referer": "https://app.clay.com/"
          },
          body: JSON.stringify({})
        });
        const sourceFetchText = await sourceFetchResponse.text();
        console.log(`[${client}] Source fetch response status: ${sourceFetchResponse.status}`);
        console.log(`[${client}] Source fetch response: ${sourceFetchText.substring(0, 1000)}`);
      } catch (e) {
        console.log(`[${client}] Source fetch attempt failed: ${e.message}`);
      }
    } else {
      console.log(`[${client}] No sourceId found, skipping source-specific endpoints`);
    }

    const recordsImported = result.output?.recordCount || result.tableTotalRecordsCount || result.numSourceRecords || 0;

    console.log(`[${client}] Import complete. TableId: ${newTableId}, WorkbookId: ${newWorkbookId}, Records: ${recordsImported}, SourceId: ${sourceId}`);

    const tableUrl = `https://app.clay.com/workspaces/${WORKSPACE_ID}/tables/${newTableId}`;

    // Log to database
    await supabase.from("clay_execution_logs").insert({
      client,
      action: "import_companies",
      status: "completed",
      config_snapshot: { workbookName, taskId, filters },
      result: { tableId: newTableId, workbookId: newWorkbookId, recordsImported, tableUrl },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        tableId: newTableId,
        workbookId: newWorkbookId,
        sourceId,
        recordsImported,
        tableUrl
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in clay-import-companies:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
