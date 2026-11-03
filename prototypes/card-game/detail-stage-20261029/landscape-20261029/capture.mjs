// 横画面（と縦画面の保護確認）の実測と撮影。正式の CARD GAME（このブランチ）を、比較用の保存場面で開く。
// 使い方: リポジトリ直下を配信し、
//   CARD_GAME_URL=http://127.0.0.1:8765/prototypes/card-game/ node .../landscape-20261029/capture.mjs <出力dir> [ラベル]
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url)),OUT=path.resolve(process.argv[2]??HERE),LABEL=process.argv[3]??'after';
const URL_=process.env.CARD_GAME_URL??'http://127.0.0.1:8765/prototypes/card-game/';
const BASE=JSON.parse(fs.readFileSync(path.join(HERE,'../../detail-ui-ab-20261028/scenarios.json'),'utf8')).scenarios;
const EXTRA=JSON.parse(fs.readFileSync(path.join(HERE,'../scenarios-extra.json'),'utf8')).scenarios;
const S=[...BASE,...EXTRA];
export const LANDSCAPE=[[844,390],[852,393],[932,430],[736,414],[667,375]];
export const PORTRAIT=[[320,568],[375,667],[390,844],[430,932]];
export const CASES=[{scenario:'choice',card:'W-city'},{scenario:'normal',card:'C-monkey'},{scenario:'response',card:'I-c_coin2'},{scenario:'target',card:'C-chameleon'},{scenario:'many',card:'I-bowtie'},{scenario:'declare',card:'G-hit-blow'}];
export async function load(page,scenario){
 await page.goto(URL_);await page.evaluate(r=>{localStorage.clear();localStorage.setItem('naotocchi-cpu-match-v1',r);},S.find(s=>s.key===scenario).cpu);
 await page.reload();await page.selectOption('#match-mode','cpu');await page.click('#restore');await page.waitForTimeout(600);
 if(await page.locator('#curtain').isVisible()){await page.click('#reveal');await page.waitForTimeout(300);}
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
}
// 基本盤面: 縦スクロールの有無、主要領域が画面内に見えているか、はみ出し
export const board=()=>{
 const W=innerWidth,H=innerHeight,doc=document.scrollingElement;
 const vis=sel=>{const n=document.querySelector(sel);if(!n)return null;const r=n.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),inView:r.top>=-1&&r.bottom<=H+1&&r.left>=-1&&r.right<=W+1,h:Math.round(r.height)};};
 const scrollers=[...document.querySelectorAll('#game *')].filter(n=>{const cs=getComputedStyle(n);return /(auto|scroll)/.test(cs.overflowY)&&n.scrollHeight>n.clientHeight+2&&n.clientHeight>0;}).map(n=>({el:(n.id?'#'+n.id:'')+(typeof n.className==='string'&&n.className?'.'+n.className.split(' ')[0]:''),client:n.clientHeight,scroll:n.scrollHeight}));
 const hand=[...document.querySelectorAll('#hand [data-inspect]')].map(b=>{const r=b.getBoundingClientRect();return r.bottom<=H+1&&r.top>=0&&r.width>=24;});
 const slots=[...document.querySelectorAll('.player-board .slot')].map(s=>{const r=s.getBoundingClientRect();return {h:Math.round(r.height),w:Math.round(r.width),inView:r.top>=-1&&r.bottom<=H+1};});
 const clipped=[...document.querySelectorAll('.management>[data-zone],.player-heading,.board-metrics,#operation-panel')].filter(n=>n.getClientRects().length&&(n.scrollHeight>n.clientHeight+1||n.scrollWidth>n.clientWidth+1)).map(n=>(n.dataset.zone??n.id??'')+'@'+(n.closest('.player-board')?.classList.contains('opponent')?'opp':'own'));
 return {clipped,pageScroll:doc.scrollHeight>H+1,pageScrollH:doc.scrollHeight,overflowX:doc.scrollWidth>W+1,
  regions:{top:vis('.table-top'),opponent:vis('.player-board.opponent'),own:vis('.player-board.own'),operation:vis('#operation-panel'),hand:vis('#hand')},
  innerScrollers:scrollers,handCards:hand.length,handVisible:hand.filter(Boolean).length,slots:slots.length,slotsInView:slots.filter(s=>s.inView).length,minSlotH:Math.min(...slots.map(s=>s.h))};
};
export async function openCard(page,card){
 const id=await page.evaluate(c=>[...document.querySelectorAll('#hand [data-inspect]')].map(n=>n.dataset.inspect).find(x=>x.split(':')[1]===c),card);
 const h=page.locator(`#hand [data-inspect="${id}"]`).first();await h.scrollIntoViewIfNeeded();await h.click({force:true});
 await page.waitForSelector('#card-dialog[open]');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(400);return id;
}
// カード詳細: カード全体が見えているか（下端・枠まで）、スクロール、ボタン
export const detail=()=>{
 const d=document.querySelector('#card-dialog'),W=innerWidth,H=innerHeight,face=d.querySelector('.card-face,.card-back'),r=face.getBoundingClientRect();
 const scroll=d.querySelector('.stage-scroll'),dr=d.getBoundingClientRect();
 const hit=(b)=>{const q=b.getBoundingClientRect(),x=(q.left+q.right)/2,y=(q.top+q.bottom)/2;if(y<0||y>=H)return false;const n=document.elementFromPoint(x,y);return !!n&&b.contains(n);};
 const p=face.querySelector('.card-copy p');
 // 上部の状況表示（「Aのターン・選択待ち」など）: 文字・行数・文字サイズ・見切れ
 const st=d.querySelector('.detail-toolbar>span'),rg=document.createRange();rg.selectNodeContents(st);const tops=new Set([...rg.getClientRects()].filter(q=>q.width>0).map(q=>Math.round(q.top)));
 const status={text:st.textContent,lines:tops.size,px:parseFloat(getComputedStyle(st).fontSize),clipped:st.scrollWidth>st.clientWidth+1};
 return {status,card:{w:Math.round(r.width),h:Math.round(r.height),top:Math.round(r.top),bottom:Math.round(r.bottom)},wholeCardVisible:r.top>=dr.top-1&&r.bottom<=dr.bottom+1&&r.bottom<=H+1&&(!scroll||scroll.scrollHeight<=scroll.clientHeight+1),
  stageScrolls:!!scroll&&scroll.scrollHeight>scroll.clientHeight+1,textPx:p?+(parseFloat(getComputedStyle(p).fontSize)*r.width/320).toFixed(1):null,
  buttons:[...d.querySelectorAll('[data-action]')].map(b=>({t:b.innerText.replace(/\n/g,' / ').slice(0,60),h:Math.round(b.getBoundingClientRect().height),tap:hit(b)})),
  declaration:!!d.querySelector('select[data-declaration]'),zoomChip:d.querySelector('.stage-zoom')?.hidden===false?d.querySelector('.stage-zoom').textContent:null,
  overflowX:document.documentElement.scrollWidth>W+1};
};
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const browser=await chromium.launch(),rows=[];fs.mkdirSync(path.join(OUT,LABEL),{recursive:true});
 for(const [w,h] of [...LANDSCAPE,...PORTRAIT]){const vp=`${w}x${h}`,ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  for(const c of CASES){await load(page,c.scenario);const b=await page.evaluate(board);
   if(c.scenario==='target'||c.scenario==='choice')await page.screenshot({path:path.join(OUT,LABEL,`${vp}-board-${c.scenario}.jpg`),type:'jpeg',quality:62});
   await openCard(page,c.card);const d=await page.evaluate(detail);await page.screenshot({path:path.join(OUT,LABEL,`${vp}-detail-${c.scenario}.jpg`),type:'jpeg',quality:62});
   rows.push({viewport:vp,orientation:w>h?'landscape':'portrait',scenario:c.scenario,card:c.card,board:b,detail:d,errors:errors.splice(0)});
   process.stderr.write(`${vp} ${c.scenario} board scroll ${b.pageScroll} inner ${b.innerScrollers.map(s=>s.el).join(',')} hand ${b.handVisible}/${b.handCards} | detail ${d.card.w}x${d.card.h} whole ${d.wholeCardVisible} txt ${d.textPx} btn ${d.buttons.filter(x=>x.tap).length}/${d.buttons.length}\n`);}
  await ctx.close();}
 await browser.close();fs.writeFileSync(path.join(OUT,`${LABEL}.json`),JSON.stringify(rows,null,1)+'\n');
}
