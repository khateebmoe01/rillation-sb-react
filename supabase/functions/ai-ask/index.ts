// AI Ask Edge Function - Calls Claude with full context
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
}

interface RequestBody {
  question: string;
  context: AIContext;
}

// Format firmographic data into readable text
function formatFirmographicData(data: FirmographicData | null): string {
  if (!data) return "No firmographic data available.";

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

  return sections.length > 0 ? sections.join("\n\n") : "No firmographic insights available.";
}

// Format chart context into readable text
function formatChartContext(chart: ChartContext | null): string {
  if (!chart) return "";

  let text = `\nUser is viewing: "${chart.chartTitle}" (${chart.chartType})`;

  if (chart.clickedDataPoint) {
    text += `\nUser clicked on: ${JSON.stringify(chart.clickedDataPoint, null, 2)}`;
  }

  if (chart.data && Array.isArray(chart.data)) {
    const preview = chart.data.slice(0, 10);
    text += `\nChart data (first ${preview.length} items):\n${JSON.stringify(preview, null, 2)}`;
  }

  return text;
}

// Build the system prompt with full context
function buildSystemPrompt(context: AIContext): string {
  const { filters, screenName, chartContext, firmographicData } = context;

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

  return `You are an AI sales analyst assistant for Rillation, a B2B sales engagement platform. You help users understand their outbound campaign performance and make data-driven decisions.

## Current Context

**Dashboard Location:** ${screenName}
**Selected Client:** ${filters.client}
**Date Range:** ${filters.datePreset} (${startDate} - ${endDate})
${formatChartContext(chartContext)}

## Firmographic Performance Data
${formatFirmographicData(firmographicData)}

## Your Capabilities

1. **Analyze Campaign Performance**: Identify what's working, what's not, and why
2. **Provide Recommendations**: Suggest specific, actionable improvements
3. **Explain Data**: Help users understand metrics and their implications
4. **Compare & Contrast**: Highlight differences across industries, job titles, company sizes, etc.

## Response Guidelines

- Be concise but thorough - users are busy sales professionals
- Use bullet points and formatting for readability
- When recommending actions, be specific (e.g., "Focus on Healthcare companies with 50-200 employees")
- If data is limited or inconclusive, say so honestly
- Reference specific numbers from the context when available
- Don't make up data - only reference what's provided in the context

## Metrics Definitions

- **Leads In**: Total leads that entered a campaign
- **Engaged**: Leads that replied (any response)
- **Positive**: Leads with positive/interested replies
- **Booked**: Leads that booked meetings
- **Booking Rate**: Booked / Leads In (the key conversion metric)
- **Coverage**: What % of leads have this data point populated`;
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

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    // Call Claude
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
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

