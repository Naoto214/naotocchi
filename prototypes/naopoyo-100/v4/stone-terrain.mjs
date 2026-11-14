// Comparison only. All geometry is emitted by the unchanged formal terrain painter.
import {drawTerrain} from '../../naopoyo-rescue/themes.mjs';
export const stoneWorlds={sea:{name:'海',tint:[34,139,145]},snow:{name:'雪山',tint:[135,163,191]},forest:{name:'森',tint:[103,135,81]},sky:{name:'空',tint:[125,174,193]},earth:{name:'地中',tint:[148,108,76]},cave:{name:'洞窟',tint:[100,105,143]}};
export const stoneVariants={a:'A · 正式版共通',b:'B · 色と素材感',c:'C · 控えめな装飾'};
// Keep the original luminance structure and alpha; every outline remains intact.
export function materialColor(value,world){
 if(typeof value!=='string'||!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value))return value;
 const rgb=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)),t=stoneWorlds[world].tint;
 return '#'+rgb.map((v,i)=>Math.round(v*.72+t[i]*.28).toString(16).padStart(2,'0')).join('')+value.slice(7);
}
function materialContext(c,world){return new Proxy(c,{get(target,key){if(key==='createLinearGradient'||key==='createRadialGradient')return(...args)=>{const g=target[key](...args);const add=g.addColorStop.bind(g);g.addColorStop=(at,color)=>add(at,materialColor(color,world));return g};const v=Reflect.get(target,key,target);return typeof v==='function'?v.bind(target):v},set(target,key,value){target[key]=['fillStyle','strokeStyle'].includes(key)?materialColor(value,world):value;return true}})}
export function stoneTerrain(c,s,world,variant='b'){
 const walls=s.baseWalls||s.walls,base={...s,id:'01',walls,gravity:false};
 drawTerrain(variant==='a'?c:materialContext(c,world),base);
 if(variant!=='c')return;
 // Maximum four quiet wall details; never on characters, signs or mechanisms.
 const reserved=new Set([...(s.actors||[]),...(s.gates||[]),...(s.exits||[]),...(s.spikes||[]),...(s.layout?.tiles||[])].map(p=>`${p.x},${p.y}`));reserved.add('0,7');
 const spots=walls.filter(([x,y])=>!reserved.has(`${x},${y}`)&&(x+y)%3!==0&&(x+y)%4!==2&&(x*3+y*5)%7===1).slice(0,4);
 for(const[x,y]of spots){c.save();c.translate(x,y);c.lineWidth=.022;
 if(world==='sea'){c.strokeStyle='#b4d7c2';c.globalAlpha=.65;c.beginPath();c.moveTo(.23,.76);c.quadraticCurveTo(.23,.67,.18,.60);c.moveTo(.23,.7);c.quadraticCurveTo(.32,.66,.31,.59);c.stroke()}
 else if(world==='snow'){c.fillStyle='#e3edf0';c.globalAlpha=.65;c.beginPath();c.moveTo(.21,.12);c.quadraticCurveTo(.42,.07,.66,.12);c.lineTo(.65,.16);c.quadraticCurveTo(.4,.13,.22,.17);c.closePath();c.fill()}
 else if(world==='forest'){c.fillStyle='#8cab72';c.globalAlpha=.6;for(const[a,b,r]of [[.2,.7,.045],[.27,.75,.05],[.32,.71,.04]]){c.beginPath();c.ellipse(a,b,r,r*.6,-.3,0,7);c.fill()}}
 c.restore();}
}
