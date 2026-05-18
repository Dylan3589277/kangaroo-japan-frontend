import { expect, test, type Page } from "@playwright/test";
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

type ImageProbe = {
  src: string | null;
  alt: string | null;
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
};

async function expectOkResponse(page: Page, url: string) {
  const response = await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  expect(response?.status(), url).toBeGreaterThanOrEqual(200);
  expect(response?.status(), url).toBeLessThan(400);
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

    const audit = {
      yahoo: {
        configured: byPlatform.get("yahoo")?.configured === true,
        liveSearchImage: yahooImage,
        liveSearchImageOk: yahooImageResponse.ok(),
      },
      rakuten: byPlatform.get("rakuten") || {
        configured: false,
        totalProducts: 0,
      },
      amazon: byPlatform.get("amazon") || {
        configured: false,
        totalProducts: 0,
      },
      mercari: byPlatform.get("mercari") || {
        configured: false,
        totalProducts: 0,
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

    if (strictPlatformSmoke) {
      expect(audit.rakuten.configured).toBe(true);
      expect(audit.amazon.configured).toBe(true);
      expect(audit.mercari.configured).toBe(true);
    }
  });
});
