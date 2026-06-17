"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, MinusIcon } from "./icons";

const ITEMS = [
  "whatIsProxy",
  "whichMarketplaces",
  "feesHow",
  "condition",
  "shippingTime",
] as const;

export function Faq() {
  const t = useTranslations("tcg.faq");
  const [open, setOpen] = useState<string | null>(ITEMS[0]);

  return (
    <section className="border-t border-white/[0.06] bg-[#0b1018]">
      <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
        <h2 className="text-center font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
          {t("title")}
        </h2>

        <div className="mt-10 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          {ITEMS.map((key) => {
            const isOpen = open === key;
            return (
              <div key={key}>
                <button
                  onClick={() => setOpen(isOpen ? null : key)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <span className="text-[15px] font-semibold text-white">
                    {t(`items.${key}.q`)}
                  </span>
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-cyan-300">
                    {isOpen ? <MinusIcon className="size-4" /> : <PlusIcon className="size-4" />}
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-200 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400">
                      {t(`items.${key}.a`)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
