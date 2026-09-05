import { NextRequest, NextResponse } from "next/server";
import {
  callLegacyH5,
  getLegacyUidFromRequest,
} from "@/lib/server/mercari-auction-legacy";

export const dynamic = "force-dynamic";

// POST /api/mercari-auction/bid/{id}/cancel
// 代理老后台 POST api/mercari/h5cancel。
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const uid = await getLegacyUidFromRequest(request);
  if (!uid) {
    return NextResponse.json({ message: "NO_LEGACY_UID" }, { status: 409 });
  }

  const { id } = await params;
  const result = await callLegacyH5("h5cancel", uid, { id });
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  if (result.body.code !== 0) {
    return NextResponse.json({ errmsg: result.body.errmsg });
  }

  const data = result.body.data as { depositReleased?: boolean } | undefined;
  return NextResponse.json({ depositReleased: Boolean(data?.depositReleased) });
}
