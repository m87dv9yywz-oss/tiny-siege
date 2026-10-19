import { test, expect } from '@playwright/test';

// Owner report (2026-10-18): after the ascension update the battle menus
// still read as solid cream on his phone. Round 1 root cause: a late
// theme rule repainted #selection-panel opaque. Round 3 root cause: the
// panel gradient was translucent (0.80/0.74) but the panel's CHILDREN —
// the three .path cards — were solid #fff8de covering almost the whole
// panel, so the painted panel was ~95% opaque pixels while a
// computed-style assertion on the panel alone kept passing. Round 4:
// 0.55/0.47 was "better but could be more transparent", so the panel
// went to 0.32/0.26, path cards to 0.32, cancel button to 0.35, and
// these bounds tightened to <= 0.40 accordingly. These tests assert BOTH
// the computed alphas (panel, path cards, cancel button) AND the
// rendered pixels: the terrain under the Cancel button must still
// correlate with itself once the chip is dismissed.
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

// The battlefield under the panel, photographed twice — panel closed
// and panel open — keeps its broad brightness pattern when (and only
// when) the card over it is genuinely translucent: the blurred terrain
// still correlates cell-by-cell. An opaque card paints flat cream and
// the correlation collapses to ~0. Cell means (16px) wash out text and
// icon detail so the metric tracks the card paint, not its contents.
async function terrainCorrelation(page, closedPng, openPng) {
  const args = {
    closed: closedPng.toString('base64'),
    open: openPng.toString('base64'),
  };
  return page.evaluate(async ({ closed, open }) => {
    async function cells(b64) {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      const cell = 16;
      const cols = Math.floor(c.width / cell),
        rows = Math.floor(c.height / cell);
      const means = [];
      for (let r = 0; r < rows; r++) {
        for (let col = 0; col < cols; col++) {
          let sum = 0,
            n = 0;
          for (let y = r * cell; y < (r + 1) * cell; y++) {
            for (let x = col * cell; x < (col + 1) * cell; x++) {
              const i = (y * c.width + x) * 4;
              sum +=
                0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
              n++;
            }
          }
          means.push(sum / n);
        }
      }
      return means;
    }
    const a = await cells(closed);
    const b = await cells(open);
    const ma = a.reduce((s, v) => s + v, 0) / a.length;
    const mb = b.reduce((s, v) => s + v, 0) / b.length;
    let cov = 0,
      va = 0,
      vb = 0;
    for (let i = 0; i < a.length; i++) {
      cov += (a[i] - ma) * (b[i] - mb);
      va += (a[i] - ma) ** 2;
      vb += (b[i] - mb) ** 2;
    }
    return cov / Math.sqrt(va * vb || 1);
  }, args);
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
  expect(Math.max(...alphas)).toBeLessThanOrEqual(0.4);
  expect(panel.backdrop).toContain('blur');

  // The path cards are children of the panel and cover most of it —
  // their own paint must be translucent, not just the panel's.
  const cardBg = await page
    .locator('#selection-panel .path')
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  const cardAlpha = Number(cardBg.match(/rgba\([^)]*?,\s*([\d.]+)\)/)?.[1] ?? 1);
  expect(cardAlpha).toBeLessThanOrEqual(0.4);

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
  expect(Math.max(...gradientAlphas(chip.bgImage))).toBeLessThanOrEqual(0.4);
  const btnAlpha = Number(chip.btnBg.match(/rgba\([^)]*?,\s*([\d.]+)\)/)?.[1] ?? 1);
  expect(btnAlpha).toBeLessThanOrEqual(0.4);

  // Pixel truth: photograph the ground under the Cancel button with
  // the chip open, then dismissed — the terrain's brightness pattern
  // must survive through the button paint (see terrainCorrelation).
  // Measured with the fade settled: ~0.79 at round-4 alphas
  // (cancel 0.35); the opaque negative control (opaque gradient image
  // over a translucent background-color) collapses to ~0.037.
  const btn = page.locator('#selection-panel .cancel-button');
  // The panel fades in from opacity .3 over 160ms (v5-panel-enter);
  // photographing mid-fade would measure the animation, not the paint.
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector('#selection-panel')).opacity === '1',
  );
  const box = await btn.boundingBox();
  const clip = {
    x: box.x + 4,
    y: box.y + 4,
    width: box.width - 8,
    height: box.height - 8,
  };
  const openShot = await page.screenshot({ clip });
  await page.evaluate(() => {
    const { ui } = window.__tinySiege;
    ui.placing = null;
    ui.refresh(true);
  });
  const closedShot = await page.screenshot({ clip });
  const corr = await terrainCorrelation(page, closedShot, openShot);
  expect(corr).toBeGreaterThan(0.3);
});
