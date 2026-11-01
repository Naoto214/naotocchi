import {render,sample,overlapCases,values} from './clock-v5.mjs';
const $=s=>document.querySelector(s),state={...sample};let variant='A';
const names={A:'A · 淡い3色',B:'B · 共通青銀',C:'C · VERSION 4'};
const descriptions={A:'ローズ銀・翡翠銀・シャンパン金。役割をやさしい背景色で伝える第一候補。',B:'3面を共通の青銀に。針とリングで役割を伝え、全体の統一感を優先。',C:'現行C1。青文字盤・小文字盤・針を変更しない比較基準。'};
const fields=[['round','現在ラウンド',12,1,'gold'],['firstTime','先攻の残り時',12,1,'red'],['secondTime','後攻の残り時',12,1,'green'],['firstGrowth','先攻のそだち',100,5,'red'],['secondGrowth','後攻のそだち',100,5,'green']];
$('#sliders').innerHTML=fields.map(([id,label,max,step,tone])=>`<label for="${id}" data-tone="${tone}">${label}<output id="${id}-out"></output><input id="${id}" type="range" min="0" max="${max}" step="${step}" aria-label="${label}"></label>`).join('');
$('#presets').innerHTML=overlapCases.map(c=>`<button data-preset="${c.id}">${c.label}</button>`).join('');
function update(){
 $('#comparison-grid').innerHTML=['A','B','C'].map(v=>`<figure data-comparison="${v}"><div class="art">${render(state,{variant:v})}</div><h3>${names[v]}</h3><p>${descriptions[v]}</p></figure>`).join('');
 $('#live').innerHTML=render(state,{variant});
 $('#details').innerHTML=['A','B','C'].map(v=>`<div class="detail-row"><h3>${names[v]}</h3><div class="subdetails">${[['first','先攻 · そだち'],['second','後攻 · そだち'],['end','共通 · ゴール']].map(([crop,label])=>`<figure>${render(state,{variant:v,crop})}<figcaption>${label}</figcaption></figure>`).join('')}</div></div>`).join('');
 for(const[k]of fields){$('#'+k).value=state[k];$('#'+k+'-out').value=state[k];}$('#end').value=state.end;
 const labels=[...fields.map(x=>x[1]),'終了ラウンド'];$('#values').innerHTML=values(state).map((n,i)=>`<span>${labels[i]} ${n}${i===0&&n===0?'（準備）':i===0&&n===12?'（拡張候補）':i>0&&i<3&&n===0?'（0）':i>0&&i<3&&n===12?'（最大）':i===3||i===4?n===100?'（100到達）':n===0?'（0）':'':''}</span>`).join('');
 for(const b of document.querySelectorAll('[data-variant]'))b.setAttribute('aria-pressed',String(b.dataset.variant===variant));
}
for(const[k]of fields)$('#'+k).oninput=e=>{state[k]=+e.target.value;update();};$('#end').onchange=e=>{state.end=+e.target.value;update();};
for(const b of document.querySelectorAll('[data-variant]'))b.onclick=()=>{variant=b.dataset.variant;update();};
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>{Object.assign(state,overlapCases.find(c=>c.id===b.dataset.preset).state);update();};
$('#reset').onclick=()=>{Object.assign(state,sample);update();};$('#endpoints').onclick=()=>{Object.assign(state,{round:0,firstTime:0,secondTime:12,firstGrowth:0,secondGrowth:100});update();};update();
