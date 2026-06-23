import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT || 3107);
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: `${baseURL}/__e2e-api`,
      NEXT_PUBLIC_KF53_CHAT_URL: "https://kf53.example.test/chat",
      SUPPORT_API_BASE_URL: `${baseURL}/__e2e-api`,
      // Point the server-side support relay (callHermesBridge) at a local stub
      // bridge started by support-list-relay.spec.ts. Other chat specs mock
      // /api/support/chat at the browser, so they short-circuit before the
      // server ever fetches this and are unaffected.
      HERMES_BRIDGE_URL: `http://127.0.0.1:${process.env.E2E_HERMES_BRIDGE_PORT || 3198}/v1`,
      KANGAROO_AGENT_TOKEN: "e2e-bridge-token",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
