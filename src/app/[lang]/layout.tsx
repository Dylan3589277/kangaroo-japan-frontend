import { ReactNode } from "react";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { SupportWidget } from "@/components/support/SupportWidget";
import { TawkToWidget } from "@/components/support/TawkToWidget";
import { isIndexable } from "@/lib/seo";
import "@/app/globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  if (isIndexable(lang)) {
    return {
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  return {
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: null,
      languages: {},
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(routing.locales, lang)) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      {children}
      <SupportWidget lang={lang} />
      <TawkToWidget />
    </div>
  );
}
