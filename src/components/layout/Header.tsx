"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { SITE_MENU } from "./siteMenu";

const LOCALE_PREFIX_RE = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);
type Locale = (typeof routing.locales)[number];

const LANGUAGE_LABELS: Record<Locale, string> = {
  zh: "Chinese",
  en: "English",
  ko: "Korean",
  th: "Thai",
  id: "Indonesian",
  vi: "Vietnamese",
  ja: "Japanese",
};

interface HeaderProps {
  showSearch?: boolean;
  initialSearchQuery?: string;
  onSearch?: (query: string) => void;
}

function isLocale(value: string): value is Locale {
  return routing.locales.includes(value as Locale);
}

export function Header({ showSearch = false, initialSearchQuery = "", onSearch }: HeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const params = useParams();
  const lang = (params.lang as string) || "zh";
  const currentLocale = isLocale(lang) ? lang : "zh";
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [sitesOpen, setSitesOpen] = useState(false);
  const sitesRef = useRef<HTMLDivElement>(null);
  const sitesMenuId = useId();

  useEffect(() => {
    if (!sitesOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (sitesRef.current && !sitesRef.current.contains(event.target as Node)) {
        setSitesOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSitesOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sitesOpen]);

  const navItems = [
    { key: "home", href: "/", label: t("nav.home") },
    { key: "cart", href: "/cart", label: t("nav.cart") },
    { key: "compare", href: "/compare", label: t("home.priceCompare") },
  ];

  const getAuthNav = () => {
    if (isAuthenticated) {
      return [
        { key: "orders", href: "/orders", label: t("nav.orders") },
        { key: "profile", href: "/profile", label: user?.name || t("nav.profile") },
      ];
    }
    return [
      { key: "login", href: "/login", label: t("auth.login") },
      { key: "register", href: "/register", label: t("auth.register") },
    ];
  };

  const getLocalePath = (locale: Locale) => {
    const currentPath = pathname.replace(LOCALE_PREFIX_RE, "") || "/";
    return `/${locale}${currentPath === "/" ? "" : currentPath}`;
  };

  const getLocaleHref = (locale: Locale) =>
    `/api/locale?locale=${locale}&next=${encodeURIComponent(getLocalePath(locale))}`;

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value;
    if (isLocale(nextLocale) && nextLocale !== currentLocale) {
      window.location.href = getLocaleHref(nextLocale);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (onSearch) {
      onSearch(query);
    } else if (query) {
      router.push(`/${lang}/products?search=${encodeURIComponent(query)}`);
    }
  };

  const authNavItems = getAuthNav();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-2 lg:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <Link href="/" className="flex shrink-0 items-center" aria-label="kangaroo home">
            <Image
              src="/brand/kangaroo-logo.png"
              alt="kangaroo"
              width={48}
              height={48}
              priority
              className="h-11 w-11 object-contain sm:h-12 sm:w-12"
            />
          </Link>
          <nav className="hidden items-center gap-5 lg:flex">
            <Link
              href="/"
              className="whitespace-nowrap text-sm font-medium text-zinc-600 transition-colors hover:text-rose-600"
            >
              {t("nav.home")}
            </Link>

            <div
              ref={sitesRef}
              className="relative"
              onMouseEnter={() => setSitesOpen(true)}
              onMouseLeave={() => setSitesOpen(false)}
            >
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={sitesOpen}
                aria-controls={sitesMenuId}
                onClick={() => setSitesOpen((open) => !open)}
                className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-zinc-600 transition-colors hover:text-rose-600"
              >
                {t("nav.sites")}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${sitesOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <ul
                id={sitesMenuId}
                role="menu"
                aria-label={t("nav.sites")}
                className={`absolute left-0 top-full z-50 mt-2 w-56 rounded-lg border bg-white py-1.5 shadow-xl ${sitesOpen ? "block" : "hidden"}`}
              >
                {SITE_MENU.map((site) => (
                  <li key={site.key} role="none">
                    {site.href ? (
                      <Link
                        href={site.href}
                        role="menuitem"
                        onClick={() => setSitesOpen(false)}
                        className="block px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        {t(`siteMenu.${site.key}`)}
                      </Link>
                    ) : (
                      <span
                        role="menuitem"
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center justify-between gap-2 px-4 py-2 text-sm font-medium text-zinc-400"
                      >
                        {t(`siteMenu.${site.key}`)}
                        <span className="text-[10px] font-normal text-zinc-400">
                          {t("siteMenu.comingSoon")}
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {navItems
              .filter((item) => item.key !== "home")
              .map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="whitespace-nowrap text-sm font-medium text-zinc-600 transition-colors hover:text-rose-600"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <nav className="hidden items-center gap-3 md:flex">
            {authNavItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="whitespace-nowrap text-sm font-medium text-zinc-600 transition-colors hover:text-rose-600"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="relative shrink-0">
            <select
              aria-label="Language selector"
              value={currentLocale}
              title={LANGUAGE_LABELS[currentLocale]}
              onChange={handleLocaleChange}
              className="h-9 w-[78px] appearance-none rounded-full border border-zinc-200 bg-white py-1 pl-3 pr-8 text-xs font-semibold uppercase leading-none text-zinc-700 shadow-sm transition-colors hover:border-rose-300 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {routing.locales.map((locale) => (
                <option key={locale} value={locale}>
                  {locale.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          </div>

          <details className="group relative lg:hidden">
            <summary className="list-none rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-rose-600 [&::-webkit-details-marker]:hidden" aria-label="Toggle menu">
              <Menu className="h-5 w-5 group-open:hidden" />
              <X className="hidden h-5 w-5 group-open:block" />
            </summary>
            <div className="absolute right-0 top-12 z-50 w-72 rounded-lg border bg-white p-3 shadow-xl">
              <nav className="flex flex-col gap-1">
                <Link
                  href="/"
                  className="rounded px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  {t("nav.home")}
                </Link>

                <details className="group/sites">
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-rose-50 hover:text-rose-600 [&::-webkit-details-marker]:hidden">
                    {t("nav.sites")}
                    <ChevronDown
                      className="h-4 w-4 transition-transform group-open/sites:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <ul className="mt-1 flex flex-col gap-0.5 pl-3" role="menu" aria-label={t("nav.sites")}>
                    {SITE_MENU.map((site) => (
                      <li key={site.key} role="none">
                        {site.href ? (
                          <Link
                            href={site.href}
                            role="menuitem"
                            className="block rounded px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            {t(`siteMenu.${site.key}`)}
                          </Link>
                        ) : (
                          <span
                            role="menuitem"
                            aria-disabled="true"
                            className="flex cursor-not-allowed items-center justify-between gap-2 rounded px-3 py-2 text-sm font-medium text-zinc-400"
                          >
                            {t(`siteMenu.${site.key}`)}
                            <span className="text-[10px] font-normal text-zinc-400">
                              {t("siteMenu.comingSoon")}
                            </span>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>

                {navItems
                  .filter((item) => item.key !== "home")
                  .map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="rounded px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      {item.label}
                    </Link>
                  ))}
                <div className="my-2 border-t pt-2" />
                {authNavItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="rounded px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </details>
        </div>
      </div>

      {showSearch && (
        <div className="border-t bg-white">
          <form onSubmit={handleSearchSubmit} className="mx-auto max-w-2xl px-4 py-3">
            <div className="relative">
              <input
                type="text"
                placeholder={t("home.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-full border border-zinc-200 bg-white px-5 pr-24 text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 flex h-8 -translate-y-1/2 items-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-700"
              >
                <Search className="h-3.5 w-3.5" />
                {t("products.searchBtn")}
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
