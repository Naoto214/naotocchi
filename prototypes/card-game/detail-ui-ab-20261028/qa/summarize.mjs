// ab-results.json を、画面幅×場面×案の比較表（Markdown）にまとめる。
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const rows=JSON.parse(fs.readFileSync(path.join(HERE,'ab-results.json'),'utf8'));
const pct=x=>x==null?'—':Math.round(x*100)+'%';
const cell=r=>r.error?'エラー':`${pct(r.initial.ratio)} · ${r.initial.buttonsTappable}/${r.initial.buttons.length} · ${r.read?.scrollPx??0}px${r.initial.scrollers.length>1?' · 枠'+r.initial.scrollers.length:''}${r.initial.overflowX?' · はみ出し':''}`;
let out='| 画面 | 場面（カード） | 現行 | A案 | B案 |\n|---|---|---|---|---|\n';
const vps=[...new Set(rows.map(r=>r.viewport))],cases=[...new Set(rows.map(r=>r.case))];
for(const vp of vps)for(const c of cases){const get=v=>rows.find(r=>r.viewport===vp&&r.case===c&&r.variant===v);const a=get('current');out+=`| ${vp} | ${c}（${a.card}） | ${cell(a)} | ${cell(get('a'))} | ${cell(get('b'))} |\n`;}
// 集計
const agg={};for(const r of rows){if(r.error)continue;const k=r.variant;agg[k]??={n:0,ratio:0,full:0,btnAll:0,double:0,overflow:0,errors:0,fontMin:99};const g=agg[k];g.n++;g.ratio+=r.initial.ratio??1;g.full+=(r.initial.ratio??1)>=1?1:0;g.btnAll+=r.initial.buttonsTappable===r.initial.buttons.length?1:0;g.double+=r.initial.scrollers.length>1?1:0;g.overflow+=r.initial.overflowX?1:0;g.errors+=r.errors.length;g.fontMin=Math.min(g.fontMin,r.initial.textFontPx??99);}
let sum='| 案 | 測定数 | 本文の初期表示（平均） | 初期表示で全文 | 全ボタンをそのまま押せる | スクロール枠が2つ以上 | 横はみ出し | 本文の文字 |\n|---|---|---|---|---|---|---|---|\n';
for(const [k,g] of Object.entries(agg))sum+=`| ${{current:'現行',a:'A案',b:'B案'}[k]} | ${g.n} | ${pct(g.ratio/g.n)} | ${g.full}/${g.n} | ${g.btnAll}/${g.n} | ${g.double}/${g.n} | ${g.overflow} | ${g.fontMin}px |\n`;
fs.writeFileSync(path.join(HERE,'ab-summary.md'),`# A/B 比較の測定結果（自動生成: summarize.mjs）\n\nセルの見方: 初期表示で読める本文の行の割合 · 初期表示でそのまま押せる操作ボタン数/全数 · 全文を読むのに必要なスクロール量 ·（枠N = スクロールできる枠がN個）\n\n## 集計\n\n${sum}\n## 全結果\n\n${out}`);
console.log(sum);
