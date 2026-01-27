# Workbooks

Workbook operations for creating and managing Clay workbooks.

---

## Create a Workbook

### Endpoint
`POST https://api.clay.com/v3/workbooks`

### Description
Creates a new workbook in your Clay workspace. Workbooks are containers for organizing related tables.

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
Content-Type: application/json
```

### Request Body
```json
{
  "name": "My New Workbook",
  "workspaceId": "WORKSPACE_ID",
  "settings": {
    "isAutoRun": true
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Display name for the workbook |
| workspaceId | string | Yes | ID of the workspace to create in |
| settings | object | No | Workbook configuration |
| settings.isAutoRun | boolean | No | Enable auto-run for enrichments |

### cURL Example
```bash
curl --location --request POST 'https://api.clay.com/v3/workbooks' \
  --header 'Cookie: claysession=your_session_token' \
  --header 'Content-Type: application/json' \
  --data-raw '{"name":"Lead Enrichment Workbook","workspaceId":"WORKSPACE_ID","settings":{"isAutoRun":true}}'
```

### Response (200 OK)
```json
{
  "id": "wb_newworkbook123",
  "name": "Lead Enrichment Workbook",
  "workspaceId": "WORKSPACE_ID",
  "settings": {
    "isAutoRun": true
  },
  "createdAt": "2024-06-21T10:30:00Z"
}
```

### Notes
- `isAutoRun: true` enables automatic enrichment execution when new rows are added
- Workbook names don't need to be unique
- The returned `id` is used for subsequent operations

---

## Delete a Workbook

### Endpoint
`DELETE https://api.clay.com/v3/workbooks/{WORKBOOK_ID}`

### Description
Permanently deletes a workbook and all its contained tables. This action cannot be undone.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| WORKBOOK_ID | string | Yes | The workbook identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request DELETE 'https://api.clay.com/v3/workbooks/WORKBOOK_ID' \
  --header 'Cookie: claysession=your_session_token'
```

### Warning
This operation:
- Permanently deletes the workbook
- Deletes ALL tables within the workbook
- Deletes ALL data in those tables
- Cannot be undone

---

*Source: claydocs.claygenius.io*
