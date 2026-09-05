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

test("parseGoodsNoFromUrl falls back to bare mNNN pattern and returns null when absent", () => {
  assert.equal(parseGoodsNoFromUrl("https://example.com/foo/m987654321?x=1"), "m987654321");
  assert.equal(parseGoodsNoFromUrl("https://example.com/no-id-here"), null);
});

test("legacyCreateTimeToIso converts Unix seconds to ISO string", () => {
  assert.equal(legacyCreateTimeToIso(1757000000), new Date(1757000000 * 1000).toISOString());
  assert.equal(legacyCreateTimeToIso("1757000000"), new Date(1757000000 * 1000).toISOString());
});

test("legacyCreateTimeToIso falls back to String() for non-numeric input", () => {
  assert.equal(legacyCreateTimeToIso("not-a-number" as unknown as string), "not-a-number");
});
