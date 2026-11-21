// Independent checks for exploratory seats in the captured native forest. A
// proposal may satisfy the collision constraints and still take another exit.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {forest,modelApi,sx,sy} from '../movement-scene.mjs';

const {model,scene}=forest(modelApi(true));
const start=model.snapshot();
const read=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url)));
const corridor=read('../evidence/forest-initial-corridor.json');
const proposals=read('../evidence/forest-seat-witnesses.json');
const lead=start.find(a=>a.kind==='pet');
const ellipse=(a,b)=>[(a.w+b.w)*.5+10,(a.h+b.h)*.38+10];
function clearance(a,b){
  const [rx,ry]=ellipse(a,b);
  return Math.hypot((a.x-b.x)/rx,(a.y-b.y)/ry);
}
function pass(a,p,b){
  const [rx,ry]=ellipse(a,b),x=(a.x-b.x)/rx,y=(a.y-b.y)/ry,dx=(p.x-a.x)/rx,dy=(p.y-a.y)/ry;
  const dot=x*dx+y*dy;
  if(x*x+y*y<1)return dot>=0;
  const t=Math.max(0,Math.min(1,-dot/(dx*dx+dy*dy||1)));
  return (x+t*dx)**2+(y+t*dy)**2>=1;
}
function ground(a,from,to){
  const box=scene.actorBounds(a);
  return to.x>=box.left&&to.x<=box.right&&to.y>=box.top&&to.y<=box.bottom&&
    scene.navigation.segmentSafe(from,to,scene.planVisibility(a));
}
function reach(rows){
  return rows.map(a=>[3,8,16].map(d=>{
    let count=0;
    for(let i=0;i<48;i++){
      const t=i*Math.PI/24,p={x:a.x+d*Math.cos(t)/sx,y:a.y+d*Math.sin(t)/sy};
      if(rows.every(b=>b===a||pass(a,p,b))&&ground(a,a,p))count++;
    }
    return count;
  }));
}
const initial=reach(start);
for(const {label,initialOffsetsCss} of proposals){
  const rows=start.map(a=>({...a}));
  for(const {slot,dx,dy} of initialOffsetsCss){
    const a=rows[slot];assert.notEqual(a.key,lead.key);a.x+=dx/sx;a.y+=dy/sy;
    assert.ok(ground(a,start[slot],a),a.key+' ground or foreground');
    assert.ok(corridor.every(q=>clearance({...lead,...q},a)>=1),a.key+' lead corridor');
  }
  for(let i=0;i<rows.length;i++) for(let j=0;j<i;j++){
    assert.ok(clearance(rows[i],rows[j])+1e-9>=Math.min(1,clearance(start[i],start[j])),rows[i].key+' and '+rows[j].key);
  }
  const result=reach(rows);
  const lost=result.flatMap((r,i)=>r.flatMap((n,j)=>!n&&initial[i][j]?[{key:rows[i].key,d:[3,8,16][j]}]:[]));
  const opened=result.flatMap((r,i)=>r[1]&&!initial[i][1]?[rows[i].key]:[]);
  console.log(JSON.stringify({label,changed:initialOffsetsCss.length,largestCss:Math.max(...initialOffsetsCss.map(p=>Math.hypot(p.dx,p.dy))),opened,lost}));
}
