"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type CompareItem,
  type ComparePlatform,
  type ComparePlatformResult,
} from "./compare-data";

const PLATFORM_ACCENT: Record<ComparePlatform, string> = {
  mercari: "bg-red-500",
  amazon: "bg-yellow-500",
  yahoo: "bg-purple-500",
};

type CompareResultsProps = {
  locale: string;
  loading: boolean;
  results: ComparePlatformResult[];
  cheapestPlatform?: ComparePlatform | null;
  cheapestPriceJpy?: number;
};

export function CompareResults({
  locale,
  loading,
  results,
  cheapestPlatform,
  cheapestPriceJpy,
}: CompareResultsProps) {
  const t = useTranslations("compare");
  const numberFormatter = new Intl.NumberFormat(locale);

  if (loading) {
    return (
      <div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
      >
        {Array.from({ length: 3 }, (_, column) => (
          <div key={column} className="space-y-3">
            <Skeleton className="h-8 w-32" />
            {Array.from({ length: 3 }, (_, row) => (
              <Card key={row} className="flex-row gap-0 p-3">
                <Skeleton className="size-20 shrink-0 rounded-md" />
                <div className="ml-3 flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <>
      <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        {t("referenceNotice")}
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => (
          <section
            key={result.platform}
            className="flex flex-col gap-3"
            aria-label={result.platform}
          >
            <header className="flex items-center justify-between">
              <Badge
                className={`${PLATFORM_ACCENT[result.platform]} text-white`}
              >
                {t(`platform.${result.platform}`)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {result.status === "ok"
                  ? t("resultCount", { count: result.items.length })
                  : null}
              </span>
            </header>

            {result.status === "error" ? (
              <Card className="px-3 py-8 text-center">
                <p className="text-sm font-medium">{t("siteError")}</p>
                {result.errorMessage && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.errorMessage}
                  </p>
                )}
              </Card>
            ) : result.items.length === 0 ? (
              <Card className="px-3 py-8 text-center">
                <Search className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("siteEmpty")}
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {result.items.map((item) => (
                  <CompareCard
                    key={`${item.platform}-${item.id}`}
                    item={item}
                    locale={locale}
                    numberFormatter={numberFormatter}
                    isCheapest={
                      cheapestPlatform === result.platform &&
                      item.priceJpy !== undefined &&
                      item.priceJpy === cheapestPriceJpy
                    }
                    t={t}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

function CompareCard({
  item,
  locale,
  numberFormatter,
  isCheapest,
  t,
}: {
  item: CompareItem;
  locale: string;
  numberFormatter: Intl.NumberFormat;
  isCheapest: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const card = (
    <Card
      className={`flex-row gap-0 p-3 transition-colors hover:bg-muted/30 ${
        isCheapest ? "border-2 border-green-500" : ""
      }`}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.imageUrl ? (
          // 各站图片域名繁多，用原生 img 规避 next/image 域名约束。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">
            {t("noImage")}
          </div>
        )}
      </div>
      <div className="ml-3 flex min-w-0 flex-1 flex-col">
        {isCheapest && (
          <span className="mb-1 w-fit rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {t("bestPrice")}
          </span>
        )}
        <h3 className="line-clamp-2 text-sm leading-5 font-medium">
          {item.title}
        </h3>
        <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
          <span className="text-base font-bold tabular-nums text-primary">
            {item.priceJpy === undefined
              ? t("priceUnavailable")
              : `JPY ${numberFormatter.format(item.priceJpy)}`}
          </span>
          {/* CNY 近似仅非英文站展示；英文站面向海外只显权威 JPY，绝不显人民币。 */}
          {locale !== "en" && item.priceCny !== undefined && (
            <span className="text-[11px] text-muted-foreground">
              {t("approxCny", {
                amount: numberFormatter.format(Math.round(item.priceCny)),
              })}
            </span>
          )}
        </p>
        {item.rating !== undefined && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            <span className="text-yellow-500">★</span>{" "}
            {item.rating.toFixed(1)}
            {item.reviewCount !== undefined ? ` (${item.reviewCount})` : ""}
          </p>
        )}
      </div>
    </Card>
  );

  if (item.productUrl) {
    return (
      <a
        href={item.productUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={item.title}
      >
        {card}
      </a>
    );
  }
  return card;
}
