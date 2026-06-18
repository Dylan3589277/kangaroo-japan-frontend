"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  hasCardMeta,
  parseCardMeta,
  priceChartingSearchUrl,
  type CardConditionRisk,
  type CardMetaInput,
} from "./parseCardMeta";

/**
 * TCG info-bar (English, Design A) shown beneath the Fee Details block on the
 * Mercari / Yahoo Design-A detail pages.
 *
 * It parses condition / set / rarity / year from the listing text (best effort,
 * "宁缺毋滥": only parsed fields are shown) and links out to PriceCharting for a
 * rough price trend (no paid price API; there is no free JP price-history feed).
 *
 * Read-only and pure-render: no effects, no refs, no business logic. Uses the
 * shared "tcg" i18n namespace so translations fall back to English gracefully.
 */

type TcgInfoBarProps = CardMetaInput & {
  /** Full listing name used as the PriceCharting search query. */
  searchName?: string | null;
  /**
   * Visual theme. Defaults to "dark" so the Design-A (深色) Mercari/Yahoo pages
   * stay byte-for-byte unchanged. Pass "light" for the classic (浅色) zh pages.
   */
  variant?: "dark" | "light";
};

const RISK_BADGE: Record<"dark" | "light", Record<CardConditionRisk, string>> = {
  dark: {
    low: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200",
    medium: "border-amber-400/30 bg-amber-400/[0.08] text-amber-200",
    high: "border-rose-400/30 bg-rose-400/[0.08] text-rose-200",
    graded: "border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-200",
  },
  light: {
    low: "border-emerald-200 bg-emerald-50 text-emerald-700",
    medium: "border-amber-200 bg-amber-50 text-amber-700",
    high: "border-rose-200 bg-rose-50 text-rose-700",
    graded: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
};

// 浅色 / 深色两套外观；深色为默认（en Design-A 沿用，不变）。
const THEME = {
  dark: {
    section: "border-white/[0.08] bg-white/[0.03]",
    headBorder: "border-white/[0.06]",
    icon: "text-cyan-300",
    title: "text-slate-300",
    divide: "divide-white/[0.06]",
    dt: "text-slate-400",
    dd: "text-slate-100",
    note: "text-slate-500",
    link: "text-cyan-300",
    external: "text-slate-500",
  },
  light: {
    section: "border-border bg-card",
    headBorder: "border-border",
    icon: "text-orange-500",
    title: "text-foreground",
    divide: "divide-border",
    dt: "text-muted-foreground",
    dd: "text-foreground",
    note: "text-muted-foreground",
    link: "text-orange-600",
    external: "text-muted-foreground",
  },
} as const;

export function TcgInfoBar({
  name,
  description,
  extras,
  searchName,
  variant = "dark",
}: TcgInfoBarProps) {
  const c = THEME[variant];
  const riskBadge = RISK_BADGE[variant];
  const t = useTranslations("tcg");
  const meta = parseCardMeta({ name, description, extras });
  const priceUrl = priceChartingSearchUrl(searchName ?? name);

  // Nothing parsed and no name to search → render nothing at all.
  if (!hasCardMeta(meta) && !priceUrl) return null;

  return (
    <section
      className={`mt-5 overflow-hidden rounded-2xl border ${c.section}`}
    >
      <div className={`flex items-center gap-2 border-b px-5 py-3 ${c.headBorder}`}>
        <svg
          className={`size-4 ${c.icon}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
          />
          <path strokeLinecap="round" strokeWidth={1.6} d="M8 9h5M8 13h8" />
        </svg>
        <h2
          className={`text-[11px] font-semibold uppercase tracking-wider ${c.title}`}
        >
          {t("infoBar.title")}
        </h2>
      </div>

      <dl className={`divide-y text-sm ${c.divide}`}>
        {meta.condition && (
          <div className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <dt className={c.dt}>{t("infoBar.condition")}</dt>
              <dd>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    riskBadge[meta.condition.risk]
                  }`}
                >
                  {meta.condition.label}
                </span>
              </dd>
            </div>
            <p className={`mt-2 text-[11px] leading-relaxed ${c.note}`}>
              {t("infoBar.conditionNote")}{" "}
              <Link
                href="/photo-inspection"
                className={`underline-offset-2 hover:underline ${c.link}`}
              >
                {t("infoBar.requestInspection")}
              </Link>
            </p>
          </div>
        )}

        {meta.setCode && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className={c.dt}>{t("infoBar.set")}</dt>
            <dd className={`font-medium tabular-nums ${c.dd}`}>
              {meta.setCode}
            </dd>
          </div>
        )}

        {meta.rarity && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className={c.dt}>{t("infoBar.rarity")}</dt>
            <dd className={`font-medium ${c.dd}`}>{meta.rarity}</dd>
          </div>
        )}

        {meta.year && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className={c.dt}>{t("infoBar.year")}</dt>
            <dd className={`font-medium tabular-nums ${c.dd}`}>
              {meta.year}
            </dd>
          </div>
        )}

        {priceUrl && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className={c.dt}>{t("infoBar.priceTrend")}</dt>
            <dd className="text-right">
              <a
                href={priceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 transition-colors hover:opacity-80 ${c.link}`}
              >
                {t("infoBar.viewHistory")}
                <svg
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M7 17L17 7M17 7H9M17 7v8"
                  />
                </svg>
              </a>
              <span
                className={`ml-1.5 text-[10px] uppercase tracking-wide ${c.external}`}
              >
                {t("infoBar.external")}
              </span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
