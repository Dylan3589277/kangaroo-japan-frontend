"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SearchIcon, ArrowRightIcon, ShipIcon, BoxesIcon, CameraIcon } from "./icons";

export function HeroSection({
  onSearch,
  onHowItWorks,
}: {
  onSearch: (query: string) => void;
  onHowItWorks: () => void;
}) {
  const t = useTranslations("tcg.hero");
  const [query, setQuery] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <section className="relative overflow-hidden">
      {/* 背景：石墨/深墨蓝近黑底 + 电光强调径向光晕 + 细网格 */}
      <div className="absolute inset-0 bg-[#0a0e16]" aria-hidden />
      <div
        className="absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(60% 55% at 50% -8%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(45% 45% at 85% 20%, rgba(45,212,191,0.12), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-cyan-200">
          <span className="size-1.5 rounded-full bg-cyan-400" />
          {t("eyebrow")}
        </span>

        <h1 className="mx-auto mt-6 max-w-4xl font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-6xl">
          {t("title")}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
          {t("subtitle")}
        </p>

        {/* 搜索框 */}
        <form onSubmit={submit} className="mx-auto mt-9 max-w-2xl">
          <div className="group relative flex items-center rounded-2xl border border-white/12 bg-white/[0.04] p-1.5 shadow-2xl shadow-black/40 backdrop-blur transition-colors focus-within:border-cyan-400/50">
            <SearchIcon className="ml-3 size-5 shrink-0 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchAria")}
              className="h-11 w-full bg-transparent px-3 text-sm text-white placeholder:text-slate-500 outline-none md:text-base"
            />
            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300 md:px-5"
            >
              {t("ctaSearch")}
              <ArrowRightIcon className="size-4" />
            </button>
          </div>
        </form>

        {/* CTA 行：移动端固定为 Search cards / How it works */}
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => onSearch(query)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300 sm:w-auto"
          >
            <SearchIcon className="size-4" />
            {t("ctaSearch")}
          </button>
          <button
            onClick={onHowItWorks}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 text-sm font-semibold text-slate-100 transition-colors hover:border-white/30 hover:bg-white/[0.07] sm:w-auto"
          >
            {t("ctaHowItWorks")}
          </button>
        </div>

        {/* 信任条 */}
        <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <ShipIcon className="size-4 text-cyan-300/80" />
            {t("trustStrip.shipsTo")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BoxesIcon className="size-4 text-cyan-300/80" />
            {t("trustStrip.marketplaces")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CameraIcon className="size-4 text-cyan-300/80" />
            {t("trustStrip.inspection")}
          </span>
        </div>
      </div>
    </section>
  );
}
