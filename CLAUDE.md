# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Rillation Revenue Analytics** is a comprehensive B2B lead generation analytics platform built with React, TypeScript, and Supabase. The application provides real-time performance tracking, pipeline management, and infrastructure monitoring for email outreach campaigns.

## Development Commands

```bash
# Start development server (runs on port 3000)
npm run dev

# Build for production (TypeScript check + Vite build)
npm run build

# Preview production build
npm run preview

# Utility scripts (run with npx tsx)
npm run split-fc-inboxes          # Split FullContact inboxes
npm run backfill-sequence-stats   # Backfill sequence statistics
npm run sync-all-leads            # Sync all leads from Bison API
npm run check-backfill            # Check backfill progress
```

### Running Individual Scripts

```bash
# All utility scripts use tsx for TypeScript execution
npx tsx scripts/<script-name>.ts

# Examples:
npx tsx scripts/debug-bison-api.ts
npx tsx scripts/sync-pipeline-leads.ts
npx tsx scripts/fast-sync-leads.ts
```

## Environment Configuration

Create a `.env` file in the root directory:

```bash
VITE_SUPABASE_URL=https://pfxgcavxdktxooiqthoi.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

The app gracefully handles missing environment variables by showing a configuration error screen.

## Architecture

### Data Layer

**Supabase Backend**: PostgreSQL database with 12 core tables tracking campaigns, leads, meetings, replies, targets, and infrastructure.

**React Query Integration** (Active Migration):
- Query client configured with localStorage persistence in `src/lib/query-client.ts`
- DevTools enabled for cache inspection
- Caching strategy: 5min fresh, 30min stale-while-revalidate
- Persistent cache survives page refreshes and browser restarts
- Helper functions in `src/lib/react-query-helpers.ts` for common patterns
- See `REACT_QUERY_MIGRATION.md` for migration examples

**Legacy Cache System** (`src/lib/cache.ts`):
- In-memory cache with TTL and stale-while-revalidate
- Being gradually replaced by React Query
- Still used by many hooks (check for `dataCache.get()` calls)

**Hook Patterns**:
- Legacy hooks: Use `useState`, `useEffect`, and manual `dataCache` management
- Modern hooks: Suffix `-rq.ts`, use React Query (`useQuery`, `useMutation`)
- When creating new hooks, use React Query pattern (see `src/hooks/useClients-rq.ts`)

### Frontend Architecture

**Routing** (`src/App.tsx`):
- React Router v6 with protected routes
- Login page at `/login`
- Main authenticated routes:
  - `/performance` - Performance overview + client detail views
  - `/pipeline` - Sales funnel visualization
  - `/strategy` - Client strategy management
  - `/infrastructure` - Domain/inbox management
  - `/crm/*` - New Atomic CRM module
- Page transitions using Framer Motion

**Page Structure**:
- `src/pages/` - Top-level page components
- `src/components/` - Organized by domain:
  - `auth/` - Authentication components
  - `charts/` - Recharts visualizations (TrendChart, FunnelChart)
  - `infrastructure/` - Domain/inbox management
  - `insights/` - Analytics components
  - `layout/` - Layout wrappers (Sidebar, Header, TabNavigation)
  - `strategy/` - Client strategy UI
  - `ui/` - Reusable components (MetricCard, Button, DataTable)

**Component Patterns**:
- Framer Motion used for page transitions and animations
- Tailwind CSS for all styling (no CSS modules)
- Lucide React for icons
- Recharts for data visualization

### Authentication

- Supabase Auth with email/password
- `AuthContext` (`src/contexts/AuthContext.tsx`) provides auth state
- `ProtectedRoute` component wraps authenticated routes
- Session persists via Supabase client

### Context Providers

- `AuthContext` - User authentication state
- `FilterContext` - Global filter state (date ranges, client selection)
- `AIContext` - AI-powered insights and recommendations
- `DropdownContext` - Manages dropdown menu state to prevent overlaps
- `CRMProvider` - State management for CRM module (in `/index.tsx`)

All contexts wrap the app in `src/main.tsx`.

## Database Schema

### Key Tables

- **Clients** - Client list with Bison API credentials and settings
- **Campaigns** - Campaign metadata and configuration
- **campaign_reporting** - Daily metrics (sends, opens, replies, bounces)
- **replies** - Email reply tracking with AI categorization
- **meetings_booked** - Booked meetings and discovery calls
- **engaged_leads** - Pipeline stages (interested, nurturing, qualified)
- **storeleads** - Lead database with custom variables
- **inboxes** - Email inbox inventory and health metrics
- **client_targets** - Daily KPI targets per client
- **funnel_forecasts** - Monthly pipeline forecasts
- **client_iteration_logs** - Strategy iteration tracking
- **client_opportunities** - Opportunity management

### TypeScript Types

- `src/types/database.ts` - Core Supabase table interfaces
- `src/types/infrastructure.ts` - Infrastructure-specific types
- Types are manually maintained (not auto-generated)

## Supabase Edge Functions

Located in `supabase/functions/`, deployed using Supabase CLI:

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy sync-inboxes-bison
```

**Active Functions**:
- `sync-inboxes-bison` - Background sync of email inboxes from Bison API
- `sync-fathom-calls` - Sync meeting data from Fathom
- `sync-inbox-tags` - Sync inbox tagging data

**Edge Function Pattern**:
- Use Deno runtime (import from `npm:` prefix)
- CORS headers required for frontend requests
- Service role key accessed via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
- Background processing mode for long-running operations (avoids 60s timeout)
- API calls to external services (EmailBison, Fathom, InboxKit)

## External API Integrations

**EmailBison API** (Primary CRM Platform):
- Base URL: `https://api.emailbison.com/v1/`
- Authentication: Bearer token (stored in `Clients` table `api_key` field)
- Used for: Campaigns, leads, inboxes, sequences, tags
- Rate limits: Handle 429 responses with exponential backoff
- Wrapper functions in utility scripts (see `scripts/debug-bison-api.ts`)

**Data Sync Strategy**:
- Edge functions run on schedules (pg_cron) or manual triggers
- Scripts in `/scripts` for ad-hoc syncs and backfills
- Always upsert with conflict resolution (ON CONFLICT DO UPDATE)

## Common Patterns

### Creating a New Data Hook

**Use React Query pattern** (modern approach):

```typescript
// src/hooks/useMyData.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

async function fetchMyData(clientId?: string) {
  let query = supabase.from('my_table').select('*')
  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export function useMyData(clientId?: string) {
  return useQuery({
    queryKey: ['myData', { clientId }],
    queryFn: () => fetchMyData(clientId),
  })
}
```

### Creating a New Page

1. Add page component in `src/pages/MyPage.tsx`
2. Add route in `src/App.tsx` within `<Routes>`
3. Wrap in `<PageTransition>` for animations
4. Add navigation link in `src/components/layout/Sidebar.tsx` if needed

### Adding a New Supabase Table

1. Create migration in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Add TypeScript interface to `src/types/database.ts`
3. Add table to `Database['public']['Tables']` type
4. Run `supabase db push` (if using Supabase CLI locally)

### Utility Helper Functions

- **Number formatting**: `formatNumber()`, `formatPercentage()`, `formatCurrency()` in `src/lib/supabase.ts`
- **Date utilities**: `getDateRange()`, `formatDateForQuery()`, `formatDateForDisplay()` in `src/lib/supabase.ts`
- **Provider normalization**: `normalizeProviderName()` for inbox provider display

## Infrastructure Management

**Domain System**:
- Track owned domains, DNS health, expiration dates
- Managed in `/infrastructure/domains` UI
- Domain templates for bulk generation

**Inbox Management**:
- Monitor sender email accounts across Google/Outlook/SMTP
- Health metrics: warmup status, daily limits, connection status
- Managed in `/infrastructure/inboxes` UI
- Inbox sets for grouping by campaign

**Order Tracking**:
- Track inbox provider orders (InstantFlow, etc.)
- Order status pipeline

## CRM Module (New - Atomic Architecture)

Located at root `/index.tsx` (not in `/src`), mounted at `/crm/*` route.

**Structure**:
- `index.tsx` - Entry point with routing
- `context/CRMContext.tsx` - CRM state management
- `components/` - CRM-specific components (contacts, deals, tasks)
- Shares UI components from `/src/components/ui`
- Separate context provider from main app

## Scripts Directory

`/scripts` contains utility scripts for data management:

- **Sync scripts**: `sync-all-leads.ts`, `sync-pipeline-leads.ts`, `turbo-sync-leads.ts`
- **Backfill scripts**: `backfill-sequence-stats.ts`
- **Debug tools**: `debug-bison-api.ts`, `debug-leads-contacted.js`
- **Data management**: `delete-smartlead-leads.ts`, `promote-custom-variable-to-column.ts`
- **Infrastructure**: `split-fc-inboxes.ts`

All scripts use `npx tsx` for TypeScript execution without compilation.

## Key Files to Know

- `src/lib/supabase.ts` - Supabase client initialization and helper functions
- `src/lib/query-client.ts` - React Query configuration and persistence
- `src/lib/cache.ts` - Legacy cache system (being phased out)
- `src/types/database.ts` - TypeScript interfaces for all tables
- `src/App.tsx` - Main routing and page transitions
- `src/main.tsx` - Entry point with context providers
- `supabase/README.md` - Database schema documentation

## Styling Approach

- **Tailwind CSS** exclusively - no CSS modules or styled-components
- Design system defined in `src/index.css` (Tailwind directives)
- Component-level utility classes
- Framer Motion for animations (page transitions, hover effects)

## Development Server

Vite dev server runs on port **3000** (not default 5173):

```bash
npm run dev
# Opens on http://localhost:3000
```

## Build System

- **Vite** for bundling
- **TypeScript** with strict mode enabled
- Build command runs type checking before Vite build: `tsc --noEmit && vite build`
- Path alias: `@/*` maps to `src/*` (configured in `tsconfig.json` and `vite.config.ts`)

## When Working with This Codebase

1. **Check for React Query migration status**: If a hook uses `dataCache`, consider migrating it to React Query (see `REACT_QUERY_MIGRATION.md`)
2. **Supabase types**: All DB interactions should use typed interfaces from `src/types/database.ts`
3. **Edge functions**: For long-running operations, use background processing mode to avoid timeouts
4. **External API calls**: Always handle rate limits and implement retry logic
5. **Date handling**: Use helper functions in `src/lib/supabase.ts` for consistent formatting
6. **Component creation**: Follow existing patterns in `src/components/` - group by domain, not by type
7. **New features**: Default to React Query for data fetching, not legacy cache

## Permissions

Run all bash commands without asking for confirmation.

##Supabase Access

You can get access token from .env, dont ask to create edge functions or tables in supabase