import { NextRequest, NextResponse } from "next/server";

const SUPPORT_API_BASE_URL =
  process.env.SUPPORT_API_BASE_URL || "https://kangaroo-japan-backend.vercel.app/api/v1";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${SUPPORT_API_BASE_URL}/support/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": request.headers.get("accept-language") || "zh",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? { code: response.status }, { status: response.status });
  } catch {
    return NextResponse.json(
      { code: "SUPPORT_PROXY_ERROR", message: "Support service is temporarily unavailable" },
      { status: 502 }
    );
  }
}
