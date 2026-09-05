import { NextRequest, NextResponse } from "next/server";
import {
  callLegacyH5,
  getLegacyUidFromRequest,
  legacyCreateTimeToIso,
  legacyStatusCodeToName,
} from "@/lib/server/mercari-auction-legacy";

export const dynamic = "force-dynamic";

interface LegacyBidRow {
  id: number;
  goods_no: string;
  goods_url: string;
  goods_name: string;
  max_bid_jpy: number;
  current_price_jpy: number | null;
  deposit_hold_cny: number;
  status: number;
  status_txt: string;
  end_time_text: string | null;
  create_time: number;
}

interface LegacyBidsListData {
  list: LegacyBidRow[];
  totalPages: number;
}

// GET /api/mercari-auction/bids?status=&page=
// 代理老后台 POST api/mercari/h5bids，字段映射到页面既有的 MercariAuctionBidListItem 形状
// （item_id/item_url/item_title/created_at 等命名与老后台 goods_no/goods_url/goods_name/create_time 不同源，这里转一层）。
export async function GET(request: NextRequest) {
  const uid = await getLegacyUidFromRequest(request);
  if (!uid) {
    return NextResponse.json({ message: "NO_LEGACY_UID" }, { status: 409 });
  }

  const status = request.nextUrl.searchParams.get("status") || "";
  const page = request.nextUrl.searchParams.get("page") || "1";
  const result = await callLegacyH5<LegacyBidsListData>("h5bids", uid, { status, page });
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
  if (result.body.code !== 0) {
    return NextResponse.json({ message: result.body.errmsg }, { status: 502 });
  }

  const data = result.body.data;
  return NextResponse.json({
    list: (data?.list ?? []).map((row) => ({
      id: String(row.id),
      item_id: row.goods_no,
      item_title: row.goods_name || null,
      item_url: row.goods_url,
      max_bid_jpy: row.max_bid_jpy,
      current_price_jpy: row.current_price_jpy,
      status: legacyStatusCodeToName(row.status),
      status_txt: row.status_txt,
      end_time_text: row.end_time_text,
      deposit_hold_cny: row.deposit_hold_cny,
      created_at: legacyCreateTimeToIso(row.create_time),
    })),
    totalPages: data?.totalPages ?? 0,
  });
}
