// Isolated release verification: shipped UI, synthetic guest save fixtures only.
// Never signs into a real account or writes production Firestore documents.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { freshProfile, validateProfile } from '../src/progression/profiles.js';
const url = process.argv[2] || 'http://127.0.0.1:4173/tiny-siege/';
const legacy = freshProfile('Returning Knight');
legacy.schemaVersion = 1;
delete legacy.towerXP.grove;
delete legacy.unlockedUpgrades.grove;
legacy.crowns = 240;
legacy.towerXP.archer = { earned: 900, spent: 180 };
legacy.unlockedUpgrades.archer = [2, 1, 1];
legacy.completedMaps = ['emerald'];
legacy.mapStars = { emerald: 3 };
legacy.statistics.wins = 1;
legacy.statistics.waves = 14;
assert.ok(validateProfile(legacy));
const fixture = { version: 1, selected: 'legacy-release-fixture', profiles: {
  'legacy-release-fixture': { profile: legacy, pending: [], remoteRevision: null },
}, cloud: {} };
const browser = await chromium.launch(process.env.PLAYWRIGHT_USE_BUNDLED ? {} : {
  executablePath: '/usr/bin/chromium', args: ['--no-sandbox'],
});
mkdirSync('test-results/live-v31', { recursive: true });
try {
  for (const [width, height] of [[375,812],[390,844],[844,390],[768,1024],[1024,768],[1280,720],[1440,900]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    // A representative pre-existing local save, never a production player's data.
    await context.addInitScript(({ fixture }) => {
      if (!localStorage.getItem('tiny-siege-profiles-v3'))
        localStorage.setItem('tiny-siege-profiles-v3', JSON.stringify(fixture));
    }, { fixture });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(url + '?release=ea71c7a');
    assert.equal(response.status(), 200);
    await page.locator('.profile-choice.chosen').waitFor();
    assert.equal(await page.evaluate(() => typeof window.__tinySiege), 'undefined');
    assert.match(await page.locator('.profile-choice.chosen').textContent(), /Returning Knight.*240/s);
    assert.equal(await page.locator('.map-choice').count(), 4);
    assert.equal(await page.locator('[data-map="emerald"] .cleared').textContent(), '★★★');
    assert.equal(await page.locator('[data-map="garden"] .new').textContent(), 'NEW');
    const fits = async selector => assert.ok(await page.locator(selector).evaluate(e => e.scrollHeight <= e.clientHeight + 2), selector + ' must fit');
    await fits('.home-card');
    await page.locator('#collection').tap();
    assert.match(await page.locator('.collection-grid').textContent(), /720 XP available/);
    await page.locator('[data-unlock-path="archer:0"]').tap();
    assert.match(await page.locator('.collection-grid').textContent(), /220 XP available/);
    assert.match(await page.locator('.collection-grid').textContent(), /Evolution unlocked/);
    await page.locator('[data-collection="grove"]').tap();
    await page.locator('[data-unlock-tower="grove"]').tap();
    assert.match(await page.locator('#modal-title').textContent(), /150 Crowns/);
    await fits('.collection-card');
    await page.locator('[data-collection-tree="grove"]').tap();
    for (const [path, name] of ['Thorn Sentinel', 'Seedburst Orchard', 'Elderwood Guardian'].entries()) {
      await page.locator(`[data-guide-path="${path}"]`).tap();
      assert.match(await page.locator('.guide-tiers').textContent(), new RegExp(name));
      assert.deepEqual(await page.locator('.guide-price').allTextContents(), ['140 gold','330 gold','820 gold']);
      assert.ok(await page.locator('.guide-tier dl dd').count() > 0);
      await fits('.tree-card');
    }
    await page.screenshot({ path: `test-results/live-v31/blueprint-${width}.png` });
    await page.locator('#close-guide').tap();
    await page.locator('#back').tap();
    await page.reload();
    await page.locator('.profile-choice.chosen').waitFor();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tiny-siege-profiles-v3')).profiles['legacy-release-fixture'].profile);
    assert.equal(saved.schemaVersion, 2);
    assert.equal(saved.crowns, 150);
    assert.deepEqual(saved.towerXP.archer, { earned: 900, spent: 680 });
    assert.deepEqual(saved.unlockedUpgrades.archer, [3, 1, 1]);
    assert.deepEqual(saved.mapStars, legacy.mapStars);
    assert.ok(saved.unlockedTowers.includes('grove'));
    await page.locator('[data-map="garden"]').tap();
    assert.equal(await page.locator('.wave-counter em').textContent(), ' / 18');
    assert.equal(await page.locator('#kingdom-crowns').textContent(), '150');
    await page.locator('[data-tower="grove"]').tap();
    const board = await page.locator('canvas').boundingBox();
    assert.ok(Math.abs(board.width / board.height - 1.5) < .01);
    await page.touchscreen.tap(board.x + board.width * 145 / 960, board.y + board.height * 105 / 640);
    await page.waitForFunction(() => document.querySelector('#gold').textContent === '185');
    await page.locator('[data-upgrade="0"]').tap();
    await page.waitForFunction(() => document.querySelector('#gold').textContent === '45');
    await page.locator('#start-wave').tap();
    assert.ok(await page.locator('#selection-panel').isVisible());
    await page.locator('#pause').tap();
    assert.ok(await page.locator('#selection-panel').isVisible());
    await fits('#selection-panel');
    const hud = await page.locator('.hud').boundingBox();
    assert.ok(hud.y >= 8);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 2));
    await page.screenshot({ path: `test-results/live-v31/garden-${width}.png` });
    await page.locator('#full-tree').tap();
    assert.equal(await page.locator('.guide-tier').count(), 3);
    await page.locator('#close-guide').tap();
    await page.locator('#leave-run').tap();
    await page.locator('#keep-playing').tap();
    assert.ok(await page.locator('#selection-panel').isVisible());
    await page.locator('#leave-run').tap();
    await page.locator('#confirm-leave').tap();
    await page.locator('.home-card').waitFor();
    await page.locator('#parent-cloud').tap();
    assert.match(await page.locator('#modal').textContent(), /Google/);
    await page.waitForFunction(() => !document.querySelector('#google-sign-in').disabled);
    assert.deepEqual(errors, []);
    console.log(`LIVE ${width}x${height}: legacy save preserved, Crown purchase persisted, Grove placement/upgrade, three blueprints, garden18, panel persistence, safe HUD, no scrolling, parent Google entry passed`);
    await context.close();
  }
  console.log(`Confirmed v3.1-specific production features at ${url}. Real Google consent/cloud documents were not exercised; synchronization is covered separately by emulators and verified production rules.`);
} finally { await browser.close(); }
