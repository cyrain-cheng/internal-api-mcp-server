import open from "open";
/**
 * 使用系统默认浏览器打开指定 URL
 * @param url 要打开的 URL 地址
 * @returns 成功返回 true，失败返回 false（捕获异常不抛出）
 */
export async function openBrowser(url) {
    try {
        await open(url);
        return true;
    }
    catch {
        return false;
    }
}
