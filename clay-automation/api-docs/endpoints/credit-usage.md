# Credit Usage

Endpoints for monitoring credit consumption and usage reports in Clay.

---

## Get List of Owners

### Endpoint
`GET https://api.clay.com/v3/owners`

### Description
Retrieves a list of account owners/admins who have access to credit usage information.

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request GET 'https://api.clay.com/v3/owners' \
  --header 'Cookie: claysession=your_session_token'
```

---

## Get User-Specific Credit Usage Report

### Endpoint
`GET https://api.clay.com/v3/users/{USER_ID}/credits`

### Description
Retrieves credit usage statistics for a specific user.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| USER_ID | string | Yes | The user identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request GET 'https://api.clay.com/v3/users/USER_ID/credits' \
  --header 'Cookie: claysession=your_session_token'
```

---

## Get User-Created Resources

### Endpoint
`POST https://api.clay.com/v3/users/{USER_ID}/resources`

### Description
Lists all resources (workbooks, tables) created by a specific user.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| USER_ID | string | Yes | The user identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request POST 'https://api.clay.com/v3/users/USER_ID/resources' \
  --header 'Cookie: claysession=your_session_token'
```

---

## Get Workspace Credit Usage Report

### Endpoint
`GET https://api.clay.com/v3/workspaces/{WORKSPACE_ID}/credits`

### Description
Retrieves credit usage statistics for an entire workspace.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| WORKSPACE_ID | string | Yes | The workspace identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request GET 'https://api.clay.com/v3/workspaces/WORKSPACE_ID/credits' \
  --header 'Cookie: claysession=your_session_token'
```

### Response (200 OK)
```json
{
  "totalCredits": 10000,
  "usedCredits": 3500,
  "remainingCredits": 6500,
  "periodStart": "2024-06-01T00:00:00Z",
  "periodEnd": "2024-06-30T23:59:59Z"
}
```

---

## List All Integrations

### Endpoint
`GET https://api.clay.com/v3/integrations`

### Description
Lists all available integration types in Clay (enrichment providers, data sources).

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request GET 'https://api.clay.com/v3/integrations' \
  --header 'Cookie: claysession=your_session_token'
```

---

## Get Integration Type Details

### Endpoint
`GET https://api.clay.com/v3/integrations/{INTEGRATION_TYPE}`

### Description
Retrieves details about a specific integration type.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| INTEGRATION_TYPE | string | Yes | The integration type identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request GET 'https://api.clay.com/v3/integrations/clearbit' \
  --header 'Cookie: claysession=your_session_token'
```

---

## Get Integration-Specific Credit Usage

### Endpoint
`GET https://api.clay.com/v3/integrations/{INTEGRATION_TYPE}/credits`

### Description
Retrieves credit usage for a specific integration type.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| INTEGRATION_TYPE | string | Yes | The integration type identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request GET 'https://api.clay.com/v3/integrations/clearbit/credits' \
  --header 'Cookie: claysession=your_session_token'
```

---

## Get Integration Credit Usage Report

### Endpoint
`GET https://api.clay.com/v3/integrations/{INTEGRATION_TYPE}/credits/report`

### Description
Retrieves a detailed credit usage report for a specific integration.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| INTEGRATION_TYPE | string | Yes | The integration type identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request GET 'https://api.clay.com/v3/integrations/clearbit/credits/report' \
  --header 'Cookie: claysession=your_session_token'
```

---

*Source: claydocs.claygenius.io*
