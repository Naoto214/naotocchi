// Real browser navigation: a save handler can request an achievement jingle
// during beforeunload. Keep that save, without fetching in a departing page.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'../..'),base=process.env.BGM_TEST_BASE||'http://127.0.0.1:8780/';
(async()=>{const records=[];
 for(const [engine,type] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch({headless:true,...(engine==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  try{for(const mode of ['leave','cancel','restore']){
   const page=await browser.newPage();const errors=[];let fetches=0;
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.text()==='NAVIGATION_JINGLE_FETCH')fetches++});
   await page.addInitScript(()=>{const original=fetch;window.fetch=(...args)=>{if(String(args[0]).includes('jingle-achieve.m4a'))console.log('NAVIGATION_JINGLE_FETCH');return original(...args)}});
   await page.route('**/navigation-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><button id="start">play</button>'}));
   await page.route('**/navigation-destination',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>destination</title>'}));
   await page.goto(base+'navigation-fixture');
   await page.addScriptTag({url:base+'assets/bgm/catalog.js'});await page.addScriptTag({url:base+'bgm-v2.js'});
   // Match shipped index.html: synchronous BGM module before script.js saves.
   // Native beforeunload invokes handlers in registration order, even capture.
   await page.evaluate(()=>addEventListener('beforeunload',()=>{localStorage.setItem('navigation-save',String(Number(localStorage.getItem('navigation-save')||0)+1));window.player?.jingle('jingle-achieve')}));
   await page.evaluate(base=>{window.audioErrors=[];window.player=NAOTOCCHI_BGM2.create({base:base+'assets/bgm/',level:NAOTOCCHI_BGM2.COMMON_GAIN,onError:e=>audioErrors.push(e.message)});document.querySelector('#start').onclick=()=>player.unlock()},base);
   await page.click('#start');await page.waitForFunction(()=>player.context?.state==='running');
   if(mode==='leave'){
    await page.goto(base+'navigation-destination');
    assert.equal(await page.evaluate(()=>localStorage.getItem('navigation-save')),'1','native beforeunload still saves');
    assert.equal(fetches,0,'native navigation must not start an achievement fetch');
   }else{
    if(mode==='cancel'){
     await page.evaluate(()=>addEventListener('beforeunload',e=>{e.preventDefault();e.returnValue='';}));
     const dialog=page.waitForEvent('dialog',{timeout:10000});
     const navigation=page.goto(base+'navigation-destination').then(()=>null,e=>e.message);
     const prompt=await dialog;assert.equal(prompt.type(),'beforeunload');await prompt.dismiss();
     assert.ok(await navigation,'native cancelled navigation rejects');assert.equal(page.url(),base+'navigation-fixture');
     await page.waitForTimeout(20); // next real task after a cancelled departure
    }else{
     await page.evaluate(()=>{dispatchEvent(new Event('beforeunload'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))});
    }
    assert.equal(fetches,0,'save notification remains suppressed during departure');
    assert.equal(await page.evaluate(()=>player.jingle('jingle-achieve')),true,'normal jingle remains available afterwards');
    assert.equal(fetches,1);assert.deepEqual(await page.evaluate(()=>audioErrors),[]);
    assert.ok(await page.evaluate(()=>player._cache.get('jingle-achieve').length>0),'real AAC decoded');
    assert.equal(await page.evaluate(()=>localStorage.getItem('navigation-save')),'1');
   }
   assert.deepEqual(errors,[]);records.push({engine,mode,fetches,savePreserved:true,errors});await page.close();
  }}finally{await browser.close()}
  console.log(engine+': navigation save / cancelled departure / pageshow audio PASS');
 }
 fs.writeFileSync(path.join(root,'docs/music/verification/navigation.json'),JSON.stringify(records,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
