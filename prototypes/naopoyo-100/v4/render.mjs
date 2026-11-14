import {renderBoard,tile,gravitySignImage} from '../render.mjs';
import {drawActors}from '../../naopoyo-chapter1/render.mjs';
import {describeTiles}from '../engine.mjs';
import {gateVisual}from '../../naopoyo-shared/gate-design.mjs';
import{worlds,ground}from './worlds.mjs';
export function renderWorld(canvas,s,options={},world='forest'){
 if(world==='v3'){renderBoard(canvas,s,options);return}
 const width=canvas.getBoundingClientRect().width||384,dpr=Math.min(globalThis.devicePixelRatio||1,2),unit=width/8;canvas.width=Math.round(width*dpr);canvas.height=canvas.width;const c=canvas.getContext('2d');c.setTransform(dpr*unit,0,0,dpr*unit,0,0);
 for(let y=0;y<8;y++)for(let x=0;x<8;x++)ground(c,world,(s.baseWalls||s.walls).some(p=>p[0]===x&&p[1]===y),x,y);
 const sign=gravitySignImage();if(s.gravity&&sign)c.drawImage(sign,0,7,1,1);
 const tiles=describeTiles(s).filter(t=>!['terrain.floor','terrain.wall','sign.gravity'].includes(t.catalogId));
 for(const t of tiles){let p=t.params;if(t.catalogId==='fixture.gate'){const g=(options.gates||s.gates).find(g=>g.x===t.x&&g.y===t.y);p={...p,...gateVisual(g)}}let mask=0;[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]].forEach(([dx,dy,b])=>{if(tiles.some(n=>n.catalogId===t.catalogId&&n.x===t.x+dx&&n.y===t.y+dy))mask|=b});c.save();c.translate(t.x,t.y);tile(c,t.catalogId,p,mask);c.restore()}
 const active=options.selected?{id:s.actors.find(a=>a.x===options.selected[0]&&a.y===options.selected[1])?.id}:null;
 c.save();c.setTransform(dpr,0,0,dpr,0,0);drawActors(c,s,active,unit,width,options.stateEffects||[],options.now||performance.now(),options.reduced||false,false,true);c.restore();
 for(const e of options.effects||[]){c.save();c.globalAlpha=Math.max(0,1-e.progress);c.strokeStyle='#bc8c3a';c.lineWidth=2/unit;c.beginPath();c.arc(e.x+.5,e.y+.5,.15+e.progress*.38,0,7);c.stroke();c.restore()}
}
