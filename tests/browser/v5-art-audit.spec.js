import {test,expect} from '@playwright/test';
import {TOWER_TYPES,TOWER_STATES} from '../../src/towerArtwork.js';
import {TOWERS,towerStats} from '../../src/data/towers.js';
const out='docs/qa/v5/rendered';
async function ready(page,w=844,h=390){await page.setViewportSize({width:w,height:h});await page.goto('./');await page.waitForFunction(()=>window.__tinySiege?.ui.scene?.dynamic);await page.evaluate(()=>document.fonts.ready);}
async function world(page,x,y){const b=await page.locator('canvas').boundingBox();await page.touchscreen.tap(b.x+b.width*x/960,b.y+b.height*y/640);}
for(const type of TOWER_TYPES) test(`all 25 ${type} paid upgrade appearances, portraits, stats and touch hitboxes`,async({page})=>{
 test.setTimeout(180000);await ready(page);await page.locator('#play').tap();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const water=!!TOWERS[type].waterOnly,px=water?285:145,py=water?235:105;
 for(const state of TOWER_STATES){
  // Deliberate UI fixture, not a funded campaign: enough gold to inspect each state.
  // Water-only towers are audited on Twin Ponds, placed in its north pond.
  await page.evaluate(({type,water,px,py})=>{const{model:g,ui}=window.__tinySiege;if(water)g.configure({map:'twinponds',difficulty:'medium'});g.reset();g.gold=10000;ui.selectTower(g.place(type,px,py));},{type,water,px,py});
  const tiers=state.split('-').map(Number);
  for(let p=0;p<3;p++)for(let n=0;n<tiers[p];n++)await page.locator(`[data-upgrade="${p}"]`).tap();
  const spent=TOWERS[type].cost+tiers.reduce((sum,tier)=>sum+TOWERS[type].prices.slice(0,tier).reduce((a,b)=>a+b,0),0);
  await expect(page.locator('#gold')).toHaveText(String(10000-spent));
  await expect(page.locator('.tower-portrait')).toHaveAttribute('src',new RegExp(`${type}_${state}\\.png$`));
  await page.waitForFunction(({type,state})=>{const{model,ui}=window.__tinySiege;return ui.scene.towerSprites.get(model.towers[0].id)?.texture.key===`v5-${type}-${state}`},{type,state});
  await expect.poll(()=>page.locator('.tower-portrait').evaluate(i=>i.complete&&i.naturalWidth===512)).toBe(true);
  const actual=await page.evaluate(()=>{const{model,ui}=window.__tinySiege,t=model.towers[0],s=ui.scene.towerSprites.get(t.id);return {paths:t.paths,width:s.displayWidth,height:s.displayHeight,origin:[s.originX,s.originY],stats:model.stats?model.stats(t):null};});
  const expected=towerStats({type,paths:tiers});
  await expect(page.locator('#selection-panel .stats b')).toHaveText([String(expected.damage),String(expected.range),(1/expected.cooldown).toFixed(1)]);
  expect(actual.paths).toEqual(tiers);expect(actual.width).toBe(80);expect(actual.height).toBe(80);expect(actual.origin).toEqual([.5,.96]);
  await page.locator('#targeting').selectOption('STRONG');
  expect(await page.evaluate(()=>window.__tinySiege.model.towers[0].targeting)).toBe('STRONG');
  const b=await page.locator('canvas').boundingBox();
  await page.screenshot({path:`${out}/towers/${type}-${state}.png`,clip:{x:b.x+b.width*(px-45)/960,y:b.y+b.height*(py-90)/640,width:b.width*90/960,height:b.height*110/640}});
  if(state==='3-1-0')await page.screenshot({path:`${out}/tower-${type}-ultimate.png`});
  await page.locator('#close-panel').tap();await world(page,px,py-15);await expect(page.locator('#selection-panel')).toBeVisible();
  await page.locator('#sell').tap();await page.locator('#confirm-sell').tap();await expect(page.locator('#gold')).toHaveText(String(10000-spent+Math.floor(spent*.7)));
 }
 expect(errors).toEqual([]);
});

test('cold start requests only base tower textures and menu thumbnails; scene input waits for real assets',async({page})=>{
 const requests=[];page.on('request',r=>requests.push(r.url()));await ready(page);
 expect(new Set(requests.filter(u=>u.includes('/battlefield_256/')&&u.includes('/towers/'))).size).toBe(9);
 expect(requests.filter(u=>u.includes('/towers/')&&u.includes('/card_512/'))).toHaveLength(0);
 expect(requests.filter(u=>/\/maps\/map_.*\.png/.test(u))).toHaveLength(1);
 await page.locator('#new-profile').tap();await page.locator('#nickname').fill('Cold Knight');await page.locator('#profile-form button').tap();
 await expect(page.locator('#play-adventure')).toBeVisible();await page.locator('#play-adventure').tap();await expect(page.locator('#begin-adventure')).toBeVisible();
 // The prep screen warms exactly its own map's art (the battle-start
 // pop-in fix) — still never the whole map collection.
 expect(new Set(requests.filter(u=>/\/maps\/map_.*\.png/.test(u)).map(u=>u.split('/').pop()))).toEqual(new Set(['map_classic.png','map_emerald.png']));
 await page.locator('#begin-adventure').tap();await page.locator('[data-tower="archer"]').tap();await world(page,145,105);await expect(page.locator('#gold')).toHaveText('225');
});

// The model upgrades immediately; touch must still hit the currently drawn art
// while the replacement PNG is in flight.
test('selecting a tower while its upgrade picture downloads uses its visible texture',async({page})=>{
 await ready(page);await page.locator('#play').tap();const messages=[];
 page.on('console',m=>{if(/texture.*(not found|missing)|no texture/i.test(m.text()))messages.push(m.text());});
 let release;const gate=new Promise(r=>release=r);
 await page.route('**/archer/battlefield_256/archer_1-0-0.png',async route=>{await gate;await route.continue();});
 await page.locator('[data-tower="archer"]').tap();await world(page,145,105);
 await page.locator('[data-upgrade="0"]').tap();await page.locator('#close-panel').tap();await world(page,145,90);
 await expect(page.locator('#selection-panel')).toBeVisible();expect(messages).toEqual([]);
 release();await page.waitForFunction(()=>window.__tinySiege.ui.scene.towerSprites.get(1)?.texture.key==='v5-archer-1-0-0');
});
