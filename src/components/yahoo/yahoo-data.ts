export type YahooItem = {
  goodsNo: string;
  title: string;
  imageUrl?: string;
  currentPrice?: number;
  remaining?: string;
  bidCount?: number;
  // 富字段（后端 live-legacy 透传，全部容错 optional）
  titleJa?: string;
  // 按当前 locale 的标题译文（后端 translate 网关，带缓存）。缺失则展示 title 原文。
  titleTranslated?: string;
  condition?: string;
  priceCnyApprox?: number;
  buyNowPrice?: number;
  sellerName?: string;
  sellerLocation?: string;
};

export type YahooSpec = {
  name: string;
  value: string;
};

export type YahooBidHistoryEntry = {
  bidder: string;
  amountJpy?: number;
  time?: string;
};

export type YahooCategory = {
  value: string;
  label: string;
};

export type YahooListResult = {
  items: YahooItem[];
  page: number;
  totalPages?: number;
  hasMore: boolean;
  stale: boolean;
};

export type YahooDetail = {
  goodsNo: string;
  title: string;
  imageUrl?: string;
  currentPrice?: number;
  remaining?: string;
  endTimestamp?: number;
  bidCount?: number;
  // 富字段（后端 live-legacy 透传，全部容错 optional；stale 缓存回退时缺省）
  titleJa?: string;
  // 按当前 locale 的标题/描述译文（后端 translate 网关，带缓存）。缺失展示原文。
  titleTranslated?: string;
  descriptionTranslated?: string;
  condition?: string;
  sellerName?: string;
  sellerLocation?: string;
  sellerRating?: string;
  sellerRatingCount?: number;
  startPrice?: number;
  buyNowPrice?: number;
  description?: string;
  extras?: YahooSpec[];
  images?: string[];
  bidHistory?: YahooBidHistoryEntry[];
  domesticShipping?: string;
  priceCnyApprox?: number;
  exchangeRate?: number;
  // 是否已收藏（后端 /yahoo/goods 透传，登录态才有意义）。缺省视为未收藏。
  collect?: boolean;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as UnknownRecord;
}

function firstString(
  record: UnknownRecord,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function firstNumber(
  record: UnknownRecord,
  keys: string[],
): number | undefined {
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

function firstBoolean(
  records: UnknownRecord[],
  keys: string[],
): boolean | undefined {
  for (const record of records) {
    for (const key of keys) {
      if (typeof record[key] === "boolean") return record[key];
    }
  }
  return undefined;
}

function firstArray(record: UnknownRecord, keys: string[]): unknown[] {
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key];
  }
  return [];
}

function nestedRecords(payload: unknown): UnknownRecord[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const result = asRecord(root.result);
  const payloadRecord = asRecord(root.payload);
  return [root, data, result, payloadRecord].filter(
    (record) => Object.keys(record).length > 0,
  );
}

function findArray(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  for (const record of nestedRecords(payload)) {
    const values = firstArray(record, keys);
    if (values.length > 0) return values;
  }
  return [];
}

function findNumber(payload: unknown, keys: string[]): number | undefined {
  for (const record of nestedRecords(payload)) {
    const value = firstNumber(record, keys);
    if (value !== undefined) return value;
    const pagination = asRecord(record.pagination);
    const paginationValue = firstNumber(pagination, keys);
    if (paginationValue !== undefined) return paginationValue;
  }
  return undefined;
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
    "thumbnail_url",
  ]);
  if (direct) return direct;

  const images = firstArray(record, ["imgurls", "images", "imageUrls"]);
  const first = images.find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (first) return first;

  const imageRecord = asRecord(images[0]);
  return firstString(imageRecord, ["url", "src"]);
}

function normalizeRemaining(record: UnknownRecord): string | undefined {
  const direct = firstString(record, [
    "remainTime",
    "remain_time",
    "remaining",
    "timeLeft",
    "time_left",
  ]);
  if (direct) return direct;

  const seconds = firstNumber(record, ["leftTimestamp", "left_timestamp"]);
  if (seconds !== undefined && seconds >= 0 && seconds < 10_000_000_000) {
    return formatRemainingSeconds(seconds);
  }

  return firstString(record, ["endTime", "end_time"]);
}

function normalizeEndTimestamp(record: UnknownRecord): number | undefined {
  const now = Math.floor(Date.now() / 1000);
  const leftSeconds = firstNumber(record, ["leftTimestamp", "left_timestamp"]);
  if (leftSeconds !== undefined && leftSeconds > 0 && leftSeconds < 10_000_000_000) {
    return now + leftSeconds;
  }

  const timestamp = firstNumber(record, ["endTimestamp", "end_timestamp"]);
  if (timestamp === undefined) return undefined;
  const normalized = timestamp > 10_000_000_000 ? Math.floor(timestamp / 1000) : timestamp;
  return normalized > now ? normalized : undefined;
}

function formatRemainingSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0分";

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  if (days > 0) return `${days}天 ${hours}小时 ${minutes}分`;
  if (hours > 0) return `${hours}小时 ${minutes}分`;
  return `${minutes}分`;
}

function normalizeItem(value: unknown): YahooItem | null {
  const record = asRecord(value);
  const goodsNo = firstString(record, [
    "goodsNo",
    "goods_no",
    "auctionId",
    "auction_id",
    "id",
  ]);
  const title = firstString(record, [
    "goodsName",
    "goods_name",
    "title",
    "name",
  ]);
  if (!goodsNo || !title) return null;

  return {
    goodsNo,
    title,
    imageUrl: normalizeImage(record),
    currentPrice: firstNumber(record, [
      "bidPrice",
      "bid_price",
      "currentPrice",
      "current_price",
      "price",
    ]),
    remaining: normalizeRemaining(record),
    bidCount: firstNumber(record, [
      "bidNum",
      "bid_num",
      "bidCount",
      "bid_count",
      "bids",
    ]),
    titleJa: firstString(record, [
      "titleJa",
      "title_ja",
      "goods_name_ja",
      "jp_name",
    ]),
    titleTranslated: firstString(record, [
      "titleTranslated",
      "title_translated",
    ]),
    condition: firstString(record, [
      "condition",
      "cond",
      "status_text",
      "unused",
      "newused",
    ]),
    priceCnyApprox: firstNumber(record, [
      "priceCnyApprox",
      "price_cny_approx",
      "bid_price_rmb",
      "price_rmb",
    ]),
    buyNowPrice: positiveNumber(
      firstNumber(record, [
        "buyNowPrice",
        "buy_now_price",
        "fastprice",
        "buynowprice",
      ]),
    ),
    sellerName: firstString(record, ["sellerName", "seller_name", "seller"]),
    sellerLocation: firstString(record, [
      "sellerLocation",
      "seller_location",
      "seller_address",
    ]),
  };
}

// 一口价 0 或缺失视为「仅竞拍」，不渲染金额。
function positiveNumber(value: number | undefined): number | undefined {
  return value !== undefined && value > 0 ? value : undefined;
}

function normalizeSpecs(record: UnknownRecord): YahooSpec[] | undefined {
  const list = firstArray(record, ["extras", "specs", "attributes"]);
  const specs = list
    .map((value): YahooSpec | null => {
      const entry = asRecord(value);
      const name = firstString(entry, ["name", "key", "label"]);
      const specValue = firstString(entry, ["value", "val", "text"]);
      return name && specValue ? { name, value: specValue } : null;
    })
    .filter((spec): spec is YahooSpec => spec !== null);
  return specs.length > 0 ? specs : undefined;
}

export function normalizeYahooList(
  payload: unknown,
  requestedPage: number,
): YahooListResult {
  const items = findArray(payload, [
    "goodsList",
    "goods_list",
    "items",
    "list",
    "rows",
  ])
    .map(normalizeItem)
    .filter((item): item is YahooItem => item !== null);
  const page =
    findNumber(payload, ["page", "currentPage", "current_page"]) ??
    requestedPage;
  const totalPages = findNumber(payload, [
    "totalPages",
    "total_pages",
    "pageCount",
    "page_count",
    "pages",
  ]);
  const explicitHasMore = firstBoolean(nestedRecords(payload), [
    "hasMore",
    "has_more",
  ]);

  return {
    items,
    page,
    totalPages,
    hasMore:
      explicitHasMore ??
      (totalPages !== undefined ? page < totalPages : items.length > 0),
    stale:
      firstBoolean(nestedRecords(payload), [
        "stale",
        "isStale",
        "is_stale",
      ]) ?? false,
  };
}

function normalizeCategory(
  value: unknown,
  parentLabel?: string,
): YahooCategory[] {
  const record = asRecord(value);
  // 旧 ycats 返回 { id, name, icon, data }，其中 data 才是雅虎竞拍真正用来筛选的
  // auccat 分类号（后端 /yahoo/goods 的 cat 参数会原样转给旧 search 的 auccat）。
  // 必须优先取 data/auccat，绝不能用 id（那是旧库自增主键，传给雅虎匹配不到任何商品，
  // 表现为「点了类目没反应」）。其余键仅为兼容兜底。
  const categoryValue = firstString(record, [
    "data",
    "auccat",
    "categoryId",
    "category_id",
    "catId",
    "cat_id",
    "value",
    "id",
  ]);
  const name = firstString(record, [
    "categoryName",
    "category_name",
    "name",
    "label",
    "title",
  ]);
  const label = name && parentLabel ? `${parentLabel} / ${name}` : name;
  const current =
    categoryValue && label ? [{ value: categoryValue, label }] : [];
  const children = firstArray(record, [
    "children",
    "categories",
    "subCategories",
    "sub_categories",
  ]).flatMap((child) => normalizeCategory(child, label ?? parentLabel));

  return [...current, ...children];
}

export function normalizeYahooCategories(payload: unknown): YahooCategory[] {
  const categories = findArray(payload, [
    "categories",
    "categoryList",
    "category_list",
    "items",
    "list",
    "rows",
  ]).flatMap((category) => normalizeCategory(category));
  const unique = new Map<string, YahooCategory>();

  for (const category of categories) {
    if (!unique.has(category.value)) unique.set(category.value, category);
  }

  return [...unique.values()];
}

function normalizeBidHistory(
  record: UnknownRecord,
): YahooBidHistoryEntry[] | undefined {
  const list = firstArray(record, [
    "bidHistory",
    "bid_history",
    "bids",
    "bid_list",
  ]);
  const entries = list
    .map((value): YahooBidHistoryEntry | null => {
      const entry = asRecord(value);
      const bidder = firstString(entry, ["bidder", "user", "name", "nick"]);
      if (!bidder) return null;
      return {
        bidder,
        amountJpy: firstNumber(entry, ["amountJpy", "amount", "price", "money"]),
        time: firstString(entry, ["time", "date", "datetime"]),
      };
    })
    .filter((entry): entry is YahooBidHistoryEntry => entry !== null);
  return entries.length > 0 ? entries : undefined;
}

function normalizeImageList(record: UnknownRecord): string[] | undefined {
  const list = firstArray(record, ["images", "imgurls", "imageUrls"]).filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return list.length > 0 ? list : undefined;
}

export function normalizeYahooDetail(
  payload: unknown,
  requestedGoodsNo: string,
): YahooDetail | null {
  const records = nestedRecords(payload);
  const detailRecord = records
    .map((record) => asRecord(record.detail))
    .find((record) => Object.keys(record).length > 0);
  const record = detailRecord ?? records.at(-1) ?? {};
  const title = firstString(record, [
    "goodsName",
    "goods_name",
    "title",
    "name",
  ]);
  if (!title) return null;

  return {
    goodsNo:
      firstString(record, ["goodsNo", "goods_no", "id"]) ??
      requestedGoodsNo,
    title,
    imageUrl: normalizeImage(record),
    currentPrice: firstNumber(record, [
      "bidPrice",
      "bid_price",
      "currentPrice",
      "current_price",
      "price",
    ]),
    remaining: normalizeRemaining(record),
    endTimestamp: normalizeEndTimestamp(record),
    bidCount: firstNumber(record, [
      "bidCount",
      "bid_count",
      "bidNum",
      "bid_num",
      "bids",
    ]),
    titleJa: firstString(record, [
      "titleJa",
      "title_ja",
      "goods_name_ja",
      "jp_name",
    ]),
    titleTranslated: firstString(record, [
      "titleTranslated",
      "title_translated",
    ]),
    descriptionTranslated: firstString(record, [
      "descriptionTranslated",
      "description_translated",
    ]),
    condition: firstString(record, [
      "condition",
      "cond",
      "status_text",
    ]),
    sellerName: firstString(record, ["sellerName", "seller_name", "seller"]),
    sellerLocation: firstString(record, [
      "sellerLocation",
      "seller_location",
      "seller_address",
    ]),
    sellerRating: firstString(record, [
      "sellerRating",
      "seller_rating",
      "rate_percent",
    ]),
    sellerRatingCount: firstNumber(record, [
      "sellerRatingCount",
      "seller_rating_count",
      "rate_count",
    ]),
    startPrice: firstNumber(record, [
      "startPrice",
      "start_price",
      "init_price",
    ]),
    buyNowPrice: positiveNumber(
      firstNumber(record, [
        "buyNowPrice",
        "buy_now_price",
        "fastprice",
        "buynowprice",
      ]),
    ),
    description: firstString(record, ["description", "desc"]),
    extras: normalizeSpecs(record),
    images: normalizeImageList(record),
    bidHistory: normalizeBidHistory(record),
    domesticShipping: firstString(record, [
      "domesticShipping",
      "domestic_shipping",
      "jp_shipping",
    ]),
    priceCnyApprox: firstNumber(record, [
      "priceCnyApprox",
      "price_cny_approx",
    ]),
    exchangeRate: firstNumber(record, ["exchangeRate", "exchange_rate", "rate"]),
    collect:
      firstBoolean([record], ["collect", "is_collect", "isCollect", "collected"]) ??
      undefined,
  };
}
