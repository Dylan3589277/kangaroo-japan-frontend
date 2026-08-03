"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import {
  Building2,
  Gavel,
  Headset,
  Package,
  Plane,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { ZhBanner } from "./ZhBanner";
import { ZhCategoryRow } from "./ZhCategoryRow";
import { ZhHowItWorksStrip } from "./ZhHowItWorksStrip";
import { fetchJpyToCny, ZH_HOME_CATEGORIES } from "./zh-daigou-data";

/**
 * zh「导购式综合日本代购/代拍」首页（综合日本代购/代拍，非只卡牌）。
 * 仅在 locale === "zh" 时由 [lang]/page.tsx 渲染；其它语言不受影响。
 * 文案直接写中文（无 i18n namespace，避免 key 缺失）。zh 站只显人民币（≈元），绝不显美元。
 *
 * 区块（上→下）：价值主张 + 大搜索框 + 热门词 → 三步流程图解 → Banner 轮播 → 平台入口卡 → 信任标签条 → 热门品类推荐区。
 */

const PLATFORM_ENTRIES = [
  {
    name: "Mercari 煤炉",
    desc: "日本最大二手交易平台",
    href: "/mercari",
    Icon: ShoppingBag,
    accent: "bg-rose-50 text-rose-600",
  },
  {
    name: "雅虎竞拍",
    desc: "Yahoo! 拍卖 · 代拍代抢",
    href: "/yahoo",
    Icon: Gavel,
    accent: "bg-zinc-100 text-zinc-700",
  },
  {
    // 2026-07-26：日亚站内搜索没接通（后端 search 返回空数组），但**业务上一直能买**
    // ——客服接单人工代购（老后台 st_shops: amazon is_show=1、手续费 220 円）。
    // 所以不写「即将上线」（会赶走本来能成交的客户），写清楚「发链接给客服代购」。
    name: "亚马逊日本",
    desc: "Amazon.co.jp · 发链接客服代购",
    href: "/amazon",
    Icon: Package,
    accent: "bg-orange-50 text-orange-600",
  },
] as const;

// 2026-07-26（花哥拍板）：原「正品保证」改为「日本平台直采」。
// 原因：客服话术库里明写「我们没有验货和甄别真伪的能力」（为划分与日本卖家的责任默认不拆封），
// 首页却挂着「正品保证」——这是我们做不到的绝对承诺，一旦出纠纷是对我方最不利的证据。
// 改成陈述事实（从日本正规平台直接买 + 可申请拍照验货），卖点还在，但不承诺鉴定责任。
const TRUST_BADGES = [
  { Icon: ShieldCheck, label: "专业代拍保障", desc: "十年代拍老店，人工跟单" },
  { Icon: Building2, label: "日本平台直采", desc: "从日本正规平台代购，发货前可申请拍照验货" },
  { Icon: Plane, label: "全球直邮", desc: "EMS / 海运 / 经济小包多种方式" },
  // 自助下单：你自己在站内下单购物，客服全程辅助（而非「人工代拍」）。
  { Icon: Headset, label: "自助下单·客服辅助", desc: "站内自助下单，客服全程协助" },
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
      "日本代购代拍一站式平台：煤炉 Mercari、雅虎竞拍、雅虎 Frima、乐天 Rakuma 真实在售商品站内直接下单，日本亚马逊可发链接给客服代购，专业买手代拍、全球直邮。",
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
      <section className="bg-gradient-to-b from-rose-50 to-zinc-50 pb-6 pt-10">
        <div className="mx-auto w-full max-w-7xl px-4">
          {/* 价值主张：先说清楚我们是谁、能做什么，再给搜索框 */}
          <div className="mx-auto mb-6 max-w-2xl text-center">
            <h1 className="text-2xl font-extrabold text-zinc-900 sm:text-3xl">
              日本代购代拍 · 煤炉/雅虎竞拍一站直邮
            </h1>
            <p className="mt-2 text-sm text-zinc-500 sm:text-base">
              你看中日本商品，我们在日本替你买，验货合箱直邮到家
            </p>
          </div>

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

      {/* 三步流程图解（搜索区之后、Banner 之前） */}
      <ZhHowItWorksStrip />

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
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${entry.accent}`}
                >
                  <entry.Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="flex flex-col">
                  <span className="text-base font-bold text-zinc-900">
                    {entry.name}
                  </span>
                  <span className="text-xs text-zinc-500">{entry.desc}</span>
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
                <badge.Icon
                  className="h-6 w-6 text-rose-600"
                  strokeWidth={1.75}
                />
                <span className="text-xs font-medium text-zinc-700">
                  {badge.label}
                </span>
                <span className="text-[11px] leading-snug text-zinc-500">
                  {badge.desc}
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
