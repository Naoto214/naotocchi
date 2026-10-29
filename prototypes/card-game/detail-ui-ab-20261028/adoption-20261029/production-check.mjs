// 公開後の確認: 配信物（GitHub Pages の成果物、または本番URL）の正式 CARD GAME で、改善A案が効いていることを確かめる。
// 比較用の試遊版は使わない。比較用シナリオの保存（scenarios.json の cpu 保存）を正式の「保存した対戦に戻る」で読み込む。
// 使い方: CARD_GAME_URL=<…/prototypes/card-game/> node prototypes/card-game/detail-ui-ab-20261028/adoption-20261029/production-check.mjs [出力json]
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {measure,VIEWPORTS} from '../qa/run-ab-qa.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url)),URL_=process.env.CARD_GAME_URL??'https://naoto214.github.io/naotocchi/prototypes/card-game/';
const S=JSON.parse(fs.readFileSync(path.join(HERE,'../scenarios.json'),'utf8')).scenarios;
const CASES=[{scenario:'choice',card:'W-city'},{scenario:'normal',card:'C-monkey'},{scenario:'response',card:'I-c_coin2'},{scenario:'target',card:'C-chameleon'}];
const out=[],browser=await chromium.launch();
async function open(page,c){
 await page.goto(URL_);await page.evaluate(raw=>{localStorage.clear();localStorage.setItem('naotocchi-cpu-match-v1',raw);},S.find(s=>s.key===c.scenario).cpu);
 await page.reload();await page.selectOption('#match-mode','cpu');await page.click('#restore');await page.waitForTimeout(500);
 if(await page.locator('#curtain').isVisible()){await page.click('#reveal');await page.waitForTimeout(300);}
 const id=await page.evaluate(card=>[...document.querySelectorAll('#hand [data-inspect]')].map(n=>n.dataset.inspect).find(x=>x.split(':')[1]===card),c.card);
 const h=page.locator(`#hand [data-inspect="${id}"]`).first();await h.scrollIntoViewIfNeeded();await h.click({force:true});
 await page.waitForSelector('#card-dialog[open]');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);return id;
}
for(const [w,h] of VIEWPORTS){const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 for(const c of CASES){await open(page,c);const m=await page.evaluate(measure);
  const style=await page.evaluate(()=>{const s=getComputedStyle(document.querySelector('#card-dialog .effect-scroll'));return {effectOverflow:s.overflowY,commandPosition:getComputedStyle(document.querySelector('#card-dialog .detail-command')??document.body).position,trialUi:!!document.querySelector('#trial-panel,[data-trial-cycle]'),variantAttr:document.documentElement.dataset.detailVariant??null};});
  // 実際に確定できるか（3択は2番目、応答中はパス、ほかは最初のボタン）
  const sel=c.scenario==='target'?'.detail-command button[data-action]:nth-of-type(2)':c.scenario==='response'?'.detail-pass button[data-kind=pass]':'.detail-command button[data-action]';
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-cpu-match-v1')).game.commands.length);
  await page.locator(`#card-dialog ${sel}`).first().tap();await page.waitForTimeout(300);if(await page.locator('#confirm-dialog[open]').count()){await page.locator('#confirm-dialog [data-confirm]').tap();await page.waitForTimeout(400);}
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('naotocchi-cpu-match-v1')).game.commands.length);
  const rec={viewport:`${w}x${h}`,...c,ratio:m.ratio,visibleLines:m.visibleLines,lines:m.lines,buttonsTappable:m.buttonsTappable,buttons:m.buttons.length,scrollers:m.scrollers.length,overflowX:m.overflowX,commandH:m.commandH,...style,committed:after>before,errors:errors.splice(0)};
  rec.pass=rec.ratio>0&&rec.buttonsTappable===rec.buttons&&!rec.overflowX&&rec.scrollers===0&&rec.effectOverflow==='visible'&&rec.commandPosition==='sticky'&&!rec.trialUi&&rec.variantAttr===null&&rec.committed&&!rec.errors.length;
  out.push(rec);process.stderr.write(`${rec.pass?'PASS':'FAIL'} ${rec.viewport} ${c.scenario} ratio ${rec.ratio} btn ${rec.buttonsTappable}/${rec.buttons} committed ${rec.committed}\n`);}
 // 開閉・コレクション・ルールブック（390×844 と横向きで）
 if(w===390||w===844){await open(page,CASES[0]);await page.locator('#card-dialog [data-close]').tap();await page.waitForTimeout(200);const closed=!(await page.locator('#card-dialog[open]').count());
  await page.goto(URL_);await page.click('#collection-open');await page.waitForTimeout(300);if(await page.locator('#collection-notice').isVisible())await page.click('#collection-ack');const coll=!!(await page.locator('#collection-dialog[open]').count());await page.keyboard.press('Escape');await page.waitForTimeout(200);
  await page.click('#rulebook-open');await page.waitForTimeout(300);const book=!!(await page.locator('#rulebook-dialog[open]').count());
  const rec={viewport:`${w}x${h}`,check:'開閉・コレクション・ルールブック',closed,collection:coll,rulebook:book,overflowX:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),errors:errors.splice(0)};rec.pass=closed&&coll&&book&&!rec.overflowX&&!rec.errors.length;out.push(rec);process.stderr.write(`${rec.pass?'PASS':'FAIL'} ${rec.viewport} ${rec.check}\n`);}
 await ctx.close();}
await browser.close();
const summary={url:URL_,total:out.length,pass:out.filter(r=>r.pass).length};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify({summary,rows:out},null,1)+'\n');
console.log(JSON.stringify(summary));
