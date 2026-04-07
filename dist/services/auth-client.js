/**
 * 自定义错误：未认证（HTTP 401）
 */
export class UnauthorizedError extends Error {
    constructor(message = "Token 已失效，请重新调用 login 工具") {
        super(message);
        this.name = "UnauthorizedError";
    }
}
/**
 * 延迟指定毫秒数
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * HTTP 客户端，封装对 mcp-auth 后端的调用
 */
class AuthClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl ?? process.env.MCP_AUTH_BASE_URL ?? "http://localhost:8080";
    }
    /**
     * 发起登录，获取授权链接和轮询码
     */
    async login() {
        const result = await this.request("/auth/login");
        return result;
    }
    /**
     * 轮询授权状态
     */
    async poll(pollCode) {
        const result = await this.request(`/auth/poll?code=${encodeURIComponent(pollCode)}`);
        return result;
    }
    /**
     * 轮询等待用户授权，返回 Token
     * 每 2 秒轮询一次，最多 150 次（5 分钟）
     */
    async pollForToken(pollCode) {
        const POLL_INTERVAL = 2000;
        const MAX_ATTEMPTS = 150;
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const result = await this.poll(pollCode);
            if (result.status === "authorized" && result.token) {
                return result.token;
            }
            if (result.status === "expired") {
                throw new Error("授权超时，请重新登录");
            }
            await sleep(POLL_INTERVAL);
        }
        throw new Error("授权超时");
    }
    /**
     * 获取当前用户有权限的接口列表
     */
    async getApis(token) {
        const result = await this.request("/api/v1/apis", {
            headers: { Authorization: `Bearer ${token}` },
        });
        return result;
    }
    /**
     * 代理调用内部业务接口
     * @param url 接口路径，如 /ad/campaign/list
     * @param method HTTP 方法：GET / POST / PUT / DELETE
     * @param params 请求参数（GET 拼查询参数，其余作为 JSON body）
     * @param token JWT Token
     */
    async callApi(url, method, params, token) {
        const internalBaseUrl = process.env.INTERNAL_API_BASE_URL;
        if (!internalBaseUrl) {
            throw new Error("未配置内部接口地址（INTERNAL_API_BASE_URL）");
        }
        let fullUrl = `${internalBaseUrl}${url}`;
        const headers = {
            Authorization: `Bearer ${token}`,
        };
        let body;
        const upperMethod = method.toUpperCase();
        if (upperMethod === "GET" && params && Object.keys(params).length > 0) {
            const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
            fullUrl += (fullUrl.includes("?") ? "&" : "?") + query;
        }
        else if (upperMethod !== "GET" && params) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(params);
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        let response;
        try {
            response = await fetch(fullUrl, {
                method: upperMethod,
                headers,
                body,
                signal: controller.signal,
            });
        }
        catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                throw new Error("请求超时，请稍后重试");
            }
            throw new Error("网络错误，无法访问内部接口服务");
        }
        finally {
            clearTimeout(timeout);
        }
        if (response.status === 401) {
            throw new UnauthorizedError();
        }
        const data = await response.json();
        return data;
    }
    /**
     * 通用请求方法：发送 GET 请求并解析 ApiResult 格式响应
     */
    async request(path, options) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        let response;
        try {
            response = await fetch(url, {
                method: "GET",
                headers: options?.headers,
                signal: controller.signal,
            });
        }
        catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                throw new Error("请求超时，请稍后重试");
            }
            throw new Error("无法连接到认证服务，请确认 mcp-auth 服务是否已启动");
        }
        finally {
            clearTimeout(timeout);
        }
        if (response.status === 401) {
            throw new UnauthorizedError();
        }
        const body = (await response.json());
        if (body.code !== 200) {
            throw new Error(body.message || "请求失败");
        }
        return body.data;
    }
}
const authClient = new AuthClient();
export default authClient;
export { AuthClient };
