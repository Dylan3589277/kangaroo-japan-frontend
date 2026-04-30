import { unstable_rethrow } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

import { parseRequestJsonObject } from "@/lib/request-json";

const SUPPORT_API_BASE_URL =
  process.env.SUPPORT_API_BASE_URL || "https://kangaroo-japan-backend.vercel.app/api/v1";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await parseRequestJsonObject(request);

    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid request body" } },
        { status: 400 }
      );
    }

    const response = await fetch(`${SUPPORT_API_BASE_URL}/support/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": request.headers.get("accept-language") || "zh",
      },
      body: JSON.stringify(parsedBody.data),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? { code: response.status }, { status: response.status });
  } catch (error) {
    unstable_rethrow(error);

    return NextResponse.json(
      { code: "SUPPORT_PROXY_ERROR", message: "Support service is temporarily unavailable" },
      { status: 502 }
    );
  }
}
