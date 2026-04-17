import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

// Combine all locales for the middleware
const locales = routing.locales;
const defaultLocale = routing.defaultLocale;

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Check if pathname already has a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  
  // If pathname already has locale, use standard next-intl middleware
  if (pathnameHasLocale) {
    return createMiddleware({
      locales,
      defaultLocale,
      localePrefix: "as-needed",
    })(request);
  }
  
  // For root path without locale, apply geo-based detection
  if (pathname === "/" || pathname === "") {
    const country = request.headers.get("x-vercel-ip-country") || "CN";
    // China (CN) → zh, Others → en
    const detectedLocale = country === "CN" ? "zh" : "en";
    
    const url = new URL(request.url);
    url.pathname = `/${detectedLocale}`;
    
    return NextResponse.redirect(url);
  }
  
  // For other paths without locale, redirect to default locale
  const url = new URL(request.url);
  url.pathname = `/${defaultLocale}${pathname}`;
  
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … or end with `.svg`, `.png`, etc.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
