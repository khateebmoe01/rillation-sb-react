import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FATHOM_API_KEY = Deno.env.get('FATHOM_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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

// Fetch recent calls from Fathom
async function fetchRecentCalls(limit: number = 50): Promise<FathomCall[]> {
  if (!FATHOM_API_KEY) {
    console.error('FATHOM_API_KEY not configured');
    return [];
  }

  try {
    const response = await fetch(`${FATHOM_API_BASE}/calls?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${FATHOM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Fathom API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.calls || data.data || data || [];
  } catch (error) {
    console.error('Error fetching Fathom calls:', error);
    return [];
  }
}

// Get call details with transcript
async function fetchCallDetails(callId: string): Promise<FathomCall | null> {
  try {
    const response = await fetch(`${FATHOM_API_BASE}/calls/${callId}`, {
      headers: {
        'Authorization': `Bearer ${FATHOM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error fetching call ${callId}:`, error);
    return null;
  }
}

// Get all clients
async function getClients(): Promise<string[]> {
  const { data } = await supabase.from('Clients').select('Business');
  return data?.map(c => c.Business).filter(Boolean) || [];
}

// Get existing Fathom call IDs
async function getExistingCallIds(): Promise<Set<string>> {
  const { data } = await supabase
    .from('client_fathom_calls')
    .select('fathom_call_id')
    .not('fathom_call_id', 'is', null);
  
  return new Set(data?.map(c => c.fathom_call_id).filter(Boolean) || []);
}

// Match call to client
function matchCallToClient(title: string, clients: string[]): { client: string | null; confidence: number } {
  if (!title || clients.length === 0) return { client: null, confidence: 0 };
  
  const titleLower = title.toLowerCase();
  
  for (const client of clients) {
    if (titleLower.includes(client.toLowerCase())) {
      return { client, confidence: 1.0 };
    }
  }
  
  for (const client of clients) {
    const firstWord = client.split(/[\s-]/)[0].toLowerCase();
    if (firstWord.length > 2 && titleLower.includes(firstWord)) {
      return { client, confidence: 0.7 };
    }
  }
  
  return { client: null, confidence: 0 };
}

// Determine call type
function determineCallType(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('tam')) return 'tam_map';
  if (lower.includes('opportunity')) return 'opportunity_review';
  if (lower.includes('messaging')) return 'messaging_review';
  return 'general';
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
    const body = await req.json().catch(() => ({}));
    const limit = body.limit || 50;
    const forceRefresh = body.force || false;

    console.log(`Syncing Fathom calls (limit: ${limit}, force: ${forceRefresh})`);

    // Fetch calls from Fathom
    const fathomCalls = await fetchRecentCalls(limit);
    console.log(`Fetched ${fathomCalls.length} calls from Fathom`);

    if (fathomCalls.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: 'No calls to sync' }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Get existing call IDs
    const existingIds = forceRefresh ? new Set<string>() : await getExistingCallIds();
    const clients = await getClients();

    let synced = 0;
    let skipped = 0;
    const results: any[] = [];

    for (const call of fathomCalls) {
      // Skip if already exists
      if (existingIds.has(call.id)) {
        skipped++;
        continue;
      }

      // Fetch full details if needed
      let fullCall = call;
      if (!call.transcript && !call.summary) {
        const details = await fetchCallDetails(call.id);
        if (details) fullCall = { ...call, ...details };
      }

      // Match to client
      const { client, confidence } = matchCallToClient(fullCall.title, clients);
      const callType = determineCallType(fullCall.title);

      // Save to database
      const { data, error } = await supabase
        .from('client_fathom_calls')
        .upsert({
          fathom_call_id: fullCall.id,
          client: client || '',
          title: fullCall.title,
          call_date: fullCall.created_at,
          duration_seconds: fullCall.duration_seconds,
          transcript: fullCall.transcript,
          summary: fullCall.summary,
          participants: fullCall.participants || [],
          action_items: fullCall.action_items || [],
          call_type: callType,
          status: 'pending',
          auto_matched: client !== null,
          match_confidence: confidence,
          fathom_recording_url: fullCall.recording_url,
          fathom_raw_data: fullCall,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'fathom_call_id' })
        .select()
        .single();

      if (!error && data) {
        synced++;
        results.push({
          id: data.id,
          title: fullCall.title,
          client: client || 'UNASSIGNED',
          confidence,
        });
      }
    }

    console.log(`Sync complete: ${synced} synced, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        skipped,
        total: fathomCalls.length,
        results,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Sync failed' }),
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
