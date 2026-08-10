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
 * GEO 长文 ⑥：从日本买 PSA 评级卡专项指南（graded/slab 买家客单价高、搜索意图强）。
 * 要点：日本市场评级卡为何常更便宜（供给/日文版价差/汇率）、cert number 官网验真、
 * slab 运输包装要求（reinforced box 防裂）、进口成本（12.5% + $9–17）、
 * ¥30,000 PSA 10 到手价实算（≈$200 + duty ~$25 + clearance ~$9.35 ≈ $34 进口成本）、
 * raw 卡自送评 vs 直接买 slab 的取舍。
 * 🔴 数字纪律：只用施工单数字；费率句子带 "as of 2026 / check official" 兜底。
 */

const PATH = "guides/psa-graded-cards-from-japan-2026";
const TITLE = "Buying PSA Graded Cards from Japan (2026): Prices, Shipping & Import Tax";
const DESCRIPTION =
  "Why PSA slabs are often cheaper on Japanese marketplaces, how to verify a cert number, what safe slab shipping looks like, and the full landed cost — 12.5% duty plus clearance fees — with a worked ¥30,000 example.";
const PUBLISHED = "2026-08-10";

const MINI_FAQ = [
  {
    q: "How do I know a PSA slab from Japan is real?",
    a: "Look up the certification number printed on the label at PSA's official cert verification page — it shows the card, grade, and details PSA has on file for that number. If the listing photos don't show the cert number clearly, ask for it before bidding. A cert that doesn't match the card in the photos is your cue to walk away.",
  },
  {
    q: "Why are PSA cards often cheaper in Japan than on eBay?",
    a: "Three structural reasons: Japan's collector market has deep supply of Japanese-language cards, Japanese-print versions typically trade below their English counterparts, and the yen's exchange rate in recent years has favored USD buyers. None of that implies anything wrong with the cards — it's a market difference, not a quality difference.",
  },
  {
    q: "Can a PSA slab crack during international shipping?",
    a: "Yes, if it's packed loosely — slabs are sturdy but not indestructible, and a slab rattling in an oversized box can crack at the corners. Safe shipping means the slab is immobilized, cushioned, and packed in a reinforced box. Confirm your proxy's slab packing standard before shipping anything valuable.",
  },
  {
    q: "Do graded cards pay more U.S. import duty than raw cards?",
    a: "No. As of 2026 the 12.5% duty applies to the item's transaction value regardless of grading. A graded card pays more dollars simply because it costs more, not because of a different rate. See our import tax guide for the full mechanics.",
  },
  {
    q: "Is it cheaper to buy raw cards in Japan and grade them myself?",
    a: "Sometimes — raw cards cost less up front, and Japan is a good source of clean raw copies. But you take on grading fees, round-trip shipping to PSA, waiting time, and grade risk: a card that comes back below the grade you hoped for can be worth less than the all-in cost. Buying an existing slab means paying for certainty; grading raw is a calculated bet.",
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

export default async function PsaGradedCardsGuidePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <GuideShell
      lang={lang}
      path={PATH}
      eyebrow="Graded cards"
      title={TITLE}
      intro="Japanese marketplaces are one of the best-value sources of PSA graded cards anywhere — if you know how to verify slabs, ship them safely, and price in the U.S. import charges. Here's the full playbook, with a worked example from listing price to landed cost."
      datePublished={PUBLISHED}
    >
      {isIndexable(lang) && <JsonLd data={faqPageJsonLd(MINI_FAQ)} />}

      <GuideTldr>
        PSA slabs on Japanese marketplaces are often cheaper than U.S. listings thanks to{" "}
        <GuideStrong>deep supply, the Japanese-print price gap, and the exchange rate</GuideStrong>.
        Verify every slab by checking its <GuideStrong>cert number on PSA&apos;s official
        site</GuideStrong>, insist on reinforced-box packing so the slab can&apos;t crack in
        transit, and budget the U.S. side: as of 2026 that&apos;s{" "}
        <GuideStrong>12.5% duty on the item value</GuideStrong> plus a carrier clearance fee
        of roughly <GuideStrong>$9&ndash;17</GuideStrong>. Worked example: a{" "}
        <GuideStrong>¥30,000 PSA 10 (≈ $200)</GuideStrong> lands with about{" "}
        <GuideStrong>$34 in import costs</GuideStrong> on the cheapest clearance route.
      </GuideTldr>

      <GuideH2 id="why-cheaper">Why graded cards are often cheaper in Japan</GuideH2>
      <GuideUl>
        <li>
          <GuideStrong>Supply depth.</GuideStrong> Japan is where these cards were printed
          and collected first. Marketplaces like Mercari Japan and Yahoo! Auctions carry a
          volume of graded Japanese cards that U.S. marketplaces simply don&apos;t, and more
          supply means more competitive pricing.
        </li>
        <li>
          <GuideStrong>The Japanese-print price gap.</GuideStrong> Japanese-language versions
          of a card typically trade below the English print of the same card and grade. For
          collectors who value the original-language card — or just the artwork — that gap is
          pure value.
        </li>
        <li>
          <GuideStrong>Exchange rate.</GuideStrong> The yen&apos;s level in recent years has
          made JPY-priced listings attractive to USD buyers. Rates move, so run today&apos;s
          numbers rather than assuming — but it has been a meaningful tailwind.
        </li>
      </GuideUl>

      <GuideH2 id="verify">Verifying a slab before you buy</GuideH2>
      <GuideP>
        Every PSA slab carries a certification number on its label, and{" "}
        <GuideStrong>PSA&apos;s official website lets anyone look that number up</GuideStrong>{" "}
        — it returns the card, set, and grade PSA has on file. Make this a habit, not an
        exception:
      </GuideP>
      <GuideUl>
        <li>
          Read the cert number from the listing photos; if it isn&apos;t legible, ask the
          seller for it or for a clearer photo before committing.
        </li>
        <li>
          Check that the card and grade returned by PSA&apos;s lookup match what&apos;s in
          the photos — same card, same set, same grade.
        </li>
        <li>
          Inspect label and case details against the photos. A mismatch anywhere is reason
          enough to skip the listing; there will always be another copy.
        </li>
      </GuideUl>

      <GuideH2 id="shipping">Shipping slabs safely: what to require</GuideH2>
      <GuideP>
        A PSA case protects the card, but the case itself can crack if it&apos;s loose in a
        parcel — corners are the usual casualty. International slab shipping done right looks
        like this:
      </GuideP>
      <GuideUl>
        <li>
          The slab immobilized so it cannot shift or rattle, with cushioning on all sides.
        </li>
        <li>
          A <GuideStrong>reinforced, rigid box</GuideStrong> rather than a padded envelope —
          envelopes are how corners get crushed in transit.
        </li>
        <li>
          For multiple slabs, separation between cases so they can&apos;t knock against each
          other.
        </li>
      </GuideUl>
      <GuideP>
        If you&apos;re buying through a proxy service, ask what its packing standard for
        graded cards is before you ship — this is a fair, answerable question, and any
        card-focused service will have a concrete answer. A pre-shipment photo check, where
        offered, also lets you confirm the slab&apos;s condition before it crosses the
        Pacific.
      </GuideP>

      <GuideH2 id="import-costs">The U.S. import math</GuideH2>
      <GuideP>
        As of 2026, imports from Japan are assessed a{" "}
        <GuideStrong>12.5% Section 301 duty on the item&apos;s value</GuideStrong> (in force
        since July 24, 2026), and the carrier adds a clearance fee of roughly{" "}
        <GuideStrong>$9&ndash;17 per parcel</GuideStrong>. Grading doesn&apos;t change the
        rate — a slab pays the same 12.5% a raw card does, just on a bigger number. Here is
        the full landed cost for a typical mid-value slab:
      </GuideP>
      <GuideTable
        head={["Line item", "Amount", "Notes"]}
        rows={[
          ["Card: PSA 10, Japanese print", "¥30,000 (≈ $200)", "Converted at roughly ¥150/USD — use the day's actual rate."],
          ["U.S. import duty (12.5%)", "≈ $25", "12.5% × $200; assessed on item value only, not shipping (as of 2026)."],
          ["Carrier clearance fee", "≈ $9.35", "Japan Post → USPS route, usually the cheapest clearance path."],
          ["Total import costs", "≈ $34", "On top of the card, Japan-side fees, and international shipping."],
        ]}
      />
      <GuideP>
        Two takeaways. The duty is a percentage, so it scales with card value — but the
        clearance fee is per parcel, which means{" "}
        <GuideStrong>shipping several slabs together spreads that fixed cost</GuideStrong>{" "}
        across all of them. And since duty is assessed on item value only, a cheaper shipping
        method doesn&apos;t reduce your duty; consolidation is the lever that actually moves
        the total.
      </GuideP>

      <GuideH2 id="raw-vs-slab">Buy the slab, or buy raw and grade it yourself?</GuideH2>
      <GuideP>
        Japan is also an excellent source of clean raw cards, which raises the classic
        question: pay the graded premium, or grade it yourself?
      </GuideP>
      <GuideUl>
        <li>
          <GuideStrong>Buying the slab</GuideStrong> means paying for certainty: the grade is
          known, the market price is discoverable, and there&apos;s no waiting. You pay a
          premium over raw for exactly that certainty.
        </li>
        <li>
          <GuideStrong>Buying raw and grading</GuideStrong> costs less up front but adds
          grading fees, round-trip shipping to PSA, months of waiting, and — the big one —{" "}
          <GuideStrong>grade risk</GuideStrong>. A card you expected to gem can come back a
          grade lower and be worth less than your all-in cost.
        </li>
        <li>
          A practical split: buy slabs when you want a specific card at a specific grade;
          buy raw when you&apos;re comfortable judging condition from photos and can absorb a
          miss across several submissions.
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
        For the full mechanics of the 12.5% duty and carrier-by-carrier clearance fees, see
        the{" "}
        <Link
          href={`/${lang}/guides/japan-card-import-tax-us-2026`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          2026 import tax guide
        </Link>
        . If you&apos;re hunting raw copies to grade, start with{" "}
        <Link
          href={`/${lang}/guides/how-to-buy-pokemon-cards-from-mercari-japan`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          how to buy Pokémon cards from Mercari Japan
        </Link>
        , and before choosing a proxy, run every service through the{" "}
        <Link
          href={`/${lang}/guides/japan-proxy-hidden-fees-2026`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          hidden fees checklist
        </Link>
        .
      </GuideP>
    </GuideShell>
  );
}
