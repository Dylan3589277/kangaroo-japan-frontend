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
 * 经典版（浅色）TCG 信息栏，挂在 Yahoo / Mercari 经典版详情页价格盒下方。
 *
 * 与设计 A 的 {@link TcgInfoBar} 数据/逻辑完全一致：复用同一份 parseCardMeta /
 * priceChartingSearchUrl / hasCardMeta（best-effort 解析卡况/套系/稀有度/年份，
 * 「宁缺毋滥」只渲染解析到的字段），共用 "tcg" i18n 命名空间。本组件只换浅色皮，
 * 不改任何解析逻辑、不写任何业务/副作用，纯展示（满足 husky effect/ref 规则）。
 *
 * 卡牌类商品才有内容；雅虎多为杂货 → 解析不出任何字段且无搜索名时整块不渲染。
 */

type TcgInfoBarClassicProps = CardMetaInput & {
  /** 用作 PriceCharting 搜索 query 的完整商品名。 */
  searchName?: string | null;
};

const RISK_BADGE: Record<CardConditionRisk, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
  graded: "border-cyan-200 bg-cyan-50 text-cyan-700",
};

export function TcgInfoBarClassic({
  name,
  description,
  extras,
  searchName,
}: TcgInfoBarClassicProps) {
  const t = useTranslations("tcg");
  const meta = parseCardMeta({ name, description, extras });
  const priceUrl = priceChartingSearchUrl(searchName ?? name);

  // 没解析到任何字段、也没有可搜索名 → 整块不渲染。
  if (!hasCardMeta(meta) && !priceUrl) return null;

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-5 py-3">
        <svg
          className="size-4 text-orange-500"
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
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("infoBar.title")}
        </h2>
      </div>

      <dl className="divide-y text-sm">
        {meta.condition && (
          <div className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{t("infoBar.condition")}</dt>
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
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {t("infoBar.conditionNote")}{" "}
              <Link
                href="/photo-inspection"
                className="text-orange-600 underline-offset-2 hover:underline"
              >
                {t("infoBar.requestInspection")}
              </Link>
            </p>
          </div>
        )}

        {meta.setCode && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="text-muted-foreground">{t("infoBar.set")}</dt>
            <dd className="font-medium tabular-nums">{meta.setCode}</dd>
          </div>
        )}

        {meta.rarity && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="text-muted-foreground">{t("infoBar.rarity")}</dt>
            <dd className="font-medium">{meta.rarity}</dd>
          </div>
        )}

        {meta.year && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="text-muted-foreground">{t("infoBar.year")}</dt>
            <dd className="font-medium tabular-nums">{meta.year}</dd>
          </div>
        )}

        {priceUrl && (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <dt className="text-muted-foreground">{t("infoBar.priceTrend")}</dt>
            <dd className="text-right">
              <a
                href={priceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-orange-600 transition-colors hover:text-orange-700"
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
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {t("infoBar.external")}
              </span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
