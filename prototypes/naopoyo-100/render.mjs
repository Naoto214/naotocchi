import {paintTile} from '../../docs/naopoyo-gimmick-atlas-v2/tile-art.mjs';
import {drawTerrain} from '../naopoyo-rescue/themes.mjs';
import {loadSprites,drawSprite,spriteSpec,speciesNames} from '../naopoyo-rescue/sprites.mjs';
import {describeTiles} from './engine.mjs';
export {speciesNames};
const art={},terrain={};
export async function loadArt(){
 const failures=await loadSprites();
 await Promise.all(Object.entries({gravity:'prototypes/naopoyo-time-hand-chapter1/assets/gravity-wood-approved.webp',owl:'assets/characters/companions/owl.png',forest_bear:'assets/characters/partners/forest_bear.png',otter:'assets/characters/companions/otter.png',squirrel:'assets/characters/companions/squirrel.png',penguin_friend:'assets/characters/companions/penguin_friend.png'}).map(([key,path])=>new Promise(resolve=>{const i=new Image();i.onload=()=>{art[key]=i;resolve()};i.onerror=()=>{failures.push(path);resolve()};i.src=new URL('../../'+path,import.meta.url).href})));
 const source=document.createElement('canvas');source.width=source.height=512;const c=source.getContext('2d');c.scale(64,64);drawTerrain(c,{id:'01',w:8,h:8,walls:[[1,0]],exits:[],gravity:false});
 for(const [key,x,y] of [['terrain.floor',3,2],['terrain.wall',1,0]]){const t=document.createElement('canvas');t.width=t.height=96;t.getContext('2d').drawImage(source,x*64,y*64,64,64,0,0,96,96);terrain[key]=t;}
 return failures;
}
export const spriteUrl=a=>new URL('../../'+spriteSpec(a.species,a.level).path,import.meta.url).href;
const label=p=>p.exact!==undefined?'='+p.exact:p.min!==undefined?'≥'+p.min:p.max!==undefined?'≤'+p.max:'';
const colors=['#efd087','#b1e4d8','#c2b8ef','#f1b5bc','#bade8b','#96cbe9'];
function tint(id){let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return colors[h%colors.length]}
export function tile(c,id,p={},mask=0){
 c.save();
 if(terrain[id])c.drawImage(terrain[id],0,0,1,1);
 else if(id==='fixture.spike'){
  c.fillStyle='#ba879e';c.fillRect(.09,.73,.82,.11);const count=p.power||1;for(let n=0;n<count;n++){const x=.5+(n-(count-1)/2)*.25;c.fillStyle='#f2b7ce';c.beginPath();c.moveTo(x-.13,.75);c.lineTo(x,.28);c.lineTo(x+.13,.75);c.fill()}
 }else{
  const directional=['field.wind','field.current','field.wave','fixture.oneway'].includes(id);
  if(directional){const dx=p.dx??({N:0,E:1,S:0,W:-1}[p.direction]??1),dy=p.dy??({N:-1,E:0,S:1,W:0}[p.direction]??0);c.translate(.5,.5);c.rotate(Math.atan2(dy,dx));c.translate(-.5,-.5)}
  paintTile(c,id,{phase:id==='fixture.crumble'?p.active===false?1:0:p.active?1:id==='fixture.exit'?1:0,time:0,mask,images:art});
 }
 c.restore();
 if(['fixture.gate','fixture.exit','fixture.plate.weight'].includes(id)){
  // Replace atlas example numerals with this instance's actual condition.
  const txt=label(p)||'★',y=id==='fixture.gate'?.22:.77;
  c.fillStyle='#f3e8c5';c.beginPath();c.roundRect(.25,y-.12,.5,.24,.04);c.fill();c.fillStyle='#294b4a';c.font='bold .18px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(txt,.5,y);
  if(p.species){c.font='bold .12px system-ui';c.fillText({dog:'犬',fish:'魚',frog:'蛙',penguin:'ペン'}[p.species]||'',.5,y+.23)}
 }
 if(id==='fixture.sequence')cellText(c,String(p.step||1),.5,.4);
 if(id==='fixture.phase'||id==='field.wave'){
  const period=p.period||2,current=p.current||0,open=p.phase||0;
  if(id==='fixture.phase'){c.fillStyle='#344f59';c.beginPath();c.arc(.5,.48,.25,0,7);c.fill()}
  for(let i=0;i<period;i++){const x=.5+(i-(period-1)/2)*.13,y=id==='fixture.phase'?.48:.86;c.fillStyle=i===current?'#ffe3a2':'#244651';c.strokeStyle=i===open?'#f9e8a5':'#a9c9ba';c.lineWidth=i===open?.025:.012;c.beginPath();c.arc(x,y,.044,0,7);c.fill();c.stroke()}
 }
 const condition=label(p);
 if(condition&&!['fixture.gate','fixture.exit','fixture.plate.weight'].includes(id))cellText(c,condition,.5,.16);
 if(p.species&&!['fixture.gate','fixture.exit','fixture.plate.weight'].includes(id))cellText(c,{dog:'犬',fish:'魚',frog:'蛙',penguin:'ペン'}[p.species],.5,.93);
 if(id==='npc.owl'&&p.partner)cellText(c,'＋'+({dog:'犬',fish:'魚',frog:'蛙',penguin:'ペン'}[p.partner]),.5,.72);
 if(id==='object.crate')cellText(c,'重'+(p.weight??2),.5,.82);
 if(id==='fixture.burrow'&&p.role==='entrance'){const [dx,dy]=[p.dx||0,p.dy||0];c.strokeStyle='#e9d6a3';c.lineWidth=.04;c.beginPath();c.moveTo(.5-dx*.12,.5-dy*.12);c.lineTo(.5+dx*.12,.5+dy*.12);c.stroke();cellText(c,{N:'↑',E:'→',S:'↓',W:'←'}[p.direction]||'↓',.5,.5)}
 const connections=p.needs?.length||p.any?.length?[...(p.needs||[]),...(p.any||[])]:[p.connection??p.id];
 if(connections[0]&&['fixture.door','fixture.latch','fixture.plate.hold','fixture.plate.weight','fixture.toggle','fixture.sequence','fixture.platform','fixture.warp','fixture.burrow','npc.owl'].includes(id)){
  for(const [i,connection]of connections.entries()){c.fillStyle=tint(connection);c.strokeStyle='#203f46';c.lineWidth=.025;c.beginPath();c.arc(.84-i*.16,.2,.065,0,Math.PI*2);c.fill();c.stroke()}
 }
}
function cellText(c,text,x,y){c.save();c.translate(x,y);c.scale(.01,.01);c.font='700 17px system-ui';c.textAlign='center';c.textBaseline='middle';c.lineWidth=5;c.strokeStyle='#263d50';c.strokeText(text,0,0);c.fillStyle='#fff8db';c.fillText(text,0,0);c.restore()}
export function renderBoard(canvas,state,{selected=null,highlight=null}={}){
 const width=canvas.getBoundingClientRect().width||360,dpr=Math.min(devicePixelRatio||1,2),unit=width/8;canvas.width=Math.round(width*dpr);canvas.height=Math.round(width*dpr);const c=canvas.getContext('2d');c.setTransform(dpr*unit,0,0,dpr*unit,0,0);c.fillStyle='#617a83';c.fillRect(0,0,8,8);
 const tiles=describeTiles(state);
 for(const t of tiles){let mask=0;[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]].forEach(([dx,dy,bit])=>{if(tiles.some(n=>n.catalogId===t.catalogId&&n.x===t.x+dx&&n.y===t.y+dy))mask|=bit});c.save();c.translate(t.x,t.y);tile(c,t.catalogId,t.params||{},mask);c.restore()}
 if(highlight){c.strokeStyle='#f7e4a5';c.lineWidth=.06;c.strokeRect(highlight.x+.07,highlight.y+.07,.86,.86)}
 for(const a of state.actors){c.fillStyle='#18333d44';c.beginPath();c.ellipse(a.x+.5,a.y+.81,.28,.09,0,0,7);c.fill();const held=a.id===selected;if(held){c.strokeStyle='#ffe6a5';c.lineWidth=.035;c.beginPath();c.ellipse(a.x+.5,a.y+.81,.35,.13,0,0,7);c.stroke()}drawSprite(c,a.species,a.level,{x:a.x+.12,y:a.y+.03,w:.76,h:.76});cellText(c,String(a.level),a.x+.5,a.y+.84)}
}
export function paintSwatch(canvas,id,p={}){canvas.width=canvas.height=144;const c=canvas.getContext('2d');c.scale(144,144);tile(c,'terrain.floor');tile(c,id,p)}
export function renderHero(canvas){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.save();c.translate(48,135);c.scale(78,78);for(let i=0;i<7;i++){c.save();c.translate(i,0);c.globalAlpha=.35;tile(c,'terrain.floor');c.restore()}c.restore();for(const [species,level,x] of [['dog',2,96],['frog',1,270],['penguin',2,422]]){c.fillStyle='#49685220';c.beginPath();c.ellipse(x+35,181,30,7,0,0,7);c.fill();drawSprite(c,species,level,{x,y:99,w:76,h:79})}c.save();c.translate(538,112);c.scale(87,87);tile(c,'fixture.exit',{active:true});c.restore();c.fillStyle='#bc9955';for(const[x,y,r]of [[215,89,3],[372,65,4],[505,94,2]]){c.beginPath();c.arc(x,y,r,0,7);c.fill()}}
