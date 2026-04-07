import fs from "node:fs";
import path from "node:path";
import os from "node:os";

interface TokenCache {
  token: string;
  expiresAt: string;
}

class TokenManager {
  private tokenPath: string;

  constructor(tokenDir?: string) {
    const dir = tokenDir ?? path.join(os.homedir(), ".internal-api-mcp");
    this.tokenPath = path.join(dir, "token.json");
  }

  /**
   * 读取缓存的 Token，无效或过期返回 null
   */
  getToken(): string | null {
    try {
      const content = fs.readFileSync(this.tokenPath, "utf-8");
      const cache: TokenCache = JSON.parse(content);

      if (!cache.token || !cache.expiresAt) {
        return null;
      }

      const expiresAt = new Date(cache.expiresAt);
      if (isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        return null;
      }

      return cache.token;
    } catch {
      return null;
    }
  }

  /**
   * 检查 Token 是否存在且未过期
   */
  isTokenValid(): boolean {
    return this.getToken() !== null;
  }

  /**
   * 保存 Token 到本地文件，自动解码 JWT 获取过期时间
   */
  saveToken(token: string): void {
    const payload = this.decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== "number") {
      throw new Error("无效的 JWT Token：无法解析 exp 字段");
    }

    const expiresAt = new Date(payload.exp * 1000).toISOString();
    const cache: TokenCache = { token, expiresAt };

    const dir = path.dirname(this.tokenPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.tokenPath, JSON.stringify(cache, null, 2), "utf-8");
  }

  /**
   * 删除 Token 缓存文件，文件不存在时不抛异常
   */
  clearToken(): void {
    try {
      fs.unlinkSync(this.tokenPath);
    } catch {
      // 文件不存在时忽略
    }
  }

  /**
   * 检查 token.json 文件是否存在（用于 logout 判断）
   */
  hasTokenFile(): boolean {
    return fs.existsSync(this.tokenPath);
  }

  /**
   * 解码 JWT payload（base64url），不验证签名
   */
  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      // base64url → base64
      let base64 = parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      // 补齐 padding
      const pad = base64.length % 4;
      if (pad) {
        base64 += "=".repeat(4 - pad);
      }

      const json = Buffer.from(base64, "base64").toString("utf-8");
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

const tokenManager = new TokenManager();
export default tokenManager;
export { TokenManager };
