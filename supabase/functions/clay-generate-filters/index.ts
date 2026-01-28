import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Full Clay Find Companies filter schema - ALL fields must be present
// Valid size values for Clay API
const VALID_SIZES = [
  "Self-employed",
  "2-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1,000 employees",
  "1,001-5,000 employees",
  "5,001-10,000 employees",
  "10,001+ employees"
];

// Valid revenue ranges for Clay API
const VALID_REVENUES = [
  "$0-$1M",
  "$1M-$10M",
  "$10M-$100M",
  "$100M-$1B",
  "$1B+"
];

const CLAY_FILTER_SCHEMA = {
  industries: { type: "string[]", description: "Industry names (e.g., 'Software Development', 'Healthcare')" },
  sizes: {
    type: "string[]",
    description: "Company sizes",
    validValues: VALID_SIZES
  },
  annual_revenues: { type: "string[]", description: "Revenue ranges (e.g., '$1M-$10M')" },
  country_names: { type: "string[]", description: "Country names (e.g., 'United States', 'Canada')" },
  locations: { type: "string[]", description: "Specific locations (cities, states)" },
  description_keywords: { type: "string[]", description: "Keywords to find in company descriptions" },
  semantic_description: { type: "string", description: "Natural language description of target companies" },
  limit: { type: "number", description: "Maximum number of companies to return (default 100)" },
  industries_exclude: { type: "string[]", description: "Industries to exclude" },
  country_names_exclude: { type: "string[]", description: "Countries to exclude" },
  locations_exclude: { type: "string[]", description: "Locations to exclude" },
  description_keywords_exclude: { type: "string[]", description: "Keywords to exclude" },
  funding_amounts: { type: "string[]", description: "Funding ranges" },
  types: { type: "string[]", description: "Company types" },
  minimum_member_count: { type: "number | null", description: "Minimum employee count" },
  maximum_member_count: { type: "number | null", description: "Maximum employee count" },
  minimum_follower_count: { type: "number | null", description: "Minimum LinkedIn followers" },
};

const SYSTEM_PROMPT = `You are an expert at analyzing sales call transcripts and extracting Ideal Customer Profile (ICP) information to generate Clay "Find Companies" search filters.

Your task is to analyze a Fathom call transcript and generate optimal Clay filter configuration.

## Available Clay Filter Fields

${JSON.stringify(CLAY_FILTER_SCHEMA, null, 2)}

## Valid Company Sizes (use EXACT strings):
- "Self-employed"
- "2-10 employees"
- "11-50 employees"
- "51-200 employees"
- "201-500 employees"
- "501-1,000 employees"
- "1,001-5,000 employees"
- "5,001-10,000 employees"
- "10,001+ employees"

## Valid Annual Revenue Ranges (use EXACT strings):
- "$0-$1M"
- "$1M-$10M"
- "$10M-$100M"
- "$100M-$1B"
- "$1B+"

## Instructions

1. Read the call transcript carefully
2. Extract ICP criteria mentioned (industry, company size, location, technology stack, pain points, etc.)
3. Map the extracted criteria to Clay filter fields
4. Generate a filter configuration that will find companies matching the ICP

## Output Format

Return ONLY valid JSON with this structure:
{
  "filters": {
    "industries": [],
    "sizes": [],
    "annual_revenues": [],
    "country_names": [],
    "locations": [],
    "description_keywords": [],
    "semantic_description": "",
    "limit": 100,
    "industries_exclude": [],
    "country_names_exclude": [],
    "locations_exclude": [],
    "description_keywords_exclude": [],
    "funding_amounts": [],
    "types": [],
    "minimum_member_count": null,
    "maximum_member_count": null,
    "minimum_follower_count": null
  },
  "reasoning": "Brief explanation of why these filters match the ICP discussed in the call",
  "suggested_limit": 100,
  "confidence": 0.85
}

IMPORTANT:
- All array fields MUST be arrays (even if empty: [])
- All nullable fields should be null if not applicable
- The "confidence" field should be between 0 and 1
- The "reasoning" should be 1-3 sentences explaining the key ICP traits identified
- If the transcript doesn't clearly specify an ICP, use reasonable defaults and lower confidence`;

interface GenerateFiltersRequest {
  fathom_call_id?: string;
  client?: string;
  transcript?: string;  // Can pass transcript directly for testing
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fathom_call_id, client, transcript: directTranscript } = await req.json() as GenerateFiltersRequest;

    // Validate input
    if (!fathom_call_id && !directTranscript) {
      return new Response(
        JSON.stringify({ error: "Either fathom_call_id or transcript is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let transcript = directTranscript;
    let callData: any = null;
    let clientName = client;

    // Fetch transcript from database if fathom_call_id provided
    if (fathom_call_id) {
      const { data, error } = await supabase
        .from("client_fathom_calls")
        .select("*")
        .eq("id", fathom_call_id)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: `Fathom call not found: ${error?.message || 'No data'}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      callData = data;
      transcript = data.transcript || data.summary || "";
      clientName = data.client;

      if (!transcript) {
        return new Response(
          JSON.stringify({ error: "Fathom call has no transcript or summary" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    // Call Claude to generate filters
    console.log(`Generating filters for ${clientName || 'unknown client'} from ${fathom_call_id ? 'call ' + fathom_call_id : 'direct transcript'}`);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Analyze this sales call transcript and generate Clay Find Companies filters based on the ICP discussed:

---TRANSCRIPT START---
${transcript}
---TRANSCRIPT END---

Remember to output ONLY valid JSON with the filters, reasoning, suggested_limit, and confidence fields.`
        }
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract the response content
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response
    let parsedResponse;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, responseText];
      parsedResponse = JSON.parse(jsonMatch[1] || responseText);
    } catch (parseError) {
      console.error("Failed to parse Claude response:", responseText);
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response",
          raw_response: responseText
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and normalize filter values
    const validateSizes = (sizes: string[]): string[] => {
      if (!Array.isArray(sizes)) return [];
      const valid = sizes.filter(s => VALID_SIZES.includes(s));
      const invalid = sizes.filter(s => !VALID_SIZES.includes(s));
      if (invalid.length > 0) {
        console.warn(`AI returned invalid sizes (filtered out): ${JSON.stringify(invalid)}`);
      }
      return valid;
    };

    const validateRevenues = (revenues: string[]): string[] => {
      if (!Array.isArray(revenues)) return [];
      const valid = revenues.filter(r => VALID_REVENUES.includes(r));
      const invalid = revenues.filter(r => !VALID_REVENUES.includes(r));
      if (invalid.length > 0) {
        console.warn(`AI returned invalid revenues (filtered out): ${JSON.stringify(invalid)}`);
      }
      return valid;
    };

    // Ensure all required filter fields are present with defaults
    const completeFilters = {
      industries: parsedResponse.filters?.industries || [],
      sizes: validateSizes(parsedResponse.filters?.sizes || []),
      annual_revenues: validateRevenues(parsedResponse.filters?.annual_revenues || []),
      country_names: parsedResponse.filters?.country_names || [],
      locations: parsedResponse.filters?.locations || [],
      description_keywords: parsedResponse.filters?.description_keywords || [],
      semantic_description: parsedResponse.filters?.semantic_description || "",
      limit: parsedResponse.filters?.limit || parsedResponse.suggested_limit || 100,
      industries_exclude: parsedResponse.filters?.industries_exclude || [],
      country_names_exclude: parsedResponse.filters?.country_names_exclude || [],
      locations_exclude: parsedResponse.filters?.locations_exclude || [],
      description_keywords_exclude: parsedResponse.filters?.description_keywords_exclude || [],
      funding_amounts: parsedResponse.filters?.funding_amounts || [],
      types: parsedResponse.filters?.types || [],
      minimum_member_count: parsedResponse.filters?.minimum_member_count ?? null,
      maximum_member_count: parsedResponse.filters?.maximum_member_count ?? null,
      minimum_follower_count: parsedResponse.filters?.minimum_follower_count ?? null,
      // Additional required fields for Clay API
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
    };

    // Store in database if we have a fathom_call_id
    let generatedFilterId = null;
    if (fathom_call_id && clientName) {
      const { data: insertedFilter, error: insertError } = await supabase
        .from("generated_filters")
        .insert({
          fathom_call_id,
          client: clientName,
          filters: completeFilters,
          reasoning: parsedResponse.reasoning || null,
          suggested_limit: parsedResponse.suggested_limit || completeFilters.limit,
          confidence: parsedResponse.confidence || null,
          status: "pending_review",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Failed to insert generated filter:", insertError);
      } else {
        generatedFilterId = insertedFilter.id;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated_filter_id: generatedFilterId,
        filters: completeFilters,
        reasoning: parsedResponse.reasoning,
        suggested_limit: parsedResponse.suggested_limit || completeFilters.limit,
        confidence: parsedResponse.confidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in clay-generate-filters:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
