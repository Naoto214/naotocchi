const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '../../..');
(async () => {
  assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'), /href="prototypes\/naopoyo\/"/, 'main menu launches series');
  const server = http.createServer((req,res) => {
    let url = new URL(req.url,'http://localhost').pathname;
    if(url.endsWith('/')) url += 'index.html';
    const file=path.resolve(root,'.'+url);
    if(!file.startsWith(root+'/')) {res.writeHead(403);res.end();return;}
    fs.readFile(file,(e,d)=>{res.writeHead(e?404:200,{'Content-Type': /\.(mjs|js)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html'});res.end(e?'missing':d);});
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/root/.cache/ms-playwright/chromium_headless_shell-1161/chrome-linux/headless_shell',headless:true});
  const errors=[];
  const base=`http://127.0.0.1:${server.address().port}`;
  const output=process.env.QA_OUT || path.join(root,'test-results/naopoyo-integration');
  fs.mkdirSync(output,{recursive:true});
  try {
    let qaHtml;
    require(path.join(root,'tests/visual-qa.cjs'))().configureServer({middlewares:{use(_path,handler){handler({}, {setHeader(){},end(html){qaHtml=html;}});}}});
    const source=qaHtml.match(/<script>([\s\S]*?)<\/script>/)[1];
    const fixtures=require('node:vm').runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');
    for (const [width,height] of [[320,568],[390,844]]) {
      const ctx=await browser.newContext({viewport:{width,height},hasTouch:true});
      const page=await ctx.newPage(); page.on('pageerror',e=>errors.push(e.message));
      await page.clock.install({time:new Date('2026-09-12T12:00:00Z')});
      await page.clock.pauseAt(new Date('2026-09-12T12:01:00Z'));
      const fixture=structuredClone(fixtures.phone_dog);
      Object.assign(fixture,{health:100,energy:100,hunger:85,happiness:90,isSick:false,isSleeping:false,transformMeter:0});
      await page.addInitScript(s=>{if(!localStorage.getItem('naotocchi-save-v1'))localStorage.setItem('naotocchi-save-v1',JSON.stringify(s));},fixture);
      await page.goto(base+'/'); await page.locator('.device.ui-home-active').waitFor();
      await page.click('#menuBtn');
      const entry=page.locator('.independent-game[href="prototypes/naopoyo/"]'); await entry.scrollIntoViewIfNeeded();
      const rect=await entry.boundingBox(); assert.ok(rect.width>=44&&rect.height>=44&&rect.y>=0&&rect.y+rect.height<=height);
      await page.screenshot({path:path.join(output,`main-menu-${width}.png`)});
      await entry.click(); await page.waitForURL('**/prototypes/naopoyo/');
      assert.equal(await page.locator('.mode-card').count(),2);
      await page.locator('.mode-card[href="../growth-clear/player.html"]').click();
      await page.waitForURL('**/prototypes/growth-clear/player.html');
      await page.locator('#menu').waitFor({state:'visible'});
      const mainSave=await page.evaluate(()=>localStorage.getItem('naotocchi-save-v1'));
      await page.click('#new'); await page.click('#pause');
      assert.match(await page.locator('#cost-label').innerText(),/2 \/ 6/);
      assert.equal(await page.evaluate(()=>localStorage.getItem('naopoyo-player-v1')),null);
      assert.equal(await page.evaluate(()=>localStorage.getItem('naotocchi-save-v1')),mainSave);
      await ctx.close(); console.log(`PASS main menu -> independent player; main save unchanged ${width}x${height}`);
    }
    // A save retains its own canonical species order when the main dex grows.
    {
      const {Player}=await import('../player-model.mjs');
      const {createSession}=await import('../session.mjs');
      const {standardRules}=await import('../rules.mjs');
      const {board}=await import('../engine.mjs');
      const {unlockedRoster,INITIAL_SPECIES}=await import('../roster.mjs');
      const discovered = ids => ids.flatMap(id=>Array.from({length:8},(_,i)=>`${id}:${i}`));
      const oldRoster=unlockedRoster({discoveredStages:discovered(['cat'])});
      const rules=standardRules({kinds:oldRoster.length}), b=board(rules);
      b[13][0]={id:1,k:0,s:2};
      const catIndex=oldRoster.findIndex(c=>c.id==='cat'); b[13][5]={id:2,k:catIndex,s:3};
      const state=createSession(21,rules,{board:b,gauge:24,species:oldRoster.map(c=>c.id),selected:[0,1,2,3,4]});
      const snap=new Player(state).snapshot();
      const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
      await ctx.addInitScript(({snap,keys})=>{
        localStorage.setItem('naotocchi-save-v1',JSON.stringify({discoveredStages:keys}));
        localStorage.setItem('naopoyo-player-v1',JSON.stringify({version:1,revision:0,snapshot:snap,history:[],seen:{},totals:{},preferences:{selected:[]}}));
      },{snap,keys:discovered(['cat','man'])});
      const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'/prototypes/growth-chain/player.html');
      await page.waitForFunction(()=>!document.getElementById('playStart').disabled);
      await page.click('#restore');await page.click('#resume');await page.click('#transform');
      await page.locator('.cell[data-x="0"][data-y="13"]').focus();await page.keyboard.press('Enter');
      assert.equal(await page.locator('#kindChoices button').count(),oldRoster.length,'restored run keeps its canonical roster');
      const name=oldRoster[catIndex].label;
      const button=page.locator('#kindChoices button').filter({hasText:name});
      assert.equal(await button.getAttribute('data-kind'),String(catIndex));
      await button.click();await page.click('#confirmTool');await page.click('#pause');
      const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('naopoyo-player-v1')).snapshot);
      assert.equal(after.state.species[after.state.board[13][0].k],'cat');
      assert.equal(after.state.gauge,16);
      await ctx.close();console.log('PASS restore after dex expansion: labels, targets and canonical IDs agree');
    }
    for(const [width,height] of [[320,568],[375,667],[390,844],[430,932]]) {
      const ctx=await browser.newContext({viewport:{width,height},hasTouch:true});
      const page=await ctx.newPage(); page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'/prototypes/growth-chain/player.html');
      await page.waitForFunction(()=>!document.getElementById('playStart').disabled);
      await page.evaluate(()=>localStorage.setItem('naotocchi-save-v1', JSON.stringify({discoveredStages:[],sentinel:'protected'})));
      const main=await page.evaluate(()=>localStorage.getItem('naotocchi-save-v1'));
      await page.click('#playStart'); await page.click('[data-mode="clear"]'); await page.click('#startSelected');
      await page.click('#pause');
      let standard=await page.evaluate(()=>localStorage.getItem('naopoyo-player-v1'));
      assert.equal(JSON.parse(standard).snapshot.state.rules.gaugeUnit,8);
      await page.goto(base+'/prototypes/growth-chain/player.html?trial=2');
      await page.waitForFunction(()=>!document.getElementById('playStart').disabled);
      const departed = await page.evaluate(()=>localStorage.getItem('naopoyo-player-v1'));
      const beforeData=JSON.parse(standard), afterData=JSON.parse(departed);
      beforeData.revision=afterData.revision;
      assert.deepEqual(afterData,beforeData,'leaving standard only advances save revision');
      standard=departed;
      assert.equal(await page.locator('#restore').isVisible(),false);
      assert.match(await page.locator('.edition').innerText(),/比較.*2.*6/);
      for(const unit of [2,3,4]) {
        await page.goto(base+'/prototypes/growth-chain/player.html?trial='+unit);
        await page.waitForFunction(()=>!document.getElementById('playStart').disabled);
        await page.click('#playStart');await page.click('[data-mode="endless"]');await page.click('#startSelected');
        assert.match(await page.locator('#transform small').innerText(),new RegExp(String(unit)));
        assert.match(await page.locator('#bulk small').innerText(),new RegExp(String(unit*3)));
        const layout=await page.evaluate(()=>{
          const b=document.getElementById('board').getBoundingClientRect();
          return {ratio:b.height/b.width,overflow:document.documentElement.scrollWidth>innerWidth, controls:[...document.querySelectorAll('.controls button')].map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height,bottom:r.bottom};})};
        });
        assert.ok(Math.abs(layout.ratio-2)<0.02);assert.equal(layout.overflow,false);
        assert.ok(layout.controls.every(r=>r.w>=44&&r.h>=44&&r.bottom<=height));
        await page.screenshot({path:path.join(output,`trial-${unit}-${width}.png`)});
        await page.click('#pause');
        const key='naopoyo-player-v1-trial-'+unit;
        assert.equal(await page.evaluate(()=>localStorage.getItem('naopoyo-player-v1')),standard);
        assert.equal(await page.evaluate(()=>localStorage.getItem('naotocchi-save-v1')),main);
        assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).snapshot.state.rules.gaugeUnit,key),unit);
        await page.reload();await page.waitForFunction(()=>!document.getElementById('playStart').disabled);
        await page.click('#restore');assert.equal(await page.locator('#resume').isVisible(),true);
      }
      await page.goto(base+'/prototypes/growth-chain/player.html');
      await page.waitForFunction(()=>!document.getElementById('playStart').disabled);
      await page.click('#restore');await page.click('#resume');
      assert.match(await page.locator('#bulk small').innerText(),/24/);
      await ctx.close();console.log(`PASS standard/trials isolation, reload and geometry ${width}x${height}`);
    }
    assert.deepEqual(errors,[]);
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
