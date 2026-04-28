import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const namespaces = [
  "auth",
  "mercari",
  "yahoo",
  "amazon",
  "bids",
  "deposit",
  "vip",
  "shop",
  "coupons",
  "sign",
  "messages",
  "community",
  "articles",
  "orders",
  "mnp",
  "warehouse",
] as const;

async function loadNamespace(locale: string, namespace: (typeof namespaces)[number]) {
  const messages = (await import(`./locales/${locale}/${namespace}.json`)).default;

  // Some existing files are already namespaced, e.g. auth.json contains
  // { "auth": ..., "address": ... }. Platform files such as amazon.json are
  // flat and must be wrapped so useTranslations("amazon") can resolve them.
  if (messages[namespace]) {
    return messages;
  }

  return { [namespace]: messages };
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  const commonMessages = (await import(`./locales/${locale}/common.json`)).default;
  const namespacedMessages = await Promise.all(
    namespaces.map((namespace) => loadNamespace(locale, namespace)),
  );

  return {
    locale,
    messages: Object.assign({}, commonMessages, ...namespacedMessages),
  };
});
