// Run against a read-only static server; uses the actual DOM for both seats.
const {chromium,webkit}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await (process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8765/prototypes/card-game/');
// Deterministic test-only fresh human deal. Never reads fixed population inputs.
await page.evaluate(async()=>{const e=await import('./engine.mjs');localStorage.setItem('naotocchi-hotseat-v1',e.save(e.createGame(719)));});await page.locator('#restore').click();assert.equal(await page.locator('#hand').count(),0);await page.locator('#reveal').click();assert.equal(await page.locator('#hand').count(),1);
assert.match(await page.locator('#hand').innerText(),/段階 1 · ちから 2 \/ ちえ [23]/);
// Two queued clicks on the same button cannot commit the command twice.
const first=page.locator('#actions button').first();await first.evaluate(b=>{b.click();b.click();});
const savedAfterDouble=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-hotseat-v1')).commands.length);assert.equal(savedAfterDouble,1);
await page.screenshot({path:process.env.SCREENSHOT||'/tmp/naotocchi-hotseat.png',fullPage:true});
let count=1,handoffs=0,reloaded=false;const kinds=new Set();
while(!(await page.locator('#result').count())&&count<1800){
 if(await page.locator('#curtain').isVisible()){assert.equal(await page.locator('#hand').count(),0);assert.equal(await page.locator('#actions').count(),0);await page.locator('#reveal').click();handoffs++;}
 const buttons=await page.locator('#actions button').evaluateAll(bs=>bs.map(b=>({id:b.dataset.action,kind:b.dataset.kind})));
 const score={choose:100,trigger:95,place:80,relationship:75,challenge:70,ability:65,play:60,skip:1,pass:0};buttons.sort((a,b)=>score[b.kind]-score[a.kind]);assert.ok(buttons.length);const a=buttons[0];kinds.add(a.kind);
 const button=page.locator('#actions button');const index=await page.locator('#actions button').evaluateAll((bs,id)=>bs.findIndex(b=>b.dataset.action===id),a.id);
 await button.nth(index).click();count++;
 if(count===30){await page.reload();await page.locator('#restore').click();assert.equal(await page.locator('#hand').count(),0);reloaded=true;}
}
assert.ok(await page.locator('#result').count(),'finished game');assert.ok(handoffs>20);assert.ok(reloaded);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
console.log(JSON.stringify({browser:process.env.BROWSER||'chromium',viewport:'390x844',touch:true,commands:count,handoffs,saveReload:reloaded,result:await page.locator('#result').innerText(),kinds:[...kinds],pageErrors:errors,doubleClickSingleCommit:savedAfterDouble===1,mainStatsVisible:true}));await page.screenshot({path:'/tmp/naotocchi-result.png',fullPage:true});await browser.close();})().catch(e=>{console.error(e);process.exit(1);});
