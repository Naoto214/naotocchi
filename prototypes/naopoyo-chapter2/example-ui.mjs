import {ExampleReplay} from './example-replay.mjs';
import {playbackClock} from './example-clock.mjs';
import {render} from './render.mjs';
import {mass} from '../naopoyo-v2/engine.mjs';
const arrows={'-1,-1':'↖','0,-1':'↑','1,-1':'↗','-1,0':'←','1,0':'→','-1,1':'↙','0,1':'↓','1,1':'↘'};
const labels={split:'分裂',fall:'落下',merge:'合体',swap:'交換',rescue:'救出'};
export function openExample(stage,onClose){
 const dialog=document.createElement('dialog');dialog.className='example';
 dialog.innerHTML=`<div class="example-shell"><div class="example-head"><strong></strong><button data-close>ゲームにもどる</button></div><div class="example-count"></div><div class="example-arena"><canvas aria-label="おてほんの盤面"></canvas></div><div class="example-info" aria-live="polite"></div><div class="example-controls"><button data-prev>前へ</button><button data-next>次へ</button><button data-play>再生</button><button data-reset>最初から</button></div><div class="example-note">おてほんは最初の盤面から。いまの途中盤面はそのまま残ります。</div></div>`;
 document.body.append(dialog);const $=s=>dialog.querySelector(s),canvas=$('canvas');let replay=null,playing=false,last=0,clock={elapsed:0},closed=false;
 function draw(){if(!replay)return;const q=replay.session,rect=canvas.getBoundingClientRect(),width=rect.width;render(canvas,q,{dpr:Math.min(devicePixelRatio||1,2)});
  const step=replay.nextStep,c=canvas.getContext('2d'),ratio=canvas.width/width,cell=width/8;
  if(step&&!q.motion.length){const [x,y]=step.at,[dx,dy]=step.d;c.save();c.setTransform(ratio,0,0,ratio,0,0);c.strokeStyle='#d05a1e';c.lineWidth=3;c.strokeRect(x*cell+2,y*cell+2,cell-4,cell-4);c.strokeStyle='#d05a1e';c.setLineDash([4,3]);c.strokeRect((x+dx)*cell+3,(y+dy)*cell+3,cell-6,cell-6);c.setLineDash([]);c.font=`bold ${cell*.48}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=3;c.strokeStyle='white';c.strokeText(arrows[step.d.join(',')],(x+.5+dx*.5)*cell,(y+.5+dy*.5)*cell);c.fillStyle='#ba3f10';c.fillText(arrows[step.d.join(',')],(x+.5+dx*.5)*cell,(y+.5+dy*.5)*cell);c.restore();}
  $('.example-count').textContent=`おてほん ${replay.index} / ${replay.path.length}手　救出 ${q.state.rescued} / ${mass(q.state)}`;
  const events=replay.index?replay.motions[replay.index-1].events.map(e=>labels[e.type]).filter(Boolean):[];
  $('.example-info').textContent=step?`${events.length?'直前：'+[...new Set(events)].join('・')+'　':''}次：${step.level}（左から${step.at[0]+1}・上から${step.at[1]+1}）${arrows[step.d.join(',')]}`: 'おてほん おわり！ この順番で動かすと、みんなを救出できるよ';
  $('[data-prev]').disabled=replay.index===0;$('[data-next]').disabled=replay.index===replay.path.length;$('[data-play]').disabled=replay.index===replay.path.length;$('[data-play]').textContent=playing?'一時停止':'再生';
 }
 function tick(now){if(closed)return;const delta=last?Math.max(0,now-last):0;last=now;if(replay){replay.session.animate(Math.min(100,delta),globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches);clock=playbackClock(clock,delta,playing,!!replay.session.motion.length);if(clock.advance){replay.next();if(!replay.nextStep)playing=false;}draw();}requestAnimationFrame(tick);}
 $('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{closed=true;dialog.remove();onClose();});
 $('[data-prev]').onclick=()=>{playing=false;replay.previous();draw()};$('[data-next]').onclick=()=>{playing=false;replay.next();draw()};$('[data-reset]').onclick=()=>{playing=false;replay.reset();draw()};$('[data-play]').onclick=()=>{playing=!playing;clock={elapsed:0};draw()};
 $('.example-head strong').textContent=stage.title;$('.example-info').textContent='おてほんを読み込み中…';for(const b of dialog.querySelectorAll('.example-controls button'))b.disabled=true;dialog.showModal();requestAnimationFrame(tick);
 fetch(new URL(`./examples/${stage.number}.json`,import.meta.url)).then(r=>{if(!r.ok)throw Error('load');return r.json()}).then(data=>{if(closed)return;if(data.id!==stage.id)throw Error('stage mismatch');replay=new ExampleReplay(stage,data.path);$('[data-reset]').disabled=false;draw();}).catch(()=>{$('.example-info').textContent='おてほんを読み込めませんでした。ゲームに戻ってください。';for(const b of dialog.querySelectorAll('.example-controls button'))b.disabled=true;});
}
