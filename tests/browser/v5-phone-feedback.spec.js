import {test,expect} from '@playwright/test';
import {ENEMIES} from '../../src/data/enemies.js';
import {enemyDisplaySize} from '../../src/enemyArtwork.js';
const ready=async page=>{await page.goto('./');await page.waitForFunction(()=>window.__tinySiege?.ui.scene?.dynamic);await page.evaluate(()=>document.fonts.ready);};
const textFits=async(page,selector)=>{
 const failures=await page.locator(selector).evaluateAll(elements=>elements.flatMap(e=>{
  const box=e.getBoundingClientRect(),css=getComputedStyle(e),left=box.left+parseFloat(css.borderLeftWidth),right=box.right-parseFloat(css.borderRightWidth),top=box.top+parseFloat(css.borderTopWidth),bottom=box.bottom-parseFloat(css.borderBottomWidth);
  const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let node;const issues=[];
  while(node=walker.nextNode()){if(!node.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(node);for(const b of r.getClientRects())if(b.width&&b.height&&(b.left<left-2||b.right>right+2||b.top<top-2||b.bottom>bottom+2))issues.push({label:node.textContent,button:e.id,box:box.toJSON(),text:b.toJSON(),borders:[left,right,top,bottom]});}
  return issues;
 }));expect(failures).toEqual([]);
};
for(const[width,height]of[[375,680],[390,730],[844,330],[844,390],[932,360],[667,320],[768,1024],[1024,768],[1440,900]])test(`phone feedback: labels stay inside shells and hero shop ${width}x${height}`,async({page})=>{
 await page.setViewportSize({width,height});await ready(page);
 await page.locator('#new-profile').tap();await page.locator('#nickname').fill('Phone playtest');
 await textFits(page,'#profile-form .v5-btn,.modal-card > .v5-btn');
 await page.screenshot({path:`test-results/phone-feedback/profile-${width}x${height}.png`});
 await page.locator('#profile-form button').tap();await textFits(page,'.home-actions .v5-btn,.kingdom-actions .v5-btn');await page.locator('[data-map="emerald"]').tap();
 await textFits(page,'.difficulty-picker .v5-btn,.v5-prep-actions .v5-btn,#choose-hero');
 await expect(page.locator('.v5-relic-line')).not.toContainText('14 gentle waves');
 await page.screenshot({path:`test-results/phone-feedback/preparation-${width}x${height}.png`});
 await page.locator('#begin-adventure').tap();
 const cards=await page.locator('.tower-card').evaluateAll(cards=>cards.map(c=>{const b=c.getBoundingClientRect();return{name:c.dataset.tower,box:b.toJSON(),parts:['.tower-name b','.tower-cost',...(c.classList.contains('locked')?['.tower-lock']:[])].map(s=>({selector:s,box:c.querySelector(s).getBoundingClientRect().toJSON()}))};}));
 for(const c of cards)for(const p of c.parts){expect(p.box.x,`${c.name} ${p.selector} left`).toBeGreaterThanOrEqual(c.box.x);expect(p.box.right,`${c.name} ${p.selector} right`).toBeLessThanOrEqual(c.box.right);expect(p.box.y).toBeGreaterThanOrEqual(c.box.y);expect(p.box.bottom,`${c.name} ${p.selector} bottom`).toBeLessThanOrEqual(c.box.bottom);}
 expect(cards.filter(c=>c.parts.length===3)).toHaveLength(5);
 await textFits(page,'.tower-card,#start-wave');
 const overlap=await page.locator('.hud').evaluate(h=>{const kids=[...h.children].map(e=>({label:e.className,b:e.getBoundingClientRect()}));return kids.flatMap((a,i)=>kids.slice(i+1).filter(b=>Math.min(a.b.right,b.b.right)>Math.max(a.b.left,b.b.left)+1&&Math.min(a.b.bottom,b.b.bottom)>Math.max(a.b.top,b.b.top)+1).map(b=>[a.label,b.label]));});expect(overlap).toEqual([]);
 await page.screenshot({path:`test-results/phone-feedback/battle-${width}x${height}.png`});
});
test('death fades and tower attacks never enlarge illustrated PNGs to their source size',async({page})=>{
 await ready(page);await page.locator('#play').tap();
 const types=Object.keys(ENEMIES);
 const result=await page.evaluate(async types=>{
  const {ui,model:g}=window.__tinySiege,s=ui.scene;ui.helpOpen=false;
  g.gold=10000;const towers=Object.keys(g.participation).map((type,i)=>g.place(type,70+i*100,80)).filter(Boolean);
  await new Promise(requestAnimationFrame);
  for(const t of towers)s.effect({type:'attack',tower:t});
  for(const type of types){const e=g.spawn(type);s.effect({type:'death',enemy:e});}
  const frames=[];for(let i=0;i<18;i++){await new Promise(requestAnimationFrame);frames.push({death:s.effects.filter(e=>e.type==='death').map(e=>({width:e.text.displayWidth,height:e.text.displayHeight,type:e.text.texture.key.replace('v5-enemy-','')})),towers:[...s.towerSprites.values()].map(t=>t.displayWidth)});}
  return{frames,towerCount:towers.length};
 },types);
 expect(result.towerCount).toBe(8);
 expect(result.frames.some(f=>f.death.length===14)).toBe(true);
 for(const frame of result.frames){for(const e of frame.death){expect(e.width).toBeLessThanOrEqual(enemyDisplaySize(ENEMIES[e.type].radius)+1);expect(e.height).toBeLessThanOrEqual(enemyDisplaySize(ENEMIES[e.type].radius)+1);}for(const w of frame.towers)expect(w).toBeLessThanOrEqual(89);}
});
