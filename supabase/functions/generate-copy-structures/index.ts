import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const SYSTEM_PROMPT = `You are an expert B2B cold email copywriter at Rillation Revenue, a lead generation agency. You create high-converting email sequences for outbound campaigns.

Your copy is:
- Conversational and human (sounds like a real person, not AI)
- Short and punchy (3rd grade reading level)
- Value-focused (what's in it for them)
- Personalized using variables that will be filled by Clay/data enrichment

You use variables in the format {{variable_name}} that will be replaced with personalized data. Common variables include:
- {{first_name}} - Recipient's first name
- {{company}} - Recipient's company name
- {{wywn}} - "What you're working on" - personalized observation about their business
- {{pain_point}} - Specific pain point relevant to their industry/role
- {{ICP}} - Ideal customer profile description
- {{relevant_services}} - Services they provide that are relevant
- {{specific_costly_outcome}} - Costly outcome they want to avoid
- {{unique_mechanism}} - Your client's unique approach/method
- {{what_they_offer}} - What the client offers
- {{specific_big_gain}} - Big benefit they could achieve

When creating email sequences:
1. Email 1: The opener - short, intriguing, personal. Get attention.
2. Email 2: Value-add or follow-up - provide more context or a different angle
3. Email 3: Last touch - direct ask, or referral request

Keep emails under 100 words each. End with soft CTAs like "Worth a convo?" or "Worth sharing some thoughts?"`;

interface KnowledgeBase {
  company?: { name?: string; description?: string };
  company_offer?: { products?: string[]; services?: string[]; value_props?: string[] };
  prospect_companies?: { icp_description?: string; industries?: string[] };
  prospect_people?: { job_titles?: string[]; persona_notes?: string };
}

interface RequestBody {
  client: string;
  knowledgeBase: KnowledgeBase;
  transcripts?: string;
  existingSequences?: any[];
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

    const { client, knowledgeBase, transcripts, existingSequences } = await req.json() as RequestBody;

    if (!knowledgeBase || Object.keys(knowledgeBase).length === 0) {
      return new Response(
        JSON.stringify({ error: 'Knowledge Base is required. Please generate the Knowledge Base first.' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Build context from knowledge base
    const kbContext = `
CLIENT: ${client}
COMPANY: ${knowledgeBase.company?.name || client}
DESCRIPTION: ${knowledgeBase.company?.description || 'Not provided'}
PRODUCTS/SERVICES: ${[...(knowledgeBase.company_offer?.products || []), ...(knowledgeBase.company_offer?.services || [])].join(', ') || 'Not provided'}
VALUE PROPOSITIONS: ${knowledgeBase.company_offer?.value_props?.join(', ') || 'Not provided'}
ICP: ${knowledgeBase.prospect_companies?.icp_description || 'Not provided'}
TARGET INDUSTRIES: ${knowledgeBase.prospect_companies?.industries?.join(', ') || 'Not provided'}
TARGET TITLES: ${knowledgeBase.prospect_people?.job_titles?.join(', ') || 'Not provided'}
PERSONA NOTES: ${knowledgeBase.prospect_people?.persona_notes || 'Not provided'}
`;

    const transcriptContext = transcripts ? `\n\nADDITIONAL CONTEXT FROM CALLS:\n${transcripts}` : '';

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
            content: `Create email sequences for the following client. Generate 2-3 email sequences (each with 3 emails) for different testing angles or segments.

${kbContext}
${transcriptContext}

Return a JSON object with this exact structure:

{
  "sequences": [
    {
      "id": "seq_1",
      "name": "Primary Sequence - [Angle Name]",
      "phase": "PHASE 1 TESTING",
      "description": "Brief description of the angle/approach",
      "emails": [
        {
          "id": "email_1",
          "subject": "Optional subject line",
          "body": "The email body with {{variables}} for personalization. Keep it short and conversational.",
          "variables": ["first_name", "wywn", "pain_point"],
          "notes": "Optional notes about this email"
        },
        {
          "id": "email_2",
          "body": "Follow-up email body...",
          "variables": ["first_name", "ICP"]
        },
        {
          "id": "email_3", 
          "body": "Final touch email...",
          "variables": ["first_name"]
        }
      ]
    }
  ],
  "variables_used": ["first_name", "wywn", "pain_point", "ICP", "etc"]
}

Guidelines:
- Use {{variable}} syntax for all personalization
- Keep emails under 100 words
- End with soft CTAs
- Make it sound human, not robotic
- Include multiple angle variations for A/B testing
- Add optional notes explaining the strategy

Return ONLY valid JSON, no other text.`,
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
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in generate-copy-structures:', error);
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
