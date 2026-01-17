import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const SYSTEM_PROMPT = `You are an expert at writing Clay/Claygent prompts for B2B sales personalization. You create precise, structured prompts that generate exactly the output needed for email personalization variables.

Your prompts follow a specific structure:
1. #CONTEXT# - Sets the scene for the AI
2. #OBJECTIVE# - Exactly what output is needed
3. #INSTRUCTIONS# - Step-by-step rules (numbered)
4. #STYLE CONSTRAINTS# - Tone, length, reading level
5. #OUTPUT FORMAT# - What the final output should look like

Key principles:
- Be extremely specific about which Clay columns to use
- Set strict word/character limits
- Specify reading level (usually 3rd grade)
- Include fallback instructions if data is missing
- Always say "Output the result only, no explanations"

Common Clay columns you can reference:
- {{first_name}}, {{last_name}}, {{full_name}}
- {{company}}, {{company_domain}}
- {{job_title}}, {{seniority_level}}
- {{industry}}, {{company_size}}
- {{company_description}}, {{linkedin_bio}}
- {{recent_news}}, {{job_postings}}
- Any custom enrichment columns`;

interface KnowledgeBase {
  company?: { name?: string; description?: string };
  company_offer?: { products?: string[]; services?: string[]; value_props?: string[] };
  prospect_companies?: { icp_description?: string; industries?: string[] };
  prospect_people?: { job_titles?: string[]; persona_notes?: string };
}

interface RequestBody {
  client: string;
  variables: string[];
  knowledgeBase: KnowledgeBase;
  existingPrompts?: Record<string, any>;
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

    const { client, variables, knowledgeBase, existingPrompts } = await req.json() as RequestBody;

    if (!variables || variables.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No variables provided' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Build context from knowledge base
    const kbContext = `
CLIENT: ${client}
COMPANY: ${knowledgeBase?.company?.name || client}
WHAT THEY OFFER: ${[...(knowledgeBase?.company_offer?.products || []), ...(knowledgeBase?.company_offer?.services || [])].join(', ') || 'Lead generation services'}
VALUE PROPOSITIONS: ${knowledgeBase?.company_offer?.value_props?.join(', ') || 'Not provided'}
TARGET ICP: ${knowledgeBase?.prospect_companies?.icp_description || 'B2B companies'}
TARGET INDUSTRIES: ${knowledgeBase?.prospect_companies?.industries?.join(', ') || 'Various'}
TARGET TITLES: ${knowledgeBase?.prospect_people?.job_titles?.join(', ') || 'Decision makers'}
`;

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
            content: `Create Clay/Claygent prompts for each of the following personalization variables. These prompts will be used in Clay to generate personalized content for cold emails.

CLIENT CONTEXT:
${kbContext}

VARIABLES TO CREATE PROMPTS FOR:
${variables.map(v => `- {{${v}}}`).join('\n')}

For each variable, create a detailed prompt that follows the structure I described. The prompt should:
1. Use available Clay columns to generate the output
2. Have clear fallback behavior if data is missing
3. Keep output concise (usually under 15 words)
4. Be written at a 3rd grade reading level
5. Sound natural and human

Return a JSON object with this exact structure:

{
  "prompts": {
    "variable_name": {
      "prompt": "The full Clay prompt with #CONTEXT#, #OBJECTIVE#, #INSTRUCTIONS# sections...",
      "description": "Brief description of what this variable does",
      "example_output": "An example of what the output might look like",
      "columns_used": ["company_description", "industry", "etc"]
    }
  }
}

EXAMPLE for the "wywn" (what you're working on) variable:

{
  "wywn": {
    "prompt": "#CONTEXT#\\n\\nYou will generate a simple, one-sentence message following an exact structure, using only the specified input fields.\\n\\n#OBJECTIVE#\\n\\nProduce exactly one sentence that follows this pattern:\\n\\"just saw you provide [service_they_provide]\\"\\n\\n#INSTRUCTIONS#\\n\\n1. Use only these columns: {{company_description}}, {{industry}}\\n2. Replace [service_they_provide] with a short, simple service phrase inferred from the columns\\n3. Keep the service phrase to 2-4 simple words (e.g., \\"cleaning services\\", \\"IT support\\")\\n4. If no service can be inferred, use a generic phrase like \\"great services\\"\\n5. Output the sentence only, no other text\\n\\n#STYLE CONSTRAINTS#\\n- 3rd grade reading level\\n- Maximum 12 words\\n- No jargon or complex words",
    "description": "Personalized observation about what the prospect's company does",
    "example_output": "just saw you provide commercial cleaning services",
    "columns_used": ["company_description", "industry"]
  }
}

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
    console.error('Error in generate-clay-prompts:', error);
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
