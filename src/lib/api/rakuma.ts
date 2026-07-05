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
  /** Azure 翻译后的中文标题（additive，可选，需 lng=zh 才返回） */
  titleTranslated?: string;
  /** Azure 翻译后的中文描述（additive，可选，需 lng=zh 才返回） */
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

/**
 * 可选增值服务一项（zh 报价随 CnQuoteResult.optional_services 下发，老后台 st_value_added 驱动）。
 * 与智能客服 h5 报价卡 OptionalService、后端 CnQuoteResult.optional_services 同形：
 * 勾选后把数字 id 回传给后端建单，老后台按 id 查表权威收费。fee_jpy 一律 JPY 整数（不除以 100）。
 */
export interface RakumaOptionalService {
  /** 老后台 st_value_added 主键（数字 id）；建单透传给后端按勾选权威收费。 */
  id?: number;
  /** 服务 code（如 'misdelivery_check'）。 */
  code?: string;
  /** 展示名（如「错发漏发检查」）。 */
  label?: string;
  /** 精确费用（日元整数）。 */
  fee_jpy?: number;
}

/** Rakuma quote 响应（与 MercariQuote 结构对齐） */
export interface RakumaQuote {
  priceJpy: number;
  feeJpy: number;
  amountJpy: number;
  amountRmb?: number;
  amountUsd?: number;
  priceUsd?: number;
  price_jpy?: number;
  fee_service_jpy?: number;
  total_jpy?: number;
  amount_jpy?: number;
  /**
   * 可选增值服务（仅 zh / tcg=false 时老后台数据驱动下发；en 不含）。
   * 缺省/空数组即不渲染增值服务区（向后兼容，零回归）。
   */
  optional_services?: RakumaOptionalService[];
}

/**
 * 拉 Rakuma 商品详情。
 * 经 /api/backend 代理 → 后端 GET /api/v1/integrations/rakuma/detail?id=...
 * lng 传 "zh" 时后端按需调用 Azure Translator 附带 titleTranslated/descriptionTranslated
 * （未配 Azure key 时后端原样忽略，不影响原有字段）。
 */
export async function getRakumaDetail(id: string, lng?: string) {
  const lngQuery = lng ? `&lng=${encodeURIComponent(lng)}` : "";
  return api.request<MarketplaceItem>(
    `/integrations/rakuma/detail?id=${encodeURIComponent(id)}${lngQuery}`,
  );
}

/** Rakuma 搜索列表卡片（与 Mercari TcgCardItem 同形，便于复用列表组件）。 */
export interface RakumaCardItem {
  /** 商品 publicHash（32hex）；用于跳转 /[lang]/rakuma/[id]。 */
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

function normalizeRakumaItem(value: unknown): RakumaCardItem | null {
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

export interface SearchRakumaResult {
  items: RakumaCardItem[];
  totalPages: number;
}

/**
 * 拉 Rakuma 在售搜索列表并归一成 RakumaCardItem[]。
 * 经 /api/backend 代理 → 后端 GET /api/v1/integrations/rakuma/list?keyword=&page=
 * （后端实时抓 fril.jp 公开搜索页，短缓存、限频、熔断；不落库）。
 * 失败/无数据 → { items: [], totalPages: 0 }（调用方友好兜底，不抛错）。
 */
export async function searchRakuma(
  keyword: string,
  page = 1,
): Promise<SearchRakumaResult> {
  const trimmed = (keyword || "").trim();
  if (!trimmed) return { items: [], totalPages: 0 };
  try {
    const res = await api.request(
      `/integrations/rakuma/list?keyword=${encodeURIComponent(trimmed)}&page=${page}`,
    );
    if (!res.success || !res.data) return { items: [], totalPages: 0 };
    const data = asRecord(res.data);
    const items = extractGoodsList(res.data)
      .map(normalizeRakumaItem)
      .filter((item): item is RakumaCardItem => item !== null);
    const totalPages = firstNumber(data, ["totalPages"]) ?? 0;
    return { items, totalPages };
  } catch {
    return { items: [], totalPages: 0 };
  }
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
