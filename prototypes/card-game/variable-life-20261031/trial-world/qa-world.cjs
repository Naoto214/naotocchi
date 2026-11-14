// 比較試遊版（せかい XI・XII、方式 A／B／C）のブラウザ確認。trial-world/build-trial.mjs の出力を配信した静的サーバーに対して実行する。
// 操作はすべて本物の画面のボタンを押す。どのボタンを押すかは、保存された対戦から作った「その時の手番の人に見える情報」で決める
// （../trial/qa-trial.cjs と同じ方法）。そのために試遊版と同じパッチ済みモジュール（STAGE）を node で読む。
// 使い方: TRIAL_URL=http://127.0.0.1:8772/ STAGE=<.stage> SAVES=<make-save.mjs の出力dir> SHOTS=<dir> node trial-world/qa-world.cjs
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const URL0=process.env.TRIAL_URL,STAGE=path.resolve(process.env.STAGE),SAVES=process.env.SAVES,SHOTS=process.env.SHOTS;
const KEY='naotocchi-hotseat-v1',PREFIX='naotocchi-world-trial:';
const log=[];const note=(...m)=>{log.push(m.join(' '));console.log(...m);};
(async()=>{
const {decodeMatch}=await import(path.join(STAGE,'records-match.mjs'));
const b=await (process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true});const errors=[];
try{for(const [name,viewport] of [['iphone-portrait',{width:390,height:844}],['iphone-landscape',{width:844,height:390}]]){
 const ctx=await b.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
 const shot=async n=>{if(SHOTS)await p.screenshot({path:`${SHOTS}/${name}-${n}.png`});};
 const saved=()=>p.evaluate(k=>localStorage.getItem(k),KEY);
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
 const placeAction=(v,n)=>v.actions.find(a=>a.kind==='place'&&a.label.startsWith(n+'を配置'));
 // 1つの操作のあと、強制の能力（出した時）や応答を、パス・見送り・強制の発動で進めて、自分の行動機会に戻す。
 const settle=async()=>{for(let n=0;n<40;n++){await reveal();const v=await view();if(v.phase==='normal'&&v.actor==='A'||v.result)return v;const a=v.actions.find(x=>x.kind==='choose')??v.actions.find(x=>x.kind==='skip')??v.actions.find(x=>x.kind==='pass')??v.actions[0];await press(a);}throw Error('進みません');};
 const place=async n=>{let v=await view();const a=placeAction(v,n);assert.ok(a,n+' を出せる');await press(a);v=await settle();return v;};
 const restore=async raw=>{await p.evaluate(([k,r])=>localStorage.setItem(k,r),[KEY,raw]);await p.reload();await p.locator('#hotseat-open').tap();await p.locator('#restore').tap();await reveal();await p.locator('#game').waitFor({state:'visible'});};

 // 1) 対戦の準備：方式を選ぶ（C）→ 新しい2人対戦。両者のデッキに C の XI・XII が1枚ずつ。選んだ方式は次に開いても残る。
 await p.goto(URL0);await p.locator('#hotseat-open').tap();await p.locator('#life-trial-note').scrollIntoViewIfNeeded();
 assert.match(await p.locator('#life-trial-note').innerText(),/通常どおりR10[\s\S]*ふつうのセカイと同じように[\s\S]*最大R12/);
 await p.locator('#world-mode').selectOption('C');await shot('setup');
 await p.locator('#new').tap();await reveal();await p.locator('#game').waitFor({state:'visible'});
 assert.match(await p.locator('body').innerText(),/比較試遊版：方式C／A：.+ → XI・XII／B：.+ → XI・XII/,'入れ替えの案内');
 {const g=JSON.parse(await saved());for(const s of ['A','B'])for(const id of ['X-XI-C','X-XII-C'])assert.equal(g.decks[s].filter(c=>c===id).length,1,`${s}に${id}`);assert.deepEqual(g.recordsMeta.decks.B.cards,g.decks.B);}
 assert.match(await indicator(),/ROUND 1\/10/);
 const keys=await p.evaluate(()=>{const out=[];for(let i=0;i<localStorage.length;i++)out.push(localStorage.key(i));return out;});assert.ok(keys.every(k=>k.startsWith(PREFIX)),'保存の鍵はすべて比較試遊版専用');
 await p.reload();await p.locator('#hotseat-open').tap();assert.equal(await p.locator('#world-mode').inputValue(),'C','選んだ方式が残る');note(name,'準備：方式C・デッキ・保存の鍵・方式の記憶 OK');

 // 2) 方式ごとに、R8・先攻A（A が XI・XII を手札に持つ）の保存から。
 for(const m of ['A','B','C']){
  await restore(fs.readFileSync(path.join(SAVES,`r8-${m}.json`),'utf8'));assert.match(await indicator(),/ROUND 8\/10/);
  let v=await view();
  if(m==='A'){assert.equal(placeAction(v,'XII'),undefined,'A：終了ラウンド10では XII を出せない（画面に操作が出ない）');
   v=await place('XI');assert.equal(v.life.final,11);assert.match(await indicator(),/ROUND 8\/11.*延長/);await shot('A-xi');
   v=await place('XII');assert.equal(v.life.final,12);assert.match(await indicator(),/ROUND 8\/12/);await shot('A-xii');}
  if(m==='B'){v=await place('XII');assert.equal(v.life.final,12,'B：XII で12');v=await place('XI');assert.equal(v.life.final,12,'B：後の XI で短くならない');assert.match(await indicator(),/ROUND 8\/12/);await shot('B');}
  if(m==='C'){v=await place('XII');assert.equal(v.life.final,11,'C：XII を先に出すと11');v=await place('XI');assert.equal(v.life.final,12,'C：XI で12');await shot('C');}
  assert.equal(v.players.A.board.world?.cardId,m==='A'?'X-XII-A':m==='B'?'X-XI-B':'X-XI-C','最後に出したカードがセカイ枠に残る');
  note(name,`方式${m}：${m==='A'?'XIIは11の後だけ→XI 11→XII 12':m==='B'?'XII 12→XI 12のまま':'XII 11→XI 12'} OK`);
  // 再読み込み→再開しても終了ラウンドは同じ（保存は seed・デッキ・コマンドだけ）。
  const before=await saved();await restore(before);assert.equal(await saved(),before,'再開で保存が変わらない');assert.match(await indicator(),/\/12/);
  if(m!=='A')continue;
  // 方式Aだけ最後まで：パス・見送りで進め、R12 最終比較・R10時点の表示・戦績を確かめる。
  for(let n=0;n<2000&&!(await p.locator('#result').count());n++){await reveal();v=await view();if(v.result)break;const a=v.actions.find(x=>x.kind==='choose')??v.actions.find(x=>x.kind==='skip')??v.actions.find(x=>x.kind==='pass')??v.actions[0];await press(a);}
  const result=await p.locator('#result').innerText();assert.match(result,/R12最終比較/);assert.match(result,/R10終了時点 · A \d+ \/ B \d+（延長でR12まで）/);note(name,'結果：',result.replace(/\s+/g,' ').slice(0,120));await shot('result');
  const rec=await p.evaluate(()=>localStorage.getItem('naotocchi-card-records-v1'));assert.ok(rec&&JSON.parse(rec).rows.some(r=>r[10]===12),'R12 の対戦が戦績に記録される');
 }
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'横スクロールなし');
 await ctx.close();note(name,'OK');
}
assert.deepEqual(errors,[]);note('ページエラー 0件');
}finally{await b.close();if(SHOTS)fs.writeFileSync(path.join(SHOTS,'qa-log.txt'),log.join('\n')+'\n');}
})().catch(e=>{console.error(e);process.exit(1);});
