import {loadSprites,speciesNames} from './sprites.mjs';
import {legacyStages} from './legacy-stages.mjs';
import{stages}from'./stages.mjs';import{clone,createState,move,release,complete,mass}from'./engine.mjs';import{trace}from'./input.mjs';import{KEY,pack,restore}from'./store.mjs';import{renderer}from'./render.mjs';
const $=id=>document.getElementById(id),canvas=$('board'),draw=renderer(canvas);let index=0,state=createState(stages[0]),history=[],cleared=[],selected=null,drag=null,before=null,storageError=false,solutions={},legacySolutions={};
const oldLayout=()=>legacyStages.has(index)&&JSON.stringify(state.walls)===JSON.stringify(legacyStages.get(index).walls);
try{const p=restore(localStorage.getItem(KEY));if(p)({index,state,history,cleared}=p)}catch{storageError=true}
loadSprites().then(failed=>{if(failed.length)$('message').textContent='キャラ画像を読み込めませんでした。再読み込みしてください。'});
fetch('./legacy-solutions.json').then(r=>r.json()).then(v=>{legacySolutions=v;showSolution()});
fetch('./solutions.json').then(r=>r.json()).then(v=>{solutions=v;showSolution()}).catch(()=>{$('solution').textContent='解答を読み込めませんでした。再読み込みしてください。'});
function save(){try{localStorage.setItem(KEY,pack(index,state,history,cleared))}catch{storageError=true;$('message').textContent='保存できません。この画面では続けて遊べます。'}}
function begin(){if(!before)before=clone(state)}
function finish(){drag=null;if(!before)return;const original=before;before=null;if(!release(state)){state=original;$('message').textContent='落下が循環するため、この操作を戻しました。'}else if(JSON.stringify(state)!==JSON.stringify(original)){history.push(original);history=history.slice(-80)}if(complete(state)&&!cleared.includes(state.id))cleared.push(state.id);save();update()}
function choose(i){finish();index=i;state=createState(stages[i]);history=[];selected=null;before=null;$('message').textContent='';$('hintBox').open=false;save();update();showSolution()}
function update(){
 $('levels').replaceChildren(...stages.map((s,i)=>{const b=document.createElement('button');b.textContent=s.id;b.className=(i===index?'active ':'')+(cleared.includes(s.id)?'done':'');b.setAttribute('aria-label',`${s.id} ${s.title}${cleared.includes(s.id)?' クリア済み':''}`);b.setAttribute('aria-current',i===index?'step':'false');b.onclick=()=>choose(i);return b}));
 $('stageNum').textContent=`STAGE ${state.id} / ${stages.length}`;$('title').textContent=stages[index].title;$('lesson').textContent=oldLayout()?'更新前の途中データを継続中。「はじめから」で新しい通路になります。':stages[index].lesson;$('mode').textContent=state.gravity?'↓ 重力あり':'ふわふわ / 重力なし';$('remaining').textContent=`あと ${state.actors.length} 体 / 救出量 ${state.rescued} / ${mass(state)}`;$('moves').textContent=`${history.length} ドラッグ`;$('undo').disabled=!history.length&&!before;$('win').hidden=!complete(state);$('next').textContent=index===stages.length-1?'はじめの帰り道へ ↺':'次の帰り道へ →';$('winText').textContent=`${history.length}回の操作で、全員を救出しました。`;if(storageError)$('message').textContent='保存できません。この画面では続けて遊べます。';
}
function cell(e){const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(state.w-1,Math.floor((e.clientX-r.left)/r.width*state.w))),y:Math.max(0,Math.min(state.h-1,Math.floor((e.clientY-r.top)/r.height*state.h)))}}
function travel(to){const a=state.actors.find(a=>a.id===selected);if(!a)return;for(const[x,y]of trace(a,to)){const actor=state.actors.find(a=>a.id===selected);if(!actor)break;if(!move(state,selected,x-actor.x,y-actor.y)){ $('message').textContent='そこには進めないよ。段階・足場・出口の条件を確認。';break}else $('message').textContent=''}update()}
canvas.addEventListener('pointerdown',e=>{if(drag!==null||complete(state))return;const p=cell(e),a=state.actors.find(a=>a.x===p.x&&a.y===p.y);if(!a)return;e.preventDefault();finish();selected=a.id;begin();drag=e.pointerId;canvas.setPointerCapture(e.pointerId);update()});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==drag)return;e.preventDefault();for(const point of e.getCoalescedEvents?.()||[e])travel(cell(point))});
canvas.addEventListener('pointerup',e=>{if(e.pointerId!==drag)return;travel(cell(e));finish()});
for(const event of['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===drag)finish()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)finish()});window.addEventListener('pagehide',finish);
$('undo').onclick=()=>{finish();if(history.length){state=history.pop();selected=null;save();update();$('message').textContent='1回のドラッグを戻しました。'}};
$('retry').onclick=()=>choose(index);$('next').onclick=()=>choose((index+1)%stages.length);
$('hint').onclick=()=>{$('hintBox').open=!$('hintBox').open;showSolution()};
function showSolution(){$('solution').replaceChildren(...((oldLayout()?legacySolutions[state.id]:null)||solutions[state.id]||[]).map(d=>{const li=document.createElement('li');li.textContent=`${speciesNames[stages[index].actors.find(a=>a.id===d.id)?.species]||'分裂して残った子'}：${d.path.map(([x,y])=>`(${x+1},${y+1})`).join(' → ')} → 指を離す`;return li}))}
function arrow(dx,dy){if(!selected||!state.actors.some(a=>a.id===selected)){$('message').textContent='先に動かすキャラをタップしてください。';return}begin();move(state,selected,dx,dy);update()}
for(const b of document.querySelectorAll('[data-dir]'))b.onclick=()=>arrow(...b.dataset.dir.split(',').map(Number));$('drop').onclick=finish;
canvas.addEventListener('keydown',e=>{const dirs={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};if(dirs[e.key]){e.preventDefault();arrow(...dirs[e.key])}if(e.key==='Enter'||e.key==='Escape')finish()});
$('help').onclick=()=>{$('guide').showModal()};$('closeHelp').onclick=()=>{$('guide').close()};
function frame(t){draw(state,selected,t);requestAnimationFrame(frame)}update();requestAnimationFrame(frame);

