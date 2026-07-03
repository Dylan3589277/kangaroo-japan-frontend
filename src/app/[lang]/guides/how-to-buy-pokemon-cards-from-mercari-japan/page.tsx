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
  GuideOl,
  GuideStrong,
  GuideTldr,
  GuideTable,
} from "../guide-shell";

/**
 * GEO 长文 ③：Mercari 买卡完整教程（"how to buy pokemon cards from mercari japan"
 * 是 en 侧核心搜索词之一）。日文搜索词/品相术语与 FAQ、fees 口径保持一致。
 */

const PATH = "guides/how-to-buy-pokemon-cards-from-mercari-japan";
const TITLE = "How to Buy Pokémon Cards from Mercari Japan (2026 Guide)";
const DESCRIPTION =
  "Step-by-step guide to buying Japanese Pokémon cards from Mercari Japan as a U.S. buyer: why you need a proxy, Japanese search terms that actually work, condition terms, scam red flags, fees and shipping.";
const PUBLISHED = "2026-07-03";

const MINI_FAQ = [
  {
    q: "Why can't I buy from Mercari Japan directly?",
    a: "Mercari Japan requires a Japanese address and payment method, and nearly all sellers ship domestically only. A proxy service buys locally on your behalf, receives the card at a Japan warehouse, and forwards it to you.",
  },
  {
    q: "How long does it take to get a card from Mercari to the U.S.?",
    a: "Typically: seller ships to the warehouse in a few days, then international shipping time depends on the method you choose plus customs processing. Consolidating multiple purchases into one parcel adds a little waiting but cuts cost sharply.",
  },
  {
    q: "Are prices on Mercari Japan negotiable?",
    a: "Culturally yes — Mercari has an offer system and modest haggling is common. Through a proxy, support for making offers varies by service; large lowballs are usually ignored by Japanese sellers.",
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

export default async function MercariGuidePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <GuideShell
      lang={lang}
      path={PATH}
      eyebrow="Tutorial"
      title={TITLE}
      intro="Mercari Japan is the world's deepest pool of Japanese Pokémon singles and sealed product — and it doesn't ship overseas. Here's the full playbook: search terms that work, condition terms decoded, scam red flags, and what it all costs."
      datePublished={PUBLISHED}
    >
      {isIndexable(lang) && <JsonLd data={faqPageJsonLd(MINI_FAQ)} />}

      <GuideTldr>
        Search in <GuideStrong>Japanese</GuideStrong> (ポケモンカード + set code like
        sv2a), read the seller&apos;s condition terms (美品 = near-mint claim, 傷あり = has
        damage, 未開封 = sealed), check seller ratings, then buy through a proxy that packs
        cards properly. Expect the card price + ~¥300–650 in Japan-side fees + international
        shipping + <GuideStrong>10% U.S. duty and a ~$9–17 clearance fee</GuideStrong> (2026
        rules). Consolidate multiple cards into one parcel to make small purchases worth it.
      </GuideTldr>

      <GuideH2 id="why-mercari">Why Mercari Japan is worth the effort</GuideH2>
      <GuideUl>
        <li>
          <GuideStrong>Supply:</GuideStrong> a huge volume of Pokémon singles, promos and
          sealed product is listed daily — including Japan-exclusive items that never reach
          U.S. shelves.
        </li>
        <li>
          <GuideStrong>Price:</GuideStrong> Japanese-language printings usually trade below
          their English equivalents, and the yen has been favorable for USD buyers.
        </li>
        <li>
          <GuideStrong>The catch:</GuideStrong> Japanese address and payment required, and
          domestic-only shipping — which is exactly what a proxy service solves.
        </li>
      </GuideUl>

      <GuideH2 id="step-by-step">The process, step by step</GuideH2>
      <GuideOl>
        <li>
          <GuideStrong>Find the card.</GuideStrong> Search Japanese terms (next section) on a
          proxy site that mirrors Mercari listings live, or paste a Mercari listing URL
          directly.
        </li>
        <li>
          <GuideStrong>Check the listing.</GuideStrong> Seller rating, condition wording,
          actual photos — the photos override the description.
        </li>
        <li>
          <GuideStrong>Order through the proxy.</GuideStrong> The proxy buys it locally,
          usually within hours while the listing is still available. Fast execution matters —
          good listings sell in minutes.
        </li>
        <li>
          <GuideStrong>Warehouse intake.</GuideStrong> The seller ships domestically to the
          proxy&apos;s Japan warehouse. Optional: paid photo inspection (front, back,
          corners) before it leaves Japan.
        </li>
        <li>
          <GuideStrong>Consolidate and ship.</GuideStrong> Combine everything you bought into
          one international parcel, pick a tracked method, and pay duty on delivery (2026:
          10% + carrier clearance fee — see our{" "}
          <Link
            href={`/${lang}/guides/japan-card-import-tax-us-2026`}
            className="text-cyan-300 hover:text-cyan-200"
          >
            import tax guide
          </Link>
          ).
        </li>
      </GuideOl>

      <GuideH2 id="search-terms">Japanese search terms that actually work</GuideH2>
      <GuideTable
        head={["What you want", "Search this", "Why"]}
        rows={[
          ["Pokémon cards (general)", "ポケモンカード or ポケカ", "Listings are titled in Japanese; English searches miss most of them."],
          ["A specific set", "Set code — sv2a, s4a, sm12a…", "Japanese collectors list by set code; add the card number for singles."],
          ["Sealed product", "未開封 (unopened) / シュリンク付き (shrink-wrapped)", "Filters out opened boxes; shrink status is the key resale signal."],
          ["Near-mint singles", "美品 (excellent condition)", "A seller claim, not a guarantee — verify against photos."],
          ["PSA-graded cards", "PSA10 ポケカ", "Grading terms are used as-is in Japanese listings."],
        ]}
      />

      <GuideH2 id="condition-terms">Condition terms decoded</GuideH2>
      <GuideUl>
        <li><GuideStrong>美品 (bihin)</GuideStrong> — &ldquo;excellent / near-mint&rdquo; by the seller&apos;s own standard. Japanese grading is often conservative, but it&apos;s still subjective.</li>
        <li><GuideStrong>傷あり (kizu ari)</GuideStrong> — has scratches or damage. Usually priced accordingly; read the photos closely.</li>
        <li><GuideStrong>未開封 (mikaifū)</GuideStrong> — sealed / unopened. For boxes, look for シュリンク付き (with shrink-wrap).</li>
        <li><GuideStrong>プレイ用 (purei-yō)</GuideStrong> — &ldquo;for play&rdquo;, i.e. expect wear; the seller is disclaiming collectible condition.</li>
      </GuideUl>

      <GuideH2 id="red-flags">Scam red flags on secondhand Japanese marketplaces</GuideH2>
      <GuideUl>
        <li>Sealed boxes priced well under market — the classic reseal/weighed-box risk. Ask for extra photos of shrink-wrap seams and weight before buying.</li>
        <li>Stock photos instead of photos of the actual card.</li>
        <li>New seller accounts with no rating history selling high-value cards.</li>
        <li>Any suggestion to under-declare customs value — it&apos;s illegal and caps insurance at the declared amount.</li>
      </GuideUl>

      <GuideH2 id="costs">What it costs all-in</GuideH2>
      <GuideP>
        Typical structure: card price + Japan domestic shipping (from ~¥300) + proxy service
        fee (from ~¥300–350/item) + international shipping by weight + 10% U.S. import duty +
        carrier clearance fee (~$9–17/parcel). Every figure is itemized before you pay; see
        the{" "}
        <Link href={`/${lang}/fees`} className="text-cyan-300 hover:text-cyan-200">
          fees page
        </Link>{" "}
        for the full breakdown, or the{" "}
        <Link
          href={`/${lang}/guides/kangaroo-japan-vs-buyee-vs-zenmarket`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          proxy comparison
        </Link>{" "}
        if you&apos;re still choosing a service.
      </GuideP>

      <GuideH2 id="mini-faq">Quick answers</GuideH2>
      {MINI_FAQ.map(({ q, a }) => (
        <div key={q}>
          <GuideH3>{q}</GuideH3>
          <GuideP>{a}</GuideP>
        </div>
      ))}
    </GuideShell>
  );
}
