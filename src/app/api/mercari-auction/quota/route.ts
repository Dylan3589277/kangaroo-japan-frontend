import { NextRequest, NextResponse } from "next/server";
import {
  callLegacyH5,
  getLegacyUidFromRequest,
} from "@/lib/server/mercari-auction-legacy";

export const dynamic = "force-dynamic";

// GET /api/mercari-auction/quota?maxBidJpy=NNN
// 代理老后台 POST api/mercari/h5quota（服务端签名，客户端不接触密钥）。
export async function GET(request: NextRequest) {
  const uid = await getLegacyUidFromRequest(request);
  if (!uid) {
    return NextResponse.json({ message: "NO_LEGACY_UID" }, { status: 409 });
  }

  const maxBidJpy = request.nextUrl.searchParams.get("maxBidJpy") || "0";
  const result = await callLegacyH5("h5quota", uid, { max_bid_jpy: maxBidJpy });
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
  if (result.body.code !== 0) {
    return NextResponse.json({ message: result.body.errmsg }, { status: 502 });
  }
  return NextResponse.json(result.body.data ?? {});
}
