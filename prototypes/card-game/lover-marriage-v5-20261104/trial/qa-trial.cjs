// VERSION 5 試遊版のブラウザ確認（V4 の qa-trial.cjs の写しに、18種類の詳細表示の切れ・文字の大きさ・保存→復帰・V4差分の表示を追加）（Chromium・タッチ、390×844 と 844×390）。build-trial.mjs の出力を静的サーバーで配信して実行する。
// 操作はすべて画面のボタンを押す。押すボタンは、試遊版の画面が持つ「その時の手番の人に見える情報」（projection）で決める。
// 使い方: TRIAL_URL=http://127.0.0.1:8771/ SHOTS=<dir> node trial/qa-trial.cjs
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const URL0=process.env.TRIAL_URL,SHOTS=process.env.SHOTS,PREFIX='naotocchi-lover5-trial:';
const LOVERS=['P-anglerfish','P-cat_ceo','P-cliff_goat','P-desert_scorpion','P-field_cow','P-forest_bear','P-gentle_gorilla','P-grove_deer','P-high_eagle','P-knitting_spider','P-oasis_cactus','P-robot_neighbor','P-rock_octopus','P-sea_mermaid','P-snow_spirit','P-snowman','P-sunflower_partner','P-swamp_croc'];
const log=[];const note=(...m)=>{log.push(m.join(' '));console.log(...m);};
(async()=>{const b=await chromium.launch({headless:true});const errors=[],sizes=[];
try{for(const [name,viewport] of [['iphone-portrait',{width:390,height:844}],['iphone-landscape',{width:844,height:390}]]){
 const ctx=await b.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
 const shot=async n=>{if(SHOTS)await p.screenshot({path:`${SHOTS}/${name}-${n}.png`});};
 const proj=()=>p.evaluate(()=>{const v=window.__lv4Projection?.();return v?JSON.parse(JSON.stringify(v)):null;});
 const reveal=async()=>{if(await p.locator('#curtain').isVisible())await p.locator('#reveal').click();};
 const closeDetail=async()=>{if(await p.locator('#card-dialog').isVisible()){await p.locator('#card-dialog [data-close]').click();await p.locator('#card-dialog').waitFor({state:'hidden'});}};
 const button=async a=>{
  const find=async()=>{const modal=await p.locator('#card-dialog').isVisible(),ns=p.locator(modal?'#card-dialog [data-action]':'#operation-panel [data-action]');const i=await ns.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.action===id),a.id);return i>=0?ns.nth(i):null;};
  let x=await find();if(x)return x;await closeDetail();x=await find();if(x)return x;
  if(!a.source){await p.locator('#operation-panel [data-workflow]').click();x=await find();if(x)return x;throw Error('操作が見つかりません '+a.label);}
  if(await p.locator('#hand.hand-collapsed').count())await p.locator('[data-hand-toggle]').click();
  const cards=p.locator('#game [data-inspect]');const i=await cards.evaluateAll((ns,id)=>ns.findIndex(n=>n.dataset.inspect===id),a.source);
  if(i>=0){await cards.nth(i).click();await p.waitForTimeout(410);const use=p.locator('#card-dialog .stage-band [data-inspect]');if(await use.count())await use.click();x=await find();if(x)return x;}
  await closeDetail();await p.locator('#operation-panel [data-workflow]').click();x=await find();if(x)return x;throw Error('画面から選べない操作 '+a.label);};
 const press=async a=>{await (await button(a)).click();if(await p.locator('#confirm-dialog').isVisible())await p.locator('[data-confirm]').click();await p.waitForTimeout(60);};
 // 自分の結婚の能力（v4）や選択を先に、なければ見送り・パス。
 const settle=async(limit=40,prefer=()=>null)=>{for(let i=0;i<limit;i++){await reveal();const v=await proj();if(!v||v.phase==='normal'&&!v.choice)return v;const acts=v.actions;
  const a=prefer(v,acts)??acts.find(x=>x.kind==='trigger')??acts.find(x=>x.kind==='choose'&&!['cancel','decline','done'].includes(x.value))??acts.find(x=>x.kind==='choose'&&x.value==='done')??acts.find(x=>x.kind==='pass')??acts[0];await press(a);}throw Error('settle limit');};

 await p.goto(URL0);await p.locator('#hotseat-open').tap();await p.locator('.lv4-note').scrollIntoViewIfNeeded();
 const noteText=await p.locator('.lv4-note').innerText();assert.match(noteText,/♥ 結婚したら/);assert.match(noteText,/VERSION 5/);assert.match(noteText,/「保存ファイルを書き出す」は動きません/);
 await p.locator('.lv5-diff summary').tap();const diff=await p.locator('.lv5-diff').innerText();assert.match(diff,/V4：/);assert.match(diff,/V5：/);await shot('setup');note(name,'説明：V5・書き出しの注意・V4からの変更',diff.replace(/\s+/g,' ').slice(0,160));
 // 通常の2人対戦：保存の鍵は試遊版専用。
 await p.locator('#new').tap();await reveal();await p.locator('#game').waitFor({state:'visible'});
 const keys=await p.evaluate(()=>{const out=[];for(let i=0;i<localStorage.length;i++)out.push(localStorage.key(i));return out;});
 assert.ok(keys.length&&keys.every(k=>k.startsWith(PREFIX)),'保存の鍵はすべて試遊版専用 '+keys.join(','));note(name,'通常の2人対戦：保存の鍵',keys.length,'件、すべて試遊版専用');
 // 保存→復帰：1手進めてから再読み込みし、「保存した対戦に戻る」で同じ盤面に戻る。
 {let v=await proj();for(let k=0;k<6&&v.revision<3;k++){const a=v.actions.find(x=>x.kind==='place')??v.actions.find(x=>x.kind==='pass')??v.actions[0];await press(a);await reveal();v=await settle();}assert.ok(v.revision>=3,'数手進める');
  const before=JSON.stringify({r:v.round,t:v.turn,g:[v.players.A.growth,v.players.B.growth],rev:v.revision});
  await p.reload();await p.locator('#hotseat-open').tap();await p.locator('#restore').tap();await reveal();const w=await proj();
  const after=JSON.stringify({r:w.round,t:w.turn,g:[w.players.A.growth,w.players.B.growth],rev:w.revision});assert.equal(after,before,'保存→復帰');note(name,'保存→復帰：同じ盤面',after);}
 // QA：18種類それぞれ、結婚直前 → 交際を進めて結婚 → 結果通知に「使えるようになった」。
 for(const id of LOVERS){
  await p.goto(URL0);await p.locator('#hotseat-open').tap();await p.locator('.lv4-qa summary').tap();
  await p.locator('#lv4-qa-lover').selectOption(id);await p.locator('#lv4-qa-state').selectOption('ready');await p.locator('#lv4-qa-start').tap();await reveal();
  let v=await proj();assert.equal(v.players.A.relationship,3,id);const marry=v.actions.find(a=>a.kind==='relationship');assert.ok(marry,id+' 交際を進める');
  await press(marry);v=await settle();assert.equal(v.players.A.relationship,4,id);assert.equal(v.players.A.growth,60,id+' +10');
  const notice=(await p.locator('#game').innerText()).replace(/\s+/g,' ');
  const hist=JSON.stringify(v.results??[]);assert.match(hist,/使えるようになった/,id+' 解放の通知');
  note(name,id,'結婚 → そだち60・解放の通知', /結婚したら の能力が発動/.test(hist)?'・結婚時の能力が発動':'');
  if(id==='P-high_eagle'||id==='P-gentle_gorilla')await shot('married-'+id);
  // 盤面のこいびとを開いて二段の本文を確かめる（18種類すべて）：見出し2つ・切れていない・文字が小さすぎない・「上の能力」なし。
  {const pid=v.players.A.board.partner.id;await closeDetail();await p.locator(`#game [data-inspect="${pid}"],#game [data-browse="${pid}"]`).first().click();await p.waitForTimeout(450);
   const text=await p.locator('#card-dialog').innerText();assert.match(text,/こいびとのとき/,id);assert.match(text,/♥ 結婚したら/,id);assert.doesNotMatch(text,/上の能力/,id);
   const m=await p.locator('#card-dialog .card-face .card-copy').first().evaluate(n=>({over:n.scrollHeight-n.clientHeight,font:parseFloat(getComputedStyle(n).fontSize),w:n.clientWidth}));
   assert.ok(m.over<=1,id+' 本文が切れている '+JSON.stringify(m));assert.ok(m.font>=9.5,id+' 文字が小さい（正式カードの長い本文 3.2cqw より小さい） '+m.font);sizes.push([name,id,m.font,m.over]);
   if(['P-gentle_gorilla','P-snow_spirit','P-oasis_cactus','P-knitting_spider','P-rock_octopus','P-snowman','P-grove_deer'].includes(id))await shot('detail-'+id);await closeDetail();}
  void notice;
 }
 // QA：結婚中・相手の番（すれちがい）→ 離婚 −10・両方の能力を失う通知。
 await p.goto(URL0);await p.locator('#hotseat-open').tap();await p.locator('.lv4-qa summary').tap();
 await p.locator('#lv4-qa-lover').selectOption('P-robot_neighbor');await p.locator('#lv4-qa-state').selectOption('divorce');await p.locator('#lv4-qa-start').tap();await reveal();
 let v=await proj();const mis=v.actions.find(a=>/すれちがい/.test(a.label)&&['play','programPlay'].includes(a.kind));assert.ok(mis,'すれちがい');
 await press(mis);v=await settle(40,(vv,acts)=>acts.find(x=>x.kind==='pass')??null);assert.equal(v.players.A.growth,40,'離婚 −10');assert.equal(v.players.A.relationship,null);
 assert.match(JSON.stringify(v.results),/結婚の能力を失った/);await shot('divorce');note(name,'離婚：そだち50→40、こいびとの能力と結婚の能力を失った通知');
 // CPU対戦：恋人デッキを相手に数ターン進めても、ページエラーが出ない。
 await p.goto(URL0);await p.locator('#solo-open').tap();await p.locator('#new').tap();await p.waitForTimeout(6000);await reveal();await shot('cpu');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'横スクロールなし');
 await ctx.close();note(name,'OK');
}
assert.deepEqual(errors,[]);note('ページエラー 0件');note('詳細表示の文字の大きさ（最小）',Math.min(...sizes.map(x=>x[2])),'px、切れ',Math.max(...sizes.map(x=>x[3])),'px、',sizes.length,'件');
}finally{await b.close();if(SHOTS)fs.writeFileSync(path.join(SHOTS,'qa-log.txt'),log.join('\n')+'\n');}
})().catch(e=>{console.error(e);process.exit(1);});
