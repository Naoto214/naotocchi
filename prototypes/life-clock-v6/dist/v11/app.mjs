import {render,sample,variants,romans,overlapCases,layout} from './clock-v11.mjs';
const $=s=>document.querySelector(s),state={...sample};let variant='B';
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
 const note='AはV10 Cそのまま。B〜Eは数字の大きさ・余白・光学中心を調整。装飾と6本の針は共通です。';
 $('#hero-note').textContent=note;$('#hands-note').textContent=note;
 $('#before-after').innerHTML=fig('A')+fig(variant==='A'?'B':variant);
 $('#glyphs').innerHTML=['A','B','C','D','E'].map(v=>`<figure><div class="glyph-row">${[1,2,3,6,8,10].map(n=>{const o=layout[v][n],a=n*Math.PI/6,x=512+o.radius*Math.sin(a),y=500-o.radius*Math.cos(a);return '<div>'+art(v).replace(/viewBox="[^"]+"/,`viewBox="${x-42} ${y-42} 84 84"`)+'</div>';}).join('')}</div><figcaption>'+variants[v].name+'</figcaption></figure>`).join('');
 $('#comparison').innerHTML=['A','B','C','D','E'].map(v=>fig(v)).join('');
 $('#details').innerHTML=['A','B','C','D','E'].map(v=>fig(v,'end')).join('');
 $('#hands').innerHTML=art(variant,'hands');
 $('#end-value').textContent=`終了ラウンド：${romans[state.end-1]}（${state.end}）`;
 $('#reference-note').textContent='下中央の直径・数字・針は全案ともV9 Bのままです。';
 $('#upper').innerHTML=['A','B','C','D','E'].map(v=>fig(v,'upper')).join('');
 $('#leaves').innerHTML=['A','B','C','D','E'].map(v=>fig(v,'leaves')).join('');
 $('#phone').innerHTML=['A','B','C','D','E'].map(v=>fig(v)).join('');
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
const ids=['A','B','C','D','E'];
$('#clearance').innerHTML='<thead><tr><th>数字</th>'+ids.map(v=>'<th>'+v+'</th>').join('')+'</tr></thead><tbody>'+Array.from({length:12},(_,i)=>'<tr><th>'+(i+1)+'</th>'+ids.map(v=>{const q=layout[v][i+1],c=q.clearance;return `<td title="銀装飾 ${c.silver} / 目盛り ${c.ticks} / ベゼル ${c.bezel}">${Math.min(...Object.values(c)).toFixed(1)}${q.status==='contact'?' 接触':q.status==='tight'?' 狭い':''}</td>`;}).join('')+'</tr>').join('')+'</tbody>';
const ctx=document.createElement('canvas').getContext('2d');ctx.font='100px Georgia,serif';
$('#font-audit').textContent='このブラウザーのGeorgia系字形：'+[1,2,3,6,8,10].map(n=>{const m=ctx.measureText(String(n));return n+'（幅 '+m.width.toFixed(1)+'／インク高 '+(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent).toFixed(1)+'）';}).join('、')+'。測定は100pxの通常数字。等高数字への対応はフォントに依存します。';
