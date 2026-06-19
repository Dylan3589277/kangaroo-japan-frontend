/**
 * next/image `placeholder` 用的极小内联占位图（1x1 纯色 PNG，base64）。
 * 远程动态图无法用 placeholder="blur"（需 blurDataURL），故用 data-URL 占位：
 * 图未加载时先铺一块纯色（而非白屏/灰块突现），观感"秒开"。两套主题各给一色，
 * 与卡片底色一致（zh 浅灰 / tcg 深色），加载完图后被真图覆盖。
 */
// 浅灰（zinc-100 ≈ #f4f4f5）—— zh 亮色卡。
export const IMG_PLACEHOLDER_LIGHT =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
// 深色（≈ #0e131d）—— tcg 暗色卡。
export const IMG_PLACEHOLDER_DARK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==";

export interface ProductLike {
  id?: string | number | null;
  productId?: string | number | null;
  platformProductId?: string | number | null;
  goods_no?: string | number | null;
  goodsNo?: string | number | null;
  slug?: string | number | null;
  platform?: string | null;
  platformName?: string | null;
  platformUrl?: string | null;
  title?: string | null;
  goods_name?: string | null;
  goodsName?: string | null;
  name?: string | null;
  description?: string | null;
  descriptionZh?: string | null;
  descriptionEn?: string | null;
  descriptionJa?: string | null;
  content?: string | null;
  url?: string | null;
  priceJpy?: number | string | null;
  priceCny?: number | string | null;
  priceUsd?: number | string | null;
  price?: number | string | null;
  price_rmb?: number | string | null;
  priceRmb?: number | string | null;
  rate?: number | string | null;
  currency?: string | null;
  images?: unknown;
  imgurls?: unknown;
  imgUrls?: unknown;
  imageUrls?: unknown;
  imagesUrl?: unknown;
  cover?: unknown;
  cover_image?: unknown;
  coverImage?: unknown;
  mainImage?: unknown;
  main_image?: unknown;
  imageUrl?: string | null;
  image_url?: string | null;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  picture?: string | null;
  image?: string | null;
  rating?: number | string | null;
  reviewCount?: number | string | null;
  salesCount?: number | string | null;
  inStock?: boolean | null;
  status?: string | null;
  [key: string]: unknown;
}

export interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type NormalizedProduct<T extends ProductLike = ProductLike> = T &
  Required<
    Pick<
      ProductLike,
      | "id"
      | "platform"
      | "platformName"
      | "title"
      | "priceJpy"
      | "priceCny"
      | "priceUsd"
      | "images"
      | "rating"
      | "reviewCount"
      | "salesCount"
      | "inStock"
      | "status"
    >
  > & {
    id: string;
    platform: string;
    platformName: string;
    title: string;
    priceJpy: number;
    priceCny: number;
    priceUsd: number;
    images: string[];
    rating: number | null;
    reviewCount: number;
    salesCount: number;
    inStock: boolean;
    status: string;
  };

const EMPTY_PAGINATION: ProductPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
};

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeImageUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/") ? url : "";
}

function parseImageUrlSource(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => parseImageUrlSource(item));
  }

  if (typeof value !== "string") return [];

  const source = value.trim();
  if (!source) return [];

  if (source.startsWith("[")) {
    try {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed)) return parseImageUrlSource(parsed);
    } catch {
      // Fall through to comma-delimited parsing.
    }
  }

  return source
    .split(",")
    .map((item) => normalizeImageUrl(item))
    .filter((url) => url.length > 0);
}

export function getProductImages(product: ProductLike | null | undefined) {
  if (!product) return [];
  const imageSources = [
    product.images,
    product.imageUrl,
    product.image_url,
    product.thumbnail,
    product.thumbnailUrl,
    product.picture,
    product.image,
    product.imgurls,
    product.imgUrls,
    product.imageUrls,
    product.imagesUrl,
    product.cover,
    product.cover_image,
    product.coverImage,
    product.mainImage,
    product.main_image,
  ];

  return Array.from(new Set(imageSources.flatMap((source) => parseImageUrlSource(source))));
}

export function getProductImage(product: ProductLike | null | undefined) {
  return getProductImages(product)[0] || "";
}

export function getProductId(product: ProductLike) {
  return String(
    product.id ??
      product.productId ??
      product.goodsNo ??
      product.goods_no ??
      product.platformProductId ??
      product.slug ??
      "",
  );
}

export function normalizeProduct<T extends ProductLike>(product: T): NormalizedProduct<T> {
  const id = getProductId(product);
  const platform = asString(product.platform) || "other";
  const title =
    asString(product.title) ||
    asString(product.goods_name) ||
    asString(product.goodsName) ||
    asString(product.name) ||
    id;
  const images = getProductImages(product);
  const priceJpy = asNumber(product.priceJpy ?? product.price);
  const legacyRate = asNumber(product.rate);
  const priceCny = asNumber(
    product.priceCny ??
      product.price_rmb ??
      product.priceRmb ??
      (priceJpy && legacyRate ? priceJpy * legacyRate : undefined),
  );
  const priceUsd = asNumber(product.priceUsd);
  return {
    ...product,
    id,
    platform,
    platformName: asString(product.platformName) || platform,
    platformUrl: asString(product.platformUrl) || asString(product.url) || undefined,
    title,
    description:
      asString(product.description) ||
      asString(product.content) ||
      undefined,
    priceJpy,
    priceCny,
    priceUsd,
    images,
    rating: product.rating == null ? null : asNumber(product.rating),
    reviewCount: asNumber(product.reviewCount),
    salesCount: asNumber(product.salesCount),
    inStock: product.inStock ?? product.status !== "sold_out",
    status: asString(product.status) || "active",
  };
}

export function extractProducts<T extends ProductLike>(payload: unknown): Array<NormalizedProduct<T>> {
  const source = payload as Record<string, unknown> | null;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(source?.data)
      ? source.data
      : Array.isArray(source?.items)
        ? source.items
        : Array.isArray(source?.products)
          ? source.products
          : Array.isArray(source?.results)
            ? source.results
            : [];

  return (list as T[]).map((item) => normalizeProduct(item)).filter((item) => Boolean(item.id));
}

export function extractPagination(payload: unknown, fallback: ProductPagination = EMPTY_PAGINATION): ProductPagination {
  const source = payload as Record<string, unknown> | null;
  const raw = (source?.pagination || source?.meta || {}) as Record<string, unknown>;
  const page = asNumber(raw.page, fallback.page);
  const limit = asNumber(raw.limit, fallback.limit);
  const total = asNumber(raw.total, fallback.total);
  const totalPages = asNumber(raw.totalPages, total && limit ? Math.ceil(total / limit) : fallback.totalPages);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: typeof raw.hasNext === "boolean" ? raw.hasNext : page < totalPages,
    hasPrev: typeof raw.hasPrev === "boolean" ? raw.hasPrev : page > 1,
  };
}
