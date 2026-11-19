import {render,sample,variants,romans,overlapCases} from './clock-v10.mjs';
const $=s=>document.querySelector(s),state={...sample};let variant='A';
const fields=[['round','現在ラウンド',12,1],['firstTime','先攻の残り時',12,1],['secondTime','後攻の残り時',12,1],['firstGrowth','先攻のそだち',100,5],['secondGrowth','後攻のそだち',100,5]];
$('#choices').innerHTML=Object.entries(variants).map(([id,v])=>`<button data-variant="${id}">${v.name}</button>`).join('');
$('#ends').innerHTML=romans.map((r,i)=>`<button data-end="${i+1}">${r}</button>`).join('');
$('#sliders').innerHTML=fields.map(([id,label,max,step])=>`<label for="${id}">${label}<output id="${id}-out"></output><input id="${id}" type="range" min="0" max="${max}" step="${step}"></label>`).join('');
$('#presets').innerHTML=overlapCases.map(c=>`<button data-preset="${c.id}">${c.label}</button>`).join('');
function art(v,crop='full'){
 let s=render(state,{variant:v,crop});
 return s;
}
function fig(v,crop='full'){return `<figure><div class="art">${art(v,crop)}</div><figcaption>${variants[v].name}</figcaption></figure>`;}
function update(){
 $('#live').innerHTML=art(variant);$('#selected').textContent=variants[variant].name;
 const note='全案ともV9 Bの構成。変更はメイン数字の大きさだけです。';
 $('#hero-note').textContent=note;$('#hands-note').textContent=note;
 $('#comparison').innerHTML=['A','B','C'].map(v=>fig(v)).join('');
 $('#details').innerHTML=['A','B','C'].map(v=>fig(v,'end')).join('');
 $('#hands').innerHTML=art(variant,'hands');
 $('#end-value').textContent=`終了ラウンド：${romans[state.end-1]}（${state.end}）`;
 $('#reference-note').textContent='下中央の直径・数字・針は全案ともV9 Bのままです。';
 $('#upper').innerHTML=['A','B','C'].map(v=>fig(v,'upper')).join('');
 $('#leaves').innerHTML=['A','B','C'].map(v=>fig(v,'leaves')).join('');
 $('#phone').innerHTML=['A','B','C'].map(v=>fig(v)).join('');
 for(const[k]of fields){$('#'+k).value=state[k];$('#'+k+'-out').value=state[k];}
 document.querySelectorAll('[data-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.variant===variant)));
 document.querySelectorAll('[data-end]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.end===state.end)));
}
fields.forEach(([k])=>$('#'+k).oninput=e=>{state[k]=+e.target.value;update();});
for(const b of document.querySelectorAll('[data-variant]'))b.onclick=()=>{variant=b.dataset.variant;update();};
for(const b of document.querySelectorAll('[data-end]'))b.onclick=()=>{state.end=+b.dataset.end;update();};
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>{Object.assign(state,overlapCases.find(c=>c.id===b.dataset.preset).state);update();};
$('#endpoints').onclick=()=>{Object.assign(state,{firstGrowth:0,secondGrowth:100});update();};
$('#reset').onclick=()=>{Object.assign(state,sample);update();};update();

$('#phone-width').onchange=e=>{document.querySelector('#phone').style.setProperty('--phone-width',e.target.value+'px');};
