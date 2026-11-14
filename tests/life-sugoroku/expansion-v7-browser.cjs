// CI-only real browser coverage for the independent minigame branch.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),dest=path.join(root,'test-results/naokoro-v7');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{
 fs.mkdirSync(dest,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 const evidence={cpu:[],human:[],widths:[],errors:[],hardwareSafari:'not tested'};
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>evidence.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/tools/life-sugoroku/qa-v7-games.html`);
  await page.waitForFunction(()=>window.minigameQA);
  const protectedSaves=await page.evaluate(()=>{for(const key of ['naotocchi-save-v1','naotocchi-save-v1-backup','naotocchi-save-v1-snaps','naotocchi-save-v1-writer','naotocchi-life-sugoroku-v1'])localStorage.setItem(key,'sentinel:'+key);return {...localStorage};});
  const {createNodeOfficialRuntime}=await import('../../prototypes/life-sugoroku/official-runtime-v4.mjs');
  for(const gameId of ['knock','wait','spin','sneak','rhythm'])for(const difficulty of ['easy','normal']){
   const options={gameId,difficulty,seed:3,cpuSeed:101,cpu:true};
   await page.evaluate(o=>minigameQA.start(o),options);
   await page.waitForFunction(()=>minigameQA.snapshot()?.frame>=60);
   await page.locator('#pause').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='保存しました。');
   const saved=await page.evaluate(()=>minigameQA.snapshot());
   await page.locator('#restore').click();await page.waitForFunction(f=>minigameQA.snapshot()?.frame>=f,saved.frame);
   await page.locator('#skip').click();await page.waitForFunction(()=>minigameQA.snapshot()?.done,null,{timeout:20000});
   const actual=await page.evaluate(()=>minigameQA.snapshot());const node=await createNodeOfficialRuntime();node.start(options);const expected=node.step(1800);
   assert.deepEqual(actual,expected,gameId+' browser / Node parity and held restore');
   evidence.cpu.push({gameId,difficulty,frame:actual.frame,score:actual.score,inputs:actual.inputs.length,restoreFrame:saved.frame});
  }
  // Human seats receive native trusted pointers at every narrow viewport. The
  // official callback still decides the result; no desired score is injected.
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   await page.evaluate(()=>minigameQA.start({gameId:'knock',seed:3,cpu:false}));
   await page.waitForFunction(()=>minigameQA.snapshot()?.frame>=30);
   const canvas=page.frameLocator('#host iframe').locator('canvas');await canvas.click();
   await page.waitForFunction(()=>minigameQA.snapshot()?.inputs.length>0);
   const bounds=await canvas.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
   evidence.widths.push({width,bounds,inputs:await page.evaluate(()=>minigameQA.snapshot().inputs.length)});
   await page.screenshot({path:path.join(dest,`knock-${width}.png`),fullPage:true});
  }
  // Real human drag and mid-pointer save. Replay in the formal
  // Node host proves the accepted native journal, including pending input.
  for(const gameId of ['knock','wait','spin','sneak','rhythm']){
   await page.evaluate(gameId=>minigameQA.start({gameId,seed:3,cpu:false}),gameId);
   await page.waitForFunction(()=>minigameQA.snapshot()?.frame>=30);
   const canvas=page.frameLocator('#host iframe').locator('canvas'),b=await canvas.boundingBox();
   if(gameId==='spin'||gameId==='sneak'){
    const x=b.x+b.width*.2,y=b.y+b.height*.55;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+40,y,{steps:12});
    await page.evaluate(()=>minigameQA.pause());await page.waitForFunction(()=>document.querySelector('#status').textContent==='保存しました。');
    const held=await page.evaluate(()=>minigameQA.snapshot());
    assert.equal(held.inputs.filter(e=>e.type==='pointerdown').length,1);
    assert.equal(held.inputs.filter(e=>['pointerup','pointercancel'].includes(e.type)).length,0);
    await page.evaluate(()=>minigameQA.restore());await page.waitForFunction(f=>minigameQA.snapshot()?.frame>=f,held.frame);
    await page.mouse.move(x+60,y,{steps:6});await page.mouse.up();
   }else if(gameId!=='wait')await canvas.click();
   await page.waitForFunction(()=>minigameQA.snapshot()?.done,null,{timeout:30000});
   const actual=await page.evaluate(()=>minigameQA.snapshot()),r=await createNodeOfficialRuntime();r.start(actual);
   assert.equal(r.snapshot().score,actual.score);assert.deepEqual(r.snapshot().inputs,actual.inputs);
   evidence.human.push({gameId,frame:actual.frame,score:actual.score,inputs:actual.inputs.length});
  }
  for(const gameId of ['knock','wait','spin','sneak','rhythm']){
   await page.locator('#game').selectOption(gameId);await page.locator('#four').click();
   for(let seat=0;seat<4;seat++){
    await page.waitForFunction(seed=>minigameQA.snapshot()?.cpuSeed===seed,101+seat);
    if(seat===1){await page.evaluate(()=>minigameQA.pause());await page.waitForFunction(()=>document.querySelector('#status').textContent==='保存しました。');await page.evaluate(()=>minigameQA.restore());await page.waitForFunction(seed=>minigameQA.snapshot()?.cpuSeed===seed,101+seat);}
    await page.evaluate(()=>minigameQA.speed(60));
   }
   await page.waitForFunction(()=>window.qaResult?.length===4);
   const rows=await page.evaluate(()=>qaResult);assert.ok(rows.every(r=>r.seed===3&&r.gameId===gameId));
   assert.equal(await page.locator('#results tbody tr').count(),4);
   (evidence.fourSeats??=[]).push({gameId,scores:rows.map(r=>r.score)});
  }
  assert.deepEqual(await page.evaluate(()=>({...localStorage})),protectedSaves);
  assert.equal(await page.evaluate(()=>window.qaError||null),null);assert.deepEqual(evidence.errors,[]);
  console.log('V7 browser: CPU parity, restore, native human pointers, four widths and main-save isolation passed');
 }finally{fs.writeFileSync(path.join(dest,'results.json'),JSON.stringify(evidence,null,2));await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
