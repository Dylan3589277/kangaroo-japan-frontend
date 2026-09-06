import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

function makeRequest(app?: string) {
  const url = app
    ? `http://localhost/api/support/review-mode?app=${app}`
    : "http://localhost/api/support/review-mode";
  return new NextRequest(url);
}

test("GET returns review_mode:false when the legacy fetch throws", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { GET } = await import("./route");
  const response = await GET(makeRequest());
  const payload = await response.json();

  assert.equal(payload.review_mode, false);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("GET returns review_mode:false when the legacy response is not ok", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("", { status: 500 });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { GET } = await import("./route");
  const response = await GET(makeRequest());
  const payload = await response.json();

  assert.equal(payload.review_mode, false);
});

test("GET returns review_mode:false when the legacy payload has code != 0", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ code: 1, errmsg: "boom" }), { status: 200 });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { GET } = await import("./route");
  const response = await GET(makeRequest());
  const payload = await response.json();

  assert.equal(payload.review_mode, false);
});

test("GET passes through review_mode:true from the legacy payload", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ code: 0, data: { review_mode: true } }),
      { status: 200 },
    );
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { GET } = await import("./route");
  const response = await GET(makeRequest());
  const payload = await response.json();

  assert.equal(payload.review_mode, true);
});

test("GET returns review_mode:false when data.review_mode is missing", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ code: 0, data: {} }), { status: 200 });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { GET } = await import("./route");
  const response = await GET(makeRequest());
  const payload = await response.json();

  assert.equal(payload.review_mode, false);
});

test("GET forwards ?app=candy to the legacy endpoint; unknown app falls back to legacy", async (t) => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(
      JSON.stringify({ code: 0, data: { review_mode: true } }),
      { status: 200 },
    );
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { GET } = await import("./route");

  await GET(makeRequest("candy"));
  assert.ok(requestedUrl.includes("app=candy"));

  await GET(makeRequest("bogus"));
  assert.ok(requestedUrl.includes("app=legacy"));
});
