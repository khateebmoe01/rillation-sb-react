import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

// Skill ID for the email-copy skill - can be overridden via request
const DEFAULT_SKILL_ID = Deno.env.get('EMAIL_COPY_SKILL_ID') || 'email-copy';

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
  skillId?: string; // Optional override for skill ID
  useSkill?: boolean; // Whether to use Claude Skill (default: true)
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

    const { client, knowledgeBase, transcripts, existingSequences, skillId, useSkill = true } = await req.json() as RequestBody;

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

    const userMessage = `Create email copy for the following client. Generate a sequence with A/B variations for testing.

${kbContext}
${transcriptContext}

IMPORTANT FORMAT: 
- Email 1 should have 2-3 variations labeled 1A, 1B, 1C
- Email 2 should have 2 variations labeled 2A, 2B  
- Email 3 should have 1-2 variations labeled 3A, 3B
- Each variation tests a different angle/approach

Return a JSON object with this exact structure:

{
  "sequences": [
    {
      "id": "seq_1",
      "name": "Campaign Copy - [Client/Segment Name]",
      "phase": "PHASE 1 TESTING",
      "description": "Brief description of the overall campaign approach",
      "emails": [
        {
          "id": "email_1A",
          "subject": "Subject line A with {spintax|variations}",
          "body": "Email 1 Variation A - The opener. Short, intriguing, personal. Under 75 words.",
          "variables": ["first_name", "wywn"],
          "notes": "Angle: [describe what this variation tests]"
        },
        {
          "id": "email_1B",
          "subject": "Subject line B with {spintax|variations}",
          "body": "Email 1 Variation B - Different angle/hook for the opener.",
          "variables": ["first_name", "pain_point"],
          "notes": "Angle: [describe what this variation tests]"
        },
        {
          "id": "email_2A",
          "subject": "Follow-up subject A",
          "body": "Email 2 Variation A - Value-add or follow-up with different context.",
          "variables": ["first_name"],
          "notes": "Timing: Day X"
        },
        {
          "id": "email_2B",
          "body": "Email 2 Variation B - Alternative follow-up approach.",
          "variables": ["first_name"],
          "notes": "Timing: Day X"
        },
        {
          "id": "email_3A",
          "body": "Email 3 - Final touch, direct ask or referral request.",
          "variables": ["first_name"],
          "notes": "Timing: Day X"
        }
      ]
    }
  ],
  "variables_used": ["first_name", "wywn", "pain_point", "etc"]
}

Guidelines:
- Use {{variable}} syntax for all personalization  
- Use {spintax|alternative} syntax for subject line variations
- Email 1 variations (1A, 1B, 1C): Under 75 words each, different hooks/angles
- Email 2 variations (2A, 2B): Follow-ups with different value props
- Email 3: Final touch, can have 1-2 variations
- End with soft CTAs like "Worth a convo?" or "Worth sharing some thoughts?"
- Make it sound human, not robotic
- 5th grade reading level
- No company name in pain questions
- Pre-sale focus (growth, not retention)
- Single CTA per email

Return ONLY valid JSON, no other text.`;

    // Build request body - with or without skill
    const requestBody: any = {
      model: 'claude-opus-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    };

    // Add skill container if using skills
    if (useSkill) {
      requestBody.container = {
        skill_id: skillId || DEFAULT_SKILL_ID,
        type: 'custom',
        version: 'latest',
      };
    }

    // Build headers - include beta headers for skills
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };

    // Add beta headers for Skills API
    if (useSkill) {
      headers['anthropic-beta'] = 'skills-2025-10-02,code-execution-2025-08-25,files-api-2025-04-14';
    }

    console.log(`[generate-copy-structures] Calling Claude API with skill: ${useSkill ? (skillId || DEFAULT_SKILL_ID) : 'none'}`);

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', errorText);
      
      // If skill fails, retry without skill
      if (useSkill && (response.status === 400 || response.status === 404)) {
        console.log('[generate-copy-structures] Skill failed, retrying without skill...');
        
        // Retry without skill - use fallback system prompt
        const fallbackResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-opus-4-20250514',
            max_tokens: 8192,
            system: `You are an expert B2B cold email copywriter. Create high-converting email sequences for outbound campaigns.

Your copy is:
- Conversational and human (5th grade reading level)
- Short and punchy (under 75 words for Email 1)
- Value-focused (what's in it for them)
- Personalized using {{variables}} that will be filled by Clay/data enrichment
- Pre-sale focused (growth, not retention)
- Single CTA per email
- Grammatically correct
- No company name in pain questions`,
            messages: [
              {
                role: 'user',
                content: userMessage,
              },
            ],
          }),
        });
        
        if (!fallbackResponse.ok) {
          throw new Error(`Anthropic API error: ${fallbackResponse.status}`);
        }
        
        const fallbackData = await fallbackResponse.json();
        const fallbackContent = fallbackData.content?.[0]?.text;
        
        if (!fallbackContent) {
          throw new Error('No content in Anthropic response');
        }
        
        let result;
        const jsonMatch = fallbackContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = JSON.parse(fallbackContent);
        }
        
        return new Response(
          JSON.stringify({ ...result, _skillUsed: false, _fallback: true }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
      
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
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
      JSON.stringify({ ...result, _skillUsed: useSkill, _skillId: skillId || DEFAULT_SKILL_ID }),
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
