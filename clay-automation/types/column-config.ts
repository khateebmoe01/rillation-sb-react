/**
 * Clay Column Configuration Types
 * For creating and managing Clay table columns via API
 */

// AI Model Types
export type ClayWebResearchModel =
  | 'clay-argon'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4.1'
  | 'gpt-4.1-mini'
  | 'gpt-4.1-nano'
  | 'gpt-5-reasoning'
  | 'gpt-5.1-reasoning'

export type ClayImageModel =
  | 'gpt-4o-medium'
  | 'gpt-4o-high'
  | 'imagen-3.0'
  | 'imagen-3.0-fast'
  | 'flux-1-schnell'
  | 'playground-v2'
  | 'playground-v2.5'
  | 'ssd-1b'

export interface ClayModelInfo {
  id: string
  name: string
  description: string
  credits: number
}

// Use Case Types
export type ClayAIUseCase = 'claygent' | 'webResearch' | 'imageGeneration'

// Column Types
export type ClayColumnType = 'action' | 'formula' | 'static' | 'enrichment'

// Schema Field Types
export type ClaySchemaFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object'

export interface ClaySchemaField {
  type: ClaySchemaFieldType
  description?: string
}

export interface ClayAnswerSchema {
  type: 'json'
  fields: Record<string, ClaySchemaField>
}

// Input Binding Types
export interface ClayInputBinding {
  name: string
  formulaText?: string
  formulaMap?: Record<string, string>
  optional?: boolean
}

// Column Type Settings
export interface ClayAIColumnSettings {
  actionKey: 'use-ai'
  actionPackageId: string // "67ba01e9-1898-4e7d-afe7-7ebe24819a57"
  actionVersion: number
  inputsBinding: ClayInputBinding[]
  conditionalRunFormulaText?: string
  useStaticIP?: boolean
  dataTypeSettings: {
    type: 'json' | 'text' | 'number' | 'boolean'
  }
}

export interface ClayFormulaColumnSettings {
  formula: string
  dataTypeSettings: {
    type: 'json' | 'text' | 'number' | 'boolean'
  }
}

// Main Column Configuration
export interface ClayColumnConfig {
  type: ClayColumnType
  name: string
  typeSettings: ClayAIColumnSettings | ClayFormulaColumnSettings
  activeViewId?: string
  attributionData?: {
    created_from: 'API' | 'UI'
    config_menu?: string
    enrichment_entry_point?: string
  }
}

// Builder Types (for UI)
export interface ClayAIColumnBuilder {
  name: string
  useCase: ClayAIUseCase
  prompt: string
  model: ClayWebResearchModel | ClayImageModel
  condition?: string // e.g., "!!{{Company Website}}"
  outputSchema?: ClayAnswerSchema
  temperature?: number
  maxTokens?: number
  maxCostInCents?: number
  systemPrompt?: string
}

// Helper to build column config from builder
export function buildClayAIColumnConfig(builder: ClayAIColumnBuilder): ClayColumnConfig {
  const inputsBinding: ClayInputBinding[] = [
    { name: 'useCase', formulaText: `"${builder.useCase}"`, optional: true },
    { name: 'prompt', formulaText: `"${escapePrompt(builder.prompt)}"`, optional: true },
    { name: 'model', formulaText: `"${builder.model}"`, optional: true },
  ]

  if (builder.temperature !== undefined) {
    inputsBinding.push({ name: 'temperature', formulaText: String(builder.temperature), optional: true })
  }

  if (builder.maxTokens !== undefined) {
    inputsBinding.push({ name: 'maxTokens', formulaText: String(builder.maxTokens), optional: true })
  }

  if (builder.maxCostInCents !== undefined) {
    inputsBinding.push({ name: 'maxCostInCents', formulaText: String(builder.maxCostInCents), optional: true })
  }

  if (builder.systemPrompt) {
    inputsBinding.push({ name: 'systemPrompt', formulaText: `"${escapePrompt(builder.systemPrompt)}"`, optional: true })
  }

  if (builder.outputSchema) {
    inputsBinding.push({
      name: 'answerSchemaType',
      formulaMap: {
        type: '"json"',
        fields: JSON.stringify(builder.outputSchema.fields),
      },
      optional: true,
    })
  }

  const typeSettings: ClayAIColumnSettings = {
    actionKey: 'use-ai',
    actionPackageId: '67ba01e9-1898-4e7d-afe7-7ebe24819a57',
    actionVersion: 1,
    inputsBinding,
    dataTypeSettings: { type: 'json' },
  }

  if (builder.condition) {
    typeSettings.conditionalRunFormulaText = builder.condition
  }

  return {
    type: 'action',
    name: builder.name,
    typeSettings,
    attributionData: {
      created_from: 'API',
      config_menu: 'traditional_setup',
      enrichment_entry_point: 'api',
    },
  }
}

// Escape special characters in prompts
function escapePrompt(prompt: string): string {
  return prompt
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
}

// Qualification Column Template
export interface QualificationColumn {
  name: string
  prompt: string
  condition?: string
  outputFields: {
    qualified: boolean
    score: boolean
    reasoning: boolean
    [key: string]: boolean
  }
}

export function buildQualificationColumn(config: QualificationColumn): ClayColumnConfig {
  const fields: Record<string, ClaySchemaField> = {}

  if (config.outputFields.qualified) {
    fields.qualified = { type: 'boolean' }
  }
  if (config.outputFields.score) {
    fields.score = { type: 'number' }
  }
  if (config.outputFields.reasoning) {
    fields.reasoning = { type: 'string' }
  }

  // Add any custom fields
  Object.entries(config.outputFields).forEach(([key, enabled]) => {
    if (enabled && !['qualified', 'score', 'reasoning'].includes(key)) {
      fields[key] = { type: 'string' }
    }
  })

  return buildClayAIColumnConfig({
    name: config.name,
    useCase: 'claygent',
    prompt: config.prompt,
    model: 'clay-argon',
    condition: config.condition,
    outputSchema: {
      type: 'json',
      fields,
    },
  })
}

// Table Type Definitions
export type ClayTableType = 'CE' | 'PE' | 'CS' // Company Enrichment, Person Enrichment, Custom Sync

export interface ClayTableConfig {
  type: ClayTableType
  name: string
  leadSource: 'find-companies' | 'csv-import' | 'other'
  sourceConfig: {
    maxRows?: number
    filters?: Record<string, unknown>
  }
  columns: ClayColumnConfig[]
}
