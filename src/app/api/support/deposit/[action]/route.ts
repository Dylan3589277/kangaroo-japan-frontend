import { unstable_rethrow } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

import { parseRequestJsonObject } from "@/lib/request-json";

// 客服 H5「我的竞拍 → 押金」透传路由。前端不持有任何密钥，各 action 原样转发
// 到老后台 PHP，老后台自行校验 user_id/ts/sig。与 src/app/api/support/yahoo/[action]/route.ts
// 同一套模式。
const LEGACY_API_BASE_URL =
  process.env.LEGACY_API_BASE_URL || "https://app.kangaroo-japan.com";
const REQUEST_TIMEOUT_MS = 8_000;

const ACTION_TO_LEGACY_PATH: Record<string, string> = {
  balance: "/api/yahoo/h5deposit",
  records: "/api/yahoo/h5depositrecords",
  refund: "/api/yahoo/h5depositrefund",
};

function busyResponse() {
  return NextResponse.json({ code: 1, msg: "系统繁忙，请稍后重试" });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const legacyPath = ACTION_TO_LEGACY_PATH[action];
  if (!legacyPath) {
    return NextResponse.json({ code: 1, msg: "not found" }, { status: 404 });
  }

  const parsed = await parseRequestJsonObject(request);
  if (!parsed.ok) {
    return NextResponse.json({ code: 1, msg: "请求参数错误" }, { status: 400 });
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
    response = await fetch(`${LEGACY_API_BASE_URL}${legacyPath}`, {
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
