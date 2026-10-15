// Actual Chromium Canvas/HTML captures. End screens use explicit local UI fixtures.
import {chromium}from'@playwright/test';import{mkdirSync,writeFileSync}from'node:fs';
const root='docs/qa/v5/layout';mkdirSync(root,{recursive:true});const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let results=[];
try {
for(const[w,h]of[[375,812],[844,390],[768,1024],[1024,768],[1440,900]]){
 const p=await browser.newPage({viewport:{width:w,height:h},hasTouch:true});let errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5173/tiny-siege/',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>window.__tinySiege?.ui.scene?.dynamic);await p.evaluate(()=>document.fonts.ready);
 await p.locator('#new-profile').tap();await p.locator('#nickname').fill('Measure Knight');await p.locator('#profile-form button').tap();
 const check=async(name,selector)=>{results.push({w,h,name,geometry:await p.locator(selector).evaluate(e=>({scroll:e.scrollHeight,client:e.clientHeight,width:e.clientWidth,box:e.getBoundingClientRect().toJSON()})),errors:[...errors]});await p.screenshot({path:`${root}/${name}-${w}x${h}.png`});};
 await check('home','.home-card');
 for(const[id,selector]of[['heroes','.hero-card'],['relics','.relic-card'],['collection','.collection-card']]){await p.locator('#'+id).tap();await check(id,selector);await p.locator('#back').tap();}
 await p.locator('[data-map="emerald"]').tap();await check('prepare','.modal-card');await p.locator('#back').tap();
 await p.locator('#play').tap();await p.evaluate(()=>{const{model:g,ui}=window.__tinySiege;ui.selectTower(g.place('archer',145,105));});await check('panel','#selection-panel');
 await p.locator('#leave-run').tap();await check('battle-menu','.modal-card');await p.locator('#restart').tap();await check('restart-confirm','.modal-card');await p.locator('#cancel-restart').tap();await p.keyboard.press('Escape');
 await p.evaluate(()=>window.__tinySiege.model.finish('victory'));await check('victory','.modal-card');await p.evaluate(()=>{const{ui,model:g}=window.__tinySiege;ui.restart();g.finish('defeat');});await check('defeat','.modal-card');await p.evaluate(()=>window.__tinySiege.ui.restart());
 for(const[width,height]of[[844,390],[390,760],[932,430],[375,812],[740,360]]){await p.setViewportSize({width,height});await p.evaluate(()=>window.dispatchEvent(new Event('orientationchange')));await p.waitForTimeout(180);results.push({w,h,rotate:[width,height],canvas:await p.locator('canvas').boundingBox()});}
 await p.close();
}
writeFileSync(root+'/measurements.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(x=>({w:x.w,h:x.h,name:x.name,overflow:x.geometry?x.geometry.scroll-x.geometry.client:undefined,rotate:x.rotate,canvas:x.canvas,errors:x.errors})),null,2));} finally {await browser.close();}
