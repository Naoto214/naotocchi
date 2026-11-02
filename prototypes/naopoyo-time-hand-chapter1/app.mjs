import {ChapterProgress} from './progress.mjs';
import {STORAGE_KEY} from './session.mjs';
import {stages} from './stages.mjs';
import {solutions} from './solutions.mjs';
import {ExampleReplay,solutionKey} from './replay.mjs';
import {BoardInput} from './input.mjs';
import {drawBoard} from './draw.mjs';
import {loadSprites,speciesNames} from '../naopoyo-rescue/sprites.mjs';
import {contactVisualActors} from '../naopoyo-chapter2/contact-motion.mjs';
import {clone,mass} from './engine.mjs';
const $=id=>document.getElementById(id),canvas=$('board'),progress=new ChapterProgress();
try{progress.restore(localStorage.getItem(STORAGE_KEY));}catch{}
let mode='play',demo=null,demoIndex=progress.index,auto=null,loaded=false,message='',motion=null,frameRequest=null;
const positions=new Map(),current=()=>progress.sessions[progress.index],shown=()=>mode==='demo'?demo.session:current();
const input=new BoardInput(()=>current().state,command);
function save(){progress.record();try{localStorage.setItem(STORAGE_KEY,progress.serialize());$('saved').textContent='自動保存';}catch{$('saved').textContent='保存できません。この画面を閉じると進行が失われます';}}
function stopAuto(){if(auto!==null)clearInterval(auto);auto=null;}
function cancel(){input.cancel();current().endGesture();motion=null;if(frameRequest)cancelAnimationFrame(frameRequest);frameRequest=null;}
function animate(before,r,id,dx,dy){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;motion={before,after:clone(shown().state),events:r.events,id,dx,dy,start:performance.now(),duration:r.split?440:200};if(frameRequest)cancelAnimationFrame(frameRequest);frameRequest=requestAnimationFrame(tick);}
function tick(){frameRequest=null;if(!motion)return;draw();if(performance.now()-motion.start<motion.duration)frameRequest=requestAnimationFrame(tick);else{motion=null;draw();}}
function command(id,dx,dy){
 if(!loaded||mode!=='play'||current().cleared)return {ok:false,reason:'view'};
 const before=clone(current().state),r=current().step(id,dx,dy);
 if(!r.ok){message=({wall:'岩や盤面の外へは進めないよ。',corner:'閉じた角は通れないよ。',foothold:'上へ進むには、移動先の下に足場が必要だよ。',captive:'まず金の封印を解いて、牢を開こう。',gate:'この段階では魔法ゲートを通れないよ。','gate-top':'魔法ゲートの上面は足場。横から通ろう。',terrain:'出口の封印を解こう。上の目標を見てね。',limit:'やりなおして、もう一度挑戦しよう。'})[r.reason]||'そこへは進めないよ。';render();return r;}
 message=r.events.some(e=>e.type==='release')?'牢が開いた！ 恋人を選んで動かせるよ。':r.events.some(e=>e.type==='partner-help')?'「今度はわたしの番」出口の封印がほどけた。':'';
 save();render();animate(before,r,id,dx,dy);return r;
}
function switchStage(i){if(!progress.unlocked(i))return;stopAuto();cancel();mode='play';progress.index=i;message='';input.select(current().state.actors[0]?.id??null);$('predict').checked=i<3;$('hint-text').hidden=true;save();render();}
function keepPosition(){if(demo){positions.set(demoIndex,{key:solutionKey(demoIndex),index:demo.index});try{localStorage.setItem(STORAGE_KEY+'.examples',JSON.stringify([...positions]));}catch{}}}
try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY+'.examples'));if(Array.isArray(saved))for(const [i,p]of saved)if(stages[i]&&p.key===solutionKey(i)&&Number.isInteger(p.index)&&p.index>=0&&p.index<=solutions[i].length)positions.set(i,p);}catch{}
function openDemo(i=progress.index){keepPosition();stopAuto();cancel();mode='demo';demoIndex=i;demo=new ExampleReplay(i);const old=positions.get(i);if(old?.key===solutionKey(i))demo.show(old.index);message='';render();}
function demoStep(delta){motion=null;const before=clone(demo.session.state),step=demo.path[demo.index];const changed=delta>0?demo.next():demo.previous();if(!changed){stopAuto();render();return false;}keepPosition();render();if(delta>0)animate(before,{events:demo.events[demo.index],split:demo.events[demo.index].some(e=>e.type==='split')},...step);return true;}
const dirs=[[-1,-1,'↖'],[0,-1,'↑'],[1,-1,'↗'],[-1,0,'←'],[0,0,'●'],[1,0,'→'],[-1,1,'↙'],[0,1,'↓'],[1,1,'↘']];
for(const [dx,dy,label]of dirs){const b=document.createElement(dx||dy?'button':'span');b.textContent=label;if(dx||dy){b.setAttribute('aria-label',label+'へ移動');b.onclick=()=>{cancel();command(input.selected,dx,dy);};}$('directions').append(b);}
stages.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.id;b.title=s.title;b.onclick=()=>switchStage(i);$('stages').append(b);const o=document.createElement('option');o.value=i;o.textContent=s.id+' '+s.title;$('example-stage').append(o);});
function draw(){const q=shown(),s=q.state,stage=q.stage;let state=s,selected=null,candidates=[],route=null,turns=[];
 if(mode==='play'&&$('predict').checked&&!q.cleared){const a=s.actors.find(a=>a.id===input.selected),sp=a&&s.spikes.find(p=>Math.max(Math.abs(p.x-a.x),Math.abs(p.y-a.y))===1);if(sp){const p=q.preview(a.id,sp.x-a.x,sp.y-a.y);if(p.result.ok&&p.record.trace){candidates=p.record.trace.candidates.slice(0,p.record.births.length);route=candidates.at(-1)?.path;turns=candidates;}}}
 if(motion){const t=Math.min(1,(performance.now()-motion.start)/motion.duration);state={...s,actors:contactVisualActors(motion,t)};}
 const a=state.actors.find(a=>a.id===(mode==='play'?input.selected:demo.path[demo.index]?.[0]));if(a)selected=[a.x,a.y];
 drawBoard(canvas,state,{stage,selected,candidates,route,turns,showRanks:!!candidates.length,target:stage.objective?.target});
}
function render(){const q=shown(),s=q.stage,isDemo=mode==='demo';$('scene').dataset.scene=s.scene;$('number').textContent=s.id;$('title').textContent=s.title;$('difficulty').textContent='★'.repeat(s.difficulty)+'☆'.repeat(5-s.difficulty);$('goal').textContent=s.goal;$('hint-text').textContent=s.hint;
 $('phase').textContent=isDemo?'おてほん · 通常プレイと別の盤面':'プレイ中';$('moves').textContent=q.state.moves+' 手';$('mass').textContent='段階合計 '+mass(q.state);$('gravity').textContent=q.state.gravity?'重力あり · 仲間も足場':'平面';$('progress').textContent=progress.completed.filter(Boolean).length+' / 10 クリア';
 $('dialogue').textContent=q.cleared?(s.number===10?'ふたりの向こうに、仲間たちの足音。まだ知らない洞窟へ。':'「みんな、行こう」次の光が見えてきた。'):s.cage?(q.state.partnerHelp?'「道を開けたよ。一緒に行こう」':q.state.cageOpen?'「会いたかった。今度は、わたしが道を開くね」':q.state.actors.some(a=>a.id!=='partner'&&Math.abs(a.x-6)+Math.abs(a.y-3)<=3)?'鉄格子の向こうで、なつかしい顔がほほえんだ。':s.text):s.text;
 $('seal').textContent=s.cage?(!q.state.cageOpen?'金の封印：段階3で金の印へ':!q.state.partnerHelp?'牢が開いた：恋人で青い♡の印へ':'出口が開いた：全員で光へ'):q.state.learned?'出口の封印がほどけた · 全員で出口へ':'目標を達成すると出口の封印がほどける';
 $('status').textContent=message||(q.cleared?'全員脱出！':isDemo?'前後に進めて、操作を確かめよう。':'キャラを選んで、隣へタップ・ドラッグ。');
 [...$('stages').children].forEach((b,i)=>{b.disabled=!progress.unlocked(i);b.textContent=stages[i].id+(progress.completed[i]?'✓':'');b.classList.toggle('done',progress.completed[i]);b.setAttribute('aria-current',String(!isDemo&&i===progress.index));});
 $('play-tools').hidden=isDemo;$('movement').hidden=isDemo;$('replay').hidden=!isDemo;$('example').hidden=isDemo;$('predict').disabled=isDemo;$('undo').disabled=!current().actions.length;
 $('next').hidden=isDemo||!q.cleared||progress.index===9;$('ending').hidden=!q.cleared||s.number!==10;
 if(!isDemo&&!q.state.actors.some(a=>a.id===input.selected))input.selected=q.state.actors.find(a=>!s.cage||q.state.cageOpen||a.id!==s.cage.actor)?.id??null;
 const value=input.selected;$('actor').replaceChildren(...q.state.actors.map(a=>{const o=document.createElement('option');o.value=a.id;o.textContent=(a.id==='partner'?'恋人 · ':a.id==='friend'?'仲間 · ':'')+speciesNames[a.species]+' '+a.level+' ('+'ABCDEFGH'[a.x]+(a.y+1)+')';o.disabled=!!(s.cage&&!q.state.cageOpen&&a.id===s.cage.actor);return o;}));$('actor').value=value??'';
 for(const b of $('directions').querySelectorAll('button'))b.disabled=!loaded||q.cleared;$('actor').disabled=q.cleared;
 if(isDemo){$('example-stage').value=demoIndex;$('replay-position').textContent=demo.index+' / '+demo.path.length+' 手';$('auto').textContent=auto===null?'自動再生':'一時停止';$('back').disabled=demo.index===0;$('forward').disabled=demo.index===demo.path.length;}
 draw();
}
$('actor').onchange=()=>{cancel();input.select($('actor').value);render();};$('predict').onchange=draw;
$('undo').onclick=()=>{cancel();current().undo();message='';save();render();};$('retry').onclick=()=>{cancel();current().reset();message='';save();render();};$('hint').onclick=()=>{$('hint-text').hidden=!$('hint-text').hidden;};$('next').onclick=()=>switchStage(progress.index+1);
$('example').onclick=()=>openDemo();$('example-stage').onchange=()=>openDemo(Number($('example-stage').value));$('return').onclick=()=>{keepPosition();stopAuto();cancel();mode='play';message='';render();};$('back').onclick=()=>{stopAuto();demoStep(-1);};$('forward').onclick=()=>{stopAuto();demoStep(1);};$('restart').onclick=()=>{stopAuto();motion=null;demo.reset();keepPosition();render();};$('auto').onclick=()=>{if(auto!==null)stopAuto();else{if(demo.index===demo.path.length)demo.reset();auto=setInterval(()=>demoStep(1),850);}render();};
function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*8,y:(e.clientY-r.top)/r.height*8};}
canvas.onpointerdown=e=>{if(!loaded||mode!=='play'||current().cleared||e.isPrimary===false)return;e.preventDefault();cancel();canvas.setPointerCapture(e.pointerId);current().beginGesture();input.start(point(e));render();};canvas.onpointermove=e=>{if(e.isPrimary===false||mode!=='play')return;input.drag(point(e));render();};
const end=()=>{input.end();current().endGesture();};canvas.onpointerup=end;canvas.onpointercancel=end;canvas.onlostpointercapture=end;
window.addEventListener('resize',()=>{cancel();render();});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAuto();cancel();render();}});
window.addEventListener('keydown',e=>{if(mode!=='play'||/INPUT|SELECT|BUTTON/.test(e.target.tagName))return;const d={ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0]}[e.key];if(d){e.preventDefault();cancel();command(input.selected,...d);}});
new ResizeObserver(()=>draw()).observe(canvas);switchStage(progress.index);
const failed=await loadSprites();loaded=!failed.length;if(failed.length)message='キャラクター画像を読み込めません。再読み込みしてください。';render();
