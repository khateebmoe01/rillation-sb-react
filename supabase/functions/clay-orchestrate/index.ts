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
  type: 'create_workbook' | 'create_table' | 'add_source' | 'add_column' | 'run_enrichment' | 'wizard_import';
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
- Placeholders: {{WORKSPACE_ID}}, {{TABLE_ID}}, {{VIEW_ID}}, {{TASK_ID}}, {{WORKBOOK_ID}}

## STEP 1: Run Find Companies Preview (generates company list)
type: "run_enrichment"
apiMethod: "POST"
apiEndpoint: "/actions/run-enrichment"
payload: {
  "workspaceId": "{{WORKSPACE_ID}}",
  "enrichmentType": "find-lists-of-companies-with-mixrank-source-preview",
  "options": {
    "sync": true,
    "returnTaskId": true,
    "returnActionMetadata": true
  },
  "inputs": {
    "industries": ["Software Development"],
    "sizes": ["51-200 employees"],
    "country_names": ["United States"],
    "limit": 100,
    "types": [],
    "country_names_exclude": [],
    "funding_amounts": [],
    "annual_revenues": [],
    "industries_exclude": [],
    "description_keywords": [],
    "description_keywords_exclude": [],
    "locations": [],
    "locations_exclude": [],
    "semantic_description": "",
    "minimum_follower_count": null,
    "minimum_member_count": null,
    "maximum_member_count": null,
    "company_identifier": [],
    "startFromCompanyType": "company_identifier",
    "exclude_company_identifiers_mixed": [],
    "exclude_entities_configuration": [],
    "exclude_entities_bitmap": null,
    "previous_entities_bitmap": null,
    "derived_industries": [],
    "derived_subindustries": [],
    "derived_subindustries_exclude": [],
    "derived_revenue_streams": [],
    "derived_business_types": [],
    "tableId": null,
    "domainFieldId": null,
    "useRadialKnn": false,
    "radialKnnMinScore": null,
    "has_resolved_domain": null,
    "resolved_domain_is_live": null,
    "resolved_domain_redirects": null,
    "name": ""
  }
}
NOTE: Include ALL user-specified filters in inputs (industries, sizes, annual_revenues, country_names, locations, description_keywords, etc.)
RESPONSE: Returns {"taskId": "at_xxx", "companies": [...]} - extract taskId for step 2

## STEP 2: Import Companies via Wizard (creates workbook + table + imports data)
type: "wizard_import"
apiMethod: "POST"
apiEndpoint: "/workspaces/{{WORKSPACE_ID}}/wizard/evaluate-step"
payload: {
  "workbookId": null,
  "wizardId": "find-companies",
  "wizardStepId": "companies-search",
  "formInputs": {
    "clientSettings": {"tableType": "company"},
    "requiredDataPoint": null,
    "basicFields": [
      {"name": "Name", "dataType": "text", "formulaText": "{{source}}.name"},
      {"name": "Description", "dataType": "text", "formulaText": "{{source}}.description"},
      {"name": "Primary Industry", "dataType": "text", "formulaText": "{{source}}.industry"},
      {"name": "Size", "dataType": "select", "formulaText": "{{source}}.size", "options": [
        {"id": "58c754e8-096f-463b-93d1-afdb77afd9af", "text": "Self-employed", "color": "yellow"},
        {"id": "d1fcc19a-55df-4426-9359-a20a03de6d0c", "text": "2-10 employees", "color": "blue"},
        {"id": "a27501e9-4c37-4788-ab1d-8d3f9a15cb2a", "text": "11-50 employees", "color": "green"},
        {"id": "ca291162-ef51-4d50-bb51-c16ae708f01f", "text": "51-200 employees", "color": "red"},
        {"id": "a490e899-a064-49d8-be4e-27bcef5ec7f6", "text": "201-500 employees", "color": "violet"},
        {"id": "c36491c6-2027-49da-b845-f48b18de1038", "text": "501-1,000 employees", "color": "grey"},
        {"id": "dc112420-2241-47fc-a652-af3d39a758fa", "text": "1,001-5,000 employees", "color": "orange"},
        {"id": "187301c3-cde3-44d4-a3cf-b960debf9181", "text": "5,001-10,000 employees", "color": "pink"},
        {"id": "142997a6-9458-4823-9f14-e53e58fbc3e3", "text": "10,001+ employees", "color": "yellow"}
      ]},
      {"name": "Type", "dataType": "text", "formulaText": "{{source}}.type"},
      {"name": "Location", "dataType": "text", "formulaText": "{{source}}.location"},
      {"name": "Country", "dataType": "text", "formulaText": "{{source}}.country"},
      {"name": "Domain", "dataType": "url", "formulaText": "{{source}}.domain"},
      {"name": "LinkedIn URL", "dataType": "url", "formulaText": "{{source}}.linkedin_url", "isDedupeField": true}
    ],
    "previewActionTaskId": "{{TASK_ID}}",
    "type": "companies",
    "typeSettings": {
      "name": "Find companies",
      "iconType": "Buildings",
      "actionKey": "find-lists-of-companies-with-mixrank-source",
      "actionPackageId": "e251a70e-46d7-4f3a-b3ef-a211ad3d8bd2",
      "previewTextPath": "name",
      "defaultPreviewText": "Profile",
      "recordsPath": "companies",
      "idPath": "linkedin_company_id",
      "scheduleConfig": {"runSettings": "once"},
      "inputs": {},
      "hasEvaluatedInputs": true,
      "previewActionKey": "find-lists-of-companies-with-mixrank-source-preview"
    }
  },
  "sessionId": "{{SESSION_ID}}",
  "currentStepIndex": 0,
  "outputs": [],
  "firstUseCase": null,
  "parentFolderId": null
}
NOTE: previewActionTaskId MUST be the taskId from step 1. sessionId should be a fresh UUID.
RESPONSE: Returns {tableId, sourceId, numSourceRecords, tableTotalRecordsCount}

## STEP 3+: Add AI Columns
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
    {"order": 1, "type": "run_enrichment", "description": "Run Find Companies preview to get matching companies", "apiMethod": "POST", "apiEndpoint": "/actions/run-enrichment", "payload": {...}, "estimatedCredits": 0},
    {"order": 2, "type": "wizard_import", "description": "Create workbook and import companies via wizard", "apiMethod": "POST", "apiEndpoint": "/workspaces/{{WORKSPACE_ID}}/wizard/evaluate-step", "payload": {...}, "estimatedCredits": 0, "dependsOn": [1]},
    {"order": 3, "type": "add_column", "description": "Add AI column", "apiMethod": "POST", "apiEndpoint": "/tables/{{TABLE_ID}}/fields", "payload": {...}, "estimatedCredits": 100, "dependsOn": [2]}
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

// Generate a UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function executePlan(
  plan: ExecutionPlan,
  claySession: string,
  workspaceId: string
): Promise<{ success: boolean; results: any[]; errors: string[] }> {
  const context: Record<string, string> = {
    WORKSPACE_ID: workspaceId,
    SESSION_ID: generateUUID(), // Generate fresh session ID for wizard
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
      if (step.type === 'create_workbook' || step.type === 'create_table' || step.type === 'run_enrichment' || step.type === 'wizard_import') {
        return { success: false, results, errors };
      }
      continue;
    }

    results.push({ step: step.order, result });

    // Extract IDs for subsequent steps based on step type
    if (step.type === 'run_enrichment' && result) {
      // run-enrichment returns { taskId: "at_xxx", companies: [...], ... }
      console.log('Enrichment response - extracting taskId');
      context.TASK_ID = result.taskId || '';
      console.log(`Extracted TASK_ID: ${context.TASK_ID}`);
    }

    if (step.type === 'wizard_import' && result) {
      // wizard/evaluate-step returns { tableId, sourceId, numSourceRecords, tableTotalRecordsCount, workbookId? }
      console.log('Wizard import response:', JSON.stringify(result, null, 2));
      context.TABLE_ID = result.tableId || '';
      context.SOURCE_ID = result.sourceId || '';
      context.VIEW_ID = result.tableId || ''; // Table ID is often used as view ID
      if (result.workbookId) {
        context.WORKBOOK_ID = result.workbookId;
      }
      console.log(`Extracted TABLE_ID: ${context.TABLE_ID}, SOURCE_ID: ${context.SOURCE_ID}, WORKBOOK_ID: ${context.WORKBOOK_ID || 'auto'}`);
    }

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
