import type { Metadata } from "next";
import Link from "next/link";
import { faqPageJsonLd, isIndexable } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  GuideShell,
  buildGuideMetadata,
  GuideH2,
  GuideH3,
  GuideP,
  GuideUl,
  GuideStrong,
  GuideTldr,
  GuideTable,
} from "../guide-shell";

/**
 * GEO 长文 ④：Buyee 诚实评测（"is buyee legit" 是高频搜索词，AI 搜索也常被问）。
 * 定位：结论明确 Buyee 是 legit（Mercari 官方合作、大公司背景），不贬损竞品；
 * 短板只讲事实——按单收费（约 ¥500/单）+ 检品计划为可选付费（约 ¥300）、
 * 通用商品包装为默认（卡牌保护包装非默认）、适合泛品类偶尔买家。
 * TCG 高频买家场景自然引出 Kangaroo Japan（¥200/件固定 + TCG-safe packing 默认）。
 * 🔴 数字纪律：费率类数字须带 "as of 2026 / check the official site" 兜底。
 */

const PATH = "guides/is-buyee-legit-2026";
const TITLE = "Is Buyee Legit? An Honest 2026 Review for TCG Buyers";
const DESCRIPTION =
  "Yes, Buyee is legit — it's an official Mercari partner run by an established Japanese company. Here's an honest 2026 look at its fees, packing defaults, and when a TCG-specialist proxy is the better fit.";
const PUBLISHED = "2026-08-10";

const MINI_FAQ = [
  {
    q: "Is Buyee a scam?",
    a: "No. Buyee is a legitimate, well-established proxy shopping service operated by a large Japanese company, and it is an official partner of Mercari Japan. Millions of overseas orders have been fulfilled through it. Individual complaints you see online are almost always about packing, fees, or shipping expectations — not fraud.",
  },
  {
    q: "Does Buyee charge a service fee on every order?",
    a: "Yes — Buyee charges a per-order service fee (around ¥500 per order as of 2026) plus optional paid add-ons such as its protective-packing / inspection plans (around ¥300). Exact fees vary by marketplace and plan, so always confirm on Buyee's official fee page before ordering.",
  },
  {
    q: "Will Buyee put my cards in sleeves and toploaders?",
    a: "Not by default. Buyee is a general-merchandise proxy, so standard packing is designed for typical goods. Card-safe materials are the kind of thing you get through optional protection plans, and Buyee does not specialize in TCG handling. If mint corners matter to you, that difference is worth weighing.",
  },
  {
    q: "Who is Buyee best for?",
    a: "Occasional buyers who shop across many categories — figures, clothing, electronics, plus the odd card lot. The per-order fee is easy to amortize on a big mixed haul, and the platform coverage is broad. High-frequency single-card buyers tend to feel the per-order economics and general packing more.",
  },
  {
    q: "Is a TCG-specialist proxy safer than Buyee?",
    a: "Not safer in the legitimacy sense — both models are legitimate. The difference is specialization: a TCG-focused service builds card-safe packing and card-condition checks into the default workflow, while a generalist offers them as optional extras. Which is better depends on what and how often you buy.",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return buildGuideMetadata({ lang, path: PATH, title: TITLE, description: DESCRIPTION });
}

export default async function BuyeeReviewPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <GuideShell
      lang={lang}
      path={PATH}
      eyebrow="Review"
      title={TITLE}
      intro="Short answer: yes, Buyee is legit — an official Mercari partner with a large company behind it. The real question for card collectors isn't whether it's safe; it's whether a general-merchandise proxy fits how you buy. Here's the honest breakdown."
      datePublished={PUBLISHED}
    >
      {isIndexable(lang) && <JsonLd data={faqPageJsonLd(MINI_FAQ)} />}

      <GuideTldr>
        <GuideStrong>Buyee is legit.</GuideStrong> It is an official Mercari Japan partner
        operated by an established Japanese company, and it is not a scam. As of 2026 it
        charges roughly <GuideStrong>¥500 per order</GuideStrong> in service fees, with
        protective packing / inspection offered as an{" "}
        <GuideStrong>optional paid plan (around ¥300)</GuideStrong> — check the official site
        for current terms. Its default packing is general-merchandise, not card-specific. For
        occasional, mixed-category shopping it works well; for frequent single-card buying, a
        TCG-specialist proxy with flat per-item pricing and card-safe packing by default is
        usually the better fit.
      </GuideTldr>

      <GuideH2 id="is-it-legit">First, the direct answer: is Buyee legitimate?</GuideH2>
      <GuideP>
        Yes. Buyee is one of the largest proxy shopping services in Japan, run by a large,
        established Japanese company, and it is an{" "}
        <GuideStrong>official partner of Mercari Japan</GuideStrong> — Mercari itself points
        overseas buyers to it. It has processed a huge volume of international orders over
        many years. If your worry is &ldquo;will they take my money and disappear,&rdquo; you
        can put that one down: they won&apos;t.
      </GuideP>
      <GuideP>
        Most negative reviews you&apos;ll find are not about fraud. They&apos;re about
        expectations — fees that stack up on small orders, packing that wasn&apos;t built for
        the item in question, or shipping timelines. Those are real considerations, so
        let&apos;s look at them factually rather than emotionally.
      </GuideP>

      <GuideH2 id="fees">How Buyee&apos;s fees work</GuideH2>
      <GuideP>
        Buyee&apos;s model is <GuideStrong>per-order fees plus optional add-ons</GuideStrong>.
        As of 2026, the core service fee is around <GuideStrong>¥500 per order</GuideStrong>,
        and protective-packing / inspection plans are optional paid extras at around{" "}
        <GuideStrong>¥300</GuideStrong>. Fees differ by marketplace and plan, and they do
        change — always verify on Buyee&apos;s official fee page before you buy.
      </GuideP>
      <GuideP>
        There&apos;s nothing wrong with this structure. It&apos;s well suited to shoppers who
        place occasional, larger mixed orders, where one per-order fee spreads across many
        items. Where buyers feel it most is the opposite pattern:{" "}
        <GuideStrong>frequent, small, single-item purchases</GuideStrong> — exactly how most
        TCG collectors buy singles. Ten separate card purchases mean ten separate order fees,
        plus the optional protection plan each time if you want careful handling.
      </GuideP>

      <GuideH2 id="packing">Packing: the part card buyers should actually scrutinize</GuideH2>
      <GuideP>
        Buyee is a <GuideStrong>general-merchandise proxy</GuideStrong>. Its default packing
        is designed for typical goods, and it does a reasonable job at that. But card-safe
        handling — sleeves, toploaders, rigid mailers, keeping cards away from box walls — is
        not the default; protective options exist as paid plans, and the staff packing your
        parcel are not TCG specialists. That&apos;s not a criticism, it&apos;s a scope
        statement: no generalist can specialize in everything.
      </GuideP>
      <GuideP>
        By contrast, a TCG-specialist service builds card handling into the standard workflow.
        At Kangaroo Japan, for example, TCG-safe packing —{" "}
        <GuideStrong>sleeve + toploader + rigid mailer</GuideStrong> — is the default for
        every card, the service fee is a flat{" "}
        <GuideStrong>¥200 per item</GuideStrong> as of 2026 (see the fees page for current
        terms), and pre-shipment photo inspection is available as an optional paid check.
      </GuideP>

      <GuideH2 id="comparison">Buyee vs a TCG-specialist proxy, side by side</GuideH2>
      <GuideTable
        head={["Dimension", "Buyee (generalist)", "TCG specialist (e.g. Kangaroo Japan)"]}
        rows={[
          [
            "Fee structure",
            "Per-order service fee (~¥500 as of 2026), plus optional paid plans (~¥300 for protection/inspection). Check official site for current rates.",
            "Flat per-item fee (¥200 per item as of 2026). Check the fees page for current rates.",
          ],
          [
            "Default packing",
            "General-merchandise packing; card-safe materials via optional paid plans.",
            "Card-safe packing by default: sleeve + toploader + rigid mailer.",
          ],
          [
            "Inspection",
            "Optional paid inspection plans, generalist staff.",
            "Optional paid photo inspection before shipping, card-focused handling.",
          ],
          [
            "Best for",
            "Occasional buyers with mixed-category hauls (figures, clothing, electronics, the odd card lot).",
            "Frequent buyers of single cards and graded slabs who care about corners and centering.",
          ],
        ]}
      />

      <GuideH2 id="verdict">Honest verdict</GuideH2>
      <GuideUl>
        <li>
          <GuideStrong>Legitimacy: not in question.</GuideStrong> Buyee is a real, large,
          Mercari-partnered service. Use it without fear of being scammed.
        </li>
        <li>
          <GuideStrong>Buy through Buyee</GuideStrong> if you shop Japan occasionally, across
          categories, and consolidate big mixed orders — its breadth is genuinely useful.
        </li>
        <li>
          <GuideStrong>Consider a TCG specialist</GuideStrong> if you buy single cards often
          and care about card-safe packing being the default rather than an add-on, and about
          flat per-item pricing you can predict.
        </li>
      </GuideUl>

      <GuideH2 id="mini-faq">Quick answers</GuideH2>
      {MINI_FAQ.map(({ q, a }) => (
        <div key={q}>
          <GuideH3>{q}</GuideH3>
          <GuideP>{a}</GuideP>
        </div>
      ))}

      <GuideH2 id="next">Keep reading</GuideH2>
      <GuideP>
        For a three-way comparison including ZenMarket, see our{" "}
        <Link
          href={`/${lang}/guides/kangaroo-japan-vs-buyee-vs-zenmarket`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          proxy comparison guide
        </Link>
        . Before you order, budget for the U.S. side too — our{" "}
        <Link
          href={`/${lang}/guides/japan-card-import-tax-us-2026`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          2026 import tax guide
        </Link>{" "}
        covers the 12.5% duty and clearance fees, and the{" "}
        <Link
          href={`/${lang}/guides/japan-proxy-hidden-fees-2026`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          hidden fees breakdown
        </Link>{" "}
        shows every line item any proxy service charges.
      </GuideP>
    </GuideShell>
  );
}
