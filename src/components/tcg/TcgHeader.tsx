"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Menu, ShoppingCart, User, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth";
import { spaceGrotesk } from "@/app/fonts";

/**
 * TcgHeader —— 设计方向 A（深色高级感）的美国 TCG 站头部。
 *
 * 仅由 [lang]/layout.tsx 在 locale === "en" 时渲染，统一套在所有英文页（首页/
 * cards/fees + 后续英文页）顶部，确保风格一致。配色与现有英文 TCG 页面对齐：
 * 石墨/深墨蓝近黑底 + 电光青 cyan-400 + 展示字体 Space Grotesk（--font-display）。
 *
 * 故意不含语言切换器（站点级软锁，详见 i18n/routing.ts 注释）。品牌使用纯文字
 * 字标，导航与 marketplaces 下拉仅列在售平台（Mercari / Yahoo Auctions / Amazon）。
 */

// 复用现有内部页排除规则：admin / warehouse 各有自身后台布局，不显示买家头部。
const INTERNAL_PREFIXES = ["/admin", "/warehouse"];

const NAV_LINKS = [
  { key: "searchCards", href: "/cards" },
  { key: "howItWorks", href: "/how-it-works" },
  { key: "fees", href: "/fees" },
] as const;

// TCG 品类落地页（由另一分身建好的 /pokemon-cards、/yugioh-cards 路由）。
const CARD_CATEGORIES = [
  { key: "pokemon", href: "/pokemon-cards" },
  { key: "yugioh", href: "/yugioh-cards" },
] as const;

// 仅在售平台（与 home/tcg/Marketplaces.tsx 的 live 列表保持一致）。
const MARKETPLACES = [
  { key: "mercari", href: "/mercari" },
  { key: "yahoo", href: "/yahoo" },
  { key: "amazon", href: "/amazon" },
] as const;

// 「买卡之外也能买别的」口子：指向通用全品类浏览（Mercari 全品类列表）。
const BEYOND_CARDS_LINK = { href: "/mercari" } as const;

// 移出后延迟收起的毫秒数：给鼠标从触发器斜向移到菜单项留出余量（hover 意图）。
const HOVER_CLOSE_DELAY = 240;

/**
 * 桌面端导航下拉的交互：兼顾「点击切换」与「hover 意图延迟」。
 * - hover 进入立即展开，移出后 ~240ms 才收起（配合触发器/菜单之间的桥接 padding，
 *   消除中间空隙，保证能顺畅移到菜单项点击）。
 * - 点击触发器仍可手动开/关；点外部、Esc、选完菜单项均收起。
 *
 * 计时器句柄存在 ref 里、仅在事件处理器中读写（不在 render 读 ref.current，
 * 不在 effect 同步 setState），满足项目 husky 规则。
 */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openNow = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const closeNow = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
    }, HOVER_CLOSE_DELAY);
  }, [clearCloseTimer]);

  const toggle = useCallback(() => {
    clearCloseTimer();
    setOpen((prev) => !prev);
  }, [clearCloseTimer]);

  // 点击外部 / Esc 收起；卸载时清掉计时器，避免泄漏。
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  return { open, containerRef, menuId, openNow, closeNow, scheduleClose, toggle };
}

export function TcgHeader() {
  const t = useTranslations("tcg.header");
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();

  const {
    open: marketsOpen,
    containerRef: marketsRef,
    menuId: marketsMenuId,
    openNow: marketsOpenNow,
    closeNow: marketsCloseNow,
    scheduleClose: marketsScheduleClose,
    toggle: marketsToggle,
  } = useDropdown();
  const {
    open: cardsOpen,
    containerRef: cardsRef,
    menuId: cardsMenuId,
    openNow: cardsOpenNow,
    closeNow: cardsCloseNow,
    scheduleClose: cardsScheduleClose,
    toggle: cardsToggle,
  } = useDropdown();

  // admin / warehouse 走自身布局，不渲染买家头部。
  const isInternal = INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isInternal) {
    return null;
  }

  const accountLink = isAuthenticated
    ? { href: "/orders", label: user?.name || t("orders") }
    : { href: "/login", label: t("login") };

  return (
    <header
      className={`${spaceGrotesk.variable} sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#0a0e16]/85 text-slate-200 backdrop-blur-md`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* 品牌字标（纯文字，不用官方 logo） */}
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-2"
          aria-label={t("brand")}
        >
          <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-white">
            {t("brand")}
          </span>
          <span className="hidden text-[11px] font-medium text-cyan-300/70 sm:inline">
            {t("tagline")}
          </span>
        </Link>

        {/* 桌面导航 */}
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="whitespace-nowrap text-sm font-medium text-slate-300 transition-colors hover:text-cyan-300"
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}

          {/* Cards 下拉（TCG 品类落地页） */}
          <div
            ref={cardsRef}
            className="relative"
            onMouseEnter={cardsOpenNow}
            onMouseLeave={cardsScheduleClose}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={cardsOpen}
              aria-controls={cardsMenuId}
              onClick={cardsToggle}
              className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-slate-300 transition-colors hover:text-cyan-300"
            >
              {t("nav.cards")}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${cardsOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {/* pt-2 桥接触发器与菜单之间的空隙，移动鼠标不会触发 onMouseLeave */}
            <div
              className={`absolute left-0 top-full z-50 pt-2 ${cardsOpen ? "block" : "hidden"}`}
            >
              <ul
                id={cardsMenuId}
                role="menu"
                aria-label={t("nav.cards")}
                className="w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0d1320] py-1.5 shadow-2xl shadow-black/50"
              >
                {CARD_CATEGORIES.map((c) => (
                  <li key={c.key} role="none">
                    <Link
                      href={c.href}
                      role="menuitem"
                      onClick={cardsCloseNow}
                      className="block px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-cyan-300"
                    >
                      {t(`cards.${c.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Marketplaces 下拉（仅在售平台） */}
          <div
            ref={marketsRef}
            className="relative"
            onMouseEnter={marketsOpenNow}
            onMouseLeave={marketsScheduleClose}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={marketsOpen}
              aria-controls={marketsMenuId}
              onClick={marketsToggle}
              className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-slate-300 transition-colors hover:text-cyan-300"
            >
              {t("nav.marketplaces")}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${marketsOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {/* pt-2 桥接触发器与菜单之间的空隙，移动鼠标不会触发 onMouseLeave */}
            <div
              className={`absolute left-0 top-full z-50 pt-2 ${marketsOpen ? "block" : "hidden"}`}
            >
              <ul
                id={marketsMenuId}
                role="menu"
                aria-label={t("nav.marketplaces")}
                className="w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0d1320] py-1.5 shadow-2xl shadow-black/50"
              >
                {MARKETPLACES.map((m) => (
                  <li key={m.key} role="none">
                    <Link
                      href={m.href}
                      role="menuitem"
                      onClick={marketsCloseNow}
                      className="block px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-cyan-300"
                    >
                      {t(`marketplaces.${m.key}`)}
                    </Link>
                  </li>
                ))}
                {/* 「买卡之外也能买别的」口子：通用泛代拍浏览入口 */}
                <li role="none" className="mt-1 border-t border-white/10 pt-1">
                  <Link
                    href={BEYOND_CARDS_LINK.href}
                    role="menuitem"
                    onClick={marketsCloseNow}
                    className="block px-4 py-2 text-sm font-medium text-cyan-300/90 transition-colors hover:bg-white/[0.06] hover:text-cyan-200"
                  >
                    {t("nav.beyondCards")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {/* 右侧：购物车 + 账户（桌面） */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/cart"
            aria-label={t("cart")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-cyan-300"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("cart")}</span>
          </Link>

          <Link
            href={accountLink.href}
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.03] px-3 text-sm font-medium text-slate-100 transition-colors hover:border-cyan-400/40 hover:text-cyan-200 md:inline-flex"
          >
            <User className="h-4 w-4" aria-hidden="true" />
            {accountLink.label}
          </Link>

          {/* 移动汉堡菜单（用 <details>，避免额外受控 state 触发 react-hooks 规则） */}
          <details className="group relative lg:hidden">
            <summary
              className="flex h-9 w-9 list-none items-center justify-center rounded-lg text-slate-200 transition-colors hover:bg-white/[0.06] hover:text-cyan-300 [&::-webkit-details-marker]:hidden"
              aria-label={t("openMenu")}
            >
              <Menu className="h-5 w-5 group-open:hidden" aria-hidden="true" />
              <X className="hidden h-5 w-5 group-open:block" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-white/10 bg-[#0d1320] p-3 shadow-2xl shadow-black/50">
              <nav className="flex flex-col gap-0.5">
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-cyan-300"
                  >
                    {t(`nav.${item.key}`)}
                  </Link>
                ))}

                <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t("nav.cards")}
                </div>
                {CARD_CATEGORIES.map((c) => (
                  <Link
                    key={c.key}
                    href={c.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-cyan-300"
                  >
                    {t(`cards.${c.key}`)}
                  </Link>
                ))}

                <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {t("nav.marketplaces")}
                </div>
                {MARKETPLACES.map((m) => (
                  <Link
                    key={m.key}
                    href={m.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-cyan-300"
                  >
                    {t(`marketplaces.${m.key}`)}
                  </Link>
                ))}
                {/* 「买卡之外也能买别的」口子（移动端） */}
                <Link
                  href={BEYOND_CARDS_LINK.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-cyan-300/90 transition-colors hover:bg-white/[0.06] hover:text-cyan-200"
                >
                  {t("nav.beyondCards")}
                </Link>

                <div className="my-2 border-t border-white/10" />
                <Link
                  href={accountLink.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-white/[0.06] hover:text-cyan-200"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  {accountLink.label}
                </Link>
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
