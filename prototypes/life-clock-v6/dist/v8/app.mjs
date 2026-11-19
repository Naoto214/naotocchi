import {render,sample,variants,overlapCases,values} from './clock-v8.mjs';
const $=s=>document.querySelector(s),state={...sample};let variant='B';
const fields=[['round','現在ラウンド',12,1],['firstTime','先攻の残り時',12,1],['secondTime','後攻の残り時',12,1],['firstGrowth','先攻のそだち',100,5],['secondGrowth','後攻のそだち',100,5]];
$('#choices').innerHTML=Object.entries(variants).map(([id,v])=>`<button data-variant="${id}">${v.name}</button>`).join('');
$('#sliders').innerHTML=fields.map(([id,label,max,step])=>`<label for="${id}">${label}<output id="${id}-out"></output><input id="${id}" type="range" min="0" max="${max}" step="${step}"></label>`).join('');
$('#presets').innerHTML=overlapCases.map(c=>`<button data-preset="${c.id}">${c.label}</button>`).join('');
const fig=(v,opts={})=>`<figure><div class="art">${render(state,{variant:v,sameScale:true,...opts})}</div><figcaption>${variants[v].name}</figcaption></figure>`;
function update(){
 $('#live').innerHTML=render(state,{variant,sameScale:true});$('#selected').textContent=variants[variant].name;
 $('#description').textContent=variant==='reference'?'保護したVERSION 7・細い光・標準。':'深いローズガーネット、エメラルド、アンティークゴールド。色と形は共通、金属の反射・陰影の強さを比較します。';
 $('#pair').innerHTML=fig('reference')+fig(variant);
 $('#bezels').innerHTML=['A','B','C'].map(v=>fig(v,{sameScale:true})).join('');
 $('#hands-grid').innerHTML=['reference','A','B','C'].map(v=>fig(v,{crop:'hands'})).join('');
 $('#detail-grid').innerHTML=['reference','A','B','C'].map(v=>`<div class="detail-row"><h3>${variants[v].name}</h3><div class="subdetails">${[['first','先攻のそだち'],['second','後攻のそだち'],['end','終了ラウンド']].map(([crop,label])=>`<figure>${render(state,{variant:v,crop})}<figcaption>${label}</figcaption></figure>`).join('')}</div></div>`).join('');
 for(const[k]of fields){$('#'+k).value=state[k];$('#'+k+'-out').value=state[k];}$('#end').value=state.end;
 $('#values').innerHTML=values(state).map((n,i)=>`<span>${[...fields.map(f=>f[1]),'終了ラウンド'][i]} ${n}${(i===3||i===4)&&n===100?' 達成':''}</span>`).join('');
 document.querySelectorAll('[data-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.variant===variant)));
}
fields.forEach(([k])=>$('#'+k).oninput=e=>{state[k]=+e.target.value;update();});$('#end').onchange=e=>{state.end=+e.target.value;update();};
for(const b of document.querySelectorAll('[data-variant]'))b.onclick=()=>{variant=b.dataset.variant;update();};
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>{Object.assign(state,overlapCases.find(c=>c.id===b.dataset.preset).state);update();};
$('#endpoints').onclick=()=>{Object.assign(state,{firstGrowth:0,secondGrowth:100});update();};$('#reset').onclick=()=>{Object.assign(state,sample);update();};update();
