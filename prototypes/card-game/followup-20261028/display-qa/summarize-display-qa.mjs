// results.json（run-display-qa.mjs の出力）を、カード×画面幅の分類表にまとめる（読み取り専用）。
// 分類: A 全文が読める / B 軽微（全文は読めるが面の本文が小さい等）/ C 実際の見切れ（カード面・詳細とも全文を読めない）/ D 画面幅・向き・状態に依存（初期表示で一部のみ。操作で全文は読める）
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),r=JSON.parse(fs.readFileSync(path.join(HERE,'results.json'),'utf8'));
const FACE_SMALL_CQW=2.9;                       // カード面の本文がこれより小さい（B）。既存の許容例: M-cat-07・M-antlion-06/07 は2.9cqw。実効pxは画面幅に比例し、CSVに併記
const tags=[...new Set(r.map(x=>x.tag))],ids=[...new Set(r.map(x=>x.id))];
const cell=(id,tag)=>{const c=r.find(x=>x.id===id&&x.tag===tag&&x.screen==='collection'),m=r.find(x=>x.id===id&&x.tag===tag&&x.screen==='match-dialog');if(!c||!m)return null;
 const faceClip=c.face.clipped||m.face.clipped,panelOk=c.panel.textMatchesCatalog&&c.panel.visibleInViewport&&m.panel.containsCatalogText;
 const innerScroll=m.panel.effectScroll>m.panel.effectClient+1,visiblePct=Math.round(100*Math.min(1,m.panel.effectClient/m.panel.effectScroll));
 let cls='A';if(parseFloat(c.face.inlineSize??'9')<FACE_SMALL_CQW)cls='B';if(innerScroll)cls='D';if(faceClip&&!panelOk)cls='C';
 return {cls,faceClip,panelOk,collectionFacePx:c.face.fontPx,matchFacePx:m.face.fontPx,matchPanelVisiblePct:visiblePct,matchPanelInnerScroll:innerScroll,matchPanelClientPx:m.panel.effectClient,matchPanelScrollPx:m.panel.effectScroll};};
const rows=[];for(const id of ids)for(const tag of tags){const c=cell(id,tag);if(c)rows.push({id,tag,...c});}
const final={};for(const id of ids){const cs=rows.filter(x=>x.id===id).map(x=>x.cls);final[id]=cs.includes('C')?'C':cs.includes('D')?'D':cs.includes('B')?'B':'A';}
const portraitMain=['390x844','430x932'];
const summary={cards:ids.length,tags,faceClippedCells:rows.filter(x=>x.faceClip).length,cellsTotal:rows.length,finalClass:Object.values(final).reduce((m,k)=>(m[k]=(m[k]||0)+1,m),{}),
 byTag:Object.fromEntries(tags.map(t=>[t,rows.filter(x=>x.tag===t).reduce((m,x)=>(m[x.cls]=(m[x.cls]||0)+1,m),{})])),
 cardsNeverClipped:ids.filter(id=>!rows.some(x=>x.id===id&&x.faceClip)).length,
 panelsAlwaysFullTextAvailable:rows.every(x=>x.panelOk),
 innerScrollCells:rows.filter(x=>x.matchPanelInnerScroll).length};
fs.writeFileSync(path.join(HERE,'display-qa-matrix.csv'),'﻿'+Object.keys(rows[0]).join(',')+'\n'+rows.map(x=>Object.values(x).join(',')).join('\n')+'\n');
fs.writeFileSync(path.join(HERE,'display-qa-summary.json'),JSON.stringify({summary,final},null,1));console.log(JSON.stringify(summary,null,1));
