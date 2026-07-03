/**
 * Shared SEO helpers for jp-buy.com
 * - Canonical URLs follow the pattern: BASE_URL/{lang}/{path}
 * - hreflang alternates exclude /ja (noindex for business reasons)
 */

export const BASE_URL = "https://jp-buy.com";

/** Locales that are SEO-indexable (ja is excluded — noindex by business decision) */
export const INDEXABLE_LOCALES = ["zh", "en", "ko", "th", "id", "vi"] as const;
export type IndexableLocale = (typeof INDEXABLE_LOCALES)[number];

/** BCP-47 language tags used in hreflang attributes */
export const LOCALE_LANGUAGE_MAP: Record<IndexableLocale, string> = {
  zh: "zh-CN",
  en: "en-US",
  ko: "ko-KR",
  th: "th-TH",
  id: "id-ID",
  vi: "vi-VN",
};

/**
 * Returns true if the locale should be indexed by search engines.
 */
export function isIndexable(lang: string): lang is IndexableLocale {
  return (INDEXABLE_LOCALES as readonly string[]).includes(lang);
}

/**
 * Builds the canonical URL for a given locale and path segment.
 *
 * @param lang - locale code, e.g. "zh"
 * @param path - page path WITHOUT leading slash, e.g. "products" or "" for homepage
 */
export function buildCanonical(lang: string, path: string = ""): string {
  const segment = path ? `/${path}` : "";
  return `${BASE_URL}/${lang}${segment}`;
}

/**
 * Builds the hreflang alternates object for Next.js metadata `alternates.languages`.
 * Only includes indexable locales; excludes `ja`.
 *
 * @param path - page path WITHOUT leading slash, e.g. "products" or "" for homepage
 */
export function buildAlternateLanguages(
  path: string = ""
): Record<string, string> {
  const segment = path ? `/${path}` : "";
  const languages: Record<string, string> = {};
  for (const locale of INDEXABLE_LOCALES) {
    languages[LOCALE_LANGUAGE_MAP[locale]] = `${BASE_URL}/${locale}${segment}`;
  }
  languages["x-default"] = `${BASE_URL}/zh${segment}`;
  return languages;
}

/**
 * Builds the full `alternates` metadata object (canonical + hreflang).
 * Returns empty object for non-indexable locales (e.g. "ja") so they get no tags.
 *
 * @param lang - locale code
 * @param path - page path WITHOUT leading slash
 */
export function buildAlternates(
  lang: string,
  path: string = ""
): { canonical: string; languages: Record<string, string> } | Record<never, never> {
  if (!isIndexable(lang)) return {};
  return {
    canonical: buildCanonical(lang, path),
    languages: buildAlternateLanguages(path),
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD (schema.org) builders — 供 <JsonLd data={...} /> 渲染。      */
/* GEO 用：让 AI/搜索引擎机器可读地理解站点与页面。                      */
/* ------------------------------------------------------------------ */

/** 站点品牌按 locale 分流：en 对外叫 Kangaroo Japan，zh 对外叫 JP-Buy。 */
export function brandForLocale(lang: string): string {
  return lang === "en" ? "Kangaroo Japan" : "JP-Buy";
}

/**
 * Organization schema，挂在每个可索引 locale 的布局上。
 * logo 用 public/brand 下的正式 logo；描述按 en/zh 两套业务口径分开。
 */
export function organizationJsonLd(lang: string): Record<string, unknown> {
  const isEn = lang === "en";
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: brandForLocale(lang),
    url: `${BASE_URL}/${lang}`,
    logo: `${BASE_URL}/brand/kangaroo-logo.png`,
    description: isEn
      ? "Proxy buying service for Japanese trading cards. We buy Pokémon, Yu-Gi-Oh and One Piece cards from Mercari Japan, Yahoo! Auctions and Japanese shops, then inspect, consolidate and ship them worldwide."
      : "日本代购代拍平台：煤炉 Mercari 代购、雅虎拍卖代拍、乐天/雅虎购物日淘，日本仓验货合箱直邮。",
  };
}

/**
 * WebSite schema（含站内搜索入口），挂首页即可。
 */
export function webSiteJsonLd(lang: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: brandForLocale(lang),
    url: `${BASE_URL}/${lang}`,
    inLanguage: LOCALE_LANGUAGE_MAP[(lang as IndexableLocale)] ?? "en-US",
  };
}

/**
 * BreadcrumbList schema。items 从站点根开始按顺序传入。
 * path 不带前导斜杠，"" 表示该 locale 首页。
 */
export function breadcrumbJsonLd(
  lang: string,
  items: Array<{ name: string; path: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: buildCanonical(lang, item.path),
    })),
  };
}

/**
 * FAQPage schema。qa 传入已本地化的问答对（从 i18n 翻译里取，保证与页面内容一致）。
 */
export function faqPageJsonLd(
  qa: Array<{ q: string; a: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
