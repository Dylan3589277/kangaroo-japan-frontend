/** @type {import('next-i18next').UserConfig} */
const nextI18nextConfig = {
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en', 'ja'],
    localePrefix: 'as-needed',
  },
  ns: ['common'],
  defaultNS: 'common',
  fallbackLng: 'zh',
  debug: process.env.NODE_ENV === 'development',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
};

module.exports = nextI18nextConfig;
