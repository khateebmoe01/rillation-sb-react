// Edge Function: clay-orchestrate
// Uses Claude Opus 4.5 to intelligently orchestrate Clay workbook/table creation
// Analyzes user configuration and generates optimal execution plans

import Anthropic from "npm:@anthropic-ai/sdk@0.30.0";
import { createClient } from "npm:@supabase/supabase-js@2.26.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// Fetch Clay session from database (refreshed daily by clay-auth-refresh function)
async function getClaySession(): Promise<string | null> {
  const { data, error } = await supabase
    .from('clay_auth')
    .select('session_cookie')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.warn('No valid Clay session found in database');
    return null;
  }

  return data.session_cookie;
}

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
  type: 'create_workbook' | 'create_table' | 'add_source' | 'add_column' | 'run_enrichment';
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

const SYSTEM_PROMPT = `You are a Clay.com automation orchestrator. Generate execution plans for Clay workbook creation.

## RULES
- apiEndpoint: ONLY paths starting with "/" (no full URLs)
- apiMethod: "POST", "PATCH", "GET", or "DELETE"
- Placeholders: {{WORKSPACE_ID}}, {{TABLE_ID}}, {{VIEW_ID}}

## STEP 1: Create Table with Find Companies Source (auto-creates workbook)
type: "create_table"
apiMethod: "POST"
apiEndpoint: "/tables"
payload: {
  "name": "CE Table",
  "workspaceId": "{{WORKSPACE_ID}}",
  "type": "company",
  "source": {
    "type": "find-lists-of-companies-with-mixrank-source-preview",
    "inputs": {
      "industries": ["Software Development"],
      "sizes": ["51-200 employees"],
      "country_names": ["United States"],
      "limit": 100
    }
  }
}
NOTE: Include ALL user-specified filters in source.inputs (industries, sizes, annual_revenues, country_names, locations, description_keywords, etc.)

## STEP 2+: Add AI Columns
type: "add_column"
apiMethod: "POST"
apiEndpoint: "/tables/{{TABLE_ID}}/fields"
payload: {
  "type": "action",
  "name": "Column Name",
  "typeSettings": {
    "actionKey": "use-ai",
    "actionPackageId": "67ba01e9-1898-4e7d-afe7-7ebe24819a57",
    "actionVersion": 1,
    "inputsBinding": [
      {"name": "useCase", "formulaText": "\\"claygent\\"", "optional": true},
      {"name": "prompt", "formulaText": "\\"Your prompt here with {{Company Name}} references\\"", "optional": true},
      {"name": "model", "formulaText": "\\"clay-argon\\"", "optional": true}
    ],
    "dataTypeSettings": {"type": "json"}
  },
  "activeViewId": "{{VIEW_ID}}"
}

## Credits: clay-argon=1, gpt-4o-mini=1, gpt-4o=3, gpt-4.1-mini=1, gpt-4.1=12

## Output (ONLY valid JSON, no markdown):
{
  "workbookName": "string",
  "summary": "string",
  "estimatedTotalCredits": number,
  "estimatedRows": number,
  "steps": [
    {"order": 1, "type": "create_table", "description": "Create table with Find Companies source", "apiMethod": "POST", "apiEndpoint": "/tables", "payload": {...}, "estimatedCredits": 0},
    {"order": 2, "type": "add_column", "description": "Add AI column", "apiMethod": "POST", "apiEndpoint": "/tables/{{TABLE_ID}}/fields", "payload": {...}, "estimatedCredits": 100}
  ],
  "warnings": [],
  "recommendations": []
}`;

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
  let endpoint = step.apiEndpoint || '';
  for (const [key, value] of Object.entries(context)) {
    endpoint = endpoint.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  // Claude sometimes includes method in endpoint like "POST https://..." - extract it
  let method = step.apiMethod || 'POST';
  const methodMatch = endpoint.match(/^(GET|POST|PUT|PATCH|DELETE)\s+/i);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase();
    endpoint = endpoint.slice(methodMatch[0].length);
  }

  // Clean up endpoint - remove base URL if included, ensure proper format
  endpoint = endpoint.replace(/^https?:\/\/api\.clay\.com\/v3\/?/i, '');
  endpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const url = `${CLAY_API_BASE}${endpoint}`;
  const isBodyAllowed = !['GET', 'HEAD'].includes(method.toUpperCase());

  console.log(`Executing ${method} ${url}`);
  console.log(`Payload: ${isBodyAllowed ? JSON.stringify(payload) : 'none'}`);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Cookie': claySession, // Already in format "claysession=xxx"
        'Content-Type': 'application/json',
      },
      body: isBodyAllowed ? JSON.stringify(payload) : undefined,
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

  for (const step of plan.steps || []) {
    const stepOrder = step.order ?? 'unknown';
    console.log(`Executing step ${stepOrder}: ${step.description || 'No description'}`);

    const { success, result, error } = await executeStep(step, context, claySession);

    if (!success) {
      errors.push(`Step ${stepOrder} (${step.type || 'unknown'}): ${error}`);
      // For critical steps, abort
      if (step.type === 'create_workbook' || step.type === 'create_table') {
        return { success: false, results, errors };
      }
      continue;
    }

    results.push({ step: step.order, result });

    // Extract IDs for subsequent steps
    if (step.type === 'create_table' && result) {
      console.log('Table response:', JSON.stringify(result, null, 2));
      // Table creation returns { table: { id, firstViewId, ... }, extraData: { newlyCreatedWorkbook: {...} } }
      const table = result.table || result;
      context.TABLE_ID = table.id || '';
      context.VIEW_ID = table.firstViewId || table.views?.[0]?.id || '';
      // Workbook is auto-created
      if (result.extraData?.newlyCreatedWorkbook) {
        context.WORKBOOK_ID = result.extraData.newlyCreatedWorkbook.id || '';
      }
      console.log(`Extracted TABLE_ID: ${context.TABLE_ID}, VIEW_ID: ${context.VIEW_ID}, WORKBOOK_ID: ${context.WORKBOOK_ID || 'auto'}`);
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

  // Get workspace ID - check client-specific first, then global
  let workspaceId = request.workspaceId;
  if (!workspaceId) {
    // Try client-specific config first
    const { data: clientConfig } = await supabase
      .from('clay_client_configs')
      .select('workspace_id')
      .eq('client', request.client)
      .single();

    workspaceId = clientConfig?.workspace_id;

    // Fall back to global config
    if (!workspaceId) {
      const { data: globalConfig } = await supabase
        .from('clay_client_configs')
        .select('workspace_id')
        .eq('client', '_global')
        .single();

      workspaceId = globalConfig?.workspace_id;
    }
  }

  if (!workspaceId) {
    return {
      success: false,
      error: 'No workspace ID configured. Please set it in the Implementation page.',
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
    const claySession = await getClaySession();

    if (claySession) {
      console.log('Executing plan against Clay API...');
      const { success, results, errors } = await executePlan(plan, claySession, workspaceId);

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
        executionLog: 'Plan generated (dry run - no valid Clay session in database. Run clay-auth-refresh to authenticate.)',
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
