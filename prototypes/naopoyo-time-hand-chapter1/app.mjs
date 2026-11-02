import {exampleShell} from '../naopoyo-chapter2/example-ui.mjs';
import {sampleEffects} from '../naopoyo-chapter1/render.mjs';
import {GateEffects} from '../naopoyo-chapter2/gate-effects.mjs';
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
import {ForestSession,pointerActor,motionFrame,visualActors} from '../naopoyo-chapter2/session.mjs';
import {playbackClock} from '../naopoyo-chapter2/example-clock.mjs';
import {clone,mass} from './engine.mjs';
const $=id=>document.getElementById(id),canvas=$('board'),progress=new ChapterProgress();
try{progress.restore(localStorage.getItem(STORAGE_KEY));}catch{}
let mode='play',demo=null,demoIndex=progress.index,auto=null,loaded=false,message='',motion=null,frameRequest=null,lastFrame=0,pendingVictory=false,playPresentation=null;
const presentation={motion:[],state:null,active:null},advanceMotion=ForestSession.prototype.animate;
let gateEffects=new GateEffects();
function syncPresentation(){const q=shown();if(presentation.session!==q){presentation.session=q;presentation.state=clone(q.state);gateEffects=new GateEffects();}else Object.assign(presentation.state,q.state);presentation.time=performance.now();}
const positions=new Map(),current=()=>progress.sessions[progress.index],shown=()=>mode==='demo'?demo.session:current();
const input=new BoardInput(()=>current().state,command);
const exampleDialog=document.createElement('dialog');exampleDialog.className='example';exampleDialog.innerHTML=exampleShell();document.body.append(exampleDialog);
const boardHome=canvas.parentElement,exampleArena=exampleDialog.querySelector('.example-arena');exampleArena.querySelector('canvas').remove();
for(const [selector,id]of [['[data-prev]','back'],['[data-next]','forward'],['[data-play]','auto'],['[data-reset]','restart'],['[data-close]','return']])exampleDialog.querySelector(selector).replaceWith($(id));
exampleDialog.querySelector('.example-head strong').replaceWith($('example-stage'));
exampleDialog.querySelector('.example-count').append($('replay-position'));
exampleDialog.addEventListener('cancel',e=>{e.preventDefault();$('return').click();});

function save(){progress.record();try{localStorage.setItem(STORAGE_KEY,progress.serialize());$('saved').textContent='自動保存';}catch{$('saved').textContent='保存できません。この画面を閉じると進行が失われます';}}
function stopAuto(){if(auto!==null)clearInterval(auto);auto=null;}
function cancel(){release();pendingVictory=false;input.cancel();current().endGesture();presentation.motion=[];motion=null;if(frameRequest)cancelAnimationFrame(frameRequest);frameRequest=null;}
function animate(before,r,id,dx,dy){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;presentation.motion.push(motionFrame(before,shown().state,r,id,dx,dy));motion=presentation.motion[0];startFrames();}
function startFrames(){if(!frameRequest){lastFrame=performance.now();frameRequest=requestAnimationFrame(tick);}}
function tick(now){frameRequest=null;if(document.hidden||$('details').open||$('dialog').open){lastFrame=now;frameRequest=requestAnimationFrame(tick);return;}advanceMotion.call(presentation,Math.min(100,Math.max(0,now-lastFrame)),matchMedia('(prefers-reduced-motion: reduce)').matches);lastFrame=now;motion=presentation.motion[0]||null;draw();if(pendingVictory&&!motion){pendingVictory=false;showVictory();}if(motion||gateEffects.pulses.size||sampleEffects(shown()).items.length)frameRequest=requestAnimationFrame(tick);}
function command(id,dx,dy){
 if(!loaded||mode!=='play'||current().cleared)return {ok:false,reason:'view'};
 const before=clone(current().state),r=current().step(id,dx,dy);
 if(!r.ok){message=({wall:'岩や盤面の外へは進めないよ。',corner:'閉じた角は通れないよ。',foothold:'上へ進むには、移動先の下に足場が必要だよ。',gate:'この段階では魔法ゲートを通れないよ。','gate-top':'魔法ゲートの上面は足場。横から通ろう。',terrain:'門や出口の数字を見てみよう。',limit:'やりなおして、もう一度挑戦しよう。'})[r.reason]||'そこへは進めないよ。';render();return r;}
 message='';
 save();animate(before,r,id,dx,dy);render();if(current().cleared){pendingVictory=!!motion;if(!motion)showVictory();}return r;
}
function switchStage(i,revisit=false){if(!progress.unlocked(i))return;stopAuto();cancel();mode='play';progress.index=i;if(revisit&&current().cleared)current().reset();message='';input.select(null);$('predict').checked=false;$('hint-text').hidden=true;save();render();}
function keepPosition(){if(demo){positions.set(demoIndex,{key:solutionKey(demoIndex),index:demo.index});try{localStorage.setItem(STORAGE_KEY+'.examples',JSON.stringify([...positions]));}catch{}}}
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY+'.examples'));if(Array.isArray(saved))for(const [i,p]of saved)if(stages[i]&&p.key===solutionKey(i)&&Number.isInteger(p.index)&&p.index>=0&&p.index<=solutions[i].length)positions.set(i,p);}catch{}
function openDemo(i=progress.index){if(mode==='play')playPresentation={motion:[...presentation.motion],pendingVictory};keepPosition();stopAuto();cancel();mode='demo';demoIndex=i;demo=new ExampleReplay(i);const old=positions.get(i);if(old?.key===solutionKey(i))demo.show(old.index);message='';exampleArena.append(canvas);exampleDialog.showModal();render();}
function demoStep(delta){presentation.motion=[];motion=null;const before=clone(demo.session.state),step=demo.path[demo.index];const changed=delta>0?demo.next():demo.previous();if(!changed){stopAuto();render();return false;}keepPosition();if(delta>0)animate(before,demo.results[demo.index],...step);render();return true;}
stages.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.id+' '+s.title;$('example-stage').append(o);});
function selectScreen(){end();$('content').innerHTML=stageGrid(stages,progress);$('dialog').showModal();for(const b of $('content').querySelectorAll('[data-stage]'))b.onclick=()=>{ $('dialog').close();switchStage(Number(b.dataset.stage),true);};}
function showVictory(){if(mode!=='play'||!current().cleared)return;end();$('content').innerHTML=victory(progress.index);$('dialog').showModal();if($('nextStage'))$('nextStage').onclick=()=>{$('dialog').close();switchStage(progress.index+1);};if($('chapterMap'))$('chapterMap').onclick=selectScreen;}
$('select').onclick=selectScreen;$('close').onclick=()=>$('dialog').close();
function sizeBoard(){const r=document.querySelector('.arena').getBoundingClientRect();document.documentElement.style.setProperty('--board-size',Math.max(1,Math.floor(Math.min(r.width-4,r.height-4)))+'px');draw();}
function draw(){const q=shown(),s=q.state,stage=q.stage;syncPresentation();let state={...s,actors:visualActors(presentation)},selected=null,candidates=[],route=null,turns=[];
 if(mode==='play'&&$('predict').checked&&!q.cleared){const a=s.actors.find(a=>a.id===input.selected),sp=a&&s.spikes.find(p=>Math.max(Math.abs(p.x-a.x),Math.abs(p.y-a.y))===1);if(sp){const p=q.preview(a.id,sp.x-a.x,sp.y-a.y);if(p.result.ok&&p.record.trace){candidates=p.record.trace.candidates.slice(0,p.record.births.length);route=candidates.at(-1)?.path;turns=candidates;}}}
 if(motion){const t=Math.min(1,motion.elapsed/motion.duration);state={...s,actors:contactVisualActors(motion,t)};}
 const a=mode==='play'&&input.down?state.actors.find(a=>a.id===input.gestureActor):null;if(a)selected=[a.x,a.y];
 syncPresentation();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,now=performance.now(),stateEffects=sampleEffects(q,now).items,gates=gateEffects.sample(presentation,state.actors,now,reduced);
 drawBoard(canvas,state,{stage,selected,stateEffects,now,reduced,gates,candidates,route,turns,showRanks:!!candidates.length,target:stage.objective?.target,effects:motion?contactEffects(motion,Math.min(1,motion.elapsed/motion.duration)):[]});
}
function render(){const q=shown(),s=q.stage,isDemo=mode==='demo';$('scene').dataset.scene=s.scene;$('number').textContent=s.id;$('title').textContent=s.title;$('difficulty').textContent='★'.repeat(s.difficulty)+'☆'.repeat(5-s.difficulty);$('goal').textContent=s.goal;$('lesson-text').textContent=s.text;$('lesson-goal').textContent=s.goal;$('hint-text').textContent=s.hint;
 $('phase').textContent=isDemo?'おてほん · 通常プレイと別の盤面':'プレイ中';$('moves').textContent=q.state.moves+' 手';$('mass').textContent='段階合計 '+mass(q.state);$('gravity').textContent=q.state.gravity?'↓ 重力あり':'平面';$('progress').textContent=progress.completed.filter(Boolean).length+' / 10 クリア';
 $('dialogue').textContent=q.cleared?'みんなで、自由へ。':s.text;
 $('status').textContent=message||(q.cleared?'全員脱出！':isDemo?'前後に進めて、操作を確かめよう。':'キャラをタップして選択。なぞって移動。');
 $('play-tools').hidden=isDemo;$('replay').hidden=true;$('predict').disabled=isDemo;$('undo').disabled=!current().actions.length;
 $('ending').hidden=!q.cleared||s.number!==10;
 if(!isDemo&&!q.state.actors.some(a=>a.id===input.selected))input.selected=null;
 if(isDemo){exampleDialog.querySelector('.example-info').textContent=q.cleared?'おてほん おわり！ みんなを救出できたよ。':'1マスずつ、動きを確かめよう。';$('example-stage').value=demoIndex;$('replay-position').textContent=demo.index+' / '+demo.path.length+' 手';$('auto').textContent=auto===null?'自動再生':'一時停止';$('auto').disabled=demo.index===demo.path.length;$('back').disabled=demo.index===0;$('forward').disabled=demo.index===demo.path.length;}
 draw();
}
$('predict').onchange=draw;
$('undo').onclick=()=>{cancel();current().undo();message='';save();render();};$('retry').onclick=()=>{cancel();current().reset();message='';save();render();};$('hint').onclick=()=>{$('hint-text').hidden=false;$('details').showModal();};
$('example').onclick=()=>openDemo();$('example-stage').onchange=()=>openDemo(Number($('example-stage').value));$('return').onclick=()=>{keepPosition();stopAuto();cancel();exampleDialog.close();boardHome.append(canvas);mode='play';presentation.motion=playPresentation?.motion||[];motion=presentation.motion[0]||null;pendingVictory=playPresentation?.pendingVictory||false;playPresentation=null;message='';sizeBoard();render();if(motion)startFrames();else if(pendingVictory){pendingVictory=false;showVictory();}};$('back').onclick=()=>{stopAuto();demoStep(-1);};$('forward').onclick=()=>{stopAuto();demoStep(1);};$('restart').onclick=()=>{stopAuto();presentation.motion=[];motion=null;demo.reset();keepPosition();render();};$('auto').onclick=()=>{if(auto!==null)stopAuto();else{if(demo.index===demo.path.length)return;let clock={elapsed:0},last=performance.now();auto=setInterval(()=>{const now=performance.now();clock=playbackClock(clock,now-last,true,!!motion);last=now;if(!$('details').open&&!$('dialog').open&&clock.advance){demoStep(1);if(demo.index===demo.path.length){stopAuto();render();}}},32);}render();};
function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*8,y:(e.clientY-r.top)/r.height*8};}
let pointer=null;
function release(){const id=pointer;pointer=null;if(id!==null&&canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);}
const end=()=>{input.end();current().endGesture();release();render();};
canvas.onpointerdown=e=>{if(pointer!==null||!loaded||mode!=='play'||$('details').open||$('dialog').open||current().cleared||e.isPrimary===false)return;e.preventDefault();const p=point(e);syncPresentation();const hit=pointerActor(presentation,p)||null;const a=current().state.actors.find(a=>a.id===input.selected);if(!hit&&(!a||Math.max(Math.abs(Math.floor(p.x)-a.x),Math.abs(Math.floor(p.y)-a.y))!==1))return;cancel();pointer=e.pointerId;canvas.setPointerCapture(pointer);current().beginGesture();input.start(p,{hit});render();};
function travel(e){for(const sample of e.getCoalescedEvents?.().length?e.getCoalescedEvents():[e])input.drag(point(sample));render();}
canvas.onpointermove=e=>{if(e.pointerId!==pointer||mode!=='play')return;e.preventDefault();travel(e);};
canvas.onpointerup=e=>{if(e.pointerId!==pointer)return;travel(e);end();};
canvas.onpointercancel=canvas.onlostpointercapture=e=>{if(e.pointerId===pointer)end();};
$('details-open').onclick=()=>{end();$('details').showModal();};$('details-close').onclick=()=>$('details').close();
window.addEventListener('resize',()=>{end();sizeBoard();});document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();if(document.hidden){stopAuto();end();}});
window.addEventListener('keydown',e=>{if(mode!=='play'||current().cleared||$('details').open||$('dialog').open||/INPUT|SELECT|BUTTON/.test(e.target.tagName))return;const d={ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0],Home:[-1,-1],PageUp:[1,-1],End:[-1,1],PageDown:[1,1]}[e.key];if(d){e.preventDefault();cancel();command(input.selected,...d);}});
new ResizeObserver(sizeBoard).observe(document.querySelector('.arena'));window.visualViewport?.addEventListener('resize',sizeBoard);switchStage(progress.index);
const failed=await loadSprites();loaded=!failed.length;if(failed.length)message='キャラクター画像を読み込めません。再読み込みしてください。';render();
