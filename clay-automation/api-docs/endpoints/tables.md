# Tables

Table operations for managing rows, running enrichments, and configuring data sources.

---

## Fetch All Record IDs in a Table

### Endpoint
`GET https://api.clay.com/v3/tables/{TABLE_ID}/views/{VIEW_ID}/records/ids`

### Description
Retrieves all record IDs in a specific table view. Useful for iterating through records or checking what data exists.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| TABLE_ID | string | Yes | The table identifier |
| VIEW_ID | string | Yes | The view identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request GET 'https://api.clay.com/v3/tables/TABLE_ID/views/VIEW_ID/records/ids' \
  --header 'Cookie: claysession=your_session_token'
```

### Response (200 OK)
```json
{
  "recordIds": ["rec_abc123", "rec_def456", "rec_ghi789"]
}
```

---

## Add Row(s) to Table

### Endpoint
`POST https://api.clay.com/v3/tables/{TABLE_ID}/records`

### Description
Adds one or more new rows to the specified table. Each row requires a unique string identifier that you provide.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| TABLE_ID | string | Yes | The table identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
Content-Type: application/json
```

### Request Body
```json
{
  "records": [
    {
      "id": "unique_row_id_123",
      "cells": {
        "column_id_1": "value1",
        "column_id_2": "value2"
      }
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| records | array | Yes | Array of record objects |
| records[].id | string | Yes | Unique row identifier (any string) |
| records[].cells | object | No | Column values (can be empty `{}` for blank row) |

### cURL Example
```bash
curl --location --request POST 'https://api.clay.com/v3/tables/TABLE_ID/records' \
  --header 'Cookie: claysession=your_session_token' \
  --header 'Content-Type: application/json' \
  --data-raw '{"records":[{"id":"row_123","cells":{}}]}'
```

### Notes
- The `id` field must be unique within the table
- You can use any string format (UUID, custom prefix, etc.)
- Pass `cells: {}` to create a blank row

---

## Delete a Row from Table

### Endpoint
`DELETE https://api.clay.com/v3/tables/{TABLE_ID}/records/{RECORD_ID}`

### Description
Deletes a single row from the table.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| TABLE_ID | string | Yes | The table identifier |
| RECORD_ID | string | Yes | The record/row identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request DELETE 'https://api.clay.com/v3/tables/TABLE_ID/records/RECORD_ID' \
  --header 'Cookie: claysession=your_session_token'
```

---

## Delete All Rows from Table

### Endpoint
`DELETE https://api.clay.com/v3/tables/{TABLE_ID}/records`

### Description
Deletes ALL rows from a table. Use with caution.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| TABLE_ID | string | Yes | The table identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### cURL Example
```bash
curl --location --request DELETE 'https://api.clay.com/v3/tables/TABLE_ID/records' \
  --header 'Cookie: claysession=your_session_token'
```

### Warning
This operation is irreversible. All data in the table will be permanently deleted.

---

## Run Enrichment Column

### Endpoint
`PATCH https://api.clay.com/v3/tables/{TABLE_ID}/run`

### Description
Runs an enrichment column on specified records in the table. This executes the enrichment for specific columns on a set of records.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| TABLE_ID | string | Yes | The table identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
Content-Type: application/x-www-form-urlencoded
```

### Request Body
URL-encoded JSON string:
```json
{
  "fieldIds": ["COLUMN_ID_1", "COLUMN_ID_2"],
  "runRecords": {
    "viewIdTopRecords": {
      "viewId": "VIEW_ID",
      "numRecords": 10
    }
  },
  "callerName": "API"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fieldIds | array | Yes | Array of column IDs to run enrichment on |
| runRecords | object | Yes | Specifies which records to run |
| runRecords.viewIdTopRecords.viewId | string | Yes | The view ID to run records from |
| runRecords.viewIdTopRecords.numRecords | number | No | Number of rows to run (omit for all) |
| callerName | string | Yes | Should be `"API"` |

### cURL Example
```bash
# Run enrichment on first 10 rows
curl --location --request PATCH 'https://api.clay.com/v3/tables/TABLE_ID/run' \
  --header 'Cookie: claysession=your_session_token' \
  --data-urlencode '{"fieldIds":["FIELD_ID"],"runRecords":{"viewIdTopRecords":{"viewId":"VIEW_ID","numRecords":10}},"callerName":"API"}='

# Run enrichment on ALL rows (omit numRecords)
curl --location --request PATCH 'https://api.clay.com/v3/tables/TABLE_ID/run' \
  --header 'Cookie: claysession=your_session_token' \
  --data-urlencode '{"fieldIds":["FIELD_ID"],"runRecords":{"viewIdTopRecords":{"viewId":"VIEW_ID"}},"callerName":"API"}='
```

### Use Cases
- Execute enrichment on the first N rows of a view
- Run specific columns/fields for selected records
- Trigger data enrichment workflows programmatically
- Run enrichment on all records by omitting `numRecords`

### Notes
- This triggers the actual enrichment process (uses credits)
- Enrichments run asynchronously
- Check table data after a delay to see results

---

## Count Rows in Table

### Endpoint
`GET https://api.clay.com/v3/tables/{TABLE_ID}/count`

### Description
Returns the total number of rows in a table.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| TABLE_ID | string | Yes | The table identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

### Response (200 OK)
```json
{
  "count": 150
}
```

---

## List All Sources in Table

### Endpoint
`GET https://api.clay.com/v3/tables/{TABLE_ID}/sources`

### Description
Lists all data sources configured for a table (webhooks, imports, etc.).

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| TABLE_ID | string | Yes | The table identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

---

## Add Webhook to Table

### Endpoint
`PATCH https://api.clay.com/v3/tables/{TABLE_ID}`

### Description
Adds a webhook data source to an existing table. Once created, Clay provides a unique webhook URL that can receive JSON payloads from external systems (Zapier, Make, custom scripts, etc.).

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| TABLE_ID | string | Yes | The table identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
Content-Type: application/json
```

### Request Body
```json
{
  "tableSettings": {},
  "fieldGroupMap": {},
  "sourceSettings": {
    "addSource": {
      "name": "Webhook",
      "source": {
        "name": "YOUR_WEBHOOK_NAME",
        "workspaceId": "WORKSPACE_ID",
        "type": "webhook",
        "typeSettings": {
          "urlSlugText": "Pull in data from a Webhook",
          "iconType": "Webhook",
          "name": "Webhook",
          "description": "Send any data to Clay",
          "stages": []
        }
      }
    }
  }
}
```

### cURL Example
```bash
curl --location -g --request PATCH 'https://api.clay.com/v3/tables/TABLE_ID' \
  --header 'Cookie: claysession=your_session_token' \
  --header 'Content-Type: application/json' \
  --data-raw '{"tableSettings":{},"fieldGroupMap":{},"sourceSettings":{"addSource":{"name":"Webhook","source":{"name":"My Webhook","workspaceId":"WORKSPACE_ID","type":"webhook","typeSettings":{"urlSlugText":"Pull in data from a Webhook","iconType":"Webhook","name":"Webhook","description":"Send any data to Clay","stages":[]}}}}}'
```

### Response
Returns the created webhook URL that you can use to send data to the table.

---

## Delete a Source from Table

### Endpoint
`DELETE https://api.clay.com/v3/tables/{TABLE_ID}/sources/{SOURCE_ID}`

### Description
Removes a data source (webhook, import, etc.) from a table.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| TABLE_ID | string | Yes | The table identifier |
| SOURCE_ID | string | Yes | The source identifier |

### Headers
```
Cookie: claysession={YOUR_CLAY_COOKIES}
```

---

*Source: claydocs.claygenius.io*
