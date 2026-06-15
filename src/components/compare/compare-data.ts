// 价格对比页的数据归一化与类型。
// 纯前端：消费已有 `/integrations/search/unified` 聚合接口的返回，
// 容错解析各站透传字段，绝不新增/修改后端。

export type ComparePlatform = "mercari" | "amazon" | "yahoo";

// 仅放有搜索接口、可被 unifiedSearch 聚合的站点。
// yahoo = Yahoo 竞拍/购物（unified 接口里以 yahoo 透传）。
export const COMPARE_PLATFORMS: ComparePlatform[] = ["mercari", "amazon", "yahoo"];

export type CompareSort = "relevance" | "price_asc" | "price_desc";

export type CompareItem = {
  id: string;
  platform: string;
  platformName: string;
  title: string;
  imageUrl?: string;
  priceJpy?: number;
  priceCny?: number;
  priceUsd?: number;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  productUrl?: string;
};

// 单站搜索结果（allSettled 思路：某站失败不拖垮其它站）。
export type ComparePlatformResult = {
  platform: ComparePlatform;
  status: "ok" | "error" | "empty";
  items: CompareItem[];
  errorMessage?: string;
};

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

function firstBoolean(record: UnknownRecord, keys: string[]): boolean | undefined {
  for (const key of keys) {
    if (typeof record[key] === "boolean") return record[key] as boolean;
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
    "coverImage",
    "cover_image",
    "image",
    "imageUrl",
    "image_url",
    "thumbnail",
  ]);
  if (direct) return direct;
  const images = firstArray(record, ["images", "imageUrls", "imgurls"]);
  const first = images.find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (first) return first;
  const imageRecord = asRecord(images[0]);
  return firstString(imageRecord, ["url", "src"]);
}

// unified 接口把多站结果展开到 data.items（生产冒烟实测）；
// 同时容错 data.data / list / rows 等历史形态。
export function extractUnifiedItems(payload: unknown): unknown[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  for (const candidate of [root, data]) {
    const list = firstArray(candidate, ["items", "data", "list", "rows", "goodsList"]);
    if (list.length > 0) return list;
  }
  if (Array.isArray(payload)) return payload;
  return [];
}

const PLATFORM_NAME_FALLBACK: Record<string, string> = {
  mercari: "Mercari",
  amazon: "Amazon",
  yahoo: "Yahoo",
  rakuten: "Rakuten",
};

function normalizePlatform(raw: string | undefined, fallback: ComparePlatform): string {
  const value = (raw || "").toLowerCase();
  if (value.includes("mercari")) return "mercari";
  if (value.includes("amazon")) return "amazon";
  if (value.includes("yahoo")) return "yahoo";
  if (value.includes("rakuten")) return "rakuten";
  return fallback;
}

export function normalizeCompareItem(
  value: unknown,
  fallbackPlatform: ComparePlatform,
): CompareItem | null {
  const record = asRecord(value);
  const id = firstString(record, [
    "id",
    "goodsNo",
    "goods_no",
    "auctionId",
    "auction_id",
    "asin",
    "productId",
    "product_id",
  ]);
  const title = firstString(record, ["title", "goodsName", "goods_name", "name"]);
  if (!title) return null;

  const platform = normalizePlatform(
    firstString(record, ["platform", "site", "source"]),
    fallbackPlatform,
  );
  const platformName =
    firstString(record, ["platformName", "platform_name"]) ??
    PLATFORM_NAME_FALLBACK[platform] ??
    platform;

  return {
    id: id ?? `${platform}-${title.slice(0, 24)}`,
    platform,
    platformName,
    title,
    imageUrl: normalizeImage(record),
    priceJpy: firstNumber(record, [
      "priceJpy",
      "price_jpy",
      "bidPrice",
      "bid_price",
      "currentPrice",
      "current_price",
      "price",
    ]),
    priceCny: firstNumber(record, [
      "priceCny",
      "price_cny",
      "priceCnyApprox",
      "price_cny_approx",
      "price_rmb",
    ]),
    priceUsd: firstNumber(record, ["priceUsd", "price_usd"]),
    rating: firstNumber(record, ["rating", "score", "rate"]),
    reviewCount: firstNumber(record, ["reviewCount", "review_count", "reviews"]),
    inStock: firstBoolean(record, ["inStock", "in_stock"]),
    productUrl: firstString(record, [
      "productUrl",
      "product_url",
      "platformUrl",
      "platform_url",
      "url",
      "link",
    ]),
  };
}

// 把 unified 返回的混合 items 按 platform 归并到各站分组。
// 仅保留请求时勾选的站点；用 allSettled 思路标记空/有结果。
export function groupUnifiedItems(
  payload: unknown,
  selected: ComparePlatform[],
): ComparePlatformResult[] {
  const raw = extractUnifiedItems(payload);
  const buckets = new Map<ComparePlatform, CompareItem[]>();
  for (const platform of selected) buckets.set(platform, []);

  for (const entry of raw) {
    // 先用任一已选站点占位解析，再按真实 platform 归并。
    const item = normalizeCompareItem(entry, selected[0] ?? "yahoo");
    if (!item) continue;
    const bucketKey = (selected.includes(item.platform as ComparePlatform)
      ? (item.platform as ComparePlatform)
      : undefined);
    if (!bucketKey) continue;
    buckets.get(bucketKey)?.push(item);
  }

  return selected.map((platform) => {
    const items = buckets.get(platform) ?? [];
    return {
      platform,
      status: items.length > 0 ? "ok" : "empty",
      items,
    } satisfies ComparePlatformResult;
  });
}

export function sortCompareItems(items: CompareItem[], sort: CompareSort): CompareItem[] {
  if (sort === "relevance") return items;
  const withPrice = [...items];
  withPrice.sort((a, b) => {
    const pa = a.priceJpy ?? Number.POSITIVE_INFINITY;
    const pb = b.priceJpy ?? Number.POSITIVE_INFINITY;
    return sort === "price_asc" ? pa - pb : pb - pa;
  });
  return withPrice;
}

export function filterByPriceRange(
  items: CompareItem[],
  min?: number,
  max?: number,
): CompareItem[] {
  if (min === undefined && max === undefined) return items;
  return items.filter((item) => {
    if (item.priceJpy === undefined) return false;
    if (min !== undefined && item.priceJpy < min) return false;
    if (max !== undefined && item.priceJpy > max) return false;
    return true;
  });
}

// 各站当前最低价（用于高亮全场最低）。
export function cheapestAcross(results: ComparePlatformResult[]): {
  platform: ComparePlatform;
  priceJpy: number;
} | null {
  let best: { platform: ComparePlatform; priceJpy: number } | null = null;
  for (const result of results) {
    for (const item of result.items) {
      if (item.priceJpy === undefined) continue;
      if (!best || item.priceJpy < best.priceJpy) {
        best = { platform: result.platform, priceJpy: item.priceJpy };
      }
    }
  }
  return best;
}
