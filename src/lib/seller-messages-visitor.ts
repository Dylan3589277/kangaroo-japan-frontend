// 留言中心 visitor 端点共用取数逻辑：BFF 路由 (api/support/seller-messages/route.ts)
// 与留言列表页 Server Component (支持 SSR 首屏) 都调用这里，避免两处各写一份
// backend base 拼接 + 超时 + 解析逻辑（曾只在 route.ts 里有，SSR 首屏改造时抽出）。
// 中继铁律：10s 硬超时（AbortController），慢后端不拖死调用方。
const RAW_BACKEND_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  process.env.SUPPORT_API_BASE_URL ||
  "https://kangaroo-japan-backend.vercel.app/api/v1";

const RELAY_TIMEOUT_MS = 10_000;

function buildBackendUrl(backendPath: string) {
  const base = RAW_BACKEND_BASE_URL.replace(/\/+$/, "");
  const prefix = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
  return `${prefix}/${backendPath}`;
}

export type VisitorBackendResult =
  | { ok: true; data: unknown }
  | {
      ok: false;
      status: number | null;
      payloadRecord: Record<string, unknown> | null;
    };

// 打现代后端 visitor 端点：body 需已含 user_id/ts/sig 三件套 + 业务字段。
// 网络/超时错误直接 throw，由调用方（route.ts / SSR 取数函数）各自决定怎么兜底。
export async function callVisitorBackend(
  backendPath: string,
  body: Record<string, unknown>,
): Promise<VisitorBackendResult> {
  const timeoutController = new AbortController();
  const timeoutTimer = setTimeout(
    () => timeoutController.abort(),
    RELAY_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(buildBackendUrl(backendPath), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: timeoutController.signal,
    });
  } finally {
    clearTimeout(timeoutTimer);
  }

  const payload: unknown = await response.json().catch(() => null);
  const payloadRecord =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;

  if (!response.ok || !payloadRecord || payloadRecord.code !== 0) {
    return { ok: false, status: response.status, payloadRecord };
  }

  return { ok: true, data: payloadRecord.data ?? null };
}

export type VisitorListParams = {
  userId: string;
  ts?: string;
  sig?: string;
  page?: number;
  includeHidden?: boolean;
};

export type VisitorListFetchResult =
  | { ok: true; data: unknown }
  | { ok: false; errmsg: string };

// 留言列表取数：SSR 首屏 (page.tsx) 与 BFF 路由 list action 共用同一份逻辑。
// 失败（含网络/超时异常）一律兜底成友好错误，绝不抛给调用方整页崩溃。
export async function fetchSellerMessagesList(
  params: VisitorListParams,
): Promise<VisitorListFetchResult> {
  try {
    const result = await callVisitorBackend("seller-messages/visitor/list", {
      user_id: params.userId,
      ts: params.ts,
      sig: params.sig,
      page: params.page,
      include_hidden: params.includeHidden,
    });
    if (!result.ok) {
      return { ok: false, errmsg: "留言列表加载失败了，请点击刷新重试～" };
    }
    return { ok: true, data: result.data };
  } catch {
    return { ok: false, errmsg: "留言列表加载失败了，请点击刷新重试～" };
  }
}
