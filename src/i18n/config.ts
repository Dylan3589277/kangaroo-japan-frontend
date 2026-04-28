/**
 * @deprecated 使用 src/i18n/routing.ts 代替
 * 此文件已废弃，所有语言配置统一在 routing.ts 中管理
 * 删除时间：请在确认所有引用已迁移后删除
 */
import { routing } from "./routing";

export const i18n = {
  locales: [...routing.locales],
  defaultLocale: routing.defaultLocale,
  localePrefix: routing.localePrefix,
} as const;

export type Locale = (typeof i18n.locales)[number];
