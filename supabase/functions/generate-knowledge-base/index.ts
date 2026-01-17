import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const SYSTEM_PROMPT = `You are an expert B2B sales strategist at Rillation Revenue, a lead generation agency. You extract comprehensive client information from call transcripts to build a Knowledge Base that powers outbound campaigns.

Your task is to analyze call transcripts and extract all relevant information to populate a client Knowledge Base. This includes:

1. **Company Information** - The client company's details:
   - Company name, description, industry
   - Company size, website, headquarters
   - Year founded

2. **Company People** - Key stakeholders and contacts at the client:
   - Name, title, email
   - Role and responsibilities
   - Notes about their preferences or priorities

3. **Company Offer** - What the client sells:
   - Products (list all products mentioned)
   - Services (list all services mentioned)
   - Value propositions (key benefits they provide)
   - Pricing information (if mentioned)

4. **Company Competition** - Competitors mentioned:
   - List of competitor companies
   - Competitive advantages/disadvantages mentioned

5. **Prospect Companies** (ICP - Ideal Customer Profile):
   - ICP description (who they want to target)
   - Target industries (list all mentioned)
   - Company size targets (employee counts, revenue ranges)
   - Geographies to target

6. **Prospect People** - Target personas:
   - Job titles to target
   - Seniority levels
   - Persona notes and characteristics

7. **Copy Structures** - Email/messaging structure:
   - Sequence structure notes
   - Template guidelines

8. **Copy Variables** - Variables used in copy:
   - Custom fields and personalization tokens mentioned

9. **Copy Variable Unique Data** - Client-specific variable values:
   - Unique data points for personalization

10. **Data Quality Assurance** - Data validation requirements:
    - Validation rules mentioned
    - Quality checks required

11. **Sending Technicalities** - Campaign sending requirements:
    - Daily send limits
    - Send windows/timing
    - Domains to use
    - Technical notes

Be comprehensive and extract ALL relevant information from the transcripts. If something wasn't discussed, leave the field empty or use reasonable defaults based on context.`;

interface RequestBody {
  client: string;
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

    const { client, transcripts, callIds } = await req.json() as RequestBody;

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
            content: `Analyze the following call transcript(s) for client "${client}" and extract all relevant information to populate a Knowledge Base.

TRANSCRIPT:
${transcripts}

Return a JSON object with this exact structure:

{
  "company": {
    "name": "Company name",
    "description": "Brief description of the company",
    "industry": "Primary industry",
    "size": "Company size (e.g., 11-50, 51-200)",
    "website": "Company website URL",
    "headquarters": "Headquarters location",
    "founded": "Year founded"
  },
  "company_people": [
    {
      "name": "Person's name",
      "title": "Job title",
      "email": "Email if mentioned",
      "notes": "Any relevant notes about this person"
    }
  ],
  "company_offer": {
    "products": ["Product 1", "Product 2"],
    "services": ["Service 1", "Service 2"],
    "value_props": ["Value proposition 1", "Value proposition 2"],
    "pricing": "Pricing notes if mentioned"
  },
  "company_competition": ["Competitor 1", "Competitor 2"],
  "prospect_companies": {
    "icp_description": "Description of ideal customer profile",
    "industries": ["Target industry 1", "Target industry 2"],
    "company_sizes": ["51-200 employees", "201-500 employees"],
    "geographies": ["USA", "UK", "Canada"]
  },
  "prospect_people": {
    "job_titles": ["VP of Sales", "Director of Operations"],
    "seniority_levels": ["VP", "Director", "Manager"],
    "persona_notes": "Additional notes about target personas"
  },
  "copy_structures": {
    "sequence_structure": "Notes about email sequence structure",
    "template_guidelines": "Guidelines for email templates"
  },
  "copy_variables": {
    "variable_notes": "Notes about custom variables to use"
  },
  "copy_variable_unique_data": {
    "unique_data_notes": "Client-specific data points for personalization"
  },
  "data_quality_assurance": {
    "validation_rules": "Data validation rules",
    "quality_checks": "Quality check procedures"
  },
  "sending_technicalities": {
    "daily_limit": "Daily send limit",
    "send_window": "Send window timing",
    "domains": ["domain1.com", "domain2.com"],
    "notes": "Technical notes"
  }
}

Be thorough and extract ALL relevant information from the transcript. If something wasn't discussed, use empty strings or empty arrays. Return ONLY valid JSON, no other text.`,
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
    let knowledgeBase;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        knowledgeBase = JSON.parse(jsonMatch[0]);
      } else {
        knowledgeBase = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify(knowledgeBase),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in generate-knowledge-base:', error);
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
