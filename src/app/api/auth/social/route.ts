import { NextRequest, NextResponse } from "next/server";

const PROVIDER_URL_ENV = {
  wechat: "WECHAT_OAUTH_URL",
  alipay: "ALIPAY_OAUTH_URL",
  google: "GOOGLE_OAUTH_URL",
} as const;

type Provider = keyof typeof PROVIDER_URL_ENV;

function isProvider(provider: string | null): provider is Provider {
  return provider === "wechat" || provider === "alipay" || provider === "google";
}

export function GET(request: NextRequest) {
  const providerParam = request.nextUrl.searchParams.get("provider");
  const lang = request.nextUrl.searchParams.get("lang") || "zh";
  const safeLang = ["zh", "en", "ko", "th", "id", "vi", "ja"].includes(lang) ? lang : "zh";
  const fallback = new URL(`/${safeLang}/login`, request.url);

  if (!isProvider(providerParam)) {
    fallback.searchParams.set("error", "unsupported_provider");
    return NextResponse.redirect(fallback);
  }

  const configuredUrl = process.env[PROVIDER_URL_ENV[providerParam]];
  if (!configuredUrl) {
    fallback.searchParams.set("error", `${providerParam}_not_configured`);
    return NextResponse.redirect(fallback);
  }

  const target = new URL(configuredUrl);
  target.searchParams.set("redirect_uri", `${request.nextUrl.origin}/${safeLang}/login/callback/${providerParam}`);
  target.searchParams.set("state", safeLang);
  return NextResponse.redirect(target);
}
