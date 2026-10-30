import {drawSprite} from '../naopoyo-rescue/sprites.mjs';
import {drawStone} from '../naopoyo-chapter2/stone.mjs';
import {drawGate} from '../naopoyo-chapter2/gate-art.mjs';
import {drawExit,drawCondition} from '../naopoyo-rescue/fixtures.mjs';
import {blockedReason} from './priorities.mjs';
// Same procedural spike asset as the shipped forest renderer.
function drawSpike(c,p){c.fillStyle='#ac7089';c.fillRect(p.x+.1,p.y+.75,.8,.13);for(let n=0;n<p.power;n++){const x=p.x+.5+(n-(p.power-1)/2)*.23;c.beginPath();c.moveTo(x-.11,p.y+.75);c.lineTo(x,p.y+.32);c.lineTo(x+.11,p.y+.75);c.fill();}}
export function drawBoard(canvas,s,{candidates=[],showRanks=false,route=null,children=[],selected=null,origin=null}={}){
 const width=canvas.getBoundingClientRect().width||320,dpr=Math.min(3,globalThis.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(width*dpr);const c=canvas.getContext('2d');c.setTransform(dpr*width/8,0,0,dpr*width/8,0,0);
 const rawFill=c.fillText.bind(c),rawStroke=c.strokeText.bind(c);const text=(fn,t,x,y)=>{const font=c.font;c.save();c.translate(x,y);c.scale(.01,.01);c.font=font.replace(/([\d.]+)px/,(_,n)=>`${Number(n)*100}px`);fn(t,0,0);c.restore();};c.fillText=(t,x,y)=>text(rawFill,t,x,y);c.strokeText=(t,x,y)=>text(rawStroke,t,x,y);
 c.fillStyle='#e8efde';c.fillRect(0,0,8,8);for(let y=0;y<8;y++)for(let x=0;x<8;x++){c.fillStyle=(x+y)%2?'#e2ecd9':'#eff4e8';c.fillRect(x,y,1,1);c.strokeStyle='#aabcaa55';c.lineWidth=.015;c.strokeRect(x,y,1,1);}
 if(showRanks)for(const p of candidates){c.fillStyle=p.distance===1?'#b6dded99':'#f5d4a699';c.fillRect(p.x+.02,p.y+.02,.96,.96);}
 for(const [x,y]of s.walls)drawStone(c,x,y);for(const g of s.gates)drawGate(c,{...g,openAmount:g.open?1:0});for(const e of s.exits){drawExit(c,e);drawCondition(c,e);}for(const p of s.spikes)drawSpike(c,p);
 for(const a of s.actors){c.fillStyle='#284e3830';c.beginPath();c.ellipse(a.x+.5,a.y+.91,.29,.07,0,0,7);c.fill();drawSprite(c,a.species,a.level,{x:a.x+.12,y:a.y+.17,w:.76,h:.76});c.font='bold .23px system-ui';c.textAlign='center';c.textBaseline='middle';c.lineWidth=.055;c.strokeStyle='#fff';c.strokeText(a.level,a.x+.8,a.y+.19);c.fillStyle='#294939';c.fillText(a.level,a.x+.8,a.y+.19);}
 if(showRanks){for(let y=0;y<8;y++)for(let x=0;x<8;x++){if(origin&&x===origin.x&&y===origin.y)continue;const p=candidates.find(p=>p.x===x&&p.y===y);if(!p){if(origin&&Math.max(Math.abs(x-origin.x),Math.abs(y-origin.y))<=2){c.fillStyle='#43544690';c.font='.28px system-ui';c.textAlign='left';c.fillText('×',x+.08,y+.27);}continue;}c.fillStyle=p.distance===1?'#175b81':'#955817';c.beginPath();c.roundRect(p.x+.04,p.y+.04,.43,.35,.09);c.fill();c.fillStyle='#fff';c.font='bold .22px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(p.order<=20?String.fromCodePoint(0x2460+p.order-1):String.fromCodePoint(0x3251+p.order-21),p.x+.255,p.y+.215);}}
 children.forEach((a,i)=>{const actual=s.actors.find(p=>p.id===a.id);if(!actual)return;c.strokeStyle='#d58d2a';c.lineWidth=.045;c.strokeRect(actual.x+.04,actual.y+.04,.92,.92);c.fillStyle='#6d460a';c.font='bold .2px system-ui';c.textAlign='center';c.fillText(`${i+1}体目`,actual.x+.5,actual.y+.78);});
 if(route){c.strokeStyle='#d15a36';c.lineWidth=.065;c.setLineDash([.12,.07]);c.beginPath();route.forEach(([x,y],i)=>{if(i)c.lineTo(x+.5,y+.5);else c.moveTo(x+.5,y+.5)});c.stroke();c.setLineDash([]);for(const [x,y]of route){c.fillStyle='#d15a36';c.beginPath();c.arc(x+.5,y+.5,.065,0,7);c.fill();}}
 if(selected){c.strokeStyle='#ca7140';c.lineWidth=.08;c.strokeRect(selected[0]+.05,selected[1]+.05,.9,.9);}
 c.font='.14px system-ui';c.textAlign='left';c.textBaseline='bottom';c.fillStyle='#38503a99';for(let y=0;y<8;y++)for(let x=0;x<8;x++)c.fillText(`${'ABCDEFGH'[x]}${y+1}`,x+.04,y+.98);c.fillText=rawFill;c.strokeText=rawStroke;
}
