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

## Current Status: Phase 1 - Architecture & UI Redesign

**Last Updated:** 2026-01-27

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

### In Progress
- [ ] Test end-to-end flow (Begin Workbook → AI generates plan → Execute against Clay)

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
│   └── clay-auth-refresh/         # Daily Clay authentication
│       └── index.ts               # Login + store session cookie
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

## Change Log

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

1. ~~**Deploy edge functions**~~ ✅ Done (clay-orchestrate, clay-auth-refresh)
2. ~~**Set ANTHROPIC_API_KEY secret**~~ ✅ Already configured
3. ~~**Set Clay credentials secrets**~~ ✅ Done (CLAY_EMAIL, CLAY_PASSWORD)
4. ~~**Create database table**~~ ✅ Done (clay_auth + cron job)
5. ~~**Initial auth refresh**~~ ✅ Done - session stored
6. **Test end-to-end flow** - Begin workbook → AI generates plan → Execute against Clay
7. **Add plan approval step** - Show plan before executing
8. **Implement real-time progress** - WebSocket updates during execution
9. **Add template creation** - Save successful plans as reusable templates
