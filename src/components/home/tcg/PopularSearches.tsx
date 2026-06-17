"use client";

import { useTranslations } from "next-intl";
import { SearchIcon } from "./icons";

const CHIPS = [
  { key: "pokemon151", q: "Pokemon 151 booster box" },
  { key: "eeveeHeroes", q: "Eevee Heroes" },
  { key: "psa10", q: "PSA 10 Japanese" },
  { key: "ocgQuarterCentury", q: "OCG Quarter Century" },
  { key: "blueEyes", q: "Blue-Eyes White Dragon" },
] as const;

export function PopularSearches({ onChip }: { onChip: (query: string) => void }) {
  const t = useTranslations("tcg.popular");

  return (
    <section className="border-t border-white/[0.06] bg-[#0a0e16]">
      <div className="mx-auto max-w-6xl px-4 py-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t("label")}
          </span>
          {CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => onChip(chip.q)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm text-slate-200 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white"
            >
              <SearchIcon className="size-3.5 text-slate-400" />
              {t(`items.${chip.key}`)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
