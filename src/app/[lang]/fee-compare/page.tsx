import type { Metadata } from "next";
import {
  buildAlternates,
  isIndexable,
  breadcrumbJsonLd,
  faqPageJsonLd,
  brandForLocale,
} from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { FeeCalculator } from "./FeeCalculator";
import { LandedCostEstimator } from "./LandedCostEstimator";
import {
  OUR_NAME,
  COMPETITOR_A_NAME,
  COMPETITOR_B_NAME,
  COMPARE_ROWS,
  FOOTER_DISCLAIMER,
  BRAND_BADGE,
  HIGHLIGHTS,
} from "./fee-compare-data";

/**
 * /[lang]/fee-compare —— 三方比价费用页（zh 侧，日本代购手续费对比）。
 *
 * 背景：路由蓝图原定 `/zh/compare`，但 `/[lang]/compare` 已是站内在用的「三平台商品比价
 * 搜索」入口（首页导航直接链到它，见 HomePageClient.tsx 的 nav "compare"），外科手术式
 * 铁律不碰现有页面/路由，故改落到 `/fee-compare`（费用/手续费对比，语义不冲突）。
 * `/[lang]/fees` 同样已被占用，是 en/tcg 站的英文费用估算页（深色「设计 A」主题），
 * 与本页定位不同（本页是 zh 侧、对标国内友商），故另起路由不复用。
 *
 * 外层壳：locale 非 en 时套 SiteHeader（无 footer），见 [lang]/layout.tsx；本页只负责正文，
 * 走全站 zh 消费端视觉语言（白底 + rose 品牌色，参照 HomePageClient.tsx）。
 *
 * 数字全部来自 fee-compare-data.ts，本文件不写死任何金额。
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  const base: Metadata = {
    title: "日本代购手续费对比｜费用透明对比 - 袋鼠君",
    description:
      "袋鼠君日本代购：10 年代拍老店，代购手续费现免、真人客服免费砍价代留言、拍照 200 円、国际运费与日本邮政同价不赚差价，费用透明公开，附手续费试算器与同行对比。",
  };

  if (!isIndexable(lang)) {
    return {
      ...base,
      robots: { index: false, follow: false },
      alternates: { canonical: null, languages: {} },
    };
  }

  return {
    ...base,
    alternates: buildAlternates(lang, "fee-compare"),
  };
}

export default async function FeeComparePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const qa = COMPARE_ROWS.map((row) => ({
    q: `${OUR_NAME}的${row.label}和同行（${COMPETITOR_A_NAME}、${COMPETITOR_B_NAME}）比怎么样？`,
    a: `${OUR_NAME}：${row.ours}；${COMPETITOR_A_NAME}：${row.competitorA}；${COMPETITOR_B_NAME}：${row.competitorB}。`,
  }));

  return (
    <div className="min-h-screen bg-zinc-50">
      {isIndexable(lang) && (
        <>
          <JsonLd
            data={breadcrumbJsonLd(lang, [
              { name: brandForLocale(lang), path: "" },
              { name: "费用透明对比", path: "fee-compare" },
            ])}
          />
          <JsonLd data={faqPageJsonLd(qa)} />
        </>
      )}

      {/* Hero */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:py-16">
          <span className="inline-block rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">
            费用对比
          </span>
          <h1 className="mt-4 text-3xl font-bold text-zinc-900 sm:text-4xl">
            费用透明对比
          </h1>
          <p className="mt-3 text-base text-zinc-500">
            同一件商品，各家到底收多少
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-12">
        {/* 袋鼠君亮点卡（资历 + 基础服务实价，纯我方，不与竞品比） */}
        <div className="mb-6 rounded-2xl border-2 border-rose-200 bg-rose-50/60 p-5 shadow-sm sm:mb-8 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-bold text-rose-700">{OUR_NAME}</span>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              ⭐ {BRAND_BADGE}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.label}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3"
              >
                <span className="text-sm font-medium text-zinc-500">
                  {h.label}
                </span>
                <span className="text-base font-bold text-rose-600">
                  {h.value}
                  {h.note ? (
                    <span className="ml-1 text-xs font-medium">（{h.note}）</span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 对比表（桌面端） */}
        <div className="hidden overflow-hidden rounded-2xl border bg-white shadow-sm md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-zinc-500">
                <th className="px-5 py-4 font-medium">对比项</th>
                <th className="px-5 py-4 text-center font-semibold text-rose-600">
                  {OUR_NAME}
                </th>
                <th className="px-5 py-4 text-center font-medium">
                  {COMPETITOR_A_NAME}
                </th>
                <th className="px-5 py-4 text-center font-medium">
                  {COMPETITOR_B_NAME}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr
                  key={row.label}
                  className="border-b last:border-0 align-top transition-colors hover:bg-zinc-50/60"
                >
                  <th
                    scope="row"
                    className="px-5 py-4 text-left font-medium text-zinc-900"
                  >
                    {row.label}
                    {row.footnote ? (
                      <div className="mt-1 text-xs font-normal text-zinc-400">
                        {row.footnote}
                      </div>
                    ) : null}
                  </th>
                  <td className="bg-rose-50/50 px-5 py-4 text-center font-semibold text-rose-700">
                    {row.ours}
                    {row.oursSub ? (
                      <span className="mt-0.5 block text-xs font-normal text-rose-500">
                        {row.oursSub}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-center text-zinc-600">
                    {row.competitorA}
                    {row.competitorASub ? (
                      <span className="mt-0.5 block text-xs text-zinc-400">
                        {row.competitorASub}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-center text-zinc-600">
                    {row.competitorB}
                    {row.competitorBSub ? (
                      <span className="mt-0.5 block text-xs text-zinc-400">
                        {row.competitorBSub}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 对比卡片（移动端） */}
        <div className="space-y-4 md:hidden">
          {COMPARE_ROWS.map((row) => (
            <div
              key={row.label}
              className="rounded-2xl border bg-white p-5 shadow-sm"
            >
              <h3 className="font-semibold text-zinc-900">{row.label}</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-start justify-between gap-4 rounded-xl bg-rose-50 px-3 py-2">
                  <dt className="shrink-0 font-semibold text-rose-700">
                    {OUR_NAME}
                  </dt>
                  <dd className="text-right leading-relaxed text-rose-700">
                    {row.ours}
                    {row.oursSub ? (
                      <span className="block text-xs text-rose-500">
                        {row.oursSub}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 px-3 py-1">
                  <dt className="shrink-0 font-medium text-zinc-500">
                    {COMPETITOR_A_NAME}
                  </dt>
                  <dd className="text-right leading-relaxed text-zinc-600">
                    {row.competitorA}
                    {row.competitorASub ? (
                      <span className="block text-xs text-zinc-400">
                        {row.competitorASub}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 px-3 py-1">
                  <dt className="shrink-0 font-medium text-zinc-500">
                    {COMPETITOR_B_NAME}
                  </dt>
                  <dd className="text-right leading-relaxed text-zinc-600">
                    {row.competitorB}
                    {row.competitorBSub ? (
                      <span className="block text-xs text-zinc-400">
                        {row.competitorBSub}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>
              {row.footnote ? (
                <p className="mt-3 text-xs text-zinc-400">{row.footnote}</p>
              ) : null}
            </div>
          ))}
        </div>

        {/* 代购手续费对比试算器 */}
        <div className="mt-10">
          <FeeCalculator />
        </div>

        {/* 到手价试算（商品价 + 手续费，折合人民币，不含国际运费） */}
        <div className="mt-6">
          <LandedCostEstimator />
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-zinc-400">
          {FOOTER_DISCLAIMER}
        </p>
      </main>
    </div>
  );
}
