"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { spaceGrotesk } from "@/app/fonts";
import { ShieldIcon } from "@/components/home/tcg/icons";
import { TcgCard, TcgCardSkeleton } from "@/components/home/tcg/TcgCard";
import {
  searchSellerListings,
  type TcgCardItem,
} from "@/components/home/tcg/tcg-data";

/**
 * 设计 A（深色高级感）英文 Mercari 卖家「其它在售」页。
 *
 * 仅 en 设计方向：石墨/深墨蓝近黑底 #0a0e16 + 电光青 cyan-400 + Space Grotesk。
 * 与商品详情页 MercariDetailDesignA / 搜索页 TcgCard 视觉连贯，套在 [lang] 的 TcgHeader/Footer 外壳内。
 *
 * 数据：
 * - 卖家在售网格 → 新后端 GET /integrations/mercari/seller（代理旧 mericaris seller_id），
 *   复用 tcg-data 的 searchSellerListings + TcgCard（已支持 USD/JPY、售罄置灰）。
 * - 卖家头部基础信息（name/photo/ratings/num/verified）优先用详情页跳转时带过来的 query
 *   （详情已从 mdetail 拿到，省一次请求）；query 缺失时退化为只显能拿到的（匿名占位 + 在售数）。
 *
 * 不改任何价格/USD 核心逻辑，不碰中文/其它语言渲染。
 */
export function MercariSellerDesignA() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sellerId = params.id as string;
  const t = useTranslations("mercari");

  // 卖家头部基础信息：来自详情页跳转时的 query（优先）。缺失则只显能拿到的。
  const sellerName = searchParams.get("name") || "";
  const sellerPhoto = searchParams.get("photo") || "";
  const numSellItems = searchParams.get("num");
  const ratingGood = searchParams.get("good");
  const ratingNormal = searchParams.get("normal");
  const ratingBad = searchParams.get("bad");
  const isVerified = searchParams.get("verified") === "yes";

  const hasRatings =
    ratingGood !== null || ratingNormal !== null || ratingBad !== null;

  const [items, setItems] = useState<TcgCardItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // 拉该卖家在售列表。所有 setState 都放进异步回调（.then/.catch/.finally），
  // 不在 effect 体内同步 setState（遵守 husky 严规：禁 effect 同步 setState）。
  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!sellerId) {
        if (active) setLoading(false);
        return;
      }
      try {
        const res = await searchSellerListings(sellerId, page);
        if (!active) return;
        setItems(res.items);
        setTotalPages(res.totalPages);
        setFailed(false);
        // 拿不到任何在售 + 旧端未返回页数时，不当作硬失败：友好显示「无其它在售」。
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [sellerId, page]);

  const displayName = sellerName || t("sellerPage.anonymous");
  const numberFormatter = new Intl.NumberFormat("en-US");

  return (
    <main
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
    >
      {/* 顶部柔光 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        aria-hidden
        style={{
          background:
            "radial-gradient(55% 60% at 50% -10%, rgba(56,189,248,0.14), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-6">
        {/* Breadcrumb */}
        <nav className="mb-6 text-xs">
          <ol className="flex items-center gap-2 text-slate-500">
            <li>
              <Link href="/" className="transition-colors hover:text-cyan-300">
                {t("home")}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                href="/mercari"
                className="transition-colors hover:text-cyan-300"
              >
                Mercari
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="max-w-[220px] truncate text-slate-300">
              {displayName}
            </li>
          </ol>
        </nav>

        {/* 卖家头部 */}
        <header className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-[#0e131d] ring-1 ring-white/10">
              {sellerPhoto ? (
                <Image
                  src={sellerPhoto}
                  alt={displayName}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-slate-500">
                  {displayName[0] || "?"}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
                  {displayName}
                </h1>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">
                    <ShieldIcon className="size-3.5" />
                    {t("sellerPage.verified")}
                  </span>
                )}
              </div>

              {/* 评价（good/normal/bad）+ 在售数 */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                {hasRatings && (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-emerald-400" />
                      {t("sellerPage.ratingsGood")}:{" "}
                      <span className="font-medium tabular-nums text-slate-200">
                        {numberFormatter.format(Number(ratingGood ?? 0))}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-slate-400" />
                      {t("sellerPage.ratingsNormal")}:{" "}
                      <span className="font-medium tabular-nums text-slate-200">
                        {numberFormatter.format(Number(ratingNormal ?? 0))}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-rose-400" />
                      {t("sellerPage.ratingsBad")}:{" "}
                      <span className="font-medium tabular-nums text-slate-200">
                        {numberFormatter.format(Number(ratingBad ?? 0))}
                      </span>
                    </span>
                  </div>
                )}
                {numSellItems !== null && Number.isFinite(Number(numSellItems)) && (
                  <span className="text-slate-300">
                    {t("sellerPage.itemsOnSale", {
                      count: numberFormatter.format(Number(numSellItems)),
                    })}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 transition-colors hover:border-white/25 sm:self-center"
            >
              <svg
                className="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {t("sellerPage.backToItem")}
            </button>
          </div>
        </header>

        {/* 该卖家在售网格 */}
        <section className="mt-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
            {t("sellerPage.listingsTitle")}
          </h2>

          {loading ? (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <TcgCardSkeleton key={i} />
              ))}
            </div>
          ) : failed ? (
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-12 text-center text-sm text-slate-400">
              {t("sellerPage.loadFailed")}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-12 text-center text-sm text-slate-400">
              {t("sellerPage.empty")}
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                  <TcgCard key={item.goodsNo} item={item} />
                ))}
              </div>

              {/* 分页（旧端给了 totalPages 才显） */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("sellerPage.prev")}
                  </button>
                  <span className="text-sm text-slate-400">
                    {t("sellerPage.page", { page })}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("sellerPage.next")}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
