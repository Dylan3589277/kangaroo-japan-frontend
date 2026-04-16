"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useParams } from "next/navigation";

export default function HomePage() {
  const t = useTranslations();
  const pathname = usePathname();
  const params = useParams();
  const lang = params.lang as string;

  const navItems = [
    { key: "home", href: "/", label: t("nav.home") },
    { key: "products", href: "/products", label: t("nav.products") },
    { key: "cart", href: "/cart", label: t("nav.cart") },
    { key: "about", href: "/about", label: t("nav.about") },
  ];

  const switchLocale = (newLocale: string) => {
    const current = pathname;
    return `/${newLocale}${current === "/" ? "" : current}`;
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-rose-600">🦘 {t("home.title")}</h1>
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

          {/* Language Switcher */}
          <div className="flex items-center gap-2">
            {routing.locales.map((locale) => (
              <Link
                key={locale}
                href={switchLocale(locale)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
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
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-rose-50 to-orange-50 py-20">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="text-4xl font-bold text-zinc-900 mb-4">
            {t("home.title")}
          </h2>
          <p className="text-lg text-zinc-600 mb-8">{t("home.subtitle")}</p>

          {/* Search Bar */}
          <div className="mx-auto max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder={t("home.search")}
                className="w-full h-12 px-6 pr-32 rounded-full border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-5 bg-rose-600 text-white text-sm font-medium rounded-full hover:bg-rose-700 transition-colors">
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h3 className="text-2xl font-bold text-zinc-900 mb-8">{t("home.categories")}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["电子产品", "服装时尚", "家居用品", "美妆护肤"].map((cat, i) => (
              <Link
                key={i}
                href={`/products?category=${i}`}
                className="flex items-center justify-center h-24 rounded-xl bg-white border shadow-sm hover:shadow-md hover:border-rose-200 transition-all"
              >
                <span className="font-medium text-zinc-700">{cat}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-zinc-500">
          © 2026 Kangaroo Japan. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
