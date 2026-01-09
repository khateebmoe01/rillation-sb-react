// Slack Notify Edge Function - Sends iteration log notifications to Slack
// Deploy with: supabase functions deploy slack-notify

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface MentionedUser {
  slack_id: string;
  display_name: string;
}

interface NotificationPayload {
  client: string;
  campaign_name?: string;
  action_type: string;
  description: string;
  created_by: string;
  mentioned_users: MentionedUser[];
}

// Build Slack Block Kit message
function buildSlackMessage(payload: NotificationPayload): object {
  const { client, campaign_name, action_type, description, created_by, mentioned_users } = payload;

  // Build mention string with proper Slack user ID format
  const mentionString = mentioned_users.length > 0
    ? mentioned_users.map(u => `<@${u.slack_id}>`).join(" ")
    : "";

  // Build the blocks
  const blocks: object[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "New Iteration Log Entry",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Company:*\n${client}`,
        },
        {
          type: "mrkdwn",
          text: `*Campaign:*\n${campaign_name || "General"}`,
        },
        {
          type: "mrkdwn",
          text: `*Category:*\n${action_type}`,
        },
        {
          type: "mrkdwn",
          text: `*Author:*\n${created_by}`,
        },
      ],
    },
  ];

  // Add mentions section if there are mentioned users
  if (mentionString) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Mentioned:* ${mentionString}`,
      },
    });
  }

  // Add description
  blocks.push({
    type: "divider",
  });

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: description.length > 2900 ? description.substring(0, 2900) + "..." : description,
    },
  });

  // Add timestamp footer
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Posted at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toISOString()}>`,
      },
    ],
  });

  return {
    blocks,
    // Fallback text for notifications
    text: `New Iteration Log: [${action_type}] for ${client}${campaign_name ? ` - ${campaign_name}` : ""} by ${created_by}`,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Slack Webhook URL from environment
    const slackWebhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (!slackWebhookUrl) {
      console.error("SLACK_WEBHOOK_URL not configured");
      return new Response(
        JSON.stringify({ 
          error: "Slack webhook not configured. Please add SLACK_WEBHOOK_URL to your Supabase secrets.",
          sent: false 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const payload: NotificationPayload = await req.json();
    const { client, action_type, description, created_by, mentioned_users } = payload;

    // Validate required fields
    if (!client || !action_type || !description || !created_by) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", sent: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending Slack notification for ${client} - ${action_type} by ${created_by}`);
    console.log(`Mentioned users: ${mentioned_users?.length || 0}`);

    // Build and send Slack message
    const slackMessage = buildSlackMessage(payload);

    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Slack webhook error:", errorText);
      return new Response(
        JSON.stringify({ 
          error: `Slack webhook error: ${errorText}`,
          sent: false 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Slack notification sent successfully");

    return new Response(
      JSON.stringify({ sent: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Slack Notify Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({ error: errorMessage, sent: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
