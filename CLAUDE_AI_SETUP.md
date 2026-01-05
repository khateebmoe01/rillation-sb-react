# Claude AI Integration Setup

This document explains how to set up and use the Claude AI integration in your Rillation dashboard.

## Architecture Overview

The AI integration consists of:

1. **AIContext** (`src/contexts/AIContext.tsx`) - Aggregates all context (filters, screen, chart data, firmographics)
2. **AI Edge Function** (`supabase/functions/ai-ask/index.ts`) - Calls Claude API with context
3. **AICopilotPanel** (`src/components/insights/AICopilotPanel.tsx`) - The chat UI
4. **Clickable Charts** - Charts that can send their data to the AI for analysis

## Setup Instructions

### 1. Add Anthropic API Key to Supabase

You need to add your Anthropic API key as a secret in Supabase:

```bash
# Using Supabase CLI
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Or via Supabase Dashboard:
# Go to Project Settings > Edge Functions > Add Secret
# Name: ANTHROPIC_API_KEY
# Value: your-api-key
```

### 2. Deploy the Edge Function

```bash
# Navigate to your project
cd /Users/mokhateeb/rillation-sb-react

# Deploy the AI function
supabase functions deploy ai-ask
```

### 3. Verify Environment Variables

Ensure these are set in your `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## How It Works

### Context Flow

1. **Filters** - The AI knows which client and date range you're viewing
2. **Screen** - The AI knows which page you're on (Quick View, Performance, etc.)
3. **Firmographic Data** - When viewing client details, the AI has access to industry, revenue, employee, and other performance breakdowns
4. **Chart Context** - When you click a chart, that chart's data is sent to the AI

### Using the AI

1. **Open the Panel** - Click the purple AI button on the left side of the screen
2. **Ask Questions** - Type questions like:
   - "What industry should we focus on?"
   - "Give me the top performer profile"
   - "What recommendations do you have?"
3. **Click Charts** - Hover over any chart and click "Ask AI" or click directly on data points
4. **Use Quick Prompts** - Click the suggestion pills for common questions

### Clickable Charts

The following charts support AI click-to-ask:

- **Trend Chart** - Click to analyze daily trends
- **Top Campaigns Chart** - Click individual campaigns for analysis
- **Firmographic Dimension Cards** - Click the 💬 icon to ask about any dimension (Industry, Revenue, Employees, etc.)

## Customization

### Adding AI Support to New Charts

Use the `ClickableChartWrapper` component:

```tsx
import ClickableChartWrapper from '../components/ui/ClickableChartWrapper'

<ClickableChartWrapper
  chartTitle="My Chart"
  chartType="bar-chart"
  data={myChartData}
>
  <MyChart data={myChartData} />
</ClickableChartWrapper>
```

Or use the `useAI` hook directly:

```tsx
import { useAI } from '../contexts/AIContext'

function MyChart({ data }) {
  const { askAboutChart } = useAI()
  
  const handleClick = (dataPoint) => {
    askAboutChart({
      chartTitle: 'My Chart',
      chartType: 'bar-chart',
      data: data,
      clickedDataPoint: dataPoint,
    })
  }
  
  return <div onClick={() => handleClick(data[0])}>...</div>
}
```

### Modifying the System Prompt

Edit `supabase/functions/ai-ask/index.ts` and modify the `buildSystemPrompt` function to customize how Claude understands your data.

## Troubleshooting

### "AI service not configured"

The `ANTHROPIC_API_KEY` secret is not set. Add it via Supabase CLI or Dashboard.

### "Request failed"

Check the Supabase Edge Function logs:

```bash
supabase functions logs ai-ask
```

### Panel not showing

Ensure `AIProvider` wraps your app in `main.tsx`:

```tsx
<FilterProvider>
  <AIProvider>
    <App />
  </AIProvider>
</FilterProvider>
```

## Cost Considerations

Claude API calls are billed per token. The system prompt includes context data, so:

- More firmographic dimensions = more tokens
- Larger charts = more tokens
- Consider caching frequent queries

The edge function uses `claude-sonnet-4-20250514` with a 1500 token max response.

