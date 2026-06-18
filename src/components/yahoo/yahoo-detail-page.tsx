"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Clock3, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatLauncher } from "@/components/tcg/ChatProvider";
import { ImageLightbox } from "@/components/tcg/ImageLightbox";
import { TcgInfoBarClassic } from "@/components/tcg/TcgInfoBarClassic";
import { normalizeYahooDetail, type YahooDetail } from "./yahoo-data";
import { YahooBidModal } from "./YahooBidModal";
import { YahooRelated } from "./yahoo-related";
import {
  URGENCY_COUNTDOWN_CLASS,
  urgencyFromTimestamp,
} from "./yahoo-urgency";

type YahooDetailPageProps = {
  goodsNo: string;
  locale: string;
};

export function YahooDetailPage({
  goodsNo,
  locale,
}: YahooDetailPageProps) {
  const t = useTranslations("yahoo");
  const router = useRouter();
  const { openWithProduct } = useChatLauncher();
  const { isAuthenticated } = useAuthStore();
  const [detail, setDetail] = useState<YahooDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [bidOpen, setBidOpen] = useState(false);
  // 复制链接「已复制」提示的复位定时器，卸载时清掉避免 setState after unmount。
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setIsCollected(normalized?.collect ?? false);
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

  // 卸载时清掉「已复制」复位定时器。
  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  // 复制 Yahoo 拍卖原始链接（与站内既有口径一致：page.auctions 形式）。
  const copyLink = () => {
    const url = `https://auctions.yahoo.co.jp/jp/auction/${goodsNo}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  // 收藏：复用通用 /users/docollect（shop=yahoo），与 Amazon 详情同一后端端点。
  // 未登录先跳登录。后端 fail 时不翻转本地态。
  const toggleCollect = async () => {
    if (!isAuthenticated) {
      router.push(`/${locale}/login`);
      return;
    }
    try {
      const res = await api.request("/users/docollect", {
        method: "POST",
        body: { goods_no: goodsNo, shop: "yahoo" },
      });
      if (res.success) {
        setIsCollected((prev) => !prev);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!detail?.endTimestamp) return;
    const timer = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [detail?.endTimestamp]);

  const numberFormatter = new Intl.NumberFormat(locale);
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
  const urgency = urgencyFromTimestamp(detail?.endTimestamp, now);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 sm:px-6 lg:px-8 md:pb-10">
      {loading ? (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(300px,1fr)]">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-5 pt-1">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="mt-8 h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ) : error || !detail ? (
        <div className="rounded-2xl border bg-card px-4 py-16 text-center">
          <h1 className="text-lg font-semibold">{t("detailUnavailable")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("detailUnavailableHint")}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(300px,1fr)] md:items-start md:gap-8">
            <div className="md:sticky md:top-6">
              <div className="group relative aspect-square overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/10">
                {activeImage && !imageBroken ? (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    aria-label={t("zoom.open")}
                    className="absolute inset-0 cursor-zoom-in"
                  >
                    <Image
                      src={activeImage}
                      alt={detail.title}
                      fill
                      priority
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      onError={() => setImageBroken(true)}
                    />
                    <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur transition-opacity group-hover:bg-black/70">
                      <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <circle cx="11" cy="11" r="7" strokeWidth={1.6} />
                        <path strokeLinecap="round" strokeWidth={1.6} d="m21 21-4.3-4.3M11 8v6M8 11h6" />
                      </svg>
                      {t("zoom.open")}
                    </span>
                  </button>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t("noImage")}
                  </div>
                )}
              </div>

              {/* Thumbnail strip — only when there is more than one image. */}
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
                          ? "ring-orange-500"
                          : "ring-transparent hover:ring-foreground/20"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${detail.title} ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <section className="flex flex-col">
              <h1 className="text-xl leading-8 font-semibold tracking-tight sm:text-2xl">
                {detail.titleTranslated || detail.title}
              </h1>
              {/* 原日文标题作为副标题：优先 titleJa，回退到 title（当译文已替换主标题）。 */}
              {(detail.titleJa ||
                (detail.titleTranslated && detail.title)) && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {detail.titleJa || detail.title}
                </p>
              )}
              {detail.titleTranslated && (
                <p className="mt-1 text-[11px] text-muted-foreground/80">
                  {t("translationNote")}
                </p>
              )}

              <div className="mt-7 overflow-hidden rounded-2xl border">
                <div className="bg-orange-50 px-4 py-4 dark:bg-orange-950/30">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400">
                    {t("currentPrice")}
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-3">
                    <p className="text-3xl font-bold tracking-tight tabular-nums text-orange-600">
                      {detail.currentPrice === undefined
                        ? t("priceUnavailable")
                        : `JPY ${numberFormatter.format(detail.currentPrice)}`}
                    </p>
                    {detail.priceCnyApprox !== undefined && (
                      <span className="text-sm text-orange-700 dark:text-orange-400">
                        {t("approxCny", {
                          amount: numberFormatter.format(detail.priceCnyApprox),
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* 价格盒下半区：一口价 / 起拍价 / 出价次数，逐格判空 */}
                {(detail.buyNowPrice !== undefined ||
                  detail.startPrice !== undefined ||
                  detail.bidCount !== undefined) && (
                  <div className="flex flex-wrap divide-x border-t text-sm">
                    {detail.buyNowPrice !== undefined && (
                      <div className="flex-1 px-4 py-3">
                        <p className="text-[11px] text-muted-foreground">
                          {t("buyNowPrice")}
                        </p>
                        <p className="mt-0.5 font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                          {`JPY ${numberFormatter.format(detail.buyNowPrice)}`}
                        </p>
                      </div>
                    )}
                    {detail.startPrice !== undefined && (
                      <div className="flex-1 px-4 py-3">
                        <p className="text-[11px] text-muted-foreground">
                          {t("startPrice")}
                        </p>
                        <p className="mt-0.5 font-semibold tabular-nums">
                          {`JPY ${numberFormatter.format(detail.startPrice)}`}
                        </p>
                      </div>
                    )}
                    {detail.bidCount !== undefined && (
                      <div className="flex-1 px-4 py-3">
                        <p className="text-[11px] text-muted-foreground">
                          {t("bidCountLabel")}
                        </p>
                        <p className="mt-0.5 font-semibold tabular-nums">
                          {t("bidCount", { count: detail.bidCount })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TCG 信息栏（卡况/套系/稀有度 + PriceCharting 外链）。复用与设计 A 同一份
                  解析逻辑，浅色皮；雅虎多为杂货解析不出即整块不渲染。 */}
              <TcgInfoBarClassic
                name={detail.titleJa || detail.title}
                description={detail.description}
                extras={detail.extras}
                searchName={detail.titleJa || detail.title}
              />

              <div
                className={`mt-5 flex items-center gap-3 rounded-xl px-4 py-4 ${URGENCY_COUNTDOWN_CLASS[urgency]}`}
              >
                <Clock3 className="size-5 shrink-0" />
                <div>
                  <p className="text-xs font-medium opacity-80">
                    {t("remainingTime")}
                  </p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums">
                    {remaining}
                  </p>
                </div>
              </div>

              {/* 卖家卡 — 名 + 所在地 + 好评率 + 评价件数。整块判空。 */}
              {(detail.sellerName ||
                detail.sellerLocation ||
                detail.sellerRating ||
                detail.sellerRatingCount !== undefined) && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border px-4 py-3">
                  {detail.sellerName && (
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-lg font-bold text-orange-600 dark:bg-orange-950/30">
                      {detail.sellerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {detail.sellerName && (
                      <p className="truncate font-semibold">
                        {detail.sellerName}
                      </p>
                    )}
                    {detail.sellerLocation && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t("sellerLocation", { location: detail.sellerLocation })}
                      </p>
                    )}
                  </div>
                  {(detail.sellerRating ||
                    detail.sellerRatingCount !== undefined) && (
                    <div className="shrink-0 text-right">
                      {detail.sellerRating && (
                        <p className="font-bold text-teal-700 dark:text-teal-400">
                          {t("sellerRatingValue", {
                            percent: detail.sellerRating,
                          })}
                        </p>
                      )}
                      {detail.sellerRatingCount !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          {t("sellerRatingCount", {
                            count: detail.sellerRatingCount,
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 规格参数表 — extras 逐行；附加成色/日本运费（缺失不渲染）。 */}
              {(detail.extras?.length ||
                detail.condition ||
                detail.domesticShipping) && (
                <div className="mt-7">
                  <h2 className="mb-3 text-sm font-semibold">{t("specs")}</h2>
                  <dl className="overflow-hidden rounded-xl border text-sm">
                    {detail.condition && (
                      <div className="flex gap-3 border-b px-4 py-2.5 last:border-b-0">
                        <dt className="w-24 shrink-0 text-muted-foreground">
                          {t("condition")}
                        </dt>
                        <dd className="min-w-0 flex-1 break-words">
                          {detail.condition}
                        </dd>
                      </div>
                    )}
                    {detail.domesticShipping && (
                      <div className="flex gap-3 border-b px-4 py-2.5 last:border-b-0">
                        <dt className="w-24 shrink-0 text-muted-foreground">
                          {t("domesticShipping")}
                        </dt>
                        <dd className="min-w-0 flex-1 break-words">
                          {detail.domesticShipping}
                        </dd>
                      </div>
                    )}
                    {detail.extras?.map((spec, index) => (
                      <div
                        key={`${spec.name}-${index}`}
                        className="flex gap-3 border-b px-4 py-2.5 last:border-b-0"
                      >
                        <dt className="w-24 shrink-0 text-muted-foreground">
                          {spec.name}
                        </dt>
                        <dd className="min-w-0 flex-1 break-words">
                          {spec.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* 商品描述 — 纯文本（后端已转），保留换行。缺失不渲染。
                  有 locale 译文时优先展示译文，原日文描述作为折叠副文。 */}
              {(detail.descriptionTranslated || detail.description) && (
                <div className="mt-7">
                  <h2 className="mb-2 text-sm font-semibold">
                    {t("description")}
                  </h2>
                  {detail.descriptionTranslated && (
                    <p className="mb-2 text-[11px] text-muted-foreground/80">
                      {t("translationNote")}
                    </p>
                  )}
                  <p className="rounded-xl border bg-muted/30 px-4 py-3 text-sm leading-7 whitespace-pre-line text-muted-foreground">
                    {detail.descriptionTranslated || detail.description}
                  </p>
                  {detail.descriptionTranslated && detail.description && (
                    <details className="mt-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer select-none">
                        {t("showOriginal")}
                      </summary>
                      <p className="mt-2 rounded-xl border bg-muted/20 px-4 py-3 leading-7 whitespace-pre-line">
                        {detail.description}
                      </p>
                    </details>
                  )}
                </div>
              )}

              {/* 出价记录 — read-only display. No bid input, no submit. */}
              {detail.bidHistory && detail.bidHistory.length > 0 && (
                <div className="mt-7">
                  <h2 className="mb-2 text-sm font-semibold">
                    {t("bidHistory")}
                  </h2>
                  <ul className="divide-y">
                    {detail.bidHistory.map((entry, index) => (
                      <li
                        key={`${entry.bidder}-${index}`}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {entry.bidder}
                        </span>
                        <span
                          className={`font-medium tabular-nums ${
                            index === 0 ? "text-orange-600" : ""
                          }`}
                        >
                          {entry.amountJpy === undefined
                            ? ""
                            : `JPY ${numberFormatter.format(entry.amountJpy)}`}
                        </span>
                        {entry.time && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {entry.time}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="mt-6 text-xs text-muted-foreground">
                {t("feeNotice")}
              </p>

              {/* 次要操作：复制链接 / 收藏。与 Mercari 详情统一，收藏复用 /users/docollect。 */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                  className="gap-2"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copied ? t("copied") : t("copyLink")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleCollect}
                  className={`gap-2 ${isCollected ? "border-red-200 text-red-500" : ""}`}
                >
                  <Heart
                    className="size-4"
                    fill={isCollected ? "currentColor" : "none"}
                  />
                  {isCollected ? t("favorited") : t("favorite")}
                </Button>
              </div>

              {/* 主操作（桌面端内联）：在线出价 / 联系客服代拍。移动端隐藏，改用底部吸底条。
                  结构与 Mercari 详情统一：两个主按钮等宽并排（仅主按钮文案/动作不同）。
                  「联系客服代拍」调用 openWithProduct 带当前商品卡 → 右下全站浮窗（客服去重）。 */}
              <div className="mt-5 hidden gap-3 md:flex">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!detail}
                  onClick={() => setBidOpen(true)}
                  className="h-12 flex-1 rounded-xl text-sm"
                >
                  {t("onlineBid")}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!detail) return;
                    openWithProduct({
                      title: detail.titleTranslated || detail.title,
                      image: detail.imageUrl ?? detail.images?.[0],
                      priceJpy: detail.currentPrice,
                      platform: "yahoo",
                      href: `/${locale}/contact?type=yahoo&id=${goodsNo}`,
                    });
                  }}
                  className="h-12 flex-1 rounded-xl bg-orange-600 text-base text-white hover:bg-orange-700"
                >
                  {t("contactService")}
                </Button>
              </div>
            </section>
          </div>

          {/* 相关商品 — read-only 横向卡片条，无结果整块隐藏。 */}
          <YahooRelated goodsNo={goodsNo} locale={locale} />
        </>
      )}

      {/* 底部吸底操作条 — 仅移动端（md 以下）。桌面端用右栏内联主按钮，不显这条。
          结构与 Mercari 详情统一：收藏图标 + 两个主按钮（仅主按钮文案/动作不同）。 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={toggleCollect}
            className={`flex size-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] transition-colors ${
              isCollected
                ? "border-red-200 text-red-500"
                : "text-muted-foreground"
            }`}
          >
            <Heart
              className="size-5"
              fill={isCollected ? "currentColor" : "none"}
            />
            <span>{isCollected ? t("favorited") : t("favorite")}</span>
          </button>
          <Button
            type="button"
            variant="outline"
            disabled={!detail}
            onClick={() => setBidOpen(true)}
            className="h-12 flex-1 rounded-xl text-sm"
          >
            {t("onlineBid")}
          </Button>
          <Button
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
            className="h-12 flex-1 rounded-xl bg-orange-600 text-base text-white hover:bg-orange-700"
          >
            {t("contactService")}
          </Button>
        </div>
      </div>

      {/* 在线出价确认弹窗（替换原「即将开放」占位）。仅发 goodsNo+money 两字段，
          后端 fail-closed：未开放/不在白名单/未绑会员 → 礼貌拒绝、不会真出价。 */}
      {detail && (
        <YahooBidModal
          open={bidOpen}
          onClose={() => setBidOpen(false)}
          goodsNo={detail.goodsNo}
          title={detail.titleTranslated || detail.title}
          currentPrice={detail.currentPrice}
          variant="classic"
        />
      )}

      {/* 图片放大查看（纯前端 lightbox，复用 ImageLightbox） */}
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
            close: t("zoom.close"),
            prev: t("zoom.prev"),
            next: t("zoom.next"),
            zoomIn: t("zoom.zoomIn"),
            zoomOut: t("zoom.zoomOut"),
            reset: t("zoom.reset"),
            hint: t("zoom.hint"),
          }}
        />
      )}
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
