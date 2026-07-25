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

/**
 * /[lang]/guides/* 共享壳 —— 英文限定的 GEO 长文指南。
 *
 * 指南只有英文内容（写给美国 TCG 买家的 AI 可引长文），没有翻译版本：
 * - en：正常 index，canonical/hreflang 只声明 en（不像 buildAlternates 那样列全
 *   6 个 locale——那些 URL 下是同一份英文，声明成翻译版本反而是错的）。
 * - 其它 locale：noindex + canonical 指回 en 版，防止重复内容分散权重。
 * 风格对齐 en 站设计 A 深色壳（同 /faq、/how-it-works）。
 */
export function buildGuideMetadata({
  lang,
  path,
  title,
  description,
}: {
  lang: string;
  path: string; // e.g. "guides/japan-card-import-tax-us-2026"
  title: string;
  description: string;
}): Metadata {
  const enUrl = buildCanonical("en", path);

  if (lang !== "en") {
    return {
      title,
      robots: { index: false, follow: true },
      alternates: { canonical: enUrl, languages: {} },
    };
  }

  return {
    title,
    description,
    alternates: {
      canonical: enUrl,
      languages: { "en-US": enUrl, "x-default": enUrl },
    },
  };
}

/** Article 结构化数据（datePublished 固定为发布日，改稿时更新 dateModified）。 */
export function articleJsonLd({
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
    mainEntityOfPage: buildCanonical("en", path),
    author: { "@type": "Organization", name: "Kangaroo Japan", url: `${BASE_URL}/en` },
    publisher: { "@id": `${BASE_URL}/#organization` },
  };
}

/* ---- 排版原子（无 typography 插件，手写工具类，风格对齐设计 A 深色壳） ---- */

export function GuideH2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-24 text-2xl font-bold tracking-tight text-white">
      {children}
    </h2>
  );
}

export function GuideH3({ children }: { children: ReactNode }) {
  return <h3 className="mt-8 text-lg font-semibold text-white">{children}</h3>;
}

export function GuideP({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[15px] leading-relaxed text-slate-400">{children}</p>;
}

export function GuideUl({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-slate-400 marker:text-cyan-400">
      {children}
    </ul>
  );
}

export function GuideOl({ children }: { children: ReactNode }) {
  return (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-[15px] leading-relaxed text-slate-400 marker:text-cyan-400">
      {children}
    </ol>
  );
}

export function GuideStrong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-slate-200">{children}</strong>;
}

/** TL;DR 高亮框 —— GEO 关键：结论先行，AI 摘要最先抓这里。 */
export function GuideTldr({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06] p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">TL;DR</p>
      <div className="mt-2 text-[15px] leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}

/** 简单响应式表格。rows 每行第一列自动加粗。 */
export function GuideTable({
  head,
  rows,
}: {
  head: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-white/[0.04]">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold text-slate-200">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-t border-white/[0.06] align-top">
              {cells.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-3 ${j === 0 ? "font-medium text-slate-200" : "text-slate-400"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 页面壳：面包屑/Article JSON-LD + hero + 正文容器 + 底部 CTA。 */
export function GuideShell({
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
  /** 改稿日：政策类时效文必须给，Google 会拿它判断内容新鲜度。 */
  dateModified?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#0a0e16] text-slate-200 antialiased">
      {isIndexable(lang) && (
        <>
          <JsonLd
            data={articleJsonLd({
              path,
              headline: title,
              description: intro,
              datePublished,
              dateModified,
            })}
          />
          <JsonLd
            data={breadcrumbJsonLd("en", [
              { name: brandForLocale("en"), path: "" },
              { name: "Guides", path: "guides" },
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
            Published {datePublished}
            {dateModified ? ` · Updated ${dateModified}` : ""} · Kangaroo Japan editorial team
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14">{children}</article>

      {/* 底部承接：GEO 引来的人要接得住 */}
      <section className="border-t border-white/[0.08]">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center">
          <h2 className="text-xl font-bold text-white">Ready to buy from Japan?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            Search live listings from Mercari Japan and Yahoo! Auctions, and we handle buying,
            inspection and shipping.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/${lang}/cards`}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
            >
              Search cards
            </Link>
            <Link
              href={`/${lang}/faq`}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
