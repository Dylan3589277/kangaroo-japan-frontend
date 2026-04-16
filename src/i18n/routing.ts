import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh", "en", "ja"],
  defaultLocale: "zh",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
