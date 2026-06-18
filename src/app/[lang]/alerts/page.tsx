import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { buildAlternates, isIndexable } from "@/lib/seo";
import { AlertsLandingPage } from "@/components/tcg/alerts/AlertsLandingPage";
import ProductsPage from "../products/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  // tcg-alerts copy is English-first; read via resolved locale (falls back to en
  // in the i18n request config).
  const t = await getTranslations({ locale: lang, namespace: "tcg-alerts" });

  const base: Metadata = {
    title: t("meta.title"),
    description: t("meta.description"),
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
    alternates: buildAlternates(lang, "alerts"),
  };
}

/**
 * /[lang]/alerts —— 设计 A（深色高级感）英文 TCG「上新提醒」订阅落地页。
 * 仅 en 渲染设计 A 落地页；其它语言回退到现有 /products 视图（与 /cards 同策略），
 * 既不新增其它语言页面，也不影响旧 /products 的非 en 行为。
 *
 * AlertsLandingPage 用 useSearchParams（读 ?confirmed=1/?unsubscribed=1），
 * 故按 App Router 规范包一层 Suspense 边界。
 */
export default async function AlertsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (lang === "en") {
    return (
      <Suspense fallback={null}>
        <AlertsLandingPage />
      </Suspense>
    );
  }

  return <ProductsPage />;
}
