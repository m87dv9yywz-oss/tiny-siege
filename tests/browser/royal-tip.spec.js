import { test, expect } from "@playwright/test";

// The Royal Tip: a one-time coach card that teaches hold-for-auto-waves
// between waves. It snoozes on X (max three showings), retires forever on
// "Don't show again", and retires the moment auto waves are really used.

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}

async function enterBattle(page) {
  await ready(page);
  await page.getByRole("button", { name: "PLAY CAMPAIGN" }).click();
  await page
    .getByRole("button", { name: new RegExp("Buy Archer,") })
    .click();
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.click(
    box.x + (145 / 960) * box.width,
    box.y + (105 / 640) * box.height,
  );
}

async function clearWave(page) {
  await page.evaluate(() => window.__tinySiege.model.startWave());
  await page.waitForFunction(
    () => {
      const g = window.__tinySiege.model;
      if (!g.active) return true;
      for (const e of [...g.enemies])
        if (e.alive)
          g.damage(e, 1e9, { damageType: "magic", bypass: 1, area: true });
      return false;
    },
    null,
    { timeout: 20000 },
  );
}

const tip = (page) => page.locator("#royal-tip");
const tipState = (page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("ts.royalTipAuto.v1") || "{}"),
  );

test("royal tip appears between waves, snoozes, then retires for good", async ({
  page,
}) => {
  await enterBattle(page);
  await clearWave(page);
  await expect(tip(page)).toHaveClass(/visible/, { timeout: 8000 });
  await expect(tip(page)).toContainText("Auto Waves");
  await page.locator("#royal-tip-close").click();
  await expect(tip(page)).not.toHaveClass(/visible/);
  expect((await tipState(page)).shows).toBe(1);

  await clearWave(page);
  await expect(tip(page)).toHaveClass(/visible/, { timeout: 8000 });
  await page.locator("#royal-tip-never").click();
  await expect(tip(page)).not.toHaveClass(/visible/);
  expect((await tipState(page)).done).toBe(true);

  await clearWave(page);
  await page.waitForTimeout(3000);
  await expect(tip(page)).not.toHaveClass(/visible/);
});

test("royal tip retires forever once auto waves are really used", async ({
  page,
}) => {
  await enterBattle(page);
  await clearWave(page);
  await expect(tip(page)).toHaveClass(/visible/, { timeout: 8000 });
  await page.locator("#royal-tip-try").click();
  await expect(tip(page)).not.toHaveClass(/visible/);
  await expect(page.locator("#start-wave")).toHaveClass(/royal-pulse/);
  // Hold Play for longer than the 550ms gesture: auto waves switch on.
  await page.locator("#start-wave").dispatchEvent("pointerdown");
  await page.waitForTimeout(750);
  await page.locator("#start-wave").dispatchEvent("pointerup");
  await expect
    .poll(() => page.evaluate(() => window.__tinySiege.model.autoWave))
    .toBe(true);
  expect((await tipState(page)).done).toBe(true);
  // Turn auto back off and clear another wave: the tip stays retired.
  await page.evaluate(() => window.__tinySiege.ui.toggleAutoWave());
  await clearWave(page);
  await page.waitForTimeout(3000);
  await expect(tip(page)).not.toHaveClass(/visible/);
});
