import type { ReactNode } from "react";
import Link from "next/link";

/**
 * 法律页（Privacy / Terms）的共用外壳与排版原子。
 *
 * 与 guides 的深色外壳同一套视觉，但独立成文件：guides 那套带 Article JSON-LD、
 * 面包屑与「Ready to buy from Japan?」营销 CTA，法律页不该有这些。
 *
 * 2026-08-04：zh 接入真实中文服务条款/隐私政策正文（此前 zh 访客看到的是 en 硬编码
 * 英文）。排版原子按 lang 分流深色（en，逐字节不变，marker cyan）/ 浅色（zh 买家壳，
 * 同六个信任页的 DARK/LIGHT 方案，marker rose，见 faq、buyer-protection page.tsx）。
 * 判定只认 `lang === "zh"` 才浅色——ja/ko/th/id/vi 目前仍复用 en 英文正文（page.tsx
 * 内容分支未变），必须继续拿到深色 UI，不能因为「非 en」被误判成浅色。
 * lang 在 LegalH2/LegalP/LegalUl 上是可选参数：不传时按深色渲染，因此 en 分支的
 * 既有调用点（不传 lang）无需改动，输出与改动前逐字节相同。
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
  /** zh 条款/隐私政策正文用的中文呈现，与 docs/legal/zh-terms-final.md 第二章一致。 */
  legalNameZh: "株式会社長月商事（Nagatsuki Corporation）",
  addressZh: "日本国大阪府大阪市西区江之子島 1-6-2 奥内大八大厦 905（〒550-0006）",
  antiqueDealerLicenseZh: "大阪府公安委员会 第 62107R048268 号",
} as const;

function isLight(lang: string) {
  return lang === "zh";
}

export function LegalH2({
  id,
  lang,
  children,
}: {
  id?: string;
  lang?: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className={
        lang && isLight(lang)
          ? "mt-10 scroll-mt-24 text-xl font-bold tracking-tight text-zinc-900"
          : "mt-10 scroll-mt-24 text-xl font-bold tracking-tight text-white"
      }
    >
      {children}
    </h2>
  );
}

export function LegalP({ lang, children }: { lang?: string; children: ReactNode }) {
  return (
    <p
      className={
        lang && isLight(lang)
          ? "mt-4 text-sm leading-relaxed text-zinc-600"
          : "mt-4 text-sm leading-relaxed text-slate-300"
      }
    >
      {children}
    </p>
  );
}

export function LegalUl({ lang, children }: { lang?: string; children: ReactNode }) {
  return (
    <ul
      className={
        lang && isLight(lang)
          ? "mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 marker:text-rose-500/70"
          : "mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300 marker:text-cyan-400/60"
      }
    >
      {children}
    </ul>
  );
}

/**
 * zh 正文表格（运营主体信息、费用表）用的简单浅色 dl。只有浅色壳（zh）会用到，
 * 不需要深色变体。
 */
export function LegalInfoTable({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <dl className="divide-y divide-zinc-100 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
            <dt className="w-56 shrink-0 text-zinc-500">{k}</dt>
            <dd className="text-zinc-800">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
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
  const light = isLight(lang);

  return (
    <main
      className={
        light
          ? "min-h-screen bg-zinc-50 text-zinc-700 antialiased"
          : "min-h-screen bg-[#0a0e16] text-slate-200 antialiased"
      }
    >
      <section
        className={light ? "border-b border-zinc-200 bg-white" : "border-b border-white/[0.08]"}
      >
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <h1
            className={
              light
                ? "text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl"
                : "text-3xl font-bold tracking-tight text-white sm:text-4xl"
            }
          >
            {title}
          </h1>
          <p
            className={
              light
                ? "mt-4 text-base leading-relaxed text-zinc-600"
                : "mt-4 text-base leading-relaxed text-slate-400"
            }
          >
            {intro}
          </p>
          <p className={light ? "mt-3 text-xs text-zinc-400" : "mt-3 text-xs text-slate-500"}>
            {light ? "最后更新日期 " : "Last updated "}
            {updated}
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        {children}

        <LegalH2 id="operator" lang={lang}>
          {light ? "运营主体" : "Who operates this service"}
        </LegalH2>
        <div
          className={
            light
              ? "mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              : "mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]"
          }
        >
          <dl
            className={
              light ? "divide-y divide-zinc-100 text-sm" : "divide-y divide-white/[0.06] text-sm"
            }
          >
            {(light
              ? [
                  ["法定名称", COMPANY.legalNameZh],
                  ["注册地址", COMPANY.addressZh],
                  ["电话", COMPANY.phone],
                  ["客服邮箱", COMPANY.supportEmail],
                  ["古物商许可", COMPANY.antiqueDealerLicenseZh],
                ]
              : [
                  ["Legal entity", `${COMPANY.legalNameEn} (${COMPANY.legalNameJa})`],
                  ["Registered address", COMPANY.addressEn],
                  ["Phone", COMPANY.phone],
                  ["Support", COMPANY.supportEmail],
                  ["Company enquiries", COMPANY.companyEmail],
                  ["Antique dealer licence", COMPANY.antiqueDealerLicense],
                ]
            ).map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
                <dt className={light ? "w-56 shrink-0 text-zinc-500" : "w-56 shrink-0 text-slate-400"}>
                  {k}
                </dt>
                <dd className={light ? "text-zinc-800" : "text-slate-200"}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <LegalP lang={lang}>
          {light ? (
            <>
              对本页内容有疑问？欢迎发送邮件至{" "}
              <a
                href={`mailto:${COMPANY.supportEmail}`}
                className="text-rose-600 underline-offset-4 hover:text-rose-700 hover:underline"
              >
                {COMPANY.supportEmail}
              </a>
              ，或前往{" "}
              <Link
                href={`/${lang}/contact`}
                className="text-rose-600 underline-offset-4 hover:text-rose-700 hover:underline"
              >
                联系客服
              </Link>{" "}
              页面。
            </>
          ) : (
            <>
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
            </>
          )}
        </LegalP>
      </article>
    </main>
  );
}
