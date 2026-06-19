"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { IMG_PLACEHOLDER_LIGHT } from "@/lib/product-utils";
import { formatCnyApprox, type ZhHomeItem } from "./zh-daigou-data";

/**
 * zh 导购首页商品卡（亮色暖调，贴中国电商习惯）。
 * 平台徽章（煤炉 / 雅虎）+ 图 + 标题两行夹断 + ¥JPY 主价 + ≈元 辅价 + 售罄置灰。
 * 用 next-intl Link，自动保 /zh 前缀；点击进 /zh/mercari/[id] 或 /zh/yahoo/[goodsNo]。
 */

const PLATFORM_BADGE: Record<
  ZhHomeItem["platform"],
  { label: string; className: string }
> = {
  mercari: { label: "煤炉", className: "bg-rose-500" },
  yahoo: { label: "雅虎竞拍", className: "bg-purple-600" },
};

function detailHref(item: ZhHomeItem): string {
  return item.platform === "mercari"
    ? `/mercari/${encodeURIComponent(item.goodsNo)}`
    : `/yahoo/${encodeURIComponent(item.goodsNo)}`;
}

export function ZhProductCard({
  item,
  jpyToCny,
}: {
  item: ZhHomeItem;
  jpyToCny: number | null;
}) {
  const [imgBroken, setImgBroken] = useState(false);
  const hasImage = Boolean(item.imageUrl) && !imgBroken;
  const badge = PLATFORM_BADGE[item.platform];
  const cnyText = formatCnyApprox(item.priceJpy, jpyToCny);

  return (
    <Link
      href={detailHref(item)}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md ${
        item.soldOut ? "opacity-60" : ""
      }`}
    >
      {/* 商品图 */}
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        {hasImage ? (
          <Image
            src={item.imageUrl as string}
            alt={item.title}
            fill
            // 走 next/image 优化：Vercel 边缘缓存 + 自动 WebP + 按 sizes 出小图，
            // 修复「每次访问都重拉慢加载」。低画质 + 小尺寸控 dsjpic 优化用量。
            quality={65}
            // 纯色占位（与卡底同灰），加载中先铺色不白屏，观感"秒开"。
            placeholder={IMG_PLACEHOLDER_LIGHT}
            // next/image 默认懒加载（首屏外不抢带宽）；解码异步不卡主线程。
            loading="lazy"
            decoding="async"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 180px"
            onError={() => setImgBroken(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            暂无图片
          </div>
        )}

        {/* 平台徽章（左上） */}
        <span
          className={`absolute left-2 top-2 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm ${badge.className}`}
        >
          {badge.label}
        </span>

        {/* 售罄徽章（右上） */}
        {item.soldOut && (
          <span className="absolute right-2 top-2 inline-flex items-center rounded-md bg-zinc-700/85 px-2 py-0.5 text-[10px] font-semibold text-white">
            已售
          </span>
        )}
      </div>

      {/* 文字内容 */}
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h3 className="line-clamp-2 min-h-[2.4rem] text-xs leading-snug text-zinc-700">
          {item.title}
        </h3>

        <div className="mt-auto flex items-baseline gap-1.5">
          {typeof item.priceJpy === "number" ? (
            <span className="text-sm font-bold text-rose-600">
              ¥{item.priceJpy.toLocaleString("ja-JP")}
            </span>
          ) : (
            <span className="text-xs text-zinc-400">价格待询</span>
          )}
          {cnyText && (
            <span className="text-[11px] text-zinc-400">{cnyText}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** 加载骨架屏（亮色，与 ZhProductCard 等高）。 */
export function ZhProductCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-100 bg-white">
      <div className="aspect-square w-full animate-pulse bg-zinc-100" />
      <div className="flex flex-col gap-2 p-2.5">
        <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
      </div>
    </div>
  );
}
