// カード詳細の比較試遊版の追加UI。正式ゲーム（app.mjs）より先に読み込む。
// - 表示の切り替え（新UI = 大型カード＋補足付きボタン / 現行 = 正式採用中の改善A案）: <html data-detail-ui="old">
//   build-trial.mjs が、詳細を描く1か所だけをこの属性で切り替えるようにしている（正式ファイルは変更しない）。
// - 比較用シナリオの読み込み（正式の「保存した対戦に戻る」と同じ復帰処理を使う）
// ゲーム処理・保存形式・カード本文には触れない。保存領域は trial-storage.js で本番と分けている。
import BASE from '../detail-ui-ab-20261028/scenarios.json' with {type:'json'};
import EXTRA from './scenarios-extra.json' with {type:'json'};

const UIS=['new','old'],NAMES={new:'新UI',old:'現行'},PREF='detail-ui';
const root=document.documentElement,params=new URLSearchParams(location.search);
const read=()=>{try{const v=localStorage.getItem(PREF);return UIS.includes(v)?v:'new';}catch{return 'new';}};
let ui=UIS.includes(params.get('ui'))?params.get('ui'):read();
let last=null; // 直前に詳細を開いたカード（切り替え時に同じカードを開き直す）

function apply(next){
 ui=next;
 if(ui==='old')root.dataset.detailUi='old';else delete root.dataset.detailUi;
 try{localStorage.setItem(PREF,ui);}catch{/* 表示の好みだけなので保存できなくても続行 */}
 for(const b of document.querySelectorAll('[data-trial-ui]'))b.setAttribute('aria-pressed',String(b.dataset.trialUi===ui));
}
// 詳細を開いたカードを覚える（盤面・手札のどちらからでも）
document.addEventListener('click',e=>{const n=e.target.closest?.('#game [data-inspect],#game [data-browse]');if(n)last={inspect:n.dataset.inspect,browse:n.dataset.browse};},true);
function reopen(){
 const d=document.getElementById('card-dialog');d.querySelector('[data-close]')?.click();
 if(!last)return;const sel=last.inspect?`#game [data-inspect="${CSS.escape(last.inspect)}"]`:`#game [data-browse="${CSS.escape(last.browse)}"]`;
 setTimeout(()=>document.querySelector(sel)?.click(),60);
}
// 詳細が開くたびに、ツールバーへ切り替えボタンを足す（正式の詳細マークアップは変えない）
function decorate(){
 const d=document.getElementById('card-dialog');if(!d.open||!d.classList.contains('card-detail'))return;
 const bar=d.querySelector('.detail-toolbar');if(!bar||bar.querySelector('[data-trial-cycle]'))return;
 const b=document.createElement('button');b.type='button';b.className='trial-cycle';b.dataset.trialCycle='';
 b.setAttribute('aria-label','詳細表示を切り替える（新UI・現行）');b.textContent=NAMES[ui];
 b.addEventListener('click',()=>{apply(ui==='new'?'old':'new');reopen();});
 bar.querySelector('[data-close]')?.before(b);
}
new MutationObserver(decorate).observe(document.getElementById('card-dialog'),{childList:true,attributes:true,attributeFilter:['open','class']});

const KEYS={hotseat:'naotocchi-hotseat-v1',cpu:'naotocchi-cpu-match-v1'};
const SCENES=[...BASE.scenarios,...EXTRA.scenarios].filter(s=>!s.missing);
function load(key,mode){
 const s=SCENES.find(x=>x.key===key);if(!s)return;
 try{localStorage.setItem(KEYS[mode],s[mode]);}catch{return;}
 const select=document.getElementById('match-mode');select.value=mode;select.dispatchEvent(new Event('change'));
 document.getElementById('restore').click();
}
const hint={choice:'手札のカード（とかい・まねっこサル・ヒトデ①など）',normal:'手札のまねっこサル・とかい',response:'手札のラッキーコイン',target:'手札のサングラスのカメレオン（3択）',many:'手札のおべんとうばこ（4つの装備先）',declare:'手札のヒット&ブロー（宣言）',chain:'手札のはじめてのデート'};
const panel=document.createElement('section');panel.id='trial-panel';panel.className='trial-panel';panel.setAttribute('aria-labelledby','trial-title');
panel.innerHTML=`<h2 id="trial-title">カード詳細 比較試遊版</h2>
<p>対戦中にカードを押して開く詳細画面を比べるための、本人用の版です。正式版とは保存領域が分かれています。</p>
<div class="trial-variants" role="group" aria-label="詳細画面">${UIS.map(v=>`<button type="button" data-trial-ui="${v}" aria-pressed="false">${NAMES[v]}</button>`).join('')}</div>
<p class="trial-note"><b>新UI</b> 正式カードを大きく表示し、カード外の名前・本文・ルール案内を省いた版。操作はボタンに集め、必要な時だけボタン内に「※」の補足。カードをダブルタップすると拡大／縮小（ピンチも可）。<br><b>現行</b> いま正式に公開している表示（改善A案）。<br>詳細を開いたまま、右上のボタンで同じカードを切り替えて見られます。</p>
<h3>比較用の場面から始める</h3>
<div class="trial-scenarios">${SCENES.map(s=>`<div><span>${s.label}<br><small>${hint[s.key]??''}</small></span><button type="button" data-trial-load="${s.key}" data-mode="cpu">ひとり（CPU）</button><button type="button" data-trial-load="${s.key}" data-mode="hotseat">ふたり</button></div>`).join('')}</div>`;
document.getElementById('welcome').prepend(panel);
panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.trialUi)apply(b.dataset.trialUi);else if(b.dataset.trialLoad)load(b.dataset.trialLoad,b.dataset.mode);});
apply(ui);
