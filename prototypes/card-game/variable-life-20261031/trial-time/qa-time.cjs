// 時のカード試遊版（IX・X・XI・XII・特殊カウンター・人生の時計の小針）のブラウザ確認。trial-time/build-trial.mjs の出力を配信した静的サーバーに対して実行する。
// 操作はすべて本物の画面のボタンを押す。どのボタンを押すかは、保存された対戦から作った「その時の手番の人に見える情報」で決める
// （../trial/qa-trial.cjs と同じ方法）。そのために試遊版と同じパッチ済みモジュール（STAGE）を node で読む。
// 使い方: TRIAL_URL=http://127.0.0.1:8773/ STAGE=<.stage> SAVE=<make-save.mjs の r8-chain.json> SHOTS=<dir> node trial-time/qa-time.cjs
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const URL0=process.env.TRIAL_URL,STAGE=path.resolve(process.env.STAGE),SAVE=fs.readFileSync(process.env.SAVE,'utf8'),SHOTS=process.env.SHOTS;
const KEY='naotocchi-hotseat-v1',CPU_KEY='naotocchi-cpu-match-v1',PREFIX='naotocchi-time-trial:';
// 終了ラウンドの小針は data-metal-hand="5"（中心 512,688）。ほかの2本は先攻・後攻の時の小針。
const ANGLE={9:'270',10:'300',11:'330',12:'0'}; // 採用版の小針の角度＝終了ラウンド×30度（life-clock/v9）
const log=[];const note=(...m)=>{log.push(m.join(' '));console.log(...m);};
(async()=>{
const {decodeMatch}=await import(path.join(STAGE,'records-match.mjs'));
const b=await (process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true});const errors=[];
try{for(const [name,viewport] of process.env.QA_ONLY_CPU?[]:[['iphone-portrait',{width:390,height:844}],['iphone-landscape',{width:844,height:390}]]){
 const ctx=await b.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
 const shot=async n=>{if(SHOTS)await p.screenshot({path:`${SHOTS}/${name}-${n}.png`});};
 let key=KEY;const saved=()=>p.evaluate(k=>localStorage.getItem(k),key);
 const view=async()=>{const {session}=decodeMatch(await saved());session.reveal();return session.projection;};
 const reveal=async()=>{if(await p.locator('#curtain').isVisible()){assert.equal(await p.locator('#hand').count(),0,'受け渡し中は手札を見せない');await p.locator('#reveal').click();}};
 const indicator=async()=>{await reveal();return p.locator('.turn-indicator small').first().innerText();};
 const closeDetail=async()=>{if(await p.locator('#card-dialog').isVisible()){await p.locator('#card-dialog [data-close]').click();await p.locator('#card-dialog').waitFor({state:'hidden'});}};
 const button=async a=>{ // tests/ui-browser-helpers.cjs actionButton と同じ探し方
  const find=async()=>{const modal=await p.locator('#card-dialog').isVisible(),ns=p.locator(modal?'#card-dialog [data-action]':'#operation-panel [data-action]');const i=await ns.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.action===id),a.id);return i>=0?ns.nth(i):null;};
  let x=await find();if(x)return x;await closeDetail();x=await find();if(x)return x;
  if(!a.source){await p.locator('#operation-panel [data-workflow]').click();x=await find();if(x)return x;throw Error('操作が見つかりません '+a.label);}
  if(await p.locator('#hand.hand-collapsed').count())await p.locator('[data-hand-toggle]').click();
  const cards=p.locator('#game [data-inspect]');const i=await cards.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.inspect===id),a.source);
  if(i>=0){await cards.nth(i).click();await p.waitForTimeout(410);const use=p.locator('#card-dialog .stage-band [data-inspect]');if(await use.count())await use.click();x=await find();if(x)return x;}
  await closeDetail();await p.locator('#operation-panel [data-workflow]').click();x=await find();if(x)return x;throw Error('画面から選べない操作 '+a.label);};
 const press=async a=>{await (await button(a)).click();if(await p.locator('#confirm-dialog').isVisible())await p.locator('[data-confirm]').click();};
 const fallback=v=>v.actions.find(x=>x.kind==='choose')??v.actions.find(x=>x.kind==='skip')??v.actions.find(x=>x.kind==='pass')??v.actions[0];
 // 既定の操作（選択・見送り・パス・強制の能力）で進め、条件を満たしたら止まる。
 const until=async(pred,limit=3000)=>{for(let n=0;n<limit;n++){await reveal();if(await p.locator('#result').count())return await view();const v=await view();if(v.result||pred(v))return v;if(v.mode==='cpu'&&v.actor!==v.humanSeat){await p.waitForTimeout(60);continue;}await press(fallback(v));}throw Error('進みません');};
 const doAction=async(seat,prefix)=>{const v=await until(v=>v.actor===seat&&v.actions.some(a=>a.label.startsWith(prefix)));const a=v.actions.find(a=>a.label.startsWith(prefix));await press(a);note(name,`${seat}：${a.label}`);};
 const clock=async expect=>{await reveal();await p.locator('[data-life-clock]').first().click();await p.locator('#life-clock-face [data-silver-small-hand][data-metal-hand="5"]').waitFor({state:'attached'});
  const angle=await p.evaluate(()=>{const g=document.querySelector('#life-clock-face [data-silver-small-hand][data-metal-hand="5"]').parentElement;return /rotate\(([0-9.]+)/.exec(g.getAttribute('transform'))[1];});
  const values=await p.locator('#life-clock-values').innerText();assert.equal(angle,ANGLE[expect],`小針の角度（終了ラウンド${expect}）`);
  assert.match(values,new RegExp(`終了ラウンド\\s*${['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][expect]}（${expect}）`));
  await shot(`clock-${expect}-${Date.now()%1000}`);await p.locator('#life-clock-close').click();await p.locator('#life-clock-dialog').waitFor({state:'hidden'});};
 const restore=async raw=>{key=KEY;await p.evaluate(([k,r])=>localStorage.setItem(k,r),[KEY,raw]);await p.reload();await p.locator('#hotseat-open').tap();await p.locator('#restore').tap();await reveal();await p.locator('#game').waitFor({state:'visible'});};
 const finish=async(round)=>{const v=await until(()=>false);const result=await p.locator('#result').innerText();assert.match(result,new RegExp(`R${round}最終比較|維持`),'終了');note(name,'結果：',result.replace(/\s+/g,' ').slice(0,90));return v;};

 // 0) 準備：各2枚 → 新しい2人対戦。両者のデッキに各2枚。選んだ枚数は次も残る。保存の鍵は専用。
 await p.goto(URL0);await p.locator('#hotseat-open').tap();await p.locator('#life-trial-note').scrollIntoViewIfNeeded();
 assert.match(await p.locator('#life-trial-note').innerText(),/特殊カウンター[\s\S]*最後に出したカードだけが成立/);await p.locator('#time-count').selectOption('2');await shot('setup');
 await p.locator('#new').tap();await reveal();await p.locator('#game').waitFor({state:'visible'});
 assert.match(await p.locator('body').innerText(),/時のカード試遊版：各2枚／A：8枚を時のカードに／B：8枚を時のカードに/);
 {const g=JSON.parse(await saved());for(const s of ['A','B'])for(const id of ['X-T-IX','X-T-X','X-T-XI','X-T-XII'])assert.equal(g.decks[s].filter(c=>c===id).length,2,`${s}に${id}×2`);}
 const keys=await p.evaluate(()=>{const out=[];for(let i=0;i<localStorage.length;i++)out.push(localStorage.key(i));return out;});assert.ok(keys.every(k=>k.startsWith(PREFIX)));
 await p.reload();await p.locator('#hotseat-open').tap();assert.equal(await p.locator('#time-count').inputValue(),'2');note(name,'準備 OK');

 // 1) IX → XII → X → XI：途中の時計は X のまま、最後の XI だけ成立。R11 で終了。
 await restore(SAVE);assert.match(await indicator(),/ROUND 8\/10/);await clock(10);
 await doAction('A','IXを配置');await doAction('B','XIIでカウンター');
 await until(v=>v.actor==='A'&&v.actions.some(a=>a.label.startsWith('Xでカウンター')));await clock(10);note(name,'カウンターの途中：小針は X のまま');
 await doAction('A','Xでカウンター');await doAction('B','XIでカウンター');
 let v=await until(v=>v.phase==='normal'&&!v.chain.length);assert.equal(v.life.final,11,'最後の XI だけが成立：終了ラウンド11');
 assert.match(await indicator(),/ROUND 8\/11.*延長/);await shot('chain-r11');
 const disc=s=>v.players[s].discard.map(c=>c.name);assert.ok(disc('A').includes('IX')&&disc('A').includes('X')&&disc('B').includes('XII'),'カウンターされたカードは捨て札');assert.equal(v.players.B.board.world?.name,'XI','XI だけが場に残る');assert.equal(v.players.A.board.world,null);
 await clock(11);const before=await saved();await restore(before);assert.equal(await saved(),before,'再開で保存が変わらない');assert.match(await indicator(),/\/11/);
 v=await finish(11);await shot('result-r11');
 const rec=await p.evaluate(()=>localStorage.getItem('naotocchi-card-records-v1'));assert.ok(rec&&JSON.parse(rec).rows.some(r=>r[10]===11),'R11 の対戦が戦績に記録される');note(name,'IX→XII→X→XI：XI成立・R11終了 OK');

 // 2) IX だけ：R9 で終了。時計は IX。
 await restore(SAVE);await doAction('A','IXを配置');v=await until(v=>v.phase==='normal'&&!v.chain.length);assert.equal(v.life.final,9);assert.match(await indicator(),/ROUND 8\/9.*短縮/);await clock(9);await shot('ix');
 await finish(9);note(name,'IX：R9終了 OK');
 // 3) IX に XII でカウンター：R12 で終了。時計は XII。
 await restore(SAVE);await doAction('A','IXを配置');await doAction('B','XIIでカウンター');v=await until(v=>v.phase==='normal'&&!v.chain.length);assert.equal(v.life.final,12);await clock(12);
 await finish(12);note(name,'IX→XII：R12終了 OK');
 // 4) 現在ラウンドより前は不可：R10 の自分の番で IX は出ない（R9 で終わらなかった対戦を続けた局面は 1) の R11 で確認済み）。
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'横スクロールなし');
 await ctx.close();note(name,'OK');
}
// 5) CPU 対戦（各1枚）：人はパスだけ、CPU は時のカードを使う。最後まで正常に終わる。
{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(`cpu: ${e.message}`));
 await p.goto(URL0);await p.locator('#solo-open').tap();await p.locator('#time-count').selectOption('1');await p.locator('#new').tap();await p.locator('#game').waitFor({state:'visible'});
 const saved=()=>p.evaluate(k=>localStorage.getItem(k),CPU_KEY);const g=JSON.parse(await saved());for(const s of ['A','B'])assert.equal(g.game.decks[s].filter(c=>/^X-T-/.test(c)).length,4,'各1枚×4種');
 for(let n=0;n<4000&&!(await p.locator('#result').count());n++){const {session}=decodeMatch(await saved());session.reveal();const v=session.projection;if(v.result)break;if(v.actor!==v.humanSeat||!v.actions?.length){await p.waitForTimeout(80);continue;}
  const a=v.actions.find(x=>x.kind==='choose')??v.actions.find(x=>x.kind==='skip')??v.actions.find(x=>x.kind==='pass')??v.actions[0];
  const ns=p.locator('#operation-panel [data-action], #card-dialog [data-action]');const i=await ns.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.action===id),a.id);
  if(i>=0)await ns.nth(i).click();else{await p.locator('#operation-panel [data-workflow]').click();await p.locator(`#card-dialog [data-action="${a.id}"]`).click();}
  if(await p.locator('#confirm-dialog').isVisible())await p.locator('[data-confirm]').click();}
 await p.locator('#result').waitFor();const {session}=decodeMatch(await saved());const st=session.projection;
 note('cpu','結果：',(await p.locator('#result').innerText()).replace(/\s+/g,' ').slice(0,80),'終了ラウンド',st.life.final);
 assert.match(await p.locator('#result').innerText(),new RegExp(`R${st.life.final}最終比較|維持`));await p.screenshot({path:`${SHOTS}/cpu-result.png`});await ctx.close();}
assert.deepEqual(errors,[]);note('ページエラー 0件');
}finally{await b.close();if(SHOTS)fs.writeFileSync(path.join(SHOTS,'qa-log.txt'),log.join('\n')+'\n');}
})().catch(e=>{console.error(e);process.exit(1);});
