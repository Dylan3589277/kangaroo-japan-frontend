/**
 * 服务端读老后台「审核模式」开关（`GET /api/config/reviewmode`），供
 * `src/app/api/support/chat/route.ts` 判断本轮是否要屏蔽竞拍相关内容。
 *
 * 与 `src/app/[lang]/support/h5/review-mode.ts`（客户端 hook，走同源转发路由
 * `/api/support/review-mode`）是同一个老后台开关的两种消费方式：那边给页面渲染用，
 * 这里给 chat route 的服务端逻辑用，各自独立请求、互不依赖。
 *
 * 任何失败（超时/非 2xx/字段不合规）一律 fail-open 回 false（不藏），避免把
 * 客服聊天弄挂。内存缓存 60 秒，减少对老后台的请求频率。
 */

const LEGACY_API_BASE_URL =
  process.env.LEGACY_API_BASE_URL || "https://app.kangaroo-japan.com";
const LEGACY_PATH = "/api/config/reviewmode";
const REQUEST_TIMEOUT_MS = 3_000;
const CACHE_TTL_MS = 60_000;

let cachedValue = false;
let cachedAt = 0;

/** 取审核模式开关；60 秒内复用上次结果，失败一律返回 false。 */
export async function getReviewMode(): Promise<boolean> {
  const now = Date.now();
  if (now - cachedAt < CACHE_TTL_MS) {
    return cachedValue;
  }

  try {
    const res = await fetch(`${LEGACY_API_BASE_URL}${LEGACY_PATH}`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      cachedValue = false;
      cachedAt = now;
      return cachedValue;
    }

    const payload = await res.json().catch(() => null);
    const root =
      payload !== null && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    const data =
      root.data !== null && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : {};

    cachedValue = data.review_mode === true;
    cachedAt = now;
    return cachedValue;
  } catch {
    cachedValue = false;
    cachedAt = now;
    return cachedValue;
  }
}
