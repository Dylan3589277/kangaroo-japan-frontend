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
 * GEO 长文 ⑤：代购隐藏费用透明拆解（"proxy hidden fees" 是买家决策期高频疑问）。
 * 定位：中立行业教程——逐项讲 7 类费用是什么、怎么自查，不点名批评任何服务商；
 * Kangaroo Japan 只在结尾以透明费率示例自然出现一次。
 * 🔴 数字纪律：只用施工单数字（1–2% 汇率加价、12.5% duty、$9–17 清关费、¥200）；
 * 费率类句子带 "as of 2026 / check the official site" 兜底。
 */

const PATH = "guides/japan-proxy-hidden-fees-2026";
const TITLE = "Japan Proxy Shopping Hidden Fees Explained (2026): What You Actually Pay";
const DESCRIPTION =
  "Every fee a Japan proxy service can charge in 2026 — service fees, FX markup, domestic shipping, consolidation, international shipping, payment fees, and the 12.5% U.S. import duty — with a checklist to audit any service yourself.";
const PUBLISHED = "2026-08-10";

const MINI_FAQ = [
  {
    q: "Are hidden fees a sign a proxy service is a scam?",
    a: "Usually not. Most “hidden” fees are legitimate charges that simply aren't shown prominently — FX markup baked into a rate, consolidation charges after free storage runs out, or payment processing fees added at checkout. The fix is auditing the full fee list before you buy, not assuming fraud.",
  },
  {
    q: "How do I check a proxy service's exchange-rate markup?",
    a: "Look up the mid-market JPY/USD rate for the day (any major finance site shows it), then divide the USD amount the proxy charged by the JPY item price. If the implied rate is within roughly 1–2% of mid-market, that's normal industry practice as of 2026. A much larger gap is effectively an extra fee.",
  },
  {
    q: "Why did I get billed again when my package arrived in the U.S.?",
    a: "That's import duty and the carrier's clearance fee, not a proxy fee. As of 2026, Japanese goods carry a 12.5% Section 301 duty on the item value, and carriers charge roughly $9–17 per parcel to clear customs. Unless you paid for prepaid-duty (DDP) shipping, these are billed on the U.S. side at or before delivery.",
  },
  {
    q: "What is volumetric (dimensional) weight?",
    a: "Carriers charge international shipping by the greater of actual weight and volumetric weight, which is calculated from the box's dimensions. A big, light box can cost as much to ship as a heavy one. Good consolidation — compact, well-packed boxes — is how you keep this down.",
  },
  {
    q: "Is a proportional service fee always worse than a flat fee?",
    a: "No — it depends on what you buy. Proportional fees can be cheaper on very low-value items, while flat fees win as item value rises because the fee doesn't scale with price. Capped-percentage models sit in between. Run the numbers for your typical purchase instead of assuming.",
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

export default async function HiddenFeesGuidePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <GuideShell
      lang={lang}
      path={PATH}
      eyebrow="Fees"
      title={TITLE}
      intro="Proxy shopping from Japan involves up to seven distinct charges between the listing price and your doorstep. None of them has to be a surprise. This guide explains each one — what it is, what's normal in 2026, and exactly how to audit it yourself before you commit."
      datePublished={PUBLISHED}
    >
      {isIndexable(lang) && <JsonLd data={faqPageJsonLd(MINI_FAQ)} />}

      <GuideTldr>
        Between a Japanese listing and your U.S. mailbox there are up to{" "}
        <GuideStrong>seven separate charges</GuideStrong>: the proxy service fee, an
        exchange-rate markup (<GuideStrong>1&ndash;2% over mid-market is industry-normal</GuideStrong>{" "}
        as of 2026), Japan domestic shipping, consolidation/storage fees, international
        shipping (billed on volumetric weight), payment processing fees, and U.S. import
        charges — a <GuideStrong>12.5% duty</GuideStrong> plus a carrier clearance fee of
        roughly <GuideStrong>$9&ndash;17 per parcel</GuideStrong>. Every one of them is
        checkable before you buy; use the checklist below.
      </GuideTldr>

      <GuideH2 id="fee-1">1. The proxy service fee: three models</GuideH2>
      <GuideP>
        This is the fee the proxy charges for buying on your behalf, and it comes in three
        structures. None is inherently a rip-off — they suit different buying patterns.
      </GuideP>
      <GuideUl>
        <li>
          <GuideStrong>Flat fee per item or per order.</GuideStrong> Predictable, and it
          doesn&apos;t grow with item value — the natural fit for buyers of higher-value
          items like graded cards, where a percentage would sting.
        </li>
        <li>
          <GuideStrong>Proportional (a percentage of item price).</GuideStrong> Cheap on
          low-value items, increasingly expensive as prices rise. Fine for small hauls of
          inexpensive goods.
        </li>
        <li>
          <GuideStrong>Capped percentage.</GuideStrong> A percentage with a maximum — a
          middle ground that behaves proportionally at the low end and like a flat fee at the
          high end.
        </li>
      </GuideUl>
      <GuideP>
        <GuideStrong>How to audit it:</GuideStrong> find the official fee page (every
        legitimate service has one), and compute the fee for one item at your typical price
        point — not the service&apos;s example price point. Fee schedules change, so check
        the current page rather than a review from last year.
      </GuideP>

      <GuideH2 id="fee-2">2. Exchange-rate markup</GuideH2>
      <GuideP>
        Most proxies bill you in your own currency, converting from JPY at a rate they set.
        The gap between their rate and the mid-market rate is a real cost, even though it
        never appears as a line item. As of 2026, a markup of{" "}
        <GuideStrong>1&ndash;2% over mid-market is normal industry practice</GuideStrong>.
      </GuideP>
      <GuideP>
        <GuideStrong>How to audit it:</GuideStrong> on the day you&apos;re charged, look up
        the mid-market JPY rate, then divide what you paid by the item&apos;s JPY price. If
        the implied rate is within a couple of percent of mid-market, that&apos;s standard.
        If it&apos;s far off, treat the difference as an extra fee and factor it into your
        comparison.
      </GuideP>

      <GuideH2 id="fee-3">3. Japan domestic shipping</GuideH2>
      <GuideP>
        The seller ships to the proxy&apos;s Japanese warehouse, and that domestic postage is
        passed to you. On some marketplaces the seller covers it; on others it&apos;s added
        at checkout. It&apos;s usually modest, but it&apos;s per-seller — buy from five
        sellers and you may pay it five times.
      </GuideP>
      <GuideP>
        <GuideStrong>How to audit it:</GuideStrong> check whether the listing says shipping
        is included, and whether the proxy passes domestic postage through at cost or adds a
        handling margin on top.
      </GuideP>

      <GuideH2 id="fee-4">4. Consolidation and storage fees</GuideH2>
      <GuideP>
        Combining several purchases into one international box is where proxies save you real
        money — but the warehouse side has its own fees. Most services offer{" "}
        <GuideStrong>a free storage window, then charge per day</GuideStrong> after it ends,
        and some charge separately for the consolidation work itself.
      </GuideP>
      <GuideP>
        <GuideStrong>How to audit it:</GuideStrong> before buying, note the free-storage
        period, the daily rate after it, and whether repacking/consolidation is a separate
        charge. If you buy slowly over weeks and ship once, storage fees can quietly outgrow
        the shipping savings.
      </GuideP>

      <GuideH2 id="fee-5">5. International shipping and volumetric weight</GuideH2>
      <GuideP>
        International carriers charge by the{" "}
        <GuideStrong>greater of actual weight and volumetric (dimensional) weight</GuideStrong>{" "}
        — a formula based on the box&apos;s size. A large box of light items bills like a
        heavy one. This is often the single biggest line on the invoice, and it&apos;s also
        the one good packing influences most.
      </GuideP>
      <GuideP>
        <GuideStrong>How to audit it:</GuideStrong> compare the carrier options the proxy
        offers against the carrier&apos;s own published rates for the same weight, and ask
        whether the service packs compactly (smaller box, lower volumetric weight) or just
        drops items into an oversized carton.
      </GuideP>

      <GuideH2 id="fee-6">6. Payment processing fees</GuideH2>
      <GuideP>
        Some services add a percentage for card payments or certain payment providers, and
        your own card may add a foreign-transaction fee on top if the charge is processed
        outside the U.S. These fees sit at checkout, after you&apos;ve mentally committed —
        which is exactly why they&apos;re worth checking first.
      </GuideP>
      <GuideP>
        <GuideStrong>How to audit it:</GuideStrong> read the payment-methods page for
        surcharges, and check your card&apos;s foreign-transaction terms. Paying in the
        proxy&apos;s billed currency vs your home currency can also change what conversion
        happens where.
      </GuideP>

      <GuideH2 id="fee-7">7. U.S. import duty and clearance fees</GuideH2>
      <GuideP>
        The last charges arrive after the box leaves Japan. As of 2026, imports from Japan
        carry a <GuideStrong>12.5% Section 301 duty on the item value</GuideStrong> (in force
        since July 24, 2026), and the carrier bills a{" "}
        <GuideStrong>clearance fee of roughly $9&ndash;17 per parcel</GuideStrong> for
        handling customs. These are U.S.-side charges, not proxy fees — but they belong in
        your total cost math all the same.
      </GuideP>
      <GuideP>
        <GuideStrong>How to audit it:</GuideStrong> multiply your item subtotal by 12.5% and
        add one clearance fee per parcel. Full details, carrier-by-carrier, are in our{" "}
        <Link
          href={`/${lang}/guides/japan-card-import-tax-us-2026`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          2026 import tax guide
        </Link>
        .
      </GuideP>

      <GuideH2 id="checklist">The 7-point fee audit checklist</GuideH2>
      <GuideTable
        head={["#", "Fee", "What to check before buying"]}
        rows={[
          ["1", "Service fee", "Flat, proportional, or capped? Compute it at your typical item price from the official fee page."],
          ["2", "FX markup", "Implied rate vs mid-market on the day — within ~1–2% is normal as of 2026."],
          ["3", "Japan domestic shipping", "Included in the listing or added? Passed through at cost or marked up?"],
          ["4", "Consolidation & storage", "Free-storage days, daily rate afterward, separate repacking charge?"],
          ["5", "International shipping", "Volumetric-weight billing; compare against the carrier's published rates."],
          ["6", "Payment fees", "Card/provider surcharges plus your own card's foreign-transaction fee."],
          ["7", "U.S. import charges", "12.5% duty on item value + ~$9–17 carrier clearance per parcel (as of 2026)."],
        ]}
      />

      <GuideH2 id="mini-faq">Quick answers</GuideH2>
      {MINI_FAQ.map(({ q, a }) => (
        <div key={q}>
          <GuideH3>{q}</GuideH3>
          <GuideP>{a}</GuideP>
        </div>
      ))}

      <GuideH2 id="bottom-line">The bottom line</GuideH2>
      <GuideP>
        None of these fees is a scam — but any of them can surprise you if it&apos;s not
        published clearly. The services worth using are the ones that let you complete the
        checklist above from their public pages alone. As one example of what transparent
        pricing looks like: Kangaroo Japan charges a flat{" "}
        <GuideStrong>¥200 per item</GuideStrong> service fee as of 2026, published on its
        fees page along with every other charge — no math required after checkout. Whichever
        service you choose, if you can&apos;t find a number, that&apos;s your answer about
        the number.
      </GuideP>
      <GuideP>
        Next up: see how the generalist and specialist models compare in practice in{" "}
        <Link
          href={`/${lang}/guides/is-buyee-legit-2026`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          our honest Buyee review
        </Link>{" "}
        and the{" "}
        <Link
          href={`/${lang}/guides/kangaroo-japan-vs-buyee-vs-zenmarket`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          three-way proxy comparison
        </Link>
        , or dive into marketplace tactics with{" "}
        <Link
          href={`/${lang}/guides/how-to-buy-pokemon-cards-from-mercari-japan`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          how to buy from Mercari Japan
        </Link>
        .
      </GuideP>
    </GuideShell>
  );
}
