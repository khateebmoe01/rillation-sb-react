# Enrichments

Enrichment operations for finding and enriching company/contact data.

---

## Find Companies (MixRank Source)

### Endpoint
`POST https://api.clay.com/v3/workspaces/{WORKSPACE_ID}/resources_v2/`

### Description
Discovers and returns a list of companies matching specified filters. Uses MixRank as the data source. This is used when creating a new table to populate it with company prospects.

**IMPORTANT: Our implementation limits to 100 companies per request.**

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| WORKSPACE_ID | string | Yes | The workspace identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
Content-Type: application/json
Origin: https://app.clay.com
Referer: https://app.clay.com/
```

### Request Body Structure
```json
{
  "workspaceId": "WORKSPACE_ID",
  "enrichmentType": "find-lists-of-companies-with-mixrank-source-preview",
  "options": {
    "sync": true,
    "returnTaskId": true,
    "returnActionMetadata": true
  },
  "inputs": {
    // See Filter Options below
  }
}
```

---

## Filter Options

### Industries (Multi-select)
**Field**: `industries` / `industries_exclude`

398 predefined industry options. See `filter-options/industries.json` for full list.

Examples:
- Software Development
- Financial Services
- Manufacturing
- Healthcare
- IT Services and IT Consulting

### Company Sizes (Multi-select)
**Field**: `sizes`

```json
[
  "Self-Employed",
  "2-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1,000 employees",
  "1,001-5,000 employees",
  "5,001-10,000 employees",
  "10,001+ employees"
]
```

### Annual Revenue (Multi-select)
**Field**: `annual_revenues`

```json
[
  "$0 - $500K",
  "$500K - $1M",
  "$1M - $5M",
  "$5M - $10M",
  "$10M - $25M",
  "$25M - $75M",
  "$75M - $200M",
  "$200M - $500M",
  "$500M - $1B",
  "$1B - $10B",
  "$10B - $100B",
  "$100B+"
]
```

### Funding Raised (Multi-select)
**Field**: `funding_amounts`

```json
[
  "Under $1M",
  "$1M - $5M",
  "$5M - $10M",
  "$10M - $25M",
  "$25M - $50M",
  "$50M - $100M",
  "$100M - $250M",
  "$250M+",
  "Funding unknown"
]
```

### Company Types (Multi-select)
**Field**: `types`

```json
[
  "Privately Held",
  "Public Company",
  "Partnership",
  "Self Employed",
  "Non Profit",
  "Educational",
  "Self Owned",
  "Government Agency"
]
```

### Business Types (Multi-select)
**Field**: `derived_business_types`

```json
[
  "B2B",
  "B2C",
  "Nonprofit"
]
```

### Associated Member Count
**Fields**: `minimum_member_count`, `maximum_member_count`

Type: Number inputs (min/max range)

### Minimum Follower Count
**Field**: `minimum_follower_count`

Type: Number input

### Description Keywords
**Fields**: `description_keywords`, `description_keywords_exclude`

Type: Free text array
- Include: Keywords to search for in company descriptions
- Exclude: Keywords to filter out

Example: `["sales", "data", "outbound"]`

### Location Filters
**Fields**:
- `country_names` - Countries to include
- `country_names_exclude` - Countries to exclude
- `locations` - Cities or states to include
- `locations_exclude` - Cities or states to exclude

Type: Multi-select / free text arrays

### Lookalike Companies
**Field**: `company_identifier`

Type: Text array (max 10 entries)

Accepts:
- LinkedIn company URLs
- Company domains
- Sales Navigator company URLs
- Sales Navigator company IDs

Example: `["linkedin.com/company/grow-with-clay", "stripe.com"]`

### Products & Services Description
**Field**: `semantic_description`

Type: Free text

Natural language description for semantic search.
Example: "Sales prospecting tools, lead enrichment platforms, B2B data providers"

### Results Limit
**Field**: `limit`

Type: Number
- Our max: **100**
- Clay max: 50,000

---

## Full Request Example

```json
{
  "workspaceId": "161745",
  "enrichmentType": "find-lists-of-companies-with-mixrank-source-preview",
  "options": {
    "sync": true,
    "returnTaskId": true,
    "returnActionMetadata": true
  },
  "inputs": {
    "industries": ["Software Development", "IT Services and IT Consulting"],
    "industries_exclude": [],
    "sizes": ["51-200 employees", "201-500 employees"],
    "annual_revenues": ["$10M - $25M", "$25M - $75M"],
    "funding_amounts": [],
    "types": ["Privately Held"],
    "derived_business_types": ["B2B"],
    "minimum_member_count": 50,
    "maximum_member_count": 500,
    "minimum_follower_count": 100,
    "description_keywords": ["saas", "sales"],
    "description_keywords_exclude": ["agency"],
    "country_names": ["United States"],
    "country_names_exclude": [],
    "locations": ["California", "New York"],
    "locations_exclude": [],
    "company_identifier": [],
    "semantic_description": "",
    "limit": 100,
    "has_resolved_domain": true,
    "resolved_domain_is_live": true,
    "domainFieldId": null,
    "exclude_entities_configuration": [],
    "exclude_entities_bitmap": null,
    "previous_entities_bitmap": null,
    "exclude_company_identifiers_mixed": [],
    "derived_industries": [],
    "derived_revenue_streams": [],
    "derived_subindustries": [],
    "derived_subindustries_exclude": [],
    "name": "",
    "radialKnnMinScore": null,
    "resolved_domain_redirects": null,
    "startFromCompanyType": "company_identifier",
    "tableId": null,
    "useRadialKnn": false,
    "result_count": true
  }
}
```

### cURL Example
```bash
curl --location --request POST 'https://api.clay.com/v3/workspaces/161745/resources_v2/' \
  --header 'Cookie: claysession=your_session_token' \
  --header 'Content-Type: application/json' \
  --header 'Origin: https://app.clay.com' \
  --data-raw '{
    "workspaceId": "161745",
    "enrichmentType": "find-lists-of-companies-with-mixrank-source-preview",
    "options": {"sync": true, "returnTaskId": true, "returnActionMetadata": true},
    "inputs": {
      "industries": ["Software Development"],
      "sizes": ["51-200 employees"],
      "country_names": ["United States"],
      "limit": 100,
      "result_count": true
    }
  }'
```

---

## TypeScript Types

See `clay-automation/types/company-search.ts` for full TypeScript definitions including:
- `CompanySearchFilters` interface
- `FindCompaniesRequest` interface
- All predefined option arrays
- Helper functions

---

## Notes
- Results include company name, domain, LinkedIn URL, and basic firmographic data
- Use `sync: true` for immediate results (blocking)
- Use `sync: false` with `returnTaskId: true` for async processing
- Large queries may take longer to process
- This endpoint is rate-limited

---

*Source: Captured from Clay app network requests*
*Updated: 2026-01-27*
