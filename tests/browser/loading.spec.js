import { test, expect } from "@playwright/test";

test("slow artwork loading keeps battle entry disabled until real Phaser input is ready", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  await page.route("**/assets/v5/towers/archer/battlefield_256/*.png", async route => {
    await ready;
    await route.continue();
  });
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !!window.__tinySiege);
  await expect(page.locator("#play")).toBeDisabled();
  await expect(page.locator("#modal")).toContainText("Preparing battlefield artwork");
  expect(await page.evaluate(() => window.__tinySiege.ui.inMenu)).toBe(true);
  release();
  await expect(page.locator("#play")).toBeEnabled();
  await expect(page.locator("#game")).toHaveAttribute("aria-busy", "false");
  await page.locator("#play").tap();
  await page.locator('[data-tower="archer"]').tap();
  const b = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(b.x + b.width * 145 / 960, b.y + b.height * 105 / 640);
  await expect(page.locator("#gold")).toHaveText("225");
});
