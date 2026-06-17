"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ReceiptIcon, ArrowRightIcon } from "./icons";

export function FeesTeaser() {
  const t = useTranslations("tcg.fees");

  return (
    <section className="border-t border-white/[0.06] bg-[#0a0e16]">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-[#0e1622] to-[#0a0e16] p-7 md:p-9">
          <div
            className="absolute -right-16 -top-16 size-56 rounded-full opacity-30 blur-3xl"
            aria-hidden
            style={{ background: "radial-gradient(circle, rgba(56,189,248,0.5), transparent 70%)" }}
          />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-200">
                <ReceiptIcon className="size-3.5" />
                {t("badge")}
              </span>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
                {t("title")}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{t("desc")}</p>
            </div>
            <Link
              href="/fees"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-5 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/20"
            >
              {t("cta")}
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
