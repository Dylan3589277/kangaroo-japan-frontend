"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { normalizeYahooList, type YahooItem } from "./yahoo-data";

type YahooRelatedDesignAProps = {
  goodsNo: string;
  locale: string;
};

/**
 * 设计 A（深色高级感）英文 Yahoo 详情页底部「相关商品」网格。
 *
 * 与经典版 YahooRelated 同源同逻辑（同一 related 端点、同一归一、同一 read-only 边界：
 * 仅展示 + 跳详情、无写请求、无结果整块隐藏），只换深色皮。
 */
export function YahooRelatedDesignA({
  goodsNo,
  locale,
}: YahooRelatedDesignAProps) {
  const t = useTranslations("yahoo");
  const [items, setItems] = useState<YahooItem[]>([]);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const numberFormatter = new Intl.NumberFormat("en-US");

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
    <section className="mt-12">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
        {t("relatedTitle")}
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const imageBroken = brokenImages.has(item.goodsNo);
          return (
            <Link
              key={item.goodsNo}
              href={`/yahoo/${encodeURIComponent(item.goodsNo)}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_18px_40px_-18px_rgba(56,189,248,0.45)]"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-[#0e131d]">
                {item.imageUrl && !imageBroken ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.titleTranslated || item.title}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    onError={() =>
                      setBrokenImages((previous) => {
                        const next = new Set(previous);
                        next.add(item.goodsNo);
                        return next;
                      })
                    }
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-xs text-slate-600">
                    {t("noImage")}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="line-clamp-2 min-h-[2.4rem] text-sm leading-snug text-slate-100">
                  {item.titleTranslated || item.title}
                </p>
                <p className="mt-auto text-base font-bold tabular-nums text-cyan-300">
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
