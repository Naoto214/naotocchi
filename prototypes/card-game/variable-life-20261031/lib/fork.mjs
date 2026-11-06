// Same-position comparison (PLAN-V4.md §5). For each match, the CPU line is played until the first position where the side
// that is behind (own normal turn) can (a) extend the final round with XI/XII (R7–R10) and (b) shorten it with a time card
// before the current final (R7–R9). From each such position two branches are played to the end with the same CPU seeds:
//   extend: E = play the extension now (XII if legal, else XI) / N = that seat never extends for the rest of the game
//   shorten: S = play the shortest legal time card now / N = that seat never shortens for the rest of the game
// Everything else is the CPU (smart3, build T-4v). Usage: node lib/fork.mjs <manifest.json> <out.jsonl> [shard] [shards]
import {readFileSync,appendFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import {permutations,inputFor,apply} from '../../balance-verification-20261020/lib.mjs';
const HERE=dirname(fileURLToPath(import.meta.url));
const [manifestPath,out,shard='0',shards='1']=process.argv.slice(2);
const M=JSON.parse(readFileSync(manifestPath,'utf8')),G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const done=new Set(existsSync(out)?readFileSync(out,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l).match):[]);
const B=f=>pathToFileURL(join(HERE,'..','build',M.variant,f)).href;
const e=await import(B('engine.mjs')),{observeCpu}=await import(B('cpu-observation.mjs')),{chooseCpuAction}=await import(B('cpu-policy.mjs')),{advanceResponses}=await import(B('auto-progress.mjs'));
const N={'X-T-IX':9,'X-T-X':10,'X-T-XI':11,'X-T-XII':12},other=a=>a==='A'?'B':'A',SC={win:1,draw:.5,loss:0};
const timeN=(s,x)=>x.kind==='place'&&x.slot==='world'&&x.source?N[s.cards[x.source]?.cardId]:undefined;
const extendActs=(s,a)=>e.legalActions(s).filter(x=>{const n=timeN(s,x);return n&&!x.counter&&n>s.life.final;});
const shortenActs=(s,a)=>e.legalActions(s).filter(x=>{const n=timeN(s,x);return n&&!x.counter&&n<s.life.final;});
const advance=s=>{const r=advanceResponses(s);if(r.halted)throw Error('auto-advance halted: '+r.reason);return r.state;};
// One CPU decision. forbid: {seat, dir:'up'|'down'} removes that seat's time-card actions moving the final in that direction.
function decide(s,step,m,forbid){const a=e.actor(s),o=observeCpu(s,a),raw=e.legalActions(s);
 let keep=o.actions.map((x,i)=>i);if(forbid&&forbid.seat===a){keep=keep.filter(i=>{const n=timeN(s,raw[i]);return !n||(forbid.dir==='up'?n<=s.life.final:n>=s.life.final);});if(!keep.length)keep=o.actions.map((x,i)=>i);}
 const view={...o,actions:keep.map(i=>o.actions[i])};const d=chooseCpuAction(view,{difficulty:'intermediate',seed:m.policySeed[a],step:step[a]});
 const i=o.actions.findIndex(x=>x.id===d.id);step[a]++;return e.act(s,a,s.revision,raw[i].id);}
function finish(s,step,m,forbid,limit=8000){for(let n=0;s.phase!=='finished';n++){if(n>limit)throw Error('step limit');s=advance(decide(s,step,m,forbid));}return s;}
const result=(s,seat)=>({score:SC[s.result?.winner===seat?'win':!s.result?.winner?'draw':'loss'],final:s.life.final,round:s.round,margin:s.players[seat].growth-s.players[other(seat)].growth,reason:s.result?.reason});
function branch(snap,step,m,first,forbid){let s=structuredClone(snap),st={...step};if(first){const a=e.actor(s);s=advance(e.act(s,a,s.revision,first));}return result(finish(s,st,m,forbid),snap.turn);}
function play(m){
 const g=G[m.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seatOrder={A:m.first==='X'?order.X:order.Y,B:m.first==='X'?order.Y:order.X};
 let s=advance(e.createGame(g.orderSeed,{A:inputFor(seatOrder.A,perm.A),B:inputFor(seatOrder.B,perm.B)}));const step={A:0,B:0},forks=[];let ext=null,sh=null;
 for(let n=0;s.phase!=='finished'&&n<8000;n++){
  const a=e.actor(s),p=s.players[a],behind=p.growth<s.players[other(a)].growth,own=s.phase==='normal'&&s.turn===a&&!s.choice&&!s.pending.length&&!s.chain.length;
  if(own&&behind&&!ext&&s.round>=7&&s.round<=10){const xs=extendActs(s,a);if(xs.length){const x=xs.find(y=>timeN(s,y)===12)??xs[0];ext={snap:structuredClone(s),step:{...step},act:x.id,n:timeN(s,x)};}}
  if(own&&behind&&!sh&&s.round>=7&&s.round<=9){const xs=shortenActs(s,a).sort((x,y)=>timeN(s,x)-timeN(s,y));if(xs.length)sh={snap:structuredClone(s),step:{...step},act:xs[0].id,n:timeN(s,xs[0])};}
  if(ext&&sh)break;s=advance(decide(s,step,m,null));}
 const info=f=>({round:f.snap.round,seat:f.snap.turn,deficit:f.snap.players[other(f.snap.turn)].growth-f.snap.players[f.snap.turn].growth,finalBefore:f.snap.life.final,to:f.n,deck:{own:f.snap.turn==='A'?m.deckA:m.deckB,opp:f.snap.turn==='A'?m.deckB:m.deckA}});
 if(ext)forks.push({type:'extend',...info(ext),yes:branch(ext.snap,ext.step,m,ext.act,null),no:branch(ext.snap,ext.step,m,null,{seat:ext.snap.turn,dir:'up'})});
 if(sh)forks.push({type:'shorten',...info(sh),yes:branch(sh.snap,sh.step,m,sh.act,null),no:branch(sh.snap,sh.step,m,null,{seat:sh.snap.turn,dir:'down'})});
 return {match:m.match,base:m.base,first:m.first,variant:M.variant,manifest:M.name,forks};}
const mine=M.matches.filter((m,i)=>i%Number(shards)===Number(shard)&&!done.has(m.match));
for(const m of mine){let r;try{r=play(m);}catch(err){r={match:m.match,error:String(err.message).slice(0,200),forks:[]};}appendFileSync(out,JSON.stringify(r)+'\n');process.stderr.write(`${m.match} forks=${r.forks.length} ${r.error??''}\n`);}
