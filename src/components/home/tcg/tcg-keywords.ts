/**
 * 设计 A 英文 TCG 首页/搜索页共用的「热门 IP 热门卡」词库。
 *
 * 为什么不用泛词：泛词「ポケモン」/「pokemon」会把钥匙扣/扭蛋/玩具杂物混进来
 *（如「ポケモン カプセルトイ キーホルダー」），不像 TCG 站。这里全部用
 * 实测能出「真卡」的精准词，每个词都 curl 过真实在售端
 * GET /api/v1/integrations/mercari/list?keyword=<enc>&page=1（经 /api/backend），
 * 返回 data.goodsList 量与样例名记录在注释里（2026-06-17 验证）。
 *
 * 维护规则（再加词必照做）：
 * - 新词必须 curl 真实端验证「返回 > 0 且名字是卡」才能进；返 0 或出周边的丢弃。
 * - 已知坑：「ポケモン」「pokemon」「ポケカ」出玩具；
 *   「ポケカ」「リザードンex」「クリムゾンヘイズ」「遊戯王 クォーターセンチュリー」返 0——别用。
 */

export interface TcgKeyword {
  /** 旧系统按日文搜命中率最高，查询一律用日文词。 */
  query: string;
  /** 英文展示名（设计 A 英文站用）。 */
  label: string;
  /** 验证时返回的在售数量（仅注释/排错用，不参与逻辑）。 */
  verifiedCount: number;
}

/**
 * 宝可梦热门卡（6 个，全部 2026-06-17 实测出真卡）。
 * - ポケモンカード 151        → 114（PSA10ミュウex SAR / 151 ピカチュウ モンスターボールミラー…）
 * - リザードン                → 120（リザードン ex テラスタル SSR / リザードンex SAR 黒炎の支配者…）
 * - ピカチュウ プロモ         → 118（ピカチュウ：YU NAGABA×ポケカ PROMO / PSA10 サマーゲット…）
 * - シャイニートレジャー      → 118（ミュウex SSR / サーナイトex SSR ハイクラスパック…）
 * - ナンジャモ SAR           → 110（ナンジャモのハラバリーex SAR 極美品…）
 * - イーブイヒーローズ        → 114（エーフィVMAX SP4 / ブースターVMAX SP4 / PSA10 エーフィVMAX SA…）
 */
export const POKEMON_KEYWORDS: readonly TcgKeyword[] = [
  { query: "ポケモンカード 151", label: "Pokémon 151", verifiedCount: 114 },
  { query: "リザードン", label: "Charizard", verifiedCount: 120 },
  { query: "ピカチュウ プロモ", label: "Pikachu Promo", verifiedCount: 118 },
  { query: "シャイニートレジャー", label: "Shiny Treasure", verifiedCount: 118 },
  { query: "ナンジャモ SAR", label: "Iono SAR", verifiedCount: 110 },
  { query: "イーブイヒーローズ", label: "Eevee Heroes", verifiedCount: 114 },
] as const;

/**
 * 游戏王热门卡（5 个，全部 2026-06-17 实测出真卡）。
 * - 遊戯王 25th       → 120（サイレント・マジシャン 25thクオシク / 閃刀姫ハヤテ 25thシク…）
 * - 青眼の白龍        → 117（青眼の白龍 20AP-JP000 / QCCP-JP001 ブルーアイズ / 新レリーフ…）
 * - ブラックマジシャン → 119（ブラック・マジシャン LB-05 / 25thシークレット 原作絵…）
 * - 真紅眼の黒竜      → 117（真紅眼の黒竜 初期 ウルトラレア / PG-09 レッドアイズ…）
 * - 灰流うらら        → 117（灰流うらら アルティメット RC02-JP009 / プリズマティックシク…）
 */
export const YUGIOH_KEYWORDS: readonly TcgKeyword[] = [
  { query: "遊戯王 25th", label: "Yu-Gi-Oh 25th", verifiedCount: 120 },
  { query: "青眼の白龍", label: "Blue-Eyes White Dragon", verifiedCount: 117 },
  { query: "ブラックマジシャン", label: "Dark Magician", verifiedCount: 119 },
  { query: "真紅眼の黒竜", label: "Red-Eyes Black Dragon", verifiedCount: 117 },
  { query: "灰流うらら", label: "Ash Blossom", verifiedCount: 117 },
] as const;

/** 全部热门词（首页热门卡聚合用的候选池）。 */
export const ALL_TCG_KEYWORDS: readonly TcgKeyword[] = [
  ...POKEMON_KEYWORDS,
  ...YUGIOH_KEYWORDS,
] as const;

/**
 * 首页/搜索页快捷词芯片（英文标签 → 日文查询）。
 * 取宝可梦 3 个 + 游戏王 2 个，覆盖两大 IP 的标志性卡。
 */
export const POPULAR_CHIPS: readonly TcgKeyword[] = [
  POKEMON_KEYWORDS[0], // Pokémon 151
  POKEMON_KEYWORDS[1], // Charizard
  POKEMON_KEYWORDS[5], // Eevee Heroes
  YUGIOH_KEYWORDS[0], // Yu-Gi-Oh 25th
  YUGIOH_KEYWORDS[1], // Blue-Eyes White Dragon
] as const;

/**
 * 非卡周边词黑名单：商品名命中任一即视为玩具/杂物剔除。
 * 只剔「明显不是卡」的周边（钥匙扣/玩偶/手办/扭蛋/贴纸/磁贴/亚克力…），
 * 不碰卡本身的稀有度/系列词，避免误杀真卡。
 */
export const NON_CARD_NAME_PATTERNS: readonly string[] = [
  "キーホルダー", // 钥匙扣
  "ぬいぐるみ", // 毛绒玩偶
  "フィギュア", // 手办
  "カプセルトイ", // 扭蛋
  "ガチャ", // 扭蛋机
  "シール", // 贴纸
  "ステッカー", // 贴纸（外来语）
  "マグネット", // 磁贴
  "アクリル", // 亚克力（スタンド/キーホルダー 等周边）
  "ぬい", // 玩偶简称
  "クッション", // 抱枕
  "タオル", // 毛巾
  "マスコット", // 吉祥物挂件
] as const;

/** 商品名是否命中非卡周边词（命中即剔）。 */
export function isNonCardName(name: string | undefined): boolean {
  if (!name) return false;
  return NON_CARD_NAME_PATTERNS.some((kw) => name.includes(kw));
}
