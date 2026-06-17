import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { spaceGrotesk } from "@/app/fonts";

/**
 * TcgFooter —— 设计方向 A（深色高级感）的美国 TCG 站底部。
 *
 * 仅由 [lang]/layout.tsx 在 locale === "en" 时渲染。配色与 TcgHeader / 英文页面
 * 对齐（石墨近黑底 + 电光青 + Space Grotesk 展示字体）。英文内容、纯文字品牌。
 *
 * 链接尽量指向已存在的英文页；尚未建好的 How it works 与 buyer protection 暂指
 * /how-it-works（后续建页），与 TcgHeader 的导航保持一致。
 */

const SUPPORT_LINKS = [
  { key: "contact", href: "/contact" },
  { key: "faq", href: "/help" },
  { key: "buyerProtection", href: "/how-it-works" },
] as const;

const COMPANY_LINKS = [
  { key: "fees", href: "/fees" },
  { key: "shipping", href: "/fees" },
  { key: "about", href: "/contact" },
] as const;

export function TcgFooter() {
  const t = useTranslations("tcg");
  const year = new Date().getFullYear();

  return (
    <footer
      className={`${spaceGrotesk.variable} border-t border-white/[0.08] bg-[#080b12] text-slate-300`}
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* 品牌 + 简介 */}
          <div className="max-w-sm">
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-white">
              {t("header.brand")}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Support 列 */}
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t("footer.columns.support.title")}
            </h2>
            <ul className="mt-4 space-y-3">
              {SUPPORT_LINKS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-400 transition-colors hover:text-cyan-300"
                  >
                    {t(`footer.columns.support.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company 列 */}
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t("footer.columns.company.title")}
            </h2>
            <ul className="mt-4 space-y-3">
              {COMPANY_LINKS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-400 transition-colors hover:text-cyan-300"
                  >
                    {t(`footer.columns.company.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/[0.06] pt-6 text-xs text-slate-500">
          {t("footer.copyright", { year })}
        </div>
      </div>
    </footer>
  );
}
