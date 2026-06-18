"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import {
  searchSellerListings,
  type TcgCardItem,
} from "@/components/home/tcg/tcg-data";
import {
  fetchJpyToCny,
  type ZhHomeItem,
} from "@/components/home/zh/zh-daigou-data";
import {
  ZhProductCard,
  ZhProductCardSkeleton,
} from "@/components/home/zh/ZhProductCard";

/**
 * 经典版（亮色暖调 / 中文）Mercari 卖家「其它在售」页正文。
 *
 * 面向非 en 语言（含 zh）渲染；en 仍由 MercariSellerDesignA（深色 TCG）渲染，互不影响。
 * 视觉贴 zh 导购首页（src/components/home/zh）：暖橙调、亮底、煤炉徽章 + ¥JPY 主价 + ≈元 辅价。
 * zh 站只显人民币，绝不显美元。
 *
 * 数据：
 * - 卖家在售网格 → 复用 tcg-data.searchSellerListings（GET /integrations/mercari/seller，代理旧 mericaris），
 *   不另造后端。归一出的 TcgCardItem 转成 ZhHomeItem（platform=mercari）后用 ZhProductCard 渲染，
 *   ≈元由 formatCnyApprox（在 ZhProductCard 内）按后台 jpyToCny 汇率计算；售罄置灰。
 * - 卖家头部基础信息（name/photo/score/num/verified）优先用详情页跳转带来的 query；缺失则友好退化。
 *
 * 所有 setState 都放进异步回调（.then/.catch/.finally），不在 effect 体内同步 setState（husky 严规）。
 */
export function MercariSellerClassic() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sellerId = params.id as string;

  // 卖家头部基础信息：来自详情页跳转时的 query（优先）。缺失则只显能拿到的。
  const sellerName = searchParams.get("name") || "";
  const sellerPhoto = searchParams.get("photo") || "";
  const numSellItems = searchParams.get("num");
  const sellerScore = searchParams.get("score");
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
  // 后台 CNY 汇率：用于 ≈元 辅价；拿不到则只显 ¥JPY、不显 ≈元（不崩、不显错币）。
  const [jpyToCny, setJpyToCny] = useState<number | null>(null);

  // 拉汇率（只拉一次）。
  useEffect(() => {
    let active = true;
    fetchJpyToCny()
      .then((rate) => {
        if (active) setJpyToCny(rate);
      })
      .catch(() => {
        if (active) setJpyToCny(null);
      });
    return () => {
      active = false;
    };
  }, []);

  // 拉该卖家在售列表。
  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!sellerId) {
        if (active) setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await searchSellerListings(sellerId, page);
        if (!active) return;
        setItems(res.items);
        setTotalPages(res.totalPages);
        setFailed(false);
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

  const displayName = sellerName || "该卖家";
  const numberFormatter = new Intl.NumberFormat("zh-CN");

  // TcgCardItem → ZhHomeItem（mercari），复用 zh 导购卡（¥JPY + ≈元 + 售罄置灰 + /zh/mercari/[id] 跳转）。
  const toZhItem = (item: TcgCardItem): ZhHomeItem => ({
    platform: "mercari",
    goodsNo: item.goodsNo,
    title: item.title,
    imageUrl: item.imageUrl,
    priceJpy: item.priceJpy,
    soldOut: item.soldOut,
  });

  return (
    <main className="min-h-screen bg-orange-50/40">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        {/* 面包屑 */}
        <nav className="mb-6 text-xs">
          <ol className="flex items-center gap-2 text-zinc-400">
            <li>
              <Link href="/" className="transition-colors hover:text-orange-500">
                首页
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                href="/mercari"
                className="transition-colors hover:text-orange-500"
              >
                煤炉
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="max-w-[220px] truncate text-zinc-600">
              {displayName}
            </li>
          </ol>
        </nav>

        {/* 卖家头部 */}
        <header className="overflow-hidden rounded-2xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-orange-100">
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
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-zinc-400">
                  {displayName[0] || "?"}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                  {displayName}
                </h1>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                    <svg
                      className="size-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    本人已认证
                  </span>
                )}
              </div>

              {/* 评价（好/普通/差）/ 评分 + 在售数 */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                {hasRatings ? (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-emerald-400" />
                      好评:{" "}
                      <span className="font-medium tabular-nums text-zinc-700">
                        {numberFormatter.format(Number(ratingGood ?? 0))}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-zinc-400" />
                      普通:{" "}
                      <span className="font-medium tabular-nums text-zinc-700">
                        {numberFormatter.format(Number(ratingNormal ?? 0))}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="size-2 rounded-full bg-rose-400" />
                      差评:{" "}
                      <span className="font-medium tabular-nums text-zinc-700">
                        {numberFormatter.format(Number(ratingBad ?? 0))}
                      </span>
                    </span>
                  </div>
                ) : (
                  sellerScore !== null &&
                  Number.isFinite(Number(sellerScore)) && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-amber-500">★</span>
                      评分:{" "}
                      <span className="font-medium tabular-nums text-zinc-700">
                        {sellerScore}
                      </span>
                    </span>
                  )
                )}
                {numSellItems !== null &&
                  Number.isFinite(Number(numSellItems)) && (
                    <span className="text-zinc-600">
                      在售 {numberFormatter.format(Number(numSellItems))} 件
                    </span>
                  )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-600 transition-colors hover:border-orange-300 hover:text-orange-500 sm:self-center"
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
              返回商品
            </button>
          </div>
        </header>

        {/* 该卖家在售网格 */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-zinc-900">该卖家其它在售</h2>

          {loading ? (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ZhProductCardSkeleton key={i} />
              ))}
            </div>
          ) : failed ? (
            <div className="mt-8 rounded-2xl border border-orange-100 bg-white px-6 py-12 text-center text-sm text-zinc-500">
              加载失败，请稍后重试。
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-orange-100 bg-white px-6 py-12 text-center text-sm text-zinc-500">
              该卖家暂无其它在售商品。
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                  <ZhProductCard
                    key={item.goodsNo}
                    item={toZhItem(item)}
                    jpyToCny={jpyToCny}
                  />
                ))}
              </div>

              {/* 分页（旧端给了 totalPages 才显） */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-600 transition-colors hover:border-orange-300 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    上一页
                  </button>
                  <span className="text-sm text-zinc-500">第 {page} 页</span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-600 transition-colors hover:border-orange-300 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    下一页
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
