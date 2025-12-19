# Supabase Edge Functions

This document describes all Edge Functions used in the Rillation Revenue Analytics platform.

## Overview

Edge Functions are server-side TypeScript functions that run on Supabase's edge network. They handle integrations with external APIs (Porkbun, inbox providers, etc.) and complex operations that shouldn't run client-side.

---

## Functions Reference

### 1. `sync-domains-porkbun`

**Purpose:** Syncs domain inventory from Porkbun registrar API into the `domains` table.

**Endpoint:**
```
POST /functions/v1/sync-domains-porkbun
```

**Request Body:** None required

**Response:**
```json
{
  "success": true,
  "domains": [...],
  "synced_count": 15,
  "message": "Successfully synced 15 domains from Porkbun"
}
```

**Tables Affected:**
- `domains` (INSERT/UPDATE)

**Environment Variables Required:**
- `PORKBUN_API_KEY`
- `PORKBUN_SECRET_KEY`

---

### 2. `check-domain-availability`

**Purpose:** Checks if one or more domains are available for registration.

**Endpoint:**
```
POST /functions/v1/check-domain-availability
```

**Request Body:**
```json
{
  "domains": ["example.com", "mycompany.io", "startup.co"]
}
```

**Response:**
```json
{
  "results": [
    { "domain": "example.com", "available": false },
    { "domain": "mycompany.io", "available": true, "price": 39.99 },
    { "domain": "startup.co", "available": true, "price": 29.99 }
  ]
}
```

**Tables Affected:** None (read-only external API call)

**Environment Variables Required:**
- `PORKBUN_API_KEY`
- `PORKBUN_SECRET_KEY`

---

### 3. `generate-domains`

**Purpose:** Generates domain name variations from a base name with optional prefixes and suffixes.

**Endpoint:**
```
POST /functions/v1/generate-domains
```

**Request Body:**
```json
{
  "base_name": "acme",
  "prefixes": ["get", "try", "use"],
  "suffixes": ["hq", "app", "io"],
  "client": "Acme Corp",
  "check_availability": true
}
```

**Response:**
```json
{
  "generated": [
    "getacme.com",
    "tryacme.com",
    "useacme.com",
    "acmehq.com",
    "acmeapp.com",
    "acmeio.com"
  ],
  "availability": [
    { "domain": "getacme.com", "available": true, "price": 12.99 },
    { "domain": "tryacme.com", "available": false }
  ]
}
```

**Tables Affected:** None (generates in memory, optionally checks availability)

**Environment Variables Required:**
- `PORKBUN_API_KEY` (if `check_availability: true`)
- `PORKBUN_SECRET_KEY` (if `check_availability: true`)

---

### 4. `order-inboxes-bulk`

**Purpose:** Places a bulk order for email inboxes with a provider.

**Endpoint:**
```
POST /functions/v1/order-inboxes-bulk
```

**Request Body:**
```json
{
  "provider": "google",
  "quantity": 10,
  "domain_id": 123,
  "domain": "acme.com",
  "client": "Acme Corp"
}
```

**Response:**
```json
{
  "success": true,
  "order_id": "ord_abc123",
  "status": "processing",
  "quantity": 10,
  "estimated_completion": "2024-12-18T10:00:00Z"
}
```

**Tables Affected:**
- `inbox_orders` (INSERT - creates order record)
- `inboxes` (INSERT - when order completes, webhook or polling adds inboxes)

**Environment Variables Required:**
- Provider-specific API keys (depends on provider)

---

### 5. `sync-inbox-providers`

**Purpose:** Syncs inbox data from all configured inbox providers (Google Workspace, Microsoft 365, etc.).

**Endpoint:**
```
POST /functions/v1/sync-inbox-providers
```

**Request Body:** None required

**Response:**
```json
{
  "success": true,
  "synced_count": 45,
  "providers": {
    "google": { "synced": 30, "errors": 0 },
    "microsoft": { "synced": 15, "errors": 0 }
  }
}
```

**Tables Affected:**
- `inboxes` (INSERT/UPDATE)

**Environment Variables Required:**
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`

---

### 6. `sync-sequence-steps`

**Purpose:** Syncs campaign sequence steps from Bison API into the `sequence_steps` table. Designed to run on a schedule (every 8 minutes).

**Endpoint:**
```
POST /functions/v1/sync-sequence-steps
```

**Request Body:** None required

**Response:**
```json
{
  "success": true,
  "message": "Synced 25 sequence steps from 10 campaigns",
  "total_campaigns": 10,
  "total_synced": 25,
  "total_errors": 0,
  "results": [
    { "campaign_id": "123", "status": "success", "steps": 5 },
    { "campaign_id": "456", "status": "success", "steps": 3 }
  ]
}
```

**Tables Read:**
- `Campaigns` (gets campaign_id and client)
- `Clients` (gets API key for each client)

**Tables Affected:**
- `sequence_steps` (INSERT/UPSERT)

**Environment Variables Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Scheduling:**
To run every 8 minutes, set up a cron job in Supabase Dashboard → Database → Extensions → pg_cron:
```sql
SELECT cron.schedule(
  'sync-sequence-steps',
  '*/8 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pfxgcavxdktxooiqthoi.supabase.co/functions/v1/sync-sequence-steps',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

---

## Function Implementation Template

Each function follows this structure:

```
supabase/functions/
├── sync-domains-porkbun/
│   └── index.ts
├── check-domain-availability/
│   └── index.ts
├── generate-domains/
│   └── index.ts
├── order-inboxes-bulk/
│   └── index.ts
└── sync-inbox-providers/
    └── index.ts
```

### Example Function Structure (`index.ts`):

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Parse request body
    const body = await req.json()

    // Your function logic here...

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
```

---

## Deployment

### Deploy a single function:
```bash
supabase functions deploy sync-domains-porkbun
```

### Deploy all functions:
```bash
supabase functions deploy
```

### Set environment variables:
```bash
supabase secrets set PORKBUN_API_KEY=your_key
supabase secrets set PORKBUN_SECRET_KEY=your_secret
```

---

## Local Development

### Start local Supabase:
```bash
supabase start
```

### Serve functions locally:
```bash
supabase functions serve
```

### Test a function:
```bash
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/sync-domains-porkbun' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

---

## Client-Side Usage

Functions are called from the frontend using the Supabase client:

```typescript
// From src/lib/infrastructure-api.ts
import { supabase } from './supabase'

export async function syncDomainsPorkbun() {
  const { data, error } = await supabase.functions.invoke('sync-domains-porkbun')
  if (error) throw error
  return data
}

export async function checkDomainAvailability(domains: string[]) {
  const { data, error } = await supabase.functions.invoke('check-domain-availability', {
    body: { domains },
  })
  if (error) throw error
  return data
}
```

