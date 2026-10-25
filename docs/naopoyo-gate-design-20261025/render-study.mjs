import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {drawDesign,names} from './designs.mjs';
import {drawStone,drawMagicRock as originalMagicRock} from './source/prototypes/naopoyo-chapter2/stone.mjs';
import {stages} from './source/prototypes/naopoyo-chapter2/stages.mjs';
import {spriteData} from './source/prototypes/naopoyo-rescue/sprite-data.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage,GlobalFonts}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf','Arial');
const out=new URL('./output/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const forest=await loadImage(new URL('./source/assets/world/forest-v1.webp',import.meta.url).pathname);
const dogs={};for(const n of [3,4,6,8])dogs[n]=await loadImage(new URL(`./source/assets/characters/dog/0${n}.png`,import.meta.url).pathname);
const variants=['A','B','C','D','E'];
function drawMagicRock(c,g,{occupied=false,pulse=0}={}){c.save();drawStone(c,g.x,g.y);c.strokeStyle=occupied?'#b9f0df':'#436d69';c.lineWidth=.045;c.beginPath();c.roundRect(g.x+.09,g.y+.085,.82,.65,.10);c.stroke();c.fillStyle='#53665d';c.beginPath();c.roundRect(g.x+.28,g.y+.19,.44,.49,.07);c.fill();c.translate(g.x+.5,g.y+.44);c.scale(.01,.01);c.font='900 46px Arial';c.textAlign='center';c.textBaseline='middle';c.lineWidth=3.5;c.strokeStyle='#344a44';c.strokeText(String(g.exact),0,0);c.fillStyle='#f6f9de';c.fillText(String(g.exact),0,0);c.restore()}
function label(c,s,x,y,size=14,col='#e8eace'){c.font=`bold ${size}px Arial,sans-serif`;c.textAlign='left';c.textBaseline='top';c.fillStyle=col;c.fillText(s,x,y)}
function save(cv,name){fs.writeFileSync(new URL(name,out),cv.toBuffer('image/png'));return cv}
function exit(c,e){c.save();c.translate(e.x,e.y);c.fillStyle='#a2d5b6';c.beginPath();c.roundRect(.06,.025,.88,.55,[.36,.36,.035,.035]);c.fill();c.fillStyle='#315e62';c.beginPath();c.roundRect(.17,.10,.66,.46,[.27,.27,.02,.02]);c.fill();const glow=c.createRadialGradient(.5,.37,.02,.5,.37,.25);glow.addColorStop(0,'#fff6abbb');glow.addColorStop(1,'#fff6ab00');c.fillStyle=glow;c.fillRect(.24,.12,.52,.53);c.fillStyle='#ffe398';c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?.09:.21,x=.5+Math.cos(a)*r,y=.31+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.fill();c.fillStyle='#e9ecc4';c.fillRect(.06,.54,.88,.035);c.scale(1/42,1/42);c.font='bold 12.18px monospace';c.textAlign='center';c.textBaseline='middle';c.strokeStyle='#fff4d5';c.lineWidth=1.05;c.strokeText(String(e.exact),21,32.55);c.fillStyle='#20333f';c.fillText(String(e.exact),21,32.55);c.restore()}
function actor(c,a,cell){const body=cell*.73;const sp=spriteData[`dog/0${a.level}`],crop=sp.crop;const scale=Math.min(body/crop[2],body/crop[3]),w=crop[2]*scale,h=crop[3]*scale;c.save();c.fillStyle='#29452c30';c.beginPath();c.ellipse((a.x+.5)*cell,(a.y+.86)*cell,cell*.30,cell*.08,0,0,Math.PI*2);c.fill();c.imageSmoothingEnabled=false;c.drawImage(dogs[a.level],...crop,(a.x+.5)*cell-w/2,(a.y+.94)*cell-body+(body-h)/2,w,h);c.font=`900 ${cell*.31}px Arial,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=3.5;c.strokeStyle='#355144';c.strokeText(a.level,(a.x+.5)*cell,(a.y+.18)*cell);c.fillStyle='#fff';c.fillText(a.level,(a.x+.5)*cell,(a.y+.18)*cell);c.restore()}
function background(c,width){c.fillStyle='#dce9c9';c.fillRect(0,0,width,width);c.globalAlpha=.35;c.drawImage(forest,0,0,width,width);c.globalAlpha=1;const bg=c.createLinearGradient(0,0,0,width);bg.addColorStop(0,'#edf4cf35');bg.addColorStop(1,'#e6efd9f2');c.fillStyle=bg;c.fillRect(0,0,width,width)}
function board(s,v,width,{phase=0,effect='halo'}={}){const cv=createCanvas(width*2,width*2),c=cv.getContext('2d'),cell=width/8;c.scale(2,2);background(c,width);c.save();c.scale(cell,cell);c.strokeStyle='#547c6030';c.lineWidth=.015;for(let n=1;n<8;n++){c.beginPath();c.moveTo(n,0);c.lineTo(n,8);c.moveTo(0,n);c.lineTo(8,n);c.stroke()}
 const occupied=[...s.walls.map(([x,y])=>({x,y})),...s.gates,...s.exits,...s.spikes,...s.actors];const ar=[{x:5,y:2},{x:1,y:1},{x:5,y:4},{x:3,y:1}].find(p=>!occupied.some(a=>Math.abs(a.x-p.x)<1.4&&Math.abs(a.y-p.y)<1.4));if(ar){c.fillStyle='#315c4c30';c.font='700 2.3px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('↓',ar.x+.5,ar.y+.5)}
 for(const [x,y] of s.walls)drawStone(c,x,y);c.fillStyle='#617d50';c.fillRect(0,7.96,8,.04);for(const e of s.exits)exit(c,e);
 for(const g of s.gates){const occupied=s.actors.some(a=>Math.abs(a.x-g.x)<.55&&Math.abs(a.y-g.y)<.55&&a.level===g.exact);if(v==='V6')drawMagicRock(c,g,{occupied,pulse:phase});else drawDesign(c,g,{variant:v,occupied,phase:g.x===2&&g.y===5?phase:0,effect})}
 for(const p of s.spikes){c.fillStyle='#ac7089';c.fillRect(p.x+.1,p.y+.75,.8,.13);for(let n=0;n<p.power;n++){const x=p.x+.5+(n-(p.power-1)/2)*.23;c.beginPath();c.moveTo(x-.11,p.y+.75);c.lineTo(x,p.y+.32);c.lineTo(x+.11,p.y+.75);c.fill()}}c.restore();for(const a of s.actors)actor(c,a,cell);
 if(v!=='V6'){c.save();c.scale(cell,cell);for(const g of s.gates){const occupied=s.actors.some(a=>Math.abs(a.x-g.x)<.55&&Math.abs(a.y-g.y)<.55&&a.level===g.exact);drawDesign(c,g,{variant:v,front:true,occupied,phase:g.x===2&&g.y===5?phase:0,effect})}c.restore()}return cv;}
const fixture={id:'fixture-only',walls:[[1,2],[1,5]],gates:[{x:2,y:2,exact:8},{x:4,y:2,exact:3},{x:5,y:2,exact:8},{x:2,y:5,exact:8},{x:5,y:5,exact:8}],exits:[{x:6,y:2,exact:8}],spikes:[{x:6,y:5,power:3}],actors:[{x:2,y:5,level:8},{x:5,y:4,level:3}]};
const index=[];
for(const width of [375,390,430])for(const v of ['V6',...variants]){
 for(const sn of [19,20]){const s=stages.find(s=>s.number===sn);const name=`${v}-stage${sn}-${width}.png`;save(board(s,v,width-28),name);index.push({variant:v,scene:sn,viewport:width,board:width-28,cell:(width-28)/8,dpr:2,file:name})}
 save(board(fixture,v,width-28),`${v}-situations-${width}.png`);
}
// Enlargements are explicitly separated from the true-size rows.
for(const v of variants){
 const cv=createCanvas(780,416),c=cv.getContext('2d');c.fillStyle='#203b31';c.fillRect(0,0,780,416);label(c,`${v} / ${['STONE ARCH','LIGHT VEIL','ANCIENT DOOR','CARVED STONE','ROOT RING'][variants.indexOf(v)]}`,24,20,20);label(c,'DETAIL (5.3x)                         TRUE SIZE: 390px viewport / 45.25px cell',24,53,11);
 c.save();c.translate(30,94);c.scale(240,240);drawDesign(c,{x:0,y:0,exact:8},{variant:v});c.restore();
 c.fillStyle='#e3edd5';c.fillRect(318,100,430,265);
 for(let n=1;n<=8;n++){c.save();c.translate(332+(n-1)*49,116);c.scale(45.25,45.25);drawDesign(c,{x:0,y:0,exact:n},{variant:v});c.restore()}
 c.save();c.translate(332,202);c.scale(45.25,45.25);drawStone(c,0,0);drawDesign(c,{x:1,y:0,exact:8},{variant:v});drawDesign(c,{x:3,y:0,exact:3},{variant:v});drawDesign(c,{x:4,y:0,exact:8},{variant:v});c.restore();
 label(c,'1–8 / unchanged wall / two adjacent gates',332,274,13,'#365748');label(c,'No square number plate. All geometry stays inside one cell.',24,383,13);save(cv,`${v}-detail.png`);
}
// Five-way board overview, each board at 1 CSS pixel = 1 output pixel.
for(const scene of ['stage19','stage20','situations']){const cv=createCanvas(1170,922),c=cv.getContext('2d');c.fillStyle='#203b31';c.fillRect(0,0,1170,922);label(c,`NAOPOYO. / ${scene.toUpperCase()} / 390px WIDTH`,20,18,22);label(c,'Same board, same background, same scale. 362px board / 45.25px cell.',20,51,13);for(let i=0;i<6;i++){const v=['V6',...variants][i],x=16+(i%3)*386,y=92+Math.floor(i/3)*410;label(c,`${v}  ${v==='V6'?'CURRENT':names[v]?'DESIGN '+v:''}`,x,y,17);const im=await loadImage(new URL(`${v}-${scene}-390.png`,out).pathname);c.drawImage(im,x,y+30,362,362)}save(cv,`compare-${scene}-390.png`)}
// Animation: 240ms traversal within a 1.5s loop, never an engine replay.
for(const v of (process.env.SKIP_MOTION?[]:['A','B','E']))for(const effect of ['digit','veil','particles','halo']){const dir=new URL(`frames/${v}-${effect}/`,out);fs.mkdirSync(dir,{recursive:true});for(let f=0;f<45;f++){const p=Math.max(0,Math.min(1,(f-15)/7.2));const s=structuredClone(fixture);s.actors[0].x=1+p*2;const pulse=f>=15&&f<=23?Math.sin(Math.PI*p):0;const raw=board(s,v,362,{phase:pulse,effect});const cv=createCanvas(390,456),c=cv.getContext('2d');c.fillStyle='#203b31';c.fillRect(0,0,390,456);label(c,`${v} / ${effect} / 240ms`,14,12,16);c.drawImage(raw,14,45,362,362);label(c,'Visual timing study. Not gameplay replay.',14,425,12);fs.writeFileSync(new URL(String(f).padStart(3,'0')+'.png',dir),cv.toBuffer('image/png'))}}
fs.writeFileSync(new URL('qa-matrix.json',out),JSON.stringify({sourcePR:436,sourceHead:'abed89099d2b548863ab9b7b219891382b43dbda',mainObserved:'0b3bb1fe77f7b9829e94f2284ce2b56eb3fe1e0e',renderer:'Canvas2D via Skia; screenshot equivalence is not claimed',cases:index,fixture},null,2));
fs.writeFileSync(new URL('stages19-20.json',out),JSON.stringify(stages.filter(s=>s.number>=19),null,2));
console.log('Rendered',index.length,'stage images, 18 situation images, 5 detail sheets, 3 overview sheets, 12 animation sequences.');
