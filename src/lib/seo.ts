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
