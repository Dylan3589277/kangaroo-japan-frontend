import { unstable_cache } from "next/cache";
import { randomUUID } from "node:crypto";

/**
 * 日→中翻译（OpenCode Go / DeepSeek），服务端专用。
 *
 * 用途：zh 站商品列表（Mercari/Rakuma/Yahoofrima/Torecacamp/Toretoku/Cardmuseum/Cardrush
 * 等煤炉类实时列表）标题是日文原名，中国买家读不懂、也搜不到。这里批量把标题译成中文，
 * 用于列表卡片副标题；**日文原名始终保留**（买家跟原平台页核对、也是型号/评级代码的
 * 权威来源）。与 `translate.ts`（en/Azure，ja→en）是并列的独立管线，互不影响。
 *
 * 与 main 已有「详情页翻译」链路（后端老网关 titleTranslated）的关系：那条链只覆盖详情页
 * 与少数已接后端富字段的列表（如 yahoo-search-page），本管线只负责补上没有 titleTranslated
 * 的列表卡片，接线处永远后端译名优先、本管线兜底。
 *
 * 外部调用三件套（见 ~/.claude/rules/external-call-resilience.md）：
 * - **超时**：30s AbortSignal（批量请求 + 合批窗口，比 en/Azure 的单标题 3s 更长）。
 *   deepseek-v4-flash 是思考模型，不关思考的话 20 条真实标题一批会把 max_tokens
 *   全烧在 reasoning_content 上、content 空、finish_reason=length、耗时 25-30s
 *   撞超时（2026-09-13 ECS 实测）；请求体加 `reasoning_effort: "none"` 后 6.2s
 *   就能拿到干净 JSON（`thinking:{type:"disabled"}` 实测无效）。
 * - **缓存**：unstable_cache 30 天，key=原文单条标题——批量请求节省的是并发次数，
 *   缓存粒度仍按标题拆分，命中率不受批量大小影响。
 * - **熔断/降级**：无 key / 超时 / 非 2xx / 结构不符 / 并发超限 一律返回 null，
 *   调用方回退到日文原名；绝不 throw 到调用方。
 *
 * 批量合并（省 DeepSeek 调用次数）：
 * 用短定时器（BATCH_WINDOW_MS）把一段时间内到达的 cache-miss 请求合并成一批。
 * 之所以不用微任务（queueMicrotask）：cachedTranslateOne 先经过 unstable_cache
 * 的异步缓存查找才调用 enqueueForBatch，同一请求里不同标题的缓存查找落在不同的
 * microtask tick 上，微任务合批会把一次 40 条的请求拆成 40 个单条批次，
 * 全部撞上 MAX_CONCURRENCY 被降级（生产实测：一次页面请求只译出 1-2 条）。
 * 定时器窗口能跨多个 tick 收集，才能把同一请求的标题真正合成一批；
 * 每批最多 MAX_BATCH_SIZE 条；全局同时在飞的批次请求数不超过 MAX_CONCURRENCY，
 * 超出的批次**立即降级返回 null**，不排队等待（避免一次流量尖峰拖垮响应时间）。
 */

const DEFAULT_ENDPOINT = "https://opencode.ai/zen/go/v1/chat/completions";
const DEFAULT_MODEL = "deepseek-v4-flash";
const TIMEOUT_MS = 30_000;
const MAX_TOKENS = 1500;
/** 单条标题超过这个长度多半是脏数据，不值得送去翻译（API 路由层已按 300 校验，这里是第二道防线）。 */
const MAX_INPUT_LENGTH = 500;
/** 定时器批量合并：单批最多带这么多条标题。 */
const MAX_BATCH_SIZE = 20;
/** 合批等待窗口（ms）：收集这段时间内到达的 cache-miss 请求再统一发送，
 *  盖过 unstable_cache 异步查找造成的 tick 抖动。 */
const BATCH_WINDOW_MS = 30;
/** 全局同时在飞的批次数上限；超出立即降级，不排队。一页列表 120 条 = 6 批（MAX_BATCH_SIZE=20），
 *  设为 6 才能一页全放行，不然超出的批次会被降级丢 null（2026-09-13 调整，原为 2）。 */
const MAX_CONCURRENCY = 6;

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

function warn(reason: string) {
  console.warn(`[translate:ja2zh] ${reason}`);
}

function getEndpoint() {
  return process.env.OPENCODE_GO_BASE_URL || DEFAULT_ENDPOINT;
}

function getModel() {
  return process.env.OPENCODE_GO_MODEL || DEFAULT_MODEL;
}

/** 从模型输出里剥掉可能出现的 markdown 代码块围栏，容错常见输出习惯。 */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

/** 一批标题的真实 DeepSeek 调用，返回与 texts 等长、对齐的译文数组（失败位为 null）。 */
async function callOpenCodeGoBatch(
  texts: string[],
): Promise<(string | null)[]> {
  const key = process.env.OPENCODE_GO_API_KEY;
  if (!key) {
    // 本地/预发默认没配 key，属预期情况；线上出现这条就是 env 掉了，必须看得见。
    warn("missing env OPENCODE_GO_API_KEY");
    return texts.map(() => null);
  }

  try {
    const res = await fetch(getEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "x-opencode-session": `translate-zh-${randomUUID()}`,
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: MAX_TOKENS,
        reasoning_effort: "none",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(texts) },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      warn(`HTTP ${res.status} ${res.statusText} :: ${body.slice(0, 200)}`);
      return texts.map(() => null);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json?.choices?.[0]?.message?.content;
    if (!content) {
      warn(`empty content in response :: ${JSON.stringify(json).slice(0, 200)}`);
      return texts.map(() => null);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(content));
    } catch {
      warn(`content not valid JSON :: ${content.slice(0, 200)}`);
      return texts.map(() => null);
    }

    if (!Array.isArray(parsed) || parsed.length !== texts.length) {
      warn(
        `translation array length mismatch (expected ${texts.length}, got ${
          Array.isArray(parsed) ? parsed.length : typeof parsed
        })`,
      );
      return texts.map(() => null);
    }

    return parsed.map((value, i) => {
      const translated = typeof value === "string" ? value.trim() : "";
      if (!translated || translated === texts[i].trim()) return null;
      return translated;
    });
  } catch (e) {
    warn(
      `request failed :: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
    );
    return texts.map(() => null);
  }
}

interface PendingResolver {
  resolve: (value: string | null) => void;
}

let pendingBatch = new Map<string, PendingResolver[]>();
let batchScheduled = false;
let activeConcurrency = 0;

function scheduleFlush() {
  if (batchScheduled) return;
  batchScheduled = true;
  setTimeout(flushPendingBatch, BATCH_WINDOW_MS);
}

function flushPendingBatch() {
  batchScheduled = false;
  const entries = Array.from(pendingBatch.entries());
  pendingBatch = new Map();

  for (let i = 0; i < entries.length; i += MAX_BATCH_SIZE) {
    const chunk = entries.slice(i, i + MAX_BATCH_SIZE);
    if (activeConcurrency >= MAX_CONCURRENCY) {
      // 并发已顶格：立即降级，不排队等待（宁可少几条译文，不拖慢响应）。
      warn(`concurrency limit reached, degrading ${chunk.length} title(s)`);
      for (const [, resolvers] of chunk) {
        for (const r of resolvers) r.resolve(null);
      }
      continue;
    }
    activeConcurrency++;
    runChunk(chunk).finally(() => {
      activeConcurrency--;
    });
  }
}

async function runChunk(chunk: [string, PendingResolver[]][]) {
  const texts = chunk.map(([text]) => text);
  const results = await callOpenCodeGoBatch(texts);
  chunk.forEach(([, resolvers], i) => {
    const translated = results[i] ?? null;
    for (const r of resolvers) r.resolve(translated);
  });
}

/** 把一条标题挂进当前批次；BATCH_WINDOW_MS 窗口内到达的其他标题会被一起打包发送。 */
function enqueueForBatch(text: string): Promise<string | null> {
  return new Promise((resolve) => {
    const resolvers = pendingBatch.get(text) ?? [];
    resolvers.push({ resolve });
    pendingBatch.set(text, resolvers);
    scheduleFlush();
  });
}

/**
 * 只缓存**成功**的译名（抛错则不进缓存，下次自然重试）。
 * 理由同 translate.ts：unstable_cache 会把返回值原样缓存，若把 null 也缓存住，
 * 一次偶发失败（限流、超时抖动）就会被钉住 30 天。
 */
const cachedTranslateOne = unstable_cache(
  async (text: string): Promise<string> => {
    const translated = await enqueueForBatch(text);
    if (!translated) throw new Error("translate-unavailable");
    return translated;
  },
  ["zh-title-ja2zh"],
  { revalidate: 60 * 60 * 24 * 30 },
);

async function translateOneJaToZh(text: string): Promise<string | null> {
  const src = text?.trim();
  if (!src || src.length > MAX_INPUT_LENGTH) return null;
  try {
    return await cachedTranslateOne(src);
  } catch {
    // 具体原因已由 callOpenCodeGoBatch 打进服务端日志，这里只做静默降级。
    return null;
  }
}

/**
 * 批量翻译商品标题（ja→zh）。返回数组与入参 titles 等长、逐位对应；
 * 任何一条失败/超限/未配置都是 null，调用方回退显示该条日文原名。
 * 内部按标题拆分缓存 + 定时器合批，调用方不需要自己去重或分块
 * （但 hook 层仍会做去重，避免同一标题重复占用批次名额）。
 */
export async function translateTitlesJaToZh(
  titles: string[],
): Promise<(string | null)[]> {
  return Promise.all(titles.map((title) => translateOneJaToZh(title)));
}
