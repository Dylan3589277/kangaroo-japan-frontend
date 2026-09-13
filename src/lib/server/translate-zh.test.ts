import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";

// `translate-zh.ts` imports `unstable_cache` from `next/cache`, which Next's own
// bundler resolves specially — plain Node ESM can't resolve that bare specifier
// (no `exports` map in next/package.json). Stub it out with a synchronous
// module-resolution hook so this file runs under plain `node --test`.
const require = createRequire(import.meta.url);
const { registerHooks } = require("node:module");

registerHooks({
  resolve(specifier: string, context: unknown, nextResolve: (s: string, c: unknown) => unknown) {
    if (specifier === "next/cache") {
      return { url: "translate-zh-test-mock:next-cache", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url: string, context: unknown, nextLoad: (u: string, c: unknown) => unknown) {
    if (url === "translate-zh-test-mock:next-cache") {
      return {
        format: "module",
        // Identity passthrough: no caching, no extra async hop — the batching
        // behaviour under test only depends on real-time spacing between
        // enqueue calls, not on unstable_cache's own internals.
        source: "export function unstable_cache(fn) { return fn; }",
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const { translateTitlesJaToZh } = await import("./translate-zh.ts");

test("titles enqueued at staggered async intervals within the batch window still merge into a single fetch call", async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENCODE_GO_API_KEY;
  process.env.OPENCODE_GO_API_KEY = "fake-key-for-test";

  // biome-ignore lint: test mock
  globalThis.fetch = (async (_url: string, opts: { body: string }) => {
    fetchCalls++;
    const body = JSON.parse(opts.body);
    const texts: string[] = JSON.parse(body.messages[1].content);
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(texts.map((t) => `${t}_zh`)) } }],
      }),
    };
    // biome-ignore lint: matching fetch's real signature loosely for the mock
  }) as typeof fetch;

  try {
    // Simulate one request whose titles reach enqueueForBatch a few ms apart
    // (as real cache-miss lookups through unstable_cache do), all still
    // within BATCH_WINDOW_MS (30ms).
    const delays = [0, 5, 10, 15, 20];
    const results = await Promise.all(
      delays.map(
        (delay, i) =>
          new Promise<string | null>((resolve) => {
            setTimeout(() => {
              translateTitlesJaToZh([`タイトル${i}`]).then(([r]) => resolve(r));
            }, delay);
          }),
      ),
    );

    assert.deepEqual(results, ["タイトル0_zh", "タイトル1_zh", "タイトル2_zh", "タイトル3_zh", "タイトル4_zh"]);
    assert.equal(fetchCalls, 1, "expected all 5 staggered titles to merge into a single batch/fetch call");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENCODE_GO_API_KEY;
    else process.env.OPENCODE_GO_API_KEY = originalKey;
  }
});
