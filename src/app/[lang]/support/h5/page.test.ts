// page.tsx 的 3 个改动点验证。
//
// 说明（透明披露，非静默凑数）：本仓没有 vitest/jest/@testing-library/jsdom，
// package.json 也没有 "test" 脚本，CI（.github/workflows/ci.yml）只跑
// `npm run build` 不跑测试；能跑的测试机制只有 `node --experimental-strip-types
// --test`，且它只能 strip 纯 .ts 的类型标注，不能解析 .tsx 的 JSX 语法
// （import page.tsx 会直接抛 ERR_UNKNOWN_FILE_EXTENSION，已实测）。
// 所以这里不走「import 组件再渲染断言」的路子，改用两种退而求其次但仍然
// 可信的手段：
//   ① 对 resolveLeaveMsgPlatform：从源码里摘出这段函数体、剥掉 TS 类型标注后
//      用 Function 构造器还原成可执行的纯函数，真正跑其行为（不是只 grep 文本）。
//   ② 对「已售」卡结构 / CTA 默认文案：源码文本的结构化断言（按 data-testid
//      锚点切出对应 JSX 片段再检查包含/不包含哪些按钮），能覆盖需求但不等于
//      真实渲染测试，测不出 JSX 语法本身是否能编译成正确 DOM——这一层已由
//      `npx tsc --noEmit` + `npx eslint` 覆盖。
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SOURCE_PATH = path.join(import.meta.dirname, "page.tsx");
const source = fs.readFileSync(SOURCE_PATH, "utf8");

function sliceBetween(text: string, startMarker: string, endMarker: string) {
  const start = text.indexOf(startMarker);
  assert.notEqual(start, -1, `找不到起始标记: ${startMarker}`);
  const end = text.indexOf(endMarker, start);
  assert.notEqual(end, -1, `找不到结束标记: ${endMarker}`);
  return text.slice(start, end);
}

// ---- 改动 2：已售（purchasable === false）卡片结构 ----
test("已售态卡片：渲染已售出徽章 + 看看类似商品按钮，且不出加购/支付/留言按钮", () => {
  const soldBlock = sliceBetween(
    source,
    'data-testid="support-quote-unpurchasable"',
    'data-testid="support-quote-cta"',
  );

  assert.match(soldBlock, /已售出/);
  assert.match(soldBlock, /unpurchasable_reason \|\| "该商品已售出或无法购买"/);
  assert.match(soldBlock, /data-testid="support-quote-btn-consult"/);
  assert.match(soldBlock, /data-testid="support-quote-btn-similar"/);
  assert.match(soldBlock, /navigateToMiniProgramSearch\(similarKeyword\)/);

  // 会失败的操作一律不出现在已售态卡片区块内
  for (const forbidden of [
    "support-quote-btn-cart",
    "support-quote-btn-buy",
    "support-quote-btn-leavemsg",
    "support-quote-sokketsu-btn-buy",
    "support-quote-btn-recharge",
    "support-quote-btn-register",
  ]) {
    assert.doesNotMatch(
      soldBlock,
      new RegExp(forbidden),
      `已售态区块不应包含 ${forbidden}`,
    );
  }
});

// ---- 改动 1：默认 CTA 文案不再提「回复」 ----
test("默认 CTA 文案改为按钮引导，不再要求回复确认字样", () => {
  const ctaBlock = sliceBetween(
    source,
    'data-testid="support-quote-cta"',
    "riskBlocksBuy ? (",
  );

  assert.match(ctaBlock, /请根据需求点击下方按钮。/);
  assert.doesNotMatch(ctaBlock, /回复/);
});

test("Sokketsu 即決卡默认文案统一为按钮引导+先到先得，且保留 action_text 优先级", () => {
  const idx = source.indexOf('"请根据需求点击下方按钮，先到先得。"');
  assert.notEqual(idx, -1, "找不到 Sokketsu 默认文案");
  const nearby = source.slice(Math.max(0, idx - 200), idx);
  assert.match(nearby, /quote\.action_text \|\|/);
});

// ---- 改动 3：Shops 留言透传 platform ----
test("resolveLeaveMsgPlatform: Shops 商品透传 mercari_shops，其余沿用 mercari", () => {
  const startMarker = "export function resolveLeaveMsgPlatform(";
  // sliceBetween 用 indexOf 定位结束标记，切片会停在结束标记之前——也就是说
  // 摘出来的这段本身不含收尾的那个 "}"，下面手动把它补回去。
  const fnSource = sliceBetween(source, startMarker, "\n}\n") + "\n}";
  const fnParamsAndBody = fnSource.slice(startMarker.length); // 去掉签名前缀，只留形参起的部分

  // 剥掉 TS 类型标注还原成可执行的纯 JS 函数，真正跑行为（不是只匹配文本）。
  const jsParamsAndBody = fnParamsAndBody
    .replace(/quote: Pick<QuoteRef, "item_type" \| "shop">,/, "quote,")
    .replace(/\): "mercari_shops" \| "mercari" \{/, ") {");

  const resolveLeaveMsgPlatform = new Function(
    `return function resolveLeaveMsgPlatform(${jsParamsAndBody}`,
  )();

  assert.equal(resolveLeaveMsgPlatform({}), "mercari");
  assert.equal(
    resolveLeaveMsgPlatform({ item_type: "shops" }),
    "mercari_shops",
  );
  assert.equal(resolveLeaveMsgPlatform({ shop: true }), "mercari_shops");
  assert.equal(
    resolveLeaveMsgPlatform({ item_type: "normal", shop: false }),
    "mercari",
  );
});

// ---- 改动 3：留言按钮门槛含 mercari 限定，且 body.platform 走同一函数 ----
test("submitLeaveMsg 用 resolveLeaveMsgPlatform 计算 body.platform", () => {
  const start = source.indexOf("async function submitLeaveMsg()");
  assert.notEqual(start, -1, "找不到 submitLeaveMsg");
  // 不做平衡花括号解析，取函数体开头一段够用的窗口即可覆盖这两行断言。
  const windowText = source.slice(start, start + 800);
  assert.match(
    windowText,
    /const leaveMsgPlatform = resolveLeaveMsgPlatform\(quote\);/,
  );
  assert.match(windowText, /platform: leaveMsgPlatform,/);
});
