import type { Metadata } from "next";
import {
  buildAlternates,
  isIndexable,
  breadcrumbJsonLd,
  brandForLocale,
} from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { fetchShippingRates } from "@/lib/server/shipping-rates";
import { fetchValueAddedServices } from "@/lib/server/value-added";
import { getActivePromo } from "@/lib/promo-config";
import { FeeCalculatorApp } from "./FeeCalculatorApp";

/**
 * `/[lang]/fee-calculator` —— 费用试算器（zh 侧，独立页，花哥 2026-08-06 拍板）。
 *
 * 与 `/fee-compare` 的关系：`/fee-compare` 是"我们 vs 同行"的对比页（保留三家名义
 * 费率试算器 `FeeCalculator.tsx`）；本页是"这一单我到底要花多少"的单平台完整试算
 * （商品款+手续费+国际运费一起算），原先嵌在 `/fee-compare` 里的 `LandedCostEstimator`
 * 已被本页取代并从那页移除（改放引导链接），避免同一套计价 UI 两处维护。
 *
 * 外层壳同 `/fee-compare`：locale 非 en 时套 `SiteHeader`（见 `[lang]/layout.tsx`），
 * 本页只负责正文，走 zh 消费端视觉语言（白底 + rose 品牌色）。
 *
 * 数据：国际运费梯度表在服务端渲染时一次性拉取（`fetchShippingRates()`，见其头部
 * 注释——老后台响应无 CORS 头，必须服务端转发），随页面 props 传给客户端组件；
 * 增值服务价目表同样服务端拉取（`fetchValueAddedServices()`，见其头部注释——实时
 * 读老后台、失败回落硬编码快照，永不返回 null）；商品款/手续费部分由客户端组件
 * 按输入实时调用既有 `api.getFeeEstimate()`。
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  const base: Metadata = {
    title: "费用试算器｜商品款+国际运费一目了然 - 袋鼠君",
    description:
      "输入商品价格和购物平台，自动算出支付手续费、代拍手续费、国际运费（EMS/航空/船运可选），一次看清商品费 + 国际运费总计，附当前活动与关税提醒。",
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
    alternates: buildAlternates(lang, "fee-calculator"),
  };
}

export default async function FeeCalculatorPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const [shippingRates, valueAddedServices] = await Promise.all([
    fetchShippingRates(),
    fetchValueAddedServices(),
  ]);
  const activePromo = getActivePromo();

  return (
    <div className="min-h-screen bg-zinc-50">
      {isIndexable(lang) && (
        <JsonLd
          data={breadcrumbJsonLd(lang, [
            { name: brandForLocale(lang), path: "" },
            { name: "费用试算器", path: "fee-calculator" },
          ])}
        />
      )}

      {/* Hero */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:py-16">
          <span className="inline-block rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">
            费用试算
          </span>
          <h1 className="mt-4 text-3xl font-bold text-zinc-900 sm:text-4xl">
            费用试算器
          </h1>
          <p className="mt-3 text-base text-zinc-500">
            商品款 + 国际运费，一次算清楚要花多少
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-12">
        <FeeCalculatorApp
          initialShippingRates={shippingRates}
          initialValueAddedServices={valueAddedServices}
          activePromo={activePromo}
        />
      </main>
    </div>
  );
}
