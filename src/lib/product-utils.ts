export interface ProductLike {
  id?: string | number | null;
  productId?: string | number | null;
  platformProductId?: string | number | null;
  platform?: string | null;
  platformName?: string | null;
  title?: string | null;
  name?: string | null;
  priceJpy?: number | string | null;
  priceCny?: number | string | null;
  priceUsd?: number | string | null;
  currency?: string | null;
  images?: unknown;
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

function isUsableImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const url = value.trim();
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/");
}

export function getProductImages(product: ProductLike | null | undefined) {
  if (!product) return [];
  const images = Array.isArray(product.images) ? product.images.filter(isUsableImageUrl) : [];
  const fallbacks = [
    product.imageUrl,
    product.image_url,
    product.thumbnail,
    product.thumbnailUrl,
    product.picture,
    product.image,
  ].filter(isUsableImageUrl);

  return Array.from(new Set([...images, ...fallbacks]));
}

export function getProductImage(product: ProductLike | null | undefined) {
  return getProductImages(product)[0] || "";
}

export function getProductId(product: ProductLike) {
  return String(product.id ?? product.productId ?? product.platformProductId ?? "");
}

export function normalizeProduct<T extends ProductLike>(product: T): NormalizedProduct<T> {
  const id = getProductId(product);
  const platform = asString(product.platform) || "other";
  const title = asString(product.title) || asString(product.name) || id;
  const images = getProductImages(product);
  return {
    ...product,
    id,
    platform,
    platformName: asString(product.platformName) || platform,
    title,
    priceJpy: asNumber(product.priceJpy),
    priceCny: asNumber(product.priceCny),
    priceUsd: asNumber(product.priceUsd),
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
