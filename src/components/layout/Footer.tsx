import { Link } from "@/i18n/navigation";

/**
 * Footer —— 通用买家站（zh 及共用同一 layout 分支的 ko/th/id/vi/ja）底部页脚。
 * 浅色主题（zh 站 bg-zinc-50 系），仅由 SiteFooter 在非 en locale、且非内部/
 * 内嵌页时渲染。结构参考 TcgFooter（四列 + 底部条），配色不沿用其深色皮肤。
 *
 * 文案直接硬编码中文，不接入 next-intl：新增翻译键需要改
 * src/i18n/locales/zh/common.json，该文件正被并行会话（卡2）改中文正文，属冲突
 * 热文件，故按仓内既有先例处理（TcgFooter 的 GUIDE_LINKS 同样硬编码英文以避开
 * 当时并行占用的 tcg.json）。已知局限：ko/th/id/vi/ja 也会看到中文页脚文案，
 * 这与 Header/SiteHeader 当前对这些 locale 共用同一套外壳的既有做法一致。
 */

const HELP_LINKS = [
  { key: "help", label: "帮助中心", href: "/help" },
  { key: "faq", label: "常见问题", href: "/faq" },
  { key: "buyerProtection", label: "买家保障", href: "/buyer-protection" },
  { key: "contact", label: "联系客服", href: "/contact" },
] as const;

const SERVICE_LINKS = [
  { key: "howItWorks", label: "代购流程", href: "/how-it-works" },
  { key: "feeCompare", label: "费用说明", href: "/fee-compare" },
  { key: "photoInspection", label: "拍照验货", href: "/photo-inspection" },
  { key: "compare", label: "价格对比", href: "/compare" },
] as const;

const ABOUT_LINKS = [
  { key: "about", label: "关于我们", href: "/about" },
  { key: "terms", label: "服务条款", href: "/terms" },
  { key: "privacy", label: "隐私政策", href: "/privacy" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 text-zinc-600">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* 品牌 + 简介 */}
          <div className="max-w-sm">
            <span className="text-lg font-bold tracking-tight text-zinc-900">袋鼠君</span>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              日本代购代拍 · 煤炉/雅虎竞拍 · 全球直邮
            </p>
          </div>

          {/* 帮助 */}
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              帮助
            </h2>
            <ul className="mt-4 space-y-3">
              {HELP_LINKS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-zinc-600 transition-colors hover:text-rose-600"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 服务 */}
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              服务
            </h2>
            <ul className="mt-4 space-y-3">
              {SERVICE_LINKS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-zinc-600 transition-colors hover:text-rose-600"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 关于 */}
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              关于
            </h2>
            <ul className="mt-4 space-y-3">
              {ABOUT_LINKS.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-sm text-zinc-600 transition-colors hover:text-rose-600"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 space-y-1 border-t border-zinc-200 pt-6 text-xs text-zinc-500">
          <p>客服时段：周一至周日 9:00-18:00（中国时间）</p>
          <p>© {year} 袋鼠君. 保留所有权利。</p>
        </div>
      </div>
    </footer>
  );
}
