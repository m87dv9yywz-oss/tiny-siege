import {test,expect} from '@playwright/test';
import {MAP_IDS} from '../../src/mapArtwork.js';
import {ENEMY_TYPES,enemyDisplaySize} from '../../src/enemyArtwork.js';
import {ENEMIES} from '../../src/data/enemies.js';
import {heroStage} from '../../src/heroArtwork.js';
const out='docs/qa/v5/rendered';
async function ready(page){await page.setViewportSize({width:844,height:390});await page.goto('./');await page.waitForFunction(()=>window.__tinySiege?.ui.scene?.dynamic);await page.evaluate(()=>document.fonts.ready);await page.locator('#new-profile').tap();await page.locator('#nickname').fill('World Knight');await page.locator('#profile-form button').tap();}
async function tap(page,x,y){const b=await page.locator('canvas').boundingBox();await page.touchscreen.tap(b.x+b.width*x/960,b.y+b.height*y/640);}
for(const map of MAP_IDS)test(`${map}: full real route, legal touch placement, blocked terrain and painted alignment`,async({page})=>{
 test.setTimeout(90000);await ready(page);
 await page.evaluate(map=>window.__tinySiege.kingdom.start(map),map);
 await page.waitForFunction(map=>window.__tinySiege.ui.scene.mapImage?.texture.key===`v5-map-${map}`,map);
 expect(await page.evaluate(()=>window.__tinySiege.ui.scene.battlefieldObjects.length)).toBe(0);
 await page.evaluate(()=>{const{model:g}=window.__tinySiege;g.hero=null;g.active=true;g.wave=1;g.queue=[{at:1e9,type:'basic'}];g.spawn('basic');});
 for(let n=1;n<=12;n++){
  const sample=await page.evaluate(n=>{const g=window.__tinySiege.model,e=g.enemies.find(e=>e.type==='basic');const distance=g.trail.PATH_LENGTH*n/12;let limit=0;while(e?.alive&&e.progress<distance&&limit++<10000)g.update(.1);const p=e?.alive?g.trail.onPath(e.progress):null;return {limit,alive:e?.alive,x:e?.x,y:e?.y,p};},n);
  expect(sample.limit).toBeLessThan(10000);if(sample.p){expect(sample.x).toBeCloseTo(sample.p.x,4);expect(sample.y).toBeCloseTo(sample.p.y,4);}
  if(n===6)await page.screenshot({path:`${out}/map-${map}.png`});
 }
 await expect(page.locator('#lives')).toHaveText('19');
 for(let i=0;i<3;i++){
  const point=await page.evaluate(i=>{const g=window.__tinySiege.model;const p=g.trail.onPath(g.trail.PATH_LENGTH*(.2+i*.3));for(const [dx,dy]of[[70,0],[-70,0],[0,70],[0,-70],[70,70],[-70,-70]])if(!g.canPlace('archer',p.x+dx,p.y+dy))return{x:p.x+dx,y:p.y+dy};for(let y=70;y<600;y+=30)for(let x=40;x<930;x+=30)if(!g.canPlace('archer',x,y))return{x,y};},i);
  expect(point).toBeTruthy();await page.locator('[data-tower="archer"]').tap();await tap(page,point.x,point.y);
  expect(await page.evaluate(()=>window.__tinySiege.model.towers.length)).toBe(i+1);
 }
 await expect(page.locator('#gold')).toHaveText('75');
 const invalid=await page.evaluate(()=>{const g=window.__tinySiege.model,p=g.trail.onPath(g.trail.PATH_LENGTH*.4);return g.canPlace('archer',p.x,p.y);});expect(invalid).toContain('trail');
});
test('stale map downloads cannot overwrite the new adventure, and cached painted maps remain bounded',async({page})=>{
 await ready(page);let release;const gate=new Promise(r=>release=r);
 await page.route('**/maps/map_amber.png',async route=>{await gate;await route.continue();});
 await page.evaluate(()=>window.__tinySiege.kingdom.start('amber'));
 await page.evaluate(()=>window.__tinySiege.kingdom.start('coast'));
 await page.waitForFunction(()=>window.__tinySiege.ui.scene.mapImage?.texture.key==='v5-map-coast');release();
 await page.waitForFunction(()=>window.__tinySiege.ui.scene.textures.exists('v5-map-amber'));
 expect(await page.evaluate(()=>window.__tinySiege.ui.scene.mapImage.texture.key)).toBe('v5-map-coast');
 for(const map of ['crystal','moon','garden','emerald']){await page.evaluate(map=>window.__tinySiege.kingdom.start(map),map);await page.waitForFunction(map=>window.__tinySiege.ui.scene.mapImage?.texture.key===`v5-map-${map}`,map);}
 expect(await page.evaluate(()=>window.__tinySiege.ui.scene.textures.getTextureKeys().filter(k=>k.startsWith('v5-map-')).length)).toBeLessThanOrEqual(2);
});
test('fourteen enemy pictures, armor and boss phases render at controlled sizes and disappear after death',async({page})=>{
 await ready(page);await page.locator('#play').tap();
 await page.evaluate(types=>{const{model:g,ui}=window.__tinySiege;g.reset();ui.helpOpen=true;types.forEach((type,i)=>{const e=g.spawn(type),p=g.trail.onPath(g.trail.PATH_LENGTH*(i+1)/(types.length+1));e.progress=g.trail.PATH_LENGTH*(i+1)/(types.length+1);Object.assign(e,p);});ui.refresh(true);},ENEMY_TYPES);
 await page.waitForFunction(()=>window.__tinySiege.ui.scene.enemySprites.size===14);
 const sprites=await page.evaluate(()=>[...window.__tinySiege.ui.scene.enemySprites].map(([id,s])=>({id,key:s.texture.key,width:s.displayWidth,rotation:s.rotation,visible:s.visible})));
 expect(sprites).toHaveLength(14);for(let i=0;i<14;i++){expect(sprites[i].key).toBe('v5-enemy-'+ENEMY_TYPES[i]);expect(sprites[i].width).toBeCloseTo(enemyDisplaySize(ENEMIES[ENEMY_TYPES[i]].radius),0);expect(sprites[i].rotation).toBe(0);expect(sprites[i].visible).toBe(true);}
 await page.screenshot({path:`${out}/all-enemies.png`});
 await page.evaluate(()=>{const g=window.__tinySiege.model;for(const e of g.enemies.filter(e=>e.boss))g.damage(e,e.maxHealth*.75,{damageType:'physical',penetration:1});});
 await page.waitForTimeout(80);const widths=await page.evaluate(()=>[...window.__tinySiege.ui.scene.enemySprites.values()].map(s=>s.displayWidth));expect(Math.max(...widths)).toBeLessThan(150);
 await page.screenshot({path:`${out}/boss-phases.png`});
 await page.evaluate(()=>{const{model:g,ui}=window.__tinySiege;for(const e of [...g.enemies])g.damage(e,1e7,true);g.enemies=[];ui.helpOpen=false;});await page.waitForFunction(()=>window.__tinySiege.ui.scene.enemySprites.size===0);
});
test('three playable heroes use baby/teen/adult art at existing levels, attack, move, cast and keep pause-safe cooldowns',async({page})=>{
 test.setTimeout(120000);await ready(page);
 for(const type of ['dragon','dinosaur','tiger'])for(const level of [1,4,7]){
  await page.evaluate(({type,level})=>{const{kingdom:k}=window.__tinySiege;k.store.current.heroes.unlocked=['dragon','dinosaur','tiger'];k.store.current.heroes.equipped=type;k.store.current.heroes.xp[type]=80*(level-1)**2;k.start('emerald');},{type,level});
  await page.waitForFunction(({type,stage})=>window.__tinySiege.ui.scene.heroSprite?.texture.key===`v5-hero-${type}-${stage}`,{type,stage:heroStage(level)});
  expect(await page.evaluate(()=>window.__tinySiege.model.hero.level)).toBe(level);
  await expect(page.locator('#hero-icon')).toHaveAttribute('src',new RegExp(`_${heroStage(level)}\\.png$`));
  await page.locator('#hero-move').tap();await tap(page,340,100);
  await page.evaluate(()=>{const g=window.__tinySiege.model;for(let i=0;i<100;i++)g.update(.1);});
  const pos=await page.evaluate(()=>window.__tinySiege.model.hero);expect(pos.x).toBeCloseTo(340,0);expect(pos.y).toBeCloseTo(100,0);
  await page.evaluate(()=>{const g=window.__tinySiege.model;g.moveHero(190,80);for(let i=0;i<100;i++)g.update(.1);g.active=true;g.queue=[{at:1e9,type:'basic'}];const e=g.spawn('brute');let nearest=0,dist=Infinity;for(let d=0;d<g.trail.PATH_LENGTH;d+=5){const p=g.trail.onPath(d),n=Math.hypot(p.x-g.hero.x,p.y-g.hero.y);if(n<dist){nearest=d;dist=n;}}e.progress=nearest;Object.assign(e,g.trail.onPath(nearest));g.update(1);});
  expect(await page.evaluate(()=>window.__tinySiege.model.hero.damage)).toBeGreaterThan(0);
  await page.locator('#hero-ability').tap();const cooldown=await page.evaluate(()=>{const g=window.__tinySiege.model;g.paused=true;return g.hero.abilityLeft;});expect(cooldown).toBeGreaterThan(0);
  await page.evaluate(()=>window.__tinySiege.model.update(5));expect(await page.evaluate(()=>window.__tinySiege.model.hero.abilityLeft)).toBe(cooldown);
  await page.evaluate(()=>{const{model:g,ui}=window.__tinySiege;g.paused=false;ui.helpOpen=true;ui.heroMoving=true;ui.refresh(true);});
  await page.screenshot({path:`${out}/hero-${type}-${heroStage(level)}.png`});await page.evaluate(()=>window.__tinySiege.ui.helpOpen=false);
 }
});
