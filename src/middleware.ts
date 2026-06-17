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

// 软锁语言（②）：把浏览器 Accept-Language 主语言子标签映射到我们支持的 locale。
// 例：en-US -> en，zh-CN/zh-Hant -> zh，pt-BR -> 无匹配（返回 undefined）。
// 解析 q 权重并按从高到低取第一个能匹配的语言；这样英文浏览器落 /en，中文落 /zh。
function getLocaleFromAcceptLanguage(header: string | null): string | undefined {
  if (!header) return undefined;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const primary = tag.split("-")[0];
    const match = routing.locales.find((locale) => locale === primary);
    if (match) return match;
  }
  return undefined;
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
    // 软锁语言（②）：首访未带语言前缀的路径时，按浏览器语言（Accept-Language）落地。
    // 英文浏览器 -> /en，中文及其它 -> /zh（default）。这是主信号，优先于 IP 地理。
    // 软锁：落地后用户仍可直接访问/分享 /en、/zh 等具体语言路径，不会被强制弹回。
    const acceptLanguageLocale = getLocaleFromAcceptLanguage(
      request.headers.get("accept-language"),
    );

    // 兜底：浏览器语言无法匹配到支持的 locale 时，退回原有 IP 地理推断。
    const detectedLocale = acceptLanguageLocale ?? getLocaleFromCountry(geolocation(request)?.country);

    if (detectedLocale !== routing.defaultLocale) {
      return NextResponse.redirect(new URL(`/${detectedLocale}${cleanedPathname}`, requestOrigin));
    }

    // detectedLocale === default（zh）：交给 next-intl 中间件（localeDetection: true）处理，
    // 保持默认语言路径不带前缀。
  }

  // 硬锁说明（将来可选，本次不做）：当前为软锁——一旦命中 pathLocale 分支即原样渲染，
  // 不对“路径 locale ≠ 浏览器检测 locale”做跨 locale 强制重定向。若要硬锁，可在上方
  // pathLocale 分支内比较浏览器/Cookie 检测出的 locale 与 pathLocale，不一致时发 302
  // 到检测 locale；花哥要软锁，故未加。
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
