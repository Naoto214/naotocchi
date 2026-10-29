// 新しいカード詳細の操作QA。詳細の下部ボタンを実際にタップし、結果を正式エンジンの状態で確かめる（補足の内容と一致するか）。
// 使い方: QA_BASE=http://127.0.0.1:8766/stage/index.html node prototypes/card-game/detail-stage-20261029/qa/run-stage-ops.mjs [出力dir]
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {openCase,measure,saved,engineState,CASES} from './run-stage-qa.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url)),OUT=path.resolve(process.argv[2]??HERE);
const BASE=process.env.QA_BASE??'http://127.0.0.1:8766/stage/index.html';
const caseOf=k=>CASES.find(c=>c.key===k),checks=[];
function check(name,viewport,pass,detail={}){checks.push({name,viewport,pass:!!pass,...detail});process.stderr.write(`${pass?'PASS':'FAIL'} ${viewport} ${name} ${JSON.stringify(detail).slice(0,220)}\n`);}
async function confirmIfAsked(page){await page.waitForTimeout(250);if(await page.locator('#confirm-dialog[open]').count()){await page.locator('#confirm-dialog [data-confirm]').tap();await page.waitForTimeout(400);}}
const revision=async page=>{const r=await saved(page);return r?JSON.parse(r).game?.commands?.length??JSON.parse(r).commands.length:0;};
const instanceOf=(s,id)=>Object.values(s.players).flatMap(p=>[p.board.main,p.board.partner,p.board.world,...p.board.companions,...p.board.prepared]).map(x=>x?.id??x).includes(id);
async function tapButton(page,locator){const ok=await locator.evaluate(b=>{const r=b.getBoundingClientRect(),n=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return !!n&&b.contains(n)&&r.height>=44;});await locator.tap();return ok;}

const browser=await chromium.launch();
// QA_VIEWPORTS=844x390,852x393 のように画面サイズを指定できる（既定は 320×568・390×844・844×390）
const VPS=process.env.QA_VIEWPORTS?process.env.QA_VIEWPORTS.split(',').map(v=>v.split('x').map(Number)):[[320,568],[390,844],[844,390]];
for(const [w,h] of VPS){
 const vp=`${w}x${h}`,ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 // 1) たまごの手札交換：「とかいを選ぶ ※ 山札の一番下へ戻します」→ 実際に山札の一番下へ
 {const id=await openCase(page,caseOf('choice-long'),'new');const b=page.locator('#card-dialog [data-action]').first();
  const label=await b.innerText(),before=await revision(page),ok=await tapButton(page,b);await confirmIfAsked(page);
  const s=engineState(await saved(page));
  check('たまごの手札交換：補足どおり山札の一番下へ戻る',vp,ok&&/とかいを選ぶ/.test(label)&&/山札の一番下へ戻します/.test(label)&&s.players.A.deck.at(-1)===id&&!s.players.A.hand.includes(id)&&(await revision(page))>before,{label:label.replace(/\n/g,' / ')});}
 // 2) 対象指定（3択の2番目「なかま②」）→ 実際になかま②へ
 {const id=await openCase(page,caseOf('target'),'new');const bs=page.locator('#card-dialog [data-action]');const n=await bs.count();
  const labels=await bs.allInnerTexts(),was=engineState(await saved(page)).players.A.board.companions.map(x=>x?.id??x);
  const ok=await tapButton(page,bs.nth(1));await confirmIfAsked(page);const now=engineState(await saved(page)).players.A.board.companions.map(x=>x?.id??x);
  check('3択の対象指定：補足「なかま②のきまぐれなねこと入れ替えます」どおり、なかま②のカードだけが入れ替わる',vp,n===3&&ok&&/なかま②のきまぐれなねこと入れ替えます/.test(labels[1])&&!now.includes(was[1])&&now.includes(was[0])&&now.includes(was[2])&&now.includes(id),{labels:labels.map(l=>l.replace(/\n/g,' / ')),was,now});}
 // 3) 応答中のパス → CPUが進行
 {await openCase(page,caseOf('response'),'new');const before=await revision(page);const ok=await tapButton(page,page.locator('#card-dialog [data-kind=pass]'));await confirmIfAsked(page);
  let after=await revision(page);for(let i=0;i<40&&after<=before+1;i++){await page.waitForTimeout(250);after=await revision(page);}
  check('応答中のパス → CPUが進行',vp,ok&&after>before+1,{revision:[before,after]});}
 // 4) 4つ以上の行動（装備先）：4つ目まで操作でき、「ほかの選択肢」の案内が出る。3つ目を確定 → 装備される
 {const id=await openCase(page,caseOf('many'),'new');const m=await page.evaluate(measure);const bs=page.locator('#card-dialog [data-action]');
  await bs.nth(3).scrollIntoViewIfNeeded();const fourth=await bs.nth(3).evaluate(b=>{const r=b.getBoundingClientRect(),n=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return !!n&&b.contains(n);});
  await bs.nth(2).scrollIntoViewIfNeeded();const label=await bs.nth(2).innerText();const ok=await tapButton(page,bs.nth(2));await confirmIfAsked(page);const s=engineState(await saved(page));
  check('4つの装備先：最初に3つが見え、4つ目へスクロールで届き、確定で装備される',vp,m.buttons.length===4&&m.buttonsTappable>=3&&(m.buttonsTappable===4||m.moreHint)&&fourth&&ok&&!s.players.A.hand.includes(id)&&instanceOf(s,id),{visible:m.buttonsTappable,more:m.moreHint,label:label.replace(/\n/g,' / ')});}
 // 5) 宣言（カード種を選ぶ）→ 確定
 {await openCase(page,caseOf('declare'),'new');const before=await revision(page);const sel=page.locator('#card-dialog select[data-declaration]');
  const opts=await sel.locator('option:not([disabled])').count();await page.waitForTimeout(300);await sel.dispatchEvent('pointerdown');await sel.selectOption({index:1});await confirmIfAsked(page);await page.waitForTimeout(300);
  check('宣言：選択欄から選んで確定できる',vp,opts>=2&&(await revision(page))>before,{options:opts});}
 // 6) 連鎖中の応答 → 確定
 {await openCase(page,caseOf('chain'),'new');const before=await revision(page);const ok=await tapButton(page,page.locator('#card-dialog [data-action]:not([data-kind=pass])').first());await confirmIfAsked(page);
  check('連鎖中の応答：詳細から応答を確定できる',vp,ok&&(await revision(page))>before,{revision:before});}
 // 7) 開閉・スクロール初期化・拡大の切り替え
 {await openCase(page,caseOf('normal-long'),'new');const z=page.locator('#card-dialog .stage-zoom');let zoomOk=true,zoomInfo=null;
  if(await z.isVisible()){const a=await page.evaluate(()=>document.querySelector('#card-dialog .stage-card').getBoundingClientRect().width);await page.locator('#card-dialog .stage-card').click();await page.waitForTimeout(350);
   const b=await page.evaluate(()=>({w:document.querySelector('#card-dialog .stage-card').getBoundingClientRect().width,stage:document.querySelector('#card-dialog .stage-scroll').clientWidth,chip:document.querySelector('#card-dialog .stage-zoom').textContent}));
   await z.click();await page.waitForTimeout(350);const c=await page.evaluate(()=>document.querySelector('#card-dialog .stage-card').getBoundingClientRect().width);zoomOk=b.w>a&&b.w<=b.stage+1&&/縮小/.test(b.chip)&&Math.abs(c-a)<1;zoomInfo={a,b,c};}
  await page.evaluate(()=>{document.querySelector('#card-dialog .stage-scroll').scrollTop=9999;});
  await page.locator('#card-dialog [data-close]').tap();await page.waitForTimeout(200);const closed1=!(await page.locator('#card-dialog[open]').count());
  const other=await page.evaluate(()=>[...document.querySelectorAll('#hand [data-inspect]')].map(n=>n.dataset.inspect).find(x=>x.includes(':W-city:')));
  const hb=page.locator(`#hand [data-inspect="${other}"]`).first();await hb.scrollIntoViewIfNeeded();await hb.click({force:true});await page.waitForSelector('#card-dialog[open]');await page.waitForTimeout(250);
  const top=await page.evaluate(()=>({top:document.querySelector('#card-dialog .stage-scroll').scrollTop,zoom:document.querySelector('#card-dialog').dataset.stageZoom??null}));
  await page.keyboard.press('Escape');await page.waitForTimeout(200);const closed2=!(await page.locator('#card-dialog[open]').count());
  check('開閉（盤面へ×・Esc）、次の詳細はスクロール先頭・拡大解除、拡大の切り替え',vp,closed1&&closed2&&top.top===0&&top.zoom===null&&zoomOk,{top,zoomOk,zoomInfo});}
 // 8) 保存復帰後の詳細
 {await openCase(page,caseOf('choice-long'),'new');await page.goto(BASE);await page.selectOption('#match-mode','cpu');await page.click('#restore');await page.waitForTimeout(500);
  if(await page.locator('#curtain').isVisible()){await page.click('#reveal');await page.waitForTimeout(300);}
  const id=await page.evaluate(()=>document.querySelector('#hand [data-inspect]').dataset.inspect);const hb=page.locator(`#hand [data-inspect="${id}"]`).first();await hb.scrollIntoViewIfNeeded();await hb.click({force:true});await page.waitForSelector('#card-dialog[open]');await page.waitForTimeout(300);
  const m=await page.evaluate(measure);check('保存復帰後の詳細：大型カードとボタン、はみ出しなし',vp,m.card.w>=180&&m.buttons.length>0&&m.buttonsTappable===m.buttons.length&&!m.overflowX&&m.closeTappable,{card:m.card,buttons:m.buttons.length});}
 // 9) アドレスバー表示（高さ−94px）・回転（3択）
 if(w<h){await openCase(page,caseOf('target'),'new');await page.setViewportSize({width:w,height:h-94});await page.waitForTimeout(300);const bar=await page.evaluate(measure);
  await page.setViewportSize({width:h,height:w});await page.waitForTimeout(300);const land=await page.evaluate(measure);await page.setViewportSize({width:w,height:h});await page.waitForTimeout(300);const back=await page.evaluate(measure);
  check('3択：アドレスバー表示（高さ−94px）でも3つとも押せる',vp,bar.buttonsTappable===3&&!bar.overflowX,{card:bar.card});
  check('3択：詳細を開いたまま縦→横→縦に回転',vp,land.buttonsTappable===3&&back.buttonsTappable===3&&!land.overflowX&&!back.overflowX,{land:land.card,landTap:land.buttonsTappable,back:back.card,backTap:back.buttonsTappable,ox:[land.overflowX,back.overflowX]});}
 // 10) セーフエリア（iPhone の値を CSS で模擬。縦: 上47/下34、横: 左右47/下21）
 {await openCase(page,caseOf('target'),'new');const ins=w<h?{t:47,b:34,l:0,r:0}:{t:0,b:21,l:47,r:47};
  await page.addStyleTag({content:`.card-detail{left:calc(var(--ui-vleft,0px) + ${ins.l}px + 8px)!important;top:calc(var(--ui-vtop,0px) + ${ins.t}px + 8px)!important;width:calc(var(--ui-vw,100vw) - ${ins.l+ins.r}px - 16px)!important;height:calc(var(--ui-vh,100dvh) - ${ins.t+ins.b}px - 16px)!important}`});await page.waitForTimeout(300);
  const r=await page.evaluate(({ins})=>[...document.querySelectorAll('#card-dialog [data-action],#card-dialog [data-close]')].map(b=>{const q=b.getBoundingClientRect(),y=(q.top+q.bottom)/2,n=document.elementFromPoint((q.left+q.right)/2,y);return q.top>=ins.t&&q.bottom<=innerHeight-ins.b&&q.left>=ins.l&&q.right<=innerWidth-ins.r&&!!n&&b.contains(n);}),{ins});
  check('セーフエリア模擬：閉じる・3択がすべて安全領域内で押せる',vp,r.every(Boolean),{ok:`${r.filter(Boolean).length}/${r.length}`});}
 // 11) 重複表示・ルールリンク・独立説明がない（全場面）
 {const bad=[];for(const c of CASES){await openCase(page,c,'new');const m=await page.evaluate(measure);if(m.cardTextRepeatedOutside||m.ruleLink||m.guideBox||m.outsideText.replace(/▼.*$/,'').trim()&&!/相手の伏せ札|操作中|今は/.test(m.outsideText))bad.push({case:c.key,outside:m.outsideText});}
  check('カード外に本文・カード情報・関連ルール・独立説明がない（8場面）',vp,!bad.length,{bad});}
 // 12) 保存領域の分離
 {const keys=await page.evaluate(()=>{const o=[];for(let i=0;i<localStorage.length;i++)o.push(localStorage.key(i));return o;});check('保存領域が本番と分離',vp,keys.length>0&&keys.every(k=>k.startsWith('naotocchi-detail-stage-trial:')),{keys:keys.length});}
 check('ページ内エラーなし',vp,!errors.length,{errors});
 await ctx.close();
}
// 13) 2人対戦：詳細から たまごの交換 → パスで交代画面（手札を隠す）
{const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const id=await openCase(page,caseOf('choice-long'),'new',{mode:'hotseat'});await page.locator('#card-dialog [data-action]').first().tap();await confirmIfAsked(page);
 const s=engineState(await saved(page));let passes=0;for(;passes<6&&!(await page.locator('#curtain').isVisible());passes++){const p=page.locator('#operation-panel button[data-kind=pass]').first();if(!(await p.count()))break;await p.tap();await confirmIfAsked(page);await page.waitForTimeout(300);}
 check('2人対戦：詳細からたまごの交換（山札の一番下）→ パスで交代画面',null,s.players.A.deck.at(-1)===id&&(await page.locator('#curtain').isVisible())&&!(await page.locator('#hand').count())&&!errors.length,{passes,errors});
 // 14) ルールブック・コレクションの導線（開始画面とメニュー）
 await page.goto(BASE);await page.click('#rulebook-open');await page.waitForTimeout(300);const book1=!!(await page.locator('#rulebook-dialog[open]').count());await page.keyboard.press('Escape');await page.waitForTimeout(200);
 await openCase(page,caseOf('choice-long'),'new');await page.locator('#card-dialog [data-close]').tap();await page.locator('#game [data-menu]').first().click();await page.waitForTimeout(250);await page.click('#menu-rulebook-open');await page.waitForTimeout(300);const book2=!!(await page.locator('#rulebook-dialog[open]').count());await page.keyboard.press('Escape');await page.waitForTimeout(200);
 await page.goto(BASE);await page.click('#collection-open');await page.waitForTimeout(300);if(await page.locator('#collection-notice').isVisible())await page.click('#collection-ack');const coll=!!(await page.locator('#collection-dialog[open]').count());await page.keyboard.press('Escape');
 await page.click('#records-open');await page.waitForTimeout(300);const rec=!!(await page.locator('#records-dialog[open]').count());await page.keyboard.press('Escape');await page.waitForTimeout(200);
 await page.click('#my-decks-open');await page.waitForTimeout(300);const decks=!!(await page.locator('#deck-editor[open],#my-decks-dialog[open]').count());
 check('ルールブック（開始画面・対戦メニュー）・コレクション・戦績・マイデッキを開ける',null,book1&&book2&&coll&&rec&&decks&&!errors.length,{book1,book2,coll,rec,decks,errors});
 await ctx.close();}
await browser.close();
fs.writeFileSync(path.join(OUT,'stage-ops-results.json'),JSON.stringify({checks,summary:{total:checks.length,pass:checks.filter(c=>c.pass).length}},null,1)+'\n');
console.log(`${checks.filter(c=>c.pass).length}/${checks.length} PASS`);
