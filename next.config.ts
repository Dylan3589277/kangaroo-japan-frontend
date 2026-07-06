import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const DEFAULT_BACKEND_ORIGIN = "https://kangaroo-japan-backend.vercel.app";
const DEFAULT_BACKEND_API_BASE_URL = `${DEFAULT_BACKEND_ORIGIN}/api/v1`;
const backendOrigin = (
  process.env.KANGAROO_JAPAN_BACKEND_ORIGIN ||
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
  DEFAULT_BACKEND_ORIGIN
).replace(/\/$/, "");
const backendRewriteDestination =
  process.env.KANGAROO_JAPAN_BACKEND_API_URL ||
  (backendOrigin ? `${backendOrigin}/api/v1` : DEFAULT_BACKEND_API_BASE_URL);

const isDev = process.env.NODE_ENV !== "production";

/**
 * 全站安全响应头 + 宽松兼容现有功能的 CSP。
 *
 * 设计原则（铁规：先以"不打挂现有功能"为准）：
 * - script-src 保留 'unsafe-inline' + 'unsafe-eval'（dev）：Next.js App Router
 *   注入大量内联引导脚本、JSON-LD(application/ld+json) 也是内联 <script>，
 *   当前未启用 nonce，去掉 'unsafe-inline' 会直接白屏。故宽松放行。
 * - 显式放行现有第三方：Tawk.to 客服、Vercel Analytics、Cloudflare Turnstile、
 *   Stripe（支付收银台/JS，未来若前端直连也不破）、所有 next.config images 里
 *   已配置的图床（与 remotePatterns 对齐）。
 * - connect-src 含后端源站（直连兜底，正常走 /api/backend 同源代理）、Tawk wss、
 *   Vercel insights、Turnstile、Stripe。
 * - 拿不准的一律往"更宽松"靠，避免误杀；后续可逐步收紧 / 上 report-uri。
 */
const IMG_HOSTS = [
  "https://*.amazon.co.jp",
  "https://m.media-amazon.com",
  "https://*.ssl-images-amazon.com",
  "https://*.mercari.com",
  "https://static.mercdn.net",
  "https://*.mercdn.net",
  "https://assets.mercari-shops-static.com",
  "https://*.rakuten.co.jp",
  "https://*.r10s.jp",
  "https://*.fril.jp",
  "https://*.shopping.yahoo.co.jp",
  "https://*.auctions.yahoo.co.jp",
  "https://*.yimg.jp",
  "https://*.toretoku.jp",
  "https://dsjpic.kangaroo-japan.net",
  "https://placehold.co",
  "https://images.unsplash.com",
  "https://cdn.shopify.com",
  "https://cdn.jsdelivr.net",
  // 第三方运行时图片
  "https://*.tawk.to",
  "https://*.stripe.com",
];

const SCRIPT_HOSTS = [
  "https://embed.tawk.to",
  "https://*.tawk.to",
  "https://va.vercel-scripts.com",
  "https://challenges.cloudflare.com",
  "https://js.stripe.com",
  "https://cdn.jsdelivr.net",
  // 微信 JS-SDK（jweixin）：小程序 webview 内嵌的 H5 在线客服页注入，用于检测
  // wx.miniProgram.navigateTo 并跳转人工客服/订单详情。脚本来自微信官方 CDN。
  "https://res.wx.qq.com",
];

const CONNECT_HOSTS = [
  backendOrigin,
  "https://*.tawk.to",
  "wss://*.tawk.to",
  "https://va.vercel-scripts.com",
  "https://*.vercel-insights.com",
  "https://challenges.cloudflare.com",
  "https://api.stripe.com",
  "https://js.stripe.com",
].filter(Boolean);

const FRAME_HOSTS = [
  "https://challenges.cloudflare.com",
  "https://js.stripe.com",
  "https://hooks.stripe.com",
  "https://checkout.stripe.com",
  "https://*.tawk.to",
];

const cspDirectives = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `form-action 'self'`,
  // 内联 + eval：见上方说明，去掉会白屏。dev 额外需要 eval（React refresh / source map）。
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}${SCRIPT_HOSTS.join(" ")}`,
  `script-src-elem 'self' 'unsafe-inline' ${SCRIPT_HOSTS.join(" ")}`,
  // Tailwind / styled-jsx / antd 等运行时注入内联样式，需 'unsafe-inline'。
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${IMG_HOSTS.join(" ")}`,
  `font-src 'self' data:`,
  `connect-src 'self' ${CONNECT_HOSTS.join(" ")}`,
  `frame-src 'self' ${FRAME_HOSTS.join(" ")}`,
  `worker-src 'self' blob:`,
  `frame-ancestors 'self'`,
  `manifest-src 'self'`,
  `upgrade-insecure-requests`,
]
  .join("; ")
  .trim();

const securityHeaders = [
  // CSP：宽松兼容版（非 report-only，但放行了现有全部第三方与内联，不破坏功能）。
  { key: "Content-Security-Policy", value: cspDirectives },
  {
    key: "Strict-Transport-Security",
    value: "max-age=15552000; includeSubDomains",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // 关掉站点不使用的高敏能力，降低被滥用面。
    value:
      "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    if (!backendRewriteDestination) return [];
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendRewriteDestination.replace(/\/$/, "")}/:path*`,
      },
      {
        source: "/api/legacy/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
  images: {
    // Next 16：images.qualities 默认仅 [75]，未列出的 quality 会被强制就近取整。
    // 首页商品缩略图走低画质（65）压体积省 Vercel 优化用量；保留 75 给其它默认场景。
    qualities: [65, 75],
    // 优化后的图在 Vercel 边缘最少缓存这么久，避免「每次访问都重优化/重拉」。
    // dsjpic 是镜像桶（1.1 亿小文件），拉长 TTL 直接减少回源与优化次数。
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 天
    remotePatterns: [
      { protocol: "https", hostname: "**.amazon.co.jp" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "**.ssl-images-amazon.com" },
      { protocol: "https", hostname: "**.mercari.com" },
      { protocol: "https", hostname: "static.mercdn.net" },
      { protocol: "https", hostname: "**.mercdn.net" },
      { protocol: "https", hostname: "assets.mercari-shops-static.com" },
      { protocol: "https", hostname: "**.rakuten.co.jp" },
      { protocol: "https", hostname: "**.r10s.jp" },
      { protocol: "https", hostname: "**.fril.jp" },
      { protocol: "https", hostname: "**.cardrush-pokemon.jp" },
      { protocol: "https", hostname: "**.shop-pro.jp" },
      { protocol: "https", hostname: "**.toretoku.jp" },
      { protocol: "https", hostname: "**.shopping.yahoo.co.jp" },
      { protocol: "https", hostname: "**.auctions.yahoo.co.jp" },
      { protocol: "https", hostname: "**.yimg.jp" },
      { protocol: "https", hostname: "dsjpic.kangaroo-japan.net" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
    ],
  },
};

export default withNextIntl(nextConfig);
