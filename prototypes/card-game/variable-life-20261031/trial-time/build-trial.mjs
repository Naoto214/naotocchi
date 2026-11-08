// 本人限定の試遊版「時のカード IX・X・XI・XII（特殊カウンター）」を組み立てる。正式ファイルは読むだけで、書き換えない。
// 方式は ../trial-world/build-trial.mjs と同じ（esbuild で1つにまとめ、claude.ai の非公開 Artifact へ公開）。A1t1・XI/XII の試遊版は無変更。
// 実験 T-2s と同じ規則（ENGINE＋ENGINE_WORLD＋ENGINE_TIME・EFFECTS_TIME・CPU 補助 smart）。時2・同名3枚まで・特殊カウンターあり。
// 人生の時計（採用版 V22）は描画を変えず、下中央の小針に対戦の終了ラウンドを渡すだけ。採用版の入力チェック（10〜12）だけ、試遊版の写しで9も受け付ける。
// 使い方: node prototypes/card-game/variable-life-20261031/trial-time/build-trial.mjs <出力dir> [--large-only] [--artifact] [--stage-only]
// 保存の鍵はすべて `naotocchi-time-trial:` 付き（正式版・ほかの試遊版の保存には触れない）。
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {ENGINE,effectsPatches,OBSERVATION,policyPatches,ENGINE_WORLD,ENGINE_TIME,EFFECTS_TIME,policyTime,timeCards,timeRules,newCards,newRules,EFFECTS_V4,EFFECTS_TIME_U12,ENGINE_V4,policyTrialV6,v5Cards,v5Rules,EFFECTS_V5} from '../lib/life-patches.mjs';
import {CONFIGS} from '../lib/decks-life.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),CG=path.resolve(HERE,'../..'),REPO=path.resolve(CG,'../..');
const OUT=path.resolve(process.argv[2]??'');if(!process.argv[2]||OUT.startsWith(REPO+path.sep))throw Error('出力先はリポジトリの外を指定してください');
const largeOnly=process.argv.includes('--large-only'),artifact=process.argv.includes('--artifact'),stageOnly=process.argv.includes('--stage-only');
// VERSION 9：--art <dir>＝integration/integrate-art.mjs の出力（Astra の正式候補画像の WebP と card-art-v9.json）。指定した時だけ、
// 候補7枚の画像を試遊版の写しの CARD_ART に足す（試遊版の中のカードIDは実験用の X-*）。指定しなければ今までどおり仮表示。
const ART_DIR=process.argv.includes('--art')?path.resolve(process.argv[process.argv.indexOf('--art')+1]):null;
const ART=ART_DIR?JSON.parse(fs.readFileSync(path.join(ART_DIR,'card-art-v9.json'),'utf8')):null;
const ESBUILD=process.env.ESBUILD??'esbuild',PREFIX='naotocchi-time-trial:';
const sha=t=>createHash('sha256').update(t).digest('hex');
const officialSha=()=>Object.fromEntries(fs.readdirSync(CG).filter(f=>/\.(mjs|html|css)$/.test(f)).sort().map(f=>[f,sha(fs.readFileSync(path.join(CG,f)))]));
const before=officialSha();
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
function patch(text,from,to,label){const n=text.split(from).length-1;if(n!==1)throw Error(`patch ${label}: expected 1 match, found ${n}`);return text.replace(from,()=>to);}

// 1) 正式モジュールの写しに、実験 T-2s と同じ規則を当てる（ENGINE＋ENGINE_WORLD＋ENGINE_TIME・effects・CPU 補助 smart。記録用フックは入れない）。
const CFG={};
const STAGE=path.join(OUT,'.stage');fs.mkdirSync(STAGE);
const src={};for(const f of fs.readdirSync(CG).filter(f=>f.endsWith('.mjs')))src[f]=fs.readFileSync(path.join(CG,f),'utf8');
const apply=(f,list)=>{for(const [l,a,b] of list)src[f]=patch(src[f],a,b,`${f}:${l}`);};
// VERSION 4：新カード7種類（実験 T-4v と同じ規則）、U12（カウンターされた時のカードを既存の置換に通す）、まちぶせどけい。
apply('engine.mjs',[...ENGINE,...ENGINE_WORLD,...ENGINE_TIME,...ENGINE_V4,
 // 画面用：最終ラウンドと、延長した試合の R10 終了時点のそだち（逆転したかを見るため）。保存はコマンドの再生なので形は変わらない。
 ['trial-r10',"fx.cleanup(s,'end',s.turn);if(s.turn==='B')s.round++;","if(s.turn==='B'&&s.round===10&&s.life.final>10){s.life.r10={A:s.players.A.growth,B:s.players.B.growth};log(s,'R10終了時点のそだち：A '+s.life.r10.A+' / B '+s.life.r10.B+'（終了ラウンドR'+s.life.final+'まで続く）');}fx.cleanup(s,'end',s.turn);if(s.turn==='B')s.round++;"],
 ['trial-view',"return {round:s.round,turn:s.turn,actor:actor(s),phase:s.phase,","return {round:s.round,life:{final:s.life.final,r10:s.life.r10??null},turn:s.turn,actor:actor(s),phase:s.phase,"],
]);
apply('effects.mjs',[...effectsPatches(CFG),EFFECTS_TIME[0],...EFFECTS_TIME_U12,...EFFECTS_V4,...EFFECTS_V5]);
apply('cpu-observation.mjs',OBSERVATION);
// VERSION 4：CPU の判断は smart3（既定。新カードがなければ smart2 と同じ）と VERSION 1 の smart を、準備画面で切り替えられる（globalThis.__timeCpu）。
apply('cpu-policy.mjs',[...policyPatches(CFG),...policyTrialV6()]);
const W=Object.fromEntries(Object.entries(timeCards(2,true)).map(([id,c])=>[id,{...c,source:'variable-life-20261031 時のカード試遊版（仮カード・画像は後日）'}]));
src['full-catalog.mjs']+=`\n// ---- variable-life-20261031 time trial: provisional cards ----\nObject.assign(CATALOG,${JSON.stringify(W,null,1)});\n`;
src['rules.mjs']+=timeRules(true)+newRules()+v5Rules();
const NW=Object.fromEntries(Object.entries({...newCards(),...v5Cards()}).map(([id,c])=>[id,{...c,source:'variable-life-20261031 VERSION 4 試遊版（仮カード・画像は後日）'}]));
src['full-catalog.mjs']+=`\n// ---- variable-life-20261031 VERSION 4 trial: provisional new cards ----\nObject.assign(CATALOG,${JSON.stringify(NW,null,1)});\n`;
// VERSION 8（U9）：正式導入候補7枚の本文は短縮版（integration/candidate-cards.mjs と同じ文）。共通ルールは画面上部の説明とルールブックの項（481）。
{const {CANDIDATE_CARDS,unmapId}=await import('../integration/candidate-cards.mjs');const T=Object.fromEntries(Object.values(CANDIDATE_CARDS).map(c=>[unmapId(c.id),c.text]));
 src['full-catalog.mjs']+=`\n// ---- VERSION 8: short texts of the 7 candidates ----\nfor(const [id,text] of Object.entries(${JSON.stringify(T)}))if(CATALOG[id])CATALOG[id]={...CATALOG[id],text};\n`;}
// 戦績：試遊用カード（時のカード・新カード）は 452枚の後ろの番号になるので、保存した戦績を読み直す時の番号の上限を、写しの中だけカードの総数にする
// （正式は 451 まで。VERSION 1〜4 の試遊版では、2戦目以降の戦績が「デッキ辞書が不正です」で保存できなかった。VERSION 5 で修正）。
// VERSION 7：戦績を version 2（カードIDの文字列。integration/records-v2.mjs）で保存する試作。正式の records.mjs（version 1）の写しは
// records-v1.mjs として残し、集計・表示（summarize など）はそのまま使う。試遊版のこれまでの version 1 の戦績は、読むだけで残し、
// 最初の書き込みで version 2 へ移す（integration/RECORDS-V2.md と同じ手順。鍵は試遊版の接頭辞つき）。
{const v2=fs.readFileSync(path.join(HERE,'../integration/records-v2.mjs'),'utf8'),cat=fs.readFileSync(path.join(HERE,'../integration/records-v1-catalog.json'),'utf8').trim();
 src['records-v2.mjs']=patch(v2,"import V1_CATALOG from './records-v1-catalog.json' with {type:'json'};",'const V1_CATALOG='+cat+';','records-v2-inline');}
src['records-adapter.mjs']=`export * from './records-v1.mjs';
import {CARDS,validateDeck} from './engine.mjs';import {CPU_DECK_IDS} from './cpu-decks.mjs';import {createRecords,V1_CATALOG} from './records-v2.mjs';
const R=createRecords({CARDS,validateDeck,CPU_DECK_IDS,v1Catalogs:[V1_CATALOG,Object.keys(CARDS).sort()]});
export const RecordsStore=R.RecordsStore,buildRecord=R.buildRecord,validateRecord=R.validateRecord,RECORDS_FORMAT=2;
`;
apply('records.mjs',[['records-round',"!num(r.round,10)","!num(r.round,12)"],['records-deck-index',"x[2].some(i=>!num(i,451))","x[2].some(i=>!num(i,ids.length-1))"],['records-use-index',"!num(p[0],451)","!num(p[0],ids.length-1)"]]);
// 時計：描画（文字盤・針の色・形・寸法・配置）は変えず、対戦の終了ラウンドを小針に渡すだけ。小針の角度は採用版のまま「終了ラウンド×30度」。
// 採用版の入力チェックは終了ラウンド10〜12だけを受け付けるため、試遊版の写しに限り9も受け付ける（文字盤には IX が印刷済み）。正式採用には別承認が必要。
// CPU 対戦：CPU の戦略デッキにも時のカードを入れるため、試遊版の写しに限り「時のカード入りの戦略デッキ」を試遊用の版として認める
// （正式は現在の一覧か過去の一覧だけを受け付け、それ以外は「CPUデッキ情報が対戦と一致しません」）。
apply('cpu-decks.mjs',[['cpu-deck-trial',"export function cpuDeckVersion(id,cards){","export function cpuDeckVersion(id,cards){if(cards.some(c=>/^X-[TN]-/.test(c)))return 'trial';"]]);
apply('life-clock-view.mjs',[['clock-end',"const state=clockState(view)","const state=clockState(view,{endRound:view.life?.final??10})"]]);
const clockSrc=fs.readFileSync(path.join(CG,'life-clock/clock.mjs'),'utf8'),clockPatched=patch(clockSrc,"if(![10,11,12].includes(s.end))throw Error('end')","if(![9,10,11,12].includes(s.end))throw Error('end')",'clock-accept-9');
// 新カードの画像は後日（本人方針）。カード面は既存の「画像なし」表示になる。
if(ART){const {unmapId}=await import('../integration/candidate-cards.mjs');const add=Object.fromEntries(Object.entries(ART).map(([id,a])=>[unmapId(id),{small:a.small,large:a.large}]));
 src['ui-art.mjs']=patch(src['ui-art.mjs'],'export const CARD_ART = Object.freeze(','const __CARD_ART_452 = (',"ui-art-v9")+`;\nexport const CARD_ART = Object.freeze({...__CARD_ART_452,...${JSON.stringify(add)}});\n`;}
apply('ui-presentation.mjs',[
 ['trial-round',"<small>ROUND ${v.round}/10","<small>ROUND ${v.round}/${v.life?.final??10}${(v.life?.final??10)!==10?`<span class=\"life-badge life-r${v.life.final}\">${v.life.final>10?'延長':'短縮'}</span>`:''}"],
 ['trial-result',"<p>${h(v.result.reason)} · A ${v.result.growth.A} / B ${v.result.growth.B}</p>","<p>${h(v.result.reason)} · A ${v.result.growth.A} / B ${v.result.growth.B}</p>${v.life?.r10?`<p class=\"life-r10\">R10終了時点 · A ${v.life.r10.A} / B ${v.life.r10.B}（延長でR${v.life.final}まで）</p>`:''}"],
]);
// VERSION 2：対戦開始時、各席のデッキに選んだ構成の時のカードを入れる（入れ替える枠は実験と同じ：メイン以外で残り枚数が最も多いカードから）。
// 「おすすめ」は CPU の戦略デッキ別の推奨構成（results/summary-v2.json の selected。人の席・マイデッキでは各1）。
// すでに時のカードがデッキに入っている場合（マイデッキに自分で入れた場合）は、そのまま使う。
const SUMMARY=path.join(HERE,'../results/summary-v2.json'),SUMMARY4=path.join(HERE,'../results/summary-v4.json'),SUMMARY5=path.join(HERE,'../results/summary-v5.json');
const SUMMARY7=path.join(HERE,'../results/summary-v7.json'),SUMMARY8=path.join(HERE,'../results/summary-v8.json');
const REC=(fs.existsSync(SUMMARY8)&&JSON.parse(fs.readFileSync(SUMMARY8,'utf8')).recommended)||(fs.existsSync(SUMMARY7)&&JSON.parse(fs.readFileSync(SUMMARY7,'utf8')).recommended)||(fs.existsSync(SUMMARY5)&&JSON.parse(fs.readFileSync(SUMMARY5,'utf8')).recommended)||(fs.existsSync(SUMMARY4)&&JSON.parse(fs.readFileSync(SUMMARY4,'utf8')).recommended)||(fs.existsSync(SUMMARY)?JSON.parse(fs.readFileSync(SUMMARY,'utf8')).selected??{}:{});
const CONF=Object.fromEntries(Object.entries(CONFIGS).map(([k,v])=>[k,{label:v.label,fill:v.fill}]));
src['app.mjs']=`import {CARDS as __LC} from './engine.mjs';
const __lifeTrial=(()=>{let last=[];const X=/^X-[TN]-/,CONF=${JSON.stringify(CONF)},REC=${JSON.stringify(REC)};
 const pick=seat=>document.getElementById('time-config-'+seat)?.value??'rec';
 const inject=(list,conf)=>{if(list.some(id=>X.test(id)))return {cards:[...list],from:[],conf:'own'};if(conf==='N0')return {cards:[...list],from:[],conf};const left={},order=[];for(const id of list)if(!id.startsWith('M-')){if(!(id in left)){left[id]=0;order.push(id);}left[id]++;}
  const cards=[...list],from=[];for(const to of CONF[conf].fill){const id=[...order].sort((x,y)=>left[y]-left[x]||order.indexOf(x)-order.indexOf(y))[0];const i=cards.lastIndexOf(id);from.push(id);cards[i]=to;left[id]--;}return {cards,from,conf};};
 const save=()=>{try{for(const k of ['time-config-A','time-config-B','time-cpu'])localStorage.setItem('naotocchi-'+k,document.getElementById(k).value);}catch{}};
 const cpuMode=()=>{{const m=document.getElementById('time-cpu')?.value;globalThis.__timeCpu=['v1','v4','v5'].includes(m)?m:'v6';}};
 return {inject(match,cpuSeat=null,cpuDeckId=null){save();cpuMode();const out={};last=['CPU判断 '+({v1:'VERSION 1',v4:'VERSION 4',v5:'VERSION 5'}[globalThis.__timeCpu]??'VERSION 8 統合候補（状況型）')];for(const seat of ['A','B']){let c=pick(seat);if(c==='rec')c=seat===cpuSeat&&REC[cpuDeckId]?REC[cpuDeckId]:'P3';const r=inject(match[seat],c);out[seat]=r.cards;
   last.push(seat+'：'+(r.conf==='own'?'マイデッキの時のカード':r.conf==='N0'?'時のカードなし':CONF[r.conf].label+'（'+r.from.length+'枚入れ替え）'));}return out;},
  cpuMode,note(){return '時のカード試遊版：'+last.join('／');}};})();
try{for(const k of ['time-config-A','time-config-B','time-cpu']){const m=localStorage.getItem('naotocchi-'+k),sel=document.getElementById(k);if(sel&&m&&[...sel.options].some(o=>o.value===m))sel.value=m;}}catch{}
__lifeTrial.cpuMode();document.getElementById('time-cpu')?.addEventListener('change',()=>__lifeTrial.cpuMode());
`+src['app.mjs'];
apply('app.mjs',[
 ['inject',"match={...decks,...(label?{[cpuSeat]:label.cards}:{})};","match=__lifeTrial.inject({...decks,...(label?{[cpuSeat]:label.cards}:{})},solo?cpuSeat:null,label?.id??null);"],
 ['metadata',"myDecks.list().find(d=>d.id===$('select-deck-'+seat).value)","{...myDecks.list().find(d=>d.id===$('select-deck-'+seat).value),cards:[...match[seat]]}"],
 ['notice',"if(label)writePref({last:label.id});persist();}catch","if(label)writePref({last:label.id});persist();message(__lifeTrial.note());}catch"],
]);
src['records-v1.mjs']=src['records.mjs'];src['records.mjs']=src['records-adapter.mjs'];delete src['records-adapter.mjs'];
for(const [f,t] of Object.entries(src))fs.writeFileSync(path.join(STAGE,f),t);
// 下位ディレクトリから読み込まれる正式モジュール（無変更）も写す。
const subMods=['art-pilot/approved-colors.mjs','art-pilot/symbols/attributes.mjs'];(function walk(d){for(const n of fs.readdirSync(path.join(CG,d),{withFileTypes:true})){const f=path.join(d,n.name);if(n.isDirectory())walk(f);else if(f.endsWith('.mjs'))subMods.push(f);}})('life-clock');
for(const f of subMods){const to=path.join(STAGE,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(CG,f),to);}
fs.writeFileSync(path.join(STAGE,'life-clock/clock.mjs'),clockPatched);
const patched=Object.keys(src).filter(f=>!fs.existsSync(path.join(CG,f))||sha(src[f])!==sha(fs.readFileSync(path.join(CG,f),'utf8'))).sort();
if(stageOnly){console.log(JSON.stringify({stage:STAGE,patched}));process.exit(0);}

// 2) JS をまとめる。
execFileSync(ESBUILD,[path.join(STAGE,'app.mjs'),'--bundle','--format=esm','--target=safari16','--charset=utf8','--legal-comments=none',`--outfile=${path.join(OUT,'trial-bundle.js')}`],{stdio:'inherit'});
let bundle=fs.readFileSync(path.join(OUT,'trial-bundle.js'),'utf8');

// 3) 画像：正式の公開許可リストに載っている CARD GAME の画像と、試遊用カードの絵。
const allow=JSON.parse(fs.readFileSync(path.join(REPO,'tools/pages/allowlist.json'),'utf8')).files.filter(f=>f.startsWith('prototypes/card-game/'));
const {CARD_ART}=await import(path.join(CG,'ui-art.mjs'));
const images=allow.filter(f=>/\.(webp|png)$/.test(f)).map(f=>path.relative(CG,path.join(REPO,f)));
let copied=images;
if(largeOnly){
 for(const a of Object.values(CARD_ART)){if(!bundle.includes(a.small))throw Error('画像パスが見つかりません: '+a.small);bundle=bundle.split(JSON.stringify(a.small)).join(JSON.stringify(a.large));}
 copied=images.filter(f=>!f.startsWith('art-delivery/small/'));
}
fs.writeFileSync(path.join(OUT,'trial-bundle.js'),bundle);
for(const f of copied){const to=path.join(OUT,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(CG,f),to);}
if(ART)for(const a of Object.values(ART))for(const size of (largeOnly?['large']:['small','large'])){const to=path.join(OUT,a[size]);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(ART_DIR,a[size]),to);
 if(largeOnly){const b=fs.readFileSync(path.join(OUT,'trial-bundle.js'),'utf8');if(!b.includes(JSON.stringify(a.small)))throw Error('画像パスが見つかりません: '+a.small);fs.writeFileSync(path.join(OUT,'trial-bundle.js'),b.split(JSON.stringify(a.small)).join(JSON.stringify(a.large)));}}

// 4) CSS と HTML。
for(const f of ['style.css','collection.css','learning.css','records.css','life-clock.css'])fs.copyFileSync(path.join(CG,f),path.join(OUT,f));
let html=fs.readFileSync(path.join(CG,'index.html'),'utf8');
const swap=(from,to)=>{if(html.split(from).length!==2)throw Error('index.html の想定箇所がありません: '+from);html=html.replace(from,to);};
const storage=`(()=>{const P=${JSON.stringify(PREFIX)},S=Storage.prototype,{getItem:g,setItem:s,removeItem:r}=S;S.getItem=function(k){return g.call(this,P+k);};S.setItem=function(k,v){return s.call(this,P+k,v);};S.removeItem=function(k){return r.call(this,P+k);};})();`;
const css=`.life-badge{display:inline-block;margin-left:4px;padding:0 5px;border-radius:6px;font-weight:700;color:#fff}.life-r9{background:#b03030}.life-r11{background:#2e9b5f}.life-r12{background:#2f6fd6}`
 +`.life-r10{margin-top:4px;font-size:.9em;color:#5a4a33}.life-trial-note{margin:8px 0 12px;padding:10px 12px;border-radius:10px;background:#fff4e0;border:2px solid #d64545;color:#3d3326;line-height:1.6;font-size:14px}`
 +`.life-trial-note select{max-width:100%;min-height:44px;font-size:14px;margin:4px 0}.life-trial-note strong{color:#b03030}.life-trial-note .c10{color:#d64545;font-weight:700}.life-trial-note .c11{color:#2e9b5f;font-weight:700}.life-trial-note .c12{color:#2f6fd6;font-weight:700}`;
const OPTS=`<option value="rec">おすすめ＝正式導入候補（CPU は標準構成 P3、人も P3：時のカード各1＋はやじまい・ながいきのひけつ・おもいでのしゃしん）</option>`+Object.entries(CONFIGS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')+'<option value="N0">時のカードなし</option>';
const note=`<div id="life-trial-note" class="life-trial-note"><strong>試遊版 VERSION 8：正式導入候補7枚（時のカード IX・X・XI・XII＋はやじまい・ながいきのひけつ・おもいでのしゃしん）</strong><br>ふつうは<span class="c10">R10</span>で終わります。時のカード（せかい・時2・同名3枚まで）を自分の番にふつうのセカイと同じように出すと、終了ラウンドが9・10・11・12のどれかになります（両者共通。現在のラウンドより前にはできない）。<br><b>特殊カウンター：</b>相手が時のカードを出したら、応答のときに手札の時のカードで「カウンター」できます（時2・何回でも）。最後に出したカードだけが成立し、それまでの時のカードは捨て札へ。終了ラウンドはすべての応答が終わってから決まり、人生の時計の下中央の小針がそのラウンドを指します。<br><b>正式導入候補（絵は Astra が制作予定・今は絵なし）：</b>はやじまい・ながいきのひけつ・おもいでのしゃしん。「おすすめ」でこの7枚が入ります。見送ったカード（おいわいのつる・まちぶせどけい・いなかのおみやげ・ちょっとまった）も、比較のため下の構成で選べます（正式導入の候補ではありません）。<br><b>戦績：</b>この試遊版は、戦績を version 2（カードIDの文字列）で保存します（試作）。<br><label for="time-config-A">Aのデッキの時のカード・新カード</label> <select id="time-config-A">${OPTS}</select><br><label for="time-config-B">Bのデッキの時のカード・新カード</label> <select id="time-config-B">${OPTS}</select><br><label for="time-cpu">CPUの判断</label> <select id="time-cpu"><option value="v6">VERSION 8 統合候補（状況型：ながいきを状況に応じて使う。VERSION 6 と同じ）</option><option value="v5">VERSION 5（ながいきを温存・しゃしん・つるの効果も考える）</option><option value="v4">VERSION 4（勝率見込み・新カードの使い方も考える）</option><option value="v1">VERSION 1（終盤の点差だけで判断）</option></select><br>選んだ枚数だけ、デッキのカード（メイン以外で枚数の多いもの）と入れ替えます。マイデッキにすでに時のカードを入れている場合は、そのまま使います。新カードの絵はまだありません。この試遊版の保存・戦績・マイデッキは、正式版・ほかの試遊版とは別です。</div>`;
swap('<title>なおとっち CARD GAME</title>','<title>CARD GAME 時のカード 試遊 V8</title>');
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
fs.writeFileSync(path.join(OUT,'home.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>なおとっち（試遊用の仮画面）</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff8e7;color:#3d3326;font-family:system-ui,sans-serif;padding:16px;box-sizing:border-box}main{max-width:420px;text-align:center}h1{font-size:1.4rem}p{line-height:1.7}a{display:inline-flex;align-items:center;min-height:44px;padding:10px 18px;border-radius:12px;background:#315e62;color:#fff;text-decoration:none;font-weight:700}</style></head><body><main><h1>なおとっち</h1><p>（試遊用の仮画面）<br>本番では、ここが通常のなおとっち育成画面です。</p><p><a id="open-card-game" href="./">CARD GAME 時のカード 試遊 V6をひらく</a></p></main></body></html>\n`);
fs.rmSync(STAGE,{recursive:true,force:true});
if(JSON.stringify(officialSha())!==JSON.stringify(before))throw Error('正式ファイルが変わりました');
const files=[];(function walk(d){for(const n of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,n.name);if(n.isDirectory())walk(p);else files.push(path.relative(OUT,p));}})(OUT);
console.log(JSON.stringify({out:OUT,files:files.length,bytes:files.reduce((s,f)=>s+fs.statSync(path.join(OUT,f)).size,0),largeOnly,artifact,patched}));
