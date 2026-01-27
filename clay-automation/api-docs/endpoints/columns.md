# Columns (Fields)

Operations for creating and configuring table columns, including AI-powered enrichment columns.

---

## Create Column/Field

### Endpoint
`POST https://api.clay.com/v3/tables/{TABLE_ID}/fields`

### Description
Creates a new column in a Clay table. Supports various column types including AI-powered "Claygent" columns that use prompts to enrich data.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| TABLE_ID | string | Yes | The table identifier (e.g., `t_0t9bk2ipE7kYVWB5MS9`) |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
Content-Type: application/json
```

---

## Column Types

Clay supports several column types:

| Type | Description |
|------|-------------|
| **Use AI** | AI-powered columns with 3 use cases: Claygent, Web Research, Image Generation |
| **Formula** | Calculated columns using Clay's formula language |
| **Enrichment** | Integration columns (Apollo, ZoomInfo, LinkedIn, etc.) |
| **Static** | Manual data entry columns |

---

## Use AI Column

The most powerful column type - uses AI to analyze and enrich data based on prompts.

### Use Cases

| Use Case | Description | Models |
|----------|-------------|--------|
| `claygent` | AI agent for data analysis, qualification, extraction | All web research models |
| `webResearch` | Web browsing and research tasks | All web research models |
| `imageGeneration` | Generate images from prompts | Image generation models |

---

## Claygent AI Column

The most powerful column type - uses AI to analyze and enrich data based on prompts.

### Request Body
```json
{
  "type": "action",
  "name": "Use AI",
  "typeSettings": {
    "actionKey": "use-ai",
    "actionPackageId": "67ba01e9-1898-4e7d-afe7-7ebe24819a57",
    "actionVersion": 1,
    "inputsBinding": [
      {"name": "useCase", "formulaText": "\"claygent\"", "optional": true},
      {"name": "prompt", "formulaText": "\"Your prompt here\"", "optional": true},
      {"name": "temperature", "optional": true},
      {"name": "reasoningLevel", "optional": true},
      {"name": "reasoningBudget", "optional": true},
      {"name": "claygentId", "optional": true},
      {"name": "claygentFieldMapping", "optional": true},
      {"name": "maxTokens", "optional": true},
      {"name": "model", "formulaText": "\"clay-argon\"", "optional": true},
      {"name": "maxCostInCents", "optional": true},
      {"name": "jsonMode", "optional": true},
      {"name": "systemPrompt", "optional": true},
      {"name": "answerSchemaType", "formulaMap": {
        "type": "\"json\"",
        "fields": "{\"response\":{\"type\":\"string\"}}"
      }, "optional": true},
      {"name": "tableExamples", "optional": true},
      {"name": "stopSequence", "optional": true},
      {"name": "runBudget", "optional": true},
      {"name": "topP", "optional": true},
      {"name": "contextDocumentIds", "optional": true},
      {"name": "browserbaseContextId", "optional": true},
      {"name": "mcpSettings", "optional": true}
    ],
    "useStaticIP": false,
    "dataTypeSettings": {"type": "json"}
  },
  "activeViewId": "VIEW_ID",
  "attributionData": {
    "created_from": "API",
    "config_menu": "traditional_setup",
    "enrichment_entry_point": "api"
  }
}
```

### Input Binding Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `useCase` | string | Use case type: `"claygent"` for AI agent |
| `prompt` | string | **The AI prompt** - instructions for what to analyze/extract |
| `model` | string | AI model to use (see Models below) |
| `temperature` | number | Creativity (0-1, lower = more deterministic) |
| `reasoningLevel` | string | Depth of AI reasoning |
| `reasoningBudget` | number | Token budget for reasoning |
| `maxTokens` | number | Maximum output tokens |
| `maxCostInCents` | number | Cost limit per row |
| `jsonMode` | boolean | Force JSON output |
| `systemPrompt` | string | System-level instructions |
| `answerSchemaType` | object | Output schema definition |
| `tableExamples` | array | Few-shot examples |
| `topP` | number | Nucleus sampling parameter |
| `contextDocumentIds` | array | Reference documents |
| `browserbaseContextId` | string | Browser context for web research |
| `mcpSettings` | object | Model Context Protocol settings |
| `stopSequence` | string | Stop generation at this sequence |
| `runBudget` | number | Total run budget |
| `claygentId` | string | Saved Claygent configuration ID |
| `claygentFieldMapping` | object | Field mapping for Claygent |

### Available Models

#### Web Research Models (for Claygent & Web Research)
| Model ID | Name | Credits | Description |
|----------|------|---------|-------------|
| `clay-argon` | Clay Argon | 1 | Clay's native AI model |
| `gpt-4o` | GPT 4o | 3 | High-intelligence flagship model for complex, multi-step tasks |
| `gpt-4o-mini` | GPT 4o Mini | 1 | Affordable small model for fast, lightweight tasks |
| `gpt-4.1` | GPT 4.1 | 12 | Latest OpenAI, broader knowledge (June 2024), better reasoning |
| `gpt-4.1-mini` | GPT 4.1 Mini | 1 | Affordable small model with larger context window |
| `gpt-4.1-nano` | GPT 4.1 Nano | 0.5 | Smallest, fastest, cheapest - good for classification |
| `gpt-5-reasoning` | GPT 5 (reasoning) | 4 | Most advanced GPT-5 with superior reasoning |
| `gpt-5.1-reasoning` | GPT 5.1 (reasoning) | 8 | Latest GPT-5.1 with superior reasoning and knowledge |

#### Image Generation Models (for Image Generation use case)
| Model ID | Name | Credits | Description |
|----------|------|---------|-------------|
| `gpt-4o-medium` | GPT-4o Medium | 10 | Recommended - OpenAI's best image generation |
| `gpt-4o-high` | GPT-4o High | 30 | Higher quality output |
| `imagen-3.0` | Imagen 3.0 | 6 | Google's most capable (may not produce people) |
| `imagen-3.0-fast` | Imagen 3.0 Fast | 3 | Faster version of Imagen 3.0 |
| `flux-1-schnell` | Flux 1 Schnell | 1 | Open source - good quality/cost balance |
| `playground-v2` | Playground V2 | 2 | Open source model |
| `playground-v2.5` | Playground V2.5 | 2 | Open source model |
| `ssd-1b` | SSD 1B | 2 | Open source model |

### Answer Schema Types
Define the output structure:

```json
{
  "answerSchemaType": {
    "formulaMap": {
      "type": "\"json\"",
      "fields": "{\"qualified\":{\"type\":\"boolean\"},\"reason\":{\"type\":\"string\"},\"score\":{\"type\":\"number\"}}"
    }
  }
}
```

Supported field types:
- `string`
- `number`
- `boolean`
- `array`
- `object`

---

## Conditional Run (Column Dependencies)

Columns can be configured to only run when certain conditions are met using `conditionalRunFormulaText`.

### Syntax
```json
{
  "typeSettings": {
    "conditionalRunFormulaText": "!!{{Column Name}}"
  }
}
```

### Condition Operators
| Syntax | Meaning |
|--------|---------|
| `!!{{Column Name}}` | Run if column is NOT empty |
| `!{{Column Name}}` | Run if column IS empty |
| `{{Column Name}} == "value"` | Run if column equals value |
| `{{Column Name}} != "value"` | Run if column does not equal value |

### Example: Chain Dependent Columns
```json
{
  "type": "action",
  "name": "Qualification Analysis",
  "typeSettings": {
    "actionKey": "use-ai",
    "conditionalRunFormulaText": "!!{{Company Website}}",
    "inputsBinding": [
      {"name": "useCase", "formulaText": "\"claygent\""},
      {"name": "prompt", "formulaText": "\"Analyze {{Company Website}} for ICP fit\""}
    ]
  }
}
```

This column only runs when "Company Website" has a value.

### Multiple Conditions
```
"conditionalRunFormulaText": "!!{{Company Name}} && !!{{Website}}"
```

---

## Column References

Columns can reference other columns using two syntaxes:

### By Name
```
{{Company Name}}
{{Website}}
{{Industry}}
```

### By Field ID (more reliable)
```
{{f_abc123}}
{{f_xyz789}}
```

Field IDs are prefixed with `f_` and can be found in the table schema response.

---

## Prompt Templates

Prompts can reference other columns using formula syntax:

```
"Analyze this company: {{Company Name}} in the {{Industry}} industry.
Their website is {{Website}}.
Determine if they are a good fit based on: {{Qualification Criteria}}"
```

---

## Example: Qualification Column

```json
{
  "type": "action",
  "name": "Qualification Check",
  "typeSettings": {
    "actionKey": "use-ai",
    "actionPackageId": "67ba01e9-1898-4e7d-afe7-7ebe24819a57",
    "actionVersion": 1,
    "inputsBinding": [
      {"name": "useCase", "formulaText": "\"claygent\""},
      {"name": "prompt", "formulaText": "\"Analyze {{Company Name}} and determine if they meet our ICP criteria: B2B SaaS, 50-500 employees, US-based. Return qualified (true/false), score (1-10), and reasoning.\""},
      {"name": "model", "formulaText": "\"clay-argon\""},
      {"name": "answerSchemaType", "formulaMap": {
        "type": "\"json\"",
        "fields": "{\"qualified\":{\"type\":\"boolean\"},\"score\":{\"type\":\"number\"},\"reasoning\":{\"type\":\"string\"}}"
      }}
    ],
    "dataTypeSettings": {"type": "json"}
  }
}
```

---

## cURL Example

```bash
curl --location --request POST 'https://api.clay.com/v3/tables/TABLE_ID/fields' \
  --header 'Cookie: claysession=your_session_token' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "type": "action",
    "name": "ICP Qualification",
    "typeSettings": {
      "actionKey": "use-ai",
      "actionPackageId": "67ba01e9-1898-4e7d-afe7-7ebe24819a57",
      "actionVersion": 1,
      "inputsBinding": [
        {"name": "useCase", "formulaText": "\"claygent\""},
        {"name": "prompt", "formulaText": "\"Analyze this company and score 1-10 for ICP fit\""},
        {"name": "model", "formulaText": "\"clay-argon\""}
      ],
      "dataTypeSettings": {"type": "json"}
    }
  }'
```

---

## Notes
- Columns can reference other columns using `{{Column Name}}` syntax
- AI columns consume credits based on model and token usage
- Use `answerSchemaType` to get structured JSON output
- `claygentId` can reference a saved/templated Claygent configuration

---

*Source: Captured from Clay app network requests*
*Updated: 2026-01-27*
