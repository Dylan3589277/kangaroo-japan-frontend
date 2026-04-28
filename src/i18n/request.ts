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

const MESSAGE_LOCALES = ["zh", "en", "ko", "th", "id", "vi"] as const;
type MessageLocale = (typeof MESSAGE_LOCALES)[number];

function getMessageLocale(locale: string): MessageLocale {
  return MESSAGE_LOCALES.includes(locale as MessageLocale) ? (locale as MessageLocale) : "zh";
}

async function loadNamespace(locale: MessageLocale, namespace: (typeof namespaces)[number]) {
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

  const messageLocale = getMessageLocale(locale);
  const commonMessages = (await import(`./locales/${messageLocale}/common.json`)).default;
  const namespacedMessages = await Promise.all(
    namespaces.map((namespace) => loadNamespace(messageLocale, namespace)),
  );

  return {
    locale,
    messages: Object.assign({}, commonMessages, ...namespacedMessages),
  };
});
