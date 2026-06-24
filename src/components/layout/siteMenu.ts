// Shopping-site list for the main nav "站点 / Sites" dropdown.
// `href` present => live site (clickable link). `href` null => not built yet
// (rendered disabled with a "coming soon" hint, never a dead link / 404).

export interface SiteMenuEntry {
  /** stable key, also the i18n key under `siteMenu.*` */
  key: string;
  /** route path when live, or null when the site page is not built yet */
  href: string | null;
}

export const SITE_MENU: SiteMenuEntry[] = [
  { key: "mercari", href: "/mercari" },
  { key: "yahooShopping", href: null },
  { key: "yahooAuction", href: "/yahoo" },
  { key: "rakuten", href: null },
  { key: "rakuma", href: "/rakuma" },
  { key: "yahooFrima", href: "/yahoofrima" },
  { key: "amazon", href: "/amazon" },
  { key: "surugaya", href: "/surugaya" },
  { key: "zozotown", href: null },
];
