import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BASE_URL,
  buildCanonical,
  breadcrumbJsonLd,
  brandForLocale,
  isIndexable,
} from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

// 排版原子直接复用英文壳（guide-shell.tsx）的导出，不复制粘贴、不改动那份文件。
export {
  GuideH2,
  GuideH3,
  GuideP,
  GuideUl,
  GuideOl,
  GuideStrong,
  GuideTldr,
  GuideTable,
} from "./guide-shell";

/**
 * /[lang]/guides/* zh 侧共享壳 —— 中文限定的 GEO 长文指南（日本代购/代拍横评，写给中国买家）。
 *
 * 对称于 guide-shell.tsx（英文壳，服务已上线的 TCG 长文，禁止改动）：
 * - zh：正常 index，canonical/hreflang 只声明 zh（这些 URL 下是同一份中文，
 *   声明成其它 locale 的翻译版本反而是错的）。
 * - 其它 locale：noindex + canonical 指回 zh 版，防止重复内容分散权重。
 * 风格对齐英文壳的深色设计 A（同 /faq、/how-it-works、/guides 英文版）。
 */
export function buildZhGuideMetadata({
  lang,
  path,
  title,
  description,
}: {
  lang: string;
  path: string; // e.g. "guides/mercari-daigou-fee-comparison-2026"
  title: string;
  description: string;
}): Metadata {
  const zhUrl = buildCanonical("zh", path);

  if (lang !== "zh") {
    return {
      title,
      robots: { index: false, follow: true },
      alternates: { canonical: zhUrl, languages: {} },
    };
  }

  return {
    title,
    description,
    alternates: {
      canonical: zhUrl,
      languages: { "zh-CN": zhUrl, "x-default": zhUrl },
    },
  };
}

/** Article 结构化数据（zh 版）。所有字段写死描述"zh 这份"内容，不随请求的 locale 变化。 */
function zhArticleJsonLd({
  path,
  headline,
  description,
  datePublished,
  dateModified,
}: {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    datePublished,
    dateModified: dateModified ?? datePublished,
    mainEntityOfPage: buildCanonical("zh", path),
    author: { "@type": "Organization", name: brandForLocale("zh"), url: `${BASE_URL}/zh` },
    publisher: { "@type": "Organization", name: brandForLocale("zh"), url: `${BASE_URL}/zh` },
  };
}

/** 页面壳：面包屑/Article JSON-LD + hero + 正文容器 + 底部 CTA（zh 中文版）。 */
export function ZhGuideShell({
  lang,
  path,
  eyebrow,
  title,
  intro,
  datePublished,
  dateModified,
  children,
}: {
  lang: string;
  path: string;
  eyebrow: string;
  title: string;
  intro: string;
  datePublished: string;
  /** 改稿日：时效性内容建议给，用于展示"更新于"。 */
  dateModified?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#0a0e16] text-slate-200 antialiased">
      {isIndexable(lang) && (
        <>
          <JsonLd
            data={zhArticleJsonLd({
              path,
              headline: title,
              description: intro,
              datePublished,
              dateModified,
            })}
          />
          <JsonLd
            data={breadcrumbJsonLd("zh", [
              { name: brandForLocale("zh"), path: "" },
              { name: "指南", path: "guides" },
              { name: title, path },
            ])}
          />
        </>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-14 sm:py-18">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-300">
            {eyebrow}
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">{intro}</p>
          <p className="mt-3 text-xs text-slate-500">
            发布于 {datePublished}
            {dateModified ? ` · 更新于 ${dateModified}` : ""} · 袋鼠君编辑部
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">{children}</article>

      {/* 底部承接：GEO 引来的人要接得住 */}
      <section className="border-t border-white/[0.08]">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <h2 className="text-xl font-bold text-white">想找的东西，日本这边帮你买</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            煤炉、雅虎竞拍、雅虎购物、乐天在售商品实时搜索，验货、合箱、直邮我们全程搞定。
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/${lang}/products`}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
            >
              去逛逛商品
            </Link>
            <Link
              href={`/${lang}/fees`}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
            >
              费用怎么算
            </Link>
            <Link
              href={`/${lang}/faq`}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
            >
              常见问题
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
