import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { v4 as uuidv4 } from "npm:uuid";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLAY_API_BASE = "https://api.clay.com/v3";
const WORKSPACE_ID = "161745";  // Clay workspace ID

// Basic fields for company table - matching Clay's web app format
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

interface SubmitFiltersRequest {
  generated_filter_id: string;
  table_name?: string;  // Optional custom table name
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generated_filter_id, table_name } = await req.json() as SubmitFiltersRequest;

    if (!generated_filter_id) {
      return new Response(
        JSON.stringify({ error: "generated_filter_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the generated filter
    const { data: filterRecord, error: filterError } = await supabase
      .from("generated_filters")
      .select("*")
      .eq("id", generated_filter_id)
      .single();

    if (filterError || !filterRecord) {
      return new Response(
        JSON.stringify({ error: `Filter not found: ${filterError?.message || 'No data'}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check status - must be pending_review or approved
    if (filterRecord.status === "submitted") {
      return new Response(
        JSON.stringify({
          error: "Filter already submitted to Clay",
          clay_table_id: filterRecord.clay_table_id
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Clay session cookie from database
    const { data: authData, error: authError } = await supabase
      .from("clay_auth")
      .select("session_cookie")
      .limit(1)
      .single();

    if (authError || !authData?.session_cookie) {
      return new Response(
        JSON.stringify({ error: "Clay authentication not available. Run clay-auth-refresh first." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionCookie = authData.session_cookie;
    const filters = filterRecord.filters;

    console.log(`Submitting filters to Clay for ${filterRecord.client}:`, JSON.stringify(filters, null, 2));

    // ===== STEP 1: Run Enrichment Preview =====
    // This generates matching companies and returns a taskId

    const enrichmentPayload = {
      workspaceId: WORKSPACE_ID,
      enrichmentType: "find-lists-of-companies-with-mixrank-source-preview",
      options: {
        sync: true,
        returnTaskId: true,
        returnActionMetadata: true
      },
      inputs: {
        // Core filters from AI
        industries: filters.industries || [],
        sizes: filters.sizes || [],
        country_names: filters.country_names || [],
        limit: filters.limit || 100,
        annual_revenues: filters.annual_revenues || [],
        locations: filters.locations || [],
        description_keywords: filters.description_keywords || [],
        semantic_description: filters.semantic_description || "",

        // Exclusion filters
        industries_exclude: filters.industries_exclude || [],
        country_names_exclude: filters.country_names_exclude || [],
        locations_exclude: filters.locations_exclude || [],
        description_keywords_exclude: filters.description_keywords_exclude || [],

        // Required empty fields (Clay API requires all fields present)
        types: filters.types || [],
        funding_amounts: filters.funding_amounts || [],
        minimum_follower_count: filters.minimum_follower_count ?? null,
        minimum_member_count: filters.minimum_member_count ?? null,
        maximum_member_count: filters.maximum_member_count ?? null,
        company_identifier: filters.company_identifier || [],
        startFromCompanyType: filters.startFromCompanyType || "company_identifier",
        exclude_company_identifiers_mixed: filters.exclude_company_identifiers_mixed || [],
        exclude_entities_configuration: filters.exclude_entities_configuration || [],
        exclude_entities_bitmap: filters.exclude_entities_bitmap ?? null,
        previous_entities_bitmap: filters.previous_entities_bitmap ?? null,
        derived_industries: filters.derived_industries || [],
        derived_subindustries: filters.derived_subindustries || [],
        derived_subindustries_exclude: filters.derived_subindustries_exclude || [],
        derived_revenue_streams: filters.derived_revenue_streams || [],
        derived_business_types: filters.derived_business_types || [],
        tableId: filters.tableId ?? null,
        domainFieldId: filters.domainFieldId ?? null,
        useRadialKnn: filters.useRadialKnn ?? false,
        radialKnnMinScore: filters.radialKnnMinScore ?? null,
        has_resolved_domain: filters.has_resolved_domain ?? null,
        resolved_domain_is_live: filters.resolved_domain_is_live ?? null,
        resolved_domain_redirects: filters.resolved_domain_redirects ?? null,
        name: filters.name || ""
      }
    };

    console.log("Step 1: Running enrichment preview...");
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
      console.error("Enrichment preview failed:", errorText);

      // Update filter record with error
      await supabase
        .from("generated_filters")
        .update({
          status: "failed",
          error_message: `Enrichment preview failed: ${errorText}`
        })
        .eq("id", generated_filter_id);

      return new Response(
        JSON.stringify({ error: "Enrichment preview failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enrichmentResult = await enrichmentResponse.json();
    console.log("Full enrichment response:", JSON.stringify(enrichmentResult, null, 2));

    const taskId = enrichmentResult.taskId;
    // Count is nested in result.companyCount or result.companies.length
    const companyCount = enrichmentResult.result?.companyCount
      || enrichmentResult.result?.companies?.length
      || enrichmentResult.count
      || 0;

    console.log(`Enrichment preview complete. TaskId: ${taskId}, Companies found: ${companyCount}`);

    // Update with task ID
    await supabase
      .from("generated_filters")
      .update({ clay_task_id: taskId })
      .eq("id", generated_filter_id);

    // Check if we have any companies to import
    if (companyCount === 0) {
      await supabase
        .from("generated_filters")
        .update({
          status: "failed",
          error_message: "No companies found matching these filters. Try broadening your search criteria (fewer industries, larger geography, or lower minimum employee count)."
        })
        .eq("id", generated_filter_id);

      return new Response(
        JSON.stringify({
          error: "No companies found",
          message: "No companies match the current filters. Consider:",
          suggestions: [
            "Reduce the number of industries or use broader categories",
            "Remove or lower the minimum employee count",
            "Expand the geographic scope",
            "Remove annual revenue filters",
            "Simplify description keywords"
          ],
          filters_summary: {
            industries: filters.industries?.length || 0,
            countries: filters.country_names?.length || 0,
            min_employees: filters.minimum_member_count,
            has_revenue_filter: (filters.annual_revenues?.length || 0) > 0
          },
          debug_enrichment_response: enrichmentResult
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== STEP 2: Wizard Import (Create Table + Import Companies) =====
    const sessionId = uuidv4();
    const finalTableName = table_name || `${filterRecord.client} - Find Companies ${new Date().toISOString().split('T')[0]}`;

    // Full wizard payload matching Clay's web app format
    const wizardPayload = {
      workbookId: null,  // null creates new workbook
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
          // CRITICAL: inputs must contain the filter criteria
          inputs: {
            types: filters.types || [],
            country_names: filters.country_names || [],
            country_names_exclude: filters.country_names_exclude || [],
            sizes: filters.sizes || [],
            funding_amounts: filters.funding_amounts || [],
            annual_revenues: filters.annual_revenues || [],
            industries: filters.industries || [],
            industries_exclude: filters.industries_exclude || [],
            description_keywords_exclude: filters.description_keywords_exclude || [],
            description_keywords: filters.description_keywords || [],
            minimum_follower_count: filters.minimum_follower_count ?? null,
            minimum_member_count: filters.minimum_member_count ?? null,
            maximum_member_count: filters.maximum_member_count ?? null,
            locations: filters.locations || [],
            locations_exclude: filters.locations_exclude || [],
            semantic_description: filters.semantic_description || "",
            company_identifier: filters.company_identifier || [],
            startFromCompanyType: filters.startFromCompanyType || "company_identifier",
            exclude_company_identifiers_mixed: filters.exclude_company_identifiers_mixed || [],
            exclude_entities_configuration: filters.exclude_entities_configuration || [],
            exclude_entities_bitmap: filters.exclude_entities_bitmap ?? null,
            previous_entities_bitmap: filters.previous_entities_bitmap ?? null,
            derived_industries: filters.derived_industries || [],
            derived_subindustries: filters.derived_subindustries || [],
            derived_subindustries_exclude: filters.derived_subindustries_exclude || [],
            derived_revenue_streams: filters.derived_revenue_streams || [],
            derived_business_types: filters.derived_business_types || [],
            limit: filters.limit || 100,
            tableId: filters.tableId ?? null,
            domainFieldId: filters.domainFieldId ?? null,
            useRadialKnn: filters.useRadialKnn ?? false,
            radialKnnMinScore: filters.radialKnnMinScore ?? null,
            has_resolved_domain: filters.has_resolved_domain ?? null,
            resolved_domain_is_live: filters.resolved_domain_is_live ?? null,
            resolved_domain_redirects: filters.resolved_domain_redirects ?? null,
            name: filters.name || ""
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

    console.log("Step 2: Executing wizard import...");
    console.log("Wizard payload:", JSON.stringify(wizardPayload, null, 2));

    // Add headers that Clay's web app sends
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

    console.log("Wizard response status:", wizardResponse.status);
    console.log("Wizard response headers:", JSON.stringify(Object.fromEntries(wizardResponse.headers.entries())));

    if (!wizardResponse.ok) {
      const errorText = await wizardResponse.text();
      console.error("Wizard import failed:", errorText);
      console.error("Full wizard payload was:", JSON.stringify(wizardPayload, null, 2));

      // Update filter record with error
      await supabase
        .from("generated_filters")
        .update({
          status: "failed",
          error_message: `Wizard import failed: ${errorText}`
        })
        .eq("id", generated_filter_id);

      return new Response(
        JSON.stringify({
          error: "Wizard import failed",
          details: errorText,
          debug: {
            taskId,
            companyCount,
            wizardPayloadSummary: {
              wizardId: wizardPayload.wizardId,
              sessionId: wizardPayload.sessionId,
              basicFieldsCount: BASIC_FIELDS.length,
              typeSettings: wizardPayload.formInputs.typeSettings
            }
          }
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wizardResult = await wizardResponse.json();

    // ===== DETAILED LOGGING: Full wizard response structure =====
    console.log("=== FULL WIZARD RESPONSE ===");
    console.log(JSON.stringify(wizardResult, null, 2));
    console.log("=== END WIZARD RESPONSE ===");

    // Extract from nested response structure
    const tableId = wizardResult.output?.table?.tableId || wizardResult.tableId;
    const workbookId = wizardResult.workbookId || wizardResult.output?.workbookId;
    const recordsImported = wizardResult.output?.recordCount || wizardResult.tableTotalRecordsCount || wizardResult.numSourceRecords || 0;

    // ===== EXTRACT sourceId from multiple possible paths =====
    const sourceId = wizardResult.output?.source?.id
      || wizardResult.output?.sourceId
      || wizardResult.sourceId
      || wizardResult.output?.table?.sourceId
      || wizardResult.output?.source?.sourceId
      || null;

    console.log("=== EXTRACTED IDs ===");
    console.log(`tableId: ${tableId}`);
    console.log(`workbookId: ${workbookId}`);
    console.log(`sourceId: ${sourceId}`);
    console.log(`recordsImported: ${recordsImported}`);
    console.log("=== END EXTRACTED IDs ===");

    console.log(`Wizard import complete. TableId: ${tableId}, Records: ${recordsImported}, SourceId: ${sourceId}`);

    // ===== STEP 3: Bulk Fetch Records (Trigger Data Population) =====
    // The wizard import creates the table structure but doesn't populate it with data.
    // The bulk-fetch-records call triggers Clay to actually insert the rows.
    console.log("Step 3: Triggering bulk-fetch-records to populate table...");

    // Try passing sourceId if we found one
    const bulkFetchBody = sourceId ? { sourceId } : {};
    console.log("Bulk fetch body:", JSON.stringify(bulkFetchBody));

    const bulkFetchResponse = await fetch(`${CLAY_API_BASE}/tables/${tableId}/bulk-fetch-records`, {
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
    console.log(`Bulk fetch response status: ${bulkFetchResponse.status}`);
    console.log(`Bulk fetch response: ${bulkFetchText.substring(0, 1000)}`);

    if (!bulkFetchResponse.ok) {
      console.error("Bulk fetch failed, but table was created. Continuing...");
      // Don't fail entirely - the table exists, data may populate eventually
    }

    // ===== STEP 4: Try Source-Specific Run Endpoint (if sourceId exists) =====
    // This may trigger the actual data import from the source
    if (sourceId) {
      console.log("Step 4: Trying source-specific run endpoints...");

      // Attempt 1: POST /v3/sources/{sourceId}/run
      try {
        console.log(`Trying POST /v3/sources/${sourceId}/run`);
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
        console.log(`Source run response status: ${sourceRunResponse.status}`);
        console.log(`Source run response: ${sourceRunText.substring(0, 1000)}`);
      } catch (e) {
        console.log(`Source run attempt 1 failed: ${e.message}`);
      }

      // Attempt 2: PATCH /v3/tables/{tableId}/sources/{sourceId}/run
      try {
        console.log(`Trying PATCH /v3/tables/${tableId}/sources/${sourceId}/run`);
        const tableSourceRunResponse = await fetch(`${CLAY_API_BASE}/tables/${tableId}/sources/${sourceId}/run`, {
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
        console.log(`Table source run response status: ${tableSourceRunResponse.status}`);
        console.log(`Table source run response: ${tableSourceRunText.substring(0, 1000)}`);
      } catch (e) {
        console.log(`Source run attempt 2 failed: ${e.message}`);
      }

      // Attempt 3: POST /v3/tables/{tableId}/sources/{sourceId}/fetch
      try {
        console.log(`Trying POST /v3/tables/${tableId}/sources/${sourceId}/fetch`);
        const sourceFetchResponse = await fetch(`${CLAY_API_BASE}/tables/${tableId}/sources/${sourceId}/fetch`, {
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
        console.log(`Source fetch response status: ${sourceFetchResponse.status}`);
        console.log(`Source fetch response: ${sourceFetchText.substring(0, 1000)}`);
      } catch (e) {
        console.log(`Source fetch attempt failed: ${e.message}`);
      }
    } else {
      console.log("Step 4: No sourceId found, skipping source-specific endpoints");
    }

    // Update filter record with success
    await supabase
      .from("generated_filters")
      .update({
        status: "submitted",
        clay_table_id: tableId,
        clay_response: wizardResult,
        submitted_to_clay_at: new Date().toISOString()
      })
      .eq("id", generated_filter_id);

    return new Response(
      JSON.stringify({
        success: true,
        table_id: tableId,
        workbook_id: workbookId,
        source_id: sourceId,
        task_id: taskId,
        records_imported: recordsImported,
        companies_found: companyCount,
        table_name: finalTableName
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in clay-submit-filters:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
