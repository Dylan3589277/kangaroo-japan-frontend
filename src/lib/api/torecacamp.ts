/**
 * Torecacamp (トレカキャンプ, torecacamp-pokemon.com) API helpers.
 *
 * 后端 detail 端点：GET /api/v1/integrations/torecacamp/detail?id=<handle>
 * 后端 list   端点：GET /api/v1/integrations/torecacamp/list?keyword=&page=
 * 后端 quote  端点：GET /api/v1/torecacamp/quote?goodsNo=<handle>&tcg=true|false
 *
 * 数据源是 Shopify 官方公开 JSON（后端代理，短缓存/限频/熔断，不落库）。
 * 商品标识 goodsNo = Shopify 商品 handle（非数字 id；详情端点只认 handle）。
 *
 * 返回结构 MarketplaceItem = 后端 integrations 统一 schema（与 Rakuma/Yahoofrima 共用）：
 *   id, title, price_jpy, price_usd?, status, images[], description?, seller?, shipping?,
 *   additional_services?, source_url
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
  /** 后端返回的日文商品描述（Shopify body_html 拍平的纯文本） */
  description?: string;
  /** Azure 翻译后的中文标题（additive，可选，需 lng=zh 才返回） */
  titleTranslated?: string;
  /** Azure 翻译后的中文/英文描述（additive，可选） */
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

/** Torecacamp quote 响应（与 RakumaQuote/MercariQuote 结构对齐） */
export interface TorecacampQuote {
  priceJpy: number;
  feeJpy: number;
  amountJpy: number;
  amountRmb?: number;
  amountUsd?: number;
  priceUsd?: number;
}

/**
 * 拉 Torecacamp 商品详情。
 * 经 /api/backend 代理 → 后端 GET /api/v1/integrations/torecacamp/detail?id=<handle>
 * lng 传 "zh" 时后端按需调用 Azure Translator 附带 titleTranslated/descriptionTranslated
 * （未配 Azure key 时后端原样忽略，不影响原有字段）。
 */
export async function getTorecacampDetail(id: string, lng?: string) {
  const lngQuery = lng ? `&lng=${encodeURIComponent(lng)}` : "";
  return api.request<MarketplaceItem>(
    `/integrations/torecacamp/detail?id=${encodeURIComponent(id)}${lngQuery}`,
  );
}

/** Torecacamp 搜索列表卡片（与 Mercari/Rakuma 列表卡同形，便于复用列表组件）。 */
export interface TorecacampCardItem {
  /** Shopify 商品 handle；用于跳转 /[lang]/torecacamp/[id]。 */
  goodsNo: string;
  title: string;
  imageUrl?: string;
  /** JPY 整数（数据库值即日元，不除以 100）。 */
  priceJpy?: number;
  /** 单品美元估算（后端 price_usd，汇率不可用时缺省）。 */
  priceUsd?: number;
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

function normalizeTorecacampItem(value: unknown): TorecacampCardItem | null {
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

export interface SearchTorecacampResult {
  items: TorecacampCardItem[];
  totalPages: number;
}

/**
 * 拉 Torecacamp 在售搜索列表并归一成 TorecacampCardItem[]。
 * 经 /api/backend 代理 → 后端 GET /api/v1/integrations/torecacamp/list?keyword=&page=
 * （后端读 Shopify 官方 /products.json，服务端按关键词过滤，短缓存、限频、熔断；不落库）。
 * 失败/无数据 → { items: [], totalPages: 0 }（调用方友好兜底，不抛错）。
 */
export async function searchTorecacamp(
  keyword: string,
  page = 1,
): Promise<SearchTorecacampResult> {
  const trimmed = (keyword || "").trim();
  if (!trimmed) return { items: [], totalPages: 0 };
  try {
    const res = await api.request(
      `/integrations/torecacamp/list?keyword=${encodeURIComponent(trimmed)}&page=${page}`,
    );
    if (!res.success || !res.data) return { items: [], totalPages: 0 };
    const data = asRecord(res.data);
    const items = extractGoodsList(res.data)
      .map(normalizeTorecacampItem)
      .filter((item): item is TorecacampCardItem => item !== null);
    const totalPages = firstNumber(data, ["totalPages"]) ?? 0;
    return { items, totalPages };
  } catch {
    return { items: [], totalPages: 0 };
  }
}

/**
 * 拉 Torecacamp 报价（手续费 + 汇率换算）。
 * 经 /api/backend 代理 → 后端 GET /api/v1/torecacamp/quote?goodsNo=<handle>
 * opts.tcg=true 仅 en（TCG）页面传：返回 amountUsd/priceUsd；
 * zh 经典页不传（默认），走旧端动态价，返回 amountRmb。
 */
export async function getTorecacampQuote(
  goodsNo: string,
  opts?: { tcg?: boolean },
) {
  const tcgQuery = opts?.tcg ? "&tcg=true" : "";
  return api.request<TorecacampQuote>(
    `/torecacamp/quote?goodsNo=${encodeURIComponent(goodsNo)}${tcgQuery}`,
  );
}
