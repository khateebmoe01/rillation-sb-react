// Slack Users Edge Function - Fetches workspace members via Slack API
// Deploy with: supabase functions deploy slack-users

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  display_name: string;
  is_bot: boolean;
  deleted: boolean;
}

interface SlackApiResponse {
  ok: boolean;
  members?: Array<{
    id: string;
    name: string;
    real_name?: string;
    profile?: {
      display_name?: string;
      real_name?: string;
    };
    is_bot?: boolean;
    deleted?: boolean;
  }>;
  error?: string;
  response_metadata?: {
    next_cursor?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow GET
    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Slack Bot Token from environment
    const slackBotToken = Deno.env.get("SLACK_BOT_TOKEN");
    if (!slackBotToken) {
      console.error("SLACK_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ 
          error: "Slack integration not configured. Please add SLACK_BOT_TOKEN to your Supabase secrets.",
          users: [] 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching Slack workspace users...");

    // Fetch users from Slack API with pagination
    const allUsers: SlackUser[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL("https://slack.com/api/users.list");
      url.searchParams.set("limit", "200");
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${slackBotToken}`,
          "Content-Type": "application/json",
        },
      });

      const data: SlackApiResponse = await response.json();

      if (!data.ok) {
        console.error("Slack API error:", data.error);
        return new Response(
          JSON.stringify({ 
            error: `Slack API error: ${data.error}`,
            users: [] 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Filter and transform users
      const pageUsers = (data.members || [])
        .filter(member => !member.is_bot && !member.deleted)
        .map(member => ({
          id: member.id,
          name: member.name,
          real_name: member.real_name || member.profile?.real_name || member.name,
          display_name: member.profile?.display_name || member.real_name || member.name,
          is_bot: member.is_bot || false,
          deleted: member.deleted || false,
        }));

      allUsers.push(...pageUsers);
      cursor = data.response_metadata?.next_cursor;
    } while (cursor);

    console.log(`Fetched ${allUsers.length} users from Slack`);

    // Sort by display name
    allUsers.sort((a, b) => a.display_name.localeCompare(b.display_name));

    return new Response(
      JSON.stringify({ users: allUsers }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Slack Users Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({ error: errorMessage, users: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
