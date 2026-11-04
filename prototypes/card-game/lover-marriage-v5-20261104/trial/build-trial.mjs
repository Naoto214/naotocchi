// 本人限定 VERSION 5 試遊版を組み立てる（V4 の trial/build-trial.mjs の写し）（恋人18種類の「♥ 結婚したら」・未承認）。正式ファイルは読むだけで、前後の sha256 を照合する。
// 方式は ../../variable-life-20261031/trial/build-trial.mjs（#498）と同じ：写し＋パッチ → esbuild で1つにまとめる → claude.ai の非公開 Artifact。
// 使い方: ESBUILD=<esbuild> node trial/build-trial.mjs <出力dir（リポジトリの外）> [--artifact]
// 保存の鍵はすべて `naotocchi-lover5-trial:` 付き（正式版の対戦・戦績・マイデッキには触れない）。
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {buildStage,CG,REPO} from '../lib/build-stage.mjs';
import {lovers,FINAL,VARIANTS,VKEYS} from '../lib/v5-patches.mjs';
const LOVERS=lovers(FINAL);
const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.resolve(process.argv[2]??'');if(!process.argv[2]||OUT.startsWith(REPO+path.sep))throw Error('出力先はリポジトリの外を指定してください');
const artifact=process.argv.includes('--artifact'),ESBUILD=process.env.ESBUILD??'esbuild',PREFIX='naotocchi-lover5-trial:';
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const STAGE=path.join(OUT,'.stage');const built=buildStage(STAGE,{v4:true,cpu:true,ui:true});
function patchFile(f,list){let t=fs.readFileSync(path.join(STAGE,f),'utf8');for(const [label,a,b] of list){const n=t.split(a).length-1;if(n!==1)throw Error(`patch ${f}:${label}: ${n}`);t=t.replace(a,()=>b);}fs.writeFileSync(path.join(STAGE,f),t);}
fs.copyFileSync(path.join(HERE,'qa-v5.mjs'),path.join(STAGE,'qa-v4.mjs'));
// 1) アプリ：QA盤面（保存しない）。通常の「新しい対戦」「保存した対戦に戻る」で QA モードを解除。
let app=fs.readFileSync(path.join(STAGE,'app.mjs'),'utf8');
app=`import {qaState as __qaState,QA_STATES as __QA_STATES} from './qa-v4.mjs';\n`+app;
fs.writeFileSync(path.join(STAGE,'app.mjs'),app);
patchFile('app.mjs',[
 ['persist-guard',"function persist(){","function persist(){if(window.__lv4QAMode){message('QA盤面は保存しません（試遊専用）');return;}"],
 ['new-clears',"$('new').onclick=()=>{try{","$('new').onclick=()=>{window.__lv4QAMode=false;try{"],
 ['restore-clears',"$('restore').onclick=()=>{try{","$('restore').onclick=()=>{window.__lv4QAMode=false;try{"],
]);
fs.appendFileSync(path.join(STAGE,'app.mjs'),`
// ---- lover-marriage-v5 試遊：QA盤面 ----
{const lov=document.getElementById('lv4-qa-lover'),st=document.getElementById('lv4-qa-state'),go=document.getElementById('lv4-qa-start');
 if(lov&&st&&go){for(const [id,c] of Object.entries(CARDS).filter(([,c])=>c.married)){const o=document.createElement('option');o.value=id;o.textContent=c.name;lov.append(o);}
  for(const [k,label] of Object.entries(__QA_STATES)){const o=document.createElement('option');o.value=k;o.textContent=label;st.append(o);}
  window.__lv4Projection=()=>session?.projection??null;
  go.onclick=()=>{try{cpu.cancel();window.__lv4QAMode=true;session=new HotseatSession({autoAdvance:true});matchMetadata=null;recordedId=null;start(__qaState(lov.value,st.value));$('export').hidden=true;message('QA盤面（保存しません）：'+CARDS[lov.value].name);}catch(e){message('QA盤面を作れません：'+e.message);}};}}
`);
// 2) ルールブック：試遊版の説明（正式ルールブックには入れない。試遊版の画面だけ）。
patchFile('rulebook-content.mjs',[['trial-ch9'," '本編の性別・恋愛タイプ・相性判定は"," '【試遊版 VERSION 5・未承認】恋人カードは、こいびとになると「こいびとのとき」の能力が使えます。結婚するとそだち+10、さらに「♥ 結婚したら」の能力が加わります。',\n '【試遊版】「♥ 結婚したら」には、結婚した時に1回だけ働くもの（例：ワシの1枚引く）と、結婚している間ずっと働くもの（例：サボテンのちから+1）があります。発動の条件・回数はカードに書いてあるとおりです。',\n '【試遊版】結婚した後にこいびとが離れると、そだち−10で、こいびとの能力と「♥ 結婚したら」の能力を両方失います。もう一度出して結婚すれば、結婚した時の能力はまた働きます。',\n '本編の性別・恋愛タイプ・相性判定は"]]);
// 3) まとめる。
execFileSync(ESBUILD,[path.join(STAGE,'app.mjs'),'--bundle','--format=esm','--target=safari16','--charset=utf8','--legal-comments=none',`--outfile=${path.join(OUT,'trial-bundle.js')}`],{stdio:'inherit'});
let bundle=fs.readFileSync(path.join(OUT,'trial-bundle.js'),'utf8');
// 4) 画像：正式の配信リストにある CARD GAME の画像。カードは large だけ（small を large に置き換える）。
const allow=JSON.parse(fs.readFileSync(path.join(REPO,'tools/pages/allowlist.json'),'utf8')).files.filter(f=>f.startsWith('prototypes/card-game/'));
const {CARD_ART}=await import(path.join(CG,'ui-art.mjs'));
for(const a of Object.values(CARD_ART)){if(!bundle.includes(a.small))throw Error('画像パスが見つかりません: '+a.small);bundle=bundle.split(JSON.stringify(a.small)).join(JSON.stringify(a.large));}
fs.writeFileSync(path.join(OUT,'trial-bundle.js'),bundle);
const images=allow.filter(f=>/\.(webp|png)$/.test(f)).map(f=>path.relative(CG,path.join(REPO,f))).filter(f=>!f.startsWith('art-delivery/small/'));
for(const f of images){const to=path.join(OUT,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(CG,f),to);}
// 5) CSS と HTML。二段のカード本文と QA 盤面の小さな追加だけ（既存デザインの色：深緑・金・クリーム・恋人の色）。
for(const f of allow.map(f=>path.relative(CG,path.join(REPO,f))).filter(f=>f.endsWith('.css'))){const to=path.join(OUT,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(CG,f),to);}
let html=fs.readFileSync(path.join(CG,'index.html'),'utf8');
const swap=(from,to)=>{if(html.split(from).length!==2)throw Error('index.html の想定箇所がありません: '+from);html=html.replace(from,to);};
const storage=`(()=>{const P=${JSON.stringify(PREFIX)},S=Storage.prototype,{getItem:g,setItem:s,removeItem:r}=S;S.getItem=function(k){return g.call(this,P+k);};S.setItem=function(k,v){return s.call(this,P+k,v);};S.removeItem=function(k){return r.call(this,P+k);};})();`;
const css=`.card-face.lover-two:not(.compact) .card-copy{flex:0 0 47%!important;font-size:3.25cqw!important;line-height:1.38!important;overflow-y:auto!important;padding:2.6% 3%!important}.card-face.lover-two:not(.compact) .card-art{min-height:0}.card-face.lover-two.long-copy:not(.compact) .card-copy{flex-basis:53%!important;font-size:3.05cqw!important}`
 +`.card-face.lover-two .lover-block{margin:0;line-height:1.38;white-space:normal}.card-face.lover-two .lover-block b{display:block;font-size:3.1cqw;letter-spacing:.06em;color:#6e5a36;margin-bottom:.5%}`
 +`.card-face.lover-two .lover-married{margin-top:1.8%;padding-top:1.8%;border-top:1px dashed #b79a51}.card-face.lover-two .lover-married b{color:#C04479}`
 +`.lv4-note{margin:8px 0 12px;padding:10px 12px;border-radius:10px;background:#fff4e0;border:2px solid #C04479;color:#3d3326;line-height:1.6;font-size:14px}.lv4-note strong{color:#C04479}`
 +`.lv5-diff{margin-top:8px}.lv5-diff summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:700;color:#C04479}.lv5-diff ul{margin:4px 0 6px;padding-left:1.2em}.lv5-diff li{margin:6px 0}.lv5-old{color:#6e5a36;text-decoration:line-through;text-decoration-color:#b79a51}.lv5-new{color:#3d3326;font-weight:700}`
 +`.lv4-qa{margin:10px 0;padding:10px 12px;border:1px dashed #b79a51;border-radius:10px;background:#1b3b33;color:#f6f0dc;font-size:13px}.lv4-qa summary{min-height:44px;display:flex;align-items:center;cursor:pointer}.lv4-qa label{display:flex;flex-direction:column;gap:4px;margin:6px 0}.lv4-qa select{max-width:100%}`;
// V4 との違い（ゴリラ・せいれい・サボテンのうち、V4 から変えたものだけ）。
const ID=Object.fromEntries(VKEYS);
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const {CATALOG}=await import(path.join(CG,'full-catalog.mjs'));
const diffs=Object.entries(ID).filter(([k])=>VARIANTS[k][FINAL[k]].married!==VARIANTS[k].v4.married).map(([k,id])=>`<li><b>${esc(CATALOG[id].name)}</b><br><span class="lv5-old">V4：${esc(VARIANTS[k].v4.married)}</span><br><span class="lv5-new">V5：${esc(VARIANTS[k][FINAL[k]].married)}</span></li>`);
const diffHtml=`<details class="lv5-diff"><summary>V4 からの変更（${diffs.length?diffs.length+'種類':'能力の変更なし'}）</summary>${diffs.length?'<ul>'+diffs.join('')+'</ul>':''}<p>本文の言い回しだけ短くしたもの（能力は V4 と同じ）：いわばのタコさん（こいびとのとき）。詳細表示で本文が切れないようにするためです。</p><p>ほかの${18-diffs.length}種類の「♥ 結婚したら」の能力は V4 と同じです。共通ルール（結婚+10・結婚前の別れ−5・結婚後の別れ−10）は正式版と同じです。</p></details>`;
const note=`<div class="lv4-note"><strong>試遊版 VERSION 5：恋人18種類の「♥ 結婚したら」（未承認）</strong><br>結婚すると、そだち+10に加えて、カード下段の「♥ 結婚したら」の能力が加わります。結婚した時に1回だけのものと、結婚している間ずっとのものがあります。<br>この試遊版の保存・戦績・マイデッキは、正式版とは別に保存されます。<br><b>この試遊版では「保存ファイルを書き出す」は動きません</b>（試遊版の画面の中では、ファイルを保存できないため）。対戦の続きは「保存した対戦に戻る」で再開できます。${diffHtml}</div>`
 +`<details class="lv4-qa"><summary>QA：恋人18種類の結婚前・結婚後を再現（試遊専用・保存しない）</summary><p>2人対戦（同じ端末）で、選んだ恋人の盤面から始めます。この盤面は保存も戦績の記録もしません。</p><label>恋人<select id="lv4-qa-lover"></select></label><label>状態<select id="lv4-qa-state"></select></label><button type="button" id="lv4-qa-start">この盤面で始める</button></details>`;
swap('<title>なおとっち CARD GAME</title>','<title>CARD GAME 結婚の能力 試遊 V5</title>');
swap('<link rel="stylesheet" href="records.css">','<link rel="stylesheet" href="records.css"><style>'+css+'</style><script>'+storage+'</script>');
swap('<h2 id="match-setup-title">対戦の準備</h2>','<h2 id="match-setup-title">対戦の準備</h2>'+note);
swap('<a id="home-return" class="home-return" href="../../">','<a id="home-return" class="home-return" href="home.html">');
swap('<script type="module" src="app.mjs"></script>','<script type="module" src="trial-bundle.js"></script>');
if(artifact){
 html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,f)=>{const c=fs.readFileSync(path.join(OUT,f),'utf8');fs.rmSync(path.join(OUT,f));return `<style>${c}</style>`;});
 const js=fs.readFileSync(path.join(OUT,'trial-bundle.js'),'utf8');if(/<\/script/i.test(js))throw Error('bundle に </script が含まれます');
 fs.rmSync(path.join(OUT,'trial-bundle.js'));
 swap('<script type="module" src="trial-bundle.js"></script>',`<script type="module">${js}</script>`);
 html=html.replace(/^<!doctype html>\s*<html lang="ja"><head><meta charset="utf-8"><meta name="viewport"[^>]*>/,'').replace('</head>\n<body>','').replace('</body></html>','');
 if(/<\/?(html|head|body)[ >]/.test(html))throw Error('外枠タグが残っています');
}
fs.writeFileSync(path.join(OUT,'index.html'),html);
fs.writeFileSync(path.join(OUT,'home.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>なおとっち（試遊用の仮画面）</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#132d2c;color:#f6f0dc;font-family:system-ui,sans-serif;padding:16px;box-sizing:border-box}main{max-width:420px;text-align:center}p{line-height:1.7}a{display:inline-flex;align-items:center;min-height:44px;padding:10px 18px;border-radius:12px;background:#ead69e;color:#24392c;text-decoration:none;font-weight:700}</style></head><body><main><h1>なおとっち</h1><p>（試遊用の仮画面）<br>本番では、ここが通常のなおとっち育成画面です。</p><p><a href="./">CARD GAME 結婚の能力 試遊をひらく</a></p></main></body></html>\n`);
fs.rmSync(STAGE,{recursive:true,force:true});
const files=[];(function walk(d){for(const n of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,n.name);if(n.isDirectory())walk(p);else files.push(path.relative(OUT,p));}})(OUT);
console.log(JSON.stringify({out:OUT,files:files.length,bytes:files.reduce((s,f)=>s+fs.statSync(path.join(OUT,f)).size,0),artifact,patched:built.patched,lovers:Object.keys(LOVERS).length}));
