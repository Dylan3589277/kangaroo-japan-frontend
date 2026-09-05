import assert from "node:assert/strict";
import test from "node:test";

test("GET returns review_mode:false when the legacy fetch throws", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { GET } = await import("./route");
  const response = await GET();
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
  const response = await GET();
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
  const response = await GET();
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
  const response = await GET();
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
  const response = await GET();
  const payload = await response.json();

  assert.equal(payload.review_mode, false);
});
