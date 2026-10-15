const {chromium}=require('../node_modules/playwright');const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH,args:['--no-sandbox']});fs.mkdirSync(__dirname+'/screens',{recursive:true});
for(const profile of ['E','A','B','C16-20','D0']){
 const c=await b.newContext({viewport:{width:390,height:664},isMobile:true,hasTouch:true});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8765/prototypes/slide08/refill-20261015/ui/index.html?profile='+profile+'&seed=1');await p.waitForFunction(()=>!document.querySelector('#start').disabled);await p.click('#start');await p.locator('#game').waitFor({state:'visible'});
 const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('naopoyo-slide-refill-qa-v1')).snapshot);
 await p.keyboard.press('ArrowLeft');await p.keyboard.press('ArrowLeft');await p.waitForTimeout(1100);assert.equal((await read()).state.moves,1,'animation input collision rejected');
 for(const [w,h] of [[390,664],[667,320],[844,390],[375,667]]){await p.setViewportSize({width:w,height:h});await p.waitForTimeout(100);const g=await p.evaluate(()=>({square:[...document.querySelectorAll('#board button')].every(e=>{const r=e.getBoundingClientRect();return Math.abs(r.width-r.height)<1&&r.width>0}),overflow:document.documentElement.scrollWidth>innerWidth,board:document.querySelector('#board').getBoundingClientRect().bottom}));assert.ok(g.square);assert.ok(!g.overflow);assert.ok(g.board<=h);await p.screenshot({path:__dirname+`/screens/${profile}-${w}.png`});}
 const state=(await read()).state;await p.click('#pause');await p.reload();await p.locator('#restore').click();await p.waitForTimeout(100); // restore dialog may require resume button
 assert.deepEqual((await read()).state,state);assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>localStorage.getItem('naopoyo-slide-player-v1')),null);await c.close();console.log('PASS',profile,'rotation, animation lock, resume, isolated storage');
}await b.close()})().catch(e=>{console.error(e);process.exit(1)});
