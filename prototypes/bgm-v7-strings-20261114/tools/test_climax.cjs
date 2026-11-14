const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');
(async()=>{for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
const browser=await type.launch({headless:true,...(name==='chromium'?{executablePath:'/usr/bin/chromium'}:{})});try{
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const url=process.env.COMPARE_URL||'http://127.0.0.1:8769/bgm-v7-strings/';await page.goto(url);
for(const [i,start] of [62,49.8,56.8,25].entries()){
 await page.locator(`[data-climax="${i}"]`).click();await page.waitForFunction(i=>window.BGM_COMPARE.state().id===window.BGM_COMPARE.tracks[i].id&&window.BGM_COMPARE.state().playing,i);let s=await page.evaluate(()=>window.BGM_COMPARE.state());assert.ok(s.position>=start&&s.position<start+2);await page.locator('#pause').click();}
await page.goto(url+'dry.html');
for(let i=0;i<4;i++){await page.locator(`[data-climax="${i}"]`).click();await page.waitForFunction(i=>window.BGM_COMPARE.state().id===window.BGM_COMPARE.tracks[i].id&&window.BGM_COMPARE.state().playing,i);await page.locator('#pause').click();await page.locator('#seek').fill('3000');await page.locator('#seek').dispatchEvent('change');for(const v of [7,8,6])await page.locator(`[data-version="${v}"]`).click();assert.equal((await page.evaluate(()=>window.BGM_COMPARE.state())).position,3);}
const n=await page.evaluate(async()=>{const c=new AudioContext();let n=0;for(const t of BGM_COMPARE.tracks)for(const v of ['a','b1','b2']){let b=await c.decodeAudioData(await (await fetch('../audio/v7-strings/dry/'+v+'/'+t.id+'.m4a')).arrayBuffer());if(Math.abs(b.duration-t.duration)>.05)throw Error('dry duration');n++}await c.close();return n});assert.equal(n,12);assert.equal(errors.length,0,errors.join('\n'));console.log(name+': PASS 4 climax jumps, dry12 AAC, dry same-position switching');
}finally{await browser.close()}}})().catch(e=>{console.error(e);process.exit(1)});
