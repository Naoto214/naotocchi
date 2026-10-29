// Small CPU check (not a balance sample): the PR #451 test deck (D1_main_growth, 2 copies) against each official CPU deck,
// 4 deals x both seat orders x beginner/intermediate = 112 games on the CHANGED runtime. Counts how the official CPU uses
// ぴょんぴょんジャンプ: plays, plays without an affordable time-skip afterwards (wasted), draw triggers, +5 triggers.
// Usage: node tools/cpu-use-check.mjs > results/cpu-use-check.json
import * as e from '../../engine.mjs';import {observeCpu} from '../../cpu-observation.mjs';import {chooseCpuAction} from '../../cpu-policy.mjs';
import {advanceResponses} from '../../auto-progress.mjs';import {CPU_DECKS} from '../../cpu-decks.mjs';import {DECKS} from '../../balance-verification-20261020/decks.mjs';
const DJ='G-doodle-jump',cid=(s,id)=>s.cards[id]?.cardId,test=DECKS.D1_main_growth.cards;
const res=(s,a)=>Object.fromEntries(s.effects.filter(r=>r.kind==='reservation'&&r.actor===a&&cid(s,r.link.source)===DJ).map(r=>[r.link.source+'#'+r.link.createdRevision,r.index]));
const out={note:'Changed runtime, official CPU (heuristic-1 with the reserved time-skip guard). Compare: PR #451 E1 version B with the unchanged CPU had 215 plays, 186 without an affordable time-skip, 0 draw triggers.',rows:[],total:{}};
const T={games:0,abnormal:0,plays:0,wasted:0,draws:0,plus5:0,expiredUnfired:0,score:0};
for(const difficulty of ['beginner','intermediate'])for(const opp of CPU_DECKS)for(let g=1;g<=4;g++)for(const testSeat of ['A','B']){
 const seed=20261027*10+g*101+opp.id.length;let s=e.createGame(seed,{A:testSeat==='A'?test:opp.cards,B:testSeat==='B'?test:opp.cards});
 const R={difficulty,opp:opp.id,g,testSeat,plays:0,wasted:0,draws:0,plus5:0,expiredUnfired:0};let n=0;
 try{let r=advanceResponses(s);s=r.state;
  while(s.phase!=='finished'){if(n++>6000)throw Error('step limit');const a=e.actor(s),o=observeCpu(s,a),d=chooseCpuAction(o,{difficulty,seed:seed+(a==='A'?1:2),step:s.revision}),i=o.actions.findIndex(x=>x.id===d.id),x=o.actions[i];
   if(a===testSeat&&['play','programPlay'].includes(x.kind)&&x.card?.cardId===DJ){R.plays++;if(!x.timeSkipAfter?.length)R.wasted++;}
   const before=res(s,testSeat),turn0=s.round+':'+s.turn,g0=s.players[testSeat].growth;
   s=e.act(s,a,s.revision,e.legalActions(s)[i].id);r=advanceResponses(s);s=r.state;if(r.halted)throw Error('halted '+r.reason);
   const now=res(s,testSeat);for(const k of Object.keys(before))if(!(k in now)){if(s.round+':'+s.turn!==turn0)R.expiredUnfired++;else{R.draws++;if(s.players[testSeat].growth-g0>=5)R.plus5++;}}}
  R.score=s.result.winner===null?.5:s.result.winner===testSeat?1:0;R.replay=e.save(e.restore(e.save(s)))===e.save(s);
 }catch(err){R.error=String(err.message);T.abnormal++;}
 out.rows.push(R);T.games++;for(const k of ['plays','wasted','draws','plus5','expiredUnfired'])T[k]+=R[k];T.score+=R.score??0;
}
T.score=Math.round(T.score/T.games*1000)/1000;out.total=T;out.byDifficulty=Object.fromEntries(['beginner','intermediate'].map(d=>[d,['plays','wasted','draws','plus5','expiredUnfired'].reduce((m,k)=>(m[k]=out.rows.filter(r=>r.difficulty===d).reduce((n,r)=>n+r[k],0),m),{})]));
out.replayMismatch=out.rows.filter(r=>r.replay===false).length;
console.log(JSON.stringify(out,null,1));
