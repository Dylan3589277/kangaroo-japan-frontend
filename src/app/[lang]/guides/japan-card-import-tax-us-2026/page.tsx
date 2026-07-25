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
 * GEO 长文 ①：2026 美国进口关税指南（时效红利文——7 月美国卡友都在搜这个话题）。
 * 数据来源：外置大脑 jp-buy-us-landed-cost-data.md（2026-06-20 调研）。
 * 2026-07-25 更新：Section 122 的 10% 已于 2026-07-24 到期；同日 00:01 EST 起
 * 由 Section 301「强迫劳动」关税接替，日本适用 12.5%（CBP CSMS #69326983：
 * HTS 9903.05.49 —— 原税率低于 12.5% 的商品按合并 12.5% 征收；9903.05.48 —— 原税率
 * ≥12.5% 的不叠加）。卡牌 MFN 为 Free，故实际按 12.5%。
 * ⚠️ 政策变动快：再次变动时需同步更新本文、FAQ 的 tariff2026 条目与 public/llms.txt。
 */

const PATH = "guides/japan-card-import-tax-us-2026";
const TITLE = "U.S. Import Tax on Japanese Pokémon Cards in 2026: What You Actually Pay";
const DESCRIPTION =
  "2026 U.S. import duty on Japanese trading cards explained: the 12.5% Section 301 rate in force since July 24, 2026, carrier clearance fees of $9–17, no more $800 de minimis, and a worked example.";
const PUBLISHED = "2026-07-03";
const UPDATED = "2026-07-25";

const MINI_FAQ = [
  {
    q: "Is international shipping taxed too?",
    a: "No. The U.S. assesses duty on the item's transaction value (FOB). International shipping and insurance are excluded from the duty base when declared separately.",
  },
  {
    q: "What happened to the 10% Section 122 surcharge?",
    a: "It expired on July 24, 2026 when its 150-day authority ran out, and was not extended. A Section 301 forced-labor action took effect the same morning and now sets the rate for Japan at 12.5%. Net effect for card buyers: the duty went up by 2.5 points, not away.",
  },
  {
    q: "Do graded (PSA/BGS) cards pay a different rate?",
    a: "No — the 12.5% rate applies regardless of grading. Classification of collectible single cards has some gray area, so high-value imports are worth a broker consultation.",
  },
  {
    q: "Can the seller just mark it as a gift or lower the value?",
    a: "No — under-declaring is illegal, and it caps any insurance claim at the declared amount. Reputable proxies declare honestly.",
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

export default async function ImportTaxGuidePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <GuideShell
      lang={lang}
      path={PATH}
      eyebrow="Customs & taxes"
      title={TITLE}
      intro="The $800 duty-free threshold is gone, and as of July 24, 2026 Japanese imports carry a 12.5% Section 301 duty — the old 10% Section 122 surcharge expired that same day. Here's exactly what a card from Japan costs to import right now, with numbers."
      datePublished={PUBLISHED}
      dateModified={UPDATED}
    >
      {isIndexable(lang) && <JsonLd data={faqPageJsonLd(MINI_FAQ)} />}

      <GuideTldr>
        As of <GuideStrong>July 24, 2026</GuideStrong>, importing a Japanese trading card into
        the U.S. costs the card price + <GuideStrong>12.5% import duty on the item
        value</GuideStrong> (the new Section 301 forced-labor action, which replaced the
        expired 10% Section 122 surcharge) + <GuideStrong>a carrier clearance fee of roughly
        $9–17 per parcel</GuideStrong>. There is no duty-free minimum anymore — every parcel is
        assessed. Shipping cost is not part of the duty base.
      </GuideTldr>

      <GuideH2 id="what-changed">What changed in 2025–2026</GuideH2>
      <GuideUl>
        <li>
          <GuideStrong>August 2025:</GuideStrong> the U.S. suspended the $800 de minimis
          exemption for all countries. Since then, every import — even a $20 card — can be
          assessed duty.
        </li>
        <li>
          <GuideStrong>February 2026:</GuideStrong> the Supreme Court struck down the
          IEEPA-based &ldquo;reciprocal&rdquo; tariffs (which had put Japanese goods at 15%). They stopped
          being collected on February 24, 2026.
        </li>
        <li>
          <GuideStrong>February 24, 2026:</GuideStrong> a replacement measure under Section 122
          took effect — a <GuideStrong>flat 10% surcharge on imports from all countries</GuideStrong>,
          including Japan. It was a 150-day temporary authority, set to run out on{" "}
          <GuideStrong>July 24, 2026</GuideStrong> unless extended or replaced.
        </li>
        <li>
          <GuideStrong>February 28, 2026:</GuideStrong> the old $80-per-parcel flat postal
          option ended. Postal imports are now assessed like everything else.
        </li>
        <li>
          <GuideStrong>July 24, 2026:</GuideStrong> the Section 122 surcharge hit its 150-day
          limit and expired. At 12:01 a.m. ET the same day, a{" "}
          <GuideStrong>Section 301 forced-labor action</GuideStrong> took its place, covering 60
          economies at 10% or 12.5%. <GuideStrong>Japan is in the 12.5% band.</GuideStrong>{" "}
          Mechanically it is a floor: goods whose normal (MFN) rate is under 12.5% are assessed
          a combined 12.5%, while goods already at or above 12.5% pay their existing rate with
          nothing stacked on top.
        </li>
      </GuideUl>

      <GuideH2 id="cost-breakdown">The full import cost, line by line</GuideH2>
      <GuideTable
        head={["Charge", "How much (2026)", "Notes"]}
        rows={[
          [
            "Import duty",
            "12.5% of the item value",
            "Section 301 rate for Japan, in force since July 24, 2026. Assessed on the card's transaction value only — international shipping and insurance are excluded from the duty base when declared separately.",
          ],
          [
            "Carrier clearance fee",
            "~$9–17 per parcel",
            "Charged by the carrier for clearing customs, on top of the duty itself. See the carrier table below.",
          ],
          [
            "Base tariff (HTS)",
            "0%",
            "Playing cards (HTS 9504.40) carry a Free MFN rate. Because that base is below 12.5%, cards land in the combined 12.5% bracket rather than keeping a 0% rate.",
          ],
          [
            "State sales tax",
            "Usually not collected",
            "Import duty is federal. Some states expect residents to self-report use tax; that depends on your state.",
          ],
        ]}
      />

      <GuideH2 id="carrier-fees">Carrier clearance fees compared</GuideH2>
      <GuideTable
        head={["Channel", "Clearance fee", "Notes"]}
        rows={[
          [
            "Japan Post / EMS → USPS",
            "~$9.35 per parcel",
            "Flat fee, only when the parcel is dutiable. Usually the cheapest clearance path for cards.",
          ],
          ["FedEx", "$15 or 2% of duty+tax, whichever is higher", "2026 published terms."],
          ["UPS", "from $14 or 3.5%, plus entry prep fees", ""],
          ["DHL", "~$17 or ~2% (verify current terms)", "Published figures vary; check before shipping."],
        ]}
      />
      <GuideP>
        These fees are billed by the carrier — typically at delivery or via a payment link —
        not by the Japanese seller or the proxy service, unless the proxy explicitly offers
        prepaid (DDP) shipping.
      </GuideP>

      <GuideH2 id="example">Worked example: a ¥10,000 card</GuideH2>
      <GuideUl>
        <li>Card price: ¥10,000 (≈ $67 at ~¥150/USD)</li>
        <li>Import duty: 12.5% × $67 ≈ <GuideStrong>$8.38</GuideStrong></li>
        <li>Clearance fee (Japan Post → USPS route): <GuideStrong>~$9.35</GuideStrong></li>
        <li>
          <GuideStrong>Total import charges: ≈ $18</GuideStrong> — on top of the card,
          Japan-side fees and international shipping.
        </li>
      </GuideUl>
      <GuideP>
        Two practical takeaways. First, the clearance fee is per parcel, so{" "}
        <GuideStrong>consolidating several cards into one shipment</GuideStrong> spreads a
        fixed ~$9–17 across all of them. Second, because duty is a percentage of item value
        only, cheap shipping methods don&apos;t reduce your duty — consolidation does more for
        your total than carrier-shopping.
      </GuideP>

      <GuideH2 id="mini-faq">Quick answers</GuideH2>
      {MINI_FAQ.map(({ q, a }) => (
        <div key={q}>
          <GuideH3>{q}</GuideH3>
          <GuideP>{a}</GuideP>
        </div>
      ))}

      <GuideH2 id="disclaimer">Honest disclaimer</GuideH2>
      <GuideP>
        This guide was last checked against CBP guidance on July 25, 2026 and is not legal or
        tax advice. Tariff policy has changed several times since 2025 — the{" "}
        <GuideStrong>12.5% Section 301 rate took effect on July 24, 2026</GuideStrong> and is
        itself subject to review, exclusions and litigation. The final amount is always what CBP
        and your carrier assess. For how we handle declarations, see our{" "}
        <Link href={`/${lang}/faq`} className="text-cyan-300 hover:text-cyan-200">
          FAQ
        </Link>{" "}
        and{" "}
        <Link href={`/${lang}/fees`} className="text-cyan-300 hover:text-cyan-200">
          fees page
        </Link>
        , or compare proxy services in our{" "}
        <Link
          href={`/${lang}/guides/kangaroo-japan-vs-buyee-vs-zenmarket`}
          className="text-cyan-300 hover:text-cyan-200"
        >
          proxy comparison guide
        </Link>
        .
      </GuideP>
    </GuideShell>
  );
}
