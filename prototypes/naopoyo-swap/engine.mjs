import {adjacent,key,count,swapped} from './board.mjs';
import {resolveBoard} from './resolve.mjs';
import {needsSupply,supply,analyzeRescue,reshuffle} from './supply.mjs';
export function applySwap(input,action,options={}){
 const invalid=reason=>({accepted:false,state:input,events:[],reason});
 const from=action?.from,to=action?.to;
 if(input.status!=='playing')return invalid('このゲームは終了しています');
 if(!adjacent(from,to)||(!input.board[from]&&!input.board[to]))return invalid('上下左右の隣のマスを選んでね');
 const trace=options.trace??false,s={...input,board:swapped(input.board,from,to),rng:{...input.rng},preview:[...(input.preview||[])],kindBag:[...input.kindBag],stageBag:[...input.stageBag],seenBoards:[...input.seenBoards],actions:[...input.actions,action]},events=[{type:'swap',from,to}];
 const rescueDue=needsSupply(input),postSwapKey=key(s.board),novel=input.board[from]!==input.board[to]&&!s.seenBoards.includes(postSwapKey);
 s.moves++;s.revision++;
 if(trace)events.push({type:'frame',board:s.board.slice()});
 const resolved=resolveBoard(s.board,{from,to,trace});s.board=resolved.board;
 events.push(...resolved.events.map(e=>({...e,source:'player'})));
 if(resolved.won){s.status='clear';events.push({type:'clear'});return {accepted:true,state:s,events};}
 const reacted=resolved.events.some(e=>e.type==='evolve'||e.type==='mixedClear');
 if(reacted){s.supplyAvailable=true;s.seenBoards=[key(s.board)];s.stagnation=0;}else if(novel){s.seenBoards.push(postSwapKey);s.stagnation++;}
 if((reacted||novel)&&s.supplyAvailable)s.eggProgress=Math.min(s.config.interval,s.eggProgress+1);
 let source=count(s.board)===0?'emergency':rescueDue&&needsSupply(s)?'rescue':s.pendingSupply||s.eggProgress>=s.config.interval?'normal':null;
 if(source){events.push(...supply(s,source,trace));if(s.status==='playing'){
  const eggResult=resolveBoard(s.board,{trace});s.board=eggResult.board;events.push(...eggResult.events.map(e=>({...e,source:'egg'})));
  if(eggResult.events.some(e=>e.type==='evolve'||e.type==='mixedClear'))s.stagnation=0;
  if(eggResult.won){s.status='clear';events.push({type:'clear'});return {accepted:true,state:s,events};}
  if(!count(s.board)&&source!=='emergency')events.push(...supply(s,'emergency',trace));
 }}
 if(s.status==='playing'&&s.stagnation>=8&&analyzeRescue(s).kind==='shuffle'){
  const sh=reshuffle(s);if(sh.changed){Object.assign(s,sh.state);events.push({type:'shuffle',level:sh.level});if(trace)events.push({type:'frame',board:s.board.slice()});}else{events.push({type:'rescueUnresolved',reason:'shuffle'});s.rescueUnresolved++;s.stagnation=0;}
 }
 return {accepted:true,state:s,events};
}
