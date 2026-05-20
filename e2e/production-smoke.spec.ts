import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const backendUrl =
  process.env.PROD_SMOKE_BACKEND_URL ||
  "https://kangaroo-japan-backend.vercel.app";
const artifactDir =
  process.env.PROD_SMOKE_ARTIFACT_DIR ||
  path.join(
    process.env.USERPROFILE || "C:/Users/Dylan",
    ".team",
    "artifacts",
    `prod-smoke-${new Date().toISOString().slice(0, 10)}`,
  );
const strictPlatformSmoke = process.env.STRICT_PLATFORM_SMOKE === "1";
const e2eAdminEmail = process.env.E2E_ADMIN_EMAIL;
const e2eAdminPassword = process.env.E2E_ADMIN_PASSWORD;
const e2eAdminSeedSecret = process.env.E2E_ADMIN_SEED_SECRET;
const livePlatformSamples = {
  rakuten: process.env.RAKUTEN_SAMPLE_ITEM_CODE || "alpen:10431509",
  amazon: process.env.AMAZON_SAMPLE_ASIN || "B0DWZJBXNZ",
  mercari: process.env.MERCARI_SAMPLE_ITEM_ID || "m97035025426",
} as const;

type ImageProbe = {
  src: string | null;
  alt: string | null;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
};

type PlatformKey = keyof typeof livePlatformSamples;

type PlatformDetailAudit = {
  configured: boolean;
  sampleId: string;
  detailOk: boolean;
  imageUrl: string | null;
  imageOk: boolean;
  blocked?: boolean;
  error?: string;
  notice?: string;
};

async function expectOkResponse(page: Page, url: string) {
  const response = await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  expect(response?.status(), url).toBeGreaterThanOrEqual(200);
  expect(response?.status(), url).toBeLessThan(400);
}

async function seedE2EAdminIfConfigured(request: APIRequestContext) {
  if (!e2eAdminSeedSecret) return;
  const response = await request.post(
    `${backendUrl}/api/v1/auth/internal/e2e-admin/seed`,
    {
      headers: { Authorization: `Bearer ${e2eAdminSeedSecret}` },
    },
  );
  expect(response.ok()).toBe(true);
}

async function injectAdminSession(
  page: Page,
  request: APIRequestContext,
) {
  await seedE2EAdminIfConfigured(request);
  const loginResponse = await request.post(`${backendUrl}/api/v1/auth/login`, {
    data: {
      email: e2eAdminEmail,
      password: e2eAdminPassword,
    },
  });
  expect(loginResponse.ok()).toBe(true);
  const loginBody = await loginResponse.json();
  const user = loginBody.data?.user;
  const accessToken = loginBody.data?.tokens?.access_token;
  expect(accessToken).toBeTruthy();
  expect(user?.role).toBe("admin");

  await page.addInitScript(
    ({ storedUser, token }) => {
      window.localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          state: {
            user: storedUser,
            accessToken: token,
            isAuthenticated: true,
          },
          version: 0,
        }),
      );
    },
    { storedUser: user, token: accessToken },
  );

  return accessToken as string;
}

async function probeImage(request: APIRequestContext, imageUrl: string | null) {
  if (!imageUrl) return false;
  const response = await request.get(imageUrl);
  return response.ok();
}

async function auditPlatformDetail(
  request: APIRequestContext,
  platform: PlatformKey,
): Promise<PlatformDetailAudit> {
  const sampleId = livePlatformSamples[platform];
  const detailResponse = await request.get(
    `${backendUrl}/api/v1/integrations/${platform}/detail?id=${encodeURIComponent(sampleId)}`,
  );
  const body = await detailResponse.json();
  const imageUrl = body.data?.imgurls?.[0] || null;
  const imageOk = await probeImage(request, imageUrl);
  return {
    configured: Boolean(body.success || body.data?.blocked === false),
    sampleId,
    detailOk: detailResponse.ok() && body.success === true,
    imageUrl,
    imageOk,
    blocked: body.data?.blocked,
    error: body.error,
    notice: body.notice,
  };
}

test.describe("kangaroo-japan production smoke", () => {
  test.beforeAll(() => {
    fs.mkdirSync(artifactDir, { recursive: true });
  });

  test("product detail APIs expose product 6 and legacy image data", async ({
    request,
  }, testInfo) => {
    const v1 = await request.get(`${backendUrl}/api/v1/products/6?lang=zh`);
    expect(v1.ok()).toBe(true);
    const v1Body = await v1.json();
    expect(v1Body.id).toBe("6");
    expect(v1Body.title).toBe("Tralarello Phone Case");
    expect(v1Body.images?.length).toBeGreaterThan(0);

    const legacy = await request.get(
      `${backendUrl}/api/goods/ydetail?appid=kangaroo-japan-web&id=6&goodsNo=6&goods_no=6&lang=zh`,
    );
    expect(legacy.ok()).toBe(true);
    const legacyBody = await legacy.json();
    expect(legacyBody.code).toBe(0);
    expect(legacyBody.data?.id).toBe("6");
    expect(legacyBody.data?.images?.length).toBeGreaterThan(0);

    await testInfo.attach("product-detail-api-summary", {
      body: JSON.stringify(
        {
          v1: {
            id: v1Body.id,
            title: v1Body.title,
            imageCount: v1Body.images?.length || 0,
          },
          legacy: {
            code: legacyBody.code,
            id: legacyBody.data?.id,
            title: legacyBody.data?.title,
            imageCount: legacyBody.data?.images?.length || 0,
          },
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });

  test("product detail page renders the product image", async ({
    page,
    baseURL,
  }) => {
    const badResponses: Array<{ status: number; url: string }> = [];
    page.on("response", (response) => {
      if (response.status() >= 400) {
        badResponses.push({ status: response.status(), url: response.url() });
      }
    });

    await expectOkResponse(page, `${baseURL}/zh/products/6`);
    await expect(page.getByText("Tralarello Phone Case").first()).toBeVisible();

    const productImages = await page
      .locator("img")
      .evaluateAll((images): ImageProbe[] =>
        images.map((image) => ({
          src: image.getAttribute("src"),
          alt: image.getAttribute("alt"),
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
        })),
      );
    const visibleProductImages = productImages.filter(
      (image) =>
        image.naturalWidth > 0 &&
        image.naturalHeight > 0 &&
        (image.alt?.includes("Tralarello") ||
          image.src?.includes("Phone+Case") ||
          image.src?.includes("Phone%2BCase")),
    );

    expect(visibleProductImages.length).toBeGreaterThan(0);
    expect(
      badResponses.filter(
        (item) =>
          !item.url.includes("price-history") &&
          !item.url.includes("/api/backend/support/"),
      ),
    ).toEqual([]);

    await page.screenshot({
      path: path.join(artifactDir, "product-6-detail.png"),
      fullPage: true,
    });
  });

  test("real platform image source audit reports current integration coverage", async ({
    request,
  }, testInfo) => {
    const statusResponse = await request.get(
      `${backendUrl}/api/v1/integrations/status`,
    );
    expect(statusResponse.ok()).toBe(true);
    const statusBody = await statusResponse.json();
    const statusItems = statusBody.data || [];

    const byPlatform = new Map<
      string,
      { configured: boolean; totalProducts: number }
    >();
    for (const item of statusItems) {
      byPlatform.set(item.platform, {
        configured: Boolean(item.configured),
        totalProducts: Number(item.totalProducts || 0),
      });
    }

    const yahooSearch = await request.get(
      `${backendUrl}/api/v1/integrations/search/unified?keyword=iphone&page=1&limit=3&platforms=yahoo,rakuten`,
    );
    expect(yahooSearch.ok()).toBe(true);
    const yahooBody = await yahooSearch.json();
    const yahooItems = yahooBody.data?.items || [];
    const yahooImage = yahooItems.find(
      (item: { platform?: string; images?: string[] }) =>
        item.platform === "yahoo" && item.images?.[0],
    )?.images?.[0];
    expect(yahooImage).toContain("item-shopping.c.yimg.jp");

    const yahooImageResponse = await request.get(yahooImage);
    expect(yahooImageResponse.ok()).toBe(true);

    const rakutenDetail = await auditPlatformDetail(request, "rakuten");
    const amazonDetail = await auditPlatformDetail(request, "amazon");
    const mercariDetail = await auditPlatformDetail(request, "mercari");

    const audit = {
      yahoo: {
        configured: byPlatform.get("yahoo")?.configured === true,
        liveSearchImage: yahooImage,
        liveSearchImageOk: yahooImageResponse.ok(),
      },
      rakuten: {
        ...(byPlatform.get("rakuten") || { configured: false, totalProducts: 0 }),
        liveDetail: rakutenDetail,
      },
      amazon: {
        ...(byPlatform.get("amazon") || { configured: false, totalProducts: 0 }),
        liveDetail: amazonDetail,
      },
      mercari: {
        ...(byPlatform.get("mercari") || { configured: false, totalProducts: 0 }),
        liveDetail: mercariDetail,
      },
    };

    fs.writeFileSync(
      path.join(artifactDir, "platform-image-audit.json"),
      JSON.stringify(audit, null, 2),
      "utf8",
    );
    await testInfo.attach("platform-image-audit", {
      body: JSON.stringify(audit, null, 2),
      contentType: "application/json",
    });

    expect(audit.yahoo.configured).toBe(true);
    expect(audit.yahoo.liveSearchImageOk).toBe(true);
    expect(audit.rakuten.liveDetail.detailOk).toBe(true);
    expect(audit.rakuten.liveDetail.imageOk).toBe(true);
    expect(audit.amazon.liveDetail.detailOk).toBe(true);
    expect(audit.amazon.liveDetail.imageOk).toBe(true);
    expect(audit.mercari.liveDetail.detailOk).toBe(true);
    expect(audit.mercari.liveDetail.imageOk).toBe(true);

    if (strictPlatformSmoke) {
      expect(audit.rakuten.configured).toBe(true);
      expect(audit.amazon.configured).toBe(true);
      expect(audit.mercari.configured).toBe(true);
    }
  });

  test("admin pages expose refund lifecycle and platform alert filters when E2E credentials are available", async ({
    page,
    request,
    baseURL,
  }, testInfo) => {
    test.skip(
      !e2eAdminEmail || !e2eAdminPassword,
      "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin smoke.",
    );

    const accessToken = await injectAdminSession(page, request);

    await expectOkResponse(page, `${baseURL}/zh/admin/payments`);
    await expect(page.getByText("Refund lifecycle")).toBeVisible();
    await expect(page.getByText("manual_refund_completed")).toBeVisible();

    await expectOkResponse(page, `${baseURL}/zh/admin/platforms`);
    await expect(page.getByText("Health alert rules")).toBeVisible();
    await expect(
      page.locator(
        'select[aria-label="platform health history alert code filter"]',
      ),
    ).toBeVisible();

    const healthSmokeResponse = await request.post(
      `${backendUrl}/api/v1/integrations/admin/health/smoke`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(healthSmokeResponse.ok()).toBe(true);
    const healthSmokeBody = await healthSmokeResponse.json();
    expect(healthSmokeBody.success).toBe(true);
    expect(healthSmokeBody.data?.safety?.writesHealthHistory).toBe(true);
    expect(healthSmokeBody.data?.persistence?.tableReady).toBe(true);
    const healthItems = healthSmokeBody.data?.data || [];
    for (const platform of ["rakuten", "amazon", "mercari"] as const) {
      const item = healthItems.find(
        (candidate: { platform?: string }) => candidate.platform === platform,
      );
      expect(item?.sample?.sampleId).toBeTruthy();
      expect(item?.sampleSmoke?.status).not.toMatch(/^blocked/);
      expect(item?.sampleSmoke?.detailStatus).not.toBe("blocked");
    }

    const historyResponse = await request.get(
      `${backendUrl}/api/v1/integrations/admin/health/history?alertCode=live_smoke_failed&limit=5`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(historyResponse.ok()).toBe(true);
    const historyBody = await historyResponse.json();
    expect(historyBody.success).toBe(true);
    expect(historyBody.data?.safety?.adminOnly).toBe(true);
    expect(historyBody.data?.alerts).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        blocked: expect.any(Number),
        attention: expect.any(Number),
      }),
    );

    const migrationStatusResponse = await request.get(
      `${backendUrl}/api/v1/integrations/admin/health/migration-status`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(migrationStatusResponse.ok()).toBe(true);
    const migrationStatusBody = await migrationStatusResponse.json();
    expect(migrationStatusBody.success).toBe(true);
    expect(migrationStatusBody.data?.schema?.allRequiredReady).toBe(true);

    const initialAlertStatesResponse = await request.get(
      `${backendUrl}/api/v1/integrations/admin/health/alert-states?limit=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(initialAlertStatesResponse.ok()).toBe(true);
    const initialAlertStatesBody = await initialAlertStatesResponse.json();
    expect(initialAlertStatesBody.success).toBe(true);
    expect(initialAlertStatesBody.data?.safety).toMatchObject({
      adminOnly: true,
      mutableStateSource: "platform_health_alert_states",
      healthHistoryUnchanged: true,
    });

    const activeAlerts = healthItems.flatMap(
      (item: {
        platform?: string;
        alerts?: Array<{ code?: string; severity?: string }>;
      }) =>
        (item.alerts || []).map((alert) => ({
          platform: item.platform,
          code: alert.code,
          severity: alert.severity,
        })),
    );
    expect(activeAlerts.length).toBeGreaterThan(0);
    const targetAlert = activeAlerts.find(
      (alert) => alert.platform && alert.code,
    );
    expect(targetAlert).toBeTruthy();

    const acknowledgeResponse = await request.post(
      `${backendUrl}/api/v1/integrations/admin/health/alerts/acknowledge`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          platform: targetAlert?.platform,
          code: targetAlert?.code,
          note: "production smoke acknowledge",
        },
      },
    );
    expect(acknowledgeResponse.ok()).toBe(true);
    const acknowledgeBody = await acknowledgeResponse.json();
    expect(acknowledgeBody.success).toBe(true);
    expect(acknowledgeBody.data?.state).toMatchObject({
      status: "in_progress",
      lastAction: "acknowledged",
    });

    const inProgressResponse = await request.get(
      `${backendUrl}/api/v1/integrations/admin/health/alert-states?status=in_progress&limit=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(inProgressResponse.ok()).toBe(true);
    const inProgressBody = await inProgressResponse.json();
    expect(inProgressBody.success).toBe(true);
    expect(
      (inProgressBody.data?.data || []).some(
        (state: { platform?: string; code?: string; status?: string }) =>
          state.platform === targetAlert?.platform &&
          state.code === targetAlert?.code &&
          state.status === "in_progress",
      ),
    ).toBe(true);

    const handleResponse = await request.post(
      `${backendUrl}/api/v1/integrations/admin/health/alerts/handle`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: {
          platform: targetAlert?.platform,
          code: targetAlert?.code,
          outcome: "resolved",
          note: "production smoke resolved",
          nextAction: "no-op smoke verification",
        },
      },
    );
    expect(handleResponse.ok()).toBe(true);
    const handleBody = await handleResponse.json();
    expect(handleBody.success).toBe(true);
    expect(handleBody.data?.state).toMatchObject({
      status: "resolved",
      lastOutcome: "resolved",
    });

    const resolvedResponse = await request.get(
      `${backendUrl}/api/v1/integrations/admin/health/alert-states?status=resolved&limit=20`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    expect(resolvedResponse.ok()).toBe(true);
    const resolvedBody = await resolvedResponse.json();
    expect(resolvedBody.success).toBe(true);
    expect(
      (resolvedBody.data?.data || []).some(
        (state: { platform?: string; code?: string; status?: string }) =>
          state.platform === targetAlert?.platform &&
          state.code === targetAlert?.code &&
          state.status === "resolved",
      ),
    ).toBe(true);

    await testInfo.attach("platform-alert-state-smoke", {
      body: JSON.stringify(
        {
          targetAlert,
          initialSummary: initialAlertStatesBody.data?.summary,
          acknowledge: acknowledgeBody.data?.state,
          inProgressSummary: inProgressBody.data?.summary,
          handle: handleBody.data?.state,
          resolvedSummary: resolvedBody.data?.summary,
          safety: initialAlertStatesBody.data?.safety,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
  });
});
