import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const SYSTEM_PROMPT = `You are an expert B2B sales strategist at Rillation Revenue, a lead generation agency. You create comprehensive Opportunity Maps for clients based on TAM (Total Addressable Market) mapping call transcripts.

Your Opportunity Maps are detailed strategy documents that guide outbound campaigns. They follow a specific structure and include:

1. **How We Operate** - A section explaining Rillation's methodology:
   - Everything In Is Tracked, Everything Out Is Tracked (define variables upfront, analyze what's working)
   - Industry-First Segmentation (segment by vertical, reach all job titles/geos/sizes, find winning combinations)
   - Test-Then-Scale (Month 1 = signals, Month 2-3 = scale winners, cut losers)
   - Tracking Variables (Industry, Geography, Company Size, Revenue Range, Job Title, Signals/Triggers)

2. **Tier 1 Campaign Segments** - Primary market segments (highest priority), each with:
   - Segment name and description
   - "The Pain" - Detailed pain points (5-10 bullet points)
   - "The Value Proposition" - Clear value statement
   - "Job Titles to Target" - Two columns: Primary Buyers (decision makers) and Champions/Influencers
   - "Potential Signals" - Triggers that indicate readiness to buy

3. **Tier 2 Campaign Segments** - Secondary segments with same structure as Tier 1

4. **Geographies** - Three tiers:
   - Tier 1: Registered + Not Price Sensitive + Strategic Priority
   - Tier 2: Registered + Good Potential
   - Tier 3: Can Sell + Less Certain
   - Plus: Deprioritized and Off Limits lists
   Each with geography name and reasoning

5. **Company Size & Revenue Tracking**:
   - Employee Size Bands (1-10, 11-50, 51-200, 201-500, 501-1000, 1000+)
   - Revenue Bands (Under $1M, $1M-$5M, $5M-$20M, etc.)

6. **Social Proof Inventory** - What proof exists:
   - Case studies (count and brief descriptions)
   - Testimonials and KOL quotes
   - Publications/journal articles
   - Certifications
   - Notable pilots and deployments
   - Known data points/statistics

7. **Campaign Architecture**:
   - Monthly email volume
   - Segment distribution
   - Month-by-month launch plan

8. **Events & Conferences** - Upcoming events for pre-event outreach

9. **Next Steps** - Specific action items with owners

Be comprehensive and detailed. Include all information discussed in the transcript. Use the exact section structure above.`;

interface RequestBody {
  client: string;
  title: string;
  transcripts: string;
  callIds: string[];
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const { client, title, transcripts, callIds } = await req.json() as RequestBody;

    if (!transcripts || transcripts.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'No transcript content provided' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analyze the following TAM mapping call transcript(s) for client "${client}" and create a comprehensive Opportunity Map.

TRANSCRIPT:
${transcripts}

Return a JSON object with this exact structure:

{
  "how_we_operate": {
    "tracking": "Everything In Is Tracked, Everything Out Is Tracked - We define all variables upfront so when results come in, we analyze exactly what's working. We do not guess.",
    "segmentation": "Industry-First Segmentation - We segment by vertical/industry. Within each campaign, we reach all relevant job titles, geographies, and company sizes, then review data to find winning combinations.",
    "test_then_scale": "Test-Then-Scale - Month 1 gets signals across segments. Month 2-3, we scale winners, cut losers, test new segments.",
    "tracking_variables": ["Industry/Vertical", "Geography", "Company Size", "Revenue Range", "Job Title / Seniority", "Signal/Trigger"]
  },
  "tier1_segments": [
    {
      "name": "Segment Name",
      "description": "Brief description of this segment",
      "pain_points": [
        "Specific pain point 1",
        "Specific pain point 2",
        "Specific pain point 3"
      ],
      "value_proposition": "Clear value proposition statement for this segment",
      "job_titles": {
        "primary_buyers": ["Title 1", "Title 2", "Title 3"],
        "champions": ["Champion Title 1", "Champion Title 2"]
      },
      "signals": [
        "Signal 1 that indicates buying readiness",
        "Signal 2"
      ]
    }
  ],
  "tier2_segments": [
    {
      "name": "Segment Name",
      "description": "Description",
      "pain_points": ["Pain 1", "Pain 2"],
      "value_proposition": "Value prop",
      "job_titles": {
        "primary_buyers": ["Title 1"],
        "champions": ["Champion 1"]
      },
      "signals": ["Signal 1"]
    }
  ],
  "geographies": {
    "tier1": [
      {"geography": "Country/Region", "reason": "Why this is Tier 1"}
    ],
    "tier2": [
      {"geography": "Country/Region", "reason": "Why Tier 2"}
    ],
    "tier3": [
      {"geography": "Country/Region", "reason": "Why Tier 3"}
    ],
    "deprioritized": [
      {"geography": "Country", "reason": "Why deprioritized"}
    ],
    "off_limits": ["USA (not registered)", "Sanctioned countries"]
  },
  "company_tracking": {
    "employee_size_bands": ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
    "revenue_bands": ["Under $1M", "$1M-$5M", "$5M-$20M", "$20M-$50M", "$50M-$100M", "$100M+"]
  },
  "social_proof": {
    "case_studies": ["Case study 1 description", "Case study 2"],
    "testimonials": ["Testimonial or KOL quote 1"],
    "publications": ["Publication 1"],
    "certifications": ["Certification 1"],
    "pilots": ["Pilot 1 description"],
    "data_points": ["Known statistic 1", "Data point 2"]
  },
  "campaign_architecture": {
    "monthly_volume": 30000,
    "emails_per_prospect": 3,
    "unique_prospects_per_month": 10000,
    "segment_distribution": "~7,500 emails per segment for 4 Tier 1 segments",
    "monthly_plan": [
      {"month": 1, "focus": "Launch Tier 1 segments, gather signals"},
      {"month": 2, "focus": "Scale winners, add Tier 2 tests"},
      {"month": 3, "focus": "Scale winners, cut losers, add new tests"}
    ]
  },
  "events_conferences": [
    {"event": "Event Name", "date": "Date if known", "notes": "Any notes"}
  ],
  "next_steps": [
    {"action": "Action item description", "owner": "Person responsible", "deadline": "Deadline if mentioned"},
    {"action": "Another action item", "owner": "Owner"}
  ]
}

Be thorough and extract ALL relevant information from the transcript. If something wasn't discussed, use reasonable defaults or leave as empty array. Return ONLY valid JSON, no other text.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error('No content in Anthropic response');
    }

    // Parse the JSON from the response
    let opportunityMap;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        opportunityMap = JSON.parse(jsonMatch[0]);
      } else {
        opportunityMap = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify(opportunityMap),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in generate-opportunity-map:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
