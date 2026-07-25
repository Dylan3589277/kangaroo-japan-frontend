import type { Metadata } from "next";
import Link from "next/link";
import { buildCanonical, isIndexable } from "@/lib/seo";
import {
  COMPANY,
  LegalH2,
  LegalP,
  LegalShell,
  LegalUl,
} from "@/components/legal/legal-shell";

/**
 * 服务条款（en）。
 *
 * 🔴 条款只复述站上**已经对外承诺过的口径**，不新增承诺：
 * - 退款「没买成全额退（含押金）」— 与 /en/buyer-protection 一致
 * - 免费仓储 30–60 天按会员等级 — 与 /en/fees 一致
 * - 不鉴真、不评级 — 与 /en/buyer-protection 一致
 * - 关税由买家承担、诚实申报 — 与关税指南 /en/guides/japan-card-import-tax-us-2026 一致
 * 改这些数字前先确认那几页，别让两处口径打架。
 */

const UPDATED = "2026-07-25";
const PATH = "terms";
const TITLE = "Terms of Service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (lang !== "en") return {};
  return {
    title: TITLE,
    description:
      "The terms you agree to when using Kangaroo Japan to buy Japanese trading cards through our proxy service.",
    alternates: { canonical: buildCanonical(lang, PATH) },
    robots: isIndexable(lang) ? undefined : { index: false, follow: true },
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <LegalShell
      lang={lang}
      title={TITLE}
      updated={UPDATED}
      intro="What we do for you, what we cannot promise, and how money and parcels are handled."
    >
      <LegalH2 id="what-we-are">What this service is</LegalH2>
      <LegalP>
        We are a <strong className="font-medium text-white">proxy buying agent</strong>.
        You choose a listing on a Japanese marketplace; we buy it in Japan on your
        behalf, receive it at our warehouse, and forward it to you. We are not the seller
        of the item and we do not own the inventory. The seller&apos;s listing is the
        source of truth for what the item is.
      </LegalP>

      <LegalH2 id="orders">Orders and payment</LegalH2>
      <LegalUl>
        <li>
          An order request becomes binding once we place the purchase in Japan. Before
          that point you can cancel.
        </li>
        <li>
          Figures shown before checkout are <strong className="font-medium text-white">estimates</strong>.
          International shipping is quoted after your parcel is weighed at our Japan
          warehouse.
        </li>
        <li>
          Payment is taken through our payment processor. Prices on the English site are
          shown in USD, converted from the Japanese yen price at the rate shown at the
          time.
        </li>
      </LegalUl>

      <LegalH2 id="cannot-promise">What we cannot promise</LegalH2>
      <LegalP>
        Japanese marketplaces are live and competitive. We cannot guarantee that an item
        will still be available when we go to buy it, that a seller will reply or agree
        to ship, or that an auction bid will win. If a purchase does not go through,
        <strong className="font-medium text-white">
          {" "}
          we refund what you paid for it in full, including any deposit
        </strong>
        .
      </LegalP>

      <LegalH2 id="condition">Condition, authenticity and grading</LegalH2>
      <LegalP>
        We translate the seller&apos;s Japanese condition notes into English and, on
        request, photograph the actual card before it ships. We do{" "}
        <strong className="font-medium text-white">not</strong> authenticate cards and we
        do <strong className="font-medium text-white">not</strong> grade them. A
        seller&apos;s description and our photos are the basis on which you decide; see{" "}
        <Link
          href={`/${lang}/buyer-protection`}
          className="text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
        >
          buyer protection
        </Link>{" "}
        for how disputes are handled.
      </LegalP>

      <LegalH2 id="storage">Warehouse storage</LegalH2>
      <LegalP>
        Items are stored free at our Japan warehouse for 30–60 days depending on your
        membership tier, so you can consolidate several purchases into one parcel. Tell
        us before that window ends how you want them shipped.
      </LegalP>

      <LegalH2 id="customs">Duties, taxes and declarations</LegalH2>
      <LegalP>
        Import duty, taxes and carrier clearance fees are assessed by the authorities and
        the carrier in your country and are{" "}
        <strong className="font-medium text-white">paid by you</strong>, not by us. We
        declare contents and value honestly and will not under-declare or mark a parcel
        as a gift on request — doing so is illegal and would also cap any insurance
        claim. See the{" "}
        <Link
          href={`/${lang}/guides/japan-card-import-tax-us-2026`}
          className="text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
        >
          U.S. import tax guide
        </Link>{" "}
        for current rates.
      </LegalP>

      <LegalH2 id="prohibited">What we will not buy or ship</LegalH2>
      <LegalP>
        We will not handle items that are illegal to export from Japan or import into
        your country, or that carriers refuse to carry. If an order turns out to involve
        such an item, we cancel it and refund you.
      </LegalP>

      <LegalH2 id="accounts">Your account</LegalH2>
      <LegalP>
        Keep your login details to yourself; you are responsible for activity on your
        account. Tell us immediately if you think someone else has access. We may suspend
        an account used for fraud, chargeback abuse, or attempts to have us buy
        prohibited items.
      </LegalP>

      <LegalH2 id="liability">Limits of our responsibility</LegalH2>
      <LegalP>
        We are responsible for handling your items with reasonable care while they are in
        our hands, and for refunding purchases we fail to complete. We are not
        responsible for the seller&apos;s own description errors, for delays or damage
        caused by carriers or customs, or for market price movements while your item is
        in transit.
      </LegalP>

      <LegalH2 id="law">Governing law</LegalH2>
      <LegalP>
        These terms are governed by the laws of Japan. {COMPANY.legalNameEn} is
        registered in Osaka, Japan, and disputes are subject to the jurisdiction of the
        courts there.
      </LegalP>
    </LegalShell>
  );
}
