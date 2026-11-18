import {titleInfo as baselineTitle} from './base-title.mjs';
import {titleInfo,escapeHTML as h} from './title.mjs';
import {bodyTint} from './presentation.mjs';
import {classificationLabel,auxiliaryName} from './labels.mjs';
import {alignCostDigits} from './cost-alignment.mjs';
import {alignStats,fitRules} from './layout.mjs';
const $=s=>document.querySelector(s),labels={main:'メイン',companion:'なかま',partner:'こいびと',world:'セカイ',play:'あそび',item:'あいてむ',event:'できごと'};
const baseline={aux:'current',stats:'current',effects:'current'},candidate={aux:'refined',stats:'refined',effects:'refined'};
let settings={...candidate,rare:'show',body:'cream',name:'original'},rubyPolicy='detail',view='aux',data,cards,selected='M-man-05',page=0,modalCard=null,modalSettings=null;
const limit=36;
const leaf='<path d="M6 24Q5 9 18 5M7 17Q3 13 6 10Q10 12 7 17M10 11Q10 6 15 6Q15 10 10 11M7 21Q12 16 13 19Q12 22 7 21"/>';
const ornament=`<svg class="leaf-corners" viewBox="0 0 100 150" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".38">${leaf}<g transform="translate(100 0) scale(-1 1)">${leaf}</g><g transform="translate(0 150) scale(1 -1)">${leaf}</g><g transform="translate(100 150) scale(-1 -1)">${leaf}</g><path d="M46 145h8M50 143l1 2-1 2-1-2Z"/></g></svg>`;
const config=o=>h(JSON.stringify(o));
const titleFor=(c,o,compact=false)=>titleInfo(c,o.name,{compact,rubyPolicy});
function bodyCopy(c){return `${c.married?'<strong>こいびとのとき</strong>':''}<p>${h(c.text)}</p>${c.married?`<strong class="married-label">♥ 結婚したら</strong><p>${h(c.married)}</p>`:''}`;}
function stats(c,o){if(c.type!=='main')return '';if(o.stats==='current')return `<div class="stats"><span>ちから <b>${c.power}</b></span><span>ちえ <b>${c.wisdom}</b></span></div>`;
 return `<div class="stats">${[['ちから',c.power],['ちえ',c.wisdom]].map(([label,n])=>`<div class="stat-cell" aria-label="${label} ${n}"><span class="stat-label">${label}</span><span class="stat-value"><span class="stat-number"><span class="stat-glyph">${n}</span><i class="stat-baseline" aria-hidden="true"></i></span></span></div>`).join('')}</div>`;}
function front(c,o=settings,large=false){const t=titleFor(c,o,!large),main=c.type==='main';return `<article class="face face-B face-B3 face-B3-A v3-candidate face-v4 effects-refined face-v5 face-v6 cost-stable face-v7 field-auto body-${o.body} aux-${o.aux} stats-${o.stats} copy-${o.effects}${main?' has-stats':''}" data-card-id="${h(c.id)}" data-config="${config(o)}" data-ruby-visible="${!!t.showRuby}" style="--card-color:${c.color};--body-tint:${bodyTint(c.color)};--mark-ink:${c.markInk??'#353024'};--title-size:${t.size}cqw;--title-width:${t.width??78}cqw" aria-label="${h(c.name)}">
${ornament}<header class="card-header"><div class="classification">${c.mark}<span>${h(classificationLabel(c))}</span></div><span class="cost" aria-label="通常時コスト ${main?c.stage:c.cost}"><span class="cost-number"><span class="cost-glyph">${main?c.stage:c.cost}</span><i class="cost-baseline" aria-hidden="true"></i></span></span><h3 class="card-title">${t.html}</h3>${main&&o.aux!=='hide'?`<p class="species">${h(auxiliaryName(c))}</p>`:''}</header>
<div class="art-window"><img src="${large?c.large:c.image}" alt="${h(c.name)}の正式イラスト" loading="lazy" decoding="async" draggable="false"></div>${stats(c,o)}
<div class="rules${c.text.length+(c.married?.length??0)>140?' long':''}">${o.effects==='refined'?`<div class="rules-content">${bodyCopy(c)}</div><span class="rules-notice" data-readmore hidden>冒頭 · 全文は拡大 ↗</span>`:bodyCopy(c)}</div><footer class="card-foot"><span class="signature">NAOTOCCHI</span>${c.rare&&o.rare==='show'?'<span class="rarity" role="img" aria-label="レア・同名1枚まで">◆</span>':''}</footer></article>`;}
function back(){return '<div class="reverse"><img src="assets/back.png" alt="正式裏面・青地に淡い金の双葉と植物紋章" loading="lazy" draggable="false"></div>';}
function shell(c,o=settings,{flip=true,reverse=false,large=false}={}){return `<div class="card-shell${reverse?' is-flipped':''}">${flip?`<button class="flip-button" data-flip aria-label="${h(c.name)}・${reverse?'表':'裏'}に返す" aria-pressed="${reverse}"><div class="card-turn">`:''}${front(c,o,large)}${flip?back()+'</div></button>':''}</div>`;}
function panel(c,label,o=settings,{reverse=false}={}){return `<article class="design-panel"><h3 class="design-label">${h(label)}</h3>${shell(c,o,{large:true,reverse})}<p class="panel-caption">${h(label)}</p><button class="text-button" data-detail="${c.id}" data-config="${config(o)}">カードを拡大 ↗</button></article>`;}
function stage(){const c=cards.get(selected),o=settings;let html='';
 if(view==='aux')html=c.type==='main'?`<div class="design-stage three">${panel(c,'A · V6の補助名',{...o,aux:'current'})}${panel(c,'B · 名前の直下に',{...o,aux:'refined'})}${panel(c,'C · 補助名なし',{...o,aux:'hide'})}</div>`:`<p class="note">補助名はメインカードの比較です。このカードの分類・名前は維持します。</p><div class="design-stage">${panel(c,'選択中の表示',o)}</div>`;
 else if(view==='layout')html=`<div class="design-stage">${panel(c,'VERSION 6',{...o,...baseline})}${panel(c,'VERSION 7',{...o,...candidate})}</div>`;
 else if(view==='stats')html=c.type==='main'?`<div class="design-stage">${panel(c,'A · V6の能力値',{...o,stats:'current'})}${panel(c,'B · 左右対称・字形補正',{...o,stats:'refined'})}</div>`:'<p class="note">能力値の比較はメインカードを選択してください。</p>';
 else if(view==='effects')html=`<p class="note">左はV6のスクロール表示。右は全文が入る場合は全文、収まらない場合は冒頭を明示します。どちらも拡大先で原文全文を確認できます。</p><div class="design-stage">${panel(c,'A · V6の本文欄',{...o,effects:'current'})}${panel(c,'B · 余白と全文案内',{...o,effects:'refined'})}</div>`;
 else if(view==='rare')html=`<p class="note">${c.rare?'このカードはレア・同名1枚までです。':'このカードは通常・同名3枚までです。通常カードには両案ともマークはありません。'} マークを隠しても制限は変わりません。</p><div class="design-stage">${panel(c,'A · レアマークを表示',{...o,rare:'show'})}${panel(c,'B · カード面では非表示',{...o,rare:'hide'})}</div>`;
 else if(view==='pair')html=`<div class="design-stage pair-stage">${panel(c,'選択中の表面',o)}${panel(c,'正式の裏面',o,{reverse:true})}</div>`;
 else html=`<div class="battle-stage"><p>表示確認用 · 110pxの手札（狭い画面では幅に合わせます）</p><div class="battle-line">${[c,cards.get('I-naoto_lantern'),cards.get('W-time-xii')].map(c=>`<button class="grid-open" data-detail="${c.id}" data-config="${config(o)}" aria-label="${h(c.name)}を拡大">${shell(c,o,{flip:false})}</button>`).join('')}</div></div>`;
 $('#stage').innerHTML=html;$('#stage-hint').textContent=view==='battle'?'タップで拡大。対戦処理・保存は行いません。':'カードをタップして表裏を反転。「カードを拡大」または本文の案内から全文へ。';
 $('#name-study').innerHTML=['original','kanji','ruby'].map((name,i)=>panel(c,['A · 正式名称','B · 自然な漢字','C · 必要なふりがな'][i],{...o,name})).join('');
}
function filtered(){let arr=data.cards,filter=$('#filter').value,q=$('#search').value.trim().toLowerCase();
 if(filter==='palette')arr=data.palette.map(id=>cards.get(id));else if(filter==='stats')arr=[...new Set(Array.from({length:11},(_,n)=>data.cards.find(c=>c.type==='main'&&(c.power===n||c.wisdom===n))?.id).filter(Boolean))].map(id=>cards.get(id));
 else if(filter==='rare')arr=arr.filter(c=>c.rare);else if(filter==='nine')arr=data.nine.map(id=>cards.get(id));else if(filter.startsWith('attr:'))arr=arr.filter(c=>c.attribute===filter.slice(5));
 else if(filter==='short-text')arr=[...arr].sort((a,b)=>(a.text.length+(a.married?.length??0))-(b.text.length+(b.married?.length??0))).slice(0,24);
 else if(filter==='representative')arr=data.representatives.map(id=>cards.get(id));else if(filter==='additional')arr=arr.filter(c=>c.additional);else if(filter==='long-title')arr=arr.filter(c=>titleInfo(c,'original').exception).sort((a,b)=>b.title.length-a.title.length);
 else if(filter==='long-text')arr=[...arr].sort((a,b)=>(b.text.length+(b.married?.length??0))-(a.text.length+(a.married?.length??0))).slice(0,24);else if(filter!=='all')arr=arr.filter(c=>c.type===filter);
 if(q)arr=arr.filter(c=>(c.title+c.name+c.id+baselineTitle(c,'kanji').text).toLowerCase().includes(q));return arr;
}
function gallery(){const arr=filtered();$('#count').textContent=`${arr.length}枚 · ${arr.length?page*limit+1:0}–${Math.min((page+1)*limit,arr.length)}`;
 $('#grid').innerHTML=arr.slice(page*limit,(page+1)*limit).map(c=>`<article class="grid-item"><button class="grid-open" data-detail="${c.id}" data-config="${config(settings)}" aria-label="${h(c.name)}を拡大">${shell(c,settings,{flip:false})}<span class="grid-title">${h(titleFor(c,settings,true).text)}</span><span class="grid-meta">${labels[c.type]}${c.attribute?' · '+h(c.attribute):''} · ${c.rare?'レア · 上限1枚':'通常 · 上限3枚'}${c.additional?' · 追加候補':''}</span></button></article>`).join('')||'<p class="note">該当するカードはありません。</p>';
 $('#more').hidden=arr.length<=(page+1)*limit;$('#previous').hidden=page===0;
}
function detail(id,o=settings){modalCard=cards.get(id);modalSettings={...o};const c=modalCard,t=titleFor(c,o);$('#detail-title').textContent=c.name;
 $('#detail-body').innerHTML=`<div class="detail-layout"><div class="detail-card"><p class="note">補助名：${{current:'V6',refined:'直下',hide:'なし'}[o.aux]} ／ 能力値：${o.stats==='refined'?'中央補正':'V6'} ／ 本文：${o.effects==='refined'?'全文案内':'V6'}</p>${shell(c,o,{large:true})}<p class="detail-flip note">タップで表裏を反転</p></div><section class="detail-copy"><h3>${t.html}</h3><p class="canonical">正式名称：${h(c.name)}</p><h4>${c.married?'こいびとのとき':'効果全文'}</h4><p class="full-effect">${h(c.text)}</p>${c.married?`<h4>♥ 結婚したら</h4><p class="full-effect">${h(c.married)}</p>`:''}<p class="metadata">${labels[c.type]} · 通常時コスト ${c.type==='main'?c.stage:c.cost}<br>レアリティ：${c.rare?'レア':'通常'} ／ 同名${c.rare?1:3}枚まで<br>${h(c.id)}${c.type==='main'?`<br>ちから ${c.power} ／ ちえ ${c.wisdom}`:''}<br>カード面のマークを隠しても、上記の判定・制限は変わりません。</p><button class="outline-button" data-compare="${c.id}">このカードを比較する</button></section></div>`;
 if(!$('#detail').open)$('#detail').showModal();
}
function refresh(){stage();gallery();}
let scheduled=false;function scheduleLayout(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;fitRules();alignCostDigits();alignStats();});}
const observer=new MutationObserver(scheduleLayout);for(const id of ['#stage','#grid','#name-study','#detail-body'])observer.observe($(id),{childList:true});
const sizes=new ResizeObserver(scheduleLayout);sizes.observe(document.documentElement);sizes.observe($('#detail-body'));window.addEventListener('resize',scheduleLayout);document.fonts.ready.then(scheduleLayout);document.fonts.addEventListener?.('loadingdone',scheduleLayout);document.addEventListener('transitionend',e=>{if(e.target.matches('.card-turn'))scheduleLayout();});
function syncControls(){for(const key of ['aux','stats','effects','rare','body','name'])$('#'+key+'-mode').value=settings[key];document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',Object.entries(b.dataset.preset==='current'?baseline:candidate).every(([k,v])=>settings[k]===v)));}
document.addEventListener('click',e=>{
 const read=e.target.closest('[data-readmore]');if(read){const face=read.closest('.face');detail(face.dataset.cardId,JSON.parse(face.dataset.config));return;}
 const flip=e.target.closest('[data-flip]');if(flip){const value=flip.closest('.card-shell').classList.toggle('is-flipped');flip.setAttribute('aria-pressed',value);flip.setAttribute('aria-label',value?'表に返す':'裏に返す');if(matchMedia('(prefers-reduced-motion: reduce)').matches)scheduleLayout();return;}
 const det=e.target.closest('[data-detail]');if(det){detail(det.dataset.detail,det.dataset.config?JSON.parse(det.dataset.config):settings);return;}
 const preset=e.target.closest('[data-preset]');if(preset){settings={...settings,...(preset.dataset.preset==='current'?baseline:candidate)};syncControls();refresh();return;}
 const v=e.target.closest('[data-view]');if(v){view=v.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b===v));stage();return;}
 const cmp=e.target.closest('[data-compare]');if(cmp){selected=cmp.dataset.compare;$('#card-select').value=selected;$('#detail').close();stage();$('.workbench').scrollIntoView({behavior:'smooth'});}
});
for(const key of ['aux','stats','effects','rare','body','name'])$('#'+key+'-mode').addEventListener('change',e=>{settings[key]=e.target.value;syncControls();refresh();});
$('#card-select').addEventListener('change',e=>{selected=e.target.value;stage();});$('#ruby-policy').addEventListener('change',e=>{rubyPolicy=e.target.checked?'detail':'all';refresh();});$('#hide-labels').addEventListener('change',e=>$('.collection').classList.toggle('hide-labels',e.target.checked));
for(const field of ['#filter','#search'])$(field).addEventListener(field==='#search'?'input':'change',()=>{page=0;gallery();});for(const [id,delta]of [['#more',1],['#previous',-1]])$(id).addEventListener('click',()=>{page=Math.max(0,page+delta);gallery();$('.collection-controls').scrollIntoView({block:'start'});});
$('#close').addEventListener('click',()=>$('#detail').close());$('#detail').addEventListener('click',e=>{if(e.target===$('#detail'))$('#detail').close();});
try{const response=await fetch('data.json');if(!response.ok)throw Error('カードデータを取得できません');data=await response.json();cards=new Map(data.cards.map(c=>[c.id,c]));$('#card-select').innerHTML=data.cards.map(c=>`<option value="${c.id}">${labels[c.type]}｜${h(c.title)}</option>`).join('');$('#card-select').value=selected;syncControls();refresh();}
catch(e){$('#stage').innerHTML=`<p class="error">${h(e.message)}。ページを再読み込みしてください。</p>`;console.error(e);}
