import {test,expect} from '@playwright/test';
test('Gentle effects caps real cosmetic bursts and preserves kill rewards; Full can be restored',async({page})=>{
 await page.goto('./');await page.waitForFunction(()=>window.__tinySiege?.ui.scene?.dynamic);await page.locator('#play').tap();
 await page.locator('#battle-settings summary').tap();await page.locator('#effects').tap();
 await page.waitForFunction(()=>Object.values(window.__tinySiege.ui.scene.particles).every(e=>e.maxAliveParticles===30));
 // Deliberate render fixture, not an earned campaign or forced-win balance test.
 await page.evaluate(()=>{const g=window.__tinySiege.model;g.active=true;g.queue=[{at:1e9,type:'basic'}];for(let i=0;i<100;i++){const e=g.spawn('sprout');e.progress=800;Object.assign(e,g.trail.onPath(800));g.damage(e,99999,true);}});
 const a=await page.evaluate(()=>{const{model:g,ui}=window.__tinySiege;return {gold:g.gold,kills:g.kills,effects:ui.scene.effects.length,particles:Object.values(ui.scene.particles).map(e=>e.getAliveParticleCount())};});
 expect(a.gold).toBe(700);expect(a.kills).toBe(100);expect(a.effects).toBeLessThanOrEqual(36);expect(a.particles.every(n=>n<=30)).toBe(true);
 await page.locator('#effects').tap();await page.waitForFunction(()=>Object.values(window.__tinySiege.ui.scene.particles).every(e=>e.maxAliveParticles===100));await expect(page.locator('#effects')).toHaveText('Effects: full');
});
