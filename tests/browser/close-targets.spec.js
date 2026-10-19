import { test, expect } from '@playwright/test';

// Owner report (2026-10-18): the X buttons on the little popup menus are
// hard to trigger on his phone. Root causes found: the tower panel's X
// rendered at 40px (a late theme rule overrode the 44px breakpoint rules)
// and the Royal Tip's X was 30px. Both now render >= 40px with an
// invisible halo widening the tap zone. These tests measure the real
// boxes at phone size and tap near the edge of the halo.
async function ready(page, w = 932, h = 430) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto('./');
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.evaluate(() => document.fonts.ready);
}

async function enterFreeplay(page) {
  await page.locator('#new-profile').tap();
  await page.locator('#nickname').fill('Sure Shot');
  await page.locator('#profile-form button').tap();
  await page.locator('#play').tap();
  await page.locator('[data-freeplay="classic"]').tap();
}

async function hitInfo(page, selector, mode) {
  return page.evaluate(([sel, m]) => {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    // Deliberate near misses: 5px outside the button's own box but
    // inside the halo and inside the owning card (outward of the card
    // corner is clipped by the card itself, which is fine — there is
    // nothing of the card left to tap out there). Mode picks the two
    // card-inward directions for this button's corner.
    const points =
      m === 'top-right-inward'
        ? [
            [r.left - 5, cy],
            [cx, r.bottom + 5],
          ]
        : [
            [r.left - 5, cy],
            [cx, r.top - 5],
          ];
    return {
      w: r.width,
      h: r.height,
      centerHit: document.elementFromPoint(cx, cy) === el,
      haloHit: points.every(([x, y]) => document.elementFromPoint(x, y) === el),
    };
  }, [selector, mode]);
}

test('popup X buttons are big enough and forgiving to tap on a phone', async ({ page }) => {
  await ready(page);
  await enterFreeplay(page);
  await page.evaluate(() => {
    const { model: g, ui } = window.__tinySiege;
    g.reset();
    g.gold = 10000;
    ui.selectTower(g.place('archer', 145, 105));
  });
  const panel = await hitInfo(page, '#close-panel', 'top-inward');
  // The button is 44px in CSS; getBoundingClientRect can report a hair
  // under (43.999996) from sub-pixel layout rounding, so measure rounded.
  expect(Math.round(panel.w)).toBeGreaterThanOrEqual(44);
  expect(Math.round(panel.h)).toBeGreaterThanOrEqual(44);
  expect(panel.centerHit).toBe(true);
  expect(panel.haloHit).toBe(true);
  await page.locator('#close-panel').tap();
  await expect(page.locator('#selection-panel')).not.toHaveClass(/open/);

  // Royal Tip card: force it visible (its show logic runs between waves;
  // geometry and the close handler are what is under test here).
  await page.evaluate(() => {
    const tip = document.querySelector('#royal-tip');
    tip.classList.add('visible');
    tip.setAttribute('aria-hidden', 'false');
  });
  // The card fades/slides in over 0.25s; hit-testing mid-transition
  // still sees the hidden state, so let it settle first.
  await page.waitForTimeout(500);
  const tipBtn = await hitInfo(page, '#royal-tip-close', 'top-right-inward');
  expect(tipBtn.w).toBeGreaterThanOrEqual(40);
  expect(tipBtn.h).toBeGreaterThanOrEqual(40);
  expect(tipBtn.centerHit).toBe(true);
  expect(tipBtn.haloHit).toBe(true);
  await page.locator('#royal-tip-close').tap();
  await expect(page.locator('#royal-tip')).not.toHaveClass(/visible/);
});
