import {test,expect} from '@playwright/test';
async function ready(page){await page.goto('./');await page.waitForFunction(()=>window.__tinySiege?.ui.scene?.dynamic);}
async function profile(page){await page.locator('#new-profile').tap();await page.locator('#nickname').fill('Fun Knight');await page.locator('#profile-form button').tap();}
async function reveal(page,target='#gold'){const b=await page.locator(target).boundingBox();for(let i=0;i<5;i++)await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await expect(page.locator('#cheat-close')).toBeVisible();}
async function snapshot(page){return page.evaluate(()=>{const{model:g,kingdom:k}=window.__tinySiege;return JSON.stringify({gold:g.gold,wave:g.wave,towers:g.towers,profiles:k.store.data,run:k.run});});}
test('fun codes need the deliberate reveal, then apply instantly; gold keeps the adventure fully real',async({page})=>{
 await ready(page);await profile(page);await page.locator('[data-map="emerald"]').tap();await page.locator('#begin-adventure').tap();
 await page.evaluate(()=>{const{kingdom}=window.__tinySiege;kingdom.saveBattle();});
 const before=await snapshot(page);
 for(let i=0;i<4;i++)await page.locator('#gold').tap();await expect(page.locator('#cheat-close')).toHaveCount(0);expect(await snapshot(page)).toBe(before);
 await page.locator('#gold').tap();await expect(page.locator('#cheat-close')).toBeVisible();
 // No warning/confirmation step any more: one tap on the code applies it.
 await page.locator('#cheat-gold').tap();await expect(page.locator('#modal')).toBeHidden();await expect(page.locator('#confirm-cheat')).toHaveCount(0);
 await expect(page.locator('#gold')).toHaveText('10300');await expect(page.locator('#sync-status')).not.toContainText('Just for fun');
 await reveal(page);await page.locator('#cheat-waves').tap();await expect(page.locator('#wave')).toHaveText('10');
 expect(await page.evaluate(()=>window.__tinySiege.model.skippedWaves)).toBe(10);
 // The run stayed real: an honest finish pays out and completes the map.
 const crownsBefore=await page.evaluate(()=>Object.values(window.__tinySiege.kingdom.store.data.profiles)[0].profile.crowns);
 await page.evaluate(()=>{const{model:g}=window.__tinySiege;g.wave=g.totalWaves;g.finish('victory');});
 await expect(page.locator('#modal')).toContainText('Crowns');
 const after=await page.evaluate(()=>Object.values(window.__tinySiege.kingdom.store.data.profiles)[0].profile);
 expect(after.completedMaps).toContain('emerald');
 expect(after.crowns).toBeGreaterThan(crownsBefore);
});
test('cheat progress persists in the normal checkpoint across a reload',async({page})=>{
 await ready(page);await profile(page);await page.locator('[data-map="emerald"]').tap();await page.locator('#begin-adventure').tap();
 await reveal(page);await page.locator('#cheat-gold').tap();await expect(page.locator('#gold')).toHaveText('10300');
 await reveal(page);await page.locator('#cheat-waves').tap();await expect(page.locator('#wave')).toHaveText('10');
 await page.evaluate(()=>{const{kingdom}=window.__tinySiege;kingdom.saveBattle();});
 await page.reload();await page.waitForFunction(()=>window.__tinySiege?.ui.scene);await page.locator('#continue-battle').tap();await expect(page.locator('#wave')).toHaveText('10');await expect(page.locator('#gold')).toHaveText('10300');
});
test('cosmetic skywriting preserves navigation and never exposes unsupported heroes',async({page})=>{
 await ready(page);await reveal(page,'.menu-icon');await expect(page.locator('#cheat-gold')).toBeDisabled();await page.locator('#cheat-jackson').tap();await expect(page.locator('.skywriting')).toContainText('JACKSON');await expect(page.locator('#new-profile')).toBeVisible();
 await reveal(page,'.menu-icon');await page.locator('#cheat-luke').tap();await expect(page.locator('.skywriting').last()).toContainText('LUKE');await profile(page);await page.locator('#heroes').tap();await expect(page.locator('[data-hero]')).toHaveCount(3);await expect(page.locator('.v5-hero-card.is-locked')).toHaveCount(3);
});
test('wave skips keep the adventure real: skipped waves earn nothing and an honest finish completes it',async({page})=>{
 await ready(page);await profile(page);await page.locator('[data-map="emerald"]').tap();await page.locator('#begin-adventure').tap();
 await reveal(page);await page.locator('#cheat-waves').tap();
 await expect(page.locator('#wave')).toHaveText('10');
 await expect(page.locator('#sync-status')).not.toContainText('Just for fun');
 expect(await page.evaluate(()=>window.__tinySiege.model.skippedWaves)).toBe(10);
 const crownsBefore=await page.evaluate(()=>Object.values(window.__tinySiege.kingdom.store.data.profiles)[0].profile.crowns);
 await page.evaluate(()=>{const{model:g}=window.__tinySiege;g.wave=g.totalWaves;g.finish('victory');});
 await expect(page.locator('#modal')).toContainText('Crowns');
 const after=await page.evaluate(()=>Object.values(window.__tinySiege.kingdom.store.data.profiles)[0].profile);
 expect(after.completedMaps).toContain('emerald');
 expect(after.crowns).toBeGreaterThan(crownsBefore);
});
test('holding Play toggles auto waves; a lost life switches auto off',async({page})=>{
 await ready(page);await page.locator('#play').tap();
 const box=await page.locator('#start-wave').boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(750);await page.mouse.up();
 await expect(page.locator('#start-wave')).toContainText('AUTO');
 expect(await page.evaluate(()=>window.__tinySiege.model.autoWave)).toBe(true);
 await page.evaluate(()=>{const{model:g}=window.__tinySiege;g.startWave();const e=g.spawn('basic');e.progress=g.trail.PATH_LENGTH-1;g.enemies=[e];g.queue=[];g.update(0.1);});
 expect(await page.evaluate(()=>window.__tinySiege.model.autoWave)).toBe(false);
 expect(await page.evaluate(()=>window.__tinySiege.model.lives)).toBe(19);
 await expect(page.locator('#toast')).toContainText('Auto waves off');
});
test('isolated taps outside the secret gesture window cannot open fun codes',async({page})=>{
 await ready(page);await page.locator('#play').tap();
 for(let i=0;i<4;i++)await page.locator('#gold').tap();
 await page.waitForTimeout(3100);await page.locator('#gold').tap();
 await expect(page.locator('#cheat-close')).toHaveCount(0);
 await expect(page.locator('#gold')).toHaveText('300');
});
