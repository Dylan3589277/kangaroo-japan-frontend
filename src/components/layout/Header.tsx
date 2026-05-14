"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { useState } from "react";
import { ChevronDown, Menu, Search, X } from "lucide-react";

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
  const navItems = [
    { key: "home", href: "/", label: t("nav.home") },
    { key: "products", href: "/products", label: t("nav.products") },
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
            {navItems.map((item) => (
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
                {navItems.map((item) => (
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
