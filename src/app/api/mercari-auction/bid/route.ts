import { NextRequest, NextResponse } from "next/server";
import {
  callLegacyH5,
  getLegacyUidFromRequest,
  parseGoodsNoFromUrl,
} from "@/lib/server/mercari-auction-legacy";

export const dynamic = "force-dynamic";

// POST /api/mercari-auction/bid  body: { itemUrl, maxBidJpy }
// 代理老后台 POST api/mercari/h5bid（异步模型：只做配额/押金校验后落库 pending_deposit，
// 真正出价由 M4 执行器轮询处理）。🔴本路由会向老后台真实写委托单，禁止在联调/测试中调用。
export async function POST(request: NextRequest) {
  const uid = await getLegacyUidFromRequest(request);
  if (!uid) {
    return NextResponse.json({ message: "NO_LEGACY_UID" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const itemUrl = typeof body?.itemUrl === "string" ? body.itemUrl.trim() : "";
  const maxBidJpy = Number(body?.maxBidJpy);
  if (!itemUrl || !Number.isFinite(maxBidJpy) || maxBidJpy <= 0) {
    return NextResponse.json({ message: "invalid_param" }, { status: 400 });
  }

  const goodsNo = parseGoodsNoFromUrl(itemUrl);
  if (!goodsNo) {
    return NextResponse.json(
      { errcode: "invalid_item_url", errmsg: "无法识别的商品链接" },
      { status: 200 },
    );
  }

  const result = await callLegacyH5("h5bid", uid, {
    goods_no: goodsNo,
    max_bid_jpy: maxBidJpy,
    goods_url: itemUrl,
    goods_name: "",
  });
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  // 软失败：h5bid 失败时 body 形如 {code:1,errmsg,errcode}，与页面
  // MercariAuctionBidSubmitFailure（errmsg/code）字段基本对齐，直接透传。
  if (result.body.code !== 0) {
    return NextResponse.json({
      errmsg: result.body.errmsg,
      code: result.body.errcode,
    });
  }

  const data = result.body.data as { id?: number } | undefined;
  return NextResponse.json({
    bidId: String(data?.id ?? ""),
    status: "pending_deposit",
    depositHoldCny: 0,
    requiredCny: 0,
  });
}
