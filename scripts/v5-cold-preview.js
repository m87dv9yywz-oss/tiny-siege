// Cold-cache shipped build; no development hooks or real Firebase account.
import {chromium} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.argv[2]||'http://127.0.0.1:4173/tiny-siege/';
if(!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Use a local production preview.');
const browser=await chromium.launch(process.env.PLAYWRIGHT_USE_BUNDLED?{}:{executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});
 const errors=[],badResponses=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()});});
 const start=Date.now();await page.goto(url);await page.waitForFunction(()=>document.querySelector('#game')?.getAttribute('aria-busy')==='false');const interactiveMs=Date.now()-start;
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
 const result=await page.evaluate(()=>({browser:navigator.userAgent,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),devHook:typeof window.__tinySiege,
  resources:performance.getEntriesByType('resource').map(r=>({url:new URL(r.name).pathname,bytes:r.encodedBodySize,transfer:r.transferSize,duration:r.duration,initiator:r.initiatorType})),heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null}));
 assert.equal(result.devHook,'undefined');assert.equal(result.canvas.width/result.canvas.height,1.5);
 result.interactiveMs=interactiveMs;result.totalResourceBodyBytes=result.resources.reduce((n,r)=>n+r.bytes,0);result.totalResourceTransferBytes=result.resources.reduce((n,r)=>n+r.transfer,0);result.errors=errors;result.badResponses=badResponses;
 assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
 await mkdir('docs/qa/v5',{recursive:true});await writeFile('docs/qa/v5/performance-cold-preview.json',JSON.stringify(result,null,2)+'\n');await page.screenshot({path:'docs/qa/v5/rendered/production-preview-cold.png'});
 console.log(JSON.stringify({interactiveMs,bodyBytes:result.totalResourceBodyBytes,resourceCount:result.resources.length,heap:result.heap,errors,badResponses}));
}finally{await browser.close();}
