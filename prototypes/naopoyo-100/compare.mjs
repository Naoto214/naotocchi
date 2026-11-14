import {stages} from '../naopoyo-time-hand-chapter1/stages.mjs';
import {solutions} from '../naopoyo-time-hand-chapter1/solutions.mjs';
import {createState,move} from '../naopoyo-time-hand-chapter1/engine.mjs';
import {drawBoard} from '../naopoyo-time-hand-chapter1/draw.mjs';
import {createGameState,gameMove} from './engine.mjs';
import {loadArt,renderBoard,gravitySignImage} from './render.mjs';
import {Presentation} from './presentation.mjs';
const $=s=>document.querySelector(s),left=$('#formal'),right=$('#prototype'),a=new Presentation(),b=new Presentation();
let index=0,position=0,formal,prototype,raf=null,last=0;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const physical=s=>JSON.stringify([s.actors,s.gates,s.walls,s.rescued,s.rescuedBySpecies,s.moves,s.nextId]);
function paint(){const now=performance.now(),x=a.frame(now,reduced()),y=b.frame(now,reduced());drawBoard(left,x.state,{...x,gravitySign:gravitySignImage()});renderBoard(right,y.state,y)}
function reset(){if(raf)cancelAnimationFrame(raf);raf=null;position=0;formal=createState(stages[index].board);prototype=createGameState(stages[index].board);a.reset(formal);b.reset(prototype);paint();$('#step').disabled=false;$('#result').textContent=`${stages[index].id} ${stages[index].title} · 初期配置`}
function tick(now){raf=null;a.advance(Math.min(100,now-last),reduced());b.advance(Math.min(100,now-last),reduced());last=now;paint();if(a.motion.length||b.motion.length)raf=requestAnimationFrame(tick)}
function step(animated=true){if(position>=solutions[index].length)return;const [id,dx,dy]=solutions[index][position],beforeA=structuredClone(formal),beforeB=structuredClone(prototype),r=move(formal,id,dx,dy),s=gameMove(prototype,id,dx,dy);position++;
 const equal=r.ok===s.ok&&physical(formal)===physical(prototype)&&JSON.stringify(r.events)===JSON.stringify(s.events);if(!equal)throw Error('正式版との挙動差分を検出');
 a.queue(beforeA,formal,r,id,dx,dy,!animated||reduced());b.queue(beforeB,prototype,s,id,dx,dy,!animated||reduced());paint();$('#step').disabled=position===solutions[index].length;$('#result').textContent=`${position} / ${solutions[index].length} 手 · 物理状態・接触イベント一致`;
 if(animated&&!raf){last=performance.now();raf=requestAnimationFrame(tick)}
}
$('#stage').innerHTML=stages.map((s,i)=>`<option value="${i}">${s.id} ${s.title}</option>`).join('');$('#stage').onchange=()=>{index=Number($('#stage').value);reset()};$('#reset').onclick=reset;$('#step').onclick=()=>step();
$('#audit').onclick=()=>{let count=0,pixels=0;for(index=0;index<stages.length;index++){reset();for(let i=0;i<solutions[index].length;i++){step(false);count++;const x=left.getContext('2d').getImageData(0,0,left.width,left.height).data,y=right.getContext('2d').getImageData(0,0,right.width,right.height).data;if(x.length!==y.length||x.some((v,j)=>v!==y[j]))pixels++}}index=0;$('#stage').value=0;reset();$('#result').textContent=`全10面・${count}手の物理状態とイベント一致。描画ピクセル差分：${pixels}状態。`;document.documentElement.dataset.audit=String(pixels===0)};
const errors=await loadArt();if(errors.length)throw Error('画像の読み込みに失敗');reset();document.documentElement.dataset.ready='true';
window.addEventListener('resize',paint);
