/**
 * TCG card-metadata parser (English info-bar).
 *
 * Shared by the Design-A English detail pages (Mercari + Yahoo). Given the raw
 * Japanese listing text (`goods_name` / `title`, `description`, and the
 * `extras` spec rows), it best-effort extracts:
 *   - condition (Japanese grade words / PSA·BGS graded → English + risk)
 *   - set / series number (Pokémon `n/n` or set code, Yu-Gi-Oh `XXX-JP###`)
 *   - rarity (SAR / SR / UR / promo … dictionary)
 *   - year (only when reliably inferable from a set code / explicit 4-digit year)
 *
 * Philosophy: "宁缺毋滥" — when a field cannot be confidently parsed it is left
 * `undefined`, and the UI simply omits that row. No guessing, no empty rows.
 *
 * Pure functions only (no React, no side effects), so the husky lint rules
 * around effects/refs do not apply here.
 */

export type CardConditionRisk = "low" | "medium" | "high" | "graded";

export type CardCondition = {
  /** English condition label, e.g. "Sealed", "Near Mint-ish", "Played / flaws". */
  label: string;
  /** Risk hint used to colour the badge. */
  risk: CardConditionRisk;
  /** Graded slab info when a PSA/BGS/CGC grade is detected. */
  grader?: string;
  grade?: string;
};

export type CardMeta = {
  condition?: CardCondition;
  /** Set / series number or code, e.g. "173/165", "SV2a", "RC04-JP001". */
  setCode?: string;
  /** Rarity token(s), e.g. "SAR", "SR", "Promo". */
  rarity?: string;
  /** 4-digit year, only when reliably inferred. */
  year?: string;
};

type SpecRow = { name?: string; value?: string };

export type CardMetaInput = {
  /** Item name / title (goods_name / title). */
  name?: string | null;
  /** Description / seller body (content / description). */
  description?: string | null;
  /** Spec rows from the detail API (extras). */
  extras?: SpecRow[] | null;
};

function joinText(input: CardMetaInput): string {
  const parts: string[] = [];
  if (input.name) parts.push(input.name);
  if (input.description) parts.push(input.description);
  if (input.extras) {
    for (const row of input.extras) {
      if (row?.name) parts.push(row.name);
      if (row?.value) parts.push(row.value);
    }
  }
  return parts.join("  •  ");
}

/* -------------------------------------------------------------------------- */
/* Condition                                                                  */
/* -------------------------------------------------------------------------- */

// Graded slabs: PSA 10 / BGS 9.5 / CGC 9 / ARS 10. The grade is optional.
// 鑑定 (kantei = "graded/authenticated") on its own implies a graded slab.
const GRADED_RE =
  /\b(PSA|BGS|CGC|ARS|SGC)\s*([0-9]{1,2}(?:\.5)?)\b|(鑑定品|鑑定済|鑑定)/i;

// Ordered most-specific → least-specific. First match wins.
const CONDITION_DICT: Array<{
  re: RegExp;
  label: string;
  risk: CardConditionRisk;
}> = [
  { re: /未開封|新品未開封|シュリンク付/, label: "Sealed", risk: "low" },
  { re: /極美品/, label: "Near Mint (極美品)", risk: "low" },
  { re: /美品/, label: "Near Mint-ish (美品)", risk: "medium" },
  { re: /初期傷/, label: "Played / factory flaws (初期傷)", risk: "high" },
  { re: /傷あり|キズあり|傷有り|ダメージ/, label: "Played / flaws (傷あり)", risk: "high" },
  { re: /プレイ用|プレー用/, label: "Played (プレイ用)", risk: "high" },
];

export function parseCondition(text: string): CardCondition | undefined {
  const graded = GRADED_RE.exec(text);
  if (graded) {
    // graded[1]/[2] = grader+number form; graded[3] = bare 鑑定 form.
    if (graded[1]) {
      const grader = graded[1].toUpperCase();
      const grade = graded[2];
      return {
        label: grade ? `Graded · ${grader} ${grade}` : `Graded · ${grader}`,
        risk: "graded",
        grader,
        grade,
      };
    }
    return { label: "Graded (鑑定)", risk: "graded" };
  }

  for (const entry of CONDITION_DICT) {
    if (entry.re.test(text)) {
      return { label: entry.label, risk: entry.risk };
    }
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Set / Series                                                               */
/* -------------------------------------------------------------------------- */

// Yu-Gi-Oh card numbers: 2-4 alnum prefix + -JP + 3 digits (e.g. RC04-JP001).
const YUGIOH_RE = /\b([A-Z0-9]{2,4}-JP[0-9]{3})\b/i;

// Pokémon collector number n/n, e.g. 173/165, 25/25. Avoid matching dates.
const POKEMON_NUM_RE = /\b([0-9]{1,3}\/[0-9]{1,3})\b/;

// Pokémon SV-era set codes: SV1S, SV2a, SV2D, SVHK, etc. Also older sX/sM(a).
const POKEMON_SET_CODE_RE = /\b(SV[0-9]{1,2}[A-Za-z]?|S[0-9]{1,2}[A-Za-z]?)\b/;

export function parseSetCode(text: string): string | undefined {
  const yugioh = YUGIOH_RE.exec(text);
  if (yugioh) return yugioh[1].toUpperCase();

  const pokeNum = POKEMON_NUM_RE.exec(text);
  if (pokeNum) return pokeNum[1];

  const setCode = POKEMON_SET_CODE_RE.exec(text);
  // Guard: "S1".."S9" are too generic on their own; only accept SV* codes or
  // 2-digit S-series codes with a trailing letter (e.g. "s12a").
  if (setCode) {
    const code = setCode[1];
    if (/^SV/i.test(code)) return code.toUpperCase();
    if (/^S[0-9]{1,2}[A-Za-z]$/i.test(code)) return code.toLowerCase();
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Rarity                                                                      */
/* -------------------------------------------------------------------------- */

// Word-form rarities (Japanese). Checked before code tokens.
const RARITY_WORD_DICT: Array<{ re: RegExp; label: string }> = [
  { re: /25th\s*シークレット|25thシークレット/i, label: "25th Secret" },
  { re: /レリーフ/, label: "Relief (UR)" },
  { re: /プロモ|PROMO/i, label: "Promo" },
  { re: /シークレット/, label: "Secret" },
  { re: /パラレル/, label: "Parallel" },
];

// Code-form rarities (order = priority for longest match first).
const RARITY_CODE_TOKENS = [
  "SAR",
  "SSR",
  "CHR",
  "CSR",
  "HR",
  "UR",
  "SR",
  "AR",
  "RR",
  "RRR",
];

export function parseRarity(text: string): string | undefined {
  for (const entry of RARITY_WORD_DICT) {
    if (entry.re.test(text)) return entry.label;
  }
  const upper = text.toUpperCase();
  for (const token of RARITY_CODE_TOKENS) {
    // Bounded match so we don't catch "AR" inside "ARMOR" etc.
    const re = new RegExp(`(^|[^A-Z])${token}([^A-Z]|$)`);
    if (re.test(upper)) return token;
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Year                                                                        */
/* -------------------------------------------------------------------------- */

// Only accept a plausible TCG-era year (2000-2029) appearing as a standalone
// 4-digit token, or "YYYY年". Never infer from anything fuzzier.
const YEAR_RE = /\b(20[0-2][0-9])\s*年|\b(20[0-2][0-9])\b/;

export function parseYear(text: string): string | undefined {
  const match = YEAR_RE.exec(text);
  if (!match) return undefined;
  return match[1] ?? match[2];
}

/* -------------------------------------------------------------------------- */
/* Public                                                                      */
/* -------------------------------------------------------------------------- */

export function parseCardMeta(input: CardMetaInput): CardMeta {
  const text = joinText(input);
  if (!text.trim()) return {};
  return {
    condition: parseCondition(text),
    setCode: parseSetCode(text),
    rarity: parseRarity(text),
    year: parseYear(text),
  };
}

/** True when at least one field was parsed (decides whether to render the bar). */
export function hasCardMeta(meta: CardMeta): boolean {
  return Boolean(meta.condition || meta.setCode || meta.rarity || meta.year);
}

/**
 * PriceCharting search URL for the "price trend" external link.
 * Uses the listing name as the query; returns undefined when there is no name.
 */
export function priceChartingSearchUrl(name?: string | null): string | undefined {
  const q = (name ?? "").trim();
  if (!q) return undefined;
  return `https://www.pricecharting.com/search-products?q=${encodeURIComponent(
    q,
  )}&type=prices`;
}
