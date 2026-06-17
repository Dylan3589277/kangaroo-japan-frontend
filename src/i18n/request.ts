import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

const namespaces = [
  "auth",
  "mercari",
  "yahoo",
  "amazon",
  "compare",
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
  "tcg",
  "fees",
  "contact",
  "photo-inspection",
] as const;

const MESSAGE_LOCALES = ["zh", "en", "ko", "th", "id", "vi", "ja"] as const;
type MessageLocale = (typeof MESSAGE_LOCALES)[number];

function getMessageLocale(locale: string): MessageLocale {
  return MESSAGE_LOCALES.includes(locale as MessageLocale) ? (locale as MessageLocale) : "zh";
}

const FALLBACK_LOCALE: MessageLocale = "en";

async function importNamespace(
  locale: MessageLocale,
  namespace: (typeof namespaces)[number],
) {
  // Not every namespace is translated for every locale yet (e.g. the
  // English-first `fees` page). When a locale's file is missing, fall back to
  // the English copy, and finally to an empty object, so the request never
  // crashes on a missing import.
  try {
    return (await import(`./locales/${locale}/${namespace}.json`)).default;
  } catch {
    if (locale !== FALLBACK_LOCALE) {
      try {
        return (await import(`./locales/${FALLBACK_LOCALE}/${namespace}.json`)).default;
      } catch {
        return {};
      }
    }
    return {};
  }
}

async function loadNamespace(locale: MessageLocale, namespace: (typeof namespaces)[number]) {
  const messages = await importNamespace(locale, namespace);

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
