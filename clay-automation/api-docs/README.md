# Clay API Documentation

This folder contains reverse-engineered Clay.com API documentation captured from the unofficial Clay API docs at `claydocs.claygenius.io`.

**Base URL**: `https://api.clay.com/v3`

## Authentication

All endpoints (except login) require a `Cookie` header with your Clay session token:
```
Cookie: claysession=your_session_token
```

Session cookies expire after **24 hours** and should be refreshed at the beginning of each workflow or daily automation cycle.

## Structure

```
api-docs/
├── README.md                <- This file (index)
└── endpoints/
    ├── authentication.md    <- Login/session management
    ├── workspaces.md        <- Workspace operations
    ├── folders.md           <- Folder operations
    ├── resources.md         <- Resource discovery
    ├── workbooks.md         <- Workbook operations
    ├── tables.md            <- Table operations (CRUD, enrichments)
    └── credit-usage.md      <- Credit/usage reporting
```

## Index of Documented Endpoints

### Authentication
- [x] **POST** `/v3/auth/login` - Fetch Clay Cookies (login)

### Workspaces
- [x] **GET** `/v3/my-workspaces` - Get all workspaces in account

### Folders
- [x] **POST** `/v3/workspaces/{id}/folders` - Create a folder
- [x] **DELETE** `/v3/folders/{id}` - Delete a folder

### Resources
- [x] **POST** `/v3/workspaces/{id}/resources_v2/` - Fetch all resources
- [x] **POST** `/v3/workspaces/{id}/resources/search` - Search resources

### Workbooks
- [x] **POST** `/v3/workbooks` - Create a workbook
- [x] **DELETE** `/v3/workbooks/{id}` - Delete a workbook

### Tables
- [x] **GET** `/v3/tables/{id}/views/{viewId}/records/ids` - Fetch all record IDs
- [x] **POST** `/v3/tables/{id}/records` - Add row(s) to table
- [x] **DELETE** `/v3/tables/{id}/records/{recordId}` - Delete a row
- [x] **DELETE** `/v3/tables/{id}/records` - Delete all rows
- [x] **PATCH** `/v3/tables/{id}/run` - Run enrichment column
- [x] **GET** `/v3/tables/{id}/count` - Count rows in table
- [x] **GET** `/v3/tables/{id}/sources` - List all sources
- [x] **PATCH** `/v3/tables/{id}` - Add webhook to table
- [x] **DELETE** `/v3/tables/{id}/sources/{sourceId}` - Delete a source

### Credit Usage
- [x] **GET** `/v3/owners` - Get list of owners
- [x] **GET** `/v3/users/{id}/credits` - Get user credit usage
- [x] **POST** `/v3/users/{id}/resources` - Get user-created resources
- [x] **GET** `/v3/workspaces/{id}/credits` - Get workspace credit usage
- [x] **GET** `/v3/integrations` - List all integrations
- [x] **GET** `/v3/integrations/{type}` - Get integration type details
- [x] **GET** `/v3/integrations/{type}/credits` - Get integration credit usage
- [x] **GET** `/v3/integrations/{type}/credits/report` - Get integration credit report

---

## Quick Start

### 1. Authenticate
```bash
curl -X POST 'https://api.clay.com/v3/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"password":"YOUR_PASSWORD","email":"YOUR_EMAIL","source":null}'
```
Extract `claysession` from `Set-Cookie` response header.

### 2. List Workspaces
```bash
curl 'https://api.clay.com/v3/my-workspaces' \
  -H 'Cookie: claysession=your_session_token'
```

### 3. List Resources in Workspace
```bash
curl -X POST 'https://api.clay.com/v3/workspaces/WORKSPACE_ID/resources_v2/' \
  -H 'Cookie: claysession=your_session_token' \
  -H 'Content-Type: application/json' \
  -d '{"filters":{"resourceTypes":["WORKBOOK"]}}'
```

### 4. Run Enrichment on Table
```bash
curl -X PATCH 'https://api.clay.com/v3/tables/TABLE_ID/run' \
  -H 'Cookie: claysession=your_session_token' \
  -d '{"fieldIds":["COLUMN_ID"],"runRecords":{"viewIdTopRecords":{"viewId":"VIEW_ID","numRecords":10}},"callerName":"API"}'
```

---

*Source: claydocs.claygenius.io (Unofficial)*
*Updated: 2026-01-27*
