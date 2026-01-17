import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const FATHOM_API_KEY = Deno.env.get('FATHOM_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Fathom Video API - see https://developers.fathom.ai/api-reference/meetings/list-meetings
const FATHOM_API_BASE = 'https://api.fathom.ai/external/v1';

// Fathom API response structure - see https://developers.fathom.ai/api-reference/meetings/list-meetings
interface FathomMeeting {
  recording_id: number;
  title: string;
  meeting_title?: string;
  url: string;
  share_url?: string;
  created_at: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  recording_start_time?: string;
  recording_end_time?: string;
  transcript_language?: string;
  calendar_invitees?: Array<{
    name: string;
    email: string;
    email_domain: string;
    is_external: boolean;
  }>;
  recorded_by?: {
    name: string;
    email: string;
    team?: string;
  };
  transcript?: Array<{
    speaker: { display_name: string };
    text: string;
    timestamp: string;
  }>;
  default_summary?: {
    template_name: string;
    markdown_formatted: string;
  };
  action_items?: Array<{
    description: string;
    completed: boolean;
    assignee?: { name: string; email: string };
  }>;
}

// Fetch recent meetings from Fathom
async function fetchRecentMeetings(limit: number = 50): Promise<FathomMeeting[]> {
  if (!FATHOM_API_KEY) {
    console.error('FATHOM_API_KEY not configured');
    return [];
  }

  try {
    // Fathom API uses "meetings" endpoint - see https://developers.fathom.ai/api-reference/meetings/list-meetings
    const url = `${FATHOM_API_BASE}/meetings?limit=${limit}`;
    console.log(`Fetching Fathom meetings from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-Api-Key': FATHOM_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Fathom API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Fathom API error: ${response.status}`, errorText);
      return [];
    }

    const data = await response.json();
    console.log(`Fathom API returned ${JSON.stringify(data).substring(0, 500)}...`);
    // API returns { items: [...], limit: n, next_cursor: "..." }
    return data.items || data.meetings || data.calls || data.data || data || [];
  } catch (error) {
    console.error('Error fetching Fathom calls:', error);
    return [];
  }
}

// Get meeting details with transcript
// Note: fetchMeetingDetails removed - the /recordings/{id} endpoint returns 404
// All necessary data comes from the /meetings list endpoint

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

    console.log(`Syncing Fathom meetings (limit: ${limit}, force: ${forceRefresh})`);

    // Fetch meetings from Fathom
    const fathomMeetings = await fetchRecentMeetings(limit);
    console.log(`Fetched ${fathomMeetings.length} meetings from Fathom`);

    if (fathomMeetings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: 'No meetings to sync' }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Get existing recording IDs
    const existingIds = forceRefresh ? new Set<string>() : await getExistingCallIds();
    const clients = await getClients();

    let synced = 0;
    let skipped = 0;
    const results: any[] = [];

    for (const meeting of fathomMeetings) {
      const recordingIdStr = String(meeting.recording_id);
      
      // Skip if already exists
      if (existingIds.has(recordingIdStr)) {
        skipped++;
        continue;
      }

      // Use the meeting data as-is from the list endpoint
      // The /recordings/{id} endpoint returns 404, so we skip fetching additional details
      const fullMeeting = meeting;

      // Use meeting_title or title
      const meetingTitle = fullMeeting.meeting_title || fullMeeting.title || 'Untitled Meeting';
      
      // Match to client
      const { client, confidence } = matchCallToClient(meetingTitle, clients);
      const callType = determineCallType(meetingTitle);

      // Extract participants from calendar_invitees
      const participants = fullMeeting.calendar_invitees?.map(inv => ({
        name: inv.name,
        email: inv.email,
      })) || [];

      // Extract action items
      const actionItems = fullMeeting.action_items?.map(ai => ai.description) || [];

      // Extract transcript as string
      const transcriptText = fullMeeting.transcript?.map(t => 
        `${t.speaker.display_name} [${t.timestamp}]: ${t.text}`
      ).join('\n') || null;

      // Extract summary
      const summaryText = fullMeeting.default_summary?.markdown_formatted || null;

      // Check if already exists in database
      const { data: existing } = await supabase
        .from('client_fathom_calls')
        .select('id')
        .eq('fathom_call_id', recordingIdStr)
        .maybeSingle();

      if (existing) {
        // Already exists, update it
        const { data, error } = await supabase
          .from('client_fathom_calls')
          .update({
            client: client || '',
            title: meetingTitle,
            call_date: fullMeeting.created_at,
            transcript: transcriptText,
            summary: summaryText,
            participants: participants,
            action_items: actionItems,
            call_type: callType,
            auto_matched: client !== null,
            match_confidence: confidence,
            fathom_recording_url: fullMeeting.url,
            fathom_raw_data: fullMeeting,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (!error && data) {
          synced++;
          results.push({
            id: data.id,
            title: meetingTitle,
            client: client || 'UNASSIGNED',
            confidence,
            action: 'updated',
          });
        } else if (error) {
          console.error(`Error updating meeting ${recordingIdStr}:`, error);
        }
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('client_fathom_calls')
          .insert({
            fathom_call_id: recordingIdStr,
            client: client || '',
            title: meetingTitle,
            call_date: fullMeeting.created_at,
            duration_seconds: null,
            transcript: transcriptText,
            summary: summaryText,
            participants: participants,
            action_items: actionItems,
            call_type: callType,
            status: 'pending',
            auto_matched: client !== null,
            match_confidence: confidence,
            fathom_recording_url: fullMeeting.url,
            fathom_raw_data: fullMeeting,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && data) {
          synced++;
          results.push({
            id: data.id,
            title: meetingTitle,
            client: client || 'UNASSIGNED',
            confidence,
            action: 'inserted',
          });
        } else if (error) {
          console.error(`Error inserting meeting ${recordingIdStr}:`, error);
        }
      }
    }

    console.log(`Sync complete: ${synced} synced, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        skipped,
        total: fathomMeetings.length,
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
