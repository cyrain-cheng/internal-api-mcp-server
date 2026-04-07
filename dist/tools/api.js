import { z } from "zod";
import tokenManager from "../services/token-manager.js";
import authClient, { UnauthorizedError } from "../services/auth-client.js";
/**
 * 构造 MCP Tool 成功返回结果
 */
function success(message, data) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({ success: true, message, ...(data !== undefined ? { data } : {}) }),
            },
        ],
    };
}
/**
 * 构造 MCP Tool 错误返回结果
 */
function error(message) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({ success: false, message }),
            },
        ],
        isError: true,
    };
}
/**
 * 注册接口相关 Tools：get_available_apis、call_api
 */
export function registerApiTools(server) {
    // get_available_apis tool
    server.tool("get_available_apis", "获取当前用户有权限的接口文档列表。需要先登录（调用 login），返回的接口列表包含 url、method、参数说明，可用于 call_api 调用或指导编码", {}, async () => {
        try {
            const token = tokenManager.getToken();
            if (!token) {
                return error("未登录，请先调用 login 工具");
            }
            const apis = await authClient.getApis(token);
            return success("获取接口列表成功", apis);
        }
        catch (err) {
            if (err instanceof UnauthorizedError) {
                tokenManager.clearToken();
                return error("Token 已失效，请重新调用 login 工具");
            }
            const message = err instanceof Error ? err.message : "获取接口列表失败，请重试";
            return error(message);
        }
    });
    // call_api tool
    server.tool("call_api", "代理调用内部业务接口，自动携带认证 Token。需要先登录（调用 login）。GET 请求参数拼接为查询字符串，POST/PUT/DELETE 参数作为 JSON body", {
        url: z.string().describe("接口路径，如 /ad/campaign/list"),
        method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET").describe("HTTP 方法"),
        params: z.record(z.string(), z.any()).optional().describe("请求参数"),
    }, async ({ url, method, params }) => {
        try {
            const token = tokenManager.getToken();
            if (!token) {
                return error("未登录，请先调用 login 工具");
            }
            const result = await authClient.callApi(url, method, params, token);
            return success("接口调用成功", result);
        }
        catch (err) {
            if (err instanceof UnauthorizedError) {
                tokenManager.clearToken();
                return error("Token 已失效，请重新调用 login 工具");
            }
            const message = err instanceof Error ? err.message : "接口调用失败，请重试";
            return error(message);
        }
    });
}
