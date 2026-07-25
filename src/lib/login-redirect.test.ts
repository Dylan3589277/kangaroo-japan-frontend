import assert from "node:assert/strict";
import test from "node:test";

import { safeNextPath } from "./login-redirect";

/**
 * safeNextPath 是登录回跳的安全闸：`?next=` 来自 URL，完全由攻击者可控，
 * 放行前必须确认它只能指向本站、当前语言下的路径。
 */

test("safeNextPath 放行本 locale 下的站内路径", () => {
  assert.equal(safeNextPath("/en/cards", "en"), "/en/cards");
  assert.equal(
    safeNextPath("/en/checkout?type=mercari&id=m123", "en"),
    "/en/checkout?type=mercari&id=m123",
  );
  assert.equal(safeNextPath("/en/mercari/m85298608017", "en"), "/en/mercari/m85298608017");
  // 正好等于 locale 首页也算合法
  assert.equal(safeNextPath("/en", "en"), "/en");
  // 其它 locale 各自成立
  assert.equal(safeNextPath("/zh/orders", "zh"), "/zh/orders");
});

test("safeNextPath 挡掉外站跳转（开放重定向）", () => {
  const home = "/en";
  // 绝对 URL
  assert.equal(safeNextPath("https://evil.com", "en"), home);
  assert.equal(safeNextPath("http://evil.com/en/cards", "en"), home);
  // 协议相对 URL：浏览器会当成外站
  assert.equal(safeNextPath("//evil.com", "en"), home);
  assert.equal(safeNextPath("//evil.com/en/cards", "en"), home);
  // 反斜杠变体
  assert.equal(safeNextPath("/\\evil.com", "en"), home);
  assert.equal(safeNextPath("/en/\\evil.com", "en"), home);
  // 伪协议
  assert.equal(safeNextPath("javascript:alert(1)", "en"), home);
});

test("safeNextPath 挡掉跨 locale 与前缀混淆", () => {
  // 当前是 en，不该被带去 zh
  assert.equal(safeNextPath("/zh/orders", "en"), "/en");
  // `/enevil.com` 以 "/en" 开头但并非 /en 的子路径
  assert.equal(safeNextPath("/enevil.com", "en"), "/en");
  assert.equal(safeNextPath("/english/x", "en"), "/en");
});

test("safeNextPath 不跳回登录页自身（防死循环）", () => {
  assert.equal(safeNextPath("/en/login", "en"), "/en");
  assert.equal(safeNextPath("/en/login?next=%2Fen%2Fcards", "en"), "/en");
});

test("safeNextPath 空值回落首页", () => {
  assert.equal(safeNextPath(null, "en"), "/en");
  assert.equal(safeNextPath("", "en"), "/en");
});
