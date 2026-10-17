import { test, expect } from "@playwright/test";

// Battle gesture lock: while a battle is on screen, one-finger touch
// drags are gameplay and must not be handed to the browser (iOS Safari
// pull-to-refresh / sliding menus). In menus, touches stay untouched.

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}

function touchMovePrevented(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const ev = new TouchEvent("touchmove", {
      bubbles: true,
      cancelable: true,
    });
    // dispatchEvent returns false when a handler called preventDefault.
    return !el.dispatchEvent(ev);
  }, selector);
}

test("battle drags are locked from browser gestures; menus are not", async ({
  page,
}) => {
  await ready(page);
  // Menu screens keep their native touch behavior.
  expect(await touchMovePrevented(page, ".home-card, body")).toBe(false);
  await page.locator("#new-profile").tap();
  await page.locator("#nickname").fill("Gesture Knight");
  await page.locator("#profile-form button").tap();
  await page.locator("#play").tap();
  await page.locator('[data-freeplay="classic"]').tap();
  await page.waitForFunction(() => window.__tinySiege.ui.inMenu === false);
  // In battle, a drag starting on the shop rail or the battlefield is
  // swallowed before the browser can turn it into a pull gesture.
  expect(await touchMovePrevented(page, "aside")).toBe(true);
  expect(await touchMovePrevented(page, "#tower-shop")).toBe(true);
  expect(await touchMovePrevented(page, "canvas")).toBe(true);
  // And the battle still plays: place an archer by tap-tap.
  await page
    .getByRole("button", { name: new RegExp("Buy Archer,") })
    .click();
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.click(
    box.x + (145 / 960) * box.width,
    box.y + (105 / 640) * box.height,
  );
  expect(
    await page.evaluate(() => window.__tinySiege.model.towers.length),
  ).toBe(1);
});
