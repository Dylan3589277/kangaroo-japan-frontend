import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const LOCALE_COOKIE = "USER_LOCALE";
const NEXT_INTL_LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function isSupportedLocale(locale: string): locale is (typeof routing.locales)[number] {
  return routing.locales.includes(locale as (typeof routing.locales)[number]);
}

function sanitizeRedirectPath(path: string | null, fallback: string) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  return path;
}

function getRedirectOrigin(request: NextRequest) {
  const host = request.headers.get("host");
  const hostname = host?.split(":")[0] || request.nextUrl.hostname;

  // In local E2E runs, Next.js can expose nextUrl.origin as localhost even when
  // the browser requested 127.0.0.1. Keep the redirect on the browser's Host so
  // locale cookies are not written to one host and then read from another.
  if (host && (hostname === "localhost" || hostname === "127.0.0.1")) {
    return `${request.nextUrl.protocol}//${host}`;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const redirectHost = forwardedHost || host;

  if (!redirectHost) {
    return request.nextUrl.origin;
  }

  return `${forwardedProto || request.nextUrl.protocol.replace(":", "")}://${redirectHost}`;
}

function stripDefaultLocalePrefix(path: string, locale: string) {
  if (locale !== routing.defaultLocale) {
    return path;
  }

  const defaultLocalePrefix = `/${routing.defaultLocale}`;
  if (path === defaultLocalePrefix) {
    return "/";
  }
  if (path.startsWith(`${defaultLocalePrefix}/`)) {
    return path.slice(defaultLocalePrefix.length) || "/";
  }
  return path;
}

export function GET(request: NextRequest) {
  const localeParam = request.nextUrl.searchParams.get("locale") || routing.defaultLocale;
  const locale = isSupportedLocale(localeParam) ? localeParam : routing.defaultLocale;
  const fallback = locale === routing.defaultLocale ? "/" : `/${locale}`;
  const redirectPath = stripDefaultLocalePrefix(
    sanitizeRedirectPath(request.nextUrl.searchParams.get("next"), fallback),
    locale
  );
  const response = NextResponse.redirect(new URL(redirectPath, getRedirectOrigin(request)));

  response.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
  response.cookies.set(NEXT_INTL_LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
