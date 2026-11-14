import {count,key,stage,species,shuffle,hashString,swaps,swapped} from './board.mjs';
import {groups,lifetime,hasReaction,immediateActions} from './resolve.mjs';
import {fillPreview} from './state.mjs';
export function materialShortage(b){const counts=Array(9).fill(0),eights={};for(const c of b)if(c){counts[stage(c)]++;if(stage(c)===8)eights[species(c)]=(eights[species(c)]||0)+1;}return !counts.some(n=>n>=3)&&!Object.values(eights).some(n=>n>=2);}
export const needsSupply=s=>count(s.board)<=s.config.low||materialShortage(s.board);
export function supply(s,source,trace=false){
 const n=count(s.board),rescue=source!=='normal',amount=Math.min(36-n,rescue?Math.min(12,Math.max(0,s.config.target-n)):n>30?1:n>24?2:n>18?3:4),events=[];
 if(!amount){s.pendingSupply=true;return events;}
 fillPreview(s);
 let placed=0;
 for(let j=0;j<amount;j++){
  const value=s.preview[0],order=shuffle(Array.from({length:36},(_,i)=>i).filter(i=>!s.board[i]),s,'position');
  const at=order.find(i=>{if(!rescue)return true;const b=s.board.slice();b[i]=value;return !hasReaction(b);});
  if(at===undefined)break;
  s.board[at]=value;s.preview.shift();s.supplyIndex++;placed++;events.push({type:'eggHatch',source,at,value});
 }
 fillPreview(s);s.pendingSupply=false;s.eggProgress=0;s.supplyAvailable=false;
 if(trace&&placed)events.push({type:'frame',board:s.board.slice(),source});
 if(rescue&&(!placed||materialShortage(s.board))){s.rescueUnresolved++;events.push({type:'rescueUnresolved',reason:'placement'});s.status='stalled';}
 return events;
}
export function progressWithinTwo(b){
 if(immediateActions(b).length)return 1;
 const seen=new Set([key(b)]);
 for(const [a,c] of swaps(b)){if(b[a]===b[c])continue;const next=swapped(b,a,c),k=key(next);if(seen.has(k))continue;seen.add(k);if(immediateActions(next).length)return 2;}
 return 0;
}
export function analyzeRescue(s){if(needsSupply(s))return {kind:'supply'};if(s.stagnation<8)return {kind:'none'};const depth=progressWithinTwo(s.board);return {kind:depth?'none':'shuffle',depth};}
export function reshuffle(s,limit=200){
 let attempts=0;const randomState={rng:{shuffle:hashString(key(s.board))}};
 for(let level=0;level<3;level++){
  const indices=s.board.flatMap((c,i)=>!c||stage(c)<(level===0?5:level===1?8:9)?[i]:[]),values=indices.map(i=>s.board[i]);
  for(let t=0;t<limit;t++){
   attempts++;const b=s.board.slice(),v=shuffle(values,randomState,'shuffle');indices.forEach((i,j)=>b[i]=v[j]);
   if(key(b)===key(s.board)||hasReaction(b)||!immediateActions(b).length)continue;
   return {state:{...s,board:b,stagnation:0,shuffles:s.shuffles+1},changed:true,level,attempts};
  }
 }
 return {state:s,changed:false,attempts};
}
