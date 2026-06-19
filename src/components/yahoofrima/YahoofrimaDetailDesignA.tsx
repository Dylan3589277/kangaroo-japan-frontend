"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { spaceGrotesk } from "@/app/fonts";
import {
  CameraIcon,
  CartIcon,
  ShieldIcon,
  ShipIcon,
} from "@/components/home/tcg/icons";
import { ImageLightbox } from "@/components/tcg/ImageLightbox";
import { useChatLauncher } from "@/components/tcg/ChatProvider";
import { MessageCircle } from "lucide-react";
import { getYahoofrimaDetail, getYahoofrimaQuote } from "@/lib/api/yahoofrima";
import type { MarketplaceItem } from "@/lib/api/yahoofrima";

/**
 * 设计 A（深色高级感）英文 PayPayフリマ 商品详情页。
 * en locale 渲染。显美元，TCG quote（tcg=true）。
 * 视觉严格对齐 MercariDetailDesignA：石墨/深墨蓝底 + 电光青 cyan-400 + Space Grotesk。
 * 来源标签显「PayPay Frima」。
 */
export function YahoofrimaDetailDesignA() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "en";
  const id = params.id as string;
  const t = useTranslations("yahoofrima");
  const { openWithProduct } = useChatLauncher();

  const [detail, setDetail] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [feeJpy, setFeeJpy] = useState<number | null>(null);
  const [amountJpy, setAmountJpy] = useState<number | null>(null);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [amountUsd, setAmountUsd] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [isInCart, setIsInCart] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await getYahoofrimaDetail(id);
        if (!active) return;
        if (res.success && res.data) {
          setDetail(res.data as MarketplaceItem);
        }
      } catch (error) {
        console.error("Failed to fetch Yahoofrima detail:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    const fetchFee = async () => {
      try {
        const res = await getYahoofrimaQuote(id, { tcg: true });
        if (!active) return;
        if (res.success && res.data && typeof res.data.feeJpy === "number") {
          setFeeJpy(res.data.feeJpy);
          setAmountJpy(typeof res.data.amountJpy === "number" ? res.data.amountJpy : null);
          setPriceUsd(typeof res.data.priceUsd === "number" ? res.data.priceUsd : null);
          setAmountUsd(typeof res.data.amountUsd === "number" ? res.data.amountUsd : null);
        } else {
          setFeeJpy(null);
          setAmountJpy(null);
          setPriceUsd(null);
          setAmountUsd(null);
        }
      } catch {
        if (active) {
          setFeeJpy(null);
          setAmountJpy(null);
          setPriceUsd(null);
          setAmountUsd(null);
        }
      }
    };

    void fetchDetail();
    void fetchFee();

    return () => {
      active = false;
    };
  }, [id]);

  const copyLink = () => {
    if (detail?.source_url) {
      void navigator.clipboard.writeText(detail.source_url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const toggleCollect = async () => {
    try {
      const { api } = await import("@/lib/api");
      const res = await api.request(`/integrations/yahoofrima/collect`, {
        method: "POST",
        body: { id, action: isCollected ? "remove" : "add" },
      });
      if (res.success) setIsCollected(!isCollected);
    } catch {
      // ignore
    }
  };

  const toggleCart = async () => {
    try {
      const { api } = await import("@/lib/api");
      const res = await api.request(`/integrations/yahoofrima/cart`, {
        method: "POST",
        body: { id, action: isInCart ? "remove" : "add" },
      });
      if (res.success) setIsInCart(!isInCart);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <main className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}>
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-square w-full animate-pulse rounded-2xl bg-white/[0.05]" />
            <div className="space-y-4">
              <div className="h-8 w-3/4 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-6 w-1/2 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-28 w-full animate-pulse rounded-2xl bg-white/[0.05]" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-white/[0.06]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className={`${spaceGrotesk.variable} flex min-h-[60vh] flex-col items-center justify-center bg-[#0a0e16] px-4 text-center text-slate-200`}>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          {t("emptyTitle")}
        </h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-cyan-400 px-5 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
        >
          {t("emptyBack")}
        </button>
      </main>
    );
  }

  const images = detail.images || [];
  const soldOut = detail.status === "sold_out" || detail.status === "ITEM_STATUS_TRADING";
  const numberFormatter = new Intl.NumberFormat("en-US");

  // Price USD: prefer detail.price_usd, fall back to priceUsd from quote
  const itemPriceUsd =
    typeof detail.price_usd === "number" ? detail.price_usd : priceUsd;

  return (
    <main className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}>
      {/* 顶部柔光 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60"
        aria-hidden
        style={{
          background:
            "radial-gradient(55% 60% at 50% -10%, rgba(56,189,248,0.14), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-36 pt-6 md:pb-12">
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
              <Link href="/yahoofrima" className="transition-colors hover:text-cyan-300">
                PayPay Frima
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="max-w-[220px] truncate text-slate-300">{detail.title}</li>
          </ol>
        </nav>

        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          {/* 图廊 */}
          <div className="md:sticky md:top-20">
            <div className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e131d]">
              {images.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  aria-label={t("designA.zoom.open")}
                  className="absolute inset-0 cursor-zoom-in"
                >
                  <Image
                    src={images[selectedImage] || images[0]}
                    alt={detail.title}
                    fill
                    unoptimized
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                  <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-slate-200 backdrop-blur">
                    <svg className="size-3.5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <circle cx="11" cy="11" r="7" strokeWidth={1.6} />
                      <path strokeLinecap="round" strokeWidth={1.6} d="m21 21-4.3-4.3M11 8v6M8 11h6" />
                    </svg>
                    {t("designA.zoom.open")}
                  </span>
                </button>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-600">
                  {t("noImage")}
                </div>
              )}
              <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 backdrop-blur">
                PayPay Frima
              </span>
              {soldOut && (
                <span className="absolute right-3 top-3 inline-flex items-center rounded-md bg-rose-500/85 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  {t("sold")}
                </span>
              )}
            </div>

            {/* 缩略图 */}
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`relative size-16 shrink-0 overflow-hidden rounded-lg ring-2 transition-colors ${
                      selectedImage === idx
                        ? "ring-cyan-400"
                        : "ring-transparent hover:ring-white/20"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${detail.title} ${idx + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 信息区 */}
          <section className="flex flex-col">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-snug tracking-tight text-white md:text-3xl">
              {detail.title}
            </h1>

            {/* 价格区 */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              <div className="border-b border-white/[0.06] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t("designA.itemPrice")}
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl font-bold tabular-nums text-cyan-300">
                    JPY {numberFormatter.format(Number(detail.price_jpy))}
                  </span>
                  {itemPriceUsd !== null && itemPriceUsd > 0 && (
                    <span className="text-sm text-slate-500">
                      {t("designA.approxUsd", { amount: itemPriceUsd.toFixed(2) })}
                    </span>
                  )}
                </div>
              </div>

              <dl className="divide-y divide-white/[0.06] text-sm">
                <div className="flex items-center justify-between px-5 py-3">
                  <dt className="text-slate-400">{t("serviceFee")}</dt>
                  <dd className="font-medium tabular-nums text-slate-200">
                    {feeJpy !== null
                      ? `JPY ${numberFormatter.format(feeJpy)}`
                      : t("serviceFeeAtCheckout")}
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                      {t("designA.estimated")}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <dt className="text-slate-400">{t("internationalShipping")}</dt>
                  <dd className="text-right text-xs text-slate-400">
                    {t("internationalShippingDesc")}
                  </dd>
                </div>
                <div className="flex items-center justify-between bg-cyan-400/[0.04] px-5 py-4">
                  <dt className="font-semibold text-white">{t("designA.estimatedTotal")}</dt>
                  <dd className="text-right">
                    <div>
                      <span className="text-xl font-bold tabular-nums text-cyan-300">
                        {amountJpy !== null
                          ? `JPY ${numberFormatter.format(amountJpy)}`
                          : t("serviceFeeAtCheckout")}
                      </span>
                      <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                        {t("designA.estimated")}
                      </span>
                    </div>
                    {amountJpy !== null && amountUsd !== null && amountUsd > 0 && (
                      <div className="mt-0.5 text-xs text-slate-500">
                        {t("designA.approxUsd", { amount: amountUsd.toFixed(2) })}
                      </div>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* 卖家信息 */}
            {detail.seller && (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-[#0e131d]">
                  {detail.seller.avatar_url ? (
                    <Image
                      src={detail.seller.avatar_url}
                      alt={detail.seller.name}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="44px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-500">
                      {detail.seller.name?.[0] || "?"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {detail.seller.name}
                  </p>
                  {(() => {
                    const hasRatingData =
                      detail.seller.rating_total != null ||
                      detail.seller.rating_good_ratio != null ||
                      detail.seller.rating != null;
                    const ratingTotal = detail.seller.rating_total ?? 0;
                    const goodRatio = detail.seller.rating_good_ratio ?? 0;
                    return (
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                        {hasRatingData ? (
                          detail.seller.rating_total !== undefined ? (
                            <>
                              <span>{t("designA.ratingTotal", { count: ratingTotal })}</span>
                              <span>{t("designA.ratingGoodRatio", { ratio: goodRatio })}</span>
                            </>
                          ) : (
                            <span>{t("score")}: {detail.seller.rating}</span>
                          )
                        ) : (
                          <span className="text-slate-600">{t("designA.noRating")}</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* 规格/附加服务徽章 */}
            {detail.additional_services && detail.additional_services.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {detail.additional_services.map((svc, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300"
                  >
                    {svc}
                  </span>
                ))}
              </div>
            )}

            {/* 信任徽章条 */}
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Link
                href="/photo-inspection"
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-3 transition-colors hover:border-cyan-400/40"
              >
                <CameraIcon className="mx-auto size-5 text-cyan-300" />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {t("designA.trust.inspection")}
                </p>
              </Link>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-3">
                <ShieldIcon className="mx-auto size-5 text-cyan-300" />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {t("designA.trust.protection")}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-3">
                <ShipIcon className="mx-auto size-5 text-cyan-300" />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {t("designA.trust.consolidate")}
                </p>
              </div>
            </div>

            {/* 次要操作 */}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 transition-colors hover:border-white/25"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copied ? t("copied") : t("copyLink")}
              </button>
              <button
                type="button"
                onClick={toggleCollect}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm transition-colors ${
                  isCollected
                    ? "border-rose-400/40 bg-rose-500/10 text-rose-300"
                    : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/25"
                }`}
              >
                <svg className="size-4" fill={isCollected ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {isCollected ? t("favorited") : t("favorite")}
              </button>
              <Link
                href="/photo-inspection"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
              >
                <CameraIcon className="size-4" />
                {t("designA.requestInspection")}
              </Link>
              <button
                type="button"
                onClick={() =>
                  openWithProduct({
                    title: detail.title,
                    image: detail.images?.[0],
                    priceJpy: Number(detail.price_jpy),
                    platform: "mercari",
                    href: `/${lang}/checkout?type=yahoofrima&id=${id}`,
                  })
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
              >
                <MessageCircle className="size-4" />
                {t("askThisItem")}
              </button>
            </div>

            {/* 主操作（桌面端内联） */}
            <div className="mt-5 hidden gap-3 md:flex">
              <button
                type="button"
                onClick={toggleCart}
                disabled={soldOut}
                className={`inline-flex h-12 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isInCart
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                    : "border-white/15 bg-white/[0.04] text-slate-100 hover:border-cyan-400/40"
                }`}
              >
                {isInCart ? t("removeFromCart") : t("addToCart")}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/${lang}/checkout?type=yahoofrima&id=${id}`)}
                disabled={soldOut}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-cyan-400 text-base font-semibold text-[#06121b] transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {soldOut ? t("sold") : t("buyNow")}
              </button>
            </div>
          </section>
        </div>

        {/* 描述 */}
        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
            {t("details")}
          </h2>
          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            {detail.descriptionTranslated ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {detail.descriptionTranslated}
              </p>
            ) : detail.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {detail.description}
              </p>
            ) : (
              <p className="text-sm text-slate-500">{t("noDescription")}</p>
            )}
          </div>

          {/* 购物须知 */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-slate-400">
              {t("shoppingNote1")}
            </p>
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-slate-400">
              {t("shoppingNote2")}
            </p>
          </div>
        </section>
      </div>

      {/* Lightbox */}
      {images.length > 0 && (
        <ImageLightbox
          images={images}
          index={selectedImage}
          alt={detail.title}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setSelectedImage}
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

      {/* 底部吸底（移动端） */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0a0e16]/90 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push(`/${lang}/cart`)}
            className="inline-flex size-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 text-[10px] text-slate-300 transition-colors hover:border-white/25"
          >
            <CartIcon className="size-5" />
            <span>{t("cart")}</span>
          </button>
          <button
            type="button"
            onClick={toggleCart}
            disabled={soldOut}
            className={`inline-flex h-12 flex-1 items-center justify-center rounded-xl border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isInCart
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                : "border-white/15 bg-white/[0.04] text-slate-100 hover:border-cyan-400/40"
            }`}
          >
            {isInCart ? t("removeFromCart") : t("addToCart")}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/${lang}/checkout?type=yahoofrima&id=${id}`)}
            disabled={soldOut}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-cyan-400 text-base font-semibold text-[#06121b] transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {soldOut ? t("sold") : t("buyNow")}
          </button>
        </div>
      </div>
    </main>
  );
}
