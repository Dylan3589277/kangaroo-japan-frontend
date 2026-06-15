"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Clock3, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeYahooDetail, type YahooDetail } from "./yahoo-data";
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
  const [detail, setDetail] = useState<YahooDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    let active = true;

    void api
      .request<unknown>(`/yahoo/goods/${encodeURIComponent(goodsNo)}`)
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
  }, [goodsNo]);

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
    <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
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
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/10">
                {activeImage && !imageBroken ? (
                  <Image
                    src={activeImage}
                    alt={detail.title}
                    fill
                    priority
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onError={() => setImageBroken(true)}
                  />
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
                {detail.title}
              </h1>
              {detail.titleJa && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {detail.titleJa}
                </p>
              )}

              <div className="mt-7 border-y py-5">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("currentPrice")}
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-3">
                  <p className="text-3xl font-bold tracking-tight tabular-nums text-orange-600">
                    {detail.currentPrice === undefined
                      ? t("priceUnavailable")
                      : `JPY ${numberFormatter.format(detail.currentPrice)}`}
                  </p>
                  {detail.priceCnyApprox !== undefined && (
                    <span className="text-sm text-muted-foreground">
                      {t("approxCny", {
                        amount: numberFormatter.format(detail.priceCnyApprox),
                      })}
                    </span>
                  )}
                </div>

                {(detail.startPrice !== undefined || detail.condition) && (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                    {detail.startPrice !== undefined && (
                      <span>
                        {t("startPrice")}:{" "}
                        <span className="font-medium text-foreground">
                          {`JPY ${numberFormatter.format(detail.startPrice)}`}
                        </span>
                      </span>
                    )}
                    {detail.condition && (
                      <span>
                        {t("condition")}:{" "}
                        <span className="font-medium text-foreground">
                          {detail.condition}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>

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

              {/* 商品信息 — seller rating + domestic shipping. Each row
                  renders only when its field is present. */}
              {(detail.sellerRating ||
                detail.sellerRatingCount !== undefined ||
                detail.domesticShipping) && (
                <div className="mt-7">
                  <h2 className="mb-3 text-sm font-semibold">
                    {t("productInfo")}
                  </h2>
                  <dl className="space-y-2 text-sm">
                    {(detail.sellerRating ||
                      detail.sellerRatingCount !== undefined) && (
                      <div className="flex gap-3">
                        <dt className="w-20 shrink-0 text-muted-foreground">
                          {t("sellerRating")}
                        </dt>
                        <dd className="flex flex-wrap items-baseline gap-x-2">
                          {detail.sellerRating && (
                            <span className="font-medium text-teal-700 dark:text-teal-400">
                              {t("sellerRatingValue", {
                                percent: detail.sellerRating,
                              })}
                            </span>
                          )}
                          {detail.sellerRatingCount !== undefined && (
                            <span className="text-muted-foreground">
                              {t("sellerRatingCount", {
                                count: detail.sellerRatingCount,
                              })}
                            </span>
                          )}
                        </dd>
                      </div>
                    )}
                    {detail.domesticShipping && (
                      <div className="flex gap-3">
                        <dt className="w-20 shrink-0 text-muted-foreground">
                          {t("domesticShipping")}
                        </dt>
                        <dd>{detail.domesticShipping}</dd>
                      </div>
                    )}
                  </dl>
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
            </section>
          </div>
        </>
      )}

      {/* Bottom action bar — read-only boundary: no bid input, no submit,
          no navigation, no write requests. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            aria-disabled="true"
            className="flex size-12 shrink-0 cursor-default flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] text-muted-foreground"
          >
            <Heart className="size-5" />
            <span>{t("favorite")}</span>
          </button>
          <Button
            type="button"
            variant="outline"
            disabled
            className="h-12 flex-1 flex-col gap-0 rounded-xl text-sm"
          >
            <span>{t("onlineBid")}</span>
            <span className="text-[10px] font-normal opacity-80">
              {t("comingSoon")}
            </span>
          </Button>
          <Button
            type="button"
            className="h-12 flex-1 rounded-xl bg-orange-600 text-base text-white hover:bg-orange-700"
          >
            {t("contactService")}
          </Button>
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
