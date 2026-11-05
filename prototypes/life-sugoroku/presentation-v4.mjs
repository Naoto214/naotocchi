// V4 presentation shares the V3 terrain and dice. No mutable state or RNG.
import {tileDefinition} from './tiles-v4.mjs';
export {terrainSvg} from './board-art.mjs';
export {diceMarkup,itemMarkup,cpuDelay} from './presentation.mjs';
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function tileSvg(n,fill,icon,{active=false,visited=false,fork=false,debug=false}={}){
 const def=tileDefinition(n.type),paint=fill??def.fill,symbol=icon??def.icon,stroke=active?'#c78938':fork?'#b18b3f':visited?'#ae8b4c':'#8c9273';
 let shape=def.shape==='gable'?'M-22 18V-13L0-24L22-13V18Z':def.shape==='arch'?'M-22 18V-4A22 22 0 0 1 22-4V18Z':def.shape==='cut'?'M-15-20H15L23-12V13L16 20H-16L-23 13V-12Z':null;
 return `<g id="tile-${n.id}" data-node="${n.id}" data-tile-type="${n.type}" data-world-region="${n.worldRegion}" data-shape="${def.shape}" aria-label="${esc(`${n.label}：${def.label}。${def.description}`)}"><title>${esc(`${n.label} · ${def.description}`)}</title><g transform="translate(${n.x} ${n.y})">${shape?`<path class="tile-surface" d="${shape}"`:'<rect class="tile-surface" x="-23" y="-20" width="46" height="40" rx="10"'} fill="${paint}" stroke="${stroke}" stroke-width="${active?4:fork?3:1.7}" filter="url(#tile-shadow)"/><path d="M-15-13H15" stroke="#fff8e4" stroke-width="2" opacity=".7"/><text x="0" y="${def.effect.sodachi||def.effect.money?0:6}" text-anchor="middle" fill="#3d5145" font-family="sans-serif" font-size="${symbol.length>2?12:symbol.length>1?16:19}" font-weight="700">${esc(symbol)}</text>${def.effect.sodachi||def.effect.money?`<text x="0" y="15" text-anchor="middle" font-size="8" fill="#304438">${esc(def.label)}</text>`:''}${debug?`<text class="tile-number" x="18" y="31" text-anchor="middle" fill="#3d5145" stroke="#fff5da" stroke-width="3" paint-order="stroke" font-size="11" font-weight="700">${n.id+1}</text>`:''}</g></g>`;
}

function pointBack(path,distance){
 for(let j=path.length-1;j>0;j--){const a=path[j],b=path[j-1],length=Math.hypot(b.x-a.x,b.y-a.y);if(length>=distance&&length>0)return {x:a.x+(b.x-a.x)*distance/length,y:a.y+(b.y-a.y)*distance/length};distance-=length;}
 // At departure there is no earlier travelled edge: gather behind the start.
 const start=path[0];return {x:start.x-Math.min(96,distance)*.35,y:start.y+Math.min(96,distance)*.35};
}
function beside(path){const n=path.at(-1),previous=path.at(-2)||{x:n.x-1,y:n.y};const dx=n.x-previous.x,dy=n.y-previous.y,len=Math.hypot(dx,dy)||1;return {x:n.x-dy/len*32,y:n.y+dx/len*32};}
export function followerPositions(p,board){
 const path=(p.walkPath?.length?p.walkPath:[p.pos]).map(id=>board[id]);
 const out=(p.friends||[]).map((id,i)=>({slot:`friend-${i}`,id,marker:'',...pointBack(path,32*(i+1))}));
 if(p.partner)out.push({slot:'partner',id:p.partner,marker:p.married?'💍':'♥',...beside(path)});
 return out;
}
export function followerMotion(p,board,to){
 const path=[...(p.walkPath||[p.pos]),to].map(id=>board[id]),length=Math.hypot(board[to].x-board[p.pos].x,board[to].y-board[p.pos].y);
 const start=followerPositions(p,board),end=followerPositions({...p,pos:to,walkPath:[...(p.walkPath||[p.pos]),to]},board);
 return start.map((f,i)=>{
  if(f.slot==='partner')return {slot:f.slot,frames:[{offset:0,transform:'translate(0px,0px)'},{offset:1,transform:`translate(${end[i].x-f.x}px,${end[i].y-f.y}px)`}]};
  const back=32*(i+1),times=[0,1];let distance=0;
  for(let j=path.length-1;j>0;j--){distance+=Math.hypot(path[j].x-path[j-1].x,path[j].y-path[j-1].y);const t=1-(distance-back)/length;if(t>0&&t<1)times.push(t);}
  return {slot:f.slot,frames:[...new Set(times)].sort((a,b)=>a-b).map(t=>{const at=pointBack(path,back+length*(1-t));return {offset:t,transform:`translate(${at.x-f.x}px,${at.y-f.y}px)`};})};
 });
}
