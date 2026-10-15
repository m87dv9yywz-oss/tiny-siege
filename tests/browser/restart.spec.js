import { test, expect } from "@playwright/test";

async function state(page) {
  return page.evaluate(() => {
    const { model: m, ui, kingdom } = window.__tinySiege;
    return JSON.stringify({ gold: m.gold, lives: m.lives, wave: m.wave,
      time: m.waveTime, towers: m.towers, enemies: m.enemies,
      selected: ui.selected, upgradeOpen: ui.upgradeOpen,
      run: kingdom.run, profiles: kingdom.store.data });
  });
}
for (const [width, height] of [[390,844],[844,390],[768,1024],[1024,768],[1440,900]]) {
  test(`Restart requires confirmation and preserves progress on Cancel at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("./");
    await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
    await page.locator("#new-profile").tap();
    await page.locator("#nickname").fill("Restart Knight");
    await page.locator("#profile-form button").tap();
    await page.locator('[data-map="emerald"]').tap();
    await page.locator("#begin-adventure").tap();
    await expect(page.locator("#restart")).toHaveCount(0);
    await page.locator("#battle-settings summary").tap();
    await expect(page.locator("#battle-settings")).not.toContainText("Restart");
    await page.locator("#battle-settings summary").tap();
    await page.locator('[data-tower="archer"]').tap();
    const b = await page.locator("canvas").boundingBox();
    await page.touchscreen.tap(b.x + b.width * 145 / 960, b.y + b.height * 105 / 640);
    await page.locator('[data-upgrade="0"]').tap();
    await page.locator("#start-wave").tap();
    await page.waitForFunction(() => window.__tinySiege.model.enemies.length > 0);
    await page.locator("#leave-run").tap();
    const before = await state(page);
    await page.locator("#restart").tap();
    await expect(page.locator("#modal")).toContainText("Restart this battle? Your current battle progress will be lost.");
    await expect(page.locator("#cancel-restart")).toBeFocused();
    expect(await state(page)).toBe(before);
    await page.screenshot({ path: `test-results/restart-confirm-${width}x${height}.png` });
    await page.locator("#cancel-restart").tap();
    await expect(page.locator("#modal")).toBeHidden();
    expect(await page.evaluate(() => window.__tinySiege.model.paused)).toBe(false);
    await expect(page.locator("#selection-panel")).toBeVisible();
    // Paused battles must remain paused, including Escape/default dismissal.
    await page.locator("#pause").tap();
    const frozen = await state(page);
    await page.locator("#leave-run").tap();
    await page.locator("#restart").tap();
    await page.keyboard.press("Escape");
    expect(await state(page)).toBe(frozen);
    expect(await page.evaluate(() => window.__tinySiege.model.paused)).toBe(true);
    await page.locator("#leave-run").tap();
    await page.locator("#restart").tap();
    await page.locator("#cancel-restart").tap();
    expect(await state(page)).toBe(frozen);
    const permanent = await page.evaluate(() => JSON.stringify(window.__tinySiege.kingdom.store.current));
    await page.locator("#leave-run").tap();
    await page.locator("#restart").tap();
    await page.locator("#confirm-restart").tap();
    await expect(page.locator("#wave")).toHaveText("0");
    await expect(page.locator("#gold")).toHaveText("300");
    await expect(page.locator("#lives")).toHaveText("20");
    expect(await page.evaluate(() => window.__tinySiege.model.towers.length)).toBe(0);
    expect(await page.evaluate(() => JSON.stringify(window.__tinySiege.kingdom.store.current))).toBe(permanent);
    // Reload resumes the new checkpoint, never the discarded battle.
    await page.reload();
    await page.locator("#continue-battle").tap();
    await expect(page.locator("#wave")).toHaveText("0");
    await expect(page.locator("#gold")).toHaveText("300");
  });
}
