import type { Metadata } from "next";
import { ReactNode } from "react";
import { buildAlternates, isIndexable } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  if (!isIndexable(lang)) {
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

  return {
    alternates: buildAlternates(lang, "compare"),
  };
}

export default function CompareLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
