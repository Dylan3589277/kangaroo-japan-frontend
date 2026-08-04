"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Clock3, Gavel, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  normalizeYahooCategories,
  normalizeYahooList,
  type YahooCategory,
  type YahooItem,
} from "./yahoo-data";
import {
  URGENCY_PILL_CLASS,
  formatTimeLeftLabel,
  urgencyFromTimestamp,
} from "./yahoo-urgency";
import { localizeYahooCategoryLabel } from "./yahoo-category-labels";
import { MascotScene } from "@/components/common/MascotScene";
import { useTitleTranslations } from "@/components/platform-search/useTitleTranslations";

const ALL_CATEGORIES = "__all__";

const SORT_OPTIONS = [
  { value: "end_a", label: "sortRemaining" },
  { value: "cbids_a", label: "sortPrice" },
] as const;

type YahooSearchPageProps = {
  locale: string;
  initialKeyword?: string;
  initialCategory?: string;
  initialSort?: string;
};

export function YahooSearchPage({
  locale,
  initialKeyword = "",
  initialCategory = "",
  initialSort = SORT_OPTIONS[0].value,
}: YahooSearchPageProps) {
  const t = useTranslations("yahoo");
  const [draftKeyword, setDraftKeyword] = useState(initialKeyword);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState(
    SORT_OPTIONS.some((option) => option.value === initialSort)
      ? initialSort
      : SORT_OPTIONS[0].value,
  );
  const [categories, setCategories] = useState<YahooCategory[]>([]);
  const [items, setItems] = useState<YahooItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const loadPage = useCallback(
    async (requestedPage: number, append: boolean, requestVersion: number) => {
      if (append) {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(false);
      }

      const query = new URLSearchParams({ page: String(requestedPage) });
      if (keyword.trim()) query.set("kw", keyword.trim());
      if (category) query.set("cat", category);
      query.set("sort", sort);
      query.set("lng", locale);

      try {
        const response = await api.request<unknown>(
          `/yahoo/goods?${query.toString()}`,
        );
        if (requestVersion !== requestVersionRef.current) return;
        if (!response.success) {
          if (!append) setItems([]);
          setError(true);
          setHasMore(false);
          return;
        }

        const result = normalizeYahooList(response.data, requestedPage);
        if (append) {
          setItems((previous) => {
            const next = new Map(
              previous.map((item) => [item.goodsNo, item] as const),
            );
            for (const item of result.items) next.set(item.goodsNo, item);
            setHasMore(
              result.hasMore && next.size > previous.length,
            );
            return [...next.values()];
          });
          setStale((previous) => previous || result.stale);
        } else {
          setItems(result.items);
          setHasMore(result.hasMore);
          setStale(result.stale);
        }
        setPage(result.page);
      } catch {
        if (requestVersion !== requestVersionRef.current) return;
        if (!append) setItems([]);
        setError(true);
        setHasMore(false);
      } finally {
        if (requestVersion === requestVersionRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
        loadingMoreRef.current = false;
      }
    },
    [category, keyword, sort, locale],
  );

  useEffect(() => {
    let active = true;

    void api
      .request<unknown>("/yahoo/categories")
      .then((response) => {
        if (active && response.success) {
          // 后端给的是中文分类名（老后台数据）；英文站换成英文标签，其它语言原样。
          setCategories(
            normalizeYahooCategories(response.data).map((category) => ({
              ...category,
              label: localizeYahooCategoryLabel(
                category.value,
                category.label,
                locale,
              ),
            })),
          );
        }
      })
      .catch(() => {
        if (active) setCategories([]);
      });

    return () => {
      active = false;
    };
  }, [locale]);

  useEffect(() => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    loadingMoreRef.current = false;
    setItems([]);
    setPage(1);
    setHasMore(false);
    setStale(false);
    setBrokenImages(new Set());
    void loadPage(1, false, requestVersion);
  }, [category, keyword, loadPage, sort]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || loadingMore || !hasMore || error) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMoreRef.current) return;
        void loadPage(page + 1, true, requestVersionRef.current);
      },
      { rootMargin: "320px 0px", threshold: 0.01 },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [error, hasMore, loadPage, loading, loadingMore, page]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setKeyword(draftKeyword.trim());
  };

  const retry = () => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    setError(false);
    void loadPage(1, false, requestVersion);
  };

  // 强调色按站点分流：中文站保持原有橙色，英文站换成 TCG 深色壳的电光青。
  // （底色/边框/次要文字由外层 .tcg-surface 重定义 shadcn 变量统一接管。）
  const isEn = locale === "en";
  const accentButtonClass = isEn
    ? "bg-cyan-400 text-[#06121b] hover:bg-cyan-300"
    : "bg-orange-600 text-white hover:bg-orange-700";
  const accentActiveClass = isEn
    ? "bg-cyan-400/10 font-medium text-cyan-300"
    : "bg-orange-50 font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-400";
  const accentPriceClass = isEn ? "text-cyan-300" : "text-orange-600";

  const numberFormatter = new Intl.NumberFormat(locale);

  // zh 站列表标题日译中兜底：后端 titleTranslated（老网关）优先，本管线只补它没覆盖的
  // 条目；en 站/已有译名的条目不占请求配额。
  const titlesNeedingTranslation =
    locale === "zh"
      ? items.filter((item) => !item.titleTranslated).map((item) => item.title)
      : [];
  const titleTranslations = useTitleTranslations(titlesNeedingTranslation);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="mb-4 grid gap-2 rounded-2xl border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t("searchLabel")}
            value={draftKeyword}
            onChange={(event) => setDraftKeyword(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 rounded-full pl-9"
          />
        </div>
        <Button
          type="submit"
          className={`h-10 rounded-full px-5 ${accentButtonClass}`}
        >
          {t("searchButton")}
        </Button>
      </form>

      {/* Sort row — category lives in the sidebar on desktop, in the
          dropdown here on narrow screens. */}
      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto] lg:items-center">
        <Select
          value={category || ALL_CATEGORIES}
          onValueChange={(value) =>
            setCategory(value === ALL_CATEGORIES || value === null ? "" : value)
          }
        >
          <SelectTrigger
            aria-label={t("categoryLabel")}
            className="h-10 w-full rounded-full lg:hidden"
          >
            <SelectValue>
              {(value) =>
                value === ALL_CATEGORIES
                  ? t("allCategories")
                  : categories.find((option) => option.value === value)?.label ??
                    String(value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>
              {t("allCategories")}
            </SelectItem>
            {categories.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => value && setSort(value)}>
          <SelectTrigger
            aria-label={t("sortLabel")}
            className="h-10 w-full rounded-full lg:w-56"
          >
            <SelectValue>
              {(value) => {
                const option = SORT_OPTIONS.find(
                  (candidate) => candidate.value === value,
                );
                return option ? t(option.label) : String(value);
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.label)}
              </SelectItem>
            ))}
            <SelectItem value="bid_count_pending" disabled>
              {t("sortBidsPending")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {stale && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <span aria-hidden="true">⚠</span>
          <span>{t("staleNotice")}</span>
        </div>
      )}

      {/* Desktop: sidebar + grid. Mobile: grid only (sidebar hidden). */}
      <div className="flex gap-6">
        <aside className="hidden w-48 shrink-0 lg:block">
          <nav className="sticky top-6 rounded-2xl border bg-card p-2">
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground">
              {t("categoryLabel")}
            </p>
            <ul className="flex flex-col">
              <li>
                <button
                  type="button"
                  onClick={() => setCategory("")}
                  className={`flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    category === ""
                      ? accentActiveClass
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {t("allCategories")}
                </button>
              </li>
              {categories.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => setCategory(option.value)}
                    className={`flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      category === option.value
                        ? accentActiveClass
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {loading ? (
            <YahooGridSkeleton />
          ) : error ? (
            <div className="rounded-2xl border bg-card px-4 py-12 text-center">
              <p className="text-sm font-medium">{t("loadError")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("loadErrorHint")}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={retry}
              >
                {t("retry")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border bg-card px-4 py-14 text-center">
              {locale === "zh" ? (
                <MascotScene name="search" alt={t("emptyTitle")} className="mb-1" />
              ) : (
                <Search className="mx-auto size-8 text-muted-foreground" />
              )}
              <p className="mt-3 text-sm font-medium">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("emptyHint")}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: single-column horizontal cards.
                  Desktop (lg+): 4-column vertical-card grid. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
                {items.map((item) => {
                  const imageBroken = brokenImages.has(item.goodsNo);

                  return (
                    <Link
                      key={item.goodsNo}
                      href={`/yahoo/${encodeURIComponent(item.goodsNo)}`}
                      className="group rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <Card className="h-full flex-row gap-0 py-0 transition-colors group-hover:bg-muted/30 lg:flex-col">
                        <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted sm:w-32 lg:w-full">
                          {item.imageUrl && !imageBroken ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              fill
                              className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                              sizes="(max-width: 640px) 30vw, (max-width: 1024px) 50vw, 25vw"
                              onError={() =>
                                setBrokenImages((previous) => {
                                  const next = new Set(previous);
                                  next.add(item.goodsNo);
                                  return next;
                                })
                              }
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted-foreground">
                              {t("noImage")}
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col p-3 lg:min-h-32">
                          <h2 className="line-clamp-2 min-h-10 text-sm leading-5 font-medium">
                            {item.titleTranslated ||
                              titleTranslations[item.title] ||
                              item.title}
                          </h2>
                          {/* 原日文标题副标题：有 titleJa 用之，否则当主标题是译文（后端或本管线）时回退 title。 */}
                          {(item.titleJa ||
                            ((item.titleTranslated ||
                              titleTranslations[item.title]) &&
                              item.title)) && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {item.titleJa || item.title}
                            </p>
                          )}
                          {item.condition && (
                            <span className="mt-1 inline-flex w-fit items-center rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {item.condition}
                            </span>
                          )}
                          <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
                            <span className={`text-lg font-bold tabular-nums ${accentPriceClass}`}>
                              {item.currentPrice === undefined
                                ? t("priceUnavailable")
                                : `JPY ${numberFormatter.format(item.currentPrice)}`}
                            </span>
                            {/* CNY 近似仅非英文站展示；英文站面向海外只显权威 JPY，绝不显人民币。 */}
                            {locale !== "en" &&
                              item.priceCnyApprox !== undefined && (
                                <span className="text-[11px] text-muted-foreground">
                                  {t("approxCny", {
                                    amount: numberFormatter.format(
                                      item.priceCnyApprox,
                                    ),
                                  })}
                                </span>
                              )}
                          </p>
                          {/* 一口价（直接购买）—— 无则显示「仅竞拍」 */}
                          <p className="mt-0.5 text-[11px]">
                            {item.buyNowPrice !== undefined ? (
                              <span className="text-blue-700 dark:text-blue-400">
                                {t("buyNowPriceShort", {
                                  amount: numberFormatter.format(
                                    item.buyNowPrice,
                                  ),
                                })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {t("auctionOnly")}
                              </span>
                            )}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {/*
                              时间徽章：只对 endTimestamp（后端由详情链路可信时间推算的
                              end_timestamp）有值的商品渲染——legacy 列表自带的
                              end_time/left_time 是雅虎改版后的占位假值，后端已剥掉。
                              没有可信时间就不显示，宁缺毋假。
                            */}
                            {(() => {
                              const timeLeft = formatTimeLeftLabel(
                                item.endTimestamp,
                                locale,
                              );
                              if (!timeLeft) return null;
                              const urgency = urgencyFromTimestamp(
                                item.endTimestamp,
                                Math.floor(Date.now() / 1000),
                              );
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${URGENCY_PILL_CLASS[urgency]}`}
                                >
                                  <Clock3 className="size-3 shrink-0" />
                                  <span className="truncate">{timeLeft}</span>
                                </span>
                              );
                            })()}
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Gavel className="size-3 shrink-0" />
                              {item.bidCount === undefined
                                ? t("bidCountUnavailable")
                                : t("bidCount", { count: item.bidCount })}
                            </span>
                          </div>
                          {/* 卖家名 + 所在地 —— 每段独立判空 */}
                          {(item.sellerName || item.sellerLocation) && (
                            <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2 text-[11px] text-muted-foreground">
                              {item.sellerName && (
                                <span className="truncate">
                                  {t("sellerShort", { name: item.sellerName })}
                                </span>
                              )}
                              {item.sellerLocation && (
                                <span className="shrink-0">
                                  {item.sellerLocation}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>

              <div ref={sentinelRef} className="h-8" aria-hidden="true" />

              {loadingMore && (
                <div className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }, (_, index) => (
                    <Card key={index} className="flex-row gap-0 py-0 lg:flex-col">
                      <Skeleton className="aspect-square w-28 shrink-0 rounded-none sm:w-32 lg:w-full" />
                      <div className="flex-1 space-y-2 p-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-5 w-1/2" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {!hasMore && !loadingMore && (
                <p className="py-5 text-center text-xs text-muted-foreground">
                  {t("endOfResults")}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function YahooGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <Card key={index} className="flex-row gap-0 py-0 lg:flex-col">
          <Skeleton className="aspect-square w-28 shrink-0 rounded-none sm:w-32 lg:w-full" />
          <div className="flex-1 space-y-2 p-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </Card>
      ))}
    </div>
  );
}
