import { test, expect } from "@playwright/test";

// Phone report: starting a battle showed the flat placeholder
// battlefield for a beat before the real map art popped in. Two
// defenses: the art warms while the prep/home screens are up, and if
// a battle still starts cold, the map's own thumbnail covers the
// placeholder until the full art lands.
test("cold battle start covers the placeholder with the map thumbnail, then swaps in full art", async ({
  page,
}) => {
  await page.route("**/assets/v5/maps/map_coast.png*", async (route) => {
    await new Promise((r) => setTimeout(r, 3500));
    await route.continue();
  });
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.evaluate(() => {
    const { profiles, kingdom } = window.__tinySiege;
    profiles.create("Scout");
    kingdom.start("coast");
  });
  await page.waitForFunction(() => window.__tinySiege?.ui.inMenu === false);
  await page.waitForFunction(
    () => window.__tinySiege.game.scene.scenes[0].mapImage?.texture?.key === "v5-map-coast-thumb",
    null,
    { timeout: 3000 },
  );
  expect(
    await page.evaluate(
      () => window.__tinySiege.game.scene.scenes[0].textures.exists("v5-map-coast"),
    ),
  ).toBe(false);
  await page.waitForFunction(
    () => window.__tinySiege.game.scene.scenes[0].mapImage?.texture?.key === "v5-map-coast",
    null,
    { timeout: 8000 },
  );
});

test("opening a map's prep screen warms its full art", async ({ page }) => {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.evaluate(() => {
    const { profiles, kingdom } = window.__tinySiege;
    profiles.create("Scout");
    kingdom.prepare("coast");
  });
  await expect(page.locator("#begin-adventure")).toBeVisible();
  await page.waitForFunction(
    () => window.__tinySiege.game.scene.scenes[0].textures.exists("v5-map-coast"),
    null,
    { timeout: 10000 },
  );
});
