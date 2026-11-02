import {stageGrid,victory} from './stage-ui.mjs';
import {ChapterProgress} from './progress.mjs';
import {STORAGE_KEY} from './session.mjs';
import {stages} from './stages.mjs';
import {solutions} from './solutions.mjs';
import {ExampleReplay,solutionKey} from './replay.mjs';
import {BoardInput} from './input.mjs';
import {drawBoard} from './draw.mjs';
import {loadSprites,speciesNames} from '../naopoyo-rescue/sprites.mjs';
import {contactVisualActors,contactEffects} from '../naopoyo-chapter2/contact-motion.mjs';
import {ForestSession,pointerActor} from '../naopoyo-chapter2/session.mjs';
import {playbackClock} from '../naopoyo-chapter2/example-clock.mjs';
import {clone,mass} from './engine.mjs';
const $=id=>document.getElementById(id),canvas=$('board'),progress=new ChapterProgress();
try{progress.restore(localStorage.getItem(STORAGE_KEY));}catch{}
let mode='play',demo=null,demoIndex=progress.index,auto=null,loaded=false,message='',motion=null,frameRequest=null,lastFrame=0;
const presentation={motion:[],state:null,active:null},advanceMotion=ForestSession.prototype.animate;
const positions=new Map(),current=()=>progress.sessions[progress.index],shown=()=>mode==='demo'?demo.session:current();
const input=new BoardInput(()=>current().state,command);
function save(){progress.record();try{localStorage.setItem(STORAGE_KEY,progress.serialize());$('saved').textContent='自動保存';}catch{$('saved').textContent='保存できません。この画面を閉じると進行が失われます';}}
function stopAuto(){if(auto!==null)clearInterval(auto);auto=null;}
function cancel(){pointer=null;input.cancel();current().endGesture();presentation.motion=[];motion=null;if(frameRequest)cancelAnimationFrame(frameRequest);frameRequest=null;}
function animate(before,r,id,dx,dy){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const next={before,after:clone(shown().state),events:r.events,id,dx,dy,elapsed:0,duration:r.events.some(e=>e.type==='split')?340:r.events.some(e=>e.type==='swap')?(r.events.some(e=>e.type==='fall')?420:180):r.events.some(e=>e.type==='fall')?340:r.events.some(e=>e.type==='merge')?(r.overflow?240:180):110};presentation.motion.push(next);motion=presentation.motion[0];if(!frameRequest){lastFrame=performance.now();frameRequest=requestAnimationFrame(tick);}}
function tick(now){frameRequest=null;advanceMotion.call(presentation,Math.min(100,Math.max(0,now-lastFrame)),matchMedia('(prefers-reduced-motion: reduce)').matches);lastFrame=now;motion=presentation.motion[0]||null;draw();if(motion)frameRequest=requestAnimationFrame(tick);}
function command(id,dx,dy){
 if(!loaded||mode!=='play'||current().cleared)return {ok:false,reason:'view'};
 const before=clone(current().state),r=current().step(id,dx,dy);
 if(!r.ok){message=({wall:'岩や盤面の外へは進めないよ。',corner:'閉じた角は通れないよ。',foothold:'上へ進むには、移動先の下に足場が必要だよ。',gate:'この段階では魔法ゲートを通れないよ。','gate-top':'魔法ゲートの上面は足場。横から通ろう。',terrain:'門や出口の数字を見てみよう。',limit:'やりなおして、もう一度挑戦しよう。'})[r.reason]||'そこへは進めないよ。';render();return r;}
 message='';
 save();render();animate(before,r,id,dx,dy);if(current().cleared)showVictory();return r;
}
function switchStage(i){if(!progress.unlocked(i))return;stopAuto();cancel();mode='play';progress.index=i;message='';input.select(current().state.actors[0]?.id??null);$('predict').checked=i<3;$('hint-text').hidden=true;save();render();}
function keepPosition(){if(demo){positions.set(demoIndex,{key:solutionKey(demoIndex),index:demo.index});try{localStorage.setItem(STORAGE_KEY+'.examples',JSON.stringify([...positions]));}catch{}}}
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY+'.examples'));if(Array.isArray(saved))for(const [i,p]of saved)if(stages[i]&&p.key===solutionKey(i)&&Number.isInteger(p.index)&&p.index>=0&&p.index<=solutions[i].length)positions.set(i,p);}catch{}
function openDemo(i=progress.index){keepPosition();stopAuto();cancel();mode='demo';demoIndex=i;demo=new ExampleReplay(i);const old=positions.get(i);if(old?.key===solutionKey(i))demo.show(old.index);message='';render();}
function demoStep(delta){presentation.motion=[];motion=null;const before=clone(demo.session.state),step=demo.path[demo.index];const changed=delta>0?demo.next():demo.previous();if(!changed){stopAuto();render();return false;}keepPosition();render();if(delta>0)animate(before,{events:demo.events[demo.index],split:demo.events[demo.index].some(e=>e.type==='split')},...step);return true;}
stages.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.id+' '+s.title;$('example-stage').append(o);});
function selectScreen(){end();$('content').innerHTML=stageGrid(stages,progress);$('dialog').showModal();for(const b of $('content').querySelectorAll('[data-stage]'))b.onclick=()=>{ $('dialog').close();switchStage(Number(b.dataset.stage));};}
function showVictory(){if(mode!=='play'||!current().cleared)return;end();$('content').innerHTML=victory(progress.index);$('dialog').showModal();if($('nextStage'))$('nextStage').onclick=()=>{$('dialog').close();switchStage(progress.index+1);};if($('chapterMap'))$('chapterMap').onclick=selectScreen;}
$('select').onclick=selectScreen;$('close').onclick=()=>$('dialog').close();
function sizeBoard(){const r=document.querySelector('.arena').getBoundingClientRect();document.documentElement.style.setProperty('--board-size',Math.max(1,Math.floor(Math.min(r.width-4,r.height-4)))+'px');draw();}
function draw(){const q=shown(),s=q.state,stage=q.stage;let state=s,selected=null,candidates=[],route=null,turns=[];
 if(mode==='play'&&$('predict').checked&&!q.cleared){const a=s.actors.find(a=>a.id===input.selected),sp=a&&s.spikes.find(p=>Math.max(Math.abs(p.x-a.x),Math.abs(p.y-a.y))===1);if(sp){const p=q.preview(a.id,sp.x-a.x,sp.y-a.y);if(p.result.ok&&p.record.trace){candidates=p.record.trace.candidates.slice(0,p.record.births.length);route=candidates.at(-1)?.path;turns=candidates;}}}
 if(motion){const t=Math.min(1,motion.elapsed/motion.duration);state={...s,actors:contactVisualActors(motion,t)};}
 const a=state.actors.find(a=>a.id===(mode==='play'?input.selected:demo.path[demo.index]?.[0]));if(a)selected=[a.x,a.y];
 drawBoard(canvas,state,{stage,selected,candidates,route,turns,showRanks:!!candidates.length,target:stage.objective?.target,effects:motion?contactEffects(motion,Math.min(1,motion.elapsed/motion.duration)):[]});
}
function render(){const q=shown(),s=q.stage,isDemo=mode==='demo';$('scene').dataset.scene=s.scene;$('number').textContent=s.id;$('title').textContent=s.title;$('difficulty').textContent='★'.repeat(s.difficulty)+'☆'.repeat(5-s.difficulty);$('goal').textContent=s.goal;$('hint-text').textContent=s.hint;
 $('phase').textContent=isDemo?'おてほん · 通常プレイと別の盤面':'プレイ中';$('moves').textContent=q.state.moves+' 手';$('mass').textContent='段階合計 '+mass(q.state);$('gravity').textContent=q.state.gravity?'重力あり · 仲間も足場':'平面';$('progress').textContent=progress.completed.filter(Boolean).length+' / 10 クリア';
 $('dialogue').textContent=q.cleared?'みんなで、自由へ。':s.text;
 $('status').textContent=message||(q.cleared?'全員脱出！':isDemo?'前後に進めて、操作を確かめよう。':'キャラをタップして選択。なぞって移動。');
 $('play-tools').hidden=isDemo;$('replay').hidden=!isDemo;$('predict').disabled=isDemo;$('undo').disabled=!current().actions.length;
 $('ending').hidden=!q.cleared||s.number!==10;
 if(!isDemo&&!q.state.actors.some(a=>a.id===input.selected))input.selected=q.state.actors[0]?.id??null;
 if(isDemo){$('example-stage').value=demoIndex;$('replay-position').textContent=demo.index+' / '+demo.path.length+' 手';$('auto').textContent=auto===null?'自動再生':'一時停止';$('back').disabled=demo.index===0;$('forward').disabled=demo.index===demo.path.length;}
 draw();
}
$('predict').onchange=draw;
$('undo').onclick=()=>{cancel();current().undo();message='';save();render();};$('retry').onclick=()=>{cancel();current().reset();message='';save();render();};$('hint').onclick=()=>{$('hint-text').hidden=false;$('details').showModal();};
$('example').onclick=()=>openDemo();$('example-stage').onchange=()=>openDemo(Number($('example-stage').value));$('return').onclick=()=>{keepPosition();stopAuto();cancel();mode='play';message='';render();};$('back').onclick=()=>{stopAuto();demoStep(-1);};$('forward').onclick=()=>{stopAuto();demoStep(1);};$('restart').onclick=()=>{stopAuto();presentation.motion=[];motion=null;demo.reset();keepPosition();render();};$('auto').onclick=()=>{if(auto!==null)stopAuto();else{if(demo.index===demo.path.length)demo.reset();let clock={elapsed:0},last=performance.now();auto=setInterval(()=>{const now=performance.now();clock=playbackClock(clock,now-last,true,!!motion);last=now;if(clock.advance)demoStep(1);},32);}render();};
function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*8,y:(e.clientY-r.top)/r.height*8};}
let pointer=null;
const end=()=>{input.end();current().endGesture();pointer=null;};
canvas.onpointerdown=e=>{if(pointer!==null||!loaded||mode!=='play'||$('details').open||$('dialog').open||current().cleared||e.isPrimary===false)return;e.preventDefault();const p=point(e);presentation.state=current().state;const hit=pointerActor(presentation,p)||null;cancel();pointer=e.pointerId;canvas.setPointerCapture(pointer);current().beginGesture();input.start(p,{hit});render();};
function travel(e){for(const sample of e.getCoalescedEvents?.().length?e.getCoalescedEvents():[e])input.drag(point(sample));render();}
canvas.onpointermove=e=>{if(e.pointerId!==pointer||mode!=='play')return;e.preventDefault();travel(e);};
canvas.onpointerup=e=>{if(e.pointerId!==pointer)return;travel(e);end();};
canvas.onpointercancel=canvas.onlostpointercapture=e=>{if(e.pointerId===pointer)end();};
$('details-open').onclick=()=>{end();$('details').showModal();};$('details-close').onclick=()=>$('details').close();
window.addEventListener('resize',()=>{cancel();render();});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAuto();cancel();render();}});
window.addEventListener('keydown',e=>{if(mode!=='play'||$('details').open||$('dialog').open||/INPUT|SELECT|BUTTON/.test(e.target.tagName))return;const d={ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0],Home:[-1,-1],PageUp:[1,-1],End:[-1,1],PageDown:[1,1]}[e.key];if(d){e.preventDefault();cancel();command(input.selected,...d);}});
new ResizeObserver(sizeBoard).observe(document.querySelector('.arena'));window.visualViewport?.addEventListener('resize',sizeBoard);switchStage(progress.index);
const failed=await loadSprites();loaded=!failed.length;if(failed.length)message='キャラクター画像を読み込めません。再読み込みしてください。';render();
