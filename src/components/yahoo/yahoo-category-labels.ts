/**
 * 雅虎分类名的英文标签。
 *
 * 为什么需要：`/yahoo/categories` 由老后台提供，`name` 是**中文**（"计算机"、"玩具、游戏"）。
 * 中文站直接用没问题，但英文站的分类侧栏会整列漏出中文——线上实测 /en/yahoo 的
 * 侧栏就是「计算机 / 音乐 / 玩具、游戏 / 爱好、文化 / …」。
 *
 * 按 **auccat 分类号**（即 YahooCategory.value，后端 `data` 字段）映射，而不是按中文名：
 * 后端改文案时 auccat 不变，映射不会悄悄失效。（也不能按 `id` —— 那是旧库自增主键，
 * 前端拿到的 YahooCategory 里根本没有它。）
 *
 * 未收录的分类一律回退后端原名——宁可显示中文，也不显示空白。
 */

const EN_LABEL_BY_AUCCAT: Record<string, string> = {
  "23336": "Computers",
  "22152": "Music",
  "25464": "Toys & Games",
  "24242": "Hobbies & Culture",
  "24698": "Sports & Leisure",
  "23000": "Fashion",
  "23140": "Accessories & Watches",
  "22896": "Office & Store Supplies",
};

/** 只有英文站需要换标签；其它语言（含中文）保持后端原名。 */
export function localizeYahooCategoryLabel(
  auccat: string,
  fallbackName: string,
  locale: string,
): string {
  if (locale !== "en") return fallbackName;
  return EN_LABEL_BY_AUCCAT[auccat] ?? fallbackName;
}
