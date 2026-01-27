# Folders

Folder operations for organizing workbooks and tables in Clay.

---

## Create a Folder

### Endpoint
`POST https://api.clay.com/v3/workspaces/{WORKSPACE_ID}/folders`

### Description
Creates a new folder in a workspace for organizing workbooks and tables.

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
  "name": "Client Projects",
  "parentFolderId": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Display name for the folder |
| parentFolderId | string | No | ID of parent folder for nesting (null for root) |

### cURL Example
```bash
curl --location --request POST 'https://api.clay.com/v3/workspaces/WORKSPACE_ID/folders' \
  --header 'Cookie: claysession=your_session_token' \
  --header 'Content-Type: application/json' \
  --data-raw '{"name":"Client Projects","parentFolderId":null}'
```

### Response (200 OK)
```json
{
  "id": "fld_abc123",
  "name": "Client Projects",
  "workspaceId": "WORKSPACE_ID",
  "parentFolderId": null,
  "createdAt": "2024-06-21T10:30:00Z"
}
```

### Notes
- Folders can be nested by specifying `parentFolderId`
- Use `null` for `parentFolderId` to create at root level

---

## Delete a Folder

### Endpoint
`DELETE https://api.clay.com/v3/folders/{FOLDER_ID}`

### Description
Deletes a folder. Contents may be moved to parent folder or deleted depending on settings.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| FOLDER_ID | string | Yes | The folder identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request DELETE 'https://api.clay.com/v3/folders/FOLDER_ID' \
  --header 'Cookie: claysession=your_session_token'
```

### Warning
Verify what happens to folder contents before deleting. Contents may be:
- Moved to parent folder
- Deleted along with the folder

---

*Source: claydocs.claygenius.io*
