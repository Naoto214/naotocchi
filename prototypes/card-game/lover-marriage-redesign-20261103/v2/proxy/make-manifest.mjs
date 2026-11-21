// Usage: node make-manifest.mjs <groups> <difficulty> <deck:variant,...>  (decks: partner | partner-scorp | partner-robot)
import {CPU_DECKS} from '../../../cpu-decks.mjs';
import {deriveSeed} from '../../../balance-verification-20261020/lib.mjs';
const [groups,diff,arms]=process.argv.slice(2);const D=Object.fromEntries(CPU_DECKS.map(d=>[d.id,{label:d.name,cards:[...d.cards]}]));
const swap=(l,from,to)=>l.map(id=>id===from?to:id);
D['partner-scorp']={label:'こいびと・交際：ワシ3→サソリ3',cards:swap(D.partner.cards,'P-high_eagle','P-desert_scorpion')};
D['partner-robot']={label:'こいびと・交際：ワシ3→ロボット3',cards:swap(D.partner.cards,'P-high_eagle','P-robot_neighbor')};
const Ys=CPU_DECKS.map(d=>d.id).filter(id=>id!=='partner'),G=[],M=[];
for(const arm of arms.split(',')){const [X,v]=arm.split(':');for(const y of Ys)for(let g=1;g<=+groups;g++){
 // Same base label as v1 proxy (MP:partner:...) so the official-deck A0 arm reproduces v1 A0 exactly.
 const base=`MP:partner:${y}:${String(g).padStart(3,'0')}`,group=`${base}:${X}:${v}`,orderSeed=deriveSeed('order',base);
 G.push({group,base,variant:v,arm:X+':'+v,X,Y:y,xBase:X,stage:null,orderSeed});
 for(const first of ['X','Y'])M.push({match:`${group}:${first}-first`,group,variant:v,arm:X+':'+v,first,deckA:first==='X'?X:y,deckB:first==='X'?y:X,xSeat:first==='X'?'A':'B',difficulty:{A:diff,B:diff},policySeed:{A:deriveSeed('policy',base,first,'A'),B:deriveSeed('policy',base,first,'B')},script:null});}}
console.log(JSON.stringify({groups:G,matches:M,decks:D}));
