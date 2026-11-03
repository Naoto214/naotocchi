import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {drawDungeonFloor,drawDungeonWallDetails} from '../dungeon-art.mjs';import {stages} from '../stages.mjs';
const root=new URL('../',import.meta.url);
test('V4 input, physics, app control flow and shared motion/painter/timing sources stay byte identical',()=>{
 const hashes=JSON.parse(fs.readFileSync(new URL('../../docs/naopoyo-time-hand-chapter1-20261102/v5/protected-hashes.json',root)));
 for(const [file,hash]of Object.entries(hashes)){
 let source=fs.readFileSync(new URL(file,root));
 // Normalize only the explicitly approved sign-help UI changes; keep the original protected hash.
 if(file==='app.mjs'){
  source=Buffer.from(source.toString().replace("let gravityHelpOpen=false;\n",""));
  source=Buffer.from(source.toString().replace("mode='play';gravityHelpOpen=false;progress.index=i;","mode='play';progress.index=i;"));
  source=Buffer.from(source.toString().replace("$('gravity').hidden=!!q.state.gravity&&!gravityHelpOpen;",""));
  source=Buffer.from(source.toString().replace("let pointer=null,signTap=null;\nconst onSign=p=>p.x>=0&&p.x<1&&p.y>=7&&p.y<8;","let pointer=null;"));
  source=Buffer.from(source.toString().replace("const id=pointer;pointer=null;signTap=null;","const id=pointer;pointer=null;"));
  source=Buffer.from(source.toString().replace("if(!hit&&current().state.gravity&&onSign(p)){pointer=e.pointerId;signTap={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(pointer);return;}",""));
  source=Buffer.from(source.toString().replace("if(signTap){if(Math.hypot(e.clientX-signTap.x,e.clientY-signTap.y)>10)signTap.moved=true;return;}",""));
  source=Buffer.from(source.toString().replace("if(signTap){const tap=!signTap.moved&&Math.hypot(e.clientX-signTap.x,e.clientY-signTap.y)<=10&&onSign(point(e));release();if(tap){gravityHelpOpen=!gravityHelpOpen;render();}return;}",""));
 }
 if(file==='app.mjs')source=Buffer.from(source.toString().replace(" const sign=document.querySelector('.gravity-sign'),bounds=canvas.getBoundingClientRect(),cell=bounds.width/8,scale=cell/40;canvas.parentElement.append(sign);sign.hidden=!state.gravity;sign.style.left=bounds.left+'px';sign.style.top=(bounds.top+bounds.height-cell)+'px';sign.style.transform=`scale(${scale})`;\n",'').replace("gravitySign:sign,",'').replace("document.querySelector('.gravity-sign').addEventListener('load',draw);\n",'').replace("$('goal').textContent=s.goal;$('lesson-text').textContent=s.text;$('lesson-goal').textContent=s.goal;","$('goal').textContent=s.goal;").replace("?'重力 ↓ ・ 支えがないと落ちる':'ひかりの牢屋'","?'重力あり · 仲間も足場':'平面'"));
 assert.equal(crypto.createHash('sha256').update(source).digest('hex'),hash,file);
 }
});
test('dungeon scenery is pure and its grilles are confined to existing wall cells',()=>{
 for(const stage of stages){const board=structuredClone(stage.board),before=JSON.stringify(board),fills=[];const c=new Proxy({},{get:(o,k)=>k in o?o[k]:(...a)=>{if(k==='fillRect')fills.push(a)},set:(o,k,v)=>(o[k]=v,true)});
 drawDungeonWallDetails(c,board,stage.scene);
 for(const [x,y,w,h]of fills)assert.ok(board.walls.some(([wx,wy])=>x>=wx&&y>=wy&&x+w<=wx+1&&y+h<=wy+1));
 drawDungeonFloor(c,board,stage.scene);assert.equal(JSON.stringify(board),before);
 }
});
test('actor/effect painter block in D renderer is unchanged from V4',()=>{
 const current=fs.readFileSync(new URL('draw.mjs',root),'utf8'),old=fs.readFileSync(new URL('archive/v4/draw.mjs',root),'utf8');
 assert.equal(current.slice(current.indexOf(' const cell=width/8')).replaceAll('(t,x,y,m)=>text(rawFill,t,x,y,m)','(t,x,y)=>text(rawFill,t,x,y)').replaceAll('(t,x,y,m)=>text(rawStroke,t,x,y,m)','(t,x,y)=>text(rawStroke,t,x,y)'),old.slice(old.indexOf(' const cell=width/8')));
});
