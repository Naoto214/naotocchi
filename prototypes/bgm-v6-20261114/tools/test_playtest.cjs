const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');
(async()=>{for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true,...(name==='chromium'?{executablePath:'/usr/bin/chromium'}:{})});const page=await browser.newPage();const requested=[];
 page.on('request',r=>{if(r.url().includes('.m4a'))requested.push(r.url())});
 const base=process.env.PLAYTEST_URL||'http://127.0.0.1:8766/';await page.goto(base+'bgm-v6/');
 await page.addScriptTag({url:base+'assets/bgm/catalog.js'});await page.addScriptTag({url:base+'bgm-v2.js'});
 await page.evaluate(base=>{document.body.insertAdjacentHTML('beforeend','<button id="test-game">Game audio</button>');window.testErrors=[];window.testPlayer=NAOTOCCHI_BGM2.create({base:base+'assets/bgm/',onError:e=>testErrors.push(String(e))});document.getElementById('test-game').onclick=()=>{testPlayer.unlock();testPlayer.setSong('home-day')}},base);
 await page.locator('#test-game').click();await page.waitForFunction(()=>window.testPlayer.song==='home-day');
 const errors=await page.evaluate(()=>testErrors);assert.deepEqual(errors,[]);assert.ok(requested.some(u=>/home-day\.m4a\?v=/.test(u)));await page.evaluate(()=>testPlayer.stop());
 const versions=await page.evaluate(()=>({count:Object.keys(NAOTOCCHI_BGM_CATALOG).length,day:NAOTOCCHI_BGM_CATALOG['home-day'].file}));assert.equal(versions.count,32);
 console.log(name+': unchanged game BGM player loads '+versions.day+'; catalog 32');await browser.close();
}})().catch(e=>{console.error(e);process.exit(1)});
