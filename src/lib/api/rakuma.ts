/**
 * Rakuma (楽天ラクマ) API helpers.
 *
 * 后端 detail 端点：GET /api/v1/integrations/rakuma/detail?id=<id>
 * 后端 quote 端点：GET /api/v1/rakuma/quote?goodsNo=<id>&tcg=true|false
 *
 * 返回结构 MarketplaceItem = 后端 integrations 统一 schema（与 Yahoofrima 共用）：
 *   id, title, price_jpy, price_usd?, status, images[], seller?, shipping?,
 *   additional_services?, source_url
 *
 * 注意：description 字段后端暂未返回（前端字段缺口，需后端补）。
 */

import { api } from "@/lib/api";

/** 后端 integrations 统一商品结构（detail 端点返回）。 */
export interface MarketplaceItem {
  id: string;
  title: string;
  price_jpy: number;
  /** 单品美元价（不含手续费）；汇率不可用时后端不返回 */
  price_usd?: number;
  status: string;
  images: string[];
  /** 后端返回的日文商品描述（后端补上后自动显示） */
  description?: string;
  /** Azure 翻译后的中文描述（additive，可选） */
  descriptionTranslated?: string;
  seller?: {
    id?: string;
    name: string;
    avatar_url?: string;
    /** 旧字段兼容（部分平台返回单数字评分） */
    rating?: number;
    /** 总评价数；为 null 表示该商品卖家暂无评价数据 */
    rating_total?: number | null;
    /** 好评率（0-100）；为 null 表示暂无 */
    rating_good_ratio?: number | null;
    kyc?: boolean | null;
  };
  shipping?: {
    domestic_fee?: number;
    fee_jpy?: number | null;
    method?: string;
    ship_days_text?: string;
  };
  additional_services?: string[] | { authenticity?: unknown | null };
  source_url?: string;
}

/** Rakuma quote 响应（与 MercariQuote 结构对齐） */
export interface RakumaQuote {
  priceJpy: number;
  feeJpy: number;
  amountJpy: number;
  amountRmb?: number;
  amountUsd?: number;
  priceUsd?: number;
}

/**
 * 拉 Rakuma 商品详情。
 * 经 /api/backend 代理 → 后端 GET /api/v1/integrations/rakuma/detail?id=...
 */
export async function getRakumaDetail(id: string) {
  return api.request<MarketplaceItem>(
    `/integrations/rakuma/detail?id=${encodeURIComponent(id)}`,
  );
}

/**
 * 拉 Rakuma 报价（手续费 + 汇率换算）。
 * 经 /api/backend 代理 → 后端 GET /api/v1/rakuma/quote?goodsNo=...
 * opts.tcg=true 仅 en（TCG）页面传：返回 amountUsd/priceUsd；
 * zh 经典页不传（默认），走旧端动态价，返回 amountRmb。
 */
export async function getRakumaQuote(
  goodsNo: string,
  opts?: { tcg?: boolean },
) {
  const tcgQuery = opts?.tcg ? "&tcg=true" : "";
  return api.request<RakumaQuote>(
    `/rakuma/quote?goodsNo=${encodeURIComponent(goodsNo)}${tcgQuery}`,
  );
}
