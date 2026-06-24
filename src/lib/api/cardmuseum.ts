/**
 * Card Museum (カードラッシュ ポケモン) API helpers.
 *
 * 后端 detail 端点：GET /api/v1/integrations/cardmuseum/detail?id=<id>
 * 后端 list   端点：GET /api/v1/integrations/cardmuseum/list?keyword=&page=
 * 后端 quote  端点：GET /api/v1/cardmuseum/quote?goodsNo=<id>&tcg=true|false
 *
 * 返回结构 MarketplaceItem = 后端 integrations 统一 schema（与 rakuma/yahoofrima 共用）。
 *
 * 复用 rakuma.ts 的 MarketplaceItem / Quote 类型与归一逻辑；Card Museum 商品 id 为纯数字
 * （非 rakuma 的 32hex hash），故没有「粘贴链接解析」入口（列表/详情直连即可）。
 */

import { api } from "@/lib/api";
import type { MarketplaceItem, RakumaQuote } from "@/lib/api/rakuma";

export type { MarketplaceItem } from "@/lib/api/rakuma";

/** Card Museum quote 响应（与 RakumaQuote 同构，便于复用结算组件）。 */
export type CardmuseumQuote = RakumaQuote;

/**
 * 拉 Card Museum 商品详情。
 * 经 /api/backend 代理 → 后端 GET /api/v1/integrations/cardmuseum/detail?id=...
 */
export async function getCardmuseumDetail(id: string) {
  return api.request<MarketplaceItem>(
    `/integrations/cardmuseum/detail?id=${encodeURIComponent(id)}`,
  );
}

/** Card Museum 搜索列表卡片（与 RakumaCardItem 同形，便于复用列表组件）。 */
export interface CardmuseumCardItem {
  /** 商品数字 id；用于跳转 /[lang]/cardmuseum/[id]。 */
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

function normalizeCardmuseumItem(value: unknown): CardmuseumCardItem | null {
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

export interface SearchCardmuseumResult {
  items: CardmuseumCardItem[];
  totalPages: number;
}

/**
 * 拉 Card Museum 在售搜索列表并归一成 CardmuseumCardItem[]。
 * 经 /api/backend 代理 → 后端 GET /api/v1/integrations/cardmuseum/list?keyword=&page=
 * （后端实时抓 cardmuseum-pokemon.jp 公开搜索页，短缓存、限频、熔断；不落库）。
 * 失败/无数据 → { items: [], totalPages: 0 }（调用方友好兜底，不抛错）。
 */
export async function searchCardmuseum(
  keyword: string,
  page = 1,
): Promise<SearchCardmuseumResult> {
  const trimmed = (keyword || "").trim();
  if (!trimmed) return { items: [], totalPages: 0 };
  try {
    const res = await api.request(
      `/integrations/cardmuseum/list?keyword=${encodeURIComponent(trimmed)}&page=${page}`,
    );
    if (!res.success || !res.data) return { items: [], totalPages: 0 };
    const data = asRecord(res.data);
    const items = extractGoodsList(res.data)
      .map(normalizeCardmuseumItem)
      .filter((item): item is CardmuseumCardItem => item !== null);
    const totalPages = firstNumber(data, ["totalPages"]) ?? 0;
    return { items, totalPages };
  } catch {
    return { items: [], totalPages: 0 };
  }
}

/**
 * 拉 Card Museum 报价（手续费 + 汇率换算）。
 * 经 /api/backend 代理 → 后端 GET /api/v1/cardmuseum/quote?goodsNo=...
 * opts.tcg=true 仅 en（TCG）页面传：返回 amountUsd/priceUsd；
 * zh 经典页不传（默认），走旧端动态价（暂未开放亦兜底）。
 */
export async function getCardmuseumQuote(
  goodsNo: string,
  opts?: { tcg?: boolean },
) {
  const tcgQuery = opts?.tcg ? "&tcg=true" : "";
  return api.request<CardmuseumQuote>(
    `/cardmuseum/quote?goodsNo=${encodeURIComponent(goodsNo)}${tcgQuery}`,
  );
}
