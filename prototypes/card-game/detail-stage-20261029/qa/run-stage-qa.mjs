// 新しいカード詳細（大型カード＋補足付きボタン）の実画面QA（Chromium・タッチ・モバイル表示）。
// 同じ場面・同じカード・同じ画面幅で 新UI と 現行（改善A案）を測り、新UIでは実際に操作して結果を正式エンジンで確かめる。
// 使い方: build-trial.mjs で試遊版を組み立てて配信し、
//   QA_BASE=http://127.0.0.1:8766/stage/index.html node prototypes/card-game/detail-stage-20261029/qa/run-stage-qa.mjs [出力dir]
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
import {restore} from '../../engine.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url)),OUT=path.resolve(process.argv[2]??HERE);
const BASE=process.env.QA_BASE??'http://127.0.0.1:8766/stage/index.html';
export const VIEWPORTS=[[320,568],[375,667],[390,844],[430,932],[844,390]];
export const CASES=[
 {key:'choice-long',scenario:'choice',card:'W-city',text:'長文 141字'},
 {key:'choice-short',scenario:'choice',card:'M-starfish-01',text:'短文 5字'},
 {key:'normal-long',scenario:'normal',card:'C-monkey',text:'長文 146字'},
 {key:'response',scenario:'response',card:'I-c_coin2',text:'中 51字'},
 {key:'target',scenario:'target',card:'C-chameleon',text:'中 61字'},
 {key:'many',scenario:'many',card:'I-bowtie',text:'中'},
 {key:'declare',scenario:'declare',card:'G-hit-blow',text:'中'},
 {key:'chain',scenario:'chain',card:'E-first-date',text:'中'},
];
const MODE=process.env.QA_MODE??'cpu';
async function settle(page){await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);}
export async function openCase(page,c,ui,{mode=MODE}={}){
 await page.goto(`${BASE}?ui=${ui}`);await page.waitForSelector('#trial-panel');
 await page.evaluate(()=>{for(const k of Object.keys(localStorage))localStorage.removeItem(k);});
 await page.click(`[data-trial-load="${c.scenario}"][data-mode="${mode}"]`);await page.waitForTimeout(400);
 if(await page.locator('#curtain').isVisible()){await page.click('#reveal');await page.waitForTimeout(300);}
 const id=await page.evaluate(card=>[...document.querySelectorAll('#hand [data-inspect]')].map(n=>n.dataset.inspect).find(x=>x.split(':')[1]===card),c.card);
 if(!id)throw Error('手札にありません: '+c.card);
 const h=page.locator(`#hand [data-inspect="${id}"]`).first();await h.scrollIntoViewIfNeeded();await h.click({force:true});
 await page.waitForSelector('#card-dialog[open]');await settle(page);return id;
}
// 詳細の状態を測る（ページ内で実行）
export const measure=()=>{
 const d=document.querySelector('#card-dialog'),W=innerWidth,H=innerHeight,ui=document.documentElement.dataset.detailUi??'new';
 const hit=(x,y,el)=>{if(x<0||y<0||x>=W||y>=H)return false;const n=document.elementFromPoint(x,y);return !!n&&(el.contains(n)||n===el);};
 const face=d.querySelector('.card-face,.card-back'),fr=face.getBoundingClientRect();
 const visArea=Math.max(0,Math.min(fr.bottom,H)-Math.max(fr.top,0))*Math.max(0,Math.min(fr.right,W)-Math.max(fr.left,0));
 // カード面の本文: 実際に画面上で見える文字サイズ（transform の拡大を含む）と、初期表示で見える行
 const p=face.querySelector('.card-copy p');let onCard=null;
 if(p){const scale=fr.width/320,font=parseFloat(getComputedStyle(p).fontSize),r=document.createRange();r.selectNodeContents(p);
  const lines=[];for(const q of r.getClientRects()){if(q.height<1)continue;const l=lines.at(-1);if(l&&Math.abs(l.top-q.top)<1)continue;lines.push(q);}
  const vis=lines.filter(q=>hit(Math.min(q.left+4,W-1),(q.top+q.bottom)/2,p)).length;
  onCard={fontPx:+(font*scale).toFixed(1),lines:lines.length,visibleLines:vis};}
 // カードの外にある文字（重複表示の確認）: カード面・ツールバー・ボタンを除いた部分
 const clone=d.cloneNode(true);clone.querySelectorAll('.card-face,.card-back,.detail-toolbar,button,select,label,.detail-card-canvas,.stage-card').forEach(n=>n.remove());
 const outside=clone.textContent.replace(/\s+/g,' ').trim();
 const cardText=p?.textContent??'';
 const buttons=[...d.querySelectorAll('[data-action]')].map(b=>{const r=b.getBoundingClientRect();return {main:b.querySelector('.action-main')?.textContent??b.textContent.trim(),note:b.querySelector('.action-note')?.textContent??'',h:Math.round(r.height),tappable:hit((r.left+r.right)/2,(r.top+r.bottom)/2,b)};});
 const select=d.querySelector('select[data-declaration]');
 const br=[...d.querySelectorAll('[data-action]')].map(b=>b.getBoundingClientRect());let gap=null;for(let i=0;i<br.length;i++)for(let j=i+1;j<br.length;j++){const a=br[i],b=br[j];const g=Math.max(b.top-a.bottom,a.top-b.bottom,b.left-a.right,a.left-b.right);gap=gap===null?g:Math.min(gap,g);}
 const band=d.querySelector('.stage-band,.detail-command'),bandH=band?Math.round(band.getBoundingClientRect().height):0;
 const scrollers=[d,...d.querySelectorAll('*')].filter(n=>/(auto|scroll)/.test(getComputedStyle(n).overflowY)&&n.scrollHeight>n.clientHeight+1).map(n=>n.className&&typeof n.className==='string'?n.className.split(' ')[0]:n.tagName);
 const close=d.querySelector('[data-close]').getBoundingClientRect();
 return {ui,card:{w:Math.round(fr.width),h:Math.round(fr.height),visibleArea:Math.round(visArea),viewportShare:+(visArea/(W*H)).toFixed(3)},onCard,
  outsideText:outside.slice(0,160),cardTextRepeatedOutside:!!cardText&&outside.includes(cardText.slice(0,20)),
  ruleLink:!!d.querySelector('[data-related-rule]'),guideBox:!!d.querySelector('.choice-guide'),
  buttons,buttonsTappable:buttons.filter(b=>b.tappable).length,minButtonH:buttons.length?Math.min(...buttons.map(b=>b.h)):null,minGap:gap===null?null:Math.round(gap),
  declaration:!!select,declarationTappable:select?hit((select.getBoundingClientRect().left+select.getBoundingClientRect().right)/2,(select.getBoundingClientRect().top+select.getBoundingClientRect().bottom)/2,select):null,
  bandH,bandShare:+(bandH/H).toFixed(3),moreHint:!!d.querySelector('.stage-band[data-more]'),scrollers,closeTappable:hit((close.left+close.right)/2,(close.top+close.bottom)/2,d.querySelector('[data-close]')),
  overflowX:document.documentElement.scrollWidth>W+1||[...d.querySelectorAll('*')].some(n=>{const r=n.getBoundingClientRect();return r.width>0&&(r.right>W+1||r.left<-1);})};
};
export const saved=page=>page.evaluate(()=>localStorage.getItem('naotocchi-cpu-match-v1')??localStorage.getItem('naotocchi-hotseat-v1'));
export const engineState=raw=>{const {recordsMeta,...d}=JSON.parse(raw);return restore(JSON.stringify(d.game??d));};

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const browser=await chromium.launch(),rows=[];
 for(const [w,h] of VIEWPORTS){const tag=`${w}x${h}`,ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  fs.mkdirSync(path.join(OUT,'screenshots',tag),{recursive:true});
  for(const c of CASES)for(const ui of ['old','new']){let rec={viewport:tag,case:c.key,card:c.card,text:c.text,ui};
   try{await openCase(page,c,ui);rec.initial=await page.evaluate(measure);
    await page.screenshot({path:path.join(OUT,'screenshots',tag,`${c.key}-${ui}.jpg`),type:'jpeg',quality:62});
    if(ui==='new'){const z=page.locator('#card-dialog .stage-zoom');
     if(await z.isVisible()){await page.locator('#card-dialog .stage-card').click();await page.waitForTimeout(250);rec.zoomed=await page.evaluate(measure);
      if(['choice-long','normal-long'].includes(c.key))await page.screenshot({path:path.join(OUT,'screenshots',tag,`${c.key}-new-zoom.jpg`),type:'jpeg',quality:62});}}
   }catch(e){rec.error=String(e.message??e);}
   rec.errors=errors.splice(0);rows.push(rec);
   process.stderr.write(`${tag} ${c.key} ${ui} ${rec.error??`card ${rec.initial.card.w}x${rec.initial.card.h} txt ${rec.initial.onCard?.fontPx} vis ${rec.initial.onCard?.visibleLines}/${rec.initial.onCard?.lines} btn ${rec.initial.buttonsTappable}/${rec.initial.buttons.length} dup ${rec.initial.cardTextRepeatedOutside}`}\n`);}
  await ctx.close();}
 await browser.close();
 fs.writeFileSync(path.join(OUT,'stage-results.json'),JSON.stringify(rows,null,1)+'\n');
}
