import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Game} from '../src/systems/Game.js';
import {TRAILS} from '../src/data/map.js';
import {HEROES} from '../src/data/heroes.js';
import {heroStage,heroArtwork,heroTexture} from '../src/heroArtwork.js';
import {requestTexture} from '../src/scenes/illustratedAssets.js';

test('all seven original routes carry actual enemies to the original exit without stalling',()=>{
 for(const map of Object.keys(TRAILS)){
  const g=new Game();g.configure({map,difficulty:map==='classic'?null:'easy',hero:null});
  g.active=true;g.wave=1;g.queue=[{at:1e9,type:'basic'}];const enemy=g.spawn('basic');let steps=0;
  while(enemy.alive&&steps++<10000){g.update(.1);if(enemy.alive){const p=g.trail.onPath(enemy.progress);assert(Math.abs(enemy.x-p.x)<.01);assert(Math.abs(enemy.y-p.y)<.01);}}
  assert(steps<10000,map);assert.equal(g.lives,19,map);assert.equal(g.gold,300,map);assert.equal(g.earned,0,map);
 }
});
test('growth art follows existing battle levels and decorative hero families remain unsupported',()=>{
 for(const [level,stage]of [[1,'baby'],[3,'baby'],[4,'teen'],[6,'teen'],[7,'adult'],[10,'adult']]){
  assert.equal(heroStage(level),stage);
  for(const type of Object.keys(HEROES)){assert(heroArtwork(type,stage).includes(`_${stage}.png`));assert(heroTexture(type,stage).endsWith(stage));}
 }
 for(const type of ['owl','fox','bear']){assert.equal(heroArtwork(type),null);assert.equal(heroTexture(type),null);assert(!HEROES[type]);}
});
test('on-demand loading deduplicates a pending texture, ignores unrelated errors and cleans listeners',async()=>{
 const load=new EventEmitter();let downloads=0,starts=0;
 Object.assign(load,{image(){downloads++;},isLoading(){return false;},start(){starts++;}});
 const scene={load,textures:{exists:()=>false}};
 const a=requestTexture(scene,'one','one.png'),b=requestTexture(scene,'one','one.png');
 assert.equal(a,b);assert.equal(downloads,1);assert.equal(starts,1);
 load.emit('loaderror',{key:'other'});assert.equal(scene.artLoads.size,1);
 load.emit('filecomplete-image-one');assert.equal(await a,true);assert.equal(scene.artLoads.size,0);assert.equal(load.listenerCount('loaderror'),0);
 const failed=requestTexture(scene,'bad','bad.png');load.emit('loaderror',{key:'bad'});assert.equal(await failed,false);
 assert.equal(await requestTexture(scene,'bad','bad.png'),false);assert.equal(downloads,2);assert.equal(load.listenerCount('loaderror'),0);
});
