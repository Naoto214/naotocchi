// stage-results.json（現行=改善A案 と 新UI の比較測定）を Markdown の表にまとめる。COMPARISON.md も作る。
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),rows=JSON.parse(fs.readFileSync(path.join(HERE,'stage-results.json'),'utf8'));
const get=(vp,c,ui)=>rows.find(r=>r.viewport===vp&&r.case===c&&r.ui===ui);
const vps=[...new Set(rows.map(r=>r.viewport))],cases=[...new Set(rows.map(r=>r.case))];
const pct=x=>Math.round(x*100)+'%';
const cardCell=m=>`${m.card.w}×${m.card.h}（画面の${pct(m.card.viewportShare)}）`;
const textCell=m=>m.onCard?`${m.onCard.fontPx}px · ${m.onCard.visibleLines}/${m.onCard.lines}行`:'—';
const btn=m=>m.declaration?`宣言欄${m.declarationTappable?'○':'×'}＋${m.buttonsTappable}/${m.buttons.length}`:`${m.buttonsTappable}/${m.buttons.length}`;
let t='| 画面 | 場面（カード） | カードの大きさ 現行 → 新UI | カード面の本文（画面上の文字・初期表示の行） 現行 → 新UI | 押せるボタン 現行 → 新UI | カード外の本文・情報の再掲 現行 → 新UI | 下部操作の高さ 新UI |\n|---|---|---|---|---|---|---|\n';
for(const vp of vps)for(const c of cases){const o=get(vp,c,'old'),n=get(vp,c,'new');if(!o||!n||o.error||n.error){t+=`| ${vp} | ${c} | エラー | | | | |\n`;continue;}const O=o.initial,N=n.initial;
 t+=`| ${vp} | ${c}（${n.card}・${n.text}） | ${cardCell(O)} → **${cardCell(N)}** | ${textCell(O)} → **${textCell(N)}**${n.zoomed?`（拡大 ${n.zoomed.onCard?.fontPx}px）`:''} | ${btn(O)} → **${btn(N)}**${N.moreHint?'（▼案内）':''} | ${O.cardTextRepeatedOutside||O.ruleLink||O.guideBox?'あり':'なし'} → **${N.cardTextRepeatedOutside||N.ruleLink||N.guideBox?'あり':'なし'}** | ${pct(N.bandShare)} |\n`;}
const agg={};for(const r of rows){if(r.error)continue;const g=agg[r.ui]??={n:0,share:0,btnAll:0,dup:0,overflow:0,errors:0};g.n++;g.share+=r.initial.card.viewportShare;g.btnAll+=(r.initial.buttonsTappable===r.initial.buttons.length&&(r.initial.declarationTappable!==false))?1:0;g.dup+=(r.initial.cardTextRepeatedOutside||r.initial.ruleLink||r.initial.guideBox)?1:0;g.overflow+=r.initial.overflowX?1:0;g.errors+=r.errors.length;}
let sum='| UI | 測定数 | カードが画面に占める割合（平均） | 全ボタン（宣言欄を含む）をそのまま押せる | カード外に本文・情報・関連ルール・独立説明 | 横はみ出し | ページエラー |\n|---|---|---|---|---|---|---|\n';
for(const k of ['old','new']){const g=agg[k];if(g)sum+=`| ${k==='old'?'現行（改善A案）':'新UI'} | ${g.n} | ${pct(g.share/g.n)} | ${g.btnAll}/${g.n} | ${g.dup}/${g.n} | ${g.overflow} | ${g.errors} |\n`;}
fs.writeFileSync(path.join(HERE,'stage-summary.md'),`# カード詳細 新UI と 現行（改善A案）の比較（自動生成: summarize.mjs）\n\nChromium（Playwright、タッチ・モバイル表示）。同じ場面・同じカード・同じ画面幅。\n\n## 集計\n\n${sum}\n## 全結果\n\n${t}`);
// COMPARISON.md（左: 現行、右: 新UI）
const label={'choice-long':'たまごの手札交換・長文（とかい）','choice-short':'たまごの手札交換・短文（ヒトデ①）','normal-long':'通常手番・長文（まねっこサル）','response':'応答中（ラッキーコイン）','target':'3択の対象指定（サングラスのカメレオン）','many':'4つの装備先（おべんとうばこ）','declare':'宣言（ヒット&ブロー）','chain':'連鎖中の応答（はじめてのデート）'};
let md='# カード詳細 比較スクリーンショット\n\n同じ場面・同じカード・同じ画面幅で、左が **現行（改善A案）**、右が **新UI**（大型カード＋補足付きボタン）。Chromium（2倍密度）。実機 Safari ではありません。数値は [qa/stage-summary.md](qa/stage-summary.md)。\n\n';
for(const vp of vps){md+=`## ${vp}${vp.startsWith('844')?'（横向き）':''}\n\n`;for(const c of cases){md+=`### ${label[c]??c}\n\n| 現行 | 新UI |\n|---|---|\n| <img src="qa/screenshots/${vp}/${c}-old.jpg" width="260"> | <img src="qa/screenshots/${vp}/${c}-new.jpg" width="260"> |\n\n`;}
 if(fs.existsSync(path.join(HERE,'screenshots',vp,'normal-long-new-zoom.jpg')))md+=`### 新UI：カードを押して拡大（通常手番・長文）\n\n<img src="qa/screenshots/${vp}/normal-long-new-zoom.jpg" width="260">\n\n`;}
fs.writeFileSync(path.join(HERE,'..','COMPARISON.md'),md);
console.log(sum);
