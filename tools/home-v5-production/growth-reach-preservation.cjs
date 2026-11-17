// Reuse the exact V5 pointer fixture from PR #558. It is never deployed.
// V5_MEASURE=<checkout-of-558>/tools/home-movement-v5/measure.cjs
// REACH_DIST=<existing-private-v5-dist> PLAYWRIGHT_BROWSERS_PATH=... node this-file
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const pw=require(process.env.PLAYWRIGHT_MODULE||'playwright');process.env.CHROMIUM_PATH=pw.chromium.executablePath();
const measure=require(path.resolve(process.env.V5_MEASURE));
const old=fs.readFileSync(path.join(measure.root,'game/e/home-production-model.js'),'utf8'),fixed=fs.readFileSync('home-production-model.js','utf8');
const helper=fixed.slice(fixed.indexOf('    function socialDestination'),fixed.indexOf('    function referenceDestination'));
assert.ok(helper);let next=old.replace('    function referenceDestination',helper+'    function referenceDestination');
for(const target of ['pet','social']){
 const match=target==='pet'?/        p=\{x:pet\.x[^\n]+/:/      else if\(\['approach','together'\].includes\(name\)&&social.length\)\{[^\n]+/;
 const before=old.match(match),after=fixed.match(target==='pet'?/        p=socialDestination\(a,pet,[^\n]+/:match);assert.ok(before&&after);next=next.replace(before[0],after[0]);
}
(async()=>{const browser=await measure.start(),records=[];try{
 for(const width of [320,375,390,430]){
  const config={...measure.configFromEnv(),width,height:({320:568,375:812,390:844,430:932})[width],count:28,safeBottom:width===320?0:34};
  const before=await measure.open(browser,'e',config),original=browser.newPage.bind(browser);browser.newPage=async(...args)=>{const p=await original(...args);await p.route('**/home-production-diorama.js*',r=>r.fulfill({body:fs.readFileSync(process.env.GROWTH_REACH_CONTROLLER,'utf8'),contentType:'text/javascript'}));await p.route('**/home-production-model.js*',r=>r.fulfill({body:next,contentType:'text/javascript'}));return p;};
  const after=await measure.open(browser,'e',config);browser.newPage=original;
  const detail=await before.evaluate(()=>MovementQA.detail()),initial=detail.actors;assert.equal(initial.length,28);
  for(const actor of initial)for(const edge of measure.edges){
   const goal=measure.goals(edge,detail.frame,config,64,actor.foot,true)[0];
   const a=await measure.trial(before,initial,actor.key,goal,{selectedGround:true});
   const b=await measure.trial(after,initial,actor.key,goal,{selectedGround:true,origin:a.origin});
   assert.equal(b.unselectable,a.unselectable);if(a.unselectable){records.push({width,key:actor.key,edge,unselectable:true});continue;}
   assert.equal(b.input?.result,a.input?.result);const dx=b.actor.foot.x-a.actor.foot.x,dy=b.actor.foot.y-a.actor.foot.y;assert.ok(Math.hypot(dx,dy)<.001,'same pointer endpoint '+actor.key+' '+edge);
   records.push({width,key:actor.key,edge,accepted:a.input?.result,from:a.start,foot:a.actor.foot,after:b.actor.foot,delta:{x:dx,y:dy},bodyBefore:a.body,bodyAfter:b.body});
  }
  await before.close();await after.close();fs.writeFileSync('docs/qa/home-browser-regression-fix/reach-preservation.json',JSON.stringify({fixtureModelSha256:crypto.createHash('sha256').update(old).digest('hex'),records},null,2));console.log(width,'PASS',records.length);
 }
}finally{await browser.close();measure.server.close();}})().catch(e=>{console.error(e);measure.server.close();process.exitCode=1});
