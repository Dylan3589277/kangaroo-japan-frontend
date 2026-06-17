import { api } from "@/lib/api";

/**
 * 设计 A 英文 TCG 首页/搜索页共用的数据层。
 * 真实在售数据源 = 新后端 GET /integrations/mercari/list（经 /api/backend 代理），
 * 后端服务端再 POST 旧系统 mericaris（无需登录）取在售列表。
 * 把后端透出的 data.goodsList 归一成 TcgCardItem，统一给 TcgCard 渲染。
 * 金额一律 JPY 整数（数据库值即日元，不除以 100）。
 */
export interface TcgCardItem {
  /** 旧系统商品号；用于跳转到现有 Mercari 详情页 /mercari/[id]。 */
  goodsNo: string;
  title: string;
  imageUrl?: string;
  /** JPY 整数 */
  priceJpy?: number;
  /** 人民币估算（旧端 price_rmb），仅次要展示，可空。 */
  priceRmb?: number;
  /** 卖家昵称（可空）。 */
  sellerName?: string;
  /** 已售标记。已售的不进「在售热门」，结果页置灰。 */
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

function firstArray(record: UnknownRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function normalizeImage(record: UnknownRecord): string | undefined {
  const direct = firstString(record, [
    "cover",
    "cover_image",
    "coverImage",
    "image",
    "image_url",
    "imageUrl",
    "thumbnail",
  ]);
  if (direct) return direct;

  const images = firstArray(record, ["imgurls", "images", "imageUrls"]);
  const first = images.find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return first;
}

// 已售判定与现有 Mercari 详情页保持一致：交易中/售罄即视为已售。
function isSoldOut(status: string | undefined): boolean {
  if (!status) return false;
  return status === "ITEM_STATUS_TRADING" || status === "sold_out";
}

function normalizeMercariItem(value: unknown): TcgCardItem | null {
  const record = asRecord(value);
  const goodsNo = firstString(record, ["goods_no", "goodsNo", "id"]);
  const title = firstString(record, ["goods_name", "goodsName", "title", "name"]);
  if (!goodsNo || !title) return null;

  return {
    goodsNo,
    title,
    imageUrl: normalizeImage(record),
    priceJpy: firstNumber(record, ["price", "priceJpy", "price_jpy"]),
    priceRmb: firstNumber(record, ["price_rmb", "priceRmb"]),
    sellerName: firstString(record, ["seller_name", "sellerName", "seller"]),
    soldOut: isSoldOut(firstString(record, ["status"])),
  };
}

function extractGoodsList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  const candidates = [root, asRecord(root.data)];
  for (const record of candidates) {
    const list = firstArray(record, ["goodsList", "items", "list", "results"]);
    if (list.length > 0) return list;
  }
  return [];
}

export interface SearchMercariTcgOptions {
  keyword: string;
  page?: number;
  sort?: string;
  /** 仅保留在售（过滤已售）。首页热门用 true；结果页用 false 以展示全部并置灰已售。 */
  inStockOnly?: boolean;
  /** 截取前 N 条（首页热门网格用）。 */
  limit?: number;
}

/**
 * 拉取 Mercari 在售列表并归一成 TcgCardItem[]。
 * 走新后端 GET /integrations/mercari/list?keyword=<enc>&page=<n>（GET 无 body，用 query），
 * 后端再代理旧系统 mericaris。关键词默认按日文搜（命中率高，能出数）。
 * 失败/无数据返回空数组，由调用方决定兜底（首页回退到热门搜索芯片）。
 * 注：sort 仅保留入参兼容（旧 mericaris 列表端不接 sort），不再发往后端。
 */
export async function searchMercariTcg(
  options: SearchMercariTcgOptions,
): Promise<TcgCardItem[]> {
  const {
    keyword,
    page = 1,
    inStockOnly = false,
    limit,
  } = options;

  const trimmed = (keyword || "").trim();
  if (!trimmed) return [];

  try {
    const res = await api.request(
      `/integrations/mercari/list?keyword=${encodeURIComponent(trimmed)}&page=${page}`,
    );

    if (!res.success || !res.data) return [];

    let items = extractGoodsList(res.data)
      .map(normalizeMercariItem)
      .filter((item): item is TcgCardItem => item !== null);

    if (inStockOnly) {
      items = items.filter((item) => !item.soldOut && Boolean(item.imageUrl));
    }

    if (typeof limit === "number") {
      items = items.slice(0, limit);
    }

    return items;
  } catch {
    return [];
  }
}
