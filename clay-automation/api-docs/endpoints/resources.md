# Resources

Resource discovery operations for finding workbooks, tables, and folders in a workspace.

---

## Fetch All Resources

### Endpoint
`POST https://api.clay.com/v3/workspaces/{WORKSPACE_ID}/resources_v2/`

### Description
Retrieves all top-level resources in a Clay workspace (folders, workbooks, individual tables). Does not include tables nested within folders/workbooks.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| WORKSPACE_ID | string | Yes | The workspace identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
Content-Type: application/json
```

### Request Body (Optional)
```json
{
  "filters": {
    "resourceTypes": ["WORKBOOK"]
  }
}
```

### Filtering Options
| Filter | Description |
|--------|-------------|
| `{"filters": {"resourceTypes": ["WORKBOOK"]}}` | Get only workbooks |
| `{"filters": {"resourceTypes": ["TABLE"]}}` | Get only tables |
| `{"filters": {"resourceTypes": ["FOLDER"]}}` | Get only folders |
| `{"filters": {}}` | Get all resources (no filter) |
| No body | Get all resources |

### Resource Types
- `WORKBOOK` - Clay workbooks containing multiple tables
- `TABLE` - Individual tables
- `FOLDER` - Organizational folders

### cURL Examples
```bash
# Get all resources
curl --location --request POST 'https://api.clay.com/v3/workspaces/WORKSPACE_ID/resources_v2/' \
  --header 'Cookie: claysession=your_session_token'

# Get only workbooks
curl --location --request POST 'https://api.clay.com/v3/workspaces/WORKSPACE_ID/resources_v2/' \
  --header 'Cookie: claysession=your_session_token' \
  --header 'Content-Type: application/json' \
  --data-raw '{"filters":{"resourceTypes":["WORKBOOK"]}}'

# Get only tables
curl --location --request POST 'https://api.clay.com/v3/workspaces/WORKSPACE_ID/resources_v2/' \
  --header 'Cookie: claysession=your_session_token' \
  --header 'Content-Type: application/json' \
  --data-raw '{"filters":{"resourceTypes":["TABLE"]}}'
```

### Response (200 OK)
```json
{
  "resources": [
    {
      "id": "wb_abc123",
      "name": "Lead Enrichment",
      "type": "WORKBOOK",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-06-20T15:45:00Z"
    },
    {
      "id": "tbl_def456",
      "name": "Company Database",
      "type": "TABLE",
      "createdAt": "2024-02-10T09:00:00Z",
      "updatedAt": "2024-06-21T11:30:00Z"
    }
  ]
}
```

### Notes
- Only returns top-level resources
- To get tables within a workbook, query the workbook directly
- Useful for discovering IDs needed for other operations

---

## Search Resources in Workspace

### Endpoint
`POST https://api.clay.com/v3/workspaces/{WORKSPACE_ID}/resources/search`

### Description
Search for resources by name or other criteria within a workspace.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| WORKSPACE_ID | string | Yes | The workspace identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
Content-Type: application/json
```

### Request Body
```json
{
  "query": "search term"
}
```

### cURL Example
```bash
curl --location --request POST 'https://api.clay.com/v3/workspaces/WORKSPACE_ID/resources/search' \
  --header 'Cookie: claysession=your_session_token' \
  --header 'Content-Type: application/json' \
  --data-raw '{"query":"lead enrichment"}'
```

### Notes
- Searches across resource names and descriptions
- Returns matching workbooks, tables, and folders

---

*Source: claydocs.claygenius.io*
