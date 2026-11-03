import {ForestSession,pointerActor} from '../session.mjs';
import {render,loadForest} from '../render.mjs';import {loadSprites} from '../../naopoyo-rescue/sprites.mjs';
import {stages} from '../stages.mjs';import {ExampleReplay} from '../example-replay.mjs';
import {complete,mass} from '../../naopoyo-v2/engine.mjs';
import {comparisonStage,sceneStage,scenes,directions,saveKey} from './model.mjs';
const $=id=>document.getElementById(id),canvas=$('board'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
let mode='B',q,original,replay=null,auto=false,pointer=null,last=0,wait=0,notice='',generation=0;
const selected=()=>scenes.find(s=>s.id===$('scene').value);
for(const s of scenes)$('scene').add(new Option(s.title,s.id));
for(const s of stages)$('scene').add(new Option(`${s.number}面 ${s.title.replace(/^\d+\s*/, '')}`,s.id));
directions.forEach(([label],i)=>$('direction').add(new Option(label,i)));
$('scene').value='8-8';
function save(){try{localStorage.setItem(saveKey(original,mode),q.serialize());}catch{notice='この端末では保存できません';}}
function stopPointer(){q?.end();if(pointer!==null){try{canvas.releasePointerCapture(pointer);}catch{}pointer=null;}}
function setup(){generation++;stopPointer();replay=null;auto=false;wait=0;notice='';$('playback').hidden=true;
 const scene=selected();$('direction').disabled=!scene||scene.special;
 original=comparisonStage(scene?sceneStage(scene,Number($('direction').value)):stages.find(s=>s.id===$('scene').value),mode);
 q=new ForestSession(original);$('mode-a').setAttribute('aria-pressed',mode==='A');$('mode-b').setAttribute('aria-pressed',mode==='B');
 $('rule').textContent=mode==='B'?'同種族は合体・余剰分離／異種族は交換':'現行V11：同種族8＋8と異種族は交換';$('events').textContent='まだ操作していません';draw();}
function draw(){const shown=replay?.session||q;render(canvas,shown,{dpr:Math.min(devicePixelRatio||1,2),reducedMotion:reduce.matches});
 $('status').textContent=notice||(complete(shown.state)?'みんな、おかえり！':`${shown.state.moves}手 · 段階合計 ${mass(shown.state)} · 救出 ${shown.state.rescued}`);
 $('undo').disabled=!!replay||(!q.history.length&&!q.active);$('action').disabled=!!replay||!selected()||!q.state.actors.some(a=>a.id==='a');$('example').disabled=!!selected()||!!replay;
 $('retry').disabled=!!replay;$('restore').disabled=!!replay;
 if(replay){$('step').textContent=`おてほん ${replay.index} / ${replay.path.length}手`;$('prev').disabled=replay.index===0;$('next').disabled=replay.index===replay.path.length;$('auto').textContent=auto?'一時停止':'自動再生';}}
function record(results){if(!results.length)return;notice=results.some(r=>!r.ok)?'その方向には動けません':'';$('events').textContent=JSON.stringify(results.map(({ok,reason,events})=>({ok,reason,events})),null,2);}
function cell(e){const b=canvas.getBoundingClientRect();return {x:(e.clientX-b.left)/b.width*8,y:(e.clientY-b.top)/b.height*8};}
canvas.addEventListener('pointerdown',e=>{if(replay||pointer!==null)return;const p=cell(e),a=pointerActor(q,p);if(!a)return;generation++;q.motion=[];q.paused=false;if(q.begin(a.id,p)){pointer=e.pointerId;canvas.setPointerCapture(pointer);e.preventDefault();}});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;record(q.travel(cell(e)));draw();});
const finish=e=>{if(e.pointerId!==pointer)return;stopPointer();save();draw();};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
$('action').onclick=()=>{generation++;stopPointer();q.motion=[];q.paused=false;const a=q.state.actors.find(a=>a.id==='a');if(!a)return;const p={x:a.x+.5,y:a.y+.5},dir=selected().special?directions[0]:directions[Number($('direction').value)];q.begin(a.id,p);record(q.travel({x:p.x+dir[1],y:p.y+dir[2]}));q.end();save();draw();};
$('undo').onclick=()=>{generation++;stopPointer();q.undo();q.paused=false;notice='';save();draw();};
$('retry').onclick=()=>{generation++;stopPointer();q.retry();q.paused=false;notice='';save();draw();};
$('restore').onclick=()=>{generation++;stopPointer();try{const raw=localStorage.getItem(saveKey(original,mode));if(raw){const restored=new ForestSession(original,raw);if(restored.restored){q=restored;notice='保存した盤面に戻りました';}else notice='このルールでは読み込めない保存です';}else notice='この場面の保存はまだありません';}catch{notice='保存を読み込めません';}draw();};
for(const m of ['A','B'])$('mode-'+m.toLowerCase()).onclick=()=>{mode=m;setup();};$('scene').onchange=setup;$('direction').onchange=setup;
$('example').onclick=async()=>{const token=++generation;stopPointer();const st=original;try{const response=await fetch(`../examples/${st.number}.json`);if(!response.ok)throw Error('load');const {path}=await response.json();if(token!==generation)return;stopPointer();replay=new ExampleReplay(st,path);auto=false;wait=0;$('playback').hidden=false;notice='';draw();}catch{if(token===generation){notice='おてほんを読み込めません';draw();}}};
$('prev').onclick=()=>{auto=false;replay.previous();draw();};$('next').onclick=()=>{auto=false;replay.next();draw();};$('auto').onclick=()=>{auto=!auto;wait=0;if(auto&&replay.index===replay.path.length)replay.reset();draw();};$('close').onclick=()=>{replay=null;auto=false;$('playback').hidden=true;draw();};
document.addEventListener('visibilitychange',()=>{generation++;const dragging=pointer!==null;stopPointer();if(dragging)save();auto=false;last=0;draw();});
function loop(time){const elapsed=last?Math.min(100,time-last):0;last=time;if(!document.hidden){const shown=replay?.session||q;const dt=elapsed/($('slow').checked?4:1);shown.animate(dt,reduce.matches);if(auto&&replay&&!shown.motion.length){wait+=elapsed;if(wait>=300){wait=0;if(replay.index<replay.path.length)replay.next();else auto=false;}}draw();}requestAnimationFrame(loop);}
setup();await Promise.all([loadSprites(),loadForest()]);draw();requestAnimationFrame(loop);
