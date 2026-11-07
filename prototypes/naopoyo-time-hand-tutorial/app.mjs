import {TutorialSession,STORAGE_KEY} from './session.mjs';
import {lessons} from './lessons.mjs';
import {BoardInput} from './input.mjs';
import {drawBoard} from './draw.mjs';
import {loadSprites,speciesNames} from '../naopoyo-rescue/sprites.mjs';
import {clone,mass} from './engine.mjs';
const $=id=>document.getElementById(id),canvas=$('board');
const sessions=lessons.map((_,i)=>new TutorialSession(i));let index=0,phase='play',birth=7,timer=null,message='',loaded=false;
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved?.version===1&&Array.isArray(saved.sessions)){saved.sessions.slice(0,8).forEach((v,i)=>sessions[i].restore(v));if(Number.isInteger(saved.index)&&saved.index>=0&&saved.index<8)index=saved.index;}}catch{}
const current=()=>sessions[index];
const input=new BoardInput(()=>current().state,command);
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,index,sessions:sessions.map(s=>s.serialize())}));$('save-note').textContent='自動保存';}catch{$('save-note').textContent='このブラウザーでは保存できません';}}
function stop(){input.cancel();if(timer!==null)clearTimeout(timer);timer=null;phase='play';}
function command(id,dx,dy){
 if(!loaded||phase!=='play'||current().cleared)return {ok:false,reason:'view'};
 const r=current().step(id,dx,dy);
 if(!r.ok){message=({wall:'岩や盤面の外へは進めないよ。',corner:'閉じた角は通れないよ。',foothold:'上へ進むには足場が必要だよ。',limit:'500手に達しました。やりなおそう。'})[r.reason]||'そこへは進めないよ。';render();return r;}
 message='';save();
 if(current().lesson.gravity&&r.split){phase='birth';birth=current().records.at(-1).births.length;input.cancel();timer=setTimeout(()=>{phase='play';timer=null;render();},950);}
 render();return r;
}
function switchLesson(i){stop();index=i;input.select(current().state.actors[0]?.id||null);$('predict').checked=i<3;$('hint-text').hidden=true;message='';render();save();}
const dirs=[[-1,-1,'↖'],[0,-1,'↑'],[1,-1,'↗'],[-1,0,'←'],[0,0,'●'],[1,0,'→'],[-1,1,'↙'],[0,1,'↓'],[1,1,'↘']];
for(const [dx,dy,label]of dirs){const b=document.createElement(dx||dy?'button':'span');b.textContent=label;if(dx||dy){b.setAttribute('aria-label',`${label}へ移動`);b.onclick=()=>command(input.selected,dx,dy);} $('directions').append(b);}
lessons.forEach((l,i)=>{const b=document.createElement('button');b.textContent=l.id;b.title=l.title;b.onclick=()=>switchLesson(i);$('lessons').append(b);});
function lastSplit(){return [...current().records].reverse().find(r=>r.births.length);}
function suggested(){const s=current(),a=s.state.actors.find(a=>a.id===input.selected);if(!a||!$('predict').checked||s.cleared)return null;const spike=s.state.spikes.find(p=>Math.max(Math.abs(p.x-a.x),Math.abs(p.y-a.y))===1);if(!spike)return null;const p=s.preview(a.id,spike.x-a.x,spike.y-a.y);return p.result.ok&&p.record.births.length?p.record:null;}
function render(){
 const s=current(),l=s.lesson,split=lastSplit(),predict=phase==='play'?suggested():null;
 $('title').textContent=l.title;$('lesson-number').textContent=String(index+1).padStart(2,'0');$('text').textContent=l.text;$('goal').textContent=l.goal;$('hint-text').textContent=l.hint;
 $('moves').textContent=`${s.state.moves} 手`;$('mass').textContent=`段階合計 ${mass(s.state)}`;$('gravity').textContent=l.gravity?'重力あり':'平面';
 $('progress').textContent=`${sessions.filter(s=>s.cleared).length} / 8 クリア`;
 [...$('lessons').children].forEach((b,i)=>{b.textContent=lessons[i].id+(sessions[i].cleared?' ✓':'');b.setAttribute('aria-current',String(i===index));});
 $('status').textContent=message||(phase!=='play'?'確認中です。「プレイへ戻る」で操作できます。':s.cleared?(index===7?'8まで取り戻したね！ すべての練習を自由に試せるよ。':'できた！ 経路を見たり、つぎの練習へ進もう。'):'キャラを選んで、隣へタップ・ドラッグ。');
 $('undo').disabled=!s.actions.length;$('prev').disabled=index===0;$('next').disabled=index===7;
 $('route').disabled=!split;$('route').hidden=phase!=='play';$('play').hidden=phase==='play';$('birth-controls').hidden=phase==='play';$('settled').textContent=l.gravity?'重力後・最終配置を見る':'最終配置を見る';
 if(!s.state.actors.some(a=>a.id===input.selected))input.selected=s.state.actors[0]?.id||null;
 $('actor').replaceChildren(...s.state.actors.map(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=`${speciesNames[a.species]} ${a.level} (${String.fromCharCode(65+a.x)}${a.y+1})`;return o;}));$('actor').value=input.selected||'';
 $('actor').disabled=phase!=='play'||s.cleared;for(const b of $('directions').querySelectorAll('button'))b.disabled=phase!=='play'||s.cleared||!loaded;
 let state=s.state,candidates=[],route=null,turns=[];
 if(phase==='birth'&&split){state=clone(split.spawn);birth=Math.max(0,Math.min(birth,split.births.length));state.actors=state.actors.filter(a=>!split.births.slice(birth).some(c=>c.id===a.id));state.actors.find(a=>a.id===split.parent).level+=split.births.length-birth;candidates=split.trace.candidates.slice(0,birth);route=candidates.at(-1)?.path;turns=candidates;}
 if(predict){candidates=predict.trace.candidates.slice(0,predict.births.length);route=candidates.at(-1)?.path;turns=candidates;}
 $('phase').textContent=phase==='birth'?'生成直後（落下前）':phase==='final'?'重力・合体後の配置':predict?'予告 · トゲへ進むと…':'プレイ中';
 $('birth').max=split?.births.length||0;$('birth').value=birth;$('birth-label').textContent=`${Math.min(birth,split?.births.length||0)} / ${split?.births.length||0}体`;
 $('trace-info').textContent=split?split.births.map((a,i)=>`${i+1}=${String.fromCharCode(65+a.x)}${a.y+1}`).join(' → '):'';
 const actor=state.actors.find(a=>a.id===input.selected);
 drawBoard(canvas,state,{candidates,showRanks:!!candidates.length,route,turns,selected:phase==='play'&&actor?[actor.x,actor.y]:null,target:l.target});
}
$('actor').onchange=()=>{input.select($('actor').value);render();};
$('undo').onclick=()=>{stop();current().undo();message='';render();save();};$('retry').onclick=()=>{stop();current().reset();input.select('parent');message='';render();save();};
$('prev').onclick=()=>switchLesson(index-1);$('next').onclick=()=>switchLesson(index+1);$('hint').onclick=()=>{$('hint-text').hidden=!$('hint-text').hidden;};$('predict').onchange=render;
$('route').onclick=()=>{stop();phase='birth';birth=lastSplit()?.births.length||0;render();};$('play').onclick=()=>{stop();render();};$('settled').onclick=()=>{if(timer!==null)clearTimeout(timer);timer=null;phase='final';input.cancel();render();};$('birth').oninput=()=>{if(timer!==null)clearTimeout(timer);timer=null;phase='birth';birth=Number($('birth').value);render();};
function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*8,y:(e.clientY-r.top)/r.height*8};}
canvas.onpointerdown=e=>{if(!loaded||phase!=='play'||current().cleared||e.isPrimary===false)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);input.start(point(e));render();};
canvas.onpointermove=e=>{if(e.isPrimary===false)return;input.drag(point(e));render();};canvas.onpointerup=()=>input.end();canvas.onpointercancel=()=>input.cancel();canvas.onlostpointercapture=()=>input.cancel();
window.addEventListener('resize',()=>{input.cancel();render();});document.addEventListener('visibilitychange',()=>input.cancel());
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|BUTTON/.test(e.target.tagName))return;const d={ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0]}[e.key];if(d){e.preventDefault();command(input.selected,...d);}});
new ResizeObserver(()=>{input.cancel();render();}).observe(canvas);switchLesson(index);
const failed=await loadSprites();loaded=!failed.length;if(failed.length){message='キャラクター画像を読み込めません。ページを再読み込みしてください。';}render();
