import {paintGate,conditionText} from './ref/prototypes/naopoyo-shared/gate-design.mjs';
import {readChoice,saveChoice,importChoice} from './ref/prototypes/naopoyo-shared/gate-choice.mjs';
import {drawBoard} from './ref/prototypes/naopoyo-time-hand-chapter1/draw.mjs';
import {createState} from './ref/prototypes/naopoyo-time-hand-chapter1/engine.mjs';
import {matchesCondition} from './ref/prototypes/naopoyo-rescue/conditions.mjs';
import {loadSprites} from './ref/prototypes/naopoyo-rescue/sprites.mjs';
import {stages} from './ref/prototypes/naopoyo-100/stages.mjs';
const $=s=>document.querySelector(s),conditions={exact2:{exact:2},min4:{min:4},max3:{max:3},exact8:{exact:8}};
const stage=stages.find(s=>s.id==='07'),states=['normal','met','unmet'];
const names={normal:'通常時',met:'条件を満たす',unmet:'条件を満たさない'};
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
let record=null;
function showRecord(result){
 record=result.record;$('#saved').textContent=result.error||(record?`${record.choice} を選択済み · ${new Date(record.at).toLocaleString('ja-JP')}`:'まだ選択していません。従来のAを維持しています。');
 for(const d of ['a','b'])$('#choose-'+d).setAttribute('aria-pressed',String(record?.choice===d.toUpperCase()));
 $('#export').disabled=!record;$('#history').replaceChildren();
 for(const item of [...(record?.history||[])].reverse()){const li=document.createElement('li');li.textContent=`${item.choice} · ${new Date(item.at).toLocaleString('ja-JP')}`;$('#history').append(li)}
}
showRecord(readChoice(storage));
for(const d of ['A','B'])$('#choose-'+d.toLowerCase()).onclick=()=>showRecord(saveChoice(storage,d));
$('#export').onclick=()=>{if(!record)return;const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='naopoyo-gate-choice.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('#import').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>200000){$('#saved').textContent='記録ファイルが大きすぎます。';return}const result=importChoice(storage,await f.text());if(result.error)$('#saved').textContent=result.error;else showRecord(result);e.target.value=''};
for(const design of ['A','B']){
 const article=document.createElement('article');article.innerHTML=`<h3>${design} · ${design==='A'?'以前の正式デザイン':'図鑑VERSION 2の案'}</h3><p class="subtitle">${design==='A'?'石のアーチ · 原描画を直接再利用':'角形の門 · V2の原描画を直接再利用'}</p><div class="swatches"><span></span><span class="size-title">36px</span><span class="size-title">48px</span>${states.map(state=>`<p>${names[state]}<small data-actor="${state}"></small></p>${[36,48].map(size=>`<canvas data-design="${design}" data-state="${state}" data-size="${size}" aria-label="${design} ${names[state]} ${size}px"></canvas>`).join('')}`).join('')}</div>`;$('#cards').append(article);
}
function sample(condition,met){return Array.from({length:8},(_,i)=>i+1).find(level=>matchesCondition({level,species:'dog'},condition)===met)}
function paint(){
 const condition=conditions[$('#condition').value],symbols=$('#symbols').checked;
 document.querySelectorAll('[data-actor]').forEach(el=>{const state=el.dataset.actor;el.textContent=state==='normal'?`条件 ${conditionText(condition)}`:`段階 ${sample(condition,state==='met')} の場合`});
 document.querySelectorAll('canvas[data-design]').forEach(canvas=>{
  const size=Number(canvas.dataset.size),dpr=Math.min(devicePixelRatio||1,2);canvas.style.width=size+'px';canvas.style.height=size+'px';canvas.width=canvas.height=size*dpr;
  const c=canvas.getContext('2d');c.scale(size*dpr,size*dpr);c.fillStyle='#637d7d';c.fillRect(0,0,1,1);paintGate(c,{...condition,x:0,y:0},{design:canvas.dataset.design,state:canvas.dataset.state,symbols});
 });
 const unit=Number($('#board-size').value),state=$('#board-state').value;
 for(const design of ['A','B']){
  const canvas=$('#board-'+design.toLowerCase());canvas.style.width=canvas.style.height=8*unit+'px';const s=createState(stage.board);drawBoard(canvas,s,{gates:[],now:0,reduced:true});
  const c=canvas.getContext('2d');c.setTransform(canvas.width/8,0,0,canvas.height/8,0,0);for(const g of s.gates)paintGate(c,{...condition,x:g.x,y:g.y},{design,state,symbols});
 }
 $('#stage-caption').textContent=`全100面・07「${stage.title}」の実際の配置。A/Bで同じ盤面を使用。条件：${conditionText(condition)}。`;
}
for(const id of ['condition','symbols','board-state','board-size'])$('#'+id).onchange=paint;
try{const failures=await loadSprites();$('#loading').textContent=failures.length?`画像 ${failures.length}件を読み込めませんでした。再読み込みしてください。`:'A・Bとも原描画を使用しています。通常と不一致が同じ絵なのは従来仕様です。';paint()}catch{$('#loading').textContent='素材を読み込めませんでした。再読み込みしてください。'}
