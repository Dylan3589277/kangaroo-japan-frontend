import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

// 小程序送审期间，老后台开「审核模式」时客服 H5 需要隐藏一切竞拍相关内容。
// 只读透传老后台配置接口；任何失败都当作 review_mode=false（失败=不藏，别把
// 整个 H5 弄挂）。
const LEGACY_API_BASE_URL =
  process.env.LEGACY_API_BASE_URL || "https://app.kangaroo-japan.com";
const LEGACY_PATH = "/api/config/reviewmode";
const REQUEST_TIMEOUT_MS = 5_000;

function offResponse() {
  return NextResponse.json(
    { review_mode: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const timeoutController = new AbortController();
  const timeoutTimer = setTimeout(
    () => timeoutController.abort(),
    REQUEST_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(`${LEGACY_API_BASE_URL}${LEGACY_PATH}`, {
      method: "GET",
      cache: "no-store",
      signal: timeoutController.signal,
    });
  } catch (error) {
    unstable_rethrow(error);
    return offResponse();
  } finally {
    clearTimeout(timeoutTimer);
  }

  if (!response.ok) {
    return offResponse();
  }

  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return offResponse();
  }

  const root = payload as Record<string, unknown>;
  if (root.code !== 0) {
    return offResponse();
  }

  const data =
    root.data !== null && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : {};

  return NextResponse.json(
    { review_mode: data.review_mode === true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
