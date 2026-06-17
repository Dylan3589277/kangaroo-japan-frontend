"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { useTranslations } from "next-intl";
import { spaceGrotesk } from "@/app/fonts";
import {
  CameraIcon,
  CartIcon,
  ShieldIcon,
  ShipIcon,
  TranslateIcon,
} from "@/components/home/tcg/icons";
import { TcgCard, TcgCardSkeleton } from "@/components/home/tcg/TcgCard";
import { searchMercariTcg, type TcgCardItem } from "@/components/home/tcg/tcg-data";

/**
 * 设计 A（深色高级感）英文 Mercari 商品详情页。
 *
 * 仅由 [lang]/mercari/[id]/page.tsx 在 locale === "en" 时渲染；其它语言仍渲染
 * 现有「经典版」MercariDetailClassic，互不影响。配色与新外壳（TcgHeader/Footer）
 * 及 cards 搜索页一致：石墨/深墨蓝近黑底 + 电光青 cyan-400 + Space Grotesk 展示字体。
 *
 * 数据/逻辑层与经典版完全一致（同一份取数、同一个 getMercariQuote 动态手续费、同一套
 * 售罄判定、Buy now → /checkout?type=mercari、Add to cart 写后端）。本组件只换皮，
 * 不改任何业务逻辑、不碰后端/支付/中文其它语言渲染。
 */

interface MercariDetail {
  goods_no: string;
  goods_name: string;
  price: number;
  price_rmb: number;
  rate: number;
  description: string;
  imgurls: string[];
  content: string;
  status: string;
  url: string;
  collect: boolean;
  cart: boolean;
  seller_info: {
    id: string;
    name: string;
    photo_url: string;
    score: number;
    num_sell_items: number;
    num_ratings?: number;
  };
  extras: { name: string; value: string }[];
  bid_count?: number;
  remain_time?: string;
}

export function MercariDetailDesignA() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "en";
  const id = params.id as string;
  const t = useTranslations("mercari");

  const [detail, setDetail] = useState<MercariDetail | null>(null);
  const [loading, setLoading] = useState(true);
  // 动态手续费（来自后端 quote → 旧 proxyconfirm，随后台/会员等级实时变）。
  // 未登录/报价失败时为 null：只展示商品价 + 「结算时计算」，绝不显示写死的固定值。
  const [feeJpy, setFeeJpy] = useState<number | null>(null);
  const [amountJpy, setAmountJpy] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [isInCart, setIsInCart] = useState(false);

  // 相关推荐（用真数据：按商品标题再搜一屏 Mercari 在售，复用首页/搜索页数据层）。
  const [related, setRelated] = useState<TcgCardItem[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.request(`/integrations/mercari/detail`, {
          method: "POST",
          body: { id },
        });
        if (!active) return;
        if (res.success && res.data) {
          const data = res.data as Record<string, unknown>;
          // Handle different response shapes
          const d = (data.detail || data.data || data) as MercariDetail;
          setDetail(d);
          setIsCollected(d.collect || false);
          setIsInCart(d.cart || false);
        }
      } catch (error) {
        console.error("Failed to fetch Mercari detail:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    // 拉动态手续费（需登录态 JWT）：成功则展示真实 feeJpy / amountJpy；未登录/失败
    // 保持 null，页面退化为「结算时计算」——绝不显示写死的固定手续费值。
    const fetchFee = async () => {
      try {
        const res = await api.getMercariQuote(id);
        if (!active) return;
        if (res.success && res.data && typeof res.data.feeJpy === "number") {
          setFeeJpy(res.data.feeJpy);
          setAmountJpy(
            typeof res.data.amountJpy === "number" ? res.data.amountJpy : null,
          );
        } else {
          setFeeJpy(null);
          setAmountJpy(null);
        }
      } catch {
        if (active) {
          setFeeJpy(null);
          setAmountJpy(null);
        }
      }
    };

    void fetchDetail();
    void fetchFee();

    return () => {
      active = false;
    };
  }, [id]);

  // 相关推荐：详情拿到后按标题取一屏在售（真数据），失败/空则整块隐藏。
  useEffect(() => {
    const title = detail?.goods_name;
    if (!title) return;

    let active = true;
    setRelatedLoading(true);
    void searchMercariTcg({ keyword: title, inStockOnly: true, limit: 8 })
      .then((items) => {
        if (!active) return;
        setRelated(items.filter((item) => item.goodsNo !== id));
      })
      .finally(() => {
        if (active) setRelatedLoading(false);
      });

    return () => {
      active = false;
    };
  }, [detail?.goods_name, id]);

  const copyLink = () => {
    if (detail?.url) {
      void navigator.clipboard.writeText(detail.url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const toggleCollect = async () => {
    try {
      const res = await api.request(`/integrations/mercari/collect`, {
        method: "POST",
        body: { id, action: isCollected ? "remove" : "add" },
      });
      if (res.success) {
        setIsCollected(!isCollected);
      }
    } catch {
      // ignore
    }
  };

  const toggleCart = async () => {
    try {
      const res = await api.request(`/integrations/mercari/cart`, {
        method: "POST",
        body: { id, action: isInCart ? "remove" : "add" },
      });
      if (res.success) {
        setIsInCart(!isInCart);
      }
    } catch {
      // ignore
    }
  };

  const requestInspection = () => {
    // 占位入口：与经典版「客服」入口一致——复制商品链接 + 跳到联系客服页。
    if (detail?.url) {
      void navigator.clipboard.writeText(detail.url);
    }
    router.push(`/${lang}/contact?type=mercari&id=${id}`);
  };

  if (loading) {
    return (
      <main
        className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
      >
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
      <main
        className={`${spaceGrotesk.variable} flex min-h-[60vh] flex-col items-center justify-center bg-[#0a0e16] px-4 text-center text-slate-200`}
      >
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

  const images = detail.imgurls || [];
  const soldOut =
    detail.status === "ITEM_STATUS_TRADING" || detail.status === "sold_out";
  const numberFormatter = new Intl.NumberFormat("en-US");
  const description = detail.content || detail.description || "";

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

      <div className="relative mx-auto max-w-6xl px-4 pb-36 pt-6">
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
              {detail.goods_name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          {/* 图廊 */}
          <div className="md:sticky md:top-20">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e131d]">
              {images.length > 0 ? (
                <Image
                  src={images[selectedImage] || images[0]}
                  alt={detail.goods_name}
                  fill
                  unoptimized
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-600">
                  {t("noImage")}
                </div>
              )}
              <span className="absolute left-3 top-3 inline-flex items-center rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 backdrop-blur">
                Mercari
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
                      alt={`${detail.goods_name} ${idx + 1}`}
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
              {detail.goods_name}
            </h1>

            {/* 价格区：权威价 + 动态手续费 + estimated 应付 + 人民币次要 */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              <div className="border-b border-white/[0.06] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t("designA.itemPrice")}
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl font-bold tabular-nums text-cyan-300">
                    JPY {numberFormatter.format(Number(detail.price))}
                  </span>
                  {Number(detail.price_rmb) > 0 && (
                    <span className="text-sm text-slate-500">
                      {t("designA.approxCny", {
                        amount: Number(detail.price_rmb).toFixed(0),
                      })}
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
                  <dt className="font-semibold text-white">
                    {t("designA.estimatedTotal")}
                  </dt>
                  <dd className="text-right">
                    <span className="text-xl font-bold tabular-nums text-cyan-300">
                      {amountJpy !== null
                        ? `JPY ${numberFormatter.format(amountJpy)}`
                        : t("serviceFeeAtCheckout")}
                    </span>
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                      {t("designA.estimated")}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* 卖家信息 */}
            {detail.seller_info && (
              <button
                type="button"
                onClick={() => {
                  if (detail.seller_info?.id) {
                    router.push(
                      `/${lang}/mercari/seller/${detail.seller_info.id}`,
                    );
                  }
                }}
                className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-cyan-400/30"
              >
                <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-[#0e131d]">
                  {detail.seller_info.photo_url ? (
                    <Image
                      src={detail.seller_info.photo_url}
                      alt={detail.seller_info.name}
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="44px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-slate-500">
                      {detail.seller_info.name?.[0] || "?"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    {detail.seller_info.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      {t("score")}: {detail.seller_info.score || "N/A"}
                    </span>
                    <span>
                      {t("items")}: {detail.seller_info.num_sell_items || 0}
                    </span>
                  </div>
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
              </button>
            )}

            {/* 卡况 / 规格徽章 */}
            {detail.extras && detail.extras.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {detail.extras.slice(0, 6).map((row, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300"
                  >
                    <span className="text-slate-500">{row.name}:</span>
                    <span className="font-medium text-slate-100">
                      {row.value}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* 信任徽章条 */}
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-3">
                <CameraIcon className="mx-auto size-5 text-cyan-300" />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {t("designA.trust.inspection")}
                </p>
              </div>
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

            {/* 次要操作：复制链接 / 收藏 / 验货占位 */}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 transition-colors hover:border-white/25"
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
                    strokeWidth={1.6}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
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
                <svg
                  className="size-4"
                  fill={isCollected ? "currentColor" : "none"}
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
                {isCollected ? t("favorited") : t("favorite")}
              </button>
              <button
                type="button"
                onClick={requestInspection}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
              >
                <CameraIcon className="size-4" />
                {t("designA.requestInspection")}
              </button>
            </div>
          </section>
        </div>

        {/* 描述（卖家原文 / 翻译） */}
        <section className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
            {t("details")}
          </h2>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <TranslateIcon className="size-3.5" />
            {t("translationNote")}
          </p>
          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            {description ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {description}
              </div>
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

        {/* 相关推荐（真数据，TcgCard 网格） */}
        {(relatedLoading || related.length > 0) && (
          <section className="mt-12">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
              {t("designA.relatedTitle")}
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {relatedLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TcgCardSkeleton key={i} />
                  ))
                : related.map((item) => (
                    <TcgCard key={item.goodsNo} item={item} />
                  ))}
            </div>
          </section>
        )}
      </div>

      {/* 底部操作条：Add to cart / Buy now（行为与经典版完全一致） */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0a0e16]/90 backdrop-blur-md">
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
            onClick={() =>
              router.push(`/${lang}/checkout?type=mercari&id=${id}`)
            }
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
