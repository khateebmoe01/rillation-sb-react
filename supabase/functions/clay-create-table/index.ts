// Edge Function: clay-create-table
// Creates a Clay table with configured enrichment columns
// Supports Find Companies source and AI qualification columns

import { createClient } from "npm:@supabase/supabase-js@2.26.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CLAY_SESSION = Deno.env.get('CLAY_SESSION_COOKIE') || '';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLAY_API_BASE = 'https://api.clay.com/v3';

// Clay API constants
const USE_AI_PACKAGE_ID = '67ba01e9-1898-4e7d-afe7-7ebe24819a57';

// Types
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

interface CreateTableRequest {
  client: string;
  tableName: string;
  leadSource: 'find-companies' | 'csv-import' | 'other';
  sourceConfig: {
    maxRows: number;
    filters?: CompanySearchFilters;
  };
  qualificationColumns: QualificationColumn[];
  workspaceId?: string;
  claySession?: string;  // Can override env var
}

interface CreateTableResult {
  success: boolean;
  tableId?: string;
  tableUrl?: string;
  viewId?: string;
  columnsCreated?: number;
  error?: string;
}

// Make authenticated Clay API request
async function clayFetch(
  endpoint: string,
  options: RequestInit & { claySession: string }
): Promise<Response> {
  const { claySession, ...fetchOptions } = options;

  return fetch(`${CLAY_API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers: {
      'Cookie': `claysession=${claySession}`,
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });
}

// Create a new Clay table in a workbook
async function createClayTable(
  workspaceId: string,
  tableName: string,
  claySession: string
): Promise<{ tableId: string; viewId: string }> {
  // First, create a workbook for this table
  const workbookRes = await clayFetch('/workbooks', {
    method: 'POST',
    claySession,
    body: JSON.stringify({
      name: tableName,
      workspaceId,
      settings: { isAutoRun: true }
    }),
  });

  if (!workbookRes.ok) {
    const error = await workbookRes.text();
    throw new Error(`Failed to create workbook: ${error}`);
  }

  const workbook = await workbookRes.json();
  console.log('Created workbook:', workbook.id);

  // The workbook response should include the default table
  // If not, we need to fetch it
  const tableId = workbook.defaultTableId || workbook.tables?.[0]?.id;
  const viewId = workbook.defaultViewId || workbook.tables?.[0]?.defaultViewId;

  if (!tableId) {
    throw new Error('No table ID returned from workbook creation');
  }

  return { tableId, viewId: viewId || tableId };
}

// Add Find Companies source to table
async function addFindCompaniesSource(
  tableId: string,
  workspaceId: string,
  filters: CompanySearchFilters,
  maxRows: number,
  claySession: string
): Promise<void> {
  // Build the Find Companies enrichment request
  const enrichmentBody = {
    workspaceId,
    enrichmentType: 'find-lists-of-companies-with-mixrank-source-preview',
    options: {
      sync: false,
      returnTaskId: true,
      returnActionMetadata: true,
    },
    inputs: {
      ...filters,
      limit: Math.min(maxRows, 100),
      domainFieldId: null,
      exclude_entities_configuration: [],
      exclude_entities_bitmap: null,
      previous_entities_bitmap: null,
      exclude_company_identifiers_mixed: [],
      derived_industries: [],
      derived_revenue_streams: [],
      derived_subindustries: [],
      derived_subindustries_exclude: [],
      name: '',
      radialKnnMinScore: null,
      resolved_domain_redirects: null,
      startFromCompanyType: 'company_identifier',
      tableId,
      useRadialKnn: false,
      result_count: true,
    },
  };

  // Add the source to the table
  const sourceRes = await clayFetch(`/tables/${tableId}`, {
    method: 'PATCH',
    claySession,
    body: JSON.stringify({
      tableSettings: {},
      fieldGroupMap: {},
      sourceSettings: {
        addSource: {
          name: 'Find Companies',
          source: {
            name: 'Company Search',
            workspaceId,
            type: 'enrichment',
            typeSettings: {
              enrichmentType: 'find-lists-of-companies-with-mixrank-source-preview',
              enrichmentInputs: enrichmentBody.inputs,
            },
          },
        },
      },
    }),
  });

  if (!sourceRes.ok) {
    const error = await sourceRes.text();
    console.error('Failed to add Find Companies source:', error);
    // Don't throw - table was created, source can be added manually
  }
}

// Build answer schema for qualification column
function buildAnswerSchema(outputFields: QualificationColumn['outputFields']): object {
  const fields: Record<string, { type: string }> = {};

  if (outputFields.qualified) {
    fields.qualified = { type: 'boolean' };
  }
  if (outputFields.score) {
    fields.score = { type: 'number' };
  }
  if (outputFields.reasoning) {
    fields.reasoning = { type: 'string' };
  }

  return {
    formulaMap: {
      type: '"json"',
      fields: JSON.stringify(fields),
    },
  };
}

// Build conditional run formula
function buildConditionalRun(condition: string, conditionColumn: string): string | undefined {
  if (condition === 'always' || !conditionColumn) {
    return undefined;
  }

  if (condition === 'column-not-empty') {
    return `!!{{${conditionColumn}}}`;
  }

  if (condition === 'column-empty') {
    return `!{{${conditionColumn}}}`;
  }

  return undefined;
}

// Add an AI qualification column to the table
async function addQualificationColumn(
  tableId: string,
  viewId: string,
  column: QualificationColumn,
  claySession: string
): Promise<string | null> {
  const inputsBinding = [
    { name: 'useCase', formulaText: '"claygent"', optional: true },
    { name: 'prompt', formulaText: JSON.stringify(column.prompt), optional: true },
    { name: 'model', formulaText: JSON.stringify(column.model), optional: true },
    { name: 'temperature', optional: true },
    { name: 'reasoningLevel', optional: true },
    { name: 'reasoningBudget', optional: true },
    { name: 'claygentId', optional: true },
    { name: 'claygentFieldMapping', optional: true },
    { name: 'maxTokens', optional: true },
    { name: 'maxCostInCents', optional: true },
    { name: 'jsonMode', optional: true },
    { name: 'systemPrompt', optional: true },
    { name: 'answerSchemaType', ...buildAnswerSchema(column.outputFields), optional: true },
    { name: 'tableExamples', optional: true },
    { name: 'stopSequence', optional: true },
    { name: 'runBudget', optional: true },
    { name: 'topP', optional: true },
    { name: 'contextDocumentIds', optional: true },
    { name: 'browserbaseContextId', optional: true },
    { name: 'mcpSettings', optional: true },
  ];

  const typeSettings: Record<string, unknown> = {
    actionKey: 'use-ai',
    actionPackageId: USE_AI_PACKAGE_ID,
    actionVersion: 1,
    inputsBinding,
    useStaticIP: false,
    dataTypeSettings: { type: 'json' },
  };

  // Add conditional run if specified
  const conditionalRun = buildConditionalRun(column.condition, column.conditionColumn);
  if (conditionalRun) {
    typeSettings.conditionalRunFormulaText = conditionalRun;
  }

  const columnBody = {
    type: 'action',
    name: column.name || 'AI Qualification',
    typeSettings,
    activeViewId: viewId,
    attributionData: {
      created_from: 'API',
      config_menu: 'traditional_setup',
      enrichment_entry_point: 'api',
    },
  };

  const res = await clayFetch(`/tables/${tableId}/fields`, {
    method: 'POST',
    claySession,
    body: JSON.stringify(columnBody),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`Failed to add column ${column.name}:`, error);
    return null;
  }

  const result = await res.json();
  console.log(`Created column: ${column.name} (${result.id})`);
  return result.id;
}

// Log execution to database
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

// Update execution log
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

// Main create table function
async function createTable(request: CreateTableRequest): Promise<CreateTableResult> {
  const {
    client,
    tableName,
    leadSource,
    sourceConfig,
    qualificationColumns,
    workspaceId,
    claySession: requestSession,
  } = request;

  const claySession = requestSession || CLAY_SESSION;

  if (!claySession) {
    return {
      success: false,
      error: 'No Clay session cookie available. Please configure CLAY_SESSION_COOKIE.',
    };
  }

  // Get workspace ID from client config if not provided
  let effectiveWorkspaceId = workspaceId;
  if (!effectiveWorkspaceId) {
    const { data: config } = await supabase
      .from('clay_client_configs')
      .select('workspace_id')
      .eq('client', client)
      .single();

    effectiveWorkspaceId = config?.workspace_id;
  }

  if (!effectiveWorkspaceId) {
    return {
      success: false,
      error: 'No workspace ID configured for this client. Please set workspace_id in clay_client_configs.',
    };
  }

  // Log execution start
  const logId = await logExecution(
    client,
    'create_table',
    'running',
    { tableName, leadSource, sourceConfig, qualificationColumns }
  );

  try {
    // Step 1: Create the table
    console.log(`Creating table: ${tableName}`);
    const { tableId, viewId } = await createClayTable(
      effectiveWorkspaceId,
      tableName,
      claySession
    );

    // Step 2: Add data source based on lead source type
    if (leadSource === 'find-companies' && sourceConfig.filters) {
      console.log('Adding Find Companies source...');
      await addFindCompaniesSource(
        tableId,
        effectiveWorkspaceId,
        sourceConfig.filters,
        sourceConfig.maxRows,
        claySession
      );
    }

    // Step 3: Add qualification columns
    let columnsCreated = 0;
    for (const column of qualificationColumns) {
      console.log(`Adding qualification column: ${column.name}`);
      const columnId = await addQualificationColumn(tableId, viewId, column, claySession);
      if (columnId) {
        columnsCreated++;
      }
    }

    const tableUrl = `https://app.clay.com/workbooks/${tableId}`;

    // Update execution log with success
    await updateExecutionLog(logId, 'completed', {
      tableId,
      tableUrl,
      viewId,
      columnsCreated,
    });

    // Save table config to client's configs
    await saveTableToClientConfig(client, {
      tableId,
      tableName,
      viewId,
      leadSource,
      sourceConfig,
      qualificationColumns,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      tableId,
      tableUrl,
      viewId,
      columnsCreated,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create table failed:', errorMessage);

    await updateExecutionLog(logId, 'failed', undefined, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Save table config to client's clay_client_configs
async function saveTableToClientConfig(
  client: string,
  tableConfig: Record<string, unknown>
): Promise<void> {
  // Get existing config
  const { data: existing } = await supabase
    .from('clay_client_configs')
    .select('table_configs')
    .eq('client', client)
    .single();

  const existingConfigs = existing?.table_configs || [];

  // Add new table config
  await supabase
    .from('clay_client_configs')
    .upsert({
      client,
      table_configs: [...existingConfigs, tableConfig],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client' });
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const request: CreateTableRequest = await req.json();

    // Validate required fields
    if (!request.client || !request.tableName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: client, tableName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await createTable(request);

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
      JSON.stringify({ success: false, error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
