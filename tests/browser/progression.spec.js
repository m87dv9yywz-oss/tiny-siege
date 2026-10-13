import { test, expect } from "@playwright/test";
async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function create(page, name, avatar = "dragon") {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill(name);
  await page.locator("#avatar").selectOption(avatar);
  await page.locator("#profile-form button").click();
}
test("independent heroes, beginner map, locked purchases and durable guest saves", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await create(page, "Dragon");
  await create(page, "Fox", "fox");
  await page.locator("[data-profile]").filter({ hasText: "Dragon" }).click();
  await page.locator('[data-map="emerald"]').click();
  await expect(page.locator('[data-tower="fire"]')).toBeDisabled();
  await expect(page.locator(".wave-counter em")).toHaveText(" / 14");
  await page.locator('[data-tower="archer"]').tap();
  const b = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(
    b.x + (b.width * 145) / 960,
    b.y + (b.height * 105) / 640,
  );
  await page.locator('[data-upgrade="0"]').tap();
  await expect(page.locator('[data-upgrade="0"]')).toContainText(
    "Unlock Tier 2 in Kingdom",
  );
  await expect(page.locator('[data-upgrade="0"]')).toBeDisabled();
  await page.evaluate(() => {
    const { model, kingdom } = window.__tinySiege;
    model.participation.archer = {
      time: 100,
      damage: 14000,
      armor: 0,
      control: 0,
      kills: 1,
    };
    model.wave = 14;
    model.finish("victory");
  });
  await expect(page.locator(".reward-summary")).toContainText(
    "+100 Kingdom Crowns",
  );
  await page.locator("#main-menu").click();
  await page.locator("#collection").click();
  await page.locator('[data-collection="fire"]').click();
  await page.locator('[data-unlock-tower="fire"]').click();
  await expect(page.locator("#modal-title")).toContainText("25 Crowns");
  await page.locator('[data-collection="archer"]').click();
  await page.locator('[data-unlock-path="archer:0"]').click();
  await expect(page.locator(".collection-grid")).toContainText(
    "170 XP available",
  );
  await page.locator("#back").click();
  await page.locator("[data-profile]").filter({ hasText: "Fox" }).click();
  await page.locator("#collection").click();
  await expect(page.locator("#modal-title")).toContainText("0 Crowns");
  await page.locator('[data-collection="fire"]').click();
  await expect(page.locator('[data-unlock-tower="fire"]')).toBeDisabled();
  await page.locator("#back").click();
  await page.reload();
  await page.waitForFunction(() => window.__tinySiege?.ui.scene);
  await expect(page.locator(".profile-choice.chosen")).toContainText("Fox");
  await page.locator("[data-profile]").filter({ hasText: "Dragon" }).click();
  await page.locator("#collection").click();
  await expect(page.locator("#modal-title")).toContainText("25 Crowns");
  await page.screenshot({ path: "test-results/v3-kingdom-portrait.png" });
});
test("profile rename, deletion confirmation and classic escape hatch", async ({
  page,
}) => {
  await ready(page);
  await create(page, "Brave Owl", "owl");
  await page.locator("#manage-profile").click();
  await page.locator("#rename-profile").click();
  await page.locator("#nickname").fill("<Knight>");
  await page.locator("#profile-form button").click();
  await expect(page.locator(".profile-choice")).toContainText("<Knight>");
  await page.locator("#manage-profile").click();
  await page.locator("#delete-profile").click();
  await expect(page.locator("#confirm-delete")).toBeVisible();
  await page.locator("#back").click();
  await expect(page.locator("#rename-profile")).toBeVisible();
  await page.locator("#delete-profile").click();
  await page.locator("#confirm-delete").click();
  await expect(page.locator("[data-profile]")).toHaveCount(0);
  await page.locator("#play").click();
  await expect(page.locator('[data-tower="fire"]')).toBeEnabled();
  await expect(page.locator(".wave-counter em")).toHaveText(" / 20");
});
test("all map artwork changes while battle coordinates remain correct; evolved portraits differ", async ({
  page,
}) => {
  await ready(page);
  await create(page, "Explorer");
  for (const map of ["emerald", "amber", "moon"]) {
    await page.locator(`[data-map="${map}"]`).click();
    await expect(page.locator(".map-label")).toContainText(
      map === "emerald" ? "Emerald" : map === "amber" ? "Amber" : "Moonlit",
    );
    const pixel = await page.evaluate(() => {
      const { ui } = window.__tinySiege;
      return Array.from(
        ui.scene.textures.getPixel(400, 100, "emerald-trail").rgba || [],
      );
    });
    await page.screenshot({ path: `test-results/v3-map-${map}.png` });
    await page.locator("#leave-run").click();
    await page.locator("#confirm-leave").click();
  }
  await page.locator("#play").click();
  await page.evaluate(() => {
    const { model, ui } = window.__tinySiege;
    model.gold = 5000;
    const t = model.place("lightning", 145, 105);
    model.upgrade(t.id, 2);
    model.upgrade(t.id, 2);
    model.upgrade(t.id, 2);
    ui.selectTower(t);
    ui.openUpgrades();
  });
  await expect(page.locator(".tower-portrait")).toHaveAttribute(
    "src",
    /lightning-2\.svg/,
  );
  await expect(page.locator(".panel-title")).toContainText("Stormcaller");
  await page.screenshot({ path: "test-results/v3-evolution-desktop.png" });
});
