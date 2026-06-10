import { unstable_rethrow } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

import { parseRequestJsonObject } from "@/lib/request-json";

const SUPPORT_API_BASE_URL =
  process.env.SUPPORT_API_BASE_URL ||
  "https://kangaroo-japan-backend.vercel.app/api/v1";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const upstreamUrl = new URL(
      `${SUPPORT_API_BASE_URL}/support/conversations/${encodeURIComponent(
        id,
      )}/messages`,
    );
    request.nextUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        "Accept-Language": request.headers.get("accept-language") || "zh",
      },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { code: response.status }, {
      status: response.status,
    });
  } catch (error) {
    unstable_rethrow(error);

    return NextResponse.json(
      {
        code: "SUPPORT_PROXY_ERROR",
        message: "Support message polling is temporarily unavailable",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const parsedBody = await parseRequestJsonObject(request);

    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid request body" } },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${SUPPORT_API_BASE_URL}/support/conversations/${encodeURIComponent(
        id,
      )}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": request.headers.get("accept-language") || "zh",
        },
        body: JSON.stringify(parsedBody.data),
        cache: "no-store",
      },
    );
    const data = await response.json().catch(() => null);
    return NextResponse.json(data ?? { code: response.status }, {
      status: response.status,
    });
  } catch (error) {
    unstable_rethrow(error);

    return NextResponse.json(
      {
        code: "SUPPORT_PROXY_ERROR",
        message: "Support message send is temporarily unavailable",
      },
      { status: 502 },
    );
  }
}
