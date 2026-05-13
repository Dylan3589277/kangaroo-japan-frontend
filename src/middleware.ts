import { geolocation } from "@vercel/functions";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

// Written only by the language switcher. IP detection remains automatic until the user chooses manually.
const LOCALE_COOKIE = "USER_LOCALE";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Mapping of country codes to locale
const COUNTRY_LOCALE_MAP: Record<string, string> = {
  CN: "zh",
  US: "en",
  GB: "en",
  AU: "en",
  CA: "en",
  NZ: "en",
  IE: "en",
  PH: "en",
  SG: "en",
  MY: "en",
  KR: "ko",
  TH: "th",
  ID: "id",
  VN: "vi",
  JP: "ja",
};

// Default locale for unknown countries
const DEFAULT_LOCALE = "en";

function getLocaleFromCountry(country: string | undefined): string {
  if (!country) return DEFAULT_LOCALE;
  return COUNTRY_LOCALE_MAP[country] || DEFAULT_LOCALE;
}

// Create the next-intl middleware for locale detection
const intlMiddleware = createMiddleware(routing);

function getRequestOrigin(request: NextRequest): string {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

const PUBLIC_METADATA_PATHS = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/manifest.json",
  "/site.webmanifest",
  "/browserconfig.xml",
]);

function isPublicMetadataPath(pathname: string): boolean {
  return (
    PUBLIC_METADATA_PATHS.has(pathname) ||
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/twitter-image") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon")
  );
}

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { pathname: cleanedPathname } = request.nextUrl;

  // SEO metadata files must stay at the domain root. Do not redirect
  // /robots.txt or /sitemap.xml into a locale path such as /ja/robots.txt.
  if (isPublicMetadataPath(pathname)) {
    return NextResponse.next();
  }

  // Check if user has manually selected a locale from the language bar.
  const userLocaleCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const userLocale =
    userLocaleCookie &&
    routing.locales.includes(userLocaleCookie as (typeof routing.locales)[number])
      ? userLocaleCookie
      : undefined;

  const pathLocale = routing.locales.find(
    (locale) =>
      cleanedPathname === `/${locale}` ||
      cleanedPathname.startsWith(`/${locale}/`)
  );

  // Explicit locale paths should render as-is. Manual persistence is handled by
  // the Header click handler, so IP auto redirects don't accidentally become a
  // permanent preference after the browser lands on /en, /ja, etc.
  if (pathLocale) {
    if (pathLocale === routing.defaultLocale) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("X-NEXT-INTL-LOCALE", routing.defaultLocale);
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return intlMiddleware(request);
  }

  const requestOrigin = getRequestOrigin(request);

  if (userLocale && userLocale !== routing.defaultLocale) {
    const newUrl = new URL(`/${userLocale}${cleanedPathname}`, requestOrigin);
    const response = NextResponse.redirect(newUrl);
    response.cookies.set(LOCALE_COOKIE, userLocale, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  if (userLocale === routing.defaultLocale) {
    // next-intl rewrites default-locale paths to /zh/... and also returns a
    // canonical redirect back to /products. In Chromium this creates a
    // self-redirect loop after the language switch. Keep the public URL
    // unprefixed, but serve the default-locale route directly.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("X-NEXT-INTL-LOCALE", routing.defaultLocale);
    const response = NextResponse.rewrite(new URL(`/${routing.defaultLocale}${cleanedPathname}`, request.url), {
      request: {
        headers: requestHeaders,
      },
    });
    response.cookies.set(LOCALE_COOKIE, userLocale, {
      maxAge: LOCALE_COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  if (!userLocale) {
    const geo = geolocation(request);
    const detectedLocale = getLocaleFromCountry(geo?.country);

    if (detectedLocale !== routing.defaultLocale) {
      return NextResponse.redirect(new URL(`/${detectedLocale}${cleanedPathname}`, requestOrigin));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … or end with `.svg`, `.png`, etc.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
