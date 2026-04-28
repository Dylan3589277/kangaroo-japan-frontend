import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: {
      ...(await import(`./locales/${locale}/common.json`)).default,
      ...(await import(`./locales/${locale}/auth.json`)).default,
      ...(await import(`./locales/${locale}/mercari.json`)).default,
      ...(await import(`./locales/${locale}/yahoo.json`)).default,
      ...(await import(`./locales/${locale}/amazon.json`)).default,
      ...(await import(`./locales/${locale}/bids.json`)).default,
      ...(await import(`./locales/${locale}/deposit.json`)).default,
      ...(await import(`./locales/${locale}/vip.json`)).default,
      ...(await import(`./locales/${locale}/shop.json`)).default,
      ...(await import(`./locales/${locale}/coupons.json`)).default,
      ...(await import(`./locales/${locale}/sign.json`)).default,
      ...(await import(`./locales/${locale}/messages.json`)).default,
      ...(await import(`./locales/${locale}/community.json`)).default,
      ...(await import(`./locales/${locale}/articles.json`)).default,
      ...(await import(`./locales/${locale}/orders.json`)).default,
      ...(await import(`./locales/${locale}/mnp.json`)).default,
      ...(await import(`./locales/${locale}/warehouse.json`)).default,
    },
  };
});
