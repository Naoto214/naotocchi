// Golden CPU-vs-CPU games for the policy-version tests. `goldenGames()` plays fixed seeds/decks with the given
// policy version and returns each final engine-save sha256. The expected values in cpu-golden.json were produced on
// main 851cf09a BEFORE heuristic-2 existed (policy 'heuristic-1' was the only policy then):
//   node tests/fixtures/cpu-golden.mjs > tests/fixtures/cpu-golden.json
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as e from '../../engine.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction} from '../../cpu-policy.mjs';
import {advanceResponses} from '../../auto-progress.mjs';
import {cpuDeck} from '../../cpu-decks.mjs';
// Decks with stat-choice cards (スキージャンプ／かくとうバトル) and without, both difficulties.
export const GAMES=[
 {seed:11,A:'challenge',B:'challenge',difficulty:{A:'intermediate',B:'intermediate'}},
 {seed:12,A:'challenge',B:'item',difficulty:{A:'intermediate',B:'beginner'}},
 {seed:13,A:'balance',B:'challenge',difficulty:{A:'beginner',B:'intermediate'}},
 {seed:14,A:'challenge',B:'balance',difficulty:{A:'beginner',B:'beginner'}},
 {seed:15,A:'main',B:'growth',difficulty:{A:'intermediate',B:'intermediate'}},
 {seed:16,A:'item',B:'challenge',difficulty:{A:'beginner',B:'beginner'}},
];
const sha=x=>createHash('sha256').update(x).digest('hex');
// The golden saves carry the rule version they were recorded with (hotseat-6). Later rule versions are compared by
// their command sequence (479: these decks have no breakups, so hotseat-7 plays the same moves).
export const GOLDEN_RULE_VERSION='hotseat-6';
export function playGame(g,version,ruleVersion=GOLDEN_RULE_VERSION){
 let s=e.createGame(g.seed,{A:cpuDeck(g.A).cards,B:cpuDeck(g.B).cards},ruleVersion);const step={A:0,B:0};
 const adv=()=>{const r=advanceResponses(s);s=r.state;if(r.halted)throw Error('halted '+r.reason);};
 adv();
 for(let n=0;s.phase!=='finished';n++){if(n>6000)throw Error('step limit');const a=e.actor(s),o=observeCpu(s,a);
  const d=chooseCpuAction(o,{difficulty:g.difficulty[a],seed:1000+g.seed,step:step[a]++,...(version?{version}:{})});
  s=e.act(s,a,s.revision,e.legalActions(s)[o.actions.findIndex(x=>x.id===d.id)].id);adv();}
 return {sha:sha(e.save(s)),commandsSha:sha(JSON.stringify(s.commands)),result:s.result};
}
export const goldenGames=(version,ruleVersion)=>GAMES.map(g=>({...g,...playGame(g,version,ruleVersion)}));
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify({producedOn:'main 851cf09a, policy heuristic-1 (before heuristic-2)',games:goldenGames()},null,1));
