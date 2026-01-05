// AI Ask Edge Function - Calls Claude with full dashboard context
// Deploy with: supabase functions deploy ai-ask

import Anthropic from "npm:@anthropic-ai/sdk@0.26.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChartContext {
  chartType: string;
  chartTitle: string;
  data: any;
  clickedDataPoint?: any;
}

interface FirmographicItem {
  value: string;
  leadsIn: number;
  engaged: number;
  positive: number;
  booked: number;
}

interface FirmographicDimension {
  items: FirmographicItem[];
  coverage: number;
}

interface FirmographicData {
  industry?: FirmographicDimension;
  revenue?: FirmographicDimension;
  employees?: FirmographicDimension;
  geography?: FirmographicDimension;
  jobTitle?: FirmographicDimension;
  technologies?: FirmographicDimension;
  signals?: FirmographicDimension;
  companyMaturity?: FirmographicDimension;
  fundingStatus?: FirmographicDimension;
}

interface CampaignSummary {
  campaign_name: string;
  campaign_id: string;
  client: string;
  emails_sent: number;
  prospects: number;
  replies: number;
  real_replies: number;
  positive_replies: number;
  meetings_booked: number;
  bounce_rate: number;
  reply_rate: number;
  meeting_rate: number;
  status: string;
}

interface AggregateMetrics {
  total_emails_sent: number;
  total_prospects: number;
  total_replies: number;
  total_real_replies: number;
  total_positive_replies: number;
  total_meetings_booked: number;
  total_bounces: number;
  avg_reply_rate: number;
  avg_meeting_rate: number;
  total_campaigns: number;
  active_campaigns: number;
}

interface RecentMeeting {
  campaign_name: string;
  client: string;
  created_time: string;
  lead_name: string;
  lead_company: string;
  lead_title: string;
}

interface DashboardData {
  campaigns: CampaignSummary[];
  aggregateMetrics: AggregateMetrics;
  topPerformingCampaigns: CampaignSummary[];
  recentMeetings: RecentMeeting[];
  replyBreakdown: {
    positive: number;
    interested: number;
    not_interested: number;
    out_of_office: number;
    other: number;
  };
  clientList: string[];
}

interface AIContext {
  filters: {
    client: string;
    datePreset: string;
    dateRange: {
      start: string;
      end: string;
    };
  };
  currentScreen: string;
  screenName: string;
  chartContext: ChartContext | null;
  firmographicData: FirmographicData | null;
  dashboardData: DashboardData | null;
}

interface RequestBody {
  question: string;
  context: AIContext;
}

// Format firmographic data into readable text
function formatFirmographicData(data: FirmographicData | null): string {
  if (!data) return "";

  const sections: string[] = [];

  const formatDimension = (name: string, dimension?: FirmographicDimension): string | null => {
    if (!dimension || dimension.items.length === 0) return null;

    const topItems = dimension.items
      .filter((item) => item.leadsIn > 0)
      .sort((a, b) => (b.booked / b.leadsIn) - (a.booked / a.leadsIn))
      .slice(0, 5);

    if (topItems.length === 0) return null;

    const lines = topItems.map((item, idx) => {
      const bookingRate = item.leadsIn > 0 ? ((item.booked / item.leadsIn) * 100).toFixed(1) : "0";
      return `  ${idx + 1}. ${item.value}: ${bookingRate}% booking rate (${item.booked}/${item.leadsIn} leads)`;
    });

    return `${name} (${(dimension.coverage * 100).toFixed(0)}% coverage):\n${lines.join("\n")}`;
  };

  const dimensions: Array<[string, FirmographicDimension | undefined]> = [
    ["Industry", data.industry],
    ["Revenue", data.revenue],
    ["Employees", data.employees],
    ["Geography", data.geography],
    ["Job Title", data.jobTitle],
    ["Technologies", data.technologies],
    ["Signals", data.signals],
    ["Company Maturity", data.companyMaturity],
    ["Funding Status", data.fundingStatus],
  ];

  for (const [name, dimension] of dimensions) {
    const formatted = formatDimension(name, dimension);
    if (formatted) sections.push(formatted);
  }

  return sections.length > 0 ? `\n## Firmographic Performance Data\n\n${sections.join("\n\n")}` : "";
}

// Format chart context into readable text
function formatChartContext(chart: ChartContext | null): string {
  if (!chart) return "";

  let text = `\n## Active Chart Context\n\nUser is viewing: "${chart.chartTitle}" (${chart.chartType})`;

  if (chart.clickedDataPoint) {
    text += `\nUser clicked on: ${JSON.stringify(chart.clickedDataPoint, null, 2)}`;
  }

  if (chart.data && Array.isArray(chart.data)) {
    const preview = chart.data.slice(0, 10);
    text += `\nChart data (first ${preview.length} items):\n${JSON.stringify(preview, null, 2)}`;
  }

  return text;
}

// Format dashboard data into readable text
function formatDashboardData(data: DashboardData | null): string {
  if (!data) return "\n## Dashboard Data\n\nNo dashboard data available. Data may still be loading.";

  const { aggregateMetrics, campaigns, topPerformingCampaigns, recentMeetings, replyBreakdown, clientList } = data;

  let text = `\n## Dashboard Data (LIVE FROM SUPABASE)

### Aggregate Metrics (Current Date Range)
- **Total Emails Sent:** ${aggregateMetrics.total_emails_sent.toLocaleString()}
- **Total Prospects Contacted:** ${aggregateMetrics.total_prospects.toLocaleString()}
- **Total Replies:** ${aggregateMetrics.total_replies.toLocaleString()}
- **Real Replies (excluding OOO):** ${aggregateMetrics.total_real_replies.toLocaleString()}
- **Positive/Interested Replies:** ${aggregateMetrics.total_positive_replies.toLocaleString()}
- **Meetings Booked:** ${aggregateMetrics.total_meetings_booked.toLocaleString()}
- **Average Reply Rate:** ${aggregateMetrics.avg_reply_rate.toFixed(2)}%
- **Average Meeting Rate:** ${aggregateMetrics.avg_meeting_rate.toFixed(4)}%
- **Total Campaigns:** ${aggregateMetrics.total_campaigns}
- **Active Campaigns:** ${aggregateMetrics.active_campaigns}

### Reply Breakdown
- Positive/Interested: ${replyBreakdown.positive}
- Not Interested: ${replyBreakdown.not_interested}
- Out of Office: ${replyBreakdown.out_of_office}
- Other: ${replyBreakdown.other}
`;

  // Top performing campaigns
  if (topPerformingCampaigns.length > 0) {
    text += `\n### Top ${Math.min(10, topPerformingCampaigns.length)} Performing Campaigns (by Meetings Booked)\n`;
    topPerformingCampaigns.slice(0, 10).forEach((c, idx) => {
      text += `${idx + 1}. **${c.campaign_name}** (${c.client})
   - Sent: ${c.emails_sent.toLocaleString()} | Replies: ${c.real_replies} | Meetings: ${c.meetings_booked}
   - Reply Rate: ${c.reply_rate.toFixed(2)}% | Status: ${c.status}
`;
    });
  }

  // All campaigns summary
  if (campaigns.length > 0) {
    text += `\n### All Campaigns Summary (${campaigns.length} total)\n`;
    text += `| Campaign | Client | Sent | Prospects | Replies | Meetings | Reply Rate | Status |\n`;
    text += `|----------|--------|------|-----------|---------|----------|------------|--------|\n`;
    campaigns.slice(0, 30).forEach((c) => {
      text += `| ${c.campaign_name.substring(0, 40)}${c.campaign_name.length > 40 ? '...' : ''} | ${c.client} | ${c.emails_sent} | ${c.prospects} | ${c.real_replies} | ${c.meetings_booked} | ${c.reply_rate.toFixed(2)}% | ${c.status} |\n`;
    });
    if (campaigns.length > 30) {
      text += `\n... and ${campaigns.length - 30} more campaigns`;
    }
  }

  // Recent meetings
  if (recentMeetings.length > 0) {
    text += `\n### Recent Meetings Booked (${recentMeetings.length})\n`;
    recentMeetings.slice(0, 10).forEach((m, idx) => {
      const date = new Date(m.created_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      text += `${idx + 1}. **${m.lead_name}** (${m.lead_title} at ${m.lead_company}) - ${date} via "${m.campaign_name}"\n`;
    });
  }

  // Client list
  if (clientList.length > 0) {
    text += `\n### Available Clients\n${clientList.join(', ')}`;
  }

  return text;
}

// Build the system prompt with full context
function buildSystemPrompt(context: AIContext): string {
  const { filters, screenName, chartContext, firmographicData, dashboardData } = context;

  // Format date range nicely
  const startDate = new Date(filters.dateRange.start).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const endDate = new Date(filters.dateRange.end).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `You are an AI sales analyst assistant for Rillation, a B2B sales engagement analytics platform. You have FULL ACCESS to the user's campaign performance data from Supabase.

## Current Context

**Dashboard Location:** ${screenName}
**Selected Client:** ${filters.client}
**Date Range:** ${filters.datePreset} (${startDate} - ${endDate})
${formatDashboardData(dashboardData)}
${formatFirmographicData(firmographicData)}
${formatChartContext(chartContext)}

## Your Capabilities

1. **Analyze Campaign Performance**: You can see all campaign data - emails sent, replies, meetings booked, etc.
2. **Compare Campaigns**: Identify top performers vs underperformers
3. **Calculate Metrics**: Reply rates, meeting rates, conversion metrics
4. **Provide Recommendations**: Suggest which campaigns to scale, pause, or improve
5. **Answer Specific Questions**: About any campaign, client, or metric you can see above

## Response Guidelines

- **Reference actual data** - cite specific numbers from the dashboard data above
- Use bullet points and formatting for readability
- When comparing campaigns, use the actual metrics provided
- If asked about something not in the data, say so honestly
- Be concise but thorough
- For recommendations, be specific (e.g., "Scale campaign X because it has 3 meetings from only 500 sends")

## Metrics Definitions

- **Emails Sent**: Total outreach emails sent
- **Prospects**: Unique leads contacted
- **Total Replies**: All responses received
- **Real Replies**: Replies excluding Out of Office
- **Positive/Interested**: Leads showing interest
- **Meetings Booked**: Scheduled meetings from outreach
- **Reply Rate**: (Real Replies / Emails Sent) × 100
- **Meeting Rate**: (Meetings Booked / Emails Sent) × 100`;
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

    // Get API key from environment
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      console.error("ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured. Please add ANTHROPIC_API_KEY to your Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { question, context } = body;

    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`AI Ask: "${question.substring(0, 100)}..." | Screen: ${context?.screenName} | Client: ${context?.filters?.client}`);
    console.log(`Dashboard data available: ${context?.dashboardData ? 'YES' : 'NO'}`);
    if (context?.dashboardData) {
      console.log(`Campaigns: ${context.dashboardData.campaigns?.length || 0}, Meetings: ${context.dashboardData.aggregateMetrics?.total_meetings_booked || 0}`);
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    // Call Claude
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: question,
        },
      ],
    });

    // Extract response text
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    console.log(`AI Response: ${responseText.substring(0, 100)}...`);

    return new Response(
      JSON.stringify({
        response: responseText,
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("AI Ask Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
