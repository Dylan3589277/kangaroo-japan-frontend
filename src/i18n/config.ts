export const i18n = {
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  localePrefix: 'as-needed' as const,
} as const;

export type Locale = (typeof i18n.locales)[number];
