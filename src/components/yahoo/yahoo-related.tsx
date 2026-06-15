"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { normalizeYahooList, type YahooItem } from "./yahoo-data";

type YahooRelatedProps = {
  goodsNo: string;
  locale: string;
};

/**
 * 详情页底部「相关商品」横向卡片条。
 * 调后端 /yahoo/goods/:goodsNo/related（按同分类取一页、排除当前商品）。
 * read-only：仅展示 + 跳详情，无出价/写请求。判空：无结果整块不渲染。
 */
export function YahooRelated({ goodsNo, locale }: YahooRelatedProps) {
  const t = useTranslations("yahoo");
  const [items, setItems] = useState<YahooItem[]>([]);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const numberFormatter = new Intl.NumberFormat(locale);

  useEffect(() => {
    let active = true;

    void api
      .request<unknown>(
        `/yahoo/goods/${encodeURIComponent(goodsNo)}/related?lng=${encodeURIComponent(locale)}`,
      )
      .then((response) => {
        if (!active) return;
        if (!response.success) {
          setItems([]);
          return;
        }
        // related 返回 { items: [...] }，normalizeYahooList 能识别 items 数组。
        const result = normalizeYahooList(response.data, 1);
        setItems(result.items.filter((item) => item.goodsNo !== goodsNo));
      })
      .catch(() => {
        if (active) setItems([]);
      });

    return () => {
      active = false;
    };
  }, [goodsNo, locale]);

  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-base font-semibold">{t("relatedTitle")}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => {
          const imageBroken = brokenImages.has(item.goodsNo);
          return (
            <Link
              key={item.goodsNo}
              href={`/yahoo/${encodeURIComponent(item.goodsNo)}`}
              className="group w-36 shrink-0 rounded-xl border bg-card outline-none transition-colors hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-muted">
                {item.imageUrl && !imageBroken ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.titleTranslated || item.title}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    sizes="144px"
                    onError={() =>
                      setBrokenImages((previous) => {
                        const next = new Set(previous);
                        next.add(item.goodsNo);
                        return next;
                      })
                    }
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-muted-foreground">
                    {t("noImage")}
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="line-clamp-2 min-h-8 text-xs leading-4">
                  {item.titleTranslated || item.title}
                </p>
                <p className="mt-1 text-sm font-bold tabular-nums text-orange-600">
                  {item.currentPrice === undefined
                    ? t("priceUnavailable")
                    : `JPY ${numberFormatter.format(item.currentPrice)}`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
