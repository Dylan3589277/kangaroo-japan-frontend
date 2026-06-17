import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildAlternates, isIndexable } from "@/lib/seo";
import { TcgLandingPage } from "@/components/home/tcg/TcgLandingPage";
import { YUGIOH_KEYWORDS } from "@/components/home/tcg/tcg-keywords";
import ProductsPage from "../products/page";

const NAMESPACE = "yugioh-cards";
const PATH = "yugioh-cards";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  // English-first SEO copy; metadata only meaningful for the en design-A page.
  // Non-indexable locales (ja) get noindex; other locales fall back to /products.
  if (lang !== "en") {
    if (!isIndexable(lang)) {
      return {
        robots: { index: false, follow: false },
        alternates: { canonical: null, languages: {} },
      };
    }
    return {};
  }

  const t = await getTranslations({ locale: lang, namespace: NAMESPACE });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: buildAlternates(lang, PATH),
  };
}

/**
 * /[lang]/yugioh-cards —— 设计 A 英文 SEO 落地页：
 * "Buy Japanese Yu-Gi-Oh (OCG) cards from Japan"。
 * 仅 en 渲染设计 A 落地页（TcgLandingPage）；其它语言回退到现有 /products，
 * 不新增其它语言页面，也不影响旧 /products 行为（对齐 /cards 的处理）。
 */
export default async function YugiohCardsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (lang === "en") {
    return (
      <TcgLandingPage
        lang={lang}
        namespace={NAMESPACE}
        hotCards={YUGIOH_KEYWORDS}
        liveKeyword="遊戯王 25th"
      />
    );
  }

  return <ProductsPage />;
}
