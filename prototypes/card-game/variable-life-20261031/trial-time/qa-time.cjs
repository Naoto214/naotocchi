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

 // 0) 準備（VERSION 2）：A は各2、B は XI×1・XII×2 → 新しい2人対戦。デッキの中身・表示・選択の記憶・保存の鍵。
 await p.goto(URL0);await p.locator('#hotseat-open').tap();await p.locator('#life-trial-note').scrollIntoViewIfNeeded();
 assert.match(await p.locator('#life-trial-note').innerText(),/特殊カウンター[\s\S]*最後に出したカードだけが成立/);
 await p.locator('#time-config-A').selectOption('H8');await p.locator('#time-config-B').selectOption('L3');await shot('setup');
 await p.locator('#new').tap();await reveal();await p.locator('#game').waitFor({state:'visible'});
 assert.match(await p.locator('body').innerText(),/時のカード試遊版：CPU判断 VERSION 5／A：各2（8枚）（8枚入れ替え）／B：XI×1・XII×2（延長）（3枚入れ替え）/);
 {const g=JSON.parse(await saved()),n=(s,id)=>g.decks[s].filter(c=>c===id).length;for(const id of ['X-T-IX','X-T-X','X-T-XI','X-T-XII'])assert.equal(n('A',id),2,`Aに${id}×2`);
  assert.deepEqual([n('B','X-T-IX'),n('B','X-T-X'),n('B','X-T-XI'),n('B','X-T-XII')],[0,0,1,2],'B は XI×1・XII×2');assert.equal(g.decks.A.length,40);assert.equal(g.decks.B.length,40);}
 const keys=await p.evaluate(()=>{const out=[];for(let i=0;i<localStorage.length;i++)out.push(localStorage.key(i));return out;});assert.ok(keys.every(k=>k.startsWith(PREFIX)));
 await p.reload();await p.locator('#hotseat-open').tap();assert.equal(await p.locator('#time-config-A').inputValue(),'H8');assert.equal(await p.locator('#time-config-B').inputValue(),'L3');note(name,'準備 OK（A 各2・B XI×1・XII×2）');
 if(process.env.V4DIR){await p.locator('#time-config-A').selectOption('C_haya');await p.locator('#time-config-B').selectOption('C_naga');await p.locator('#new').tap();await reveal();
  const g=JSON.parse(await saved()),n=(s,id)=>g.decks[s].filter(c=>c===id).length;assert.deepEqual([n('A','X-T-IX'),n('A','X-N-hayajimai')],[2,2],'A：IX×2・はやじまい×2');assert.deepEqual([n('B','X-T-XII'),n('B','X-T-XI'),n('B','X-N-nagaiki')],[2,2,2],'B：XI・XII 各2・ながいき×2');
  note(name,'準備 V4：はやじまい＋IX／ながいき＋XI・XII OK');await p.goto(URL0);await p.locator('#hotseat-open').tap();await p.locator('#time-config-A').selectOption('H8');await p.locator('#time-config-B').selectOption('L3');}
 // マイデッキ：時のカードは通常のセカイと同じく同名3枚まで（4種類合計の上限なし）。
 await p.locator('#my-decks-open').tap();await p.locator('#deck-create').tap();await p.locator('#card-search').fill('終了ラウンドを12');
 const row=p.locator('#catalog-list [data-card-id="X-T-XII"]');await row.waitFor();for(let i=0;i<3;i++)await row.locator('[data-add]').tap();
 assert.equal((await row.locator('.deck-card-controls span').innerText()).replace(/\s/g,''),'3/3');assert.equal(await row.locator('[data-add]').isDisabled(),true,'4枚目は入れられない');
 await p.locator('#card-search').fill('終了ラウンドを9');const r9=p.locator('#catalog-list [data-card-id="X-T-IX"]');await r9.waitFor();for(let i=0;i<3;i++)await r9.locator('[data-add]').tap();
 assert.equal((await r9.locator('.deck-card-controls span').innerText()).replace(/\s/g,''),'3/3');await shot('mydeck');note(name,'マイデッキ：XII×3・IX×3（同名3枚まで）OK');
 await p.goto(URL0);

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
 // V4) 新カード（VERSION 4）。保存は make-save-v4.mjs が本物のコマンドの列で作ったもの。
 if(process.env.V4DIR){const F=n=>fs.readFileSync(path.join(process.env.V4DIR,n+'.json'),'utf8');
  const doLabel=async(seat,re)=>{const v=await until(v=>v.actor===seat&&v.actions.some(a=>re.test(a.label)));const a=v.actions.find(a=>re.test(a.label));await press(a);note(name,`${seat}：${a.label}`);};
  // はやじまい：R8 に負けている A が IX → 残り1ラウンド → +15 → R9 で終了。
  await restore(F('r8-haya'));let w=await view();const g0=w.players.A.growth;await doAction('A','IXを配置');w=await until(v=>v.phase==='normal'&&!v.chain.length&&v.life.final===9);
  await doAction('A','はやじまい');w=await until(v=>v.phase==='normal'&&!v.chain.length);assert.equal(w.players.A.growth,g0+15,'はやじまい +15');assert.match(await indicator(),/ROUND 8\/9/);await clock(9);await shot('v4-haya');
  await finish(9);note(name,'はやじまい：R8 IX→+15→R9終了 OK');
  // ながいきのひけつ：R9 に負けている A が XII → 終了ラウンド12 → +15。
  await restore(F('r9-naga'));w=await view();const n0=w.players.A.growth;await doAction('A','XIIを配置');w=await until(v=>v.phase==='normal'&&!v.chain.length&&v.life.final===12);
  await doAction('A','ながいきのひけつ');w=await until(v=>v.phase==='normal'&&!v.chain.length);assert.equal(w.players.A.growth,n0+15,'ながいきのひけつ +15');await clock(12);await shot('v4-naga');
  await finish(12);note(name,'ながいきのひけつ：XII→+15→R12終了 OK');
  // まちぶせどけい：A が伏せる → B の IX に、A が時を2少なくカウンター（1枚引く）。
  await restore(F('r7-machi'));await doAction('A','まちぶせどけい');await doAction('B','IXを配置');await doLabel('A',/XIIでカウンター.*まちぶせどけい/);
  w=await until(v=>v.phase==='normal'&&!v.chain.length);assert.equal(w.life.final,12,'まちぶせどけいで返した XII が成立');assert.ok(w.players.A.discard.some(c=>c.name==='まちぶせどけい'),'まちぶせどけいは捨て札');await shot('v4-machi');note(name,'まちぶせどけい：時−2のカウンター OK');
  // VERSION 5：おいわいのつる（ラウンド終了）。R10・終了ラウンド10。A が置く → 後攻の B が終わるとラウンドの終わりに、負けている A が +5 → R10最終比較。
  if(fs.existsSync(path.join(process.env.V4DIR,'r10-tsuru.json'))){await restore(F('r10-tsuru'));w=await view();const t0=w.players.A.growth,b0=w.players.B.growth;await doLabel('A',/おいわいのつる（ラウンド終了）/);
   const v2=await until(v=>v.actor==='B'&&v.phase==='normal');assert.equal(v2.players.A.growth,t0,'先攻の終了時には増えない');const res=await finish(10);
   const g=await view();assert.ok(g.result,'終了');const A=g.result.growth.A,B=g.result.growth.B;note(name,`つる（ラウンド終了）：A ${t0}→${A}（B ${b0}→${B}）`);assert.ok(A>=t0+5||A>=B,'ラウンドの終わりに負けている A が +5');await shot('v5-tsuru');}
  {const msg=await p.locator('body').innerText();assert.ok(!/戦績を保存できません|戦績を読み込めません/.test(msg),'戦績の保存エラーが出ない');const raw=await p.evaluate(()=>localStorage.getItem('naotocchi-card-records-v1'));const n=JSON.parse(raw).rows.length;assert.ok(n>=4,'終わった対戦（別々の4試合：r8-chain・r8-haya・r9-naga・r10-tsuru）がすべて戦績に残る：'+n);note(name,'戦績：'+n+'件（2戦目以降も保存）');}
  // U12：A のメインがヒトデ⑦。A の IX に B が XII でカウンター → A はヒトデ⑦の置換で IX を山札の一番下へ。IX の効果は不成立（終了ラウンド12）。
  await restore(F('u12-star'));await doAction('A','IXを配置');await doAction('B','XIIでカウンター');await doLabel('A',/ヒトデ⑦の置換を使う/);
  w=await until(v=>v.phase==='normal'&&!v.chain.length);assert.equal(w.life.final,12,'U12：IX は不成立');assert.ok(!w.players.A.discard.some(c=>c.name==='IX')&&w.players.A.board.world?.name!=='IX','U12：IX は捨て札にも場にもない（山札の下）');await clock(12);await shot('v4-u12');note(name,'U12：ヒトデ⑦の置換 OK');
 }
 // 4) 現在ラウンドより前は不可：R10 の自分の番で IX は出ない（R9 で終わらなかった対戦を続けた局面は 1) の R11 で確認済み）。
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'横スクロールなし');
 await ctx.close();note(name,'OK');
}
// 5) CPU 対戦（VERSION 2）：CPU の判断の切り替え、CPU はデッキ別の推奨構成（アイテム・じゅんび）、人は各1。人はパスだけで最後まで。
{const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(`cpu: ${e.message}`));
 await p.goto(URL0);await p.locator('#solo-open').tap();await p.locator('#time-cpu').selectOption('v1');assert.equal(await p.evaluate(()=>globalThis.__timeCpu),'v1');
 await p.locator('#time-cpu').selectOption('v4');assert.equal(await p.evaluate(()=>globalThis.__timeCpu),'v4');
 await p.locator('#cpu-deck-mode').selectOption('choose');await p.locator('#cpu-deck-type').selectOption('item');
 const human=await p.locator('#human-seat').inputValue(),cpuSeat=human==='A'?'B':'A';await p.locator('#time-config-'+human).selectOption('B4');await p.locator('#time-config-'+cpuSeat).selectOption('rec');
 await p.locator('#new').tap();await p.locator('#game').waitFor({state:'visible'});
 const saved=()=>p.evaluate(k=>localStorage.getItem(k),CPU_KEY);const g=JSON.parse(await saved());
 assert.equal(g.game.decks[human].filter(c=>/^X-T-/.test(c)).length,4,'人は各1');
 const REC=JSON.parse(process.env.REC??'{}'),FILL=JSON.parse(process.env.FILL??'{}'),want=FILL[REC.item??'B4']??[];
 assert.equal(g.game.decks[cpuSeat].filter(c=>/^X-[TN]-/.test(c)).sort().join(),[...want].sort().join(),'CPU はアイテム・じゅんびの推奨構成 '+(REC.item??'B4'));note('cpu','CPU 推奨構成（アイテム）：',REC.item);
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
