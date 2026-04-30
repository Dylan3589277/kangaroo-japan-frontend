import { ReactNode } from "react";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SupportWidget } from "@/components/support/SupportWidget";
import { TawkToWidget } from "@/components/support/TawkToWidget";
import type { Metadata } from "next";
import "@/app/globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  // Japanese pages: noindex, nofollow (retained for existing Japanese users, not promoted via SEO)
  if (lang === "ja") {
    return {
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Non-Japanese pages: default index, follow
  return {
    robots: {
      index: true,
      follow: true,
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
