// Pure shared resolver. y=0,1 are explicit hidden rows, visible y=2..13.
export const HIDDEN=2;
export const board=r=>Array.from({length:r.height+HIDDEN},()=>Array(r.width).fill(null));
export const cloneBoard=b=>b.map(row=>row.map(c=>c?{...c}:null));
export function validateBoard(b,r){
  if(!Array.isArray(b)||b.length!==r.height+HIDDEN||b.some(row=>!Array.isArray(row)||row.length!==r.width))throw Error('Invalid board size');
  let ids=new Set();for(let c of b.flat())if(c!==null){if(!c||!Number.isSafeInteger(c.id)||c.id<1||ids.has(c.id)||!Number.isInteger(c.k)||c.k<0||c.k>=r.kinds||!Number.isInteger(c.s)||c.s<1||c.s>8)throw Error('Invalid cell');ids.add(c.id);}
}
export function gravity(b){const z=board({height:b.length-HIDDEN,width:b[0].length});for(let x=0;x<b[0].length;x++){let y=b.length-1;for(let j=b.length-1;j>=0;j--)if(b[j][x])z[y--][x]={...b[j][x]};}return z;}
const bottom=(a,b)=>b.y-a.y||a.x-b.x;
const adjacent=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1;
export function groups(b,r){
  const seen=new Set(),out=[];const W=b[0].length,H=b.length;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const c=b[y][x],key=y*W+x;if(!c||seen.has(key))continue;
    const g=[],q=[{x,y,...c}];seen.add(key);
    for(let i=0;i<q.length;i++){const a=q[i];g.push(a);for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=a.x+dx,ny=a.y+dy,n=b[ny]?.[nx],nk=ny*W+nx;if(nx>=0&&nx<W&&n&&!seen.has(nk)&&n.s===c.s&&(n.k===c.k||(c.s===8&&r.deathSpecies==='any'))){seen.add(nk);q.push({x:nx,y:ny,...n});}}}
    if(g.length>=2)out.push(g.sort(bottom));
  }return out.sort((a,b)=>bottom(a[0],b[0]));
}
function order(g,mode,priority){const rank=new Map(priority.map((id,i)=>[id,i]));return [...g].sort((a,b)=>mode==='changed'?((rank.get(a.id)??1e9)-(rank.get(b.id)??1e9)||bottom(a,b)):bottom(a,b));}
function connectedFive(g,start){const q=[start],seen=new Set([start.id]);for(let i=0;i<q.length&&q.length<5;i++)for(const c of g)if(!seen.has(c.id)&&adjacent(q[i],c)){seen.add(c.id);q.push(c);if(q.length===5)break;}return q;}
function select(g,r,context){
  const mode=context.source==='bulk'?r.bulkAnchor:r.anchor, ordered=order(g,mode,context.priority||[]);
  if(g[0].s===8||r.consume==='all'||g.length<=5)return {accepted:[ordered],rejected:[]};
  if(r.competition==='component')return {accepted:[connectedFive(g,ordered[0])],rejected:[{reason:'deferred-to-next-wave',ids:g.filter(c=>!connectedFive(g,ordered[0]).some(a=>a.id===c.id)).map(c=>c.id)}]};
  const used=new Set(),accepted=[],rejected=[],unique=new Set();
  const candidates=ordered.map(start=>connectedFive(g,start)).sort((a,b)=>b.length-a.length||ordered.findIndex(c=>c.id===a[0].id)-ordered.findIndex(c=>c.id===b[0].id));
  for(const a of candidates){let key=a.map(c=>c.id).sort((a,b)=>a-b).join(',');if(unique.has(key))continue;unique.add(key);if(a.some(c=>used.has(c.id))){rejected.push({reason:'overlap',ids:a.map(c=>c.id)});continue;}accepted.push(a);a.forEach(c=>used.add(c.id));}
  return {accepted,rejected};
}
export function resolve(input,r,context={},trace=true){
  validateBoard(input,r);let b=cloneBoard(input),waves=[],stats={eggs:[0,0,0,0],gauge:0,score:0,overflow:0,created08:0,deaths:0,consumed:0};
  const pairCells=b.flatMap((row,y)=>row.flatMap((c,x)=>c&&context.pair?.includes(c.id)?[{x,y,...c}]:[]));
  const pairFirst=r.pairFirst&&pairCells.length===2&&pairCells[0].k===pairCells[1].k&&pairCells[0].s===pairCells[1].s&&adjacent(...pairCells);
  if(!pairFirst)b=gravity(b);
  for(let chain=1;chain<=input.length*input[0].length;chain++){
    const gs=chain===1&&pairFirst?[pairCells]:groups(b,r);if(!gs.length)break;
    let before=trace?cloneBoard(b):null,events=[],rejected=[],next=cloneBoard(b);
    for(const g of gs){const selection=select(g,r,context);rejected.push(...selection.rejected);
      for(const a of selection.accepted){
        const anchor=order(a,context.source==='bulk'?r.bulkAnchor:r.anchor,context.priority||[])[0];
        const old=anchor.s,death=old===8,delta=death?0:Math.min(4,a.length-1),stage=Math.min(8,old+delta),overflow=death?0:Math.max(0,old+delta-8);
        for(const c of a)next[c.y][c.x]=null;
        if(!death)next[anchor.y][anchor.x]={id:anchor.id,k:anchor.k,s:stage};
        let eggRank=-1,eggCount=0;if(death){for(let i=0;i<4;i++)if(chain>=r.eggThresholds[i])eggRank=i;eggCount=r.eggCount==='group'?1:Math.floor(a.length/2);stats.eggs[eggRank]+=eggCount;stats.deaths+=a.length;}
        stats.consumed+=a.length;stats.overflow+=overflow;stats.created08+=!death&&stage===8?1:0;
        stats.gauge+=r.gaugeMetric==='consumed'?a.length:stage-old;
        stats.score+=(a.length*10+overflow*100)*(r.scoreMode==='chain'?chain:1);
        events.push({consumed:a.map(c=>c.id),anchor:{x:anchor.x,y:anchor.y,id:anchor.id},from:old,to:death?null:stage,overflow,death,eggRank,eggCount});
      }
    }
    const merged=trace?cloneBoard(next):null;b=gravity(next);
    waves.push({chain,events,rejected,...(trace?{before,merged,after:cloneBoard(b)}:{})});
  }
  if(groups(b,r).length)throw Error('resolution did not terminate');
  return {board:b,waves,...stats};
}
