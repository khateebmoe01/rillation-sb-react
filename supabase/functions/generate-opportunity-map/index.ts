import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const SYSTEM_PROMPT = `You are an expert B2B sales strategist helping a lead generation agency create opportunity maps for their clients.

Given a transcript from a TAM (Total Addressable Market) mapping call, extract and structure the following information:

1. **Segments**: Identify market segments by tier (1 = highest priority, 2 = secondary)
   - For each segment: name, description, pain points, value proposition, target job titles (primary buyers and champions), and signals to look for

2. **Geographies**: List target geographies by tier with reasoning

3. **Company Size Bands**: Target company sizes (e.g., "1-10", "11-50", "51-200")

4. **Revenue Bands**: Target revenue ranges if mentioned

5. **Social Proof**: Any case studies, testimonials, publications, certifications, or pilots mentioned

6. **Campaign Architecture**: Monthly volume, segment distribution if discussed

7. **Events/Conferences**: Any upcoming events mentioned

8. **Next Steps**: Action items from the call

Return a JSON object with these fields. Be thorough but only include information that was actually discussed in the transcript.`;

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
          headers: { 'Content-Type': 'application/json' },
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
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Please analyze the following TAM mapping call transcript(s) for client "${client}" and create a structured opportunity map.

TRANSCRIPT:
${transcripts}

Return a JSON object with the following structure:
{
  "segments": [
    {
      "tier": 1,
      "name": "Segment Name",
      "description": "Brief description",
      "pain_points": ["pain 1", "pain 2"],
      "value_proposition": "Value prop text",
      "job_titles": {
        "primary": ["Title 1", "Title 2"],
        "champions": ["Title 3", "Title 4"]
      },
      "signals": ["signal 1", "signal 2"]
    }
  ],
  "geographies": [
    {
      "tier": 1,
      "geography": "Region/Country",
      "reason": "Why this geography"
    }
  ],
  "company_size_bands": ["1-10", "11-50"],
  "revenue_bands": ["$1M-$5M", "$5M-$20M"],
  "social_proof": {
    "case_studies": [],
    "testimonials": [],
    "publications": [],
    "certifications": [],
    "pilots": []
  },
  "campaign_architecture": {
    "monthly_volume": 30000,
    "segment_distribution": {}
  },
  "events_conferences": [],
  "next_steps": ["Step 1", "Step 2"]
}

Only include fields that were actually discussed in the transcript. Return ONLY valid JSON, no other text.`,
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
