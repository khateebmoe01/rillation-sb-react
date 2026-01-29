// Edge Function: clay-build-leads-table
// Creates a Clay workbook with a populated leads table in 2 steps:
// 1. Run enrichment preview → get taskId with companies
// 2. Run wizard with workbookId: null → creates new workbook WITH data

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { v4 as uuidv4 } from "npm:uuid";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAY_API_BASE = "https://api.clay.com/v3";
const WORKSPACE_ID = "161745";

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

interface BuildLeadsTableRequest {
  client: string;
  filters: {
    industries?: string[];
    sizes?: string[];
    country_names?: string[];
    locations?: string[];
    description_keywords?: string[];
    semantic_description?: string;
    limit?: number;
    annual_revenues?: string[];
    industries_exclude?: string[];
    country_names_exclude?: string[];
    locations_exclude?: string[];
    description_keywords_exclude?: string[];
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client, filters } = await req.json() as BuildLeadsTableRequest;

    if (!client || !filters) {
      return new Response(
        JSON.stringify({ success: false, error: "client and filters are required" }),
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
      .select("session_cookie")
      .limit(1)
      .single();

    if (authError || !authData?.session_cookie) {
      return new Response(
        JSON.stringify({ success: false, error: "Clay authentication not available" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionCookie = authData.session_cookie;
    console.log(`[${client}] Building leads table with filters:`, JSON.stringify(filters));

    // ===== STEP 1: Run Enrichment Preview =====
    console.log(`[${client}] Step 1: Running enrichment preview...`);

    const enrichmentPayload = {
      workspaceId: WORKSPACE_ID,
      enrichmentType: "find-lists-of-companies-with-mixrank-source-preview",
      options: {
        sync: true,
        returnTaskId: true,
        returnActionMetadata: true
      },
      inputs: {
        industries: filters.industries || [],
        sizes: filters.sizes || [],
        country_names: filters.country_names || [],
        limit: filters.limit || 100,
        annual_revenues: filters.annual_revenues || [],
        locations: filters.locations || [],
        description_keywords: filters.description_keywords || [],
        semantic_description: filters.semantic_description || "",
        industries_exclude: filters.industries_exclude || [],
        country_names_exclude: filters.country_names_exclude || [],
        locations_exclude: filters.locations_exclude || [],
        description_keywords_exclude: filters.description_keywords_exclude || [],
        // Required fields with defaults
        types: [],
        funding_amounts: [],
        minimum_follower_count: null,
        minimum_member_count: null,
        maximum_member_count: null,
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
        tableId: null,
        domainFieldId: null,
        useRadialKnn: false,
        radialKnnMinScore: null,
        has_resolved_domain: null,
        resolved_domain_is_live: null,
        resolved_domain_redirects: null,
        name: ""
      }
    };

    const enrichmentResponse = await fetch(`${CLAY_API_BASE}/actions/run-enrichment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": sessionCookie
      },
      body: JSON.stringify(enrichmentPayload)
    });

    if (!enrichmentResponse.ok) {
      const errorText = await enrichmentResponse.text();
      console.error(`[${client}] Enrichment failed:`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Enrichment failed: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enrichmentResult = await enrichmentResponse.json();
    const taskId = enrichmentResult.taskId;
    const companyCount = enrichmentResult.result?.companies?.length || 0;

    console.log(`[${client}] Enrichment complete. TaskId: ${taskId}, Companies: ${companyCount}`);

    if (companyCount === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No companies found matching filters",
          filters_used: filters
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== STEP 2: Run Wizard to Create Workbook with Data =====
    console.log(`[${client}] Step 2: Creating workbook with data via wizard...`);

    const sessionId = uuidv4();
    const wizardPayload = {
      workbookId: null,  // CRITICAL: null creates new workbook WITH data
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
            limit: filters.limit || 100,
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

    const wizardResponse = await fetch(`${CLAY_API_BASE}/workspaces/${WORKSPACE_ID}/wizard/evaluate-step`, {
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

    if (!wizardResponse.ok) {
      const errorText = await wizardResponse.text();
      console.error(`[${client}] Wizard failed:`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Wizard failed: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wizardResult = await wizardResponse.json();
    const tableId = wizardResult.output?.table?.tableId;
    const workbookId = wizardResult.workbookId;
    const recordCount = wizardResult.output?.recordCount || companyCount;

    console.log(`[${client}] Workbook created! TableId: ${tableId}, WorkbookId: ${workbookId}, Records: ${recordCount}`);

    const tableUrl = `https://app.clay.com/workspaces/${WORKSPACE_ID}/tables/${tableId}`;

    // Log to database
    await supabase.from("clay_execution_logs").insert({
      client,
      action: "build_leads_table",
      status: "completed",
      config_snapshot: { filters },
      result: { tableId, workbookId, recordCount, tableUrl, taskId },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        tableId,
        workbookId,
        recordCount,
        tableUrl
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in clay-build-leads-table:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
