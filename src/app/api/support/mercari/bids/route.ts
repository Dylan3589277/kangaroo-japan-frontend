import { unstable_rethrow } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

import { parseRequestJsonObject } from "@/lib/request-json";

// 客服 H5「我的竞拍」煤炉委托竞拍列表透传路由。前端不持有任何密钥，原样转发到老后台
// PHP h5bids，老后台自行校验 user_id/ts/sig。
const LEGACY_API_BASE_URL =
  process.env.LEGACY_API_BASE_URL || "https://app.kangaroo-japan.com";
const LEGACY_PATH = "/api/mercari/h5bids";
const REQUEST_TIMEOUT_MS = 8_000;

function busyResponse() {
  return NextResponse.json({ code: 1, errmsg: "系统繁忙，请稍后重试" });
}

export async function POST(request: NextRequest) {
  const parsed = await parseRequestJsonObject(request);
  if (!parsed.ok) {
    return NextResponse.json({ code: 1, errmsg: "请求参数错误" }, { status: 400 });
  }

  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined || value === null) continue;
    form.set(key, String(value));
  }

  const timeoutController = new AbortController();
  const timeoutTimer = setTimeout(
    () => timeoutController.abort(),
    REQUEST_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(`${LEGACY_API_BASE_URL}${LEGACY_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
      signal: timeoutController.signal,
    });
  } catch (error) {
    unstable_rethrow(error);
    return busyResponse();
  } finally {
    clearTimeout(timeoutTimer);
  }

  if (!response.ok) {
    return busyResponse();
  }

  const payload = await response.json().catch(() => null);
  if (!payload) {
    return busyResponse();
  }

  return NextResponse.json(payload);
}
