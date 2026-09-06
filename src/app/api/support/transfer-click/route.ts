import { NextRequest, NextResponse } from "next/server";

import { parseRequestJsonObject } from "@/lib/request-json";

const HERMES_BRIDGE_URL =
  process.env.HERMES_BRIDGE_URL ||
  process.env.CUSTOMER_SERVICE_BRIDGE_URL ||
  "";
const HERMES_BRIDGE_TOKEN =
  process.env.KANGAROO_AGENT_TOKEN || process.env.HERMES_BRIDGE_TOKEN || "";
const TRANSFER_CLICK_TIMEOUT_MS = 5_000;

function buildBridgeUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  const prefix = url.pathname.replace(/\/+$/, "");
  url.pathname = `${prefix}/v1/customer-service/transfer-click`;
  url.search = "";
  return url;
}

// 转人工按钮点击回传（2026-09-06）：仅用于告警展示"顾客有没有真点过按钮"，打点
// 失败绝不能让顾客卡在跳转上，所以这里任何失败都回 202 而不是抛错/5xx。
export async function POST(request: NextRequest) {
  const parsedBody = await parseRequestJsonObject(request);
  const body = parsedBody.ok ? parsedBody.data : {};
  const userId = typeof body.user_id === "string" ? body.user_id : "";
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "missing_user_id" }, { status: 202 });
  }

  if (!HERMES_BRIDGE_URL || !HERMES_BRIDGE_TOKEN) {
    return NextResponse.json(
      { ok: false, reason: "hermes_bridge_unconfigured" },
      { status: 202 },
    );
  }

  const sessionId = typeof body.session_id === "string" ? body.session_id : undefined;
  const channel = typeof body.channel === "string" ? body.channel : undefined;

  const timeoutController = new AbortController();
  const timeoutTimer = setTimeout(
    () => timeoutController.abort(),
    TRANSFER_CLICK_TIMEOUT_MS,
  );
  try {
    const bridgeUrl = buildBridgeUrl(HERMES_BRIDGE_URL);
    const response = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-kangaroo-agent-token": HERMES_BRIDGE_TOKEN,
      },
      body: JSON.stringify({ user_id: userId, session_id: sessionId, channel }),
      cache: "no-store",
      signal: timeoutController.signal,
    });
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, reason: `hermes_bridge_http_${response.status}` },
        { status: 202 },
      );
    }
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    const reason = timeoutController.signal.aborted
      ? "bridge_timeout"
      : "bridge_unreachable";
    return NextResponse.json({ ok: false, reason }, { status: 202 });
  } finally {
    clearTimeout(timeoutTimer);
  }
}
