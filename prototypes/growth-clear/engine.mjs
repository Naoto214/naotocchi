import {cloneBoard,gravity,validateBoard} from '../growth-chain/engine.mjs';
export const bottom=(a,b)=>b.y-a.y||a.x-b.x;
export function groups(b){
 const seen=new Set(),out=[],W=b[0].length;
 for(let y=0;y<b.length;y++)for(let x=0;x<W;x++){
  const c=b[y][x],key=y*W+x;if(!c||seen.has(key))continue;
  const q=[{...c,x,y}];seen.add(key);
  for(let i=0;i<q.length;i++){const a=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=a.x+dx,ny=a.y+dy,n=b[ny]?.[nx],nk=ny*W+nx;if(n&&n.s===c.s&&!seen.has(nk)){seen.add(nk);q.push({...n,x:nx,y:ny});}}}
  if(q.length>=2)out.push(q.sort(bottom));
 }
 return out.sort((a,b)=>bottom(a[0],b[0]));
}
export function settle(b){
 const before=new Map(b.flatMap((row,y)=>row.filter(Boolean).map(c=>[c.id,y]))),after=gravity(b);
 const moved=after.flatMap((row,y)=>row.flatMap(c=>c&&y>before.get(c.id)?[{id:c.id,d:y-before.get(c.id)}]:[])).sort((a,b)=>b.d-a.d||b.id-a.id).map(c=>c.id);
 return {board:after,moved};
}
export function resolve(input,r,context={},trace=true){
 validateBoard(input,r);if(!['A','B','C'].includes(context.anchor||'A'))throw Error('Invalid anchor');
 let {board:b,moved}=settle(input),priority=[...moved,...(context.priority||[])],waves=[];
 const stats={eggs:[0,0,0,0],gauge:0,score:0,overflow:0,created08:0,deaths:0,consumed:0,mixedRemoved:0,mixedHigh:0,decisions:0,choices:{}};
 for(let chain=1;chain<=input.length*input[0].length;chain++){
  const gs=groups(b);if(!gs.length)break;
  const before=trace?cloneBoard(b):null,next=cloneBoard(b),events=[];
  for(const g of gs){
   const mixed=new Set(g.map(c=>c.k)).size>1,old=g[0].s,death=!mixed&&old===8;
   let anchor=g[0];
   if(!mixed&&!death){
    if(context.anchor==='B')anchor=priority.map(id=>g.find(c=>c.id===id)).find(Boolean)||g[0];
    if(context.anchor==='C'){
     const key=chain+':'+g.map(c=>c.id).sort((a,b)=>a-b).join(',');
     const chosen=context.choices?.[key]??context.choose?.(g.map(c=>({...c})),chain);
     if(chosen===undefined){const e=Error('Anchor choice required');e.code='CHOICE_REQUIRED';e.key=key;e.group=g;e.board=cloneBoard(b);throw e;}
     anchor=g.find(c=>c.id===chosen);if(!anchor)throw Error('Invalid anchor choice');stats.choices[key]=chosen;stats.decisions++;
    }
   }
   const delta=mixed||death?0:Math.min(4,g.length-1),stage=Math.min(8,old+delta),overflow=mixed||death?0:Math.max(0,old+delta-8);
   for(const c of g)next[c.y][c.x]=null;
   if(!mixed&&!death)next[anchor.y][anchor.x]={id:anchor.id,k:anchor.k,s:stage};
   const eggRank=!mixed&&!death&&stage>=4&&stage<=7?stage-4:-1;
   if(eggRank>=0)stats.eggs[eggRank]++;
   stats.consumed+=g.length;stats.mixedRemoved+=mixed?g.length:0;stats.mixedHigh+=mixed&&old>=5?g.length:0;
   stats.deaths+=death?g.length:0;stats.created08+=!mixed&&!death&&stage===8?1:0;stats.overflow+=overflow;
   stats.gauge+=mixed||death?0:stage-old;
   stats.score+=(mixed?g.length*10:death?100:(stage-old+overflow)*10)*chain;
   events.push({consumed:g.map(c=>c.id),members:g.map(c=>({...c})),anchor:{x:anchor.x,y:anchor.y,id:anchor.id},from:old,to:mixed||death?null:stage,mixed,death,overflow,eggRank,eggCount:eggRank>=0?1:0});
  }
  const merged=trace?cloneBoard(next):null,settled=settle(next);b=settled.board;priority=[...settled.moved,...priority];
  waves.push({chain,events,rejected:[],...(trace?{before,merged,after:cloneBoard(b)}:{})});
 }
 if(groups(b).length)throw Error('resolution did not terminate');
 return {board:b,waves,...stats};
}
