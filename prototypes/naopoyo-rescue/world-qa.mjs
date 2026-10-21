import {loadSprites,drawSprite} from './sprites.mjs';
import {stages} from './stages.mjs';
import {createState} from './engine.mjs';
import {renderer,actorVisual,gateVisual} from './render.mjs';
import {drawGate,drawCondition,drawExit} from './fixtures.mjs';
import {worldNames,stageThemes} from './themes.mjs';
await loadSprites();
const c=document.querySelector('#conditions').getContext('2d');c.scale(42,42);
for(const [i,f]of [{species:'dog',min:2},{species:'fish',exact:1},{species:'penguin',max:3},{species:'frog'},{}].entries()){
 for(let j=0;j<3;j++){const g={...f,x:.25+i*1.5,y:.15+j*1.25,open:j===1};j===2?drawExit(c,g):drawGate(c,g,j===1?1:0);drawCondition(c,g);}
}
for(const stage of stages){const card=document.createElement('div');card.className='card';const label=document.createElement('p');label.textContent=`${stage.id} ${stage.title} / ${worldNames[stageThemes[stage.id]]}`;const canvas=document.createElement('canvas');canvas.width=336;canvas.height=252;canvas.style.width='336px';const banner=document.createElement('div');banner.className='world-banner';banner.dataset.theme=stageThemes[stage.id];banner.innerHTML='<span class="scenery" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';card.append(label,banner,canvas);document.querySelector('#worlds').append(card);renderer(canvas)(createState(stage),null,0);}
let finger=true;
function compare(){const c=document.querySelector('#dragCompare').getContext('2d');c.clearRect(0,0,336,370);
 for(const [row,species]of ['dog','fish','penguin','frog'].entries())for(const [col,label]of ['A 旧方式','B 標準・上へ10px'].entries()){
 c.save();c.translate(5+col*168,28+row*86);c.fillStyle='#314856';c.font='12px sans-serif';c.fillText(label,4,-8);c.scale(42,42);c.fillStyle='#d6e0dd';c.fillRect(0,0,3.7,1.6);c.strokeStyle='#839e9c';c.lineWidth=.02;
 for(let x=0;x<4;x++)c.strokeRect(x,0,1,1);c.strokeStyle='#a27339';c.beginPath();c.ellipse(1.5,.67,.34,.07,0,0,Math.PI*2);c.stroke();
 const box=actorVisual({x:1,y:0},{w:4,h:2},1.4);if(col===1)box.y-=10/42;
 drawSprite(c,species,6,box);c.fillStyle='#a27339';c.beginPath();c.arc(1.5,.75,.035,0,Math.PI*2);c.fill();
 if(finger){c.fillStyle='#666e7bbb';c.beginPath();c.arc(1.5,.5,18/42,0,Math.PI*2);c.fill();}c.restore();
 }
}
document.querySelector('#finger').onclick=()=>{finger=!finger;compare()};compare();

const reactionCanvas=document.querySelector('#reaction');
const reactionState=createState({id:'10',w:8,h:4,walls:[],exits:[],spikes:[],gates:[{x:3,y:1,species:'dog',min:2}],actors:[{id:'yes',x:2,y:1,level:2,species:'dog'},{id:'no',x:4,y:2,level:1,species:'fish'}]});
let active=null;const reactionDraw=renderer(reactionCanvas);
function showReaction(id){active=id;const v=gateVisual(reactionState,reactionState.gates[0],id);document.querySelector('#reactionResult').textContent=v.open?'開門（通行可）':'閉門（条件に合う子だけ通れます）';}
document.querySelector('#nearYes').onclick=()=>showReaction('yes');document.querySelector('#nearNo').onclick=()=>showReaction('no');document.querySelector('#leave').onclick=()=>showReaction(null);
function frame(t){reactionDraw(reactionState,active,t,active);requestAnimationFrame(frame)}showReaction(null);requestAnimationFrame(frame);
