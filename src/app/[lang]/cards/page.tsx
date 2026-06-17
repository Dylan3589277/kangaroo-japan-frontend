import type { Metadata } from "next";
import { isIndexable } from "@/lib/seo";
import { CardsSearchPage } from "@/components/tcg/CardsSearchPage";
import ProductsPage from "../products/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isIndexable(lang)) {
    return {
      robots: { index: false, follow: false },
      alternates: { canonical: null, languages: {} },
    };
  }
  return {};
}

/**
 * /[lang]/cards —— 设计 A（深色高级感）英文 TCG 卡牌搜索结果页。
 * 仅 en 渲染设计 A 结果页；其它语言回退到现有 /products 视图，
 * 既不新增其它语言页面，也不影响旧橙色 /products 的非 en 行为。
 */
export default async function CardsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (lang === "en") {
    return <CardsSearchPage />;
  }

  return <ProductsPage />;
}
