"use client";

import { useTranslations } from "next-intl";
import {
  ShieldIcon,
  TranslateIcon,
  CameraIcon,
  PackageIcon,
  BoxesIcon,
  ReceiptIcon,
} from "./icons";

const ITEMS = [
  { key: "sellerRisk", Icon: ShieldIcon },
  { key: "conditionTranslation", Icon: TranslateIcon },
  { key: "photoInspection", Icon: CameraIcon },
  { key: "safePackaging", Icon: PackageIcon },
  { key: "consolidatedShipping", Icon: BoxesIcon },
  { key: "transparentFees", Icon: ReceiptIcon },
] as const;

export function BuyerProtection() {
  const t = useTranslations("tcg.protection");

  return (
    <section className="border-t border-white/[0.06] bg-[#0b1018]">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-slate-400">{t("subtitle")}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <div
              key={item.key}
              className="group flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors duration-200 hover:border-cyan-400/25 hover:bg-white/[0.04]"
            >
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                <item.Icon className="size-5" />
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-white">
                  {t(`items.${item.key}.title`)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {t(`items.${item.key}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
