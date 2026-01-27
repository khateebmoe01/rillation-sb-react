// Edge Function: clay-orchestrate
// Uses Claude Opus 4.5 to intelligently orchestrate Clay workbook/table creation
// Analyzes user configuration and generates optimal execution plans

import Anthropic from "npm:@anthropic-ai/sdk@0.30.0";
import { createClient } from "npm:@supabase/supabase-js@2.26.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const CLAY_SESSION = Deno.env.get('CLAY_SESSION_COOKIE') || '';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPES
// ============================================================================

interface QualificationColumn {
  id: string;
  name: string;
  prompt: string;
  condition: string;
  conditionColumn: string;
  outputFields: {
    qualified: boolean;
    score: boolean;
    reasoning: boolean;
  };
  model: string;
}

interface CompanySearchFilters {
  industries?: string[];
  sizes?: string[];
  annual_revenues?: string[];
  country_names?: string[];
  locations?: string[];
  description_keywords?: string[];
  semantic_description?: string;
  limit?: number;
}

interface OrchestrationRequest {
  client: string;
  workbookName: string;
  leadSource: 'find-companies' | 'csv-import' | 'other';
  sourceConfig: {
    maxRows: number;
    filters?: CompanySearchFilters;
  };
  qualificationColumns: QualificationColumn[];
  workspaceId?: string;
}

interface ExecutionStep {
  order: number;
  type: 'create_workbook' | 'add_source' | 'add_column' | 'run_enrichment';
  description: string;
  apiEndpoint: string;
  apiMethod: string;
  payload: Record<string, unknown>;
  estimatedCredits?: number;
  dependsOn?: number[];
}

interface ExecutionPlan {
  workbookName: string;
  summary: string;
  estimatedTotalCredits: number;
  estimatedRows: number;
  steps: ExecutionStep[];
  warnings?: string[];
  recommendations?: string[];
}

interface OrchestrationResult {
  success: boolean;
  plan?: ExecutionPlan;
  executionLog?: string;
  error?: string;
}

// ============================================================================
// SYSTEM PROMPT - Clay API Knowledge Base
// ============================================================================

const SYSTEM_PROMPT = `You are an expert Clay.com automation orchestrator. Your job is to analyze user configurations for creating Clay workbooks and generate optimal execution plans.

## Clay Hierarchy
- **Workbook**: Container for related tables (created via POST /v3/workbooks)
- **Table**: Data container within a workbook (created automatically with workbook)
- **CE Table**: Company Enrichment table - always the first/primary table in a workbook
- **Columns**: Data fields including enrichments, AI columns, and formulas

## Available API Endpoints

### Create Workbook (includes default table)
POST https://api.clay.com/v3/workbooks
{
  "name": "Workbook Name",
  "workspaceId": "WORKSPACE_ID",
  "settings": { "isAutoRun": true }
}
Response includes: workbook.id, workbook.defaultTableId, workbook.defaultViewId

### Add Column/Field to Table
POST https://api.clay.com/v3/tables/{TABLE_ID}/fields
Content-Type: application/json

### Add AI Column (Claygent)
{
  "type": "action",
  "name": "Column Name",
  "typeSettings": {
    "actionKey": "use-ai",
    "actionPackageId": "67ba01e9-1898-4e7d-afe7-7ebe24819a57",
    "actionVersion": 1,
    "inputsBinding": [
      {"name": "useCase", "formulaText": "\\"claygent\\"", "optional": true},
      {"name": "prompt", "formulaText": "\\"Your prompt with {{Column Name}} references\\"", "optional": true},
      {"name": "model", "formulaText": "\\"clay-argon\\"", "optional": true},
      {"name": "answerSchemaType", "formulaMap": {
        "type": "\\"json\\"",
        "fields": "{\\"fieldName\\":{\\"type\\":\\"string\\"}}"
      }, "optional": true}
    ],
    "conditionalRunFormulaText": "!!{{Some Column}}",
    "dataTypeSettings": {"type": "json"}
  },
  "activeViewId": "VIEW_ID"
}

### Conditional Run Syntax
- \`!!{{Column Name}}\` = Run if column is NOT empty
- \`!{{Column Name}}\` = Run if column IS empty
- \`{{Column Name}} == "value"\` = Run if equals value

### Run Enrichment
PATCH https://api.clay.com/v3/tables/{TABLE_ID}/run
Content-Type: application/x-www-form-urlencoded
Body: {"fieldIds":["FIELD_ID"],"runRecords":{"viewIdTopRecords":{"viewId":"VIEW_ID","numRecords":100}},"callerName":"API"}

### Add Find Companies Source
PATCH https://api.clay.com/v3/tables/{TABLE_ID}
{
  "sourceSettings": {
    "addSource": {
      "name": "Find Companies",
      "source": {
        "type": "enrichment",
        "typeSettings": {
          "enrichmentType": "find-lists-of-companies-with-mixrank-source-preview",
          "enrichmentInputs": { ...filters }
        }
      }
    }
  }
}

## AI Model Costs (per row)
| Model | Credits | Best For |
|-------|---------|----------|
| clay-argon | 1 | Simple classification, extraction (RECOMMENDED for most) |
| gpt-4o-mini | 1 | Fast, lightweight tasks |
| gpt-4o | 3 | Complex multi-step analysis |
| gpt-4.1-mini | 1 | Better reasoning, larger context |
| gpt-4.1 | 12 | Highest quality (use sparingly) |
| gpt-5-reasoning | 4-8 | Advanced reasoning tasks |

## Output Schema Types
For structured AI output, use answerSchemaType:
- "string" for text
- "number" for numeric values
- "boolean" for true/false
- Example: {"qualified":{"type":"boolean"},"score":{"type":"number"},"reasoning":{"type":"string"}}

## Column Dependencies Best Practices
1. Data source columns run first (Find Companies populates base data)
2. Enrichment columns that depend on base data run second
3. AI qualification columns run last, with conditions on prior columns
4. Use conditionalRunFormulaText to prevent wasted credits on empty rows

## Your Task
Given a workbook configuration, generate an ExecutionPlan JSON with:
1. Steps in optimal dependency order
2. Proper API payloads with correct escaping
3. Cost estimates per step and total
4. Any warnings about the configuration
5. Recommendations for optimization

IMPORTANT:
- All string values in formulaText must be double-escaped: \\"value\\"
- Column references use {{Column Name}} syntax
- Always include conditionalRun for AI columns to save credits
- Estimate credits as: rows × creditsPerColumn

Return ONLY valid JSON matching the ExecutionPlan schema. No markdown, no explanation outside the JSON.`;

// ============================================================================
// ORCHESTRATOR - Calls Claude to Generate Plan
// ============================================================================

async function generateExecutionPlan(request: OrchestrationRequest): Promise<ExecutionPlan> {
  const userPrompt = `Generate an execution plan for this workbook configuration:

Client: ${request.client}
Workbook Name: ${request.workbookName}
Lead Source: ${request.leadSource}
Max Rows: ${request.sourceConfig.maxRows}

${request.leadSource === 'find-companies' && request.sourceConfig.filters ? `
Company Search Filters:
${JSON.stringify(request.sourceConfig.filters, null, 2)}
` : ''}

Qualification Columns (${request.qualificationColumns.length}):
${request.qualificationColumns.map((col, i) => `
${i + 1}. Name: ${col.name}
   Prompt: ${col.prompt}
   Model: ${col.model}
   Condition: ${col.condition}${col.condition !== 'always' ? ` (on ${col.conditionColumn})` : ''}
   Output Fields: ${Object.entries(col.outputFields).filter(([_, v]) => v).map(([k]) => k).join(', ')}
`).join('')}

Workspace ID: ${request.workspaceId || 'TO_BE_RETRIEVED'}

Generate the ExecutionPlan JSON with optimal step ordering, proper API payloads, and cost estimates.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: SYSTEM_PROMPT,
  });

  // Extract text content from response
  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON from response
  let planJson = textContent.text.trim();

  // Handle potential markdown code blocks
  if (planJson.startsWith('```json')) {
    planJson = planJson.slice(7);
  }
  if (planJson.startsWith('```')) {
    planJson = planJson.slice(3);
  }
  if (planJson.endsWith('```')) {
    planJson = planJson.slice(0, -3);
  }
  planJson = planJson.trim();

  try {
    const plan: ExecutionPlan = JSON.parse(planJson);
    return plan;
  } catch (parseError) {
    console.error('Failed to parse Claude response as JSON:', planJson);
    throw new Error(`Invalid JSON from Claude: ${parseError}`);
  }
}

// ============================================================================
// EXECUTOR - Runs the Plan Against Clay API
// ============================================================================

const CLAY_API_BASE = 'https://api.clay.com/v3';

async function executeStep(
  step: ExecutionStep,
  context: Record<string, string>,
  claySession: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  // Replace placeholders in payload
  let payloadStr = JSON.stringify(step.payload);
  for (const [key, value] of Object.entries(context)) {
    payloadStr = payloadStr.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  const payload = JSON.parse(payloadStr);

  // Replace placeholders in endpoint
  let endpoint = step.apiEndpoint;
  for (const [key, value] of Object.entries(context)) {
    endpoint = endpoint.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${CLAY_API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: step.apiMethod,
      headers: {
        'Cookie': `claysession=${claySession}`,
        'Content-Type': 'application/json',
      },
      body: step.apiMethod !== 'GET' ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `API error ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: `Request failed: ${error}` };
  }
}

async function executePlan(
  plan: ExecutionPlan,
  claySession: string,
  workspaceId: string
): Promise<{ success: boolean; results: any[]; errors: string[] }> {
  const context: Record<string, string> = {
    WORKSPACE_ID: workspaceId,
  };
  const results: any[] = [];
  const errors: string[] = [];

  for (const step of plan.steps) {
    console.log(`Executing step ${step.order}: ${step.description}`);

    const { success, result, error } = await executeStep(step, context, claySession);

    if (!success) {
      errors.push(`Step ${step.order} failed: ${error}`);
      // For critical steps like workbook creation, abort
      if (step.type === 'create_workbook') {
        return { success: false, results, errors };
      }
      continue;
    }

    results.push({ step: step.order, result });

    // Extract IDs for subsequent steps
    if (step.type === 'create_workbook' && result) {
      context.WORKBOOK_ID = result.id || result.workbookId;
      context.TABLE_ID = result.defaultTableId || result.tableId;
      context.VIEW_ID = result.defaultViewId || result.viewId || context.TABLE_ID;
    }

    if (step.type === 'add_column' && result) {
      const columnName = (step.payload as any).name;
      if (columnName && result.id) {
        context[`FIELD_${columnName.replace(/\s+/g, '_').toUpperCase()}`] = result.id;
      }
    }
  }

  return { success: errors.length === 0, results, errors };
}

// ============================================================================
// LOGGING
// ============================================================================

async function logExecution(
  client: string,
  action: string,
  status: string,
  configSnapshot: Record<string, unknown>,
  result?: Record<string, unknown>,
  errorMessage?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('clay_execution_logs')
    .insert({
      client,
      action,
      status,
      config_snapshot: configSnapshot,
      result,
      error_message: errorMessage,
      started_at: new Date().toISOString(),
      completed_at: status !== 'running' ? new Date().toISOString() : null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to log execution:', error);
    return '';
  }

  return data?.id || '';
}

async function updateExecutionLog(
  logId: string,
  status: string,
  result?: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  if (!logId) return;

  await supabase
    .from('clay_execution_logs')
    .update({
      status,
      result,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

async function orchestrate(request: OrchestrationRequest): Promise<OrchestrationResult> {
  // Validate API key
  if (!ANTHROPIC_API_KEY) {
    return {
      success: false,
      error: 'ANTHROPIC_API_KEY not configured. Please set it in Supabase Edge Function secrets.',
    };
  }

  // Get workspace ID from client config if not provided
  let workspaceId = request.workspaceId;
  if (!workspaceId) {
    const { data: config } = await supabase
      .from('clay_client_configs')
      .select('workspace_id')
      .eq('client', request.client)
      .single();

    workspaceId = config?.workspace_id;
  }

  if (!workspaceId) {
    return {
      success: false,
      error: 'No workspace ID configured. Please set workspace_id in clay_client_configs.',
    };
  }

  // Log execution start
  const logId = await logExecution(
    request.client,
    'create_workbook',
    'running',
    {
      workbookName: request.workbookName,
      leadSource: request.leadSource,
      sourceConfig: request.sourceConfig,
      qualificationColumns: request.qualificationColumns,
    }
  );

  try {
    // Step 1: Generate execution plan with Claude
    console.log('Generating execution plan with Claude Opus 4.5...');
    const plan = await generateExecutionPlan({
      ...request,
      workspaceId,
    });

    console.log('Plan generated:', JSON.stringify(plan, null, 2));

    // Step 2: Execute the plan (if Clay session is available)
    if (CLAY_SESSION) {
      console.log('Executing plan against Clay API...');
      const { success, results, errors } = await executePlan(plan, CLAY_SESSION, workspaceId);

      if (!success) {
        await updateExecutionLog(logId, 'failed', { plan, results }, errors.join('; '));
        return {
          success: false,
          plan,
          error: `Execution failed: ${errors.join('; ')}`,
        };
      }

      await updateExecutionLog(logId, 'completed', { plan, results });

      return {
        success: true,
        plan,
        executionLog: `Successfully executed ${results.length} steps`,
      };
    } else {
      // No Clay session - return plan only (dry run)
      await updateExecutionLog(logId, 'completed', { plan, dryRun: true });

      return {
        success: true,
        plan,
        executionLog: 'Plan generated (dry run - no CLAY_SESSION_COOKIE configured)',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Orchestration failed:', errorMessage);

    await updateExecutionLog(logId, 'failed', undefined, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// HTTP HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const request: OrchestrationRequest = await req.json();

    // Validate required fields
    if (!request.client || !request.workbookName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: client, workbookName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await orchestrate(request);

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Request error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
