// A/B 比較の操作QA（Chromium・タッチ）。詳細パネルから実際に必須選択・対象指定・応答・パスを確定し、
// 開閉・切り替え・回転・アドレスバー相当の高さ変化・保存復帰・CPU進行・2人対戦の交代を確かめる。
// 使い方: QA_BASE=http://127.0.0.1:8766/trial/index.html node prototypes/card-game/detail-ui-ab-20261028/qa/run-ops-qa.mjs [出力dir]
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {openCase,measure,readToEnd,CASES,VARIANTS} from './run-ab-qa.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url)),OUT=path.resolve(process.argv[2]??HERE);
const BASE=process.env.QA_BASE??'http://127.0.0.1:8766/trial/index.html';
const caseOf=k=>CASES.find(c=>c.key===k);
const saved=page=>page.evaluate(()=>{const raw=localStorage.getItem('naotocchi-cpu-match-v1')??localStorage.getItem('naotocchi-hotseat-v1');if(!raw)return null;const d=JSON.parse(raw),g=d.game??d;return {revision:g.commands.length,keys:Object.keys(localStorage)};});
async function confirmIfAsked(page){await page.waitForTimeout(250);if(await page.locator('#confirm-dialog[open]').count()){await page.locator('#confirm-dialog [data-confirm]').tap();await page.waitForTimeout(400);}}
async function tapInDetail(page,selector){
 // 画面上で実際に押せる位置にあるかを確かめてからタップする（隠れていれば失敗として記録）。
 const loc=page.locator(`#card-dialog ${selector}`).first();await loc.scrollIntoViewIfNeeded();
 const ok=await loc.evaluate(b=>{const r=b.getBoundingClientRect(),x=(r.left+r.right)/2,y=(r.top+r.bottom)/2;const n=document.elementFromPoint(x,y);return !!n&&b.contains(n)&&r.height>=44;});
 await loc.tap();return ok;
}
const checks=[];
function check(name,variant,viewport,pass,detail={}){checks.push({name,variant,viewport,pass:!!pass,...detail});process.stderr.write(`${pass?'PASS':'FAIL'} ${viewport} ${variant} ${name} ${JSON.stringify(detail)}\n`);}

const browser=await chromium.launch();
for(const [w,h] of [[320,568],[390,844],[844,390]])for(const v of VARIANTS){
 const vp=`${w}x${h}`,ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 // 1) 必須選択：長文カードを全文読んでから、そのカードを選ぶボタンで確定
 {const id=await openCase(page,caseOf('choice-long'),v);const before=await saved(page);const read=await readToEnd(page);
  const ok=await tapInDetail(page,'.detail-command button[data-kind=choose]');await confirmIfAsked(page);
  const after=await saved(page),gone=!(await page.locator(`#hand [data-inspect="${id}"]`).count());
  check('必須選択を詳細から確定（全文を読んだ後）',v,vp,read.fullyRead&&ok&&after.revision>before.revision&&gone&&!(await page.locator('#card-dialog[open]').count()),{read,revision:[before.revision,after.revision]});
  // 保存復帰：再読込→保存した対戦に戻る→同じ詳細が同じ配置で開く
  await page.goto(`${BASE}?variant=${v}`);await page.selectOption('#match-mode','cpu');await page.click('#restore');await page.waitForTimeout(500);
  if(await page.locator('#curtain').isVisible()){await page.click('#reveal');await page.waitForTimeout(300);}
  const restored=await saved(page);const any=await page.evaluate(()=>[...document.querySelectorAll('#hand [data-inspect]')].map(n=>n.dataset.inspect).find(x=>x.includes(':C-monkey:'))??document.querySelector('#hand [data-inspect]')?.dataset.inspect);
  await page.locator(`#hand [data-inspect="${any}"]`).first().click({force:true});await page.waitForSelector('#card-dialog[open]');await page.waitForTimeout(300);
  const m=await page.evaluate(measure),tops=await page.evaluate(()=>[...document.querySelectorAll('#card-dialog .detail-layout,#card-dialog .detail-copy,#card-dialog .effect-scroll')].map(n=>n.scrollTop));
  check('保存復帰後に詳細を開く（本文・ボタン・スクロール初期位置）',v,vp,restored.revision===after.revision&&m.buttons.length>0&&m.buttonsTappable===m.buttons.length&&tops.every(t=>t===0)&&!m.overflowX,{ratio:m.ratio,tappable:`${m.buttonsTappable}/${m.buttons.length}`});
 }
 // 2) 対象指定：交代先を選ぶ2番目のボタンで確定し、盤面に出たことを確認
 {await openCase(page,caseOf('target'),v);const before=await saved(page);
  const labels=await page.locator('#card-dialog .detail-command button[data-action]').allTextContents();
  const ok=await tapInDetail(page,'.detail-command button[data-action]:nth-of-type(2)');await confirmIfAsked(page);
  const after=await saved(page),onBoard=await page.evaluate(()=>[...document.querySelectorAll('[data-player="A"] .slots [data-inspect],[data-player="A"] .slots [data-browse]')].some(n=>(n.dataset.inspect??n.dataset.browse).includes(':C-chameleon:')));
  check('対象指定（3択の2番目）を詳細から確定',v,vp,ok&&after.revision>before.revision&&onBoard,{choices:labels.length,revision:[before.revision,after.revision]});}
 // 3) 応答中：パス（応答しない）を詳細から確定 → CPU が進行し、こちらの操作待ちに戻る
 {await openCase(page,caseOf('response'),v);const before=await saved(page);
  const ok=await tapInDetail(page,'.detail-pass button[data-kind=pass]');await confirmIfAsked(page);
  let after=await saved(page);for(let i=0;i<40&&after.revision<=before.revision+1;i++){await page.waitForTimeout(250);after=await saved(page);}
  check('応答中のパスを詳細から確定し、CPUが進行',v,vp,ok&&after.revision>before.revision+1&&!errors.length,{revision:[before.revision,after.revision]});}
 // 4) 開閉：「盤面へ ×」と Esc、閉じた後に別カードを開くとスクロールは先頭から
 {await openCase(page,caseOf('normal-long'),v);
  await page.evaluate(()=>{for(const n of document.querySelectorAll('#card-dialog .detail-layout,#card-dialog .detail-copy,#card-dialog .effect-scroll'))n.scrollTop=9999;});
  await page.locator('#card-dialog [data-close]').tap();await page.waitForTimeout(200);const closed1=!(await page.locator('#card-dialog[open]').count());
  const other=await page.evaluate(()=>[...document.querySelectorAll('#hand [data-inspect]')].map(n=>n.dataset.inspect).find(x=>x.includes(':W-city:')));
  await page.locator(`#hand [data-inspect="${other}"]`).first().click({force:true});await page.waitForSelector('#card-dialog[open]');await page.waitForTimeout(250);
  const tops=await page.evaluate(()=>[...document.querySelectorAll('#card-dialog .detail-layout,#card-dialog .detail-copy,#card-dialog .effect-scroll')].map(n=>n.scrollTop));
  await page.keyboard.press('Escape');await page.waitForTimeout(200);const closed2=!(await page.locator('#card-dialog[open]').count());
  check('詳細の開閉（盤面へ×・Esc）と次の詳細のスクロール初期化',v,vp,closed1&&closed2&&tops.every(t=>t===0),{tops});}
 // 5) 詳細内の切り替えボタン：案が順に変わり、スクロールが先頭に戻る（試遊版のみの機能）
 {await openCase(page,caseOf('choice-long'),v);await page.evaluate(()=>{for(const n of document.querySelectorAll('#card-dialog .detail-layout,#card-dialog .detail-copy,#card-dialog .effect-scroll'))n.scrollTop=9999;});
  await page.locator('#card-dialog [data-trial-cycle]').tap();await page.waitForTimeout(150);
  const s=await page.evaluate(()=>({variant:document.documentElement.dataset.detailVariant??'current',label:document.querySelector('[data-trial-cycle]').textContent,tops:[...document.querySelectorAll('#card-dialog .detail-layout,#card-dialog .detail-copy,#card-dialog .effect-scroll')].map(n=>n.scrollTop)}));
  const next={a2:'a',a:'b',b:'current',current:'a2'}[v];
  check('詳細内のA/B/現行切り替え',v,vp,s.variant===next&&s.tops.every(t=>t===0)&&(await page.locator('#card-dialog[open]').count()),s);}
 // 6) 縦→横の回転と、アドレスバー相当の高さ変化（詳細を開いたまま）
 if(w<h){await openCase(page,caseOf('choice-long'),v);
  await page.setViewportSize({width:w,height:h-94});await page.waitForTimeout(250);const bar=await page.evaluate(measure);
  await page.setViewportSize({width:h,height:w});await page.waitForTimeout(300);const land=await page.evaluate(measure);
  await page.setViewportSize({width:w,height:h});await page.waitForTimeout(300);const back=await page.evaluate(measure);
  check('アドレスバー表示で高さが94px減っても必須選択ボタンを押せる',v,vp,bar.buttonsTappable===bar.buttons.length&&!bar.overflowX&&bar.closeTappable,{ratio:bar.ratio});
  check('詳細を開いたまま縦→横→縦に回転',v,vp,land.buttonsTappable===land.buttons.length&&back.buttonsTappable===back.buttons.length&&!land.overflowX&&!back.overflowX,{landRatio:land.ratio,backRatio:back.ratio});}
 // 7) セーフエリア（Chromium では env() が 0 のため、iPhone の値 47/34px（横は左右47/下21）を CSS で模擬）
 {await openCase(page,caseOf('response'),v);const ins=w<h?{t:47,b:34,l:0,r:0}:{t:0,b:21,l:47,r:47};
  await page.addStyleTag({content:`.card-detail{left:calc(var(--ui-vleft,0px) + ${ins.l}px + 8px)!important;top:calc(var(--ui-vtop,0px) + ${ins.t}px + 8px)!important;width:calc(var(--ui-vw,100vw) - ${ins.l+ins.r}px - 16px)!important;height:calc(var(--ui-vh,100dvh) - ${ins.t+ins.b}px - 16px)!important}`});
  await page.waitForTimeout(200);
  const r=await page.evaluate(({ins})=>{const H=innerHeight,W=innerWidth;const bs=[...document.querySelectorAll('#card-dialog .detail-command button[data-action],#card-dialog [data-close]')];return bs.map(b=>{const q=b.getBoundingClientRect(),x=(q.left+q.right)/2,y=(q.top+q.bottom)/2,n=document.elementFromPoint(x,y);return {inSafe:q.top>=ins.t&&y<=H-ins.b&&q.left>=ins.l&&q.right<=W-ins.r,hit:!!n&&b.contains(n)};});},{ins});
  check('セーフエリア模擬で、閉じる・応答・パスがすべて安全領域内で押せる',v,vp,r.every(x=>x.inSafe&&x.hit),{buttons:r.length,ok:r.filter(x=>x.inSafe&&x.hit).length});}
 // 7b) 3択（対象を選ぶ）で、アドレスバー表示相当（高さ−94px）とセーフエリア模擬でも3つとも押せ、本文の冒頭が見える
 if(w<h){await openCase(page,caseOf('target'),v);await page.setViewportSize({width:w,height:h-94});await page.waitForTimeout(300);
  const bar=await page.evaluate(measure);await page.setViewportSize({width:w,height:h});await page.waitForTimeout(300);
  check('3択：アドレスバー表示（高さ−94px）でも3つとも押せ、本文の冒頭が見える',v,vp,bar.buttonsTappable===bar.buttons.length&&bar.visibleLines>0,{tappable:`${bar.buttonsTappable}/${bar.buttons.length}`,lines:bar.visibleLines});}
 {await openCase(page,caseOf('target'),v);const ins=w<h?{t:47,b:34,l:0,r:0}:{t:0,b:21,l:47,r:47};
  await page.addStyleTag({content:`.card-detail{left:calc(var(--ui-vleft,0px) + ${ins.l}px + 8px)!important;top:calc(var(--ui-vtop,0px) + ${ins.t}px + 8px)!important;width:calc(var(--ui-vw,100vw) - ${ins.l+ins.r}px - 16px)!important;height:calc(var(--ui-vh,100dvh) - ${ins.t+ins.b}px - 16px)!important}`});await page.waitForTimeout(200);
  const m=await page.evaluate(measure);const r=await page.evaluate(({ins})=>[...document.querySelectorAll('#card-dialog .detail-command button[data-action]')].map(b=>{const q=b.getBoundingClientRect(),y=(q.top+q.bottom)/2,n=document.elementFromPoint((q.left+q.right)/2,y);return q.top>=ins.t&&y<=innerHeight-ins.b&&!!n&&b.contains(n);}),{ins});
  check('3択：セーフエリア模擬で3つとも安全領域内で押せ、本文の冒頭が見える',v,vp,r.every(Boolean)&&m.visibleLines>0,{ok:`${r.filter(Boolean).length}/${r.length}`,lines:m.visibleLines});}
 // 8) 保存領域の分離：試遊版の書き込みはすべて接頭辞付き
 {const keys=await page.evaluate(()=>{const out=[];for(let i=0;i<localStorage.length;i++)out.push(localStorage.key(i));return out;});
  check('保存領域が本番と分離（全キーが試遊版の接頭辞付き）',v,vp,keys.length>0&&keys.every(k=>k.startsWith('naotocchi-detail-ab-trial:')),{keys:keys.length});}
 check('ページ内エラーなし',v,vp,!errors.length,{errors});
 await ctx.close();
}
// 9) 2人対戦：必須選択→通常手番→ターン終了の申し出→交代画面（手札を隠す）まで（390×844、各案）
for(const v of VARIANTS){const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await openCase(page,caseOf('choice-long-hotseat'),v);await page.locator('#card-dialog .detail-command button[data-kind=choose]').tap();await confirmIfAsked(page);
 // 以降は盤面下の操作パネルのパス（応答しない／ターン終了を申し出る）で交代まで進める。
 let passes=0;for(;passes<6&&!(await page.locator('#curtain').isVisible());passes++){const pass=page.locator('#operation-panel button[data-kind=pass]').first();if(!(await pass.count()))break;await pass.tap();await confirmIfAsked(page);await page.waitForTimeout(300);}
 const hasPass=passes;
 await page.waitForTimeout(400);const curtain=await page.locator('#curtain').isVisible(),handHidden=!(await page.locator('#hand').count());
 check('2人対戦：詳細から必須選択→パスでターン終了→交代画面で手札を隠す',v,'390x844',curtain&&handHidden&&!errors.length,{passes:hasPass,errors});
 await ctx.close();}
// 10) 戦績・コレクション・マイデッキ（試遊版でも開ける。本文の詳細はコレクション側で変更なし）
{const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(BASE);await page.waitForSelector('#trial-panel');
 await page.click('#records-open');await page.waitForTimeout(300);const records=await page.locator('#records-dialog[open]').count();await page.keyboard.press('Escape');await page.waitForTimeout(200);
 await page.click('#collection-open');await page.waitForTimeout(300);if(await page.locator('#collection-notice').isVisible())await page.click('#collection-ack');const collection=await page.locator('#collection-dialog[open]').count();await page.keyboard.press('Escape');await page.waitForTimeout(200);
 await page.click('#my-decks-open');await page.waitForTimeout(300);const decks=await page.locator('#deck-editor[open],#my-decks-dialog[open]').count();
 check('戦績・コレクション・マイデッキを開ける',null,'390x844',records&&collection&&decks&&!errors.length,{records,collection,decks,errors});
 await ctx.close();}
await browser.close();
fs.writeFileSync(path.join(OUT,'ops-results.json'),JSON.stringify({checks,summary:{total:checks.length,pass:checks.filter(c=>c.pass).length}},null,1)+'\n');
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} PASS`);
