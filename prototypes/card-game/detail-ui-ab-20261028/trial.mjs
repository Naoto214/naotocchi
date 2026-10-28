// 詳細表示 A/B 比較試遊版の追加UI。正式ゲーム（app.mjs）より先に読み込む。
// - 表示案の切り替え（A案 / B案 / 現行）: <html data-detail-variant>
// - B案の「続き ↓」表示（本文枠に続きがある時だけ）
// - 比較用シナリオの読み込み（正式の「保存した対戦に戻る」と同じ復帰処理を使う）
// ゲーム処理・保存形式・カード本文には触れない。保存領域は trial-storage.js で本番と分けている。
import SCENARIOS from './scenarios.json' with {type:'json'};

const VARIANTS=['a','b','current'],NAMES={a:'A案',b:'B案',current:'現行'},PREF='detail-variant';
const root=document.documentElement;
const read=()=>{try{const v=localStorage.getItem(PREF);return VARIANTS.includes(v)?v:'a';}catch{return 'a';}};
const params=new URLSearchParams(location.search);
let variant=VARIANTS.includes(params.get('variant'))?params.get('variant'):read();

function apply(next,{resetScroll=false}={}){
 variant=next;
 if(variant==='current')delete root.dataset.detailVariant;else root.dataset.detailVariant=variant;
 try{localStorage.setItem(PREF,variant);}catch{/* 表示の好みだけなので保存できなくても続行 */}
 for(const b of document.querySelectorAll('[data-trial-variant]'))b.setAttribute('aria-pressed',String(b.dataset.trialVariant===variant));
 const t=document.querySelector('#card-dialog [data-trial-cycle]');if(t)t.textContent=NAMES[variant];
 const d=document.getElementById('card-dialog');
 if(resetScroll&&d)for(const n of d.querySelectorAll('.detail-layout,.detail-copy,.effect-scroll'))n.scrollTop=0;
 updateMore();
}

// B案: 本文枠に読み残しがある時だけ data-more を付ける。
function updateMore(){
 const s=document.querySelector('#card-dialog.card-detail .effect-scroll');if(!s)return;
 const more=variant==='b'&&s.scrollHeight-s.clientHeight-s.scrollTop>2;
 s.toggleAttribute('data-more',more);
}

// 詳細が開くたびに、ツールバーへ切り替えボタンと「続き」表示を足す（正式の詳細マークアップは変えない）。
function decorate(){
 const d=document.getElementById('card-dialog');
 if(!d.open||!d.classList.contains('card-detail'))return;
 const bar=d.querySelector('.detail-toolbar');
 if(bar&&!bar.querySelector('[data-trial-cycle]')){
  const b=document.createElement('button');b.type='button';b.className='trial-cycle';b.dataset.trialCycle='';
  b.setAttribute('aria-label','詳細表示の比較案を切り替える（A案・B案・現行）');b.textContent=NAMES[variant];
  b.addEventListener('click',()=>apply(VARIANTS[(VARIANTS.indexOf(variant)+1)%VARIANTS.length],{resetScroll:true}));
  bar.querySelector('[data-close]')?.before(b);
 }
 const s=d.querySelector('.effect-scroll');
 if(s&&!s.dataset.trialMore){
  s.dataset.trialMore='1';
  const hint=document.createElement('p');hint.className='effect-more';hint.setAttribute('aria-hidden','true');hint.textContent='続き ↓';
  s.after(hint);s.addEventListener('scroll',updateMore,{passive:true});
 }
 requestAnimationFrame(updateMore);
}
const dialog=document.getElementById('card-dialog');
new MutationObserver(decorate).observe(dialog,{childList:true,attributes:true,attributeFilter:['open','class']});
addEventListener('resize',()=>requestAnimationFrame(updateMore));
visualViewport?.addEventListener('resize',()=>requestAnimationFrame(updateMore));
document.fonts?.ready.then(updateMore);

// 開始画面の案内と、比較用シナリオ。
const KEYS={hotseat:'naotocchi-hotseat-v1',cpu:'naotocchi-cpu-match-v1'};
function load(key,mode){
 const s=SCENARIOS.scenarios.find(x=>x.key===key);if(!s||s.missing)return;
 try{localStorage.setItem(KEYS[mode],s[mode]);}catch{return;}
 const select=document.getElementById('match-mode');select.value=mode;select.dispatchEvent(new Event('change'));
 document.getElementById('restore').click();
}
const panel=document.createElement('section');panel.id='trial-panel';panel.className='trial-panel';panel.setAttribute('aria-labelledby','trial-title');
panel.innerHTML=`<h2 id="trial-title">詳細表示 A/B 比較試遊版</h2>
<p>対戦中のカード詳細（カードを押して開く画面）の表示案を比べるための本人用の版です。正式版とは保存領域が分かれています。</p>
<div class="trial-variants" role="group" aria-label="詳細表示の案">${VARIANTS.map(v=>`<button type="button" data-trial-variant="${v}" aria-pressed="false">${NAMES[v]}</button>`).join('')}</div>
<p class="trial-note"><b>A案</b> 本文を枠に入れず、詳細全体を1本でスクロール。操作ボタンは下端に固定。<br><b>B案</b> 本文枠のスクロールは残し、枠を広げて「続き ↓」を表示。<br>対戦中も詳細の右上のボタン（A案／B案／現行）で切り替えられます。</p>
<h3>比較用の場面から始める</h3>
<p class="trial-note">手札に長文カード（${SCENARIOS.long.map(id=>SCENARIOS.names[id]).join('・')}）と短文カード（${SCENARIOS.short.map(id=>SCENARIOS.names[id]).join('・')}）が入った比較用デッキです。手札のカードを押して詳細を開いてください。</p>
<div class="trial-scenarios">${SCENARIOS.scenarios.filter(s=>!s.missing).map(s=>`<div><span>${s.label}</span><button type="button" data-trial-load="${s.key}" data-mode="cpu">ひとり（CPU）</button><button type="button" data-trial-load="${s.key}" data-mode="hotseat">ふたり</button></div>`).join('')}</div>`;
document.getElementById('welcome').prepend(panel);
panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.trialVariant)apply(b.dataset.trialVariant);
 else if(b.dataset.trialLoad)load(b.dataset.trialLoad,b.dataset.mode);
});
apply(variant);
