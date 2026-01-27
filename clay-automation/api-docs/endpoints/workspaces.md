# Workspaces

Workspace operations for listing and managing Clay workspaces.

---

## Get All Workspaces in Account

### Endpoint
`GET https://api.clay.com/v3/my-workspaces`

### Description
Retrieves all workspaces associated with your Clay account. Use this to discover workspace IDs needed for other API calls.

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request GET 'https://api.clay.com/v3/my-workspaces' \
  --header 'Cookie: claysession=your_session_token'
```

### Response (200 OK)
```json
{
  "workspaces": [
    {
      "id": "ws_abc123",
      "name": "My Workspace",
      "createdAt": "2024-01-15T10:30:00Z",
      "settings": {}
    },
    {
      "id": "ws_def456",
      "name": "Client Projects",
      "createdAt": "2024-03-20T14:00:00Z",
      "settings": {}
    }
  ]
}
```

### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| workspaces | array | List of workspace objects |
| workspaces[].id | string | Unique workspace identifier |
| workspaces[].name | string | Workspace display name |
| workspaces[].createdAt | string | ISO 8601 creation timestamp |
| workspaces[].settings | object | Workspace configuration settings |

### Notes
- Returns all workspaces where you have access
- Workspace IDs are needed for most other API operations
- Personal and team workspaces are both included

---

*Source: claydocs.claygenius.io*
