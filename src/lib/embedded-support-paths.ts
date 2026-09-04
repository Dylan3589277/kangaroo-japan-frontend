/**
 * 内嵌客服/留言页路径前缀（袋鼠君小程序 webview 内嵌）。
 *
 * 这些页面本身就是完整的独立 UI（小程序内嵌 webview），不应叠加站点外壳
 * （SiteHeader 导航 / 全站客服浮窗 TcgChatWidget）。usePathname（next-intl）
 * 返回去掉语言前缀后的路径，因此前缀判断与语言无关，zh/en 一致。
 *
 * 仅精确匹配这些路径段本身及其子路径，不影响 /support 下的其它公开页面。
 * /support/auction 为客服H5雅虎竞拍详情/我的竞拍页（2026-09-04）。
 */
export const EMBEDDED_SUPPORT_PREFIXES = ["/support/h5", "/support/messages", "/support/auction"] as const;

export function isEmbeddedSupportPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return EMBEDDED_SUPPORT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
