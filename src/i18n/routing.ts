import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh", "en", "ko", "th", "id", "vi", "ja"],
  defaultLocale: "zh",
  localePrefix: "as-needed",
  // 软锁语言（②）：开启 next-intl 的浏览器语言检测。
  // 用户首次访问未带语言前缀的路径时，next-intl 中间件会按
  // Accept-Language（浏览器语言）落地：英文浏览器 -> /en，中文及其它 -> /zh（default）。
  // 软锁含义：/en、/zh 等具体语言路径仍可直接访问、可分享，不会被强制重定向回去
  // （保 SEO 与分享链接）。具体的“首访按浏览器语言落地”逻辑见 src/middleware.ts。
  //
  // 硬锁（将来可选，本次不做）：若要强制所有访客只能停留在其浏览器语言对应的
  // locale，可在 middleware.ts 里对“路径 locale ≠ 浏览器/Cookie 检测 locale”的请求
  // 发跨 locale 强制重定向（例如英文浏览器访问 /zh 时 302 到 /）。花哥要软锁，故未加。
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
