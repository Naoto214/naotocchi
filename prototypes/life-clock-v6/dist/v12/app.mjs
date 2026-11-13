import {render,sample,studies,romans,overlapCases} from './clock-v12.mjs';import{layout}from './layout.mjs';import{standNotes,standSvg}from './stands.mjs';
const $=s=>document.querySelector(s),state={...sample};let selected=studies.main[1];
const fields=[['round','現在ラウンド',12,1],['firstTime','先攻の残り時',12,1],['secondTime','後攻の残り時',12,1],['firstGrowth','先攻のそだち',100,5],['secondGrowth','後攻のそだち',100,5]];
$('#sliders').innerHTML=fields.map(([id,label,max,step])=>`<label for="${id}">${label}<output id="${id}-out"></output><input id="${id}" type="range" min="0" max="${max}" step="${step}"></label>`).join('');
$('#ends').innerHTML=romans.map((r,i)=>`<button data-end="${i+1}">${r}</button>`).join('');$('#presets').innerHTML=overlapCases.map(c=>`<button data-preset="${c.id}">${c.label}</button>`).join('');
function fig(o,crop='full',select=false){return `<figure><div>${render(state,{...o,crop})}</div><figcaption>${o.label||'V11 E · ＋30% 保存版'}</figcaption>${select?`<button data-choice="${o.id}" aria-pressed="${selected.id===o.id}">この案を見る</button>`:''}</figure>`;}
function update(){
 $('#live').innerHTML=render(state,selected);$('#selected').textContent=selected.label;$('#selected-note').textContent=`V9 B基準：メイン ${selected.main||52} / 40。左右 ${Math.round(((selected.growth||1)-1)*100)}%増、ローマ ${Math.round(((selected.roman||1)-1)*100)}%増。`;
 for(const [key,opts] of Object.entries(studies))$('#'+key).innerHTML=opts.map(o=>fig(o,{growth:'growth',roman:'end'}[key]||'full',true)).join('');
 $('#ten').innerHTML=studies.main.map(o=>fig(o,'ten')).join('');$('#font-end').innerHTML=studies.font.map(o=>fig(o,'end')).join('');
 $('#before-after').innerHTML=fig({reference:true})+fig(selected);$('#phone').innerHTML=fig({reference:true})+fig(selected);
 for(const[k]of fields){$('#'+k).value=state[k];$('#'+k+'-out').textContent=state[k];}
 $('#end-value').textContent=`終了ラウンド：${romans[state.end-1]}（${state.end}）`;
 document.querySelectorAll('[data-end]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.end===state.end)));
}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.choice){selected=Object.values(studies).flat().find(o=>o.id===b.dataset.choice);update();$('#hero').scrollIntoView();}else if(b.dataset.end){state.end=+b.dataset.end;update();}else if(b.dataset.preset){Object.assign(state,overlapCases.find(o=>o.id===b.dataset.preset).state);update();}});
fields.forEach(([k])=>$('#'+k).oninput=e=>{state[k]=+e.target.value;update();});$('#reset').onclick=()=>{Object.assign(state,sample);update();};$('#endpoints').onclick=()=>{Object.assign(state,{firstGrowth:0,secondGrowth:100});update();};$('#phone-width').onchange=e=>$('#phone').style.setProperty('--phone-width',e.target.value+'px');
$('#stand-cards').innerHTML=standNotes.map((n,i)=>`<article class="stand"><h3>${n.id} · ${n.name}</h3><div class="stand-views">${standSvg(i)}</div><p>${n.summary}</p><p>${n.size}</p><p>${n.trade}</p></article>`).join('');
$('#clearance').innerHTML='<caption>メイン数字：銀装飾 / 目盛り / ベゼルの最小距離</caption><tr><th>数字</th>'+[50,52,54,56].map(s=>`<th>＋${Math.round((s/40-1)*100)}%</th>`).join('')+'</tr>'+Array.from({length:12},(_,i)=>'<tr><th>'+(i+1)+'</th>'+[50,52,54,56].map(s=>'<td>'+Object.values(layout[s][i+1].clearance).map(v=>v.toFixed(1)).join(' / ')+'</td>').join('')+'</tr>').join('');
$('#downloads').innerHTML=[['main','メイン4案'],['growth','左右3案'],['roman','ローマ3案'],['font','書体3案'],['combined','総合3案'],['ten','10の拡大'],['stands','スタンド3案']].map(([f,l])=>`<a href="evidence/${f}.jpg">${l}</a>`).join('');update();
