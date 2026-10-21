import {loadSprites,drawSprite} from './sprites.mjs';
import {actorVisual} from './render.mjs';
import {drawCondition,drawGate,drawExit} from './fixtures.mjs';
await loadSprites();
function samples(){const c=document.querySelector('#scales').getContext('2d');c.clearRect(0,0,600,310);
for(const [row,species]of ['dog','fish','penguin','frog'].entries())for(const [col,scale]of [1.2,1.4,1.6].entries()){
c.save();c.translate(35+col*180,20+row*72);c.fillStyle='#334b58';c.font='12px sans-serif';c.fillText(`${species} ×${scale}`,0,-5);c.scale(42,42);
c.strokeStyle='#8ba19d';c.lineWidth=.02;for(let x=0;x<3;x++)c.strokeRect(x,0,1,1);
drawSprite(c,species,6,{x:2.08,y:.035,w:.84,h:.65});drawSprite(c,species,1,actorVisual({x:1,y:0},{w:3,h:2},scale));
if(document.querySelector('#finger').checked){c.fillStyle='#676b7399';c.beginPath();c.arc(1.5,.5,18/42,0,Math.PI*2);c.fill()}c.restore();}}
samples();document.querySelector('#finger').onchange=samples;
const c=document.querySelector('#fixtures').getContext('2d');
for(const [i,condition]of [{species:'dog',max:2},{species:'fish',exact:1},{species:'penguin',min:4},{species:'frog',exact:8},{species:'dog'},{species:'fish'},{}].entries()){
c.save();c.translate(10+i*80,10);c.scale(42,42);
for(let y=0;y<3;y++){const f={x:0,y:y*1.4,...condition,open:y===1};y===2?drawExit(c,f):drawGate(c,f,y===1?1:0);drawCondition(c,f)}c.restore();}
