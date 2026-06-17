import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { spaceGrotesk } from "@/app/fonts";

// 「买卡之外也能买别的」口子：指向通用全品类浏览（Mercari 全品类列表）。
const BEYOND_CARDS_HREF = "/mercari";

/**
 * TcgFooter —— 设计方向 A（深色高级感）的美国 TCG 站底部。
 *
 * 仅由 [lang]/layout.tsx 在 locale === "en" 时渲染。配色与 TcgHeader / 英文页面
 * 对齐（石墨近黑底 + 电光青 + Space Grotesk 展示字体）。英文内容、纯文字品牌。
 *
 * 所有链接指向已存在的英文路由：FAQ→/faq、Buyer protection→/buyer-protection、
 * About→/about、Shipping→/buyer-protection（含合箱/包装/运输段）、Fees→/fees。
 * Cards 列指向 TCG 品类落地页 /pokemon-cards、/yugioh-cards（由另一分身建好）。
 */

const SUPPORT_LINKS = [
  { key: "contact", href: "/contact" },
  { key: "faq", href: "/faq" },
  { key: "buyerProtection", href: "/buyer-protection" },
] as const;

const COMPANY_LINKS = [
  { key: "fees", href: "/fees" },
  { key: "shipping", href: "/buyer-protection" },
  { key: "about", href: "/about" },
] as const;

// TCG 品类落地页（由另一分身建好的路由），底部新增一列避免死链。
const CARDS_LINKS = [
  { key: "pokemon", href: "/pokemon-cards" },
  { key: "yugioh", href: "/yugioh-cards" },
  { key: "howItWorks", href: "/how-it-works" },
] as const;

export function TcgFooter() {
  const t = useTranslations("tcg");
  const year = new Date().getFullYear();

  return (
    <footer
      className={`${spaceGrotesk.variable} border-t border-white/[0.08] bg-[#080b12] text-slate-300`}
    >
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* 品牌 + 简介 */}
          <div className="max-w-sm">
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-white">
              {t("header.brand")}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {t("footer.tagline")}
            </p>
            {/* 「买卡之外也能买别的」口子：指向通用泛代拍浏览 */}
            <Link
              href={BEYOND_CARDS_HREF}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200"
            >
              {t("footer.beyondCards")}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
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

          {/* Cards 列（TCG 品类落地页） */}
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t("footer.columns.cards.title")}
            </h2>
            <ul className="mt-4 space-y-3">
              {CARDS_LINKS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-400 transition-colors hover:text-cyan-300"
                  >
                    {t(`footer.columns.cards.${item.key}`)}
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
