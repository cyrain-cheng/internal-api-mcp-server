# @giikin/mcp-server

MCP Server 是 AI 工具（Kiro/Cursor）与 mcp-auth 后端之间的协议桥梁。通过 MCP 协议（stdio）与 AI 工具通信，通过 HTTP 调用 mcp-auth 后端完成钉钉授权登录、Token 管理和接口代理调用。

MCP Server 本身不包含业务逻辑，仅负责协议适配、Token 本地缓存、浏览器交互和轮询编排。

## 环境要求

- Node.js 18+
- TypeScript 5.4+
- mcp-auth 后端服务已启动（默认 `http://localhost:8080`）

## 安装和构建

```bash
# 安装依赖
cd mcp-server
npm install

# 编译 TypeScript
npm run build
```

编译产物输出到 `dist/` 目录，入口文件为 `dist/index.js`。

## Kiro MCP 配置

### 开发模式

本地开发时，使用 `node` 直接运行编译后的入口文件：

```json
{
  "mcpServers": {
    "giikin-api": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "MCP_AUTH_BASE_URL": "http://localhost:8080"
      }
    }
  }
}
```

### 发布模式

通过 npx 拉取已发布的 npm 包运行：

```json
{
  "mcpServers": {
    "giikin-api": {
      "command": "npx",
      "args": ["-y", "@giikin/mcp-server@latest"],
      "env": {
        "MCP_AUTH_BASE_URL": "http://localhost:8080",
        "INTERNAL_API_BASE_URL": "https://internal-api.giikin.com"
      },
      "autoApprove": ["get_auth_status", "get_available_apis"]
    }
  }
}
```

> `autoApprove` 中的 tools 无需用户确认即可调用。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MCP_AUTH_BASE_URL` | `http://localhost:8080` | mcp-auth 后端地址 |
| `INTERNAL_API_BASE_URL` | （无默认值） | 内部业务接口基础地址，`call_api` 使用该地址拼接请求 URL |

## Tools 列表

MCP Server 注册了 5 个 tools，供 AI 工具发现和调用：

| Tool | 说明 | 参数 |
|------|------|------|
| `login` | 发起钉钉扫码登录，自动打开浏览器完成授权 | 无 |
| `get_auth_status` | 检查当前登录状态 | 无 |
| `get_available_apis` | 获取当前用户有权限的接口文档列表 | 无 |
| `call_api` | 代理调用内部业务接口，自动携带认证 Token | `url`、`method`、`params` |
| `logout` | 登出，清除本地缓存的 Token | 无 |

### 使用流程

1. 调用 `get_auth_status` 检查登录状态
2. 如未登录，调用 `login` 发起钉钉扫码授权
3. 登录成功后，调用 `get_available_apis` 查看可用接口
4. 根据接口文档，调用 `call_api` 获取业务数据

### call_api 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 接口路径，如 `/ad/campaign/list` |
| `method` | string | 是 | HTTP 方法：`GET`、`POST`、`PUT`、`DELETE`，默认 `GET` |
| `params` | object | 否 | 请求参数。GET 请求作为查询参数，POST/PUT/DELETE 作为 JSON 请求体 |

## 项目结构

```
mcp-server/
├── src/
│   ├── index.ts              # 入口文件，创建 MCP Server 并注册 tools
│   ├── tools/
│   │   ├── auth.ts           # 认证相关 tools（login、get_auth_status、logout）
│   │   └── api.ts            # 接口相关 tools（get_available_apis、call_api）
│   ├── services/
│   │   ├── auth-client.ts    # HTTP 客户端，封装 mcp-auth 后端调用
│   │   └── token-manager.ts  # Token 本地缓存管理
│   └── utils/
│       └── browser.ts        # 浏览器打开工具
├── dist/                     # TypeScript 编译输出
├── package.json
└── tsconfig.json
```

## 开发调试

```bash
# 1. 先启动 mcp-auth 后端
cd mcp-auth && mvn spring-boot:run

# 2. 编译 MCP Server
cd mcp-server && npm run build

# 3. 在 Kiro 中配置 MCP Server（参考上方开发模式配置）
```

## 许可证

内部项目，仅限公司内部使用。
