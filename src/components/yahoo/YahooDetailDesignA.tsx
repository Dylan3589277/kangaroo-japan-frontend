"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { spaceGrotesk } from "@/app/fonts";
import {
  CameraIcon,
  ShieldIcon,
  TranslateIcon,
} from "@/components/home/tcg/icons";
import { ImageLightbox } from "@/components/tcg/ImageLightbox";
import { TcgInfoBar } from "@/components/tcg/TcgInfoBar";
import { useChatLauncher } from "@/components/tcg/ChatProvider";
import { normalizeYahooDetail, type YahooDetail } from "./yahoo-data";
import { YahooRelatedDesignA } from "./YahooRelatedDesignA";

type YahooDetailDesignAProps = {
  goodsNo: string;
  locale: string;
};

/**
 * 设计 A（深色高级感）英文 Yahoo Auctions 商品详情页。
 *
 * 仅由 [lang]/yahoo/[goodsNo]/page.tsx 在 locale === "en" 时渲染；其它语言仍渲染
 * 现有经典版 YahooDetailPage（浅色），互不影响。配色与新外壳/cards 页对齐。
 *
 * 数据/逻辑层与经典版完全一致（同一份取数、同一套倒计时、同一份 read-only 边界：
 * 无出价输入、无提交、无写请求）。本组件只换皮，不改任何业务逻辑、不碰后端/支付。
 */
export function YahooDetailDesignA({ goodsNo, locale }: YahooDetailDesignAProps) {
  const t = useTranslations("yahoo");
  const { openWithProduct } = useChatLauncher();
  const [detail, setDetail] = useState<YahooDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    let active = true;

    void api
      .request<unknown>(
        `/yahoo/goods/${encodeURIComponent(goodsNo)}?lng=${encodeURIComponent(locale)}`,
      )
      .then((response) => {
        if (!active) return;
        if (!response.success) {
          setError(true);
          return;
        }
        const normalized = normalizeYahooDetail(response.data, goodsNo);
        setDetail(normalized);
        setError(!normalized);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [goodsNo, locale]);

  useEffect(() => {
    if (!detail?.endTimestamp) return;
    const timer = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [detail?.endTimestamp]);

  const numberFormatter = new Intl.NumberFormat("en-US");
  const gallery =
    detail?.images && detail.images.length > 0
      ? detail.images
      : detail?.imageUrl
        ? [detail.imageUrl]
        : [];
  const activeImage = gallery[activeImageIndex] ?? gallery[0];
  const remaining = detail?.endTimestamp
    ? formatRemaining(detail.endTimestamp - now, t)
    : detail?.remaining || t("remainingUnavailable");

  return (
    <main
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        aria-hidden
        style={{
          background:
            "radial-gradient(55% 60% at 50% -10%, rgba(56,189,248,0.14), transparent 60%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(300px,1fr)]">
            <div className="aspect-square w-full animate-pulse rounded-2xl bg-white/[0.05]" />
            <div className="space-y-5 pt-1">
              <div className="h-7 w-full animate-pulse rounded bg-white/[0.06]" />
              <div className="h-7 w-4/5 animate-pulse rounded bg-white/[0.06]" />
              <div className="mt-8 h-20 w-full animate-pulse rounded-2xl bg-white/[0.05]" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-white/[0.06]" />
            </div>
          </div>
        ) : error || !detail ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-16 text-center">
            <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
              {t("detailUnavailable")}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {t("detailUnavailableHint")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(300px,1fr)] md:items-start md:gap-8">
              <div className="md:sticky md:top-20">
                <div className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e131d]">
                  {activeImage && !imageBroken ? (
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      aria-label={t("designA.zoom.open")}
                      className="absolute inset-0 cursor-zoom-in"
                    >
                      <Image
                        src={activeImage}
                        alt={detail.title}
                        fill
                        priority
                        unoptimized
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        onError={() => setImageBroken(true)}
                      />
                      <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-slate-200 backdrop-blur transition-opacity group-hover:bg-black/70">
                        <svg className="size-3.5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <circle cx="11" cy="11" r="7" strokeWidth={1.6} />
                          <path strokeLinecap="round" strokeWidth={1.6} d="m21 21-4.3-4.3M11 8v6M8 11h6" />
                        </svg>
                        {t("designA.zoom.open")}
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-600">
                      {t("noImage")}
                    </div>
                  )}
                  <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 backdrop-blur">
                    Yahoo Auctions
                  </span>
                </div>

                {gallery.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {gallery.map((img, index) => (
                      <button
                        key={`${img}-${index}`}
                        type="button"
                        onClick={() => {
                          setActiveImageIndex(index);
                          setImageBroken(false);
                        }}
                        className={`relative size-14 shrink-0 overflow-hidden rounded-lg ring-2 transition-colors ${
                          index === activeImageIndex
                            ? "ring-cyan-400"
                            : "ring-transparent hover:ring-white/20"
                        }`}
                      >
                        <Image
                          src={img}
                          alt={`${detail.title} ${index + 1}`}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="56px"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <section className="flex flex-col">
                <h1 className="font-[family-name:var(--font-display)] text-xl font-bold leading-8 tracking-tight text-white sm:text-2xl">
                  {detail.titleTranslated || detail.title}
                </h1>
                {(detail.titleJa ||
                  (detail.titleTranslated && detail.title)) && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                    {detail.titleJa || detail.title}
                  </p>
                )}
                {detail.titleTranslated && (
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <TranslateIcon className="size-3.5" />
                    {t("translationNote")}
                  </p>
                )}

                {/* 价格盒 */}
                <div className="mt-7 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                  <div className="border-b border-white/[0.06] px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {t("currentPrice")}
                    </p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-3">
                      <p className="text-3xl font-bold tabular-nums text-cyan-300">
                        {detail.currentPrice === undefined
                          ? t("priceUnavailable")
                          : `JPY ${numberFormatter.format(detail.currentPrice)}`}
                      </p>
                      {detail.priceCnyApprox !== undefined && (
                        <span className="text-sm text-slate-500">
                          {t("approxCny", {
                            amount: numberFormatter.format(
                              detail.priceCnyApprox,
                            ),
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {(detail.buyNowPrice !== undefined ||
                    detail.startPrice !== undefined ||
                    detail.bidCount !== undefined) && (
                    <div className="flex flex-wrap divide-x divide-white/[0.06] text-sm">
                      {detail.buyNowPrice !== undefined && (
                        <div className="flex-1 px-5 py-3">
                          <p className="text-[11px] text-slate-500">
                            {t("buyNowPrice")}
                          </p>
                          <p className="mt-0.5 font-semibold tabular-nums text-cyan-200">
                            {`JPY ${numberFormatter.format(detail.buyNowPrice)}`}
                          </p>
                        </div>
                      )}
                      {detail.startPrice !== undefined && (
                        <div className="flex-1 px-5 py-3">
                          <p className="text-[11px] text-slate-500">
                            {t("startPrice")}
                          </p>
                          <p className="mt-0.5 font-semibold tabular-nums text-slate-200">
                            {`JPY ${numberFormatter.format(detail.startPrice)}`}
                          </p>
                        </div>
                      )}
                      {detail.bidCount !== undefined && (
                        <div className="flex-1 px-5 py-3">
                          <p className="text-[11px] text-slate-500">
                            {t("bidCountLabel")}
                          </p>
                          <p className="mt-0.5 font-semibold tabular-nums text-slate-200">
                            {t("bidCount", { count: detail.bidCount })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* TCG 信息栏（解析卡况/套系/稀有度 + PriceCharting 外链），放价格盒下方 */}
                <TcgInfoBar
                  name={detail.titleJa || detail.title}
                  description={detail.description}
                  extras={detail.extras}
                  searchName={detail.titleJa || detail.title}
                />

                {/* 倒计时 */}
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4">
                  <svg
                    className="size-5 shrink-0 text-cyan-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="9" strokeWidth={1.6} />
                    <path strokeLinecap="round" strokeWidth={1.6} d="M12 7v5l3 2" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {t("remainingTime")}
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-white">
                      {remaining}
                    </p>
                  </div>
                </div>

                {/* 卖家卡 */}
                {(detail.sellerName ||
                  detail.sellerLocation ||
                  detail.sellerRating ||
                  detail.sellerRatingCount !== undefined) && (
                  <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                    {detail.sellerName && (
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-lg font-bold text-cyan-300">
                        {detail.sellerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {detail.sellerName && (
                        <p className="truncate font-semibold text-slate-100">
                          {detail.sellerName}
                        </p>
                      )}
                      {detail.sellerLocation && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {t("sellerLocation", {
                            location: detail.sellerLocation,
                          })}
                        </p>
                      )}
                    </div>
                    {(detail.sellerRating ||
                      detail.sellerRatingCount !== undefined) && (
                      <div className="shrink-0 text-right">
                        {detail.sellerRating && (
                          <p className="font-bold text-teal-300">
                            {t("sellerRatingValue", {
                              percent: detail.sellerRating,
                            })}
                          </p>
                        )}
                        {detail.sellerRatingCount !== undefined && (
                          <p className="text-xs text-slate-500">
                            {t("sellerRatingCount", {
                              count: detail.sellerRatingCount,
                            })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 规格 */}
                {(detail.extras?.length ||
                  detail.condition ||
                  detail.domesticShipping) && (
                  <div className="mt-7">
                    <h2 className="mb-3 text-sm font-semibold text-slate-200">
                      {t("specs")}
                    </h2>
                    <dl className="overflow-hidden rounded-2xl border border-white/[0.08] text-sm">
                      {detail.condition && (
                        <div className="flex gap-3 border-b border-white/[0.06] px-4 py-2.5 last:border-b-0">
                          <dt className="w-24 shrink-0 text-slate-500">
                            {t("condition")}
                          </dt>
                          <dd className="min-w-0 flex-1 break-words text-slate-200">
                            {detail.condition}
                          </dd>
                        </div>
                      )}
                      {detail.domesticShipping && (
                        <div className="flex gap-3 border-b border-white/[0.06] px-4 py-2.5 last:border-b-0">
                          <dt className="w-24 shrink-0 text-slate-500">
                            {t("domesticShipping")}
                          </dt>
                          <dd className="min-w-0 flex-1 break-words text-slate-200">
                            {detail.domesticShipping}
                          </dd>
                        </div>
                      )}
                      {detail.extras?.map((spec, index) => (
                        <div
                          key={`${spec.name}-${index}`}
                          className="flex gap-3 border-b border-white/[0.06] px-4 py-2.5 last:border-b-0"
                        >
                          <dt className="w-24 shrink-0 text-slate-500">
                            {spec.name}
                          </dt>
                          <dd className="min-w-0 flex-1 break-words text-slate-200">
                            {spec.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {/* 描述（原文 / 翻译） */}
                {(detail.descriptionTranslated || detail.description) && (
                  <div className="mt-7">
                    <h2 className="mb-2 text-sm font-semibold text-slate-200">
                      {t("description")}
                    </h2>
                    {detail.descriptionTranslated && (
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <TranslateIcon className="size-3.5" />
                        {t("translationNote")}
                      </p>
                    )}
                    <p className="whitespace-pre-line rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-7 text-slate-300">
                      {detail.descriptionTranslated || detail.description}
                    </p>
                    {detail.descriptionTranslated && detail.description && (
                      <details className="mt-2 text-xs text-slate-400">
                        <summary className="cursor-pointer select-none transition-colors hover:text-cyan-300">
                          {t("showOriginal")}
                        </summary>
                        <p className="mt-2 whitespace-pre-line rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 leading-7">
                          {detail.description}
                        </p>
                      </details>
                    )}
                  </div>
                )}

                {/* 出价记录 — read-only */}
                {detail.bidHistory && detail.bidHistory.length > 0 && (
                  <div className="mt-7">
                    <h2 className="mb-2 text-sm font-semibold text-slate-200">
                      {t("bidHistory")}
                    </h2>
                    <ul className="divide-y divide-white/[0.06]">
                      {detail.bidHistory.map((entry, index) => (
                        <li
                          key={`${entry.bidder}-${index}`}
                          className="flex items-center justify-between gap-3 py-2 text-sm"
                        >
                          <span className="text-slate-500">{entry.bidder}</span>
                          <span
                            className={`font-medium tabular-nums ${
                              index === 0 ? "text-cyan-300" : "text-slate-300"
                            }`}
                          >
                            {entry.amountJpy === undefined
                              ? ""
                              : `JPY ${numberFormatter.format(entry.amountJpy)}`}
                          </span>
                          {entry.time && (
                            <span className="shrink-0 text-xs text-slate-500">
                              {entry.time}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-6 flex items-start gap-1.5 text-xs text-slate-500">
                  <ShieldIcon className="mt-px size-3.5 shrink-0" />
                  {t("feeNotice")}
                </p>

                {/* 拍照检查介绍入口（不弹联系客服，跳介绍页） */}
                <Link
                  href="/photo-inspection"
                  className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 transition-colors hover:border-cyan-400/40"
                >
                  <CameraIcon className="size-5 shrink-0 text-cyan-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-100">
                      {t("designA.inspectionCta.title")}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t("designA.inspectionCta.subtitle")}
                    </p>
                  </div>
                  <svg
                    className="size-4 shrink-0 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </section>
            </div>

            {/* 相关商品 */}
            <YahooRelatedDesignA goodsNo={goodsNo} locale={locale} />
          </>
        )}
      </div>

      {/* 图片放大查看（纯前端 lightbox，z-[70] 高于 TcgHeader） */}
      {detail && gallery.length > 0 && (
        <ImageLightbox
          images={gallery}
          index={activeImageIndex}
          alt={detail.title}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={(next) => {
            setActiveImageIndex(next);
            setImageBroken(false);
          }}
          labels={{
            close: t("designA.zoom.close"),
            prev: t("designA.zoom.prev"),
            next: t("designA.zoom.next"),
            zoomIn: t("designA.zoom.zoomIn"),
            zoomOut: t("designA.zoom.zoomOut"),
            reset: t("designA.zoom.reset"),
            hint: t("designA.zoom.hint"),
          }}
        />
      )}

      {/* 底部操作条 — read-only 边界：无出价输入、无提交、无写请求（与经典版一致）。 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0a0e16]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            aria-disabled="true"
            className="inline-flex size-12 shrink-0 cursor-default flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 text-[10px] text-slate-500"
          >
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{t("favorite")}</span>
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-12 flex-1 cursor-not-allowed flex-col items-center justify-center gap-0 rounded-xl border border-white/10 text-sm text-slate-400 opacity-70"
          >
            <span>{t("onlineBid")}</span>
            <span className="text-[10px] font-normal opacity-80">
              {t("comingSoon")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!detail) return;
              openWithProduct({
                title: detail.titleTranslated || detail.title,
                image: detail.imageUrl ?? detail.images?.[0],
                priceJpy: detail.currentPrice,
                platform: "yahoo",
                // Yahoo 暂无自助结算：CTA 走「联系客服代拍」现有 contact 路由。
                href: `/${locale}/contact?type=yahoo&id=${goodsNo}`,
              });
            }}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-cyan-400 text-base font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
          >
            {t("contactService")}
          </button>
        </div>
      </div>
    </main>
  );
}

function formatRemaining(
  seconds: number,
  t: ReturnType<typeof useTranslations<"yahoo">>,
) {
  if (seconds <= 0) return t("ended");

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;

  if (days > 0) {
    return t("countdownDays", { days, hours, minutes });
  }
  if (hours > 0) {
    return t("countdownHours", { hours, minutes, seconds: remainingSeconds });
  }
  return t("countdownMinutes", {
    minutes,
    seconds: remainingSeconds,
  });
}
