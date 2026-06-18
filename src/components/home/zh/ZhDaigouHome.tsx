"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { ZhBanner } from "./ZhBanner";
import { ZhCategoryRow } from "./ZhCategoryRow";
import { fetchJpyToCny, ZH_HOME_CATEGORIES } from "./zh-daigou-data";

/**
 * zh「导购式综合日本代购/代拍」首页（综合日本代购/代拍，非只卡牌）。
 * 仅在 locale === "zh" 时由 [lang]/page.tsx 渲染；其它语言不受影响。
 * 文案直接写中文（无 i18n namespace，避免 key 缺失）。zh 站只显人民币（≈元），绝不显美元。
 *
 * 区块（上→下）：Banner 轮播 → 大搜索框 + 热门词 → 平台入口卡 → 信任标签条 → 热门品类推荐区。
 */

const PLATFORM_ENTRIES = [
  {
    name: "Mercari 煤炉",
    desc: "日本最大二手交易平台",
    href: "/mercari",
    emoji: "🛍️",
    className: "from-rose-50 to-rose-100 text-rose-700",
  },
  {
    name: "雅虎竞拍",
    desc: "Yahoo! 拍卖 · 代拍代抢",
    href: "/yahoo",
    emoji: "🔨",
    className: "from-violet-50 to-purple-100 text-purple-700",
  },
  {
    name: "亚马逊日本",
    desc: "Amazon.co.jp 正品直邮",
    href: "/amazon",
    emoji: "📦",
    className: "from-amber-50 to-orange-100 text-orange-700",
  },
] as const;

const TRUST_BADGES = [
  { icon: "🔨", label: "专业代拍保障" },
  { icon: "✅", label: "正品保证" },
  { icon: "✈️", label: "全球直邮" },
  // 自助下单：你自己在站内下单购物，客服全程辅助（而非「人工代拍」）。
  { icon: "🛒", label: "自助下单·客服辅助" },
] as const;

const HOT_KEYWORDS = [
  "ポケモンカード",
  "フィギュア",
  "ユニフォーム",
  "ぬいぐるみ",
  "Switch",
  "一番くじ",
] as const;

const HOT_KEYWORD_LABELS: Record<string, string> = {
  ポケモンカード: "宝可梦卡",
  フィギュア: "手办",
  ユニフォーム: "球衣",
  ぬいぐるみ: "毛绒公仔",
  Switch: "Switch",
  一番くじ: "一番赏",
};

export function ZhDaigouHome() {
  const router = useRouter();
  const [jpyToCny, setJpyToCny] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // SEO：zh 首页标题/描述（与现有客户端写法一致）。
  useEffect(() => {
    document.title = "日本代购代拍 · 全球直邮 | 袋鼠日本";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      "content",
      "日本代购代拍一站式平台：煤炉 Mercari、雅虎竞拍、亚马逊日本真实在售商品，专业买手代拍、正品保证、全球直邮。",
    );
  }, []);

  // 拉一次后台 CNY 汇率，缓存到 state（拿不到则只显 JPY）。在异步回调里 setState。
  useEffect(() => {
    let active = true;
    (async () => {
      const rate = await fetchJpyToCny();
      if (active) setJpyToCny(rate);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    // 综合搜索落到雅虎列表页（带关键词）；雅虎页面已是 zh 列表，next-intl 自动保 /zh 前缀。
    router.push(q ? `/yahoo?kw=${encodeURIComponent(q)}` : "/yahoo");
  };

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      {/* 大搜索框（顶部） */}
      <section className="bg-gradient-to-b from-rose-50 to-zinc-50 pb-6 pt-8">
        <div className="mx-auto w-full max-w-7xl px-4">
          <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索日本商品 / 卡牌 / 手办 / 球衣…"
                className="h-12 w-full rounded-full border border-zinc-200 bg-white px-6 pr-28 text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-full bg-rose-600 px-6 text-sm font-medium text-white transition-colors hover:bg-rose-700"
              >
                搜索
              </button>
            </div>
          </form>

          {/* 热门搜索词 chip */}
          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-zinc-400">热门：</span>
            {HOT_KEYWORDS.map((kw) => (
              <Link
                key={kw}
                href={`/yahoo?kw=${encodeURIComponent(kw)}`}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-rose-300 hover:text-rose-600"
              >
                {HOT_KEYWORD_LABELS[kw] ?? kw}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Banner 轮播 */}
      <section className="pb-6">
        <ZhBanner />
      </section>

      {/* 平台入口卡 */}
      <section className="pb-6">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PLATFORM_ENTRIES.map((entry) => (
              <Link
                key={entry.name}
                href={entry.href}
                className={`flex items-center gap-3 rounded-2xl border border-white bg-gradient-to-br p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${entry.className}`}
              >
                <span className="text-3xl">{entry.emoji}</span>
                <span className="flex flex-col">
                  <span className="text-base font-bold">{entry.name}</span>
                  <span className="text-xs opacity-80">{entry.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 信任标签条 */}
      <section className="pb-8">
        <div className="mx-auto w-full max-w-7xl px-4">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm sm:grid-cols-4">
            {TRUST_BADGES.map((badge) => (
              <div
                key={badge.label}
                className="flex flex-col items-center gap-1 text-center"
              >
                <span className="text-2xl">{badge.icon}</span>
                <span className="text-xs font-medium text-zinc-600">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 热门品类推荐区（核心，多品类混合 Mercari + 雅虎） */}
      <div className="flex flex-col gap-8">
        {ZH_HOME_CATEGORIES.map((config) => (
          <ZhCategoryRow
            key={config.key}
            config={config}
            jpyToCny={jpyToCny}
          />
        ))}
      </div>
    </div>
  );
}
