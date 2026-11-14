// Regression: a selected label can have display:block and still be clipped by
// the transformed/scrolled camera. Check painted bounds after real touch input.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),cp=require('node:child_process');
const pointerTarget=require('./helpers/home-production-pointer-target.cjs');
const root=process.cwd(),out=path.resolve(process.env.HOME_NAME_OUTPUT||'.work-output/selected-name');
fs.mkdirSync(out,{recursive:true});
cp.execFileSync(process.execPath,['tools/home-production-qa.cjs',out]);
// Name labels belong to the shipped V18 surface, not the retained legacy QA.
fs.copyFileSync(path.join(out,'current-production-qa.html'),path.join(out,'release-qa.html'));
assert.match(fs.readFileSync(path.join(out,'release-qa.html'),'utf8'),/<body[^>]*data-home-display-version="18"/);
let fixture=fs.readFileSync(path.join(out,'release-qa-script.js'),'utf8');
fixture=fixture.replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 resetDisplay(){const p=homeV11Presentation();clearTimeout(p.upperTimer);clearTimeout(p.lowerTimer);p.upper=null;p.upperQueue=[];p.lowerQueue=[];p.lowerUntil=0;homeV11ClearUpper();delete document.body.dataset.homeUpper;conv2Abort('qa');clearConversationTimers();hideSpeechBubble();},
 setup(kind){this.resetDisplay();this.scene('forest',kind==='crowd'?28:kind==='all'?3:kind==='single'?1:2,'night');
 if(kind==='companion'){state.partner=null;state.companions=[{id:COMPANIONS[0].id,bond:85}];}
 state.poopCount=0;homeCastLayoutKey='';render();homeDiorama.sync();homeDiorama.dismissGuide();},
 notices(){this.resetDisplay();setSpeechBubble('いっしょにいると、うれしいね',petSpeaker(),{holdMs:60000});showMessage('名前を確認しています',60000,null);},
 selected(){return homeDiorama.model.selected();},
`);
for(const name of ['scheduleIdleGreeting','scheduleCompanionEncounter','scheduleEnvironmentMoment'])fixture=fixture.replace('function '+name+'() {','function '+name+'() { return; // isolated input fixture\n');
fs.writeFileSync(path.join(out,'release-qa-script.js'),fixture);
const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
 const base=name.startsWith('release-qa')?out:root,p=path.resolve(base,name);
 if(!p.startsWith(base+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile())return res.writeHead(404).end();
 res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');fs.createReadStream(p).pipe(res);
});
const records=[],errors=[];
// Seed only the disposable presentation model via its existing random option.
// Gameplay RNG, production files, hitboxes and saved entities are untouched.
let qaDiorama=fs.readFileSync(path.join(out,'release-qa-diorama.js'),'utf8');assert.ok(qaDiorama.includes('modelAPI.createModel({onEvent:emit})'));qaDiorama=qaDiorama.replace('modelAPI.createModel({onEvent:emit})','modelAPI.createModel({onEvent:emit,random:(()=>{let seed=521;return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)})()})');fs.writeFileSync(path.join(out,'release-qa-diorama.js'),qaDiorama);
async function inspect(page){return page.evaluate(()=>{
 const r=e=>e.getBoundingClientRect().toJSON(),label=document.querySelector('.diorama-selected-label'),frame=document.querySelector('.screen-frame');
 return {text:label.textContent,hidden:label.hidden,display:getComputedStyle(label).display,label:r(label),frame:r(frame),selected:HomeReleaseQA.selected(),
 notice:r(document.getElementById('homeEventSlot')),comment:r(document.getElementById('homeCommentDock')),count:HomeReleaseQA.detail().actors.length,
 actors:HomeReleaseQA.detail().actors.map(a=>({key:a.key,x:a.x,y:a.y})),bodyScale:NaotocchiHomeViewport.residentPresentation().bodyScale};
});}
async function target(page,kind,skip=0){return page.evaluate(({kind,skip})=>{
 const q=HomeReleaseQA.detail(),v=NaotocchiHomeViewport.residentPresentation(),s=NaotocchiHomeViewport.presentationRect(document.getElementById('castStage'));
 const frame=document.querySelector('.screen-frame').getBoundingClientRect();
 const seen=new Set();let matched=0;
 for(const a of q.actors.filter(a=>a.kind===kind)){
  const node=document.querySelector('[data-diorama-actor="'+a.key+'"]');
  const x=v.x+(s.left+a.x-v.x)*v.scaleX,y=v.y+(s.top+a.y-v.y)*v.scaleY;
  // Search the exposed ink densely; a partner's head may be a narrow sliver.
  const probes=[.45,.65,.25,.85,.95,.05].flatMap(dy=>[0,-.3,.3,-.45,.45].map(dx=>({dx,dy})));
  for(let dy=.975;dy>=.025;dy-=.025)for(let dx=-.475;dx<=.475;dx+=.025)probes.push({dx,dy});
  for(const {dx,dy} of probes){
   const p={x:Math.floor(x+dx*a.w*v.bodyScale),y:Math.floor(y-dy*a.h*v.bodyScale)};
   const pixel=p.x+','+p.y;if(seen.has(a.key+pixel))continue;seen.add(a.key+pixel);
   if(p.x<=frame.left||p.x>=frame.right||p.y<=frame.top||p.y>=frame.bottom)continue;
   const hit=document.elementFromPoint(p.x,p.y);
   if(hit?.closest('[data-diorama-actor]')===node&&matched++===skip)return {...p,key:a.key,name:node.getAttribute('aria-label').replace(/をえらぶ$/,'')};
  }
 }
 throw Error('No exposed touch target for '+kind+' '+JSON.stringify({presentation:v,stage:s,frame:frame.toJSON(),actors:q.actors.map(a=>({key:a.key,x:a.x,y:a.y,w:a.w,h:a.h,rect:document.querySelector('[data-diorama-actor="'+a.key+'"]').getBoundingClientRect().toJSON()}))}));
},{kind,skip});}
function verifyPaint(state,expected){
 assert.equal(state.text,expected);assert.equal(state.hidden,false);
 assert.equal(state.display,'block');assert.ok(state.label.width>0&&state.label.height>0);
 const a=state.label,b=state.frame;
 assert.ok(a.top>=b.top-1&&a.bottom<=b.bottom+1&&a.left>=b.left-1&&a.right<=b.right+1,'name must actually paint inside clipped viewport: '+JSON.stringify({a,b}));
 for(const lane of [state.notice,state.comment])assert.ok(a.right<=lane.left||a.left>=lane.right||a.bottom<=lane.top||a.top>=lane.bottom,'name must not overlap notification/comment');
 assert.equal(state.notice.height,42);assert.equal(state.comment.height,76);
}
// Keep a fixed clock for the entire case, including reload. Input lookup and
// dispatch cannot age the cast; only explicit runFor calls advance real frames.
async function pauseForInput(page){await page.clock.runFor(0);}
async function ready(page){
 // Wait for real image/font I/O with the virtual clock stopped. The final
 // fixed frame advance paints the loaded daypart and completes camera sizing.
 await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
 await page.clock.runFor(550);
 assert.equal(await page.evaluate(()=>!!HomeReleaseQA.detail().world?.loaded&&[...document.querySelectorAll('[data-diorama-actor] img')].every(i=>i.complete&&i.naturalWidth>0)),true,'world and resident images ready');
}

async function tap(page,kind,single=false){
 // Keep the real touchscreen hit test atomic with the exposed-pixel lookup.
 // Otherwise WebKit can run an autonomous-walk frame between these two awaits
 // and move another resident under the already verified point.
 await pauseForInput(page);
 try{
 // A rotated camera can put the dog in front of an entire visitor. Move it
 // through the real drag handler and advance actual animation frames until
 // the visitor is reachable. Waiting on wall time cannot move a paused page.
 let p;
 for(let walk=0;walk<=3&&!p;walk++){
  try{p=await target(page,kind);break;}catch(error){
   if(kind==='pet'||walk===3||!error.message.includes('No exposed touch target'))throw error;
  }
  const move=await page.evaluate(pointerTarget,{kind:'drag',expose:kind});
  await page.mouse.move(move.from.x,move.from.y);await page.mouse.down();
  await page.mouse.move(move.to.x,move.to.y,{steps:8});await page.mouse.up();
  for(let frame=0;frame<24&&!p;frame++){
   await page.clock.runFor(500);
   try{p=await target(page,kind);}catch(error){if(!error.message.includes('No exposed touch target'))throw error;}
   if(!await page.evaluate(()=>HomeReleaseQA.detail().actors[0].target))break;
  }
 }
 let state;
 // A painted frame can expose pixels outside its smaller selection body. Try
 // the other genuinely exposed pixels until the shipped hit test selects that
 // same resident; every attempt remains a real touchscreen event.
 for(let probe=0;probe<100;probe++){
  if(probe)p=await target(page,kind,probe);
  await page.touchscreen.tap(p.x,p.y);state=await inspect(page);
  if(state.selected===p.key)break;
 }
 assert.equal(state.selected,p.key);
 if(single)assert.equal(state.display,'none');else verifyPaint(state,p.name);
 if(kind==='pet')assert.equal(state.text,'大人のいぬ');
 return {kind,key:p.key,text:state.text,label:state.label,frame:state.frame};
 }finally{await page.clock.runFor(0);}
}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{for(const engine of (process.env.HOME_NAME_ENGINES||'chromium,webkit').split(',')){
 const options=engine==='chromium'&&process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{};
 const browser=await require('playwright')[engine].launch(options);
 try{for(const kind of (process.env.HOME_NAME_CASES||'single,companion,partner,all,crowd').split(',')){
 const page=await browser.newPage({viewport:{width:393,height:720},hasTouch:true});
 const rec={engine,kind,checks:[],fixture:{clock:'2026-11-14T00:00:01Z',presentationSeed:521}};records.push(rec);page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.addInitScript(seed=>{if(!localStorage.getItem('naotocchi-home-release-qa-v1'))localStorage.setItem('naotocchi-home-release-qa-v1',JSON.stringify(seed));window.AudioContext=undefined;window.webkitAudioContext=undefined;},JSON.parse(fs.readFileSync(path.join(out,'release-qa-seed.json'))));
 // Install before boot so the existing animation loop and later synthetic
 // time advances share one requestAnimationFrame clock.
 // Pause before app boot with a full day of headroom for a busy CI runner.
 await page.clock.install({time:new Date('2026-11-13T00:00:01Z')});await page.clock.pauseAt(new Date('2026-11-14T00:00:01Z'));
 await page.goto(`http://127.0.0.1:${server.address().port}/release-qa.html`);
 await page.waitForFunction(()=>window.HomeReleaseQA);await page.evaluate(k=>HomeReleaseQA.setup(k),kind);
 await ready(page);rec.fixture.ready=await page.evaluate(()=>({now:Date.now(),actors:HomeReleaseQA.detail().actors.map(a=>({key:a.key,x:a.x,y:a.y}))}));
 assert.equal((await inspect(page)).count,{single:1,companion:2,partner:2,all:3,crowd:28}[kind]);
 const kinds=kind==='single'?['pet']:kind==='companion'?['pet','companion','pet']:kind==='partner'?['pet','partner','pet']:['pet','companion','partner','pet'];
 for(const actor of kinds)rec.checks.push(await tap(page,actor,kind==='single'));
 if(kind!=='single'){
  await page.evaluate(()=>HomeReleaseQA.notices());rec.checks.push({notices:await tap(page,'pet')});
  assert.equal(await page.locator('#message').isVisible(),true);assert.equal(await page.locator('#speechBubble').isVisible(),true);
  await page.evaluate(()=>HomeReleaseQA.resetDisplay());
 }
 // A fixed diagonal from an exposed head pixel can land on a prop or another
 // resident. Use the real navigation model to choose a reachable drag endpoint.
 await pauseForInput(page);
 const dragTarget=await page.evaluate(pointerTarget,'drag');await page.mouse.move(dragTarget.from.x,dragTarget.from.y);await page.mouse.down();await page.mouse.move(dragTarget.to.x,dragTarget.to.y,{steps:8});await page.mouse.up();
 const drag=await page.evaluate(()=>HomeReleaseInputTrace.filter(t=>t.type==='move'&&t.args[2]==='drag'));
 assert.ok(drag.length,'drag reaches the existing move handler');assert.equal(drag.at(-1).result,true,'drag keeps a valid walking route');rec.checks.push({drag:true});
 if(kind!=='single')verifyPaint(await inspect(page),'大人のいぬ');

 // A packed scene can hide every reachable ground pixel while the dog is
 // still covering the start of its drag route. Advance that real walk and
 // re-sample the live board; the assertion still requires an accepted tap.
 let ground;
 for(let i=0;!ground;i++){
  try{ground=await page.evaluate(pointerTarget,'tap');}
  catch(error){
   if(i===24||!error.message.includes('No visible grounded destination'))throw error;
   await page.clock.runFor(500);
  }
 }
 const groundTraceStart=await page.evaluate(()=>HomeReleaseInputTrace.length);
 await page.touchscreen.tap(ground.to.x,ground.to.y);
 assert.ok(await page.evaluate(start=>HomeReleaseInputTrace.slice(start).some(t=>t.type==='move'&&t.args[2]==='ground'&&t.result),groundTraceStart),'ground tap retains movement');
 await page.clock.runFor(0);rec.checks.push({ground:true});
 await page.setViewportSize({width:844,height:390});await ready(page);
 for(const actor of kinds)rec.checks.push({landscape:await tap(page,actor,kind==='single')});
 if(kind!=='single'){await page.evaluate(()=>HomeReleaseQA.notices());rec.checks.push({landscapeNotices:await tap(page,'pet')});await page.evaluate(()=>HomeReleaseQA.resetDisplay());}
 await page.setViewportSize({width:393,height:720});await ready(page);rec.checks.push({portraitAgain:await tap(page,'pet',kind==='single')});
 await page.evaluate(()=>HomeReleaseQA.save());const saved=await page.evaluate(()=>localStorage.getItem('naotocchi-home-release-qa-v1'));
 await page.reload();await page.waitForFunction(()=>window.HomeReleaseQA);await ready(page);
 assert.equal((await inspect(page)).count,{single:1,companion:2,partner:2,all:3,crowd:28}[kind]);
 rec.checks.push({restored:await tap(page,kinds[1]||'pet',kind==='single')});
 assert.ok(saved);await page.screenshot({path:path.join(out,engine+'-'+kind+'.png')});rec.status='passed';
 }catch(e){rec.status='failed';rec.error=e.stack;await page.screenshot({path:path.join(out,engine+'-'+kind+'-failed.png')}).catch(()=>{});}
 finally{await page.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({records,errors},null,2));}
 console.log(engine,kind,rec.status,rec.error||'');
 }
 }finally{await browser.close();}
 }
 assert.deepEqual(errors,[]);assert.ok(records.every(r=>r.status==='passed'),'see '+path.join(out,'results.json'));
 }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
