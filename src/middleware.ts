import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Only handle root path "/" without locale
  if (pathname === "/") {
    const country = request.headers.get("x-vercel-ip-country") || "CN";
    
    // China (CN) → zh, Others → en
    const detectedLocale = country === "CN" ? "zh" : "en";
    
    const url = new URL(request.url);
    url.pathname = `/${detectedLocale}`;
    
    return NextResponse.redirect(url);
  }
  
  // For all other paths, use next-intl middleware
  return createMiddleware(routing)(request);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … or end with `.svg`, `.png`, etc.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
