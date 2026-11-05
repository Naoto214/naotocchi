const {chromium,webkit}=require('playwright');
const {harness}=require('./helpers/runtime-harness.cjs');
const {spawn}=require('node:child_process');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
fs.mkdirSync('test-results/home-layout/transform-new',{recursive:true});
const server=spawn('python3',['-m','http.server','8017','--bind','127.0.0.1'],{stdio:'ignore'});
try {
// Probe with HEAD so the Python server cannot close a partially read HTML body.
let ready=false;
for(let attempt=0;attempt<50&&!ready;attempt++){
 try{ready=(await fetch('http://127.0.0.1:8017/',{method:'HEAD'})).ok;}catch{}
 if(!ready)await new Promise(resolve=>setTimeout(resolve,100));
}
assert.ok(ready,'local server serves the game entry point');
for(const [engine,type] of Object.entries({chromium,webkit})){
const browser=await type.launch();
try {
for(const [w,h] of [[320,568],[375,667],[390,844],[667,375],[844,390]]){
 const context=await browser.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:1});const p=await context.newPage();
 const fixture=harness(),seed=fixture.api.state();seed.transformOptions=['cat','dog','ren'];seed.discoveredStages=['dog:'+fixture.api.stageForAge(25,'dog')];seed.savedAt=Date.now();await context.addInitScript(seed=>{if(!localStorage.getItem('naotocchi-save-v1'))localStorage.setItem('naotocchi-save-v1',JSON.stringify(seed));},seed);
 await p.goto('http://127.0.0.1:8017');await p.locator('#transformChoices button').first().waitFor();
 assert.equal(await p.locator('#transformChoices .transform-new-badge').count(),2);
 const rects=await p.locator('#transformChoices button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();const badge=b.querySelector('.transform-new-badge')?.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,badge:badge&&{x:badge.x,y:badge.y,right:badge.right,bottom:badge.bottom}}}));
 for(const r of rects){assert.ok(r.x>=0&&r.y>=0&&r.right<=w&&r.bottom<=h,JSON.stringify(r));if(r.badge)assert.ok(r.badge.x>=r.x&&r.badge.right<=r.right&&r.badge.bottom<=r.bottom);}
 await p.screenshot({path:`test-results/home-layout/transform-new/${engine}-${w}x${h}.png`});
 const badge=await p.locator('#transformChoices [data-line="cat"] .transform-new-badge').boundingBox();
 await p.touchscreen.tap(badge.x+badge.width/2,badge.y+badge.height/2);
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('naotocchi-save-v1')).speciesLine==='cat');
 await p.reload();await p.waitForTimeout(500);
 const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-save-v1')));assert.equal(saved.speciesLine,'cat');assert.ok(saved.discoveredStages.some(k=>k.startsWith('cat:')));
 console.log(`${engine} ${w}x${h}: mixed NEW, bounds, badge tap, reload PASS`);await context.close();
}
} finally {await browser.close();}
}
} finally {server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
