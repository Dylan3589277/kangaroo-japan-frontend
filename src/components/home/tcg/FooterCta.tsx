"use client";

import { useTranslations } from "next-intl";
import { SearchIcon } from "./icons";

export function FooterCta({
  onSearch,
  onHowItWorks,
}: {
  onSearch: () => void;
  onHowItWorks: () => void;
}) {
  const t = useTranslations("tcg.footerCta");

  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-[#0a0e16]">
      <div
        className="absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background:
            "radial-gradient(55% 80% at 50% 120%, rgba(56,189,248,0.18), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-4 py-20 text-center md:py-24">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-white md:text-4xl">
          {t("title")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-slate-400">{t("subtitle")}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onSearch}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-7 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300 sm:w-auto"
          >
            <SearchIcon className="size-4" />
            {t("ctaSearch")}
          </button>
          <button
            onClick={onHowItWorks}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-7 text-sm font-semibold text-slate-100 transition-colors hover:border-white/30 hover:bg-white/[0.07] sm:w-auto"
          >
            {t("ctaHowItWorks")}
          </button>
        </div>
      </div>
    </section>
  );
}
