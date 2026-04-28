import { geolocation } from "@vercel/functions";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

// Cookie name for user's language preference (to prevent IP detection from overriding manual selection)
const LOCALE_COOKIE = "USER_LOCALE";

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

  // Check if user has already selected a locale (cookie set)
  const userLocale = request.cookies.get(LOCALE_COOKIE)?.value;

  if (!userLocale) {
    // No user preference yet → detect from IP
    const geo = geolocation(request);
    const country = geo?.country;
    const detectedLocale = getLocaleFromCountry(country);

    // Only redirect if the path doesn't already have a locale prefix
    const pathLocale = routing.locales.find(
      (locale) =>
        cleanedPathname === `/${locale}` ||
        cleanedPathname.startsWith(`/${locale}/`)
    );

    if (!pathLocale && detectedLocale !== routing.defaultLocale) {
      // No locale in path and detected locale differs from default
      const newUrl = new URL(`/${detectedLocale}${cleanedPathname}`, request.url);
      const response = NextResponse.redirect(newUrl);
      response.cookies.set(LOCALE_COOKIE, detectedLocale, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: "/",
      });
      return response;
    }

    // Set cookie for future visits
    const detectedForCookie = pathLocale || detectedLocale;
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, detectedForCookie, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  }

  // User has a locale preference → use next-intl middleware as normal
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
