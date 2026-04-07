import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import tokenManager from "../services/token-manager.js";
import authClient from "../services/auth-client.js";
import { openBrowser } from "../utils/browser.js";

/**
 * 构造 MCP Tool 成功返回结果
 */
function success(message: string, data?: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ success: true, message, ...(data !== undefined ? { data } : {}) }),
      },
    ],
  };
}

/**
 * 构造 MCP Tool 错误返回结果
 */
function error(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ success: false, message }),
      },
    ],
    isError: true,
  };
}

/**
 * 注册认证相关 Tools：login、get_auth_status、logout
 */
export function registerAuthTools(server: McpServer): void {
  // login tool
  server.tool(
    "login",
    "发起钉钉扫码登录，自动打开浏览器完成授权。使用流程：先调用 get_auth_status 检查状态，未登录再调用此工具",
    {},
    async () => {
      try {
        // 1. 检查 Token 缓存是否有效
        if (tokenManager.isTokenValid()) {
          return success("已登录，无需重复登录");
        }

        // 2. 调用后端获取授权链接和轮询码
        const { authUrl, pollCode } = await authClient.login();

        // 3. 打开浏览器
        const opened = await openBrowser(authUrl);

        // 4. 轮询等待用户授权（无论浏览器是否打开成功都要轮询）
        const token = await authClient.pollForToken(pollCode);

        // 5. 保存 Token
        tokenManager.saveToken(token);

        if (!opened) {
          return success(`登录成功（浏览器未能自动打开，授权链接：${authUrl}）`);
        }

        return success("登录成功");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "登录失败，请重试";
        return error(message);
      }
    },
  );

  // get_auth_status tool
  server.tool(
    "get_auth_status",
    "检查当前登录状态",
    {},
    async () => {
      if (tokenManager.isTokenValid()) {
        return success("已登录");
      }
      return success("未登录");
    },
  );

  // logout tool
  server.tool(
    "logout",
    "登出，清除本地缓存的 Token",
    {},
    async () => {
      if (!tokenManager.hasTokenFile()) {
        return success("当前未登录");
      }
      tokenManager.clearToken();
      return success("已登出");
    },
  );
}
