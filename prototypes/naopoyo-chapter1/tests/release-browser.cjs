// Real pointer input against the public entry. Uses isolated browser storage.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../../..');
(async()=>{
 const {stages}=await import('../stages.mjs');
 const {solve}=await import('../witness.mjs');
 const {KEY}=await import('../progress.mjs');
 const {stages:oldStages}=await import('../../naopoyo-rescue/stages.mjs');
 const oldEngine=await import('../../naopoyo-rescue/engine.mjs');
 const {pack,KEY:OLD}=await import('../../naopoyo-rescue/store.mjs');
 const initial=oldEngine.createState(oldStages[0]),oldState=structuredClone(initial);
 oldEngine.move(oldState,'a',1,0);
 const oldSave=pack(0,oldState,[initial],['01']);
 const server=http.createServer((req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+'/')){res.writeHead(403);return res.end()}
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html'});res.end(err?'missing':data)});
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=process.env.RELEASE_BASE_URL||`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const close=async()=>{if(await page.locator('#dialog').evaluate(d=>d.open))await page.click('#close')};
 const read=()=>page.evaluate(()=>({state:structuredClone(window.pilot.session.state),progress:structuredClone(window.pilot.progress.data)}));
 async function drag(c){
  const a=await page.evaluate(id=>window.pilot.session.state.actors.find(a=>a.id===id),c.id);assert.ok(a,c.id);
  const rect=await page.locator('#board').boundingBox(),cell=rect.width/8;
  await page.mouse.move(rect.x+(a.x+.5)*cell,rect.y+(a.y+.5)*cell);await page.mouse.down();
  await page.mouse.move(rect.x+(a.x+.5+c.dx)*cell,rect.y+(a.y+.5+c.dy)*cell,{steps:4});await page.mouse.up();
 }
 try{
  await page.goto(base+'prototypes/naopoyo/');await page.waitForURL('**/prototypes/naopoyo-chapter1/index.html');
  await page.waitForFunction(()=>window.pilot);
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:OLD,value:oldSave});
  assert.match(await page.locator('#content').innerText(),/ふくろう/);
  assert.doesNotMatch(await page.locator('#content').innerText(),/。」/);
  await close();await page.click('#select');
  assert.equal(await page.locator('[data-stage]').count(),10);assert.equal(await page.locator('[data-stage]:disabled').count(),9);
  assert.equal(await page.evaluate(()=>window.pilot.choose('light-owl-trial')),false);
  await close();await page.click('#hint');await page.click('#hintMore');await page.click('#hintMore');
  assert.match(await page.locator('#content').innerText(),/3 \/ 3/);await close();
  const results=[];
  for(let i=0;i<stages.length;i++){
   const witness=solve(stages[i]);await close();
   if(i===0){
    const before=(await read()).state;await drag(witness.commands[0]);
    const partial=(await read()).state;assert.notDeepEqual(partial,before);
    await page.reload();await page.waitForFunction(()=>window.pilot);assert.deepEqual((await read()).state,partial);
    await page.click('#undo');assert.deepEqual((await read()).state,before);
    await page.click('#retry');assert.deepEqual((await read()).state,before);
    if(await page.locator('#pause').innerText()==='▶')await page.click('#pause');
   }
   for(const c of witness.commands)await drag(c);
   await page.waitForFunction(id=>window.pilot.progress.data.cleared.includes(id),stages[i].id);
   const r=await read();assert.equal(r.state.actors.length,0);
   assert.equal(r.progress.unlocked.length,Math.min(10,i+2));
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),OLD),oldSave);
   results.push({stage:stages[i].id,rescued:r.state.rescued,moves:r.state.moves});
   if(i<9)await page.click('#nextStage');
  }
  await close();await page.click('#select');assert.equal(await page.locator('[data-stage]:disabled').count(),0);
  await page.locator('[data-stage="light-arrival"]').click();await close();await page.click('#retry');
  assert.equal((await read()).progress.cleared.length,10);
  await page.reload();await page.waitForFunction(()=>window.pilot);assert.equal((await read()).progress.unlocked.length,10);
  await page.click('#select');
  const chapterSave=await page.evaluate(key=>localStorage.getItem(key),KEY);
  await page.locator('a[href="../naopoyo-rescue/index.html"]').click();
  await page.locator('#stageSelect').waitFor();
  assert.deepEqual(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),OLD)),JSON.parse(oldSave));
  await page.reload();assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),chapterSave);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({browser:browser.version(),viewport:'390x844',pointerReplay:results,initialLocked:9,allUnlocked:10,saveReload:true,undoRetry:true,oldStateHistoryClearsPreserved:true,pageErrors:errors}));
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
