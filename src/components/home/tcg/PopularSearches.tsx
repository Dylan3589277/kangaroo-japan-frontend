"use client";

import { useTranslations } from "next-intl";
import { SearchIcon } from "./icons";
import { POPULAR_CHIPS } from "./tcg-keywords";

// 热门 IP 热门卡芯片：英文展示名（chip.label）+ 实测能出真卡的日文查询（chip.query）。
// 点击用日文词搜（命中率最高）；词库统一在 tcg-keywords，全部 curl 验证过。
const CHIPS = POPULAR_CHIPS;

export function PopularSearches({
  onChip,
  emphasized = false,
}: {
  onChip: (query: string) => void;
  /**
   * 默认弱化为「在售热门卡片」下方的小一排快捷入口；
   * 当热门卡片取数失败回退时，传 true 恢复为显眼样式（更大留白）。
   */
  emphasized?: boolean;
}) {
  const t = useTranslations("tcg.popular");

  return (
    <section className="border-t border-white/[0.06] bg-[#0a0e16]">
      <div className={`mx-auto max-w-6xl px-4 ${emphasized ? "py-10" : "py-5"}`}>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t("label")}
          </span>
          {CHIPS.map((chip) => (
            <button
              key={chip.query}
              onClick={() => onChip(chip.query)}
              className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white ${
                emphasized ? "px-3.5 py-1.5 text-sm" : "px-3 py-1 text-xs"
              }`}
            >
              <SearchIcon className="size-3.5 text-slate-400" />
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
