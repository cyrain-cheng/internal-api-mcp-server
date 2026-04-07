# internal-api-mcp-server

[中文文档](./README.zh-CN.md)

MCP Server for internal API access. Acts as a protocol bridge between AI tools (Kiro/Cursor) and your authentication backend via stdio transport.

Handles auth login, token caching, and API proxy calls — no business logic included.

## Requirements

- Node.js 18+
- Authentication backend service running (default `http://localhost:8080`)

## Install & Build

```bash
npm install
npm run build
```

## Configuration

### Local development

```json
{
  "mcpServers": {
    "internal-api": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "MCP_AUTH_BASE_URL": "http://localhost:8080",
        "INTERNAL_API_BASE_URL": "http://localhost:9090"
      }
    }
  }
}
```

### From GitHub

```json
{
  "mcpServers": {
    "internal-api": {
      "command": "npx",
      "args": ["-y", "github:cyrain-cheng/internal-api-mcp-server"],
      "env": {
        "MCP_AUTH_BASE_URL": "https://your-auth-server",
        "INTERNAL_API_BASE_URL": "https://your-internal-api"
      },
      "autoApprove": ["get_auth_status", "get_available_apis"]
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_AUTH_BASE_URL` | `http://localhost:8080` | Auth backend URL |
| `INTERNAL_API_BASE_URL` | — | Internal API base URL for `call_api` |

## Tools

| Tool | Description | Params |
|------|-------------|--------|
| `login` | Open browser for scan-to-login auth | — |
| `get_auth_status` | Check current login status | — |
| `get_available_apis` | List APIs available to current user | — |
| `call_api` | Proxy call to internal API with auth token | `url`, `method`, `params` |
| `logout` | Clear locally cached token | — |

### Workflow

1. `get_auth_status` → check login
2. `login` → scan QR code to authorize
3. `get_available_apis` → see available endpoints
4. `call_api` → fetch business data

### call_api params

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | yes | API path, e.g. `/system/health` |
| `method` | string | yes | `GET`, `POST`, `PUT`, `DELETE` |
| `params` | object | no | Query params for GET, JSON body for others |

## Project Structure

```
src/
├── index.ts                # Entry point, creates MCP Server
├── tools/
│   ├── auth.ts             # login, get_auth_status, logout
│   └── api.ts              # get_available_apis, call_api
├── services/
│   ├── auth-client.ts      # HTTP client for auth backend
│   └── token-manager.ts    # Local token cache (~/.internal-api-mcp/token.json)
└── utils/
    └── browser.ts          # Browser opener
```

## License

MIT
