import { test, expect } from '@playwright/test';

// Owner report (2026-10-18): after the ascension update the battle menus
// still read as solid cream on his phone. Root cause then: a late theme
// rule repainted #selection-panel with an opaque gradient, defeating the
// translucent base rule while the backdrop blur kept "working". These
// assertions read the panel's actual computed background at phone size
// so the transparency cannot silently regress again.
async function ready(page, w = 932, h = 430) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto('./');
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.evaluate(() => document.fonts.ready);
}

async function enterFreeplay(page) {
  await page.locator('#new-profile').tap();
  await page.locator('#nickname').fill('Glass Knight');
  await page.locator('#profile-form button').tap();
  await page.locator('#play').tap();
  await page.locator('[data-freeplay="classic"]').tap();
}

function gradientAlphas(bgImage) {
  return [...bgImage.matchAll(/rgba\([^)]*?,\s*([\d.]+)\)/g)].map((m) => Number(m[1]));
}

test('selection panel and placing chip are genuinely translucent on a phone', async ({ page }) => {
  await ready(page);
  await enterFreeplay(page);
  await page.evaluate(() => {
    const { model: g, ui } = window.__tinySiege;
    g.reset();
    g.gold = 10000;
    ui.selectTower(g.place('archer', 145, 105));
  });
  const panel = await page.locator('#selection-panel').evaluate((el) => {
    const s = getComputedStyle(el);
    return { bgImage: s.backgroundImage, backdrop: s.backdropFilter };
  });
  const alphas = gradientAlphas(panel.bgImage);
  expect(alphas.length).toBeGreaterThan(0);
  expect(Math.max(...alphas)).toBeLessThanOrEqual(0.85);
  expect(panel.backdrop).toContain('blur');

  // The placing chip is mostly its Cancel button; the button itself must
  // let the field show through too.
  await page.evaluate(() => {
    const { ui } = window.__tinySiege;
    ui.placing = 'cannon';
    ui.selected = null;
    ui.refresh(true);
  });
  await expect(page.locator('#selection-panel.placing')).toBeVisible();
  const chip = await page.locator('#selection-panel.placing').evaluate((el) => {
    const s = getComputedStyle(el);
    const btn = getComputedStyle(el.querySelector('.cancel-button'));
    return { bgImage: s.backgroundImage, btnBg: btn.backgroundColor };
  });
  expect(Math.max(...gradientAlphas(chip.bgImage))).toBeLessThanOrEqual(0.85);
  const btnAlpha = Number(chip.btnBg.match(/rgba\([^)]*?,\s*([\d.]+)\)/)?.[1] ?? 1);
  expect(btnAlpha).toBeLessThanOrEqual(0.85);
});
