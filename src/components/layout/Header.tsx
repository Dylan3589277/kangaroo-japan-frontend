"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { useState, useRef, useEffect } from "react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuOpen]);

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

  const switchLocale = (newLocale: string) => {
    const currentPath = pathname.replace(/^\/(zh|en)/, '') || '/';
    return `/${newLocale}${currentPath === "/" ? "" : currentPath}`;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    } else if (searchQuery.trim()) {
      router.push(`/${lang}/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const authNavItems = getAuthNav();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🦘</span>
            <span className="text-xl font-bold text-rose-600">{t("home.title")}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="text-sm font-medium text-zinc-600 hover:text-rose-600 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile hamburger button */}
        <button
          className="md:hidden p-2 text-zinc-600 hover:text-rose-600"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        <div className="flex items-center gap-4">
          {/* Auth Nav - desktop */}
          <nav className="hidden md:flex items-center gap-4">
            {authNavItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="text-sm font-medium text-zinc-600 hover:text-rose-600 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Language Switcher */}
          <div className="flex items-center gap-1">
            {routing.locales.map((locale) => (
              <Link
                key={locale}
                href={switchLocale(locale)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                  lang === locale
                    ? "bg-rose-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {locale.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div ref={menuRef} className="md:hidden border-t bg-white">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-zinc-600 hover:text-rose-600 hover:bg-rose-50 rounded px-3 py-2 transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t my-2 pt-2" />
            {authNavItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-zinc-600 hover:text-rose-600 hover:bg-rose-50 rounded px-3 py-2 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Search Bar (optional) */}
      {showSearch && (
        <div className="border-t bg-white">
          <form onSubmit={handleSearchSubmit} className="mx-auto max-w-2xl px-4 py-3">
            <div className="relative">
              <input
                type="text"
                placeholder={t("home.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 px-5 pr-24 rounded-full border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-5 bg-rose-600 text-white text-sm font-medium rounded-full hover:bg-rose-700 transition-colors"
              >
                {t("products.searchBtn")}
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
