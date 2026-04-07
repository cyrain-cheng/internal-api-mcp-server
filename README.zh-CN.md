# internal-api-mcp-server

内部接口 MCP Server，作为 AI 工具（Kiro/Cursor）与认证后端之间的协议桥梁，通过 stdio 传输协议通信。

支持扫码登录、Token 本地缓存、接口代理调用，不包含业务逻辑。

## 环境要求

- Node.js 18+
- 认证后端服务已启动（默认 `http://localhost:8080`）

## 安装与构建

```bash
npm install
npm run build
```

## 配置方式

### 本地开发

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

### 从 GitHub 安装

```json
{
  "mcpServers": {
    "internal-api": {
      "command": "npx",
      "args": ["-y", "github:cyrain-cheng/internal-api-mcp-server"],
      "env": {
        "MCP_AUTH_BASE_URL": "https://你的认证服务地址",
        "INTERNAL_API_BASE_URL": "https://你的内部接口地址"
      },
      "autoApprove": ["get_auth_status", "get_available_apis"]
    }
  }
}
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MCP_AUTH_BASE_URL` | `http://localhost:8080` | 认证后端地址 |
| `INTERNAL_API_BASE_URL` | — | 内部业务接口地址，`call_api` 使用 |

## 工具列表

| 工具 | 说明 | 参数 |
|------|------|------|
| `login` | 打开浏览器进行扫码登录 | — |
| `get_auth_status` | 检查当前登录状态 | — |
| `get_available_apis` | 获取当前用户可用的接口列表 | — |
| `call_api` | 代理调用内部接口，自动携带 Token | `url`、`method`、`params` |
| `logout` | 清除本地缓存的 Token | — |

### 使用流程

1. `get_auth_status` → 检查是否已登录
2. `login` → 扫码授权登录
3. `get_available_apis` → 查看可用接口
4. `call_api` → 调用业务接口获取数据

### call_api 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 接口路径，如 `/system/health` |
| `method` | string | 是 | `GET`、`POST`、`PUT`、`DELETE` |
| `params` | object | 否 | GET 作为查询参数，其他作为 JSON 请求体 |

## 项目结构

```
src/
├── index.ts                # 入口，创建 MCP Server
├── tools/
│   ├── auth.ts             # login、get_auth_status、logout
│   └── api.ts              # get_available_apis、call_api
├── services/
│   ├── auth-client.ts      # 认证后端 HTTP 客户端
│   └── token-manager.ts    # Token 本地缓存（~/.internal-api-mcp/token.json）
└── utils/
    └── browser.ts          # 浏览器打开工具
```

## 许可证

MIT
