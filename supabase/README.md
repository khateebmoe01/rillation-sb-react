# Supabase Configuration

This folder contains all Supabase database schema definitions and edge function documentation for the Rillation Revenue Analytics platform.

## Folder Structure

```
supabase/
├── README.md                 # This file
├── migrations/
│   └── 20241217000000_initial_schema.sql   # Complete database schema
├── functions/
│   └── README.md             # Edge functions documentation
└── seed.sql                  # (Optional) Initial seed data
```

## Purpose

This folder serves as the **single source of truth** for your Supabase infrastructure:

1. **Version Control** - Track all database changes over time
2. **Documentation** - Understand the complete schema at a glance
3. **Reproducibility** - Recreate the database in any environment
4. **Collaboration** - Share database structure with team members

## Database Schema Overview

### Tables (12 total)

| Table | Description | Primary Use |
|-------|-------------|-------------|
| `Clients` | Client list with Bison API credentials | Master data |
| `Campaigns` | Campaign metadata | Lookup/filtering |
| `campaign_reporting` | Daily campaign metrics | Analytics |
| `replies` | Email replies with categories | Analytics |
| `meetings_booked` | Booked meeting records | Pipeline |
| `client_targets` | Daily KPI targets per client | Performance tracking |
| `funnel_forecasts` | Monthly forecast estimates | Forecasting |
| `engaged_leads` | Lead pipeline stages | Sales pipeline |
| `inboxes` | Email inbox inventory | Infrastructure |
| `inbox_orders` | Inbox order tracking | Infrastructure |
| `domains` | Domain inventory | Infrastructure |
| `storeleads` | E-commerce store leads | Lead data |

### Edge Functions (5 total)

| Function | Description |
|----------|-------------|
| `sync-domains-porkbun` | Sync domains from Porkbun |
| `check-domain-availability` | Check domain availability |
| `generate-domains` | Generate domain variations |
| `order-inboxes-bulk` | Bulk order inboxes |
| `sync-inbox-providers` | Sync inbox provider data |

## Using Migrations

### View Current Schema
Open `migrations/20241217000000_initial_schema.sql` to see the complete database structure.

### Creating New Migrations
When making database changes, create a new migration file:

```bash
# Format: YYYYMMDDHHMMSS_description.sql
touch supabase/migrations/20241218120000_add_new_column.sql
```

Example migration:
```sql
-- Migration: Add revenue column to meetings_booked
-- Created: 2024-12-18

ALTER TABLE meetings_booked
ADD COLUMN estimated_revenue DECIMAL(12,2);

COMMENT ON COLUMN meetings_booked.estimated_revenue IS 'Estimated deal value';
```

### Running Migrations (with Supabase CLI)

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push migrations to remote
supabase db push

# Or reset and apply all migrations
supabase db reset
```

## Environment Variables

Required for the application (store in `.env`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Required for Edge Functions (set via Supabase CLI):
```bash
supabase secrets set PORKBUN_API_KEY=xxx
supabase secrets set PORKBUN_SECRET_KEY=xxx
```

## Quick Commands

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Deploy edge functions
supabase functions deploy

# Generate TypeScript types from schema
supabase gen types typescript --linked > src/types/supabase.ts
```

## Related Files

- `src/types/database.ts` - TypeScript interfaces for tables
- `src/types/infrastructure.ts` - TypeScript interfaces for infrastructure tables
- `src/lib/supabase.ts` - Supabase client configuration
- `src/lib/infrastructure-api.ts` - Edge function API wrappers




