// Fast visual capture companion to CI's full 200-state touch/purchase tests.
// Debug-funded fixtures call real Game.upgrade; not earned-gold campaign evidence.
import {chromium} from '@playwright/test';
import {TOWER_TYPES,TOWER_STATES} from '../src/towerArtwork.js';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/tiny-siege/');await page.waitForFunction(()=>window.__tinySiege?.ui.scene?.dynamic);await page.locator('#play').tap();
 for(const type of TOWER_TYPES)for(const state of TOWER_STATES){
  await page.evaluate(({type,state})=>{const{model:g,ui}=window.__tinySiege;g.reset();g.gold=10000;const t=g.place(type,145,105);const paths=state.split('-').map(Number);for(let p=0;p<3;p++)for(let n=0;n<paths[p];n++)if(!g.upgrade(t.id,p))throw Error('Upgrade fixture rejected');ui.selectTower(t);},{type,state});
  await page.waitForFunction(({type,state})=>{const s=window.__tinySiege.ui.scene;return s.towerSprites.get(1)?.texture.key===`v5-${type}-${state}`&&s.artLoads.size===0;},{type,state});
  await page.locator('.tower-portrait').evaluate(i=>i.decode());
  const b=await page.locator('canvas').boundingBox();await page.screenshot({path:`docs/qa/v5/rendered/towers/${type}-${state}.png`,clip:{x:b.x+b.width*100/960,y:b.y+b.height*15/640,width:b.width*90/960,height:b.height*110/640}});
  if(state==='3-1-0')await page.screenshot({path:`docs/qa/v5/rendered/tower-${type}-ultimate.png`});
 }
 assert.deepEqual(errors,[]);console.log('Captured 200 real paid-model states at 844x390; errors:',errors);
}finally{await browser.close();}
