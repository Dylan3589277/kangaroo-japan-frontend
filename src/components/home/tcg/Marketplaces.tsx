"use client";

import { useTranslations } from "next-intl";

const MARKETS = [
  { key: "mercari", status: "live", accent: "#ff5252" },
  { key: "yahoo", status: "live", accent: "#a78bfa" },
  // 2026-07-25：/en/amazon 搜索无结果（英文/日文关键词均无），标 soon 直到接通。
  { key: "amazon", status: "soon", accent: "#fbbf24" },
  { key: "surugaya", status: "soon", accent: "#38bdf8" },
] as const;

export function Marketplaces() {
  const t = useTranslations("tcg.marketplaces");

  return (
    <section className="border-t border-white/[0.06] bg-[#0a0e16]">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-slate-400">{t("subtitle")}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MARKETS.map((m) => {
            const isLive = m.status === "live";
            return (
              <div
                key={m.key}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.04]"
              >
                <div
                  className="absolute inset-x-0 top-0 h-px opacity-60"
                  style={{ background: `linear-gradient(90deg, transparent, ${m.accent}, transparent)` }}
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-3">
                  {/* 纯文字字标，不使用官方平台 logo */}
                  <span
                    className="font-[family-name:var(--font-display)] text-lg font-bold text-white"
                  >
                    {t(`items.${m.key}.name`)}
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      isLive
                        ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : "border border-white/15 bg-white/5 text-slate-400"
                    }`}
                  >
                    {isLive && (
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                    )}
                    {isLive ? t("statusLive") : t("statusSoon")}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {t(`items.${m.key}.desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
