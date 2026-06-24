/**
 * 駿河屋 (Surugaya / suruga-ya.jp) API helpers.
 *
 * 后端 list 端点：  GET /api/v1/integrations/surugaya/list?keyword=&page=
 * 后端 detail 端点：GET /api/v1/integrations/surugaya/detail?id=<id>
 * 后端 quote 端点： GET /api/v1/proxy-buy/quote?platform=surugaya&goodsNo=<id>&tcg=true|false
 *   （surugaya 详情/报价均走平台无关的 integrations / proxy-buy 通道，不像 rakuma 有专用控制器。）
 *
 * 駿河屋核心特征：大多数商品同时有 **新品(直販)** 与 **中古** 两个价格。后端统一商品
 * schema（MarketplaceItem）上以可选字段透传：
 *   - 列表行：price_new / price_used / price_used_max（JPY 整数，无该状态价则缺省）
 *   - 详情：  price_new_jpy / price_used_jpy / price_used_max_jpy
 * 买价 price(列表) / price_jpy(详情) = 有新品取新品、否则取中古（低端）。
 *
 * 镜像 rakuma.ts；仅平台 code、端点与新品/中古双价字段不同。金额一律 JPY 整数。
 */

import { api } from "@/lib/api";

/** 后端 integrations 统一商品结构（detail 端点返回）。 */
export interface MarketplaceItem {
  id: string;
  title: string;
  /** 买价（JPY 整数）：有新品取新品价，否则取中古价。 */
  price_jpy: number;
  /** 单品美元价（不含手续费）；汇率不可用时后端不返回。 */
  price_usd?: number;
  /** 新品/直販 价（JPY 整数）；该商品无新品价时缺省。 */
  price_new_jpy?: number;
  /** 中古 价（JPY 整数，区间则为低端）；无中古价时缺省。 */
  price_used_jpy?: number;
  /** 中古价区间「￥a ～ ￥b」的高端；单一中古价时缺省。 */
  price_used_max_jpy?: number;
  status: string;
  images: string[];
  /** 后端返回的日文商品描述（后端补上后自动显示）。 */
  description?: string;
  /** Azure 翻译后的描述（additive，可选）。 */
  descriptionTranslated?: string;
  seller?: {
    id?: string;
    name: string;
    avatar_url?: string;
    rating?: number;
    rating_total?: number | null;
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

/** Surugaya quote 响应（与 RakumaQuote 结构对齐；走通用 proxy-buy/quote）。 */
export interface SurugayaQuote {
  priceJpy: number;
  feeJpy: number;
  amountJpy: number;
  amountRmb?: number;
  amountUsd?: number;
  priceUsd?: number;
}

/**
 * 拉 Surugaya 商品详情。
 * 经 /api/backend 代理 → 后端 GET /api/v1/integrations/surugaya/detail?id=...
 */
export async function getSurugayaDetail(id: string) {
  return api.request<MarketplaceItem>(
    `/integrations/surugaya/detail?id=${encodeURIComponent(id)}`,
  );
}

/**
 * 拉 Surugaya 报价（手续费 + 汇率换算）。走平台无关的 /proxy-buy/quote。
 * opts.tcg=true 仅 en（TCG）页面传：返回 amountUsd/priceUsd；
 * zh 经典页不传（默认）：走旧端 surugaya-quote（暂未在阿里云开通 → 报价失败友好降级，
 * 建单时后端权威重算，绝不静默错价）。
 */
export async function getSurugayaQuote(
  goodsNo: string,
  opts?: { tcg?: boolean },
) {
  const tcgQuery = opts?.tcg ? "&tcg=true" : "";
  return api.request<SurugayaQuote>(
    `/proxy-buy/quote?platform=surugaya&goodsNo=${encodeURIComponent(
      goodsNo,
    )}${tcgQuery}`,
  );
}

/** Surugaya 搜索列表卡片（与 Rakuma/Mercari 同形，便于复用列表样式 + 双价）。 */
export interface SurugayaCardItem {
  /** 商品 shinaban（数字或字母数字如 GN539361）；用于跳转 /[lang]/surugaya/[id]。 */
  goodsNo: string;
  title: string;
  imageUrl?: string;
  /** 买价（JPY 整数）：有新品取新品、否则取中古。 */
  priceJpy?: number;
  /** 单品美元估算（后端 price_usd，汇率不可用时缺省）。 */
  priceUsd?: number;
  /** 新品/直販 价（JPY 整数），无则缺省。 */
  priceNewJpy?: number;
  /** 中古 价（JPY 整数，区间低端），无则缺省。 */
  priceUsedJpy?: number;
  /** 中古价区间高端，单一中古价时缺省。 */
  priceUsedMaxJpy?: number;
  sellerName?: string;
  soldOut: boolean;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function firstString(record: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function firstNumber(record: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replaceAll(",", ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function normalizeSurugayaItem(value: unknown): SurugayaCardItem | null {
  const record = asRecord(value);
  const goodsNo = firstString(record, ["goods_no", "goodsNo", "id"]);
  const title = firstString(record, ["goods_name", "goodsName", "title", "name"]);
  if (!goodsNo || !title) return null;
  const status = firstString(record, ["status"]);
  return {
    goodsNo,
    title,
    imageUrl: firstString(record, [
      "cover",
      "cover_image",
      "coverImage",
      "image",
      "imageUrl",
      "thumbnail",
    ]),
    priceJpy: firstNumber(record, ["price", "priceJpy", "price_jpy"]),
    priceUsd: firstNumber(record, ["price_usd", "priceUsd"]),
    priceNewJpy: firstNumber(record, ["price_new", "price_new_jpy", "priceNewJpy"]),
    priceUsedJpy: firstNumber(record, [
      "price_used",
      "price_used_jpy",
      "priceUsedJpy",
    ]),
    priceUsedMaxJpy: firstNumber(record, [
      "price_used_max",
      "price_used_max_jpy",
      "priceUsedMaxJpy",
    ]),
    sellerName: firstString(record, ["seller_name", "sellerName", "seller"]),
    soldOut: status === "sold_out",
  };
}

function extractGoodsList(payload: unknown): unknown[] {
  const root = asRecord(payload);
  const candidates = [root, asRecord(root.data)];
  for (const record of candidates) {
    if (Array.isArray(record.goodsList)) return record.goodsList as unknown[];
  }
  return [];
}

export interface SearchSurugayaResult {
  items: SurugayaCardItem[];
  totalPages: number;
}

/**
 * 拉 Surugaya 在售搜索列表并归一成 SurugayaCardItem[]。
 * 经 /api/backend 代理 → 后端 GET /api/v1/integrations/surugaya/list?keyword=&page=
 * （后端实时抓 suruga-ya.jp 公开搜索 SSR 页，短缓存、限频、熔断；不落库）。
 * 失败/无数据 → { items: [], totalPages: 0 }（调用方友好兜底，不抛错）。
 */
export async function searchSurugaya(
  keyword: string,
  page = 1,
): Promise<SearchSurugayaResult> {
  const trimmed = (keyword || "").trim();
  if (!trimmed) return { items: [], totalPages: 0 };
  try {
    const res = await api.request(
      `/integrations/surugaya/list?keyword=${encodeURIComponent(
        trimmed,
      )}&page=${page}`,
    );
    if (!res.success || !res.data) return { items: [], totalPages: 0 };
    const data = asRecord(res.data);
    const items = extractGoodsList(res.data)
      .map(normalizeSurugayaItem)
      .filter((item): item is SurugayaCardItem => item !== null);
    const totalPages = firstNumber(data, ["totalPages"]) ?? 0;
    return { items, totalPages };
  } catch {
    return { items: [], totalPages: 0 };
  }
}
