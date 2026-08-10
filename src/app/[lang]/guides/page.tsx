import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, brandForLocale, isIndexable } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildGuideMetadata } from "./guide-shell";

/**
 * /[lang]/guides —— GEO 指南 hub（英文限定，列出全部长文指南）。
 * 新增指南时在 GUIDES 数组加一行，并同步 src/app/sitemap.ts 的 enOnlyPages。
 */

const TITLE = "Guides — Buying Japanese TCG from Japan";
const DESCRIPTION =
  "Practical guides for U.S. trading-card buyers: 2026 import taxes on Japanese cards, proxy service comparison, and how to buy from Mercari Japan.";

const GUIDES = [
  {
    slug: "japan-card-import-tax-us-2026",
    tag: "Customs & taxes",
    title: "U.S. Import Tax on Japanese Pokémon Cards in 2026",
    description:
      "The 12.5% Section 301 rate in force since July 24, 2026, carrier clearance fees, no more de minimis — with a worked example.",
  },
  {
    slug: "kangaroo-japan-vs-buyee-vs-zenmarket",
    tag: "Comparison",
    title: "Kangaroo Japan vs Buyee vs ZenMarket for Pokémon Cards",
    description:
      "Public rates, packing standards, inspection and when each proxy service is the right choice — honestly.",
  },
  {
    slug: "how-to-buy-pokemon-cards-from-mercari-japan",
    tag: "Tutorial",
    title: "How to Buy Pokémon Cards from Mercari Japan",
    description:
      "Japanese search terms that work, condition terms decoded, scam red flags, and the all-in cost.",
  },
  {
    slug: "is-buyee-legit-2026",
    tag: "Review",
    title: "Is Buyee Legit? An Honest 2026 Review for TCG Buyers",
    description:
      "Yes, it's legit — an official Mercari partner. When it fits, where its fees and packing defaults pinch card buyers, and when a TCG specialist is the better call.",
  },
  {
    slug: "japan-proxy-hidden-fees-2026",
    tag: "Fees",
    title: "Japan Proxy Shopping Hidden Fees Explained (2026)",
    description:
      "All seven charges between a Japanese listing and your door — service fees, FX markup, storage, volumetric weight, import duty — with a self-audit checklist.",
  },
  {
    slug: "psa-graded-cards-from-japan-2026",
    tag: "Graded cards",
    title: "Buying PSA Graded Cards from Japan (2026)",
    description:
      "Why slabs are often cheaper in Japan, cert-number verification, crack-proof shipping, and the full landed cost with a worked ¥30,000 example.",
  },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return buildGuideMetadata({ lang, path: "guides", title: TITLE, description: DESCRIPTION });
}

export default async function GuidesHubPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <main className="min-h-screen bg-[#0a0e16] text-slate-200 antialiased">
      {isIndexable(lang) && (
        <JsonLd
          data={breadcrumbJsonLd("en", [
            { name: brandForLocale("en"), path: "" },
            { name: "Guides", path: "guides" },
          ])}
        />
      )}

      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-300">
            Guides
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Buying Japanese cards, explained
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
            Taxes, fees, marketplaces and the traps — written for U.S. TCG buyers, kept
            current as the rules change.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-12 sm:py-16">
        {GUIDES.map((guide) => (
          <Link
            key={guide.slug}
            href={`/${lang}/guides/${guide.slug}`}
            className="block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.05]"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-cyan-300">
              {guide.tag}
            </span>
            <h2 className="mt-2 text-xl font-bold text-white">{guide.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{guide.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
