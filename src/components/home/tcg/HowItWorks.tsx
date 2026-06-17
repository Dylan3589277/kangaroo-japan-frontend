"use client";

import { useTranslations } from "next-intl";
import { SearchIcon, CartIcon, InspectIcon, ShipIcon } from "./icons";

const STEPS = [
  { key: "find", Icon: SearchIcon },
  { key: "buy", Icon: CartIcon },
  { key: "inspect", Icon: InspectIcon },
  { key: "ship", Icon: ShipIcon },
] as const;

export function HowItWorks({ id }: { id?: string }) {
  const t = useTranslations("tcg.how");

  return (
    <section id={id} className="scroll-mt-20 border-t border-white/[0.06] bg-[#0b1018]">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-slate-400">{t("subtitle")}</p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li
              key={step.key}
              className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex size-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                  <step.Icon className="size-5" />
                </span>
                <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-white/10">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                {t(`steps.${step.key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {t(`steps.${step.key}.desc`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
