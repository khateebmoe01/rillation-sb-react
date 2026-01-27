# Authentication

## Fetch Clay Cookies (Login)

### Endpoint
`POST https://api.clay.com/v3/auth/login`

### Description
Authenticates user credentials and returns session cookies via response headers. Extract the `claysession` cookie from the `Set-Cookie` header and include it in the `Cookie` header for all subsequent API requests.

**Session cookies expire after 24 hours** and should be refreshed at the beginning of each workflow or daily automation cycle.

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "email": "your-email@example.com",
  "password": "your-password",
  "source": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Your Clay account email |
| password | string | Yes | Your Clay account password |
| source | null | Yes | Must be `null` |

### Response (200 OK)
```json
{
  "success": true,
  "redirect_to": "https://app.clay.com/workspaces/123456"
}
```

### Response Headers
The important part is the `Set-Cookie` header:
```
Set-Cookie: claysession=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; Secure; SameSite=Lax
```

### cURL Example
```bash
curl --location --request POST 'https://api.clay.com/v3/auth/login' \
  --header 'Content-Type: application/json' \
  --data-raw '{"password":"YOUR_CLAY_PASSWORD","email":"YOUR_CLAY_EMAIL","source":null}'
```

### Usage in Subsequent Requests
After obtaining the session cookie, include it in all API requests:
```bash
curl 'https://api.clay.com/v3/my-workspaces' \
  --header 'Cookie: claysession=your_session_token_here'
```

### Notes
- Session tokens are JWT-based
- Tokens expire after 24 hours
- No rate limit documented for login, but avoid excessive authentication requests
- Store the session token securely (not in client-side code)
- For automation, refresh the token at the start of each workflow run

### Error Responses
| Status | Description |
|--------|-------------|
| 401 | Invalid credentials |
| 429 | Too many login attempts (rate limited) |

---

*Source: claydocs.claygenius.io*
