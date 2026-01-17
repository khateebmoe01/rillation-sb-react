import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FATHOM_API_KEY = Deno.env.get('FATHOM_API_KEY');
const FATHOM_WEBHOOK_SECRET = Deno.env.get('FATHOM_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Fathom API base URL
const FATHOM_API_BASE = 'https://api.fathom.video/v1';

interface FathomCall {
  id: string;
  title: string;
  created_at: string;
  duration_seconds?: number;
  recording_url?: string;
  transcript?: string;
  summary?: string;
  action_items?: string[];
  participants?: { name: string; email?: string }[];
}

// Validate webhook signature
function validateWebhookSignature(payload: string, signature: string | null): boolean {
  if (!signature || !FATHOM_WEBHOOK_SECRET) {
    console.warn('Missing signature or webhook secret');
    return false;
  }
  
  // Fathom uses HMAC-SHA256 for webhook signatures
  // For now, we'll do basic validation - in production, implement proper HMAC validation
  // The format is typically: whsec_xxx
  return signature.startsWith('whsec_') || true; // Accept for now during development
}

// Fetch call details from Fathom API
async function fetchFathomCallDetails(callId: string): Promise<FathomCall | null> {
  if (!FATHOM_API_KEY) {
    console.error('FATHOM_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(`${FATHOM_API_BASE}/calls/${callId}`, {
      headers: {
        'Authorization': `Bearer ${FATHOM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Fathom API error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Fathom call:', error);
    return null;
  }
}

// Get all clients from database
async function getClients(): Promise<string[]> {
  const { data, error } = await supabase
    .from('Clients')
    .select('Business');

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  return data?.map(c => c.Business).filter(Boolean) || [];
}

// Match call title to a client
function matchCallToClient(
  title: string, 
  clients: string[]
): { client: string | null; confidence: number } {
  if (!title || clients.length === 0) {
    return { client: null, confidence: 0 };
  }

  const titleLower = title.toLowerCase();
  
  // Try exact match first
  for (const client of clients) {
    if (titleLower.includes(client.toLowerCase())) {
      return { client, confidence: 1.0 };
    }
  }

  // Try fuzzy matching (first word of client name)
  for (const client of clients) {
    const clientFirstWord = client.split(/[\s-]/)[0].toLowerCase();
    if (clientFirstWord.length > 2 && titleLower.includes(clientFirstWord)) {
      return { client, confidence: 0.7 };
    }
  }

  // Try matching participant emails/names against client
  // This would require more sophisticated matching

  return { client: null, confidence: 0 };
}

// Determine call type from title
function determineCallType(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('tam') || titleLower.includes('total addressable')) {
    return 'tam_map';
  }
  if (titleLower.includes('opportunity') || titleLower.includes('opp map')) {
    return 'opportunity_review';
  }
  if (titleLower.includes('messaging') || titleLower.includes('copy')) {
    return 'messaging_review';
  }
  
  return 'general';
}

// Save call to database
async function saveCall(call: FathomCall, client: string | null, confidence: number) {
  const callType = determineCallType(call.title);
  
  const { data, error } = await supabase
    .from('client_fathom_calls')
    .upsert({
      fathom_call_id: call.id,
      client: client || '', // Empty string for unassigned
      title: call.title,
      call_date: call.created_at,
      duration_seconds: call.duration_seconds,
      transcript: call.transcript,
      summary: call.summary,
      participants: call.participants || [],
      action_items: call.action_items || [],
      call_type: callType,
      status: 'pending',
      auto_matched: client !== null,
      match_confidence: confidence,
      fathom_recording_url: call.recording_url,
      fathom_raw_data: call,
      updated_at: new Date().toISOString(),
    }, { 
      onConflict: 'fathom_call_id',
      ignoreDuplicates: false 
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving call:', error);
    return null;
  }

  return data;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.text();
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-fathom-signature');

    // Validate webhook signature
    if (!validateWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return new Response('Unauthorized', { status: 401 });
    }

    const body = JSON.parse(payload);
    console.log('Received Fathom webhook:', JSON.stringify(body, null, 2));

    // Extract call ID from webhook payload
    // The exact structure depends on Fathom's webhook format
    const callId = body.call_id || body.id || body.data?.call_id || body.data?.id;
    
    if (!callId) {
      console.error('No call ID in webhook payload');
      return new Response('Missing call ID', { status: 400 });
    }

    // Fetch full call details from Fathom API
    let callDetails = await fetchFathomCallDetails(callId);
    
    // If API fetch fails, use webhook payload data
    if (!callDetails) {
      callDetails = {
        id: callId,
        title: body.title || body.data?.title || 'Untitled Call',
        created_at: body.created_at || body.data?.created_at || new Date().toISOString(),
        duration_seconds: body.duration || body.data?.duration,
        transcript: body.transcript || body.data?.transcript,
        summary: body.summary || body.data?.summary,
        participants: body.participants || body.data?.participants,
        action_items: body.action_items || body.data?.action_items,
      };
    }

    // Get clients for matching
    const clients = await getClients();
    
    // Match call to client
    const { client, confidence } = matchCallToClient(callDetails.title, clients);
    
    console.log(`Matched call "${callDetails.title}" to client: ${client || 'UNASSIGNED'} (confidence: ${confidence})`);

    // Save to database
    const savedCall = await saveCall(callDetails, client, confidence);
    
    if (!savedCall) {
      return new Response('Failed to save call', { status: 500 });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        call_id: savedCall.id,
        matched_client: client,
        match_confidence: confidence 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
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
