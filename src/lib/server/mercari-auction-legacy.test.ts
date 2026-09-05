import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  signLegacyH5,
  parseGoodsNoFromUrl,
  legacyCreateTimeToIso,
} from "./mercari-auction-legacy.ts";

test("signLegacyH5 matches PHP h5Auth algorithm (HMAC-SHA256(uid.ts, secret))", () => {
  const uid = "12345";
  const secret = "test-fake-secret";
  const ts = 1700000000;
  const { ts: tsOut, sig } = signLegacyH5(uid, secret, ts);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${uid}.${ts}`)
    .digest("hex");
  assert.equal(tsOut, String(ts));
  assert.equal(sig, expected);
});

test("parseGoodsNoFromUrl extracts goods_no from a standard item URL", () => {
  const url = "https://jp.mercari.com/item/m12345678901";
  assert.equal(parseGoodsNoFromUrl(url), "m12345678901");
});

test("parseGoodsNoFromUrl accepts www. prefix", () => {
  assert.equal(parseGoodsNoFromUrl("https://www.jp.mercari.com/item/m12345678901"), "m12345678901");
});

test("parseGoodsNoFromUrl rejects non jp.mercari.com hosts", () => {
  assert.equal(parseGoodsNoFromUrl("https://evil.example.com/item/m12345678901"), null);
});

test("parseGoodsNoFromUrl rejects non-exact item paths", () => {
  assert.equal(parseGoodsNoFromUrl("https://jp.mercari.com/search?x=m12345678901"), null);
  assert.equal(parseGoodsNoFromUrl("https://jp.mercari.com/item/m123456789012"), null);
  assert.equal(parseGoodsNoFromUrl("https://example.com/no-id-here"), null);
  assert.equal(parseGoodsNoFromUrl("not a url"), null);
});

test("legacyCreateTimeToIso converts Unix seconds to ISO string", () => {
  assert.equal(legacyCreateTimeToIso(1757000000), new Date(1757000000 * 1000).toISOString());
  assert.equal(legacyCreateTimeToIso("1757000000"), new Date(1757000000 * 1000).toISOString());
});

test("legacyCreateTimeToIso falls back to String() for non-numeric input", () => {
  assert.equal(legacyCreateTimeToIso("not-a-number" as unknown as string), "not-a-number");
});
