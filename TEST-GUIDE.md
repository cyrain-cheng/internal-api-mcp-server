# MCP Server 手动测试指南

## 前置条件

### 环境要求

- Node.js 18+
- Java 17+（运行 mcp-auth 后端）
- Maven（构建 mcp-auth）

### 编译 MCP Server

```bash
cd mcp-server
npm install
npm run build
```

---

## 模式说明

mcp-auth 后端支持两种运行模式，通过 `mcp-auth/src/main/resources/application.yml` 中的 `dingtalk.mock-enabled` 切换：

| 模式 | 配置 | 说明 |
|------|------|------|
| Mock 模式 | `mock-enabled: true` | 无需真实钉钉应用，回调接受任意 authCode，始终返回"张三"用户 |
| 真实钉钉模式 | `mock-enabled: false` | 需要真实钉钉应用配置，用户扫码授权登录 |

---

## 测试一：Mock 模式测试

### 1.0 配置并启动后端

确认 `application.yml` 配置：

```yaml
dingtalk:
  mock-enabled: true
  client-id: "TODO_REPLACE_WITH_REAL_CLIENT_ID"
  client-secret: "TODO_REPLACE_WITH_REAL_CLIENT_SECRET"
  redirect-uri: "http://localhost:8080/auth/callback"
```

启动后端：

```bash
cd mcp-auth
mvn spring-boot:run
```

### 1.1 发起登录

```bash
curl http://localhost:8080/auth/login
```

预期响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "authUrl": "https://login.dingtalk.com/oauth2/auth?redirect_uri=...",
    "pollCode": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

记下返回的 `pollCode` 值。

### 1.2 模拟钉钉回调

Mock 模式下不需要真实扫码，直接手动调用回调接口模拟授权：

```bash
curl "http://localhost:8080/auth/callback?authCode=any_code&state={pollCode}"
```

将 `{pollCode}` 替换为上一步返回的值。

预期响应：HTML 页面显示"授权成功，可以关闭此页面"。

### 1.3 轮询获取 Token

```bash
curl "http://localhost:8080/auth/poll?code={pollCode}"
```

预期响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "status": "authorized",
    "token": "eyJhbGciOiJIUzM4NCJ9..."
  }
}
```

### 1.4 查询接口列表

```bash
curl -H "Authorization: Bearer {token}" http://localhost:8080/api/v1/apis
```

预期响应：返回"张三"用户有权限的 5 个接口（广告计划列表/创建、每日报表、系统健康/版本）。

### 1.5 无 Token 访问（验证 401）

```bash
curl http://localhost:8080/api/v1/apis
```

预期响应：HTTP 401 未认证。

---

## 测试二：真实钉钉模式测试

### 2.0 前置准备

#### 2.0.1 创建钉钉应用

1. 登录 [钉钉开放平台](https://open.dingtalk.com)
2. 进入"应用开发" → "企业内部应用" → "钉钉应用"
3. 点击"创建应用"，填写应用名称（如"MCP 接口服务"）
4. 创建完成后，在应用详情页获取：
   - **Client ID**（AppKey）
   - **Client Secret**（AppSecret）

#### 2.0.2 配置应用权限

在应用详情页 → "权限管理"中，申请以下权限：
- `Contact.User.Read`（获取用户信息）
- `Contact.User.mobile`（获取手机号，可选）

#### 2.0.3 配置回调地址

在应用详情页 → "登录与分享" → "回调域名"中，添加：

```
http://localhost:8080
```

#### 2.0.4 修改后端配置

编辑 `mcp-auth/src/main/resources/application.yml`：

```yaml
dingtalk:
  mock-enabled: false
  client-id: "你的真实 Client ID"
  client-secret: "你的真实 Client Secret"
  redirect-uri: "http://localhost:8080/auth/callback"
```

#### 2.0.5 重启后端

```bash
cd mcp-auth
# 如果之前有运行的实例，先 Ctrl+C 停掉
mvn spring-boot:run
```

### 2.1 发起登录

```bash
curl http://localhost:8080/auth/login
```

预期响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "authUrl": "https://login.dingtalk.com/oauth2/auth?redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fauth%2Fcallback&response_type=code&client_id=你的ClientID&scope=openid%20corpid&prompt=consent&state=xxx",
    "pollCode": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

记下 `pollCode` 和 `authUrl`。

### 2.2 浏览器扫码授权

在浏览器中打开上一步返回的 `authUrl`，会看到钉钉扫码登录页面。

用钉钉 App 扫码授权后，浏览器会自动跳转到回调地址，页面显示"授权成功，可以关闭此页面"。

> 注意：这一步是真实的钉钉扫码，不需要手动调用 callback 接口。

### 2.3 轮询获取 Token

```bash
curl "http://localhost:8080/auth/poll?code={pollCode}"
```

预期响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "status": "authorized",
    "token": "eyJhbGciOiJIUzM4NCJ9..."
  }
}
```

### 2.4 查询接口列表

```bash
curl -H "Authorization: Bearer {token}" http://localhost:8080/api/v1/apis
```

预期响应：真实钉钉用户在 Mock 数据中没有对应的内部用户，所以只返回公共接口：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {"url": "/system/health", "method": "GET", "description": "系统健康检查", ...},
    {"url": "/system/version", "method": "GET", "description": "获取系统版本信息", ...}
  ]
}
```

> 这是预期行为。后续接入真实用户系统后，会返回该用户有权限的完整接口列表。

---

## 测试三：通过 Kiro MCP 集成测试

### 3.0 配置 MCP Server

确认 `.kiro/settings/mcp.json` 中已添加 giikin-api 配置：

```json
{
  "mcpServers": {
    "giikin-api": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "MCP_AUTH_BASE_URL": "http://localhost:8080"
      },
      "autoApprove": ["get_auth_status", "get_available_apis"]
    }
  }
}
```

保存后 Kiro 会自动连接 MCP Server。

### 3.1 测试 get_auth_status（未登录状态）

在 Kiro 聊天中输入：

> 检查一下我的登录状态

预期：返回 `{"success": true, "message": "未登录"}`

### 3.2 测试 login

在 Kiro 聊天中输入：

> 帮我登录

预期行为（真实钉钉模式）：
1. 自动打开浏览器，显示钉钉扫码页面
2. 用钉钉 App 扫码授权
3. 浏览器显示"授权成功，可以关闭此页面"
4. MCP Server 轮询检测到授权成功，保存 Token
5. 返回 `{"success": true, "message": "登录成功"}`

预期行为（Mock 模式）：
1. 自动打开浏览器（钉钉页面会报错，因为 client_id 是假的）
2. 需要手动在浏览器访问 `http://localhost:8080/auth/callback?authCode=any&state={pollCode}` 模拟回调
3. MCP Server 轮询检测到授权成功，保存 Token
4. 返回 `{"success": true, "message": "登录成功"}`

### 3.3 测试 get_auth_status（已登录状态）

> 我登录了吗？

预期：返回 `{"success": true, "message": "已登录"}`

### 3.4 测试 login（重复登录）

> 再登录一次

预期：返回 `{"success": true, "message": "已登录，无需重复登录"}`，不会打开浏览器。

### 3.5 测试 get_available_apis

> 查看我有哪些可用的接口

预期（Mock 模式，"张三"用户）：返回 5 个接口
- `/ad/campaign/list` (GET) - 获取广告计划列表
- `/ad/campaign/create` (POST) - 创建广告计划
- `/report/daily` (GET) - 获取每日数据报表
- `/system/health` (GET) - 系统健康检查
- `/system/version` (GET) - 获取系统版本信息

预期（真实钉钉模式）：返回 2 个公共接口
- `/system/health` (GET)
- `/system/version` (GET)

### 3.6 测试 call_api

#### 未配置 INTERNAL_API_BASE_URL

> 帮我调用 /ad/campaign/list 接口

预期：返回 `{"success": false, "message": "未配置内部接口地址（INTERNAL_API_BASE_URL）"}`

#### 配置 INTERNAL_API_BASE_URL 后

更新 `.kiro/settings/mcp.json`，在 env 中添加：

```json
"INTERNAL_API_BASE_URL": "https://your-internal-api.com"
```

> 帮我调用 /ad/campaign/list 接口，参数 accountId 为 12345

预期：MCP Server 向 `https://your-internal-api.com/ad/campaign/list?accountId=12345` 发起 GET 请求，携带 Bearer Token。

### 3.7 测试 logout

> 帮我登出

预期：返回 `{"success": true, "message": "已登出"}`

### 3.8 测试 logout（未登录状态）

> 登出

预期：返回 `{"success": true, "message": "当前未登录"}`

---

## 测试四：异常场景

### 4.1 后端未启动时调用 login

停止 mcp-auth 后端，然后在 Kiro 中调用 login。

预期：返回 `{"success": false, "message": "无法连接到认证服务，请确认 mcp-auth 服务是否已启动"}`

### 4.2 Token 过期

登录成功后，手动编辑 `~/.giikin-mcp/token.json`，将 `expiresAt` 改为过去的时间，然后调用 `get_auth_status`。

预期：返回 `{"success": true, "message": "未登录"}`

### 4.3 Token 文件损坏

手动将 `~/.giikin-mcp/token.json` 内容改为 `{broken`，然后调用 `get_auth_status`。

预期：返回 `{"success": true, "message": "未登录"}`（不会抛异常）

### 4.4 未登录时调用 get_available_apis

预期：返回 `{"success": false, "message": "未登录，请先调用 login 工具"}`

### 4.5 未登录时调用 call_api

预期：返回 `{"success": false, "message": "未登录，请先调用 login 工具"}`

---

## 测试五：Token 缓存验证

### 5.1 Token 持久化

登录成功后检查文件：

```bash
cat ~/.giikin-mcp/token.json
```

预期内容：

```json
{
  "token": "eyJhbGciOiJIUzM4NCJ9...",
  "expiresAt": "2026-04-14T..."
}
```

### 5.2 重启后免登录

登录成功后，重启 MCP Server（在 Kiro 中重连 MCP），调用 `get_auth_status`。

预期：返回 `{"success": true, "message": "已登录"}`

---

## 测试六：完整端到端流程

### Mock 模式

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | 配置 `mock-enabled: true`，启动后端 | 后端运行在 8080 端口 |
| 2 | 编译 MCP Server（`npm run build`） | 编译成功 |
| 3 | 在 Kiro 中配置 MCP Server | 连接成功 |
| 4 | 调用 get_auth_status | 返回"未登录" |
| 5 | curl 调用 /auth/login | 获取 pollCode |
| 6 | curl 调用 /auth/callback 模拟回调 | 返回"授权成功" |
| 7 | curl 调用 /auth/poll | 获取 JWT Token |
| 8 | 用 Node.js 脚本写入 token.json | Token 缓存成功 |
| 9 | 调用 get_auth_status | 返回"已登录" |
| 10 | 调用 get_available_apis | 返回 5 个接口 |
| 11 | 调用 logout | 返回"已登出" |
| 12 | 调用 logout（重复） | 返回"当前未登录" |

### 真实钉钉模式

| 步骤 | 操作 | 预期结果 |
|------|------|---------|
| 1 | 创建钉钉应用，获取 Client ID/Secret | 应用创建成功 |
| 2 | 配置回调地址 `http://localhost:8080` | 配置成功 |
| 3 | 配置 `mock-enabled: false`，填入真实配置 | 配置完成 |
| 4 | 启动后端 | 后端运行在 8080 端口 |
| 5 | 编译 MCP Server（`npm run build`） | 编译成功 |
| 6 | 调用 get_auth_status | 返回"未登录" |
| 7 | 调用 login | 打开浏览器显示钉钉扫码页 |
| 8 | 钉钉 App 扫码授权 | 浏览器显示"授权成功" |
| 9 | 等待 MCP Server 轮询完成 | 返回"登录成功" |
| 10 | 调用 get_auth_status | 返回"已登录" |
| 11 | 调用 get_available_apis | 返回 2 个公共接口 |
| 12 | 调用 logout | 返回"已登出" |

---

## 附录：Mock 模式快捷测试脚本

如果不想手动一步步 curl，可以用这个 Node.js 脚本一键完成 Mock 模式的登录：

```bash
node -e "
async function main() {
  const login = await (await fetch('http://localhost:8080/auth/login')).json();
  const pollCode = login.data.pollCode;
  console.log('pollCode:', pollCode);

  await fetch('http://localhost:8080/auth/callback?authCode=mock&state=' + pollCode);
  console.log('callback done');

  const poll = await (await fetch('http://localhost:8080/auth/poll?code=' + pollCode)).json();
  const token = poll.data.token;
  console.log('token:', token.substring(0, 30) + '...');

  const fs = require('fs'), path = require('path'), os = require('os');
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  const expiresAt = new Date(payload.exp * 1000).toISOString();
  const dir = path.join(os.homedir(), '.giikin-mcp');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'token.json'), JSON.stringify({ token, expiresAt }, null, 2));
  console.log('token saved to ~/.giikin-mcp/token.json');
}
main().catch(console.error);
"
```

运行后 MCP Server 的 `get_auth_status` 就会返回"已登录"。
