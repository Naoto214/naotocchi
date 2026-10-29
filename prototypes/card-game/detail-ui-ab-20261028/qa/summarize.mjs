// ab-results.json を、画面幅×場面×案の比較表（Markdown）にまとめる。
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const rows=JSON.parse(fs.readFileSync(path.join(HERE,'ab-results.json'),'utf8'));
const NAME={current:'現行',a:'旧A案',b:'B案',a2:'改善A案'},ORDER=['current','a','b','a2'];
const pct=x=>x==null?'—':Math.round(x*100)+'%';
const cell=r=>r.error?'エラー':`${pct(r.initial.ratio)} · ${r.initial.buttonsTappable}/${r.initial.buttons.length} · ${r.read?.scrollPx??0}px${r.initial.scrollers.length>1?' · 枠'+r.initial.scrollers.length:''}${r.initial.overflowX?' · はみ出し':''}`;
const vps=[...new Set(rows.map(r=>r.viewport))],cases=[...new Set(rows.map(r=>r.case))];
const get=(vp,c,v)=>rows.find(r=>r.viewport===vp&&r.case===c&&r.variant===v);
let out=`| 画面 | 場面（カード） | ${ORDER.map(v=>NAME[v]).join(' | ')} |\n|---|---|${ORDER.map(()=>'---').join('|')}|\n`;
for(const vp of vps)for(const c of cases)out+=`| ${vp} | ${c}（${get(vp,c,'current').card}） | ${ORDER.map(v=>cell(get(vp,c,v))).join(' | ')} |\n`;
// 集計
const agg={};for(const r of rows){if(r.error)continue;const g=agg[r.variant]??={n:0,ratio:0,full:0,btnAll:0,double:0,overflow:0,fontMin:99,gapMin:99};g.n++;g.ratio+=r.initial.ratio??1;g.full+=(r.initial.ratio??1)>=1?1:0;g.btnAll+=r.initial.buttonsTappable===r.initial.buttons.length?1:0;g.double+=r.initial.scrollers.length>1?1:0;g.overflow+=r.initial.overflowX?1:0;g.fontMin=Math.min(g.fontMin,r.initial.textFontPx??99);if(r.initial.minButtonGap!=null)g.gapMin=Math.min(g.gapMin,r.initial.minButtonGap);}
let sum='| 案 | 測定数 | 本文の初期表示（平均） | 初期表示で全文 | 全ボタンをそのまま押せる | スクロール枠が2つ以上 | 横はみ出し | 本文の文字 | ボタン間の最小間隔 |\n|---|---|---|---|---|---|---|---|---|\n';
for(const k of ORDER){const g=agg[k];if(g)sum+=`| ${NAME[k]} | ${g.n} | ${pct(g.ratio/g.n)} | ${g.full}/${g.n} | ${g.btnAll}/${g.n} | ${g.double}/${g.n} | ${g.overflow} | ${g.fontMin}px | ${g.gapMin}px |\n`;}
// 旧A案 → 改善A案（同じ場面・同じ画面）
let ab='| 画面 | 場面 | 本文の初期表示（行） | 全ボタン押下可 | 下部操作帯の高さ（画面比） | 全文までのスクロール | スクロール枠 | ボタン間隔 | カード画像の見えている面積 |\n|---|---|---|---|---|---|---|---|---|\n';
const f=(a,b)=>`${a} → **${b}**`;
for(const vp of vps)for(const c of cases.filter(c=>!c.endsWith('hotseat'))){const a=get(vp,c,'a'),b=get(vp,c,'a2');if(!a||!b||a.error||b.error)continue;const A=a.initial,B=b.initial;
 ab+=`| ${vp} | ${c} | ${f(`${A.visibleLines}/${A.lines}`,`${B.visibleLines}/${B.lines}`)} | ${f(`${A.buttonsTappable}/${A.buttons.length}`,`${B.buttonsTappable}/${B.buttons.length}`)} | ${f(`${A.commandH}px (${pct(A.commandRatio)})`,`${B.commandH}px (${pct(B.commandRatio)})`)} | ${f(`${a.read?.scrollPx??0}px`,`${b.read?.scrollPx??0}px`)} | ${f(A.scrollers.length,B.scrollers.length)} | ${f(A.minButtonGap??'—',B.minButtonGap??'—')} | ${f(A.artVisibleArea,B.artVisibleArea)} |\n`;}
fs.writeFileSync(path.join(HERE,'ab-summary.md'),`# 比較の測定結果（自動生成: summarize.mjs）\n\nChromium（Playwright、タッチ・モバイル表示）。同じ場面・同じカード・同じ画面幅で 現行 / 旧A案 / B案 / 改善A案 を測定。\n\n## 集計\n\n${sum}\n## 旧A案 → 改善A案\n\nカード画像の見えている面積は px²（初期表示で画面内にある部分）。\n\n${ab}\n## 全結果\n\nセルの見方: 初期表示で読める本文の行の割合 · 初期表示でそのまま押せる操作ボタン数/全数 · 全文を読むのに必要なスクロール量 ·（枠N = スクロールできる枠がN個）\n\n${out}`);
console.log(sum);
