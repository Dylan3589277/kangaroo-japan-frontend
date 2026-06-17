"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { TcgCardItem } from "./tcg-data";

/**
 * 设计 A（深色高级感）共用卡牌卡片。
 * 展示来自平台 listing 的真实商品图（不使用官方 logo/卡图），标题两行夹断、
 * 平台徽章、JPY 整数价格（人民币估算次要展示）、已售置灰徽章。
 * hover 轻微上浮 + 电光青边缘微光。点击进入现有 Mercari 详情页 /mercari/[id]（en 前缀由 next-intl 补）。
 */
export function TcgCard({ item }: { item: TcgCardItem }) {
  const [imgBroken, setImgBroken] = useState(false);
  const hasImage = Boolean(item.imageUrl) && !imgBroken;

  return (
    <Link
      href={`/mercari/${item.goodsNo}`}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_18px_40px_-18px_rgba(56,189,248,0.45)] ${
        item.soldOut ? "opacity-60" : ""
      }`}
    >
      {/* 商品图 */}
      <div className="relative aspect-square overflow-hidden bg-[#0e131d]">
        {hasImage ? (
          <Image
            src={item.imageUrl as string}
            alt={item.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => setImgBroken(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-600">
            No image
          </div>
        )}

        {/* 平台徽章（左上）：当前数据源为 Mercari */}
        <span className="absolute left-2 top-2 inline-flex items-center rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200 backdrop-blur">
          Mercari
        </span>

        {/* 已售徽章（右上） */}
        {item.soldOut && (
          <span className="absolute right-2 top-2 inline-flex items-center rounded-md bg-rose-500/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Sold
          </span>
        )}
      </div>

      {/* 文字内容 */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 min-h-[2.4rem] text-sm font-medium leading-snug text-slate-100">
          {item.title}
        </h3>

        <div className="mt-auto flex items-baseline gap-2">
          {typeof item.priceJpy === "number" ? (
            <span className="text-base font-bold text-cyan-300">
              &yen;{item.priceJpy.toLocaleString("en-US")}
            </span>
          ) : (
            <span className="text-sm text-slate-500">Price on request</span>
          )}
          {typeof item.priceRmb === "number" && item.priceRmb > 0 && (
            <span className="text-[11px] text-slate-500">
              &asymp; &yen;{item.priceRmb.toFixed(0)} CNY
            </span>
          )}
        </div>

        {item.sellerName && (
          <p className="truncate text-[11px] text-slate-500">{item.sellerName}</p>
        )}
      </div>
    </Link>
  );
}

/** 加载骨架屏（深色，与 TcgCard 等高）。 */
export function TcgCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
      <div className="aspect-square w-full animate-pulse bg-white/[0.05]" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.08]" />
      </div>
    </div>
  );
}
