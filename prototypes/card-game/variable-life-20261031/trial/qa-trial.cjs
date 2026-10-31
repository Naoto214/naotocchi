// 試遊版（人生延長・しかける×1枚）のブラウザ確認。build-trial.mjs の出力を配信した静的サーバーに対して実行する。
// 操作はすべて本物の画面のボタンを押す。どのボタンを押すかは、保存された対戦から作った「その時の手番の人に見える情報」
// （ui-browser-helpers.cjs と同じ考え方）で決める。そのために試遊版と同じパッチ済みモジュール（STAGE）を node で読む。
// 使い方: TRIAL_URL=http://127.0.0.1:8770/ STAGE=<.stage> SAVE=<make-save.mjs の出力> SHOTS=<dir> node trial/qa-trial.cjs
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const URL0=process.env.TRIAL_URL,STAGE=path.resolve(process.env.STAGE),SAVE=fs.readFileSync(process.env.SAVE,'utf8'),SHOTS=process.env.SHOTS;
const KEY='naotocchi-hotseat-v1',PREFIX='naotocchi-life-trial:',X='X-life-extend';
const log=[];const note=(...m)=>{log.push(m.join(' '));console.log(...m);};
(async()=>{
const {decodeMatch}=await import(path.join(STAGE,'records-match.mjs'));
const b=await (process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true});const errors=[];
try{for(const [name,viewport] of [['iphone-portrait',{width:390,height:844}],['iphone-landscape',{width:844,height:390}]]){
 const ctx=await b.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
 const shot=async n=>{if(SHOTS)await p.screenshot({path:`${SHOTS}/${name}-${n}.png`});};
 const saved=()=>p.evaluate(k=>localStorage.getItem(k),KEY);
 const view=async()=>{const {session}=decodeMatch(await saved());session.reveal();return {v:session.projection,raw:await saved()};};
 const reveal=async()=>{if(await p.locator('#curtain').isVisible()){assert.equal(await p.locator('#hand').count(),0,'受け渡し中は手札を見せない');await p.locator('#reveal').click();}};
 const indicator=()=>p.locator('.turn-indicator small').first().innerText();
 const closeDetail=async()=>{if(await p.locator('#card-dialog').isVisible()){await p.locator('#card-dialog [data-close]').click();await p.locator('#card-dialog').waitFor({state:'hidden'});}};
 // tests/ui-browser-helpers.cjs actionButton と同じ探し方（カードを開く→ボタン、または操作パネル）。
 const button=async a=>{
  const find=async()=>{const modal=await p.locator('#card-dialog').isVisible(),ns=p.locator(modal?'#card-dialog [data-action]':'#operation-panel [data-action]');const i=await ns.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.action===id),a.id);return i>=0?ns.nth(i):null;};
  let x=await find();if(x)return x;await closeDetail();x=await find();if(x)return x;
  if(!a.source){await p.locator('#operation-panel [data-workflow]').click();x=await find();if(x)return x;throw Error('操作が見つかりません '+a.label);}
  if(await p.locator('#hand.hand-collapsed').count())await p.locator('[data-hand-toggle]').click();
  const cards=p.locator('#game [data-inspect]');const i=await cards.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.inspect===id),a.source);
  if(i>=0){await cards.nth(i).click();await p.waitForTimeout(410);const use=p.locator('#card-dialog .stage-band [data-inspect]');if(await use.count())await use.click();x=await find();if(x)return x;}
  await closeDetail();await p.locator('#operation-panel [data-workflow]').click();x=await find();if(x)return x;throw Error('画面から選べない操作 '+a.label);};
 const press=async a=>{await (await button(a)).click();if(await p.locator('#confirm-dialog').isVisible())await p.locator('[data-confirm]').click();};

 // 1) 開始ページ：試遊版の説明。新しい2人対戦で、両者のデッキに人生延長が1枚ずつ入る。保存の鍵は試遊版専用。
 await p.goto(URL0);await p.locator('#hotseat-open').tap();await p.locator('#life-trial-note').scrollIntoViewIfNeeded();
 assert.match(await p.locator('#life-trial-note').innerText(),/最終ラウンドの自分のターン終了時[\s\S]*R11[\s\S]*R12/);await shot('setup');
 await p.locator('#new').tap();await reveal();await p.locator('#game').waitFor({state:'visible'});
 assert.match(await p.locator('body').innerText(),/試遊版：A：.+→ 人生延長（仮）／B：.+→ 人生延長（仮）/,'入れ替えの案内');
 {const {v,raw}=await view(),g=JSON.parse(raw);for(const s of ['A','B'])assert.equal(g.decks[s].filter(c=>c===X).length,1,`${s}のデッキに1枚`);
  assert.deepEqual(g.recordsMeta.decks.A.cards,g.decks.A,'戦績用のデッキも同じ40枚');assert.match(await indicator(),/ROUND 1\/10/);void v;}
 const keys=await p.evaluate(()=>{const out=[];for(let i=0;i<localStorage.length;i++)out.push(localStorage.key(i));return out;});
 assert.ok(keys.length&&keys.every(k=>k.startsWith(PREFIX)),'保存の鍵はすべて試遊版専用 '+keys.join(','));await shot('new-match');

 // 2) R10・後攻B（Bはそだち65、Aは80）の保存から再開。
 await p.evaluate(([k,r])=>localStorage.setItem(k,r),[KEY,SAVE]);await p.reload();await p.locator('#hotseat-open').tap();await p.locator('#restore').tap();await reveal();await p.locator('#game').waitFor({state:'visible'});
 assert.match(await indicator(),/ROUND 10\/10/);await shot('r10-restored');
 let setB=false,firedB=false,setA=false,firedA=false,reloaded=false,hiddenChecked=false,badge11=false,badge12=false,steps=0;
 while(!(await p.locator('#result').count())&&steps++<1500){
  await reveal();const {v,raw}=await view(),me=v.actor,acts=v.actions;assert.ok(acts.length,'操作がある');
  const isX=a=>Boolean(a.source)&&/^人生延長（仮）/.test(a.label??''); // たこやきやさん等が人生延長を対象にする操作は含めない
  let a=null;
  if(me==='B'&&v.round===10&&!setB)a=acts.find(x=>x.kind==='place'&&isX(x));
  if(!a&&me==='A'&&v.round===11&&!setA)a=acts.find(x=>x.kind==='place'&&isX(x));
  if(!a)a=acts.find(x=>x.kind==='trigger'&&isX(x));
  if(!a)a=acts.find(x=>x.kind==='choose')??acts.find(x=>x.kind==='skip')??acts.find(x=>x.kind==='pass')??acts[0];
  if(a.kind==='place'&&isX(a)){if(me==='B'){setB=true;note('B が R10 に人生延長をしかけた（時',v.players.B.time,'）');}else{setA=true;note('A が R11 に人生延長をしかけた');}}
  if(a.kind==='trigger'&&isX(a)){assert.equal(v.round,v.life.final,'最終ラウンドに発動');if(me==='B'){firedB=true;assert.equal(v.round,10);}else{firedA=true;assert.equal(v.round,11);}note(me,'が R'+v.round,'の自分のターン終了時に人生延長を発動');}
  // 伏せた延長：相手から見ると中身が分からない（Aがしかけた後、Bの手番で確かめる）。
  const rev0=JSON.parse(raw).commands.length;await press(a);
  if(a.kind!=='pass'&&isX(a)){const n=JSON.parse(await saved()).commands.length;note('  ',a.kind,a.label,'commands',rev0,'->',n);}
  // 伏せた延長：Aがしかけた直後、Bの立場で見た盤面では中身が分からない（Bが見るのは裏向きのカードだけ）。
  if(a.kind==='place'&&isX(a)&&me==='A'&&!hiddenChecked){const {session}=decodeMatch(await saved());session.viewer='B';const prep=session.projection.players.A.board.prepared;
   note('Bから見たAの準備枠（生）：',JSON.stringify(prep));assert.ok(prep.length&&prep.every(c=>c.hidden&&c.cardId!==X&&!/人生延長/.test(JSON.stringify(c))),'相手のしかけは非公開');const mine=session.projection.players.A;void mine;hiddenChecked=true;note('Bから見たAの準備枠：',JSON.stringify(prep));}
  if(firedB&&!badge11&&v.round>=10){await reveal();if(/ROUND 1[01]\/11/.test(await indicator())){assert.match(await p.locator('.turn-indicator').first().innerText(),/延長/);badge11=true;await shot('extended-r11');}}
  if(firedA&&!badge12){await reveal();if(/\/12/.test(await indicator())){badge12=true;await shot('extended-r12');}}
  // 延長後の保存→再開：最終ラウンドは保存に書かれていないが、再生で同じになる。
  if(setA&&!reloaded){const before=await saved();await p.reload();await p.locator('#hotseat-open').tap();await p.locator('#restore').tap();await reveal();assert.equal(await saved(),before,'再開で保存が変わらない');assert.match(await indicator(),/ROUND 11\/11/);reloaded=true;note('R11 で再読み込み→再開（ROUND 11/11 のまま）');}
 }
 assert.ok(setB&&firedB&&setA&&firedA,'両者がしかけて発動');assert.ok(badge11&&badge12&&reloaded&&hiddenChecked);
 const result=await p.locator('#result').innerText();assert.match(result,/R12最終比較/);assert.match(result,/R10終了時点 · A \d+ \/ B \d+（人生延長でR12まで）/);note('結果：',result.replace(/\s+/g,' ').slice(0,160));await shot('result');
 const rec=await p.evaluate(()=>localStorage.getItem('naotocchi-card-records-v1'));assert.ok(rec&&JSON.parse(rec).rows.some(r=>r[10]===12),'R12で終わった対戦が戦績に記録される');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'横スクロールなし');
 await ctx.close();note(name,'OK');
}
assert.deepEqual(errors,[]);note('ページエラー 0件');
}finally{await b.close();if(SHOTS)fs.writeFileSync(path.join(SHOTS,'qa-log.txt'),log.join('\n')+'\n');}
})().catch(e=>{console.error(e);process.exit(1);});
