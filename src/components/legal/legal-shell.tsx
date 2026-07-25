import type { ReactNode } from "react";
import Link from "next/link";

/**
 * 法律页（Privacy / Terms）的共用外壳与排版原子。
 *
 * 与 guides 的深色外壳同一套视觉，但独立成文件：guides 那套带 Article JSON-LD、
 * 面包屑与「Ready to buy from Japan?」营销 CTA，法律页不该有这些。
 */

/** 运营主体：取自公司官网 nagatsuki-japan.com/contact/ 的会社概要表。 */
export const COMPANY = {
  legalNameJa: "株式会社長月商事",
  legalNameEn: "Nagatsuki Corporation",
  addressEn:
    "905 Okuchi Dai-8 Building, 1-6-2 Enokojima, Nishi-ku, Osaka 550-0006, Japan",
  addressJa: "〒550-0006 大阪市西区江之子島1丁目6番2号 奥内第八ビル905",
  phone: "+81-6-6131-8337",
  companyEmail: "contact@nagatsuki-japan.com",
  supportEmail: "support@jp-buy.com",
  /** 古物商許可（二手商品交易许可）——代购/二手卡业务的资质依据。 */
  antiqueDealerLicense: "Osaka Prefectural Public Safety Commission No. 62107R048268",
} as const;

export function LegalH2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-10 scroll-mt-24 text-xl font-bold tracking-tight text-white"
    >
      {children}
    </h2>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-sm leading-relaxed text-slate-300">{children}</p>;
}

export function LegalUl({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300 marker:text-cyan-400/60">
      {children}
    </ul>
  );
}

export function LegalShell({
  lang,
  title,
  updated,
  intro,
  children,
}: {
  lang: string;
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#0a0e16] text-slate-200 antialiased">
      <section className="border-b border-white/[0.08]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-400">{intro}</p>
          <p className="mt-3 text-xs text-slate-500">Last updated {updated}</p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        {children}

        <LegalH2 id="operator">Who operates this service</LegalH2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          <dl className="divide-y divide-white/[0.06] text-sm">
            {[
              ["Legal entity", `${COMPANY.legalNameEn} (${COMPANY.legalNameJa})`],
              ["Registered address", COMPANY.addressEn],
              ["Phone", COMPANY.phone],
              ["Support", COMPANY.supportEmail],
              ["Company enquiries", COMPANY.companyEmail],
              ["Antique dealer licence", COMPANY.antiqueDealerLicense],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
                <dt className="w-56 shrink-0 text-slate-400">{k}</dt>
                <dd className="text-slate-200">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <LegalP>
          Questions about this page? Email{" "}
          <a
            href={`mailto:${COMPANY.supportEmail}`}
            className="text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
          >
            {COMPANY.supportEmail}
          </a>{" "}
          or use the{" "}
          <Link
            href={`/${lang}/contact`}
            className="text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
          >
            contact page
          </Link>
          .
        </LegalP>
      </article>
    </main>
  );
}
