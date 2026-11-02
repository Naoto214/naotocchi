import {drawDungeonFloor,drawDungeonWallDetails} from './dungeon-art.mjs';
import {drawActors} from '../naopoyo-chapter1/render.mjs';
import {drawStone} from '../naopoyo-chapter2/stone.mjs';
import {drawGate} from '../naopoyo-chapter2/gate-art.mjs';
import {drawExit,drawCondition} from '../naopoyo-rescue/fixtures.mjs';
import {blockedReason} from './priorities.mjs';
// Same procedural spike asset as the shipped forest renderer.
function drawSpike(c,p){c.fillStyle='#ac7089';c.fillRect(p.x+.1,p.y+.75,.8,.13);const spacing=Math.min(.23,.8/p.power),half=Math.min(.11,spacing*.48);for(let n=0;n<p.power;n++){const x=p.x+.5+(n-(p.power-1)/2)*spacing;c.beginPath();c.moveTo(x-half,p.y+.75);c.lineTo(x,p.y+.32);c.lineTo(x+half,p.y+.75);c.fill();}}
export function drawBoard(canvas,s,{candidates=[],showRanks=false,route=null,turns=[],children=[],selected=null,origin=null,target=null,stage=null,debugCoordinates=false,effects=[],stateEffects=[],now=performance.now(),reduced=false,gates=s.gates}={}){
 const width=canvas.getBoundingClientRect().width||320,dpr=Math.min(2,globalThis.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(width*dpr);const c=canvas.getContext('2d');c.setTransform(dpr*width/8,0,0,dpr*width/8,0,0);
 const rawFill=c.fillText.bind(c),rawStroke=c.strokeText.bind(c);const text=(fn,t,x,y)=>{const font=c.font;c.save();c.translate(x,y);c.scale(.01,.01);c.lineWidth*=100;c.font=font.replace(/([\d.]+)px/,(_,n)=>`${Number(n)*100}px`);fn(t,0,0);c.restore();};c.fillText=(t,x,y)=>text(rawFill,t,x,y);c.strokeText=(t,x,y)=>text(rawStroke,t,x,y);
 drawDungeonFloor(c,s,stage?.scene);
 if(showRanks)for(const p of candidates){c.fillStyle=p.distance===1?'#b6dded99':'#f5d4a699';c.fillRect(p.x+.02,p.y+.02,.96,.96);}
 for(const [x,y]of s.walls)drawStone(c,x,y);drawDungeonWallDetails(c,s,stage?.scene);for(const g of gates)drawGate(c,g);for(const e of s.exits){drawExit(c,e);drawCondition(c,e);}for(const p of s.spikes)drawSpike(c,p);
 if(target){c.strokeStyle='#b88b36';c.lineWidth=.055;c.strokeRect(target[0]+.05,target[1]+.05,.9,.9);c.fillStyle='#a36b19';c.font='.4px system-ui';c.textAlign='center';c.fillText('★',target[0]+.5,target[1]+.55);}
 const cell=width/8,active=selected?{id:s.actors.find(a=>a.x===selected[0]&&a.y===selected[1])?.id}:null;
 c.save();c.setTransform(dpr,0,0,dpr,0,0);
 // Formal chapter1 geometry/lift/shadow/number painter, no rejected square frame.
 // Restore native text methods while drawing in pixel coordinates.
 c.fillText=rawFill;c.strokeText=rawStroke;
 drawActors(c,s,active,cell,width,stateEffects,now,reduced,false,true);
 c.fillText=(t,x,y)=>text(rawFill,t,x,y);c.strokeText=(t,x,y)=>text(rawStroke,t,x,y);c.restore();
 if(showRanks){for(let y=0;y<8;y++)for(let x=0;x<8;x++){if(origin&&x===origin.x&&y===origin.y)continue;const p=candidates.find(p=>p.x===x&&p.y===y);if(!p){if(origin&&Math.max(Math.abs(x-origin.x),Math.abs(y-origin.y))<=2){c.fillStyle='#43544690';c.font='.28px system-ui';c.textAlign='left';c.fillText('×',x+.08,y+.27);}continue;}c.fillStyle=p.distance===1?'#175b81':'#955817';c.beginPath();c.roundRect(p.x+.04,p.y+.04,.43,.35,.09);c.fill();c.fillStyle='#fff';c.font='bold .22px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(p.order<=20?String.fromCodePoint(0x2460+p.order-1):String.fromCodePoint(0x3251+p.order-21),p.x+.255,p.y+.215);}}
 children.forEach((a,i)=>{const actual=s.actors.find(p=>p.id===a.id);if(!actual)return;c.strokeStyle='#d58d2a';c.lineWidth=.045;c.strokeRect(actual.x+.04,actual.y+.04,.92,.92);c.fillStyle='#6d460a';c.font='bold .2px system-ui';c.textAlign='center';c.fillText(`${i+1}体目`,actual.x+.5,actual.y+.78);});
 if(route){c.strokeStyle='#d15a36';c.lineWidth=.065;c.setLineDash([.12,.07]);c.beginPath();route.forEach(([x,y],i)=>{if(i)c.lineTo(x+.5,y+.5);else c.moveTo(x+.5,y+.5)});c.stroke();c.setLineDash([]);for(const [x,y]of route){c.fillStyle='#d15a36';c.beginPath();c.arc(x+.5,y+.5,.065,0,7);c.fill();}}
 if(route){for(let i=1;i<route.length;i++){const [x,y]=route[i],prev=route[i-1],angle=Math.atan2(y-prev[1],x-prev[0]);c.save();c.translate(x+.5,y+.5);c.rotate(angle);c.fillStyle='#c45736';c.beginPath();c.moveTo(-.04,0);c.lineTo(-.24,-.11);c.lineTo(-.24,.11);c.closePath();c.fill();c.restore();}}
 for(const p of turns.filter(p=>p.turns)){c.fillStyle='#a93d28';c.font='bold .27px system-ui';c.textAlign='center';c.fillText('↻'+p.turns,p.from[0]+.5,p.from[1]+.2);}
 for(const e of effects){c.save();c.globalAlpha=Math.max(0,1-e.progress);c.strokeStyle='#bc8c3a';c.lineWidth=2/(width/8);c.beginPath();c.arc(e.x+.5,e.y+.5,.15+e.progress*.38,0,Math.PI*2);c.stroke();c.restore();}
 c.font='.14px system-ui';c.textAlign='left';c.textBaseline='bottom';c.fillStyle='#38503a99';if(debugCoordinates)for(let y=0;y<8;y++)for(let x=0;x<8;x++)c.fillText(`${'ABCDEFGH'[x]}${y+1}`,x+.04,y+.98);c.fillText=rawFill;c.strokeText=rawStroke;
}

