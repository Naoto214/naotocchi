// iPhone-size browser QA (Chromium, 390x844, touch) of the owner trial build served at QA_URL (default http://127.0.0.1:8765/).
// Real UI clicks only for game actions (tests/ui-browser-helpers.cjs); the engine is used in-page only to find a deal and a
// save prefix where ぴょんぴょんジャンプ can be followed by a time-skip. Usage: node tools/ui-qa.cjs <screenshot dir>
const {reveal,projection,actionButton}=require('../../tests/ui-browser-helpers.cjs');
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
const URL_=process.env.QA_URL||'http://127.0.0.1:8765/',dir=process.argv[2];fs.mkdirSync(dir,{recursive:true});
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
(async()=>{const browser=await chromium.launch({headless:true});const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const report={viewport:'390x844',touch:true,checks:{}};
await page.goto(URL_);await page.locator('#dj-qa summary').click();
// 1. QA panel: every fixed scenario reports OK
const results={};for(const b of await page.locator('[data-dj]').all()){const key=await b.getAttribute('data-dj');if(key==='deck')continue;await b.click();
 const txt=await page.locator('#dj-log').innerText();results[key]={ok:(txt.match(/OK/g)||[]).length,ng:(txt.match(/NG/g)||[]).length,text:txt};
 if(key==='single')await page.locator('#dj-qa').screenshot({path:dir+'/qa-panel-single.png'});}
report.checks.qaPanel=results;assert.ok(Object.values(results).every(r=>r.ok>0&&r.ng===0),JSON.stringify(results));report.checks.qaPanelOverflow=await overflow(page);
// 2. Card detail from the deck editor's catalog (production UI)
await page.locator('#my-decks-open').click();await page.waitForTimeout(300);if(!(await page.locator('#card-search').isVisible()))await page.locator('#deck-editor > summary').click();await page.locator('#card-search').fill('ぴょんぴょんジャンプ');await page.waitForTimeout(300);
const item=page.locator('#catalog-list [data-inspect],#catalog-list [data-browse],#catalog-list button').first();await item.click();await page.waitForTimeout(400);
const dlg=page.locator('#card-dialog');report.checks.detailOpen=await dlg.isVisible();
if(report.checks.detailOpen){report.checks.detailText=(await dlg.innerText()).includes('そのときおくりで段階が1つだけ上がった場合、さらに自分のそだち+5。');await page.screenshot({path:dir+'/card-detail.png'});report.checks.detailOverflow=await overflow(page);await page.locator('#card-dialog [data-close]').click();}
// 3. Real match through the UI: one-stage time-skip after ぴょんぴょんジャンプ (draw + 5), then a two-stage case (draw only)
async function scenario(jumpWanted,label){
 const found=await page.evaluate(async(jw)=>{const e=await import('./engine.mjs');
  const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
  const deck=x({'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-dog-06':1,'M-beetle-01':3,'M-beetle-02':3,'M-beetle-03':2,'G-doodle-jump':3,'E-mirror':3,'C-shiba':3,'W-snow':2,'I-c_coin2':3,'G-sugoroku-race':3});
  const cid=(s,id)=>s.cards[id]?.cardId;
  for(let seed=1;seed<400;seed++){let s=e.createGame(seed,{A:deck,B:deck});let guard=0;
   while(s.phase!=='finished'&&guard++<1500){const acts=e.legalActions(s),p=s.players[e.actor(s)];
    if(s.phase==='normal'&&s.players[s.turn].board.main){const dj=acts.find(a=>a.kind==='programPlay'&&cid(s,a.source)==='G-doodle-jump');
     const skips=acts.filter(a=>a.kind==='place'&&a.variant==='time_skip'&&dj&&a.cost+dj.cost<=p.time);
     const from=e.CARDS[cid(s,p.board.main)].stage;const want=skips.find(a=>(jw===1)===(e.CARDS[cid(s,a.source)].stage-from===1));
     if(dj&&want)return {save:e.save(s),seat:s.turn,target:want.source};}
    const pick=acts.find(a=>a.kind==='choose')??acts.find(a=>a.kind==='skip')??acts.find(a=>a.kind==='place'&&a.variant==='birth')??acts.find(a=>a.kind==='pass')??acts[0];
    s=e.act(s,e.actor(s),s.revision,pick.id);}}
  return null;},jumpWanted);
 assert.ok(found,label+': no deal found');
 await page.evaluate(v=>localStorage.setItem('naotocchi-hotseat-v1',v),found.save);
 await page.goto(URL_);await page.locator('#match-mode').selectOption('hotseat');await page.locator('#restore').click();await reveal(page);
 const v0=await projection(page);const me=v0.players[v0.actor];const before={growth:me.growth,hand:me.hand.length};
 const djAct=v0.actions.find(a=>a.kind==='programPlay'&&a.label.startsWith('ぴょんぴょんジャンプ'));assert.ok(djAct,label+': card playable');
 await (await actionButton(page,djAct)).click();if(await page.locator('#confirm-dialog').isVisible())await page.locator('[data-confirm]').click();
 for(let i=0;i<20;i++){await reveal(page);const v=await projection(page);if(v.phase==='normal'&&v.actor===found.seat)break;const a=v.actions.find(x=>x.kind==='pass')??v.actions[0];await (await actionButton(page,a)).click();if(await page.locator('#confirm-dialog').isVisible())await page.locator('[data-confirm]').click();}
 const v1=await projection(page);const skip=v1.actions.find(a=>a.kind==='place'&&a.source===found.target);assert.ok(skip,label+': time-skip still available');
 await (await actionButton(page,skip)).click();if(await page.locator('#confirm-dialog').isVisible())await page.locator('[data-confirm]').click();
 for(let i=0;i<20;i++){await reveal(page);const v=await projection(page);if(v.phase==='normal')break;const a=v.actions.find(x=>x.kind==='skip')??v.actions.find(x=>x.kind==='pass')??v.actions[0];await (await actionButton(page,a)).click();if(await page.locator('#confirm-dialog').isVisible())await page.locator('[data-confirm]').click();}
 await reveal(page);const v2=await projection(page);const after={growth:v2.players[found.seat].growth,hand:v2.players[found.seat].hand.length};
 await page.screenshot({path:dir+`/match-${jumpWanted===1?'single':'multi'}.png`});const ov=await overflow(page);
 // save / restore through the UI
 await page.reload();await page.locator('#match-mode').selectOption('hotseat');await page.locator('#restore').click();await reveal(page);const v3=await projection(page);
 return {before,after,growthDelta:after.growth-before.growth,handDelta:after.hand-before.hand,overflow:ov,restoredGrowth:v3.players[found.seat].growth};}
report.checks.matchSingle=await scenario(1,'single');report.checks.matchMulti=await scenario(2,'multi');
assert.equal(report.checks.matchSingle.growthDelta,5);assert.equal(report.checks.matchMulti.growthDelta,0);
for(const k of ['matchSingle','matchMulti'])assert.equal(report.checks[k].restoredGrowth,report.checks[k].after.growth);
// 4. Old hotseat-2 save (finished) restores in the UI and shows the result
const old=JSON.parse(fs.readFileSync(__dirname+'/../../tests/doodle-jump-hotseat2-saves.json','utf8')).rows[0].save;
await page.evaluate(v=>localStorage.setItem('naotocchi-hotseat-v1',v),JSON.stringify(old));await page.goto(URL_);await page.locator('#match-mode').selectOption('hotseat');await page.locator('#restore').click();await reveal(page);
report.checks.oldSaveResult=await page.locator('#result').count()>0;if(report.checks.oldSaveResult)report.checks.oldSaveResultText=(await page.locator('#result').innerText()).slice(0,200);await page.screenshot({path:dir+'/old-save-result.png',fullPage:false});
// 5. QA deck → My decks, CPU match starts with it (CPU also on my deck)
await page.goto(URL_);await page.locator('#dj-qa summary').click();await page.locator('[data-dj="deck"]').click();report.checks.deckAdded=(await page.locator('#dj-log').innerText()).includes('OK');
await page.reload();await page.locator('#match-mode').selectOption('cpu');const modes=await page.locator('#cpu-deck-mode option').evaluateAll(o=>o.map(x=>x.value));if(modes.includes('mydeck'))await page.locator('#cpu-deck-mode').selectOption('mydeck');
await page.locator('#new').click();if(await page.locator('#confirm-dialog').isVisible())await page.locator('[data-confirm]').click();await page.waitForTimeout(1500);await reveal(page);
report.checks.cpuMatchStarted=await page.locator('#hand').count()>0||await page.locator('#game:not([hidden])').count()>0;await page.screenshot({path:dir+'/cpu-match.png'});report.checks.cpuOverflow=await overflow(page);
// 6. Records screen
await page.goto(URL_);await page.locator('#records-open').click();await page.waitForTimeout(400);await page.screenshot({path:dir+'/records.png'});report.checks.recordsOverflow=await overflow(page);
report.pageErrors=errors;console.log(JSON.stringify(report,null,1));await browser.close();
assert.deepEqual(errors,[]);})().catch(e=>{console.error(e);process.exit(1);});
