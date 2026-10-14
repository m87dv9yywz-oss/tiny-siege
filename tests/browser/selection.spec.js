import { test, expect } from "@playwright/test";
async function open(page, width = 390, height = 844) {
  await page.setViewportSize({ width, height });
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.locator("#play").tap();
}
async function tapWorld(page, x, y) {
  const b = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(
    b.x + (b.width * x) / 960,
    b.y + (b.height * y) / 640,
  );
}
for (const [width, height] of [
  [390, 844],
  [844, 390],
  [1024, 768],
])
  test(`${width}×${height}: reopen Lightning and Archer from artwork, one-tap upgrades, range and outside dismissal`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, width, height);
    await page.locator('[data-tower="archer"]').tap();
    await tapWorld(page, 145, 105);
    await page.locator("#close-panel").tap();
    await page.locator('[data-tower="lightning"]').tap();
    await tapWorld(page, 342, 263);
    await expect(page.locator("#selection-panel")).toContainText(
      "Chain Tempest",
    );
    await page.locator("#close-panel").tap();
    // Archer roof lies outside the old 30-world-pixel ground-anchor hit circle.
    await tapWorld(page, 145, 60);
    await expect(page.locator("#tower-inspector")).toBeHidden();
    await expect(page.locator("#selection-panel")).toBeVisible();
    await expect(page.locator("#selection-panel")).toBeVisible();
    await expect(page.locator("#range-tower-name")).toHaveText("Archer");
    await tapWorld(page, 145, 60);
    await expect(page.locator("#selection-panel")).toContainText(
      "Siege Ballista",
    );
    // Switching towers while an upgrade panel is open switches its contents.
    await tapWorld(page, 342, 229);
    await expect(page.locator("#selection-panel")).toContainText(
      "Chain Tempest",
    );
    const field = await page.locator("#game").boundingBox(),
      canvas = await page.locator("canvas").boundingBox();
    if (field.width > canvas.width + 5 || field.height > canvas.height + 5) {
      const x =
        field.width > canvas.width + 5
          ? field.x + 3
          : field.x + field.width / 2;
      const y = field.width > canvas.width + 5 ? field.y + 60 : field.y + 3;
      await page.touchscreen.tap(x, y);
      await expect(page.locator("#selection-panel")).toBeHidden();
      await tapWorld(page, 145, 60);
    }
    for (let i = 0; i < 3; i++) {
      await tapWorld(page, 60, 80);
      await expect(page.locator("#selection-panel")).toBeHidden();
      await expect(page.locator("#range-tower-name")).toHaveText("Lightning");
      await tapWorld(page, 342, 229);
      await expect(page.locator("#selection-panel")).toBeVisible();
    }
    await page
      .locator(".orientation-hint")
      .isVisible()
      .then(async (visible) => {
        if (visible) {
          await page.locator(".orientation-hint").tap();
          await expect(page.locator("#selection-panel")).toBeHidden();
          await tapWorld(page, 145, 60);
        }
      });
    await page.locator("#close-panel").tap();
    await tapWorld(page, 60, 80);
    await expect(page.locator("#tower-inspector")).toBeHidden();
    // A browser chrome/safe-area layout move must not leave cached input offsets.
    await page.evaluate(
      () =>
        (document.querySelector("canvas").style.transform = "translateY(12px)"),
    );
    await tapWorld(page, 145, 60);
    await expect(page.locator("#range-tower-name")).toHaveText("Archer");
    await page.screenshot({
      path: `test-results/selection-range-${width}x${height}.png`,
    });
    expect(errors).toEqual([]);
  });
test("combat earnings preserve the open upgrade panel, scroll, expanded details and native targeting control", async ({
  page,
}) => {
  await open(page);
  await page.locator('[data-tower="archer"]').tap();
  await tapWorld(page, 145, 105);
  await page.locator('[data-upgrade="0"]').tap();
  await expect(page.locator('[data-upgrade="0"]')).toBeDisabled();
  const before = await page.evaluate(() => {
    const p = document.querySelector("#selection-panel");
    p.querySelector(".properties").open = true;
    p.scrollTop = p.scrollHeight;
    window.selectionRegression = {
      panel: p,
      target: p.querySelector("#targeting"),
      upgrade: p.querySelector('[data-upgrade="0"]'),
      scroll: p.scrollTop,
    };
    return p.scrollTop;
  });
  expect(before).toBe(0); // All actions now fit; earnings must preserve native controls.
  await page.evaluate(() => {
    const g = window.__tinySiege.model;
    for (let i = 0; i < 20; i++) {
      const e = g.spawn("basic");
      g.damage(e, 100);
    }
  });
  const result = await page.evaluate(() => ({
    sameTarget:
      window.selectionRegression.target ===
      document.querySelector("#targeting"),
    sameUpgrade:
      window.selectionRegression.upgrade ===
      document.querySelector('[data-upgrade="0"]'),
    scroll: document.querySelector("#selection-panel").scrollTop,
    details: document.querySelector(".properties").open,
  }));
  await expect(page.locator('[data-upgrade="0"]')).toBeEnabled();
  expect(result).toEqual({
    sameTarget: true,
    sameUpgrade: true,
    scroll: before,
    details: true,
  });
  await page.locator("#targeting").selectOption("STRONG");
  expect(
    await page.evaluate(() => window.__tinySiege.model.towers[0].targeting),
  ).toBe("STRONG");
});
test("range inspection works while paused and battle controls preserve upgrades", async ({
  page,
}) => {
  await open(page);
  await page.locator('[data-tower="archer"]').tap();
  await tapWorld(page, 145, 105);
  await page.locator("#pause").tap();
  await expect(page.locator("#pause")).toContainText("Resume");
  await expect(page.locator("#selection-panel")).toBeVisible();
  await page.locator("#close-panel").tap();
  await tapWorld(page, 60, 80);
  await tapWorld(page, 145, 60);
  await expect(page.locator("#tower-inspector")).toBeHidden();
    await expect(page.locator("#selection-panel")).toBeVisible();
  await tapWorld(page, 145, 60);
  await expect(page.locator('[data-upgrade="0"]')).toBeDisabled();
  await page.locator("#pause").tap();
  await expect(page.locator("#pause")).toContainText("Pause");
  await expect(page.locator("#selection-panel")).toBeVisible();
  await page.locator("#start-wave").tap();
  await expect(page.locator("#selection-panel")).toBeVisible();
  await expect(page.locator("#wave")).toHaveText("1");
});
