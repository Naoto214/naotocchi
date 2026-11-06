// VERSION 2 manifests (PLAN-V2.md). Seeds reuse the PR #495 / MAINT labels R12C:MAIN:<X>:<Y>:<nnn> (X before Y in the official
// order), so every condition shares shuffles and CPU policy seeds with A0 (G-A) and V1 (T-2s). Both seat orders are played.
// Usage:
//   node lib/make-manifest-v2.mjs <name> <variant> <from> <to> search <config,config,...> [baseline=B4]
//     each deck with each config vs every official deck (incl. itself) with the baseline config
//   node lib/make-manifest-v2.mjs <name> <variant> <from> <to> field <deck=config,...|config>
//     round robin of the 7 decks (28 pairs), each deck with its config
//   node lib/make-manifest-v2.mjs <name> <variant> <from> <to> seat <configFirst>,<configSecond>
//     same matches as field mode, but the deck playing first uses configFirst and the deck playing second configSecond
import {CPU_DECKS} from '../../cpu-decks.mjs';
import {BASE_DECKS,deckForConfig} from './decks-life.mjs';
import {deriveSeed,sha,permutations,apply} from '../../balance-verification-20261020/lib.mjs';
const [name,variant,from,to,mode,spec,baseline='B4']=process.argv.slice(2);
const ids=CPU_DECKS.map(d=>d.id),decks={},G=[],M=[],games=[];
const key=(id,c)=>{const k=`${id}@${c}`;if(!decks[k]){const d=deckForConfig(id,c);decks[k]={label:BASE_DECKS[id].label,base:id,config:c,cards:d.cards,replaced:d.replaced,sha256:sha(d.cards)};}return k;};
if(mode==='search'){for(const c of spec.split(','))for(const d of ids)for(const y of ids){
  const [X,Y]=ids.indexOf(d)<=ids.indexOf(y)?[d,y]:[y,d],test=d===X?'X':'Y';
  games.push({X,Y,cx:test==='X'?c:baseline,cy:test==='Y'?c:baseline,tag:`${d}@${c}~${y}`,test});}}
else if(mode==='field'){const cfg=spec.includes('=')?Object.fromEntries(spec.split(',').map(x=>x.split('='))):Object.fromEntries(ids.map(i=>[i,spec]));
 for(let i=0;i<ids.length;i++)for(let j=i;j<ids.length;j++)games.push({X:ids[i],Y:ids[j],cx:cfg[ids[i]],cy:cfg[ids[j]],tag:`${ids[i]}~${ids[j]}`,test:null});}
else if(mode==='seat'){ // VERSION 6: the deck that plays first uses spec[0], the deck that plays second spec[1] (same seeds as field mode)
 const [cf,cs]=spec.split(',');for(let i=0;i<ids.length;i++)for(let j=i;j<ids.length;j++)for(const first of ['X','Y'])games.push({X:ids[i],Y:ids[j],cx:first==='X'?cf:cs,cy:first==='X'?cs:cf,tag:`${ids[i]}~${ids[j]}~${first}first`,test:null,only:first});}
else throw Error('mode');
for(const q of games)for(let g=Number(from);g<=Number(to);g++){
 const n=String(g).padStart(3,'0'),base=`R12C:MAIN:${q.X}:${q.Y}:${n}`,group=`V2:${name}:${q.tag}:${n}:${variant}`;
 const kx=key(q.X,q.cx),ky=key(q.Y,q.cy),orderSeed=deriveSeed('order',base),perm=permutations(orderSeed);
 G.push({group,base,variant,X:kx,Y:ky,test:q.test,orderSeed,orderSha:{X:sha(apply(decks[kx].cards,perm.A)),Y:sha(apply(decks[ky].cards,perm.B))}});
 for(const first of (q.only?[q.only]:['X','Y']))M.push({match:`${group}:${first}-first`,group,base,variant,first,deckA:first==='X'?kx:ky,deckB:first==='X'?ky:kx,xSeat:first==='X'?'A':'B',
  difficulty:{A:'intermediate',B:'intermediate'},policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')}});
}
console.log(JSON.stringify({schema:'variable-life-manifest.v2',name,variant,mode,spec,baseline,range:[from,to],decks,groups:G,matches:M,counts:{groups:G.length,matches:M.length}},null,1));
