import { test, expect } from "@playwright/test";

// Two boot/presentation regressions reported from a real phone:
// 1. The static page shell flashed as a fake "old version" of the game
//    while the bundle loaded. The page must boot behind a splash that
//    the game removes once the real UI exists.
// 2. Enemy introduction cards showed the old procedural portraits
//    instead of the illustrated art the battle itself uses.
test("boot splash covers the shell and is removed once the game is up", async ({
  page,
  request,
}) => {
  const html = await (await request.get("./")).text();
  expect(html).toContain('id="boot-splash"');
  expect(html).toContain("#app");
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui);
  await expect(page.locator("#boot-splash")).toHaveCount(0);
  const visibility = await page.evaluate(
    () => document.getElementById("app").style.visibility,
  );
  expect(visibility).toBe("visible");
});

test("new-enemy introduction card shows the illustrated battle art", async ({
  page,
}) => {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  // Create a hero and start Twin Ponds on Medium (40 waves), then jump
  // to the wave where the Shadowhart miniboss debuts (wave 25) and open
  // its introduction card.
  await page.evaluate(() => {
    const { profiles, kingdom } = window.__tinySiege;
    profiles.create("Scout");
    kingdom.difficulty = "medium";
    kingdom.start("twinponds");
  });
  await page.waitForFunction(() => window.__tinySiege?.ui.inMenu === false);
  await page.evaluate(() => {
    const { model, ui } = window.__tinySiege;
    model.wave = 24;
    ui.beginWave();
  });
  await expect(page.locator(".enemy-introductions")).toBeVisible();
  await expect(page.locator(".enemy-introductions")).toContainText(
    "Shadowhart",
  );
  const [cardSrc, battleSrc] = await page.evaluate(() => {
    const article = [...document.querySelectorAll(".enemy-introductions article")].find(
      (a) => a.querySelector("h2")?.textContent === "Shadowhart",
    );
    return [
      article?.querySelector("img.enemy-portrait")?.src,
      window.__tinySiege.ui.scene.textures.getBase64("v5-enemy-shadowhart"),
    ];
  });
  expect(cardSrc).toBeTruthy();
  expect(cardSrc).toBe(battleSrc);
});
