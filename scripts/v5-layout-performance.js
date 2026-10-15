// Isolated development stress fixture, not earned-gold balance or device FPS.
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const url = process.argv[2] || 'http://127.0.0.1:5173/tiny-siege/';
if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname))
  throw Error('Run this development-only benchmark on a local preview.');
const browser = await chromium.launch(process.env.PLAYWRIGHT_USE_BUNDLED ? {} : {
  executablePath: '/usr/bin/chromium', args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({viewport: {width: 844, height: 390}, hasTouch: true});
  await page.goto(url);
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.locator('#play').click();
  await page.evaluate(async () => {
    const {model: g, ui} = window.__tinySiege;
    g.gold = 100000;
    for (const type of ['archer','cannon','frost','fire','lightning','grove','wind','rune'])
      for (let p=0;p<3;p++) {
        let tower;
        for (let y=80;y<590&&!tower;y+=55)
          for (let x=70;x<900&&!tower;x+=55)
            if (!g.canPlace(type,x,y)) tower=g.place(type,x,y);
        if (!tower) throw Error('No legal stress fixture location');
        for (let n=0;n<3;n++) g.upgrade(tower.id,p);
      }
    ui.selectTower(g.towers.at(-1));
    g.wave=19;g.startWave();
    const {onPath}=await import('/tiny-siege/src/data/map.js');
    for(let i=0;i<100;i++) {
      const e=g.spawn(['warden','healer','armored','shard','wraith','brute'][i%6]);
      e.progress=100+i*16;Object.assign(e,onPath(e.progress));
    }
  });
  await page.waitForFunction(() => window.__tinySiege.ui.scene.artLoads?.size === 0);
  await page.waitForTimeout(1000);
  const result = await page.evaluate(async () => {
    const {model,ui}=window.__tinySiege;
    const frames=[], limits={effects:0,enemies:0,projectiles:0,particles:0};
    let last=performance.now();
    for(let i=0;i<180;i++) {
      await new Promise(requestAnimationFrame);
      const now=performance.now();frames.push(now-last);last=now;
      limits.effects=Math.max(limits.effects,ui.scene.effects.length);
      limits.enemies=Math.max(limits.enemies,model.enemies.length);
      limits.projectiles=Math.max(limits.projectiles,model.projectiles.length);
      limits.particles=Math.max(limits.particles,...Object.values(ui.scene.particles).map(p=>p.getAliveParticleCount()));
    }
    const canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
    const sorted=frames.toSorted((a,b)=>a-b);
    return {viewport:[innerWidth,innerHeight],worldCanvas:[canvas.width,canvas.height],
      displayedCanvas:[r.width,r.height],towers:model.towers.length,panelOpen:ui.upgradeOpen,
      samples:frames.length,medianFrameMs:sorted[Math.floor(sorted.length/2)],
      p95FrameMs:sorted[Math.floor(sorted.length*.95)],worstFrameMs:sorted.at(-1),maximumEntityCounts:limits,
      browser:navigator.userAgent};
  });
  await page.screenshot({path:'test-results/v5-mobile-stress.png',animations:'disabled'});
  await writeFile('docs/qa/v5/performance-stress.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
