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
  "tcg-chat",
  "tcg-alerts",
  "fees",
  "contact",
  "photo-inspection",
  "pokemon-cards",
  "yugioh-cards",
  "how-it-works",
  "buyer-protection",
  "faq",
  "about",
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

// Some existing files are already namespaced, e.g. auth.json contains
// { "auth": ..., "address": ... }. Platform files such as amazon.json are
// flat and must be wrapped so useTranslations("amazon") can resolve them.
function wrapNamespace(
  namespace: (typeof namespaces)[number],
  raw: Record<string, unknown>,
): Record<string, unknown> {
  return raw && typeof raw === "object" && raw[namespace] ? raw : { [namespace]: raw };
}

// Deep-merge `override` onto `base` (override wins; keys missing in override keep
// the base value). Used so a partially-translated locale falls back to the English
// copy *per key*, not just per missing file — otherwise a present-but-incomplete
// file (e.g. zh/tcg.json without `header`) renders raw i18n keys.
function deepMerge(base: unknown, override: unknown): unknown {
  if (
    base === null ||
    typeof base !== "object" ||
    Array.isArray(base) ||
    override === null ||
    typeof override !== "object" ||
    Array.isArray(override)
  ) {
    return override === undefined ? base : override;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(override as Record<string, unknown>)) {
    out[key] = deepMerge(
      (base as Record<string, unknown>)[key],
      (override as Record<string, unknown>)[key],
    );
  }
  return out;
}

async function loadNamespace(locale: MessageLocale, namespace: (typeof namespaces)[number]) {
  const localeMessages = wrapNamespace(namespace, await importNamespace(locale, namespace));
  if (locale === FALLBACK_LOCALE) {
    return localeMessages;
  }

  // Overlay the locale's keys on top of the English base so any missing key falls
  // back to English instead of showing the raw key path.
  const baseMessages = wrapNamespace(namespace, await importNamespace(FALLBACK_LOCALE, namespace));
  return deepMerge(baseMessages, localeMessages) as Record<string, unknown>;
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
