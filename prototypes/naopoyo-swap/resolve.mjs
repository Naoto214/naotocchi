import {stage,species,bottomLeft,gravity} from './board.mjs';
export function groups(b){
 const lines=[];
 for(let axis=0;axis<2;axis++)for(let lane=0;lane<6;lane++){
  let run=[];let rank=0;
  const flush=()=>{if(run.length>=3)lines.push(run);run=[];};
  for(let j=0;j<=6;j++){const i=axis?j*6+lane:lane*6+j,s=j===6?0:stage(b[i]);if(s!==rank||!s)flush();if(s)run.push(i);rank=s;}
 }
 const components=[];
 for(const line of lines){const intersect=components.filter(g=>line.some(i=>g.cells.includes(i)));const cells=[...new Set([...line,...intersect.flatMap(g=>g.cells)])];const longest=Math.max(line.length,...intersect.map(g=>g.longest));for(const g of intersect)components.splice(components.indexOf(g),1);components.push({cells:cells.sort((a,b)=>a-b),longest});}
 return components.sort((a,b)=>a.cells[0]-b.cells[0]);
}
export function lifetime(b){const seen=new Set(),out=[];for(let i=0;i<36;i++){if(stage(b[i])!==8||seen.has(i))continue;const cells=[i];seen.add(i);for(let j=0;j<cells.length;j++){const p=cells[j];for(const q of [p%6?p-1:-1,p%6<5?p+1:-1,p>=6?p-6:-1,p<30?p+6:-1])if(q>=0&&!seen.has(q)&&b[q]===b[i]){seen.add(q);cells.push(q);}}if(cells.length>=2)out.push(cells);}return out;}
export function resolveBoard(input,context={}){
 let board=input.slice(),events=[];
 const frame=(type)=>{if(context.trace)events.push({type,board:board.slice()});};
 const win=()=>{const gs=lifetime(board);if(!gs.length)return false;for(const cells of gs){events.push({type:'lifetimeClear',cells,species:species(board[cells[0]])});for(const i of cells)board[i]=0;}frame('frame');return true;};
 for(let wave=1;wave<=36;wave++){
  if(win())return {board,events,won:true};
  const gs=groups(board);if(!gs.length)return {board,events,won:false};
  const next=board.slice();
  for(const g of gs){const {cells,longest}=g,from=stage(board[cells[0]]),kind=species(board[cells[0]]),mixed=cells.some(i=>species(board[i])!==kind);
   const anchor=wave===1&&cells.includes(context.to)?context.to:wave===1&&cells.includes(context.from)?context.from:[...cells].sort(bottomLeft)[0];
   for(const i of cells)next[i]=0;
   const to=Math.min(8,from+longest-2);
   if(!mixed)next[anchor]=kind*8+to;
   events.push({type:mixed?'mixedClear':'evolve',cells,anchor,from,to:mixed?0:to,species:kind,longest,wave});
  }
  board=next;frame('frame');if(win())return {board,events,won:true};
  const after=gravity(board);if(after.some((v,i)=>v!==board[i])){events.push({type:'gravity',wave});board=after;frame('frame');}
 }
 throw Error('反応回数の上限を超えました');
}
export function hasReaction(b){return groups(b).length>0||lifetime(b).length>0;}
export function immediateActions(b,evolutionOnly=false){return importActions(b,evolutionOnly);}
import {PAIRS,swapped} from './board.mjs';
function importActions(b,evolutionOnly){const out=[];for(const [from,to] of PAIRS){if(!b[from]&&!b[to]||b[from]===b[to])continue;const next=swapped(b,from,to);if(lifetime(next).length||groups(next).some(g=>!evolutionOnly||g.cells.every(i=>species(next[i])===species(next[g.cells[0]]))))out.push({from,to});}return out;}
