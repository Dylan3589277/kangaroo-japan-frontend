import { unstable_rethrow } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

import { parseRequestJsonObject } from "@/lib/request-json";

// 留言中心（给日本卖家砍价/咨询留言）BFF 中继：H5 页 → 本路由 → 现代后端 visitor 端点。
// 身份 = user_id + ts + sig 三件套（无 JWT/登录态），从请求体原样透传给后端，由后端验签。
// 后端 base：优先 BACKEND_API_BASE_URL，其次沿用现有 support 路由的
// SUPPORT_API_BASE_URL 约定（默认值已含 /api/v1，见 chat/tickets 路由同款写法）。
const RAW_BACKEND_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  process.env.SUPPORT_API_BASE_URL ||
  "https://kangaroo-japan-backend.vercel.app/api/v1";

// 中继铁律：10s 硬超时（AbortController），慢后端不拖死 H5。
const RELAY_TIMEOUT_MS = 10_000;

export const dynamic = "force-dynamic";

type VisitorAction = "leave-message" | "list" | "detail";

// action → 后端 visitor 端点路径 + 出错时给买家看的友好话术（绝不透传后端原始报错）。
const ACTIONS: Record<
  VisitorAction,
  { backendPath: string; friendlyError: string }
> = {
  "leave-message": {
    backendPath: "seller-messages/visitor/leave-message",
    friendlyError: "留言提交失败了，请稍后重试～",
  },
  list: {
    backendPath: "seller-messages/visitor/list",
    friendlyError: "留言列表加载失败了，请点击刷新重试～",
  },
  detail: {
    backendPath: "seller-messages/visitor/detail",
    friendlyError: "留言详情加载失败了，请稍后重试～",
  },
};

// 各 action 允许透传给后端的业务字段白名单（user_id/ts/sig 三件套单独必检、原样透传）。
// 白名单外的字段一律丢弃，避免把 H5 侧杂字段中继进后端。
const ACTION_FIELDS: Record<VisitorAction, string[]> = {
  "leave-message": [
    "platform",
    "goods_no",
    "type",
    "targetPriceJpy",
    "listingPriceJpy",
    "customerRequestZh",
    "presetTemplateId",
  ],
  list: ["page"],
  detail: ["id"],
};

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isVisitorAction(value: unknown): value is VisitorAction {
  return value === "leave-message" || value === "list" || value === "detail";
}

// 后端 base 归一化：SUPPORT_API_BASE_URL 约定 base 已含 /api/v1（chat/tickets 同款），
// 若配置的是裸 origin（BACKEND_API_BASE_URL 可能只配到域名）则补上 /api/v1。
function buildBackendUrl(backendPath: string) {
  const base = RAW_BACKEND_BASE_URL.replace(/\/+$/, "");
  const prefix = base.endsWith("/api/v1") ? base : `${base}/api/v1`;
  return `${prefix}/${backendPath}`;
}

function friendlyErrorResponse(errmsg: string) {
  // 业务失败统一 HTTP 200 + {code:1, errmsg}：页面只看 code，不用解析 HTTP 错误页。
  return NextResponse.json({ code: 1, errmsg });
}

export async function POST(request: NextRequest) {
  let action: VisitorAction = "list";

  try {
    const parsedBody = await parseRequestJsonObject(request);

    if (!parsedBody.ok) {
      return friendlyErrorResponse("请求格式不对，请返回重试～");
    }

    const body = parsedBody.data;

    if (!isVisitorAction(body.action)) {
      return friendlyErrorResponse("请求格式不对，请返回重试～");
    }
    action = body.action;

    // 身份三件套必须齐（uid+ts+sig，无 JWT）。缺了直接友好拒绝，不打后端。
    const userId = getString(body.user_id);
    const ts = getString(body.ts);
    const sig = getString(body.sig);
    if (!userId || !ts || !sig) {
      return friendlyErrorResponse("身份信息缺失，请从袋鼠君小程序重新进入～");
    }

    // 按白名单收集业务字段 + 三件套原样透传（verbatim，不改写不补签）。
    const backendBody: Record<string, unknown> = {
      user_id: userId,
      ts,
      sig,
    };
    for (const field of ACTION_FIELDS[action]) {
      if (body[field] !== undefined && body[field] !== null) {
        backendBody[field] = body[field];
      }
    }

    const timeoutController = new AbortController();
    const timeoutTimer = setTimeout(
      () => timeoutController.abort(),
      RELAY_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await fetch(buildBackendUrl(ACTIONS[action].backendPath), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendBody),
        cache: "no-store",
        signal: timeoutController.signal,
      });
    } catch (error) {
      unstable_rethrow(error);
      // 超时 / 网络不通：统一友好话术，不透传底层错误。
      return friendlyErrorResponse(ACTIONS[action].friendlyError);
    } finally {
      clearTimeout(timeoutTimer);
    }

    const payload: unknown = await response.json().catch(() => null);
    const payloadRecord =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : null;

    // 非 2xx 或后端 code!==0 → 一律友好失败，绝不把后端原始 errmsg/堆栈漏给买家。
    if (!response.ok || !payloadRecord || payloadRecord.code !== 0) {
      return friendlyErrorResponse(ACTIONS[action].friendlyError);
    }

    return NextResponse.json({ code: 0, data: payloadRecord.data ?? null });
  } catch (error) {
    unstable_rethrow(error);

    return friendlyErrorResponse(ACTIONS[action].friendlyError);
  }
}
