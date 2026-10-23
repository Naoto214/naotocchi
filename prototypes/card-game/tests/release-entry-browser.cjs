const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true});const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));try{
await p.goto((process.env.RELEASE_BASE_URL||'http://127.0.0.1:8765/')+'prototypes/card-game/');
await p.click('#my-decks-open');assert.ok(await p.locator('#deck-editor').evaluate(d=>d.open));assert.match(await p.locator('#my-deck-total').innerText(),/デッキ/);
await p.click('#solo-open');await p.selectOption('#human-seat','A');await p.click('#new');await p.locator('#game').waitFor({state:'visible'});assert.ok(await p.locator('#game .card-face').count());
const saved=await p.evaluate(()=>localStorage.getItem('naotocchi-cpu-match-v1'));assert.ok(saved);
await p.reload();await p.click('#solo-open');await p.click('#restore');await p.locator('#game').waitFor({state:'visible'});
assert.deepEqual(JSON.parse(await p.evaluate(()=>localStorage.getItem('naotocchi-cpu-match-v1'))),JSON.parse(saved));
await p.click('#reveal');await p.locator('#game .dedicated-art').first().waitFor();await p.waitForFunction(()=>[...document.querySelectorAll('#game img')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0}).every(n=>n.complete&&n.naturalWidth>0));
const images=await p.locator('#game img').evaluateAll(ns=>ns.map(n=>({src:n.getAttribute('src'),loaded:n.complete&&n.naturalWidth>0})));assert.ok(images.length);assert.ok(images.some(x=>x.loaded));assert.deepEqual(errors,[]);
console.log(JSON.stringify({deckScreen:true,cpuStart:true,cpuSaveRestore:true,images:images.length,pageErrors:errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
