"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";

const LOCALE_PREFIX_RE = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`);
const LANGUAGE_LABELS: Record<(typeof routing.locales)[number], string> = {
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

export function Header({ showSearch = false, initialSearchQuery = "", onSearch }: HeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const params = useParams();
  const lang = (params.lang as string) || "zh";
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

  const getLocalePath = (locale: string) => {
    const currentPath = pathname.replace(LOCALE_PREFIX_RE, "") || "/";
    return `/${locale}${currentPath === "/" ? "" : currentPath}`;
  };

  const getLocaleHref = (locale: string) =>
    `/api/locale?locale=${locale}&next=${encodeURIComponent(getLocalePath(locale))}`;

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
              src="/brand/kangaroo-logo.svg"
              alt="kangaroo"
              width={72}
              height={54}
              priority
              className="h-11 w-auto sm:h-12"
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

          <div className="hidden items-center gap-1 rounded-full bg-zinc-100 p-1 shadow-inner sm:flex" aria-label="Language selector">
            {routing.locales.map((locale) => (
              <a
                key={locale}
                href={getLocaleHref(locale)}
                title={LANGUAGE_LABELS[locale]}
                aria-current={lang === locale ? "page" : undefined}
                className={`min-w-8 rounded-full px-2.5 py-1 text-center text-[11px] font-semibold leading-5 transition-colors ${
                  lang === locale
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-white hover:text-zinc-900"
                }`}
              >
                {locale.toUpperCase()}
              </a>
            ))}
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
                <div className="my-2 border-t pt-3" />
                <div className="grid grid-cols-4 gap-2">
                  {routing.locales.map((locale) => (
                    <a
                      key={locale}
                      href={getLocaleHref(locale)}
                      title={LANGUAGE_LABELS[locale]}
                      className={`rounded-full px-3 py-2 text-center text-xs font-semibold transition-colors ${
                        lang === locale
                          ? "bg-rose-600 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      {locale.toUpperCase()}
                    </a>
                  ))}
                </div>
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
