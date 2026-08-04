#!/usr/bin/env node
/**
 * 独立冒烟脚本：直连 OpenCode Go / DeepSeek，验证 zh 标题日译中管线的 key/端点/模型
 * 是否配置正确、术语规则是否生效。不依赖 Next 运行时（`src/lib/server/translate-zh.ts`
 * 里的 unstable_cache/微任务合批需要 Next 请求上下文，独立脚本跑不了），因此这里直接
 * 复刻同一份请求形状做一次性连通性验证——生产路径仍然是 translate-zh.ts。
 *
 * 用法：node scripts/test-translate-zh.mjs
 * 自动读取仓库根目录的 .env.local（不覆盖已存在的 process.env）。
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const ENDPOINT =
  process.env.OPENCODE_GO_BASE_URL ||
  "https://opencode.ai/zen/go/v1/chat/completions";
const MODEL = process.env.OPENCODE_GO_MODEL || "deepseek-v4-flash";
const KEY = process.env.OPENCODE_GO_API_KEY;

// 与 translate-zh.ts 的 SYSTEM_PROMPT 保持一致的术语规则（独立脚本不引入 TS 运行时，
// 这里手抄一份仅用于冒烟；生产逻辑以 translate-zh.ts 为准）。
const SYSTEM_PROMPT = `你是日语到中文的商品标题翻译器，服务于日本代购电商列表页。
规则：
- ポケモンカード → 宝可梦卡
- 型号/评级代码保持原样不译，不要翻译、不要加空格拆开：SAR、SR、AR、HR、RR、PSA、BGS、ex、VSTAR、VMAX 等
- 未開封 → 未拆封
- 美品 → 品相良好
- 一番くじ → 一番赏
- フィギュア → 手办
- ぬいぐるみ → 毛绒公仔
- 其余按商品标题的自然中文习惯翻译，简洁、不要加解释、不要加引号
输入是一个 JSON 字符串数组（日文商品标题，按顺序）。
输出**只能**是一个等长的 JSON 字符串数组（对应中文译文，同一顺序），不要输出任何其他文字、不要用 markdown 代码块包裹。`;

// 样例覆盖：术语替换（ポケモンカード/未開封/美品）+ 型号评级代码保持原样（SAR/PSA10）。
const SAMPLE_TITLES = [
  "ポケモンカード SAR リザードン 未開封",
  "遊戯王 青眼の白龍 PSA10 美品",
  "ワンピース フィギュア 一番くじ",
];

function stripCodeFence(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

async function main() {
  if (!KEY) {
    console.error(
      "[test-translate-zh] 未配置 OPENCODE_GO_API_KEY（.env.local 或环境变量）。\n" +
        "  这是预期中的本地默认状态——花哥稍后配 key。配好后重跑本脚本即可验证连通性。",
    );
    process.exit(1);
  }

  console.log(`[test-translate-zh] endpoint=${ENDPOINT}`);
  console.log(`[test-translate-zh] model=${MODEL}`);
  console.log(`[test-translate-zh] titles=${JSON.stringify(SAMPLE_TITLES, null, 2)}`);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(SAMPLE_TITLES) },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(
      `[test-translate-zh] HTTP ${res.status} ${res.statusText}\n${body.slice(0, 500)}`,
    );
    process.exit(1);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    console.error(
      `[test-translate-zh] 响应没有 choices[0].message.content :: ${JSON.stringify(json).slice(0, 500)}`,
    );
    process.exit(1);
  }

  let translations;
  try {
    translations = JSON.parse(stripCodeFence(content));
  } catch {
    console.error(`[test-translate-zh] content 不是合法 JSON :: ${content}`);
    process.exit(1);
  }

  if (!Array.isArray(translations) || translations.length !== SAMPLE_TITLES.length) {
    console.error(
      `[test-translate-zh] 译文数组长度不匹配，期望 ${SAMPLE_TITLES.length} 条，实际 ${
        Array.isArray(translations) ? translations.length : typeof translations
      }`,
    );
    process.exit(1);
  }

  console.log("\n[test-translate-zh] 翻译结果：");
  SAMPLE_TITLES.forEach((title, i) => {
    console.log(`  ${title}\n  -> ${translations[i]}\n`);
  });

  if (json.usage) {
    console.log(`[test-translate-zh] usage: ${JSON.stringify(json.usage)}`);
  }

  console.log("[test-translate-zh] 完成。");
}

main().catch((e) => {
  console.error(
    `[test-translate-zh] 请求失败 :: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
  );
  process.exit(1);
});
