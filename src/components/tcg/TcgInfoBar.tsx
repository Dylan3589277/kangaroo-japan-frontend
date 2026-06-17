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
};

const RISK_BADGE: Record<CardConditionRisk, string> = {
  low: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-200",
  medium: "border-amber-400/30 bg-amber-400/[0.08] text-amber-200",
  high: "border-rose-400/30 bg-rose-400/[0.08] text-rose-200",
  graded: "border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-200",
};

export function TcgInfoBar({
  name,
  description,
  extras,
  searchName,
}: TcgInfoBarProps) {
  const t = useTranslations("tcg");
  const meta = parseCardMeta({ name, description, extras });
  const priceUrl = priceChartingSearchUrl(searchName ?? name);

  // Nothing parsed and no name to search → render nothing at all.
  if (!hasCardMeta(meta) && !priceUrl) return null;

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
        <svg
          className="size-4 text-cyan-300"
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
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
          {t("infoBar.title")}
        </h2>
      </div>

      <dl className="divide-y divide-white/[0.06] text-sm">
        {meta.condition && (
          <div className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">{t("infoBar.condition")}</dt>
              <dd>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    RISK_BADGE[meta.condition.risk]
                  }`}
                >
                  {meta.condition.label}
                </span>
              </dd>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              {t("infoBar.conditionNote")}{" "}
              <Link
                href="/photo-inspection"
                className="text-cyan-300 underline-offset-2 hover:underline"
              >
                {t("infoBar.requestInspection")}
              </Link>
            </p>
          </div>
        )}

        {meta.setCode && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="text-slate-400">{t("infoBar.set")}</dt>
            <dd className="font-medium tabular-nums text-slate-100">
              {meta.setCode}
            </dd>
          </div>
        )}

        {meta.rarity && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="text-slate-400">{t("infoBar.rarity")}</dt>
            <dd className="font-medium text-slate-100">{meta.rarity}</dd>
          </div>
        )}

        {meta.year && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="text-slate-400">{t("infoBar.year")}</dt>
            <dd className="font-medium tabular-nums text-slate-100">
              {meta.year}
            </dd>
          </div>
        )}

        {priceUrl && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="text-slate-400">{t("infoBar.priceTrend")}</dt>
            <dd className="text-right">
              <a
                href={priceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-300 transition-colors hover:text-cyan-200"
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
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                {t("infoBar.external")}
              </span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
