import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

// 客服 H5 欢迎语活动 teaser 只读代理（P0-1c，2026-08-06，活动内容配置化）。
// bridge 侧 /v1/customer-service/welcome 无需鉴权（内容本就是对客公开的营销信息），
// 这里只做一层同源转发——HERMES_BRIDGE_URL 是服务端 env，浏览器不可见/不可达，
// 前端必须经本路由才能拿到 teaser。短超时 + 任何失败都返回非 2xx，前端按既有
// fail-safe 约定回落纯文本欢迎语，不影响正常聊天（架构与 buildBridgeUrl 同款，
// 见 ../chat/route.ts）。
const HERMES_BRIDGE_URL =
  process.env.HERMES_BRIDGE_URL || process.env.CUSTOMER_SERVICE_BRIDGE_URL || "";
const WELCOME_PROXY_TIMEOUT_MS = 2500;

export const dynamic = "force-dynamic";

function buildWelcomeUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  const prefix = url.pathname.replace(/\/+$/, "");
  url.pathname = `${prefix}/v1/customer-service/welcome`;
  url.search = "";
  return url;
}

export async function GET() {
  if (!HERMES_BRIDGE_URL) {
    return NextResponse.json({ error: "bridge_unconfigured" }, { status: 502 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WELCOME_PROXY_TIMEOUT_MS);
  try {
    const response = await fetch(buildWelcomeUrl(HERMES_BRIDGE_URL), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      return NextResponse.json(
        { error: "bridge_welcome_unavailable" },
        { status: 502 },
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    unstable_rethrow(error);
    return NextResponse.json(
      { error: "bridge_welcome_unreachable" },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
