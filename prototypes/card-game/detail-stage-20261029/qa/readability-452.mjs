// 正式452枚の能力本文が、新しいカード詳細の大きさで画面上何pxになるかを測る（読み取り専用）。
// 正式の cardMarkup(c,{detail:true}) を 320×480 の詳細用キャンバスに描き、正式の fitMainCardCopy（はみ出す時の縮小）を適用した
// 本文の文字サイズを取り、画面幅ごとの拡大率（stage-results.json の新UIで実測したカード幅 ÷ 320）を掛ける。
// 使い方: リポジトリ直下を配信して
//   CARD_GAME_URL=http://127.0.0.1:8765/prototypes/card-game/ node prototypes/card-game/detail-stage-20261029/qa/readability-452.mjs
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const HERE=path.dirname(fileURLToPath(import.meta.url)),URL_=process.env.CARD_GAME_URL??'http://127.0.0.1:8765/prototypes/card-game/';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:800,height:900}});
await page.goto(URL_);
const cards=await page.evaluate(async()=>{
 const ui=await import('./ui-presentation.mjs'),{CARDS}=await import('./engine.mjs'),{fitMainCardCopy}=await import('./ui-art-loading.mjs');
 await document.fonts.ready;const host=document.createElement('div');host.className='stage-card-canvas';host.style.cssText='position:absolute;left:0;top:0;width:320px;height:480px';
 const wrap=document.createElement('div');wrap.id='card-dialog';wrap.className='card-detail';wrap.style.cssText='position:absolute;left:-2000px;top:0';wrap.append(host);document.body.append(wrap);
 const out=[];
 for(const c of Object.values(CARDS)){host.innerHTML=ui.cardMarkup({...c,cardId:c.id},{detail:true});const face=host.firstElementChild;fitMainCardCopy(face);
  const copy=face.querySelector('.card-copy'),p=copy?.querySelector('p');
  out.push({id:c.id,name:c.name,type:c.type,chars:[...(c.text??'')].length,basePx:p?+parseFloat(getComputedStyle(p).fontSize).toFixed(2):null,clipped:copy?copy.scrollHeight>copy.clientHeight+1:null});}
 wrap.remove();return out;});
await browser.close();
// 画面幅ごとの拡大率: 新UIで実測したカード幅（1つの行動の場面と3択の場面）
const rows=JSON.parse(fs.readFileSync(path.join(HERE,'stage-results.json'),'utf8')).filter(r=>r.ui==='new'&&!r.error);
const scales={};for(const r of rows){const k=r.viewport;scales[k]??={};if(r.case==='choice-long')scales[k].one=r.initial.card.w/320;if(r.case==='target')scales[k].three=r.initial.card.w/320;if(r.zoomed&&r.case==='choice-long')scales[k].zoom=r.zoomed.card.w/320;}
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*(s.length-1)))];};
const base=cards.map(c=>c.basePx).filter(Boolean),band=c=>c.chars<=40?'短文（〜40字）':c.chars<=100?'中（41〜100字）':'長文（101字〜）';
const summary={cards:cards.length,clipped:cards.filter(c=>c.clipped).length,groups:{}};
for(const g of ['短文（〜40字）','中（41〜100字）','長文（101字〜）']){const xs=cards.filter(c=>c.basePx&&band(c)===g);
 summary.groups[g]={count:xs.length,basePx:{min:Math.min(...xs.map(c=>c.basePx)),median:q(xs.map(c=>c.basePx),.5)},onScreen:Object.fromEntries(Object.entries(scales).map(([vp,s])=>[vp,Object.fromEntries(Object.entries(s).map(([k,v])=>[k,{min:+(Math.min(...xs.map(c=>c.basePx))*v).toFixed(1),median:+(q(xs.map(c=>c.basePx),.5)*v).toFixed(1)}]))]))};}
summary.scales=Object.fromEntries(Object.entries(scales).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([a,b])=>[a,+b.toFixed(3)]))]));
summary.smallest=cards.filter(c=>c.basePx).sort((a,b)=>a.basePx-b.basePx).slice(0,5).map(c=>({id:c.id,name:c.name,chars:c.chars,basePx:c.basePx}));
fs.writeFileSync(path.join(HERE,'readability-452.json'),JSON.stringify({summary,cards},null,1)+'\n');
console.log(JSON.stringify(summary,null,1));
