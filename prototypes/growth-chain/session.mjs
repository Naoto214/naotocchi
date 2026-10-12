import {configuration,VERSION} from './rules.mjs';
import {createBag,draw} from './random.mjs';
import {board,cloneBoard,validateBoard,gravity,groups,resolve,HIDDEN} from './engine.mjs';
export function createSession(seed,r=configuration(),initial={}){
  r=configuration(r);const b=initial.board?cloneBoard(initial.board):board(r);validateBoard(b,r);
  if(groups(b,r).length||JSON.stringify(gravity(b))!==JSON.stringify(b))throw Error('Initial board must be stable');
  const eggs=initial.eggs?[...initial.eggs]:[0,0,0,0],gauge=initial.gauge??0;
  if(eggs.length!==4||eggs.some(n=>!Number.isSafeInteger(n)||n<0)||!Number.isSafeInteger(gauge)||gauge<0)throw Error('Invalid resources');
  const bag=createBag(seed,r),queue=Array.from({length:4},()=>[draw(bag),draw(bag)]);
  const s={version:VERSION,seed,rules:r,board:b,eggs,gauge,bag,queue,nextId:Math.max(0,...b.flat().filter(Boolean).map(c=>c.id))+1,score:0,drops:0,actions:0,over:null};
  if(!fits(b,spawnPose(r)))s.over='spawn-blocked';return s;
}
export const spawnPose=r=>({x:Math.floor(r.width/2)-1,y:HIDDEN,rot:0});
export function poseCells(p){const [dx,dy]=[[0,-1],[1,0],[0,1],[-1,0]][p.rot];return [{x:p.x,y:p.y},{x:p.x+dx,y:p.y+dy}];}
export function fits(b,p){return poseCells(p).every(c=>c.x>=0&&c.x<b[0].length&&c.y>=0&&c.y<b.length&&!b[c.y][c.x]);}
export function movePose(b,p,op){
  if(op==='rotate'){for(const kick of [0,-1,1]){let q={...p,x:p.x+kick,rot:(p.rot+1)%4};if(fits(b,q))return q;}return null;}
  if(!['left','right','down'].includes(op))throw Error('Invalid motion');
  let q={...p,x:p.x+(op==='left'?-1:op==='right'?1:0),y:p.y+(op==='down'?1:0)};return fits(b,q)?q:null;
}
export function landing(b,p){let q;while((q=movePose(b,p,'down')))p=q;return p;}
// BFS shares exact movement/kick semantics with manual play, including cavities.
export function placements(s){
  if(s.over)return [];const start=spawnPose(s.rules);if(!fits(s.board,start))return [];
  const key=p=>`${p.x},${p.y},${p.rot}`,seen=new Set([key(start)]),landed=new Set(),out=[],q=[{p:start,path:[]}];
  for(let i=0;i<q.length;i++){let {p,path}=q[i],l=landing(s.board,p),k=key(l);if(!landed.has(k)){landed.add(k);out.push({type:'drop',path:[...path,'hard']});}
    for(const op of ['left','right','rotate','down']){let n=movePose(s.board,p,op);if(n&&!seen.has(key(n))){seen.add(key(n));q.push({p:n,path:[...path,op]});}}
  }return out;
}
function copy(s){return {...s,board:cloneBoard(s.board),eggs:[...s.eggs],queue:s.queue.map(p=>[...p]),bag:{...s.bag,items:[...s.bag.items]},last:undefined};}
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export function applyAction(s,a,trace=true){
  if(s.over)throw Error('Game over');let z=copy(s),r=s.rules,ctx={source:a.type,priority:[]};
  if(a.type==='drop'){
    if(!Array.isArray(a.path)||!a.path.length||a.path.length>500||a.path.at(-1)!=='hard')throw Error('Invalid drop path');
    let p=spawnPose(r);if(!fits(z.board,p))throw Error('Blocked spawn');
    for(let i=0;i<a.path.length;i++){const op=a.path[i];if(op==='hard'){if(i!==a.path.length-1)throw Error('Early hard drop');p=landing(z.board,p);}else{p=movePose(z.board,p,op);if(!p)throw Error('Illegal motion');}}
    const cells=poseCells(p),pair=z.queue[0];for(let i=0;i<2;i++){const c=cells[i],id=z.nextId++;z.board[c.y][c.x]={id,k:pair[i],s:1};ctx.priority.push(id);}ctx.pair=[...ctx.priority];ctx.priority=ctx.priority.slice(0,1);z.drops++;
    if(r.topOut==='lock'&&cells.some(c=>c.y<HIDDEN)){z.over='lock-overflow';z.actions++;z.last={waves:[],eggs:[0,0,0,0],gauge:0,score:0,created08:0,deaths:0,overflow:0,consumed:0,board:z.board};return z;}
    z.queue.shift();z.queue.push([draw(z.bag),draw(z.bag)]);
  }else if(a.type==='egg'){
    if(!integer(a.rank,0,3)||!integer(a.k,0,r.kinds-1)||!integer(a.x,0,r.width-1)||!z.eggs[a.rank])throw Error('Invalid egg');
    let y=a.y;if(r.eggPlacement==='column'){y=z.board.length-1;while(y>=HIDDEN&&z.board[y][a.x])y--;}
    if(!integer(y,HIDDEN,z.board.length-1)||z.board[y][a.x])throw Error('Invalid egg cell');
    let id=z.nextId++;z.board[y][a.x]={id,k:a.k,s:a.rank+1};z.eggs[a.rank]--;ctx.priority=[id];
  }else if(a.type==='transform'||a.type==='bulk'){
    if(!integer(a.to,0,r.kinds-1))throw Error('Invalid target species');
    const cost=(a.type==='bulk'?3:1)*r.gaugeUnit;if(z.gauge<cost)throw Error('Insufficient gauge');
    if(a.type==='transform'){
      if(!integer(a.x,0,r.width-1)||!integer(a.y,HIDDEN,z.board.length-1))throw Error('Invalid target cell');const c=z.board[a.y][a.x];if(!c||c.k===a.to)throw Error('Invalid target');c.k=a.to;ctx.priority=[c.id];
    }else{
      if(!integer(a.from,0,r.kinds-1)||a.from===a.to)throw Error('Invalid source');
      for(let y=z.board.length-1;y>=0;y--)for(let x=0;x<r.width;x++){const c=z.board[y][x];if(c?.k===a.from){c.k=a.to;ctx.priority.push(c.id);}}
      if(!ctx.priority.length)throw Error('Empty bulk');
    }z.gauge-=cost;
  }else throw Error('Invalid action');
  const result=resolve(z.board,r,ctx,trace);z.board=result.board;z.last=result;z.actions++;z.score+=result.score;z.gauge+=result.gauge;z.eggs=z.eggs.map((n,i)=>n+result.eggs[i]);
  if(z.board.slice(0,HIDDEN).flat().some(Boolean))z.over='settled-overflow';else if(!fits(z.board,spawnPose(r)))z.over='spawn-blocked';return z;
}
export const preview=(s,a)=>applyAction(s,a);
export function stateData(s){const {last,...rest}=s;return rest;}
export function stateHash(s){let h=2166136261;for(const c of JSON.stringify(stateData(s))){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}return h.toString(16).padStart(8,'0');}
export function validateSession(s){
  if(!s||s.version!==VERSION)throw Error('Version mismatch');configuration(s.rules);validateBoard(s.board,s.rules);
  if(!Array.isArray(s.queue)||s.queue.length!==4||s.queue.some(p=>!Array.isArray(p)||p.length!==2||p.some(k=>!integer(k,0,s.rules.kinds-1))))throw Error('Invalid queue');
  if(!Array.isArray(s.eggs)||s.eggs.length!==4||s.eggs.some(n=>!Number.isSafeInteger(n)||n<0)||!Number.isSafeInteger(s.gauge)||s.gauge<0)throw Error('Invalid resources');
  const b=s.bag;if(!b||!integer(b.state,0,4294967295)||b.kinds!==s.rules.kinds||b.mode!==s.rules.bag||!Array.isArray(b.items)||!integer(b.index,0,b.items.length)||b.items.some(k=>!integer(k,0,b.kinds-1))||!Number.isSafeInteger(b.cycle)||b.cycle<0)throw Error('Invalid bag');
  for(const k of ['nextId','score','drops','actions'])if(!Number.isSafeInteger(s[k])||s[k]<0)throw Error('Invalid '+k);
  if(s.nextId<=Math.max(0,...s.board.flat().filter(Boolean).map(c=>c.id)))throw Error('Invalid nextId');
  if(![null,'lock-overflow','settled-overflow','spawn-blocked'].includes(s.over))throw Error('Invalid end reason');
  if(!s.over&&(groups(s.board,s.rules).length||JSON.stringify(gravity(s.board))!==JSON.stringify(s.board)))throw Error('Unstable session');return true;
}
export function replay(record){
  if(record.version!==VERSION||!Array.isArray(record.actions))throw Error('Invalid replay');validateSession(record.initial);
  let s=structuredClone(record.initial);for(const a of record.actions)s=applyAction(s,a,false);if(record.hash&&stateHash(s)!==record.hash)throw Error('Replay hash mismatch');return s;
}
