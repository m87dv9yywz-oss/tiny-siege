import { test, expect } from "@playwright/test";

// Owner's phone report: the 5-tap cheat gesture was nearly
// impossible to trigger — taps only counted on the gold number
// itself, all five had to fit in one strict 3s window, and nothing
// showed the taps registering. The trigger now counts the whole
// gold pill on pointerdown, with a rolling per-tap gap and a pulse
// of feedback per counted tap.
async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.locator("#new-profile").tap();
  await page.locator("#nickname").fill("Tap Knight");
  await page.locator("#profile-form button").tap();
  await page.locator('[data-map="emerald"]').tap();
  await page.locator("#begin-adventure").tap();
  await page.waitForFunction(() => window.__tinySiege?.ui.inMenu === false);
}

test("tapping the gold pill's coin (not the number) at a natural pace opens the codes", async ({
  page,
}) => {
  await ready(page);
  const icon = page.locator(".resource.gold img");
  await icon.tap();
  await expect(page.locator(".resource.gold")).toHaveClass(/cheat-pulse/);
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(900);
    await icon.tap();
  }
  await expect(page.locator("#cheat-close")).toBeVisible();
  await page.locator("#cheat-close").tap();
});

test("a long pause mid-gesture restarts the count instead of expiring invisibly", async ({
  page,
}) => {
  await ready(page);
  const pill = page.locator(".resource.gold");
  for (let i = 0; i < 4; i++) await pill.tap();
  await page.waitForTimeout(2800);
  await pill.tap();
  await expect(page.locator("#cheat-close")).toHaveCount(0);
  for (let i = 0; i < 4; i++) await pill.tap();
  await expect(page.locator("#cheat-close")).toBeVisible();
});
