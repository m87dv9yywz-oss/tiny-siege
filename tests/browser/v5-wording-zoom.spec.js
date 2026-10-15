import { test, expect } from "@playwright/test";

// Owner phone feedback (2026-10-15): relic cards showed placeholder wording
// ("Tap art ⓘ") and labels struck through by the frame art; the start-battle
// dialog title/body slid under its frame ornaments; rapid tapping during a
// round could double-tap-zoom the page and strand the player.

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function hero(page) {
  await page.locator("#new-profile").tap();
  await page.locator("#nickname").fill("Wording Knight");
  await page.locator("#profile-form button").tap();
}
function textRect(locator) {
  return locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
}

test("page zoom is disabled: viewport locks scale and controls use manipulation touch-action", async ({ page }) => {
  await ready(page);
  const meta = await page.evaluate(
    () => document.querySelector('meta[name="viewport"]').content,
  );
  expect(meta).toContain("maximum-scale=1.0");
  expect(meta).toContain("user-scalable=no");
  const touch = await page.evaluate(() => {
    const b = document.querySelector("#play");
    return b ? getComputedStyle(b).touchAction : "manipulation";
  });
  expect(["manipulation", "none"]).toContain(touch);
});

test("relic cards show a one-line effect summary and a plaque-centered action label", async ({ page }) => {
  await page.setViewportSize({ width: 932, height: 430 });
  await ready(page);
  await hero(page);
  await page.locator("#relics").tap();
  await expect(page.locator("[data-relic]")).toHaveCount(6);
  const descs = await page
    .locator(".relic-grid .v5-relic-desc")
    .allInnerTexts();
  expect(descs.join(" ")).not.toContain("Tap art");
  expect(descs[0]).toContain("starting gold");
  // No description overflows its box (which would clip letters at the frame).
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll(".v5-relic-desc")].map(
      (d) => d.scrollWidth <= d.clientWidth + 1,
    ),
  );
  expect(overflow.every(Boolean)).toBe(true);
  // The action label sits in the frame's bottom plaque (~85-94% of the card),
  // not on the engraved bar above it (~84%) where it was struck through.
  const card = await page
    .locator(".relic-grid .v5-relic-card")
    .first()
    .boundingBox();
  const label = await textRect(
    page.locator(".relic-grid .v5-relic-action").first(),
  );
  const centerPct = ((label.y + label.height / 2 - card.y) / card.height) * 100;
  expect(centerPct).toBeGreaterThan(87);
  expect(centerPct).toBeLessThan(94);
});

test("start-battle dialog keeps its title and body inside the frame ornaments", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await hero(page);
  await page.evaluate(() => {
    const k = window.__tinySiege.kingdom;
    k.store.data.profiles[k.store.data.selected].battle = {
      map: "emerald",
      wave: 3,
    };
    k.store.persist();
    k.menu();
  });
  await page.locator('[data-map="emerald"]').tap();
  await page.locator("#begin-adventure").tap();
  await expect(page.locator(".modal-card")).toContainText(
    "Start a new battle?",
  );
  const card = await page.locator(".modal-card").boundingBox();
  const title = await page.locator(".modal-card h1").boundingBox();
  const body = await textRect(page.locator(".modal-card p").first());
  // Title clears the crest band; body text clears the side gem columns.
  expect(((title.y - card.y) / card.height) * 100).toBeGreaterThan(20);
  expect(((body.x - card.x) / card.width) * 100).toBeGreaterThan(11);
  expect(
    ((card.x + card.width - (body.x + body.width)) / card.width) * 100,
  ).toBeGreaterThan(11);
});
