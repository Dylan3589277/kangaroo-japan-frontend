// Shopping-site list for the main nav "站点 / Sites" dropdown.
// Keep this list to live, clickable platforms only.

export interface SiteMenuEntry {
  /** stable key, also the i18n key under `siteMenu.*` */
  key: string;
  /** route path for a live site */
  href: string;
}

export const SITE_MENU: SiteMenuEntry[] = [
  { key: "mercari", href: "/mercari" },
  { key: "mercariAuction", href: "/mercari-auction" },
  { key: "yahooAuction", href: "/yahoo" },
  { key: "rakuma", href: "/rakuma" },
  { key: "yahooFrima", href: "/yahoofrima" },
  // cardrush 暂摘（2026-08-04 花哥拍板）：上游 cardrush-pokemon.jp 反爬 403，
  // 列表恒空。页面路由保留（直链可达），上游解封或走 M4 无头方案后把这行加回来。
  // { key: "cardrush", href: "/cardrush" },
  { key: "cardmuseum", href: "/cardmuseum" },
  { key: "torecacamp", href: "/torecacamp" },
  { key: "toretoku", href: "/toretoku" },
];
