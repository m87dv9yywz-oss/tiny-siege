import { test, expect } from '@playwright/test';
async function ready(page, width=844, height=390) {
  await page.setViewportSize({width,height});
  await page.goto('./');
  await page.waitForFunction(()=>window.__tinySiege?.ui.scene?.dynamic);
  await page.locator('#play').tap();
}
async function tap(page,x,y) {
  const r=await page.locator('canvas').boundingBox();
  await page.touchscreen.tap(r.x+r.width*x/960,r.y+r.height*y/640);
}
async function capture(page,name) {
  await page.waitForTimeout(220);
  await page.screenshot({animations: "disabled", path:`docs/artwork/mobile-battlefield/${name}.png`});
}
test('large landscape map, opposite panels, paid artwork upgrades and live wave controls',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await ready(page);
  const before=await page.locator('canvas').boundingBox();
  expect(before.width).toBeGreaterThanOrEqual(530);
  expect(before.width/before.height).toBeCloseTo(1.5,2);
  await capture(page,'after-landscape');
  await page.locator('[data-tower="archer"]').tap();
  await capture(page,'placement-landscape');
  await tap(page,145,105);
  await expect(page.locator('#selection-panel')).toHaveAttribute('data-side','right');
  await capture(page,'panel-right');
  // Place a second legal tower and tap its visible roof while the first panel is open.
  await page.evaluate(()=>{window.__tinySiege.model.place('archer',520,100)});
  await tap(page,520,60);
  await expect(page.locator('#selection-panel')).toHaveAttribute('data-side','left');
  const after=await page.locator('canvas').boundingBox();
  expect(after).toEqual(before);
  await page.locator('#sell').tap();
  await page.locator('[data-tower="archer"]').tap();await tap(page,820,110);
  await expect(page.locator('#selection-panel')).toHaveAttribute('data-side','left');
  await capture(page,'panel-left');
  await page.locator('[data-upgrade="0"]').tap();
  await expect(page.locator('.tower-portrait')).toHaveAttribute('src',/archer_1-0-0\.png$/);
  await page.waitForFunction(()=>{
    const{ui}=window.__tinySiege;return ui.scene.towerSprites.get(ui.selected)?.texture.key==='v5-archer-1-0-0';
  });
  await capture(page,'upgraded-panel-left');
  await page.locator('#start-wave').tap();
  await page.waitForFunction(()=>window.__tinySiege.model.enemies.length>0);
  await expect(page.locator('#selection-panel')).toBeVisible();
  await capture(page,'active-wave-panel');
  await page.locator('#speed').tap();
  await page.locator('#pause').tap();
  await expect(page.locator('#selection-panel')).toBeVisible();
  expect(await page.evaluate(()=>window.__tinySiege.model.paused)).toBe(true);
  await page.locator('#pause').tap();
  await tap(page,900,590);
  await expect(page.locator('#selection-panel')).toBeHidden();
  expect(errors).toEqual([]);
});
for(const [width,height]of[[932,430],[740,360],[667,375],[390,844],[375,812],[768,1024],[1024,768],[1280,720],[1440,900]])
 test(`responsive board and usable shop/control targets ${width}×${height}`,async({page})=>{
   await ready(page,width,height);
   const r=await page.locator('canvas').boundingBox();
   expect(r.width/r.height).toBeCloseTo(1.5,2);
   expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);
   expect(r.x+r.width).toBeLessThanOrEqual(width);expect(r.y+r.height).toBeLessThanOrEqual(height);
   for(const selector of ['#pause','#speed','#start-wave','#battle-settings summary', '[data-tower="archer"]','[data-tower="rune"]']){
     const b=await page.locator(selector).boundingBox();
     expect(b.x,selector).toBeGreaterThanOrEqual(0);
     expect(b.x+b.width,selector).toBeLessThanOrEqual(width);
     expect(b.height,selector).toBeGreaterThanOrEqual(44);
     expect(b.width,selector).toBeGreaterThanOrEqual(44);
     expect(b.y+b.height,selector).toBeLessThanOrEqual(height);
   }
   expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   for(const card of await page.locator('[data-tower]').all()) {
     const c=await card.boundingBox(), price=await card.locator('.tower-cost').boundingBox();
     expect(price.y+price.height).toBeLessThanOrEqual(c.y+c.height+1);
   }
   await page.locator('[data-tower="archer"]').tap();await tap(page,145,105);
   await expect(page.locator('#selection-panel')).toBeVisible();
   if([390,768,1024,1440,667,932].includes(width)) await capture(page,`selected-${width}x${height}`);
 });
test('repeated live orientation changes retain world coordinates, selection and placement',async({page})=>{
 await ready(page,390,844);
 await page.locator('[data-tower="archer"]').tap();await tap(page,145,105);
 for(const [width,height]of[[844,390],[390,760],[932,430],[375,812],[740,360]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>window.dispatchEvent(new Event('orientationchange')));
   await expect.poll(async()=>{const b=await page.locator('canvas').boundingBox();return Math.abs(b.width/b.height-1.5)}).toBeLessThan(.005);
   await page.locator('#close-panel').tap();
   await tap(page,145,65);
   await expect(page.locator('#selection-panel')).toBeVisible();
   expect(await page.evaluate(()=>window.__tinySiege.ui.selected)).toBe(1);
 }
 await page.locator('[data-tower="cannon"]').tap();await tap(page,342,263);
 expect(await page.evaluate(()=>window.__tinySiege.model.towers.map(t=>[t.type,Math.round(t.x),Math.round(t.y)]))).toEqual([['archer',145,105],['cannon',342,263]]);
});
test('hero rails keep the enlarged map and active ability controls preserve upgrades',async({page})=>{
 await page.setViewportSize({width:844,height:390});await page.goto('./');
 await page.waitForFunction(()=>window.__tinySiege?.ui.scene?.dynamic);
 await page.locator('#new-profile').tap();await page.locator('#nickname').fill('Hero Layout Knight');
 await page.locator('#profile-form button').tap();await page.locator('[data-map="emerald"]').tap();
 await page.locator('#begin-adventure').tap();
 const r=await page.locator('canvas').boundingBox();expect(r.width).toBeGreaterThanOrEqual(530);
 await page.locator('[data-tower="archer"]').tap();await tap(page,190,80);
 await page.locator('#start-wave').tap();await page.locator('#hero-ability').tap();
 await expect(page.locator('#selection-panel')).toBeVisible();
 await capture(page,'hero-wave-panel');
 for(const q of ['#hero-move','#hero-ability','[data-tower="rune"]']){
   const b=await page.locator(q).boundingBox();expect(b.height).toBeGreaterThanOrEqual(44);
   expect(b.y+b.height).toBeLessThanOrEqual(390);
 }
 await page.locator('[data-tower="archer"]').tap();await tap(page,820,110);
 for(const [width,height] of [[1024,768],[1440,900]]) {
   await page.setViewportSize({width,height});
   await page.locator('#close-panel').tap();await tap(page,820,70);
   await expect(page.locator('#selection-panel')).toHaveAttribute('data-side','left');
   for(const selector of ['#hero-move','#hero-ability','#pause','#speed','#start-wave']) {
     expect(await page.locator(selector).evaluate(e=>{
       const r=e.getBoundingClientRect();
       const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
       return hit===e||e.contains(hit);
     }), selector).toBe(true);
   }
 }
 await page.locator('#hero-move').tap();await tap(page,340,100);
 await expect.poll(()=>page.evaluate(()=>window.__tinySiege.ui.heroMoving)).toBe(false);
});
