import {test,expect} from '@playwright/test';
// End-screen fixtures are isolated local profiles, not earned campaign evidence.
for(const[width,height]of[[375,812],[390,844],[667,375],[844,390],[932,430],[768,1024],[1024,768],[1440,900]])test(`illustrated navigation, battle dialogs and reward screens fit ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto('./');await page.waitForFunction(()=>window.__tinySiege?.ui.scene?.dynamic);await page.evaluate(()=>document.fonts.ready);
 const fit=async(selector='.modal-card')=>{await expect(page.locator(selector)).toBeVisible();await expect.poll(()=>page.locator(selector).evaluate(e=>Math.max(e.scrollHeight-e.clientHeight,e.scrollWidth-e.clientWidth))).toBeLessThanOrEqual(1);};
 await page.locator('#new-profile').tap();await page.locator('#nickname').fill('Menu Knight');await page.locator('#profile-form button').tap();await fit('.home-card');
 await page.locator('[data-map="emerald"]').tap();await fit('.adventure-card');await page.locator('#back').tap();
 await page.locator('#heroes').tap();await fit('.hero-card');await page.locator('#back').tap();
 await page.locator('#relics').tap();await fit('.relic-card');await page.locator('[data-relic-info="purse"]').tap();await fit();await expect(page.locator('.modal-card')).toContainText('+25 starting battle gold');await page.locator('#close-relic-info').tap();await page.locator('#back').tap();
 await page.locator('#play').tap();await page.locator('[data-freeplay="classic"]').tap();await page.locator('#leave-run').tap();await fit();await page.locator('#restart').tap();await fit();await expect(page.locator('#cancel-restart')).toBeFocused();await page.locator('#cancel-restart').tap();
 await page.evaluate(()=>{const{model:g,kingdom:k}=window.__tinySiege;k.start('emerald');g.wave=g.totalWaves;for(const metrics of Object.values(g.participation))Object.assign(metrics,{time:120,damage:1000,kills:3,armor:20,control:20});g.finish('victory');});
 await expect(page.locator('.reward-summary')).toBeVisible();await fit();await page.locator('#main-menu').tap();await fit('.home-card');
 await page.locator('#play').tap();await page.locator('[data-freeplay="classic"]').tap();await page.evaluate(()=>window.__tinySiege.model.finish('defeat'));await fit();await page.locator('#main-menu').tap();await fit('.home-card');
});
