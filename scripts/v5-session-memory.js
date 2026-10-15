// Six isolated development battles; free-gold stress fixture, never balance evidence.
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 await page.goto('http://127.0.0.1:5173/tiny-siege/');await page.waitForFunction(()=>window.__tinySiege?.ui.scene?.dynamic);await page.locator('#play').tap();const samples=[];
 for(const map of ['emerald','amber','moon','garden','crystal','coast']){
  await page.evaluate(map=>{const{model:g,ui}=window.__tinySiege;g.configure({map});ui.restart();g.gold=100000;for(const type of ['archer','cannon','frost','fire','lightning','grove','wind','rune']){let t;for(let y=90;y<600&&!t;y+=60)for(let x=70;x<900&&!t;x+=60)if(!g.canPlace(type,x,y))t=g.place(type,x,y);if(!t)throw Error('Missing stress placement');for(let n=0;n<3;n++)g.upgrade(t.id,0);}},map);
  await page.waitForFunction(map=>{const{ui,model:g}=window.__tinySiege,s=ui.scene;return s.mapImage?.texture.key===`v5-map-${map}`&&s.towerSprites.size===8&&g.towers.every(t=>s.towerSprites.get(t.id)?.texture.key===`v5-${t.type}-3-0-0`)&&s.artLoads?.size===0;},map);
  await cdp.send('HeapProfiler.collectGarbage');const metrics=await cdp.send('Performance.getMetrics');const heap=metrics.metrics.find(m=>m.name==='JSHeapUsedSize').value;
  const state=await page.evaluate(()=>{const s=window.__tinySiege.ui.scene;return {maps:s.textures.getTextureKeys().filter(k=>k.startsWith('v5-map-')).length,towers:s.towerSprites.size,illustratedTowerTextures:s.textures.getTextureKeys().filter(k=>/^v5-(archer|cannon|frost|fire|lightning|grove|wind|rune)-/.test(k)).length,effects:s.effects.length,children:s.children.length};});assert.ok(state.maps<=2);assert.ok(state.illustratedTowerTextures<=16);samples.push({map,heap,...state});
 }
 assert.deepEqual(errors,[]);await writeFile('docs/qa/v5/performance-sessions.json',JSON.stringify({note:'Chromium JS heap after forced GC; decoded/native image memory is not included.',samples,errors},null,2)+'\n');console.log(JSON.stringify(samples));
}finally{await browser.close();}
