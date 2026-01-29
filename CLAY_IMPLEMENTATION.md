# Clay AI Orchestration Implementation

## Overview

This document tracks the implementation of an AI-driven Clay workbook/table creation system. Instead of hardcoded API calls, we use **Claude Opus 4.5** as an intelligent orchestrator that analyzes user intent and generates optimal workflows.

---

## Clay Hierarchy (IMPORTANT)

```
Client
└── Workbooks (many per client)
    └── Tables (many per workbook)
        └── CE Table = Company Enrichment Table (ALWAYS first table in workbook)
            └── Columns (enrichments, AI qualifications, formulas)
```

**Key Terminology:**
- **Workbook** = Container for related tables (e.g., "Q1 2026 Outreach")
- **CE Table** = Company Enrichment table, always the first/primary table in a workbook
- **"Begin Workbook"** = Creates a new workbook WITH its initial CE table (NOT just "Create Table")

---

## Current Status: Phase 2 - API Discovery & Integration

**Last Updated:** 2026-01-28

### Completed
- [x] Explored clay-automation folder structure
- [x] Documented Clay API complexity (13+ endpoints, 9 enrichment types)
- [x] Identified decision points requiring AI reasoning
- [x] Designed orchestration architecture
- [x] Created this implementation plan
- [x] Identified UI structure issues
- [x] **Redesigned UI tabs**: Workbooks | Templates | Summary
- [x] **Created WorkbooksTab**: Shows all workbooks with expandable tables
- [x] **Renamed CreateTableWizard → BeginWorkbookWizard**
- [x] Updated wizard terminology (workbookName, CE table, etc.)
- [x] Created TemplatesTab and SummaryTab components
- [x] **Created `clay-orchestrate` Edge Function** with Anthropic SDK
- [x] **Built system prompt** with Clay API documentation
- [x] **Created `useClayOrchestration` hook** for React integration
- [x] **Added OrchestrationModal** to show plan generation and execution progress
- [x] **Wired up BeginWorkbookWizard** to call orchestration on completion
- [x] **Deployed edge functions** to Supabase (clay-orchestrate, clay-auth-refresh)
- [x] **Verified ANTHROPIC_API_KEY** secret is configured
- [x] **Set CLAY_EMAIL and CLAY_PASSWORD** secrets
- [x] **Created clay_auth table** and singleton index
- [x] **Scheduled daily cron job** (5 AM UTC) to refresh Clay session
- [x] **Initial auth refresh completed** - session stored, expires in 24h
- [x] **DISCOVERED WORKING CLAY API FLOW** (Session 4 - see below)
- [x] **Updated clay-orchestrate with two-step wizard pattern**
- [x] **Added wizard_import step type for table creation**
- [x] **Tested API flow - successfully created table with 2 records**

### In Progress
- [ ] Test full end-to-end flow with AI columns (Begin Workbook → AI generates plan → Execute)

### Completed (Session 7)
- [x] Deployed `clay-generate-filters` edge function (with `--no-verify-jwt`)
- [x] Deployed `clay-submit-filters` edge function
- [x] Added `initialFilters` prop to `CompanySearchFilters` for AI filter pre-population
- [x] Created `FathomFilterGenerator` and `FathomFilterInput` components
- [x] Created `useClayFilterGeneration` hook
- [x] Tested end-to-end: Fathom transcript → AI generates filters → stored in `generated_filters` table

### Pending
- [ ] Add plan review/approval step before execution
- [ ] Implement real-time progress updates
- [ ] Support for CSV upload flow
- [ ] Error recovery and retry logic
- [ ] Template saving for reuse

---

## UI Structure (Corrected)

### Main Tabs
| Tab | Purpose |
|-----|---------|
| **Workbooks** | List all workbooks for selected client, expandable to show tables |
| **Templates** | Reusable workbook/table configurations |
| **Summary** | Overview stats, recent activity, quick actions |

### Workbooks Tab Layout
```
┌─────────────────────────────────────────────────────────────┐
│  [+ Begin Workbook]                          [Search...]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ▼ Q1 2026 SaaS Outreach                    Created Jan 15 │
│    ├── CE Table (500 rows)                    ● Running     │
│    ├── Email Sequences                        ✓ Complete    │
│    └── Meeting Bookers                        ○ Pending     │
│                                                             │
│  ► Holiday Campaign 2025                     Created Dec 1  │
│                                                             │
│  ► Enterprise ABM List                       Created Nov 20 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Begin Workbook Wizard (Previously "Create Table")
```
Step 1: Lead Source       → Find Companies / CSV Import / Other
Step 2: Configure Source  → Filters, max rows
Step 3: CE Columns        → AI qualification columns for the CE table
Step 4: Review & Begin    → AI generates plan, shows cost estimate
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BeginWorkbookWizard (was CreateTableWizard)                         │
│  User configures: lead source, filters, qualification cols   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              useClayOrchestration Hook                       │
│  • Sends wizard config to edge function                      │
│  • Manages loading/progress states                           │
│  • Streams execution updates to UI                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         Supabase Edge Function: clay-orchestrate            │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Claude Opus 4.5                            │ │
│  │                                                          │ │
│  │  System Prompt includes:                                 │ │
│  │  • Full Clay API documentation                          │ │
│  │  • Available enrichment types & costs                   │ │
│  │  • Column configuration schemas                         │ │
│  │  • Best practices for dependencies                      │ │
│  │                                                          │ │
│  │  Outputs:                                                │ │
│  │  • Structured execution plan (JSON)                     │ │
│  │  • Estimated costs                                      │ │
│  │  • Step-by-step API calls                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Execution Engine                           │ │
│  │  • Runs Clay API calls in sequence                     │ │
│  │  • Tracks field IDs for column references              │ │
│  │  • Handles async enrichment polling                    │ │
│  │  • Logs execution to clay_execution_logs              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Why AI Orchestration?

### The Complexity Problem

Creating a Clay table isn't a simple 1-2 step process:

| Aspect | Complexity |
|--------|------------|
| Enrichment Types | 9 different types (Apollo, Clearbit, Email Finder, etc.) |
| Column Dependencies | Conditional execution based on prior results |
| AI Columns | Complex JSON schemas, prompt engineering, model selection |
| Cost Optimization | Models cost 1-30 credits each, budget management needed |
| API Sequence | 13+ endpoints for full workflow, order matters |
| Field References | Must track both names (`{{Company}}`) and IDs (`{{f_abc}}`) |

### What the AI Orchestrator Decides

1. **Enrichment Strategy**: Which enrichments in what order
2. **Column Dependencies**: What conditions trigger each column
3. **AI Prompts**: How to write effective prompts with proper escaping
4. **Output Schemas**: JSON structure for AI column results
5. **Model Selection**: Balance quality vs cost (clay-argon @ 1 credit vs gpt-4.1 @ 12 credits)
6. **Cost Estimation**: Total expected credits for the workflow

---

## Implementation Phases

### Phase 1: Core Infrastructure (Current)
- [ ] Edge function with Anthropic SDK
- [ ] System prompt with Clay API knowledge
- [ ] Basic execution engine
- [ ] React hook for orchestration

### Phase 2: Execution & Monitoring
- [ ] Real-time progress updates via WebSocket/polling
- [ ] Execution logging to Supabase
- [ ] Error handling and recovery
- [ ] Cost tracking

### Phase 3: Advanced Features
- [ ] Plan preview before execution
- [ ] Manual plan editing
- [ ] Template saving for reuse
- [ ] Batch table creation
- [ ] CSV upload integration

### Phase 4: Optimization
- [ ] Caching of common workflows
- [ ] Cost optimization suggestions
- [ ] A/B testing different strategies
- [ ] Analytics on enrichment success rates

---

## File Structure

```
supabase/
├── functions/
│   ├── clay-orchestrate/          # Main AI orchestration function
│   │   └── index.ts               # Claude integration + executor
│   ├── clay-auth-refresh/         # Daily Clay authentication
│   │   └── index.ts               # Login + store session cookie
│   ├── clay-build-leads-table/    # RECOMMENDED: Correct 2-step wizard flow
│   │   └── index.ts               # enrichment preview + wizard with null workbookId
│   ├── clay-generate-filters/     # AI filter generation from transcripts
│   │   └── index.ts
│   ├── clay-submit-filters/       # Submit filters to Clay
│   │   └── index.ts
│   ├── clay-create-workbook/      # DEPRECATED: Creates empty workbook (causes empty rows)
│   │   └── index.ts
│   └── clay-import-companies/     # DEPRECATED: Wizard with existing workbookId (rows not populated)
│       └── index.ts
├── migrations/
│   └── 20260127154530_clay_auth_storage.sql  # clay_auth table + cron job

src/
├── hooks/
│   └── useClayOrchestration.ts    # React hook for UI
├── components/clay/
│   ├── BeginWorkbookWizard.tsx    # Renamed from CreateTableWizard
│   ├── WorkbookList.tsx           # List of workbooks with expandable tables
│   ├── WorkbookCard.tsx           # Single workbook with table dropdown
│   ├── ExecutionProgress.tsx      # Shows execution status
│   └── PlanPreview.tsx            # Shows AI's plan before execution
└── pages/
    └── GTMImplementation.tsx      # Main page with new tab structure
```

---

## Clay API Reference (For AI Context)

### Enrichment Types & Costs

| Type | Description | Credits |
|------|-------------|---------|
| `apollo_person` | Find person by email | 3 |
| `apollo_company` | Company info by domain | 3 |
| `clearbit_person` | Person enrichment | 5 |
| `clearbit_company` | Company enrichment | 5 |
| `email_finder` | Find email from name+company | 1 |
| `linkedin_profile` | LinkedIn scraping | 5 |
| `phone_finder` | Find phone numbers | 2 |
| `company_search` | Find companies by criteria | 1 |
| `custom_api` | Arbitrary API call | Varies |

### AI Model Costs

| Model | Credits | Best For |
|-------|---------|----------|
| `clay-argon` | 1 | Simple classification, extraction |
| `gpt-4o-mini` | 1 | Fast, lightweight tasks |
| `gpt-4o` | 3 | Complex multi-step analysis |
| `gpt-4.1` | 12 | Highest quality reasoning |
| `gpt-5-reasoning` | 4-8 | Advanced reasoning tasks |

### Key API Endpoints

```
POST /v3/workbooks                    # Create workbook
POST /v3/tables/{id}/fields           # Add column
POST /v3/tables/{id}/records          # Add rows
PATCH /v3/tables/{id}/run             # Run enrichment
GET /v3/tables/{id}/views/{id}/records # Get results
```

### CRITICAL: Wizard workbookId Behavior (2026-01-28)

**THIS IS THE MOST IMPORTANT SECTION - READ BEFORE IMPLEMENTING ANY CLAY FLOW**

The Clay wizard API has counterintuitive behavior regarding `workbookId`:

| workbookId Value | Wizard Behavior | Rows Populated? |
|------------------|-----------------|-----------------|
| `null` | Creates NEW workbook + NEW table + IMPORTS rows | YES |
| `"existing_id"` | Creates table in existing workbook but SKIPS row import | NO - EMPTY TABLE |

**The 3-Step Flow is BROKEN:**
```
Step 1: clay-create-workbook → POST /v3/tables (creates empty workbook)
Step 2: clay-find-companies  → POST /v3/actions/run-enrichment (gets taskId)
Step 3: clay-import-companies → wizard with workbookId: existingId
                              → Table created but ROWS ARE EMPTY!
```

**The 2-Step Flow WORKS:**
```
Step 1: POST /v3/actions/run-enrichment → taskId with companies
Step 2: wizard with workbookId: null → Creates workbook AND populates rows
```

**Root Cause:** When the wizard receives an existing `workbookId`, it assumes you're adding a table to an existing workflow and skips the data import from the `previewActionTaskId`. Only when `workbookId: null` does it treat the wizard as a fresh data import flow.

**Solution:** Use `clay-build-leads-table` edge function which implements the correct 2-step flow.

---

### DISCOVERED: Working Find Companies Flow (2026-01-28)

**Important:** Clay does not have official API documentation. This flow was discovered via network inspection.

**CRITICAL: Must pass `workbookId: null` to the wizard - see section above.**

The Find Companies flow requires TWO API calls in sequence:

**Step 1: Run Enrichment Preview** (generates matching companies)
```bash
POST https://api.clay.com/v3/actions/run-enrichment

{
  "workspaceId": "161745",
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
    // ... many optional filter fields
  }
}

# Response: { "taskId": "at_xxx", "companies": [...], "count": 42000000 }
```

**Step 2: Wizard Import** (creates workbook + table + imports data)
```bash
POST https://api.clay.com/v3/workspaces/{workspaceId}/wizard/evaluate-step

{
  "workbookId": null,  # MUST BE NULL - see critical section above!
  "wizardId": "find-companies",
  "wizardStepId": "companies-search",
  "formInputs": {
    "clientSettings": {"tableType": "company"},
    "basicFields": [
      {"name": "Name", "dataType": "text", "formulaText": "{{source}}.name"},
      {"name": "Description", "dataType": "text", "formulaText": "{{source}}.description"},
      {"name": "Primary Industry", "dataType": "text", "formulaText": "{{source}}.industry"},
      {"name": "Size", "dataType": "select", "formulaText": "{{source}}.size", "options": [...]},
      {"name": "Type", "dataType": "text", "formulaText": "{{source}}.type"},
      {"name": "Location", "dataType": "text", "formulaText": "{{source}}.location"},
      {"name": "Country", "dataType": "text", "formulaText": "{{source}}.country"},
      {"name": "Domain", "dataType": "url", "formulaText": "{{source}}.domain"},
      {"name": "LinkedIn URL", "dataType": "url", "formulaText": "{{source}}.linkedin_url", "isDedupeField": true}
    ],
    "previewActionTaskId": "at_xxx",  # FROM STEP 1!
    "type": "companies",
    "typeSettings": {
      "name": "Find companies",
      "actionKey": "find-lists-of-companies-with-mixrank-source",
      "actionPackageId": "e251a70e-46d7-4f3a-b3ef-a211ad3d8bd2",
      "previewActionKey": "find-lists-of-companies-with-mixrank-source-preview"
    }
  },
  "sessionId": "uuid-v4",  # Fresh UUID for each request
  "currentStepIndex": 0,
  "outputs": [],
  "firstUseCase": null,
  "parentFolderId": null
}

# Response: { "tableId": "t_xxx", "sourceId": "s_xxx", "numSourceRecords": 2, "tableTotalRecordsCount": 2 }
```

**Verified Working:** Table `t_0t9l4729MccmafSCY2P` created with 2 records via this API flow.

---

## Example AI-Generated Plan

**User Request:** "Find SaaS companies in California, enrich with emails, score 1-10 for ICP fit"

**AI-Generated Execution Plan:**

```json
{
  "tableName": "CA SaaS Companies Q1 2026",
  "estimatedCredits": 2500,
  "estimatedRows": 500,
  "steps": [
    {
      "order": 1,
      "type": "create_table",
      "config": {
        "name": "CA SaaS Companies Q1 2026",
        "workspaceId": "ws_xxx"
      }
    },
    {
      "order": 2,
      "type": "add_source",
      "config": {
        "sourceType": "find_companies",
        "filters": {
          "industries": ["Software", "SaaS"],
          "locations": ["California"],
          "sizes": ["11-50 employees", "51-200 employees"],
          "limit": 500
        }
      }
    },
    {
      "order": 3,
      "type": "add_column",
      "config": {
        "name": "Contact Email",
        "type": "enrichment",
        "enrichmentType": "email_finder",
        "sourceColumn": "Company Domain",
        "creditsPerRow": 1
      }
    },
    {
      "order": 4,
      "type": "add_column",
      "config": {
        "name": "ICP Score",
        "type": "ai",
        "model": "clay-argon",
        "conditionalRun": "!!{{Contact Email}}",
        "prompt": "Analyze this company for ICP fit...",
        "outputSchema": {
          "score": "number",
          "reasoning": "string",
          "nextStep": "string"
        },
        "creditsPerRow": 1
      }
    },
    {
      "order": 5,
      "type": "run_enrichment",
      "config": {
        "columns": ["Contact Email", "ICP Score"],
        "runAll": true
      }
    }
  ]
}
```

---

## Configuration

### Environment Variables (Supabase Edge Function Secrets)

```bash
# Required for AI orchestration
ANTHROPIC_API_KEY=sk-ant-xxx          # For Claude Opus 4.5 ✅ Already set

# Required for Clay authentication (auto-refresh)
CLAY_EMAIL=your@email.com             # Clay account email
CLAY_PASSWORD=your-password           # Clay account password
```

### How Clay Auth Works

1. **Daily refresh**: pg_cron calls `clay-auth-refresh` at 5 AM UTC
2. **Auth flow**: Edge function POSTs to `https://api.clay.com/v3/auth/login`
3. **Cookie storage**: Session cookie stored in `clay_auth` table
4. **Usage**: `clay-orchestrate` reads cookie from database for API calls
5. **Expiration**: Cookies valid for 24 hours, refreshed daily before expiry

### Client Configuration (clay_client_configs table)

```json
{
  "client": "Acme Corp",
  "workspace_id": "ws_abc123",
  "default_model": "clay-argon",
  "budget_limits": {
    "max_credits_per_table": 10000,
    "preferred_enrichments": ["apollo_person", "email_finder"]
  }
}
```

---

## Edge Function Architecture (IMPORTANT)

**Principle:** Create **separate edge functions** for each major flow rather than one monolithic orchestrator.

### Why Separate Functions?

| Benefit | Description |
|---------|-------------|
| **Testability** | Each step can be tested independently |
| **Retryability** | If step 2 fails, can retry without re-running step 1 |
| **User Control** | User can preview results before committing |
| **Reusability** | Functions can be combined in different workflows |
| **Debugging** | Easier to identify which step failed |

### Current Edge Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `clay-auth-refresh` | Daily Clay session authentication | Active |
| `clay-orchestrate` | AI-powered workbook creation (complex multi-step) | Active |
| `clay-generate-filters` | Generate Clay filters from Fathom call transcripts | Active (no-verify-jwt) |
| `clay-submit-filters` | Submit approved filters to Clay Find Companies | Active |
| `clay-build-leads-table` | **Correct 2-step flow**: enrichment preview + wizard with null workbookId | Active (RECOMMENDED) |
| `clay-create-workbook` | Creates empty workbook via POST /v3/tables | Deprecated - DO NOT USE (causes empty rows) |
| `clay-import-companies` | Wizard import with existing workbookId | Deprecated - DO NOT USE (rows not populated) |
| `clay-create-table` | Legacy direct table creation | Deprecated |

### When to Use Each Function

- **clay-build-leads-table**: **RECOMMENDED** for creating workbooks with company data. Uses correct 2-step flow with `workbookId: null`
- **clay-orchestrate**: Complex AI-driven workflows where the user describes intent and AI plans execution
- **clay-generate-filters**: Convert Fathom call ICP discussions into Clay filter config
- **clay-submit-filters**: Execute a reviewed/approved filter against Clay API
- **clay-create-workbook**: **DO NOT USE** - Creates empty tables, part of broken 3-step flow
- **clay-import-companies**: **DO NOT USE** - Passes existing workbookId which prevents row population
- **Future functions**: `clay-add-columns`, `clay-run-enrichment`, `clay-export-results`, etc.

---

## Fathom → Clay Filter Generation Flow

### Overview

Users submit a Fathom call transcript → AI generates Clay "Find Companies" filters → User reviews/edits → Submit to Clay.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Web App UI                               │
│  1. Select Fathom call or paste transcript                  │
│  2. Click "Generate Filters"                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              clay-generate-filters Edge Function            │
│                                                              │
│  • Fetches transcript from client_fathom_calls               │
│  • Calls Claude Sonnet with filter schema                    │
│  • AI extracts ICP and maps to Clay filters                  │
│  • Stores result in generated_filters table                  │
│  • Returns: filters, reasoning, confidence                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Web App UI                               │
│  3. Display generated filters (editable)                    │
│  4. Show AI reasoning and confidence score                  │
│  5. User edits if needed                                    │
│  6. Click "Submit to Clay"                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              clay-submit-filters Edge Function              │
│                                                              │
│  Step 1: POST /v3/actions/run-enrichment                     │
│    → Returns taskId + company count                          │
│                                                              │
│  Step 2: POST /v3/workspaces/{id}/wizard/evaluate-step       │
│    → Creates workbook + table + imports companies            │
│                                                              │
│  • Updates generated_filters with status=submitted           │
│  • Returns: table_id, records_imported                       │
└─────────────────────────────────────────────────────────────┘
```

### Database Tables

**client_fathom_calls** (existing):
- `id`, `client`, `transcript`, `summary`, `call_type`, `status`

**generated_filters** (new):
```sql
CREATE TABLE generated_filters (
  id uuid PRIMARY KEY,
  fathom_call_id uuid REFERENCES client_fathom_calls(id),
  client text NOT NULL,
  filters jsonb NOT NULL,          -- CompanySearchFilters
  reasoning text,                   -- AI explanation
  suggested_limit integer,
  confidence numeric(3,2),          -- 0.00 to 1.00
  status text DEFAULT 'pending_review',  -- pending_review | approved | submitted | failed
  user_edits jsonb,                 -- Track manual changes
  clay_task_id text,                -- From run-enrichment
  clay_table_id text,               -- From wizard import
  clay_response jsonb,              -- Full Clay response
  submitted_to_clay_at timestamptz,
  error_message text,
  created_at timestamptz,
  updated_at timestamptz
);
```

### API Endpoints

**POST /clay-generate-filters**
```json
// Request
{ "fathom_call_id": "uuid" }
// or for testing:
{ "transcript": "call transcript text...", "client": "Acme Corp" }

// Response
{
  "success": true,
  "generated_filter_id": "uuid",
  "filters": { /* CompanySearchFilters */ },
  "reasoning": "The call discussed targeting SaaS companies...",
  "suggested_limit": 100,
  "confidence": 0.85
}
```

**POST /clay-submit-filters**
```json
// Request
{
  "generated_filter_id": "uuid",
  "table_name": "Q1 2026 SaaS Prospects"  // optional
}

// Response
{
  "success": true,
  "table_id": "t_xxx",
  "task_id": "at_xxx",
  "records_imported": 100,
  "companies_found": 42000
}
```

---

## Change Log

### 2026-01-28 (Session 8) - CRITICAL: workbookId Behavior Discovery

**Problem:** Tables created via the 3-step flow (create-workbook, find-companies, import-companies) had ZERO ROWS.

**Investigation:**
- `clay-create-workbook` creates an empty table via `POST /v3/tables`
- `clay-import-companies` passes `workbookId: existingId` to the wizard
- The wizard does NOT populate rows when given an existing workbookId

**Root Cause:** The Clay wizard API behaves differently based on `workbookId`:
- `workbookId: null` = Fresh flow, creates workbook AND imports rows from taskId
- `workbookId: existing` = Adds table to workbook but SKIPS row import

**Solution:** Created `clay-build-leads-table` edge function that implements the correct 2-step flow:
1. Run enrichment preview to get taskId with companies
2. Call wizard with `workbookId: null` to create new workbook WITH populated rows

**Files Created:**
- `supabase/functions/clay-build-leads-table/index.ts` - Correct 2-step implementation

**Files Deprecated (DO NOT USE):**
- `clay-create-workbook` - Step 1 of broken 3-step flow
- `clay-import-companies` - Step 3 of broken 3-step flow (passes existing workbookId)

**Documentation Updates:**
- Added "CRITICAL: Wizard workbookId Behavior" section
- Updated Edge Functions table with deprecation warnings
- Updated "Working Find Companies Flow" to emphasize `workbookId: null` requirement

---

### 2026-01-28 (Session 7) - Filter Generation Complete

**Completed:**
- Deployed `clay-generate-filters` edge function with `--no-verify-jwt` flag (required for frontend calls)
- Fixed JWT verification issue blocking frontend requests
- Added `initialFilters` prop to `CompanySearchFilters` component for AI-generated filter pre-population
- Created new components:
  - `src/components/clay/FathomFilterGenerator.tsx` - Main component for transcript input and filter generation
  - `src/components/clay/FathomFilterInput.tsx` - Textarea for transcript input with Fathom call selection
- Created `src/hooks/useClayFilterGeneration.ts` hook for React Query integration

**End-to-End Flow Verified:**
1. User inputs Fathom transcript
2. `clay-generate-filters` calls Claude Sonnet to extract ICP criteria
3. AI maps ICP to Clay filter schema (industries, sizes, locations, etc.)
4. Filters stored in `generated_filters` table with reasoning and confidence score
5. Filters pre-populate `CompanySearchFilters` for user review/editing

**Files Created/Modified:**
- `supabase/functions/clay-generate-filters/index.ts` - Edge function (deployed)
- `supabase/functions/clay-submit-filters/index.ts` - Edge function (deployed)
- `src/components/clay/FathomFilterGenerator.tsx` - New
- `src/components/clay/FathomFilterInput.tsx` - New
- `src/hooks/useClayFilterGeneration.ts` - New
- `src/components/clay/workbook-builder/CompanySearchFilters.tsx` - Added `initialFilters` prop

---

### 2026-01-28 (Session 6) - Wizard API Fix

**Problem:** `wizard/evaluate-step` was returning InternalServerError for all requests.

**Root Cause:** The wizard payload was missing `typeSettings.inputs` - the filter criteria must be passed in both:
1. The enrichment preview call (to generate matching companies)
2. The wizard payload's `typeSettings.inputs` (for table creation)

**Fix Applied:**
1. Added `typeSettings.inputs` with all filter criteria to wizard payload
2. Updated `BASIC_FIELDS` with correct Size field select options (UUIDs from working payload)
3. Added missing fields: `requiredDataPoint: null`, `outputs: []`, `firstUseCase: null`, `parentFolderId: null`
4. Fixed response extraction - tableId is at `output.table.tableId`, not top level
5. Added check for 0 companies before attempting wizard import

**Also Fixed:**
- Enrichment preview count was reading from wrong location (`result.companyCount` not top-level `count`)

**Verified Working:** Successfully created table `t_0t9l8yuRCfz5o2Q4mGt` with 5 records.

---

### 2026-01-28 (Session 5) - Fathom Filter Generation

**New Feature:** Generate Clay filters from Fathom call transcripts using AI.

**Architecture Decision:** Create separate edge functions per flow instead of one monolithic orchestrator.

**Created:**
- `supabase/functions/clay-generate-filters/index.ts` - AI filter generation from transcripts
- `supabase/functions/clay-submit-filters/index.ts` - Submit filters to Clay (two-step wizard flow)
- `supabase/migrations/20260128120000_generated_filters_table.sql` - New table for filter workflow

**Files Modified:**
- `clay_implementation.md` - Added Edge Function Architecture section, Fathom flow documentation

**Next:** Build web app components for filter review/editing UI.

### 2026-01-28 (Session 4) - API Flow Discovery

**Major Breakthrough:** Discovered the working Clay API flow for Find Companies import via network inspection.

**Problem:** Direct table/source creation APIs were failing with "Invalid subscriptions" errors.

**Solution:** Clay requires a two-step wizard-based approach:
1. **Run enrichment preview** (`POST /v3/actions/run-enrichment`) → Returns `taskId`
2. **Execute wizard step** (`POST /v3/workspaces/{id}/wizard/evaluate-step`) → Creates table + imports data

**Changes Made:**
- Updated `clay-orchestrate/index.ts` with new two-step API flow
- Added `wizard_import` step type to execution plan
- Added `run_enrichment` step type with proper taskId extraction
- Updated SYSTEM_PROMPT with detailed wizard payload documentation
- Added `SESSION_ID` placeholder with UUID generation
- Added proper context extraction for `TASK_ID`, `TABLE_ID`, `SOURCE_ID`
- Updated `useClayOrchestration.ts` hook with new step types

**Verified:** Successfully created table `t_0t9l4729MccmafSCY2P` with 2 company records via the new API flow.

**Files Modified:**
- `supabase/functions/clay-orchestrate/index.ts`
- `src/hooks/useClayOrchestration.ts`

### 2026-01-27 (Session 3)
- **Deployed `clay-orchestrate` edge function** to Supabase
- Verified ANTHROPIC_API_KEY secret is already configured
- **Created `clay-auth-refresh` edge function** - authenticates with Clay and stores session
- **Created `clay_auth` database table** - stores session cookies with 24h expiry
- **Updated `clay-orchestrate`** to read session from database instead of secrets
- **Set CLAY_EMAIL and CLAY_PASSWORD secrets** from .env
- **Ran database migration** via Management API (table + singleton index)
- **Created daily pg_cron job** (schedule #47) - refreshes auth at 5 AM UTC
- **Triggered initial auth refresh** - session stored successfully
- System is now fully automated - no manual cookie management needed

### 2026-01-27 (Session 2)
- Corrected terminology: "Create Table" → "Begin Workbook"
- Documented Clay hierarchy: Client → Workbooks → Tables → CE Table
- Redesigned UI tabs: Workbooks | Templates | Summary
- Designed Workbooks tab with expandable table list
- **Implemented UI changes:**
  - Renamed `CreateTableWizard.tsx` → `BeginWorkbookWizard.tsx`
  - Updated wizard copy (workbookName, CE table terminology)
  - Rewrote `GTMImplementation.tsx` with new tab structure
  - Created `WorkbooksTab` with expandable workbook/table list
  - Created `TemplatesTab` for workbook templates
  - Created `SummaryTab` with stats and recent activity
- **Implemented AI Orchestration:**
  - Created `supabase/functions/clay-orchestrate/index.ts` with Claude Opus 4.5
  - Built comprehensive system prompt with Clay API documentation
  - Implemented plan generation and execution engine
  - Created `src/hooks/useClayOrchestration.ts` React hook
  - Added `OrchestrationModal` component to show progress/results
  - Wired wizard completion to orchestration flow

### 2026-01-27 (Session 1)
- Initial architecture design
- Created implementation plan
- Explored existing clay-automation code
- Identified need for AI orchestration layer

---

## Next Steps

### Fathom → Clay Filter Flow
1. ~~**Create generated_filters table**~~ Done - Migration created
2. ~~**Create clay-generate-filters function**~~ Done
3. ~~**Create clay-submit-filters function**~~ Done
4. ~~**Deploy new edge functions**~~ Done (with `--no-verify-jwt`)
5. ~~**Fix wizard API payload**~~ Done - see Session 6 changelog
6. ~~**Run database migration**~~ Done - `generated_filters` table exists
7. ~~**Build filter review UI**~~ Done - `FathomFilterGenerator` component
8. ~~**Add Fathom call selector**~~ Done - `FathomFilterInput` component
9. ~~**Test end-to-end flow**~~ Done - Verified transcript → filters → stored
10. **Integrate filter UI into main workflow** - Connect to BeginWorkbookWizard or separate page
11. **Submit filters to Clay** - Wire up "Submit to Clay" button to `clay-submit-filters`
12. **Display Clay results** - Show created table ID and record count

### Workbook Orchestration Flow
13. ~~**Deploy edge functions**~~ Done (clay-orchestrate, clay-auth-refresh)
14. ~~**Discover working API flow**~~ Done - run-enrichment → wizard/evaluate-step
15. **Test with AI columns** - Begin workbook → AI generates plan → Execute
16. **Add plan approval step** - Show plan before executing
17. **Implement real-time progress** - WebSocket updates during execution
18. **Add template creation** - Save successful plans as reusable templates
