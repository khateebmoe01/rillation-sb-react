// Edge Function: clay-find-companies
// Step 2: Runs Find Companies enrichment with filters
// Returns taskId and company count for import step

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAY_API_BASE = "https://api.clay.com/v3";
const WORKSPACE_ID = "161745";

interface CompanyFilters {
  industries?: string[];
  sizes?: string[];
  annual_revenues?: string[];
  country_names?: string[];
  locations?: string[];
  description_keywords?: string[];
  semantic_description?: string;
  limit?: number;
  industries_exclude?: string[];
  country_names_exclude?: string[];
  locations_exclude?: string[];
  description_keywords_exclude?: string[];
  types?: string[];
  funding_amounts?: string[];
  minimum_follower_count?: number | null;
  minimum_member_count?: number | null;
  maximum_member_count?: number | null;
}

interface FindCompaniesRequest {
  client: string;
  tableId: string;
  filters: CompanyFilters;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client, tableId, filters } = await req.json() as FindCompaniesRequest;

    if (!client || !tableId || !filters) {
      return new Response(
        JSON.stringify({ success: false, error: "client, tableId, and filters are required" }),
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
    console.log(`[${client}] Finding companies for table: ${tableId}`);
    console.log(`[${client}] RAW Filters received:`, JSON.stringify(filters, null, 2));
    console.log(`[${client}] Filter keys:`, Object.keys(filters || {}));
    console.log(`[${client}] Industries:`, filters?.industries);
    console.log(`[${client}] Country names:`, filters?.country_names);
    console.log(`[${client}] Sizes:`, filters?.sizes);

    // Build enrichment payload
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
        types: filters.types || [],
        funding_amounts: filters.funding_amounts || [],
        minimum_follower_count: filters.minimum_follower_count ?? null,
        minimum_member_count: filters.minimum_member_count ?? null,
        maximum_member_count: filters.maximum_member_count ?? null,
        // Required empty fields
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
        name: "",
        result_count: true
      }
    };

    const response = await fetch(`${CLAY_API_BASE}/actions/run-enrichment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": sessionCookie
      },
      body: JSON.stringify(enrichmentPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${client}] Find companies failed:`, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Find companies failed: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log(`[${client}] FULL Enrichment response:`, JSON.stringify(result));

    const taskId = result.taskId;

    // Try multiple paths to find the company count
    const companyCount = result.result?.companyCount
      || result.result?.companies?.length
      || result.companies?.length
      || result.count
      || result.companyCount
      || (result.result && typeof result.result === 'object' ? Object.keys(result.result).length : 0)
      || 0;

    console.log(`[${client}] Parsed - taskId: ${taskId}, companyCount: ${companyCount}`);
    console.log(`[${client}] Result keys:`, result ? Object.keys(result) : 'null');

    console.log(`[${client}] Found ${companyCount} companies. TaskId: ${taskId}`);

    // Log to database
    await supabase.from("clay_execution_logs").insert({
      client,
      action: "find_companies",
      status: companyCount > 0 ? "completed" : "no_results",
      config_snapshot: { tableId, filters },
      result: { taskId, companyCount },
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        taskId,
        companyCount,
        tableId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in clay-find-companies:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
