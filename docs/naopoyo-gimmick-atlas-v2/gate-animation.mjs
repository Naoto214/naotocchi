import {GateTransitions} from './ref/prototypes/naopoyo-shared/gate-animation.mjs';
import {paintGate,gateVisual} from './ref/prototypes/naopoyo-shared/gate-design.mjs';
import {matchesCondition} from './ref/prototypes/naopoyo-rescue/conditions.mjs';
import {drawBoard} from './ref/prototypes/naopoyo-time-hand-chapter1/draw.mjs';
import {createState} from './ref/prototypes/naopoyo-time-hand-chapter1/engine.mjs';
import {stages} from './ref/prototypes/naopoyo-100/stages.mjs';
import {loadSprites} from './ref/prototypes/naopoyo-rescue/sprites.mjs';
const $=s=>document.querySelector(s),conditions={exact2:{exact:2},min4:{min:4},max3:{max:3},exact8:{exact:8}},motion=new GateTransitions(),pref=matchMedia('(prefers-reduced-motion: reduce)'),stage=stages.find(s=>s.id==='07');
let raf=null,cycle=[],ready=false;
const condition=()=>conditions[$('#condition').value],met=()=>matchesCondition({species:'dog',level:Number($('#level').value)},condition());
for(const [index,name]of ['閉鎖','開放','再閉鎖'].entries()){$('#states').insertAdjacentHTML('beforeend',`<article><h3>${name}</h3>${[36,48].map(size=>`<canvas data-size="${size}" data-open="${index===1?1:0}" aria-label="${name} ${size}px"></canvas><small>${size}px</small>`).join('')}</article>`)}
function tile(canvas,frame){const size=Number(canvas.dataset.size)||parseFloat(getComputedStyle(canvas).width),dpr=Math.min(devicePixelRatio||1,2);canvas.style.width=canvas.style.height=size+'px';canvas.width=canvas.height=Math.round(size*dpr);const c=canvas.getContext('2d');c.scale(canvas.width,canvas.height);c.fillStyle='#637d7d';c.fillRect(0,0,1,1);paintGate(c,{...condition(),x:0,y:0},frame)}
function paint(now=performance.now()){
 if(!ready)return;const frame=motion.sample('preview',met(),now,pref.matches);
 for(const id of ['live-large','live36','live48'])tile($('#'+id),frame);
 for(const c of document.querySelectorAll('[data-open]'))tile(c,{opening:Number(c.dataset.open),glow:0});
 const board=$('#board'),unit=Number($('#board-size').value),s=createState(stage.board);board.style.width=board.style.height=unit*8+'px';drawBoard(board,s,{gates:s.gates.map(g=>gateVisual({...g,...condition(),exact:condition().exact,min:condition().min,max:condition().max,...frame})),now,reduced:pref.matches});
 if(motion.active&&!raf)raf=requestAnimationFrame(tick);
}
function tick(now){raf=null;paint(now)}
function status(){const pass=met();$('#step-status').textContent=`段階 ${$('#level').value}：${pass?'条件一致 · 今すぐ通行できます':'条件不一致 · 通れません'}`;$('#step-status').className=pass?'badge':'';$('#motion-note').textContent=pref.matches?'端末の「視差効果を減らす」に合わせ、光と補間を省いて切り替えます。':'開閉は0.28秒。開くときだけ柔らかく光ります。';paint()}
function stop(){for(const id of cycle)clearTimeout(id);cycle=[];$('#cycle').disabled=false}
function setMet(value){$('#level').value=String(Array.from({length:8},(_,i)=>i+1).find(level=>matchesCondition({species:'dog',level},condition())===value));status()}
$('#open').onclick=()=>{stop();setMet(true)};$('#close').onclick=()=>{stop();setMet(false)};
$('#cycle').onclick=()=>{stop();setMet(false);$('#cycle').disabled=true;cycle=[setTimeout(()=>setMet(true),700),setTimeout(()=>setMet(false),1700),setTimeout(stop,2100)]};
for(const id of ['level','condition'])$('#'+id).onchange=()=>{stop();status()};$('#board-size').onchange=()=>paint();pref.addEventListener('change',status);window.addEventListener('pagehide',stop);
const failures=await loadSprites();if(failures.length)throw Error('素材の読み込みに失敗');ready=true;status();document.documentElement.dataset.ready='true';
