import type { Metadata } from "next";
import { buildCanonical, isIndexable } from "@/lib/seo";
import {
  COMPANY,
  LegalH2,
  LegalP,
  LegalShell,
  LegalUl,
} from "@/components/legal/legal-shell";

/**
 * 隐私政策（en）。
 *
 * 🔴 内容口径只写**站点实际在做的事**，不写没有的承诺：支付走 Stripe（我们不接触卡号）、
 * 人机验证用 Cloudflare Turnstile、代购必然要把收货信息交给承运商与海关。
 * 未经证实的东西（如是否已做 GDPR/CCPA 专门流程）一律不写。
 */

const UPDATED = "2026-07-25";
const PATH = "privacy";
const TITLE = "Privacy Policy";

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
      "How Kangaroo Japan collects, uses and shares your data when you buy Japanese cards through our proxy service.",
    alternates: { canonical: buildCanonical(lang, PATH) },
    robots: isIndexable(lang) ? undefined : { index: false, follow: true },
  };
}

export default async function PrivacyPage({
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
      intro="What we collect when you use Kangaroo Japan, why we need it, and who it is shared with."
    >
      <LegalH2 id="what-we-collect">What we collect</LegalH2>
      <LegalUl>
        <li>
          <strong className="font-medium text-white">Account data</strong> — the email
          address and password you register with. Passwords are stored hashed; we never
          see them in plain text.
        </li>
        <li>
          <strong className="font-medium text-white">Order data</strong> — the listings
          you ask us to buy, order status, and the messages you exchange with our team.
        </li>
        <li>
          <strong className="font-medium text-white">Shipping details</strong> — the
          recipient name, address and phone number you give us for international
          delivery, plus the customs declaration made for your parcel.
        </li>
        <li>
          <strong className="font-medium text-white">Payment data</strong> — handled by
          our payment processor. Card numbers are entered on the processor&apos;s side;
          they do not reach our servers and we cannot see them.
        </li>
        <li>
          <strong className="font-medium text-white">Technical data</strong> — cookies
          for your login session and language preference, and the bot-protection check
          on our sign-in form (Cloudflare Turnstile).
        </li>
      </LegalUl>

      <LegalH2 id="why">Why we need it</LegalH2>
      <LegalP>
        We are a proxy buying service: we purchase items in Japan on your behalf and
        forward them to you. That means we need your order and shipping details to place
        the purchase, receive the item at our Japan warehouse, declare it truthfully to
        customs, and ship it to your address. We also use your email to send order
        updates and to answer support requests.
      </LegalP>

      <LegalH2 id="sharing">Who we share it with</LegalH2>
      <LegalUl>
        <li>
          <strong className="font-medium text-white">Japanese marketplaces and sellers</strong>{" "}
          — to place the order. They see our details as the buyer, not yours.
        </li>
        <li>
          <strong className="font-medium text-white">Carriers</strong> (Japan Post, FedEx,
          UPS, DHL) — your recipient name, address and phone number, so the parcel can be
          delivered.
        </li>
        <li>
          <strong className="font-medium text-white">Customs authorities</strong> — the
          declared contents and value of your parcel. We declare honestly and do not
          under-declare on request.
        </li>
        <li>
          <strong className="font-medium text-white">Our payment processor</strong> — to
          take payment and handle refunds.
        </li>
      </LegalUl>
      <LegalP>
        We do not sell your personal data, and we do not share it for third-party
        advertising.
      </LegalP>

      <LegalH2 id="where">Where your data is handled</LegalH2>
      <LegalP>
        {COMPANY.legalNameEn} operates from Japan, so your data is processed in Japan.
        If you order from the United States or elsewhere, your data crosses borders to
        reach us and to reach the carrier that delivers your parcel.
      </LegalP>

      <LegalH2 id="retention">How long we keep it</LegalH2>
      <LegalP>
        Order, shipping and customs records are kept while your account is active and
        afterwards for as long as tax, customs and antique-dealer record-keeping rules
        require. Account data is deleted when you ask us to close your account, except
        for records we are legally required to retain.
      </LegalP>

      <LegalH2 id="your-choices">Your choices</LegalH2>
      <LegalP>
        Email{" "}
        <a
          href={`mailto:${COMPANY.supportEmail}`}
          className="text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
        >
          {COMPANY.supportEmail}
        </a>{" "}
        to ask for a copy of your data, to correct it, or to close your account and have
        it deleted. Please write from the address on the account so we can confirm it is
        you. We will tell you if a legal retention rule stops us deleting something.
      </LegalP>

      <LegalH2 id="children">Children</LegalH2>
      <LegalP>
        This service is not directed at children under 13, and we do not knowingly
        collect their data.
      </LegalP>

      <LegalH2 id="changes">Changes</LegalH2>
      <LegalP>
        If we change this policy we will update the date at the top of this page.
        Material changes will also be announced on the site.
      </LegalP>
    </LegalShell>
  );
}
