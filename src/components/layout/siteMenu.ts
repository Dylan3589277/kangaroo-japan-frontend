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
  { key: "yahooAuction", href: "/yahoo" },
  { key: "rakuma", href: "/rakuma" },
  { key: "yahooFrima", href: "/yahoofrima" },
  { key: "cardrush", href: "/cardrush" },
  { key: "cardmuseum", href: "/cardmuseum" },
  { key: "torecacamp", href: "/torecacamp" },
  { key: "toretoku", href: "/toretoku" },
];
