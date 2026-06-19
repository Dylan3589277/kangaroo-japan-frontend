/**
 * Yahoofrima (PayPayフリマ) API helpers.
 *
 * 后端 detail 端点：GET /api/v1/integrations/yahoofrima/detail?id=<id>
 * 后端 quote 端点：GET /api/v1/yahoofrima/quote?goodsNo=<id>&tcg=true|false
 *
 * 返回结构 MarketplaceItem = 后端 integrations 统一 schema（与 Rakuma 共用）：
 *   id, title, price_jpy, price_usd?, status, images[], seller?, shipping?,
 *   additional_services?, source_url
 *
 * 注意：description 字段后端暂未返回（前端字段缺口，需后端补）。
 */

import { api } from "@/lib/api";

/** 后端 integrations 统一商品结构（detail 端点返回）。
 *  description 字段后端目前未返回——前端侧先用 additional_services 兜底展示附加服务信息。 */
export interface MarketplaceItem {
  id: string;
  title: string;
  price_jpy: number;
  /** 单品美元价（不含手续费）；汇率不可用时后端不返回 */
  price_usd?: number;
  status: string;
  images: string[];
  seller?: {
    id?: string;
    name: string;
    avatar_url?: string;
    rating?: number;
  };
  shipping?: {
    domestic_fee?: number;
    method?: string;
  };
  additional_services?: string[];
  source_url?: string;
}

/** Yahoofrima quote 响应（与 MercariQuote 结构对齐） */
export interface YahoofrimaQuote {
  priceJpy: number;
  feeJpy: number;
  amountJpy: number;
  amountRmb?: number;
  amountUsd?: number;
  priceUsd?: number;
}

/**
 * 拉 Yahoofrima 商品详情。
 * 经 /api/backend 代理 → 后端 GET /api/v1/integrations/yahoofrima/detail?id=...
 */
export async function getYahoofrimaDetail(id: string) {
  return api.request<MarketplaceItem>(
    `/integrations/yahoofrima/detail?id=${encodeURIComponent(id)}`,
  );
}

/**
 * 拉 Yahoofrima 报价（手续费 + 汇率换算）。
 * 经 /api/backend 代理 → 后端 GET /api/v1/yahoofrima/quote?goodsNo=...
 * opts.tcg=true 仅 en（TCG）页面传：返回 amountUsd/priceUsd；
 * zh 经典页不传（默认），走旧端动态价，返回 amountRmb。
 */
export async function getYahoofrimaQuote(
  goodsNo: string,
  opts?: { tcg?: boolean },
) {
  const tcgQuery = opts?.tcg ? "&tcg=true" : "";
  return api.request<YahoofrimaQuote>(
    `/yahoofrima/quote?goodsNo=${encodeURIComponent(goodsNo)}${tcgQuery}`,
  );
}
