const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');const root=path.resolve(__dirname,'../..'),base=(process.env.BGM_TEST_BASE||'http://127.0.0.1:8780/');
(async()=>{const reports=[];for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await context.addInitScript({path:path.join(__dirname,'graph.js')});
 for(const [url,id] of [['','home-'],['prototypes/naopoyo-time-hand-chapter1/','poyo-1'],['prototypes/life-sugoroku/','koro-1'],['prototypes/card-game/','card-2']]){
  const page=await context.newPage();page.setDefaultTimeout(20000);await page.goto(base+url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.NAOTOCCHI_BGM2);
  await page.mouse.click(5,5);await page.waitForFunction(id=>AUDIO_AUDIT.snapshot().sources.some(s=>s.id?.startsWith(id)&&s.age>1.3&&s.paths.some(p=>Math.abs(p.gain-.36)<.0001)),id);
  const shot=await page.evaluate(()=>AUDIO_AUDIT.snapshot());const bgm=shot.sources.filter(s=>s.id);assert.equal(bgm.length,1,`${name} ${url} unexpected duplicate BGM`);assert.ok(bgm[0].paths.every(p=>Math.abs(p.gain-.36)<.0001),JSON.stringify({name,url,bgm}));reports.push({engine:name,url,id:bgm[0].id,gain:bgm[0].paths,contexts:shot.contexts});
  if(url){await page.evaluate(()=>{const b=NAOTOCCHI_SUBAPP_BGM;for(let i=0;i<5;i++)b.setSong(b.wanted)});await page.waitForTimeout(1100);assert.equal((await page.evaluate(()=>AUDIO_AUDIT.snapshot())).sources.filter(s=>s.id).length,1,'repeated setSong must not duplicate');}
  await page.close();
 }
 await context.close();console.log(name+': PASS actual home +3 game documents: one BGM, effective gain0.36, repeated selection no duplicate');
 }finally{await browser.close()}}
 fs.writeFileSync(path.join(root,'docs/music/verification/actual-routes.json'),JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
