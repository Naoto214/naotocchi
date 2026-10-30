// Fixed positions on the official engine (read-only). Each scenario builds a state with the same fixture helpers as
// tests/cpu-strategy.test.mjs (relabel own cards, set time), then asks the official CPU (chooseCpuAction) for
// its choice under 200 policy seeds per difficulty. Nothing is played forward and nothing official is modified.
// Usage: node scenarios/fixed.mjs > results/fixed-scenarios.json
import * as e from '../../engine.mjs';
import {observeCpu} from '../../cpu-observation.mjs';
import {chooseCpuAction,scoreCpuAction,timeOpportunity,legacySpend,PROFILES} from '../../cpu-policy.mjs';
import {timeOpportunityCF} from '../lib/counterfactual.mjs';
const SEEDS=200;
function normal(seed=20261030){let s=e.createGame(seed);while(s.phase!=='normal'){const a=e.legalActions(s).find(a=>a.kind==='pass')??e.legalActions(s)[0];s=e.act(s,e.actor(s),s.revision,a.id);}return s;}
function put(s,seat,id,zone='hand'){const p=s.players[seat],x=p.deck.shift();s.cards[x].cardId=id;s.cards[x].generation??=0;if(zone==='hand')p.hand.push(x);return x;}
// Empty hand back into the deck; own turn at round r with time t.
function own(r,t){const s=normal();s.round=r;for(const a of ['A','B'])s.players[a].deck.push(...s.players[a].hand.splice(0));s.players.A.time=t;return s;}
// Opponent (B) has just asked to end its turn: A gets the end_request response window with time t.
function oppWindow(r,t,setup){let s=own(r,0);s=e.act(s,'A',s.revision,e.legalActions(s).find(a=>a.kind==='pass').id);
 for(let n=0;n<40&&!(s.turn==='B'&&s.phase==='normal');n++){const a=e.legalActions(s).find(a=>a.kind==='pass')??e.legalActions(s)[0];s=e.act(s,e.actor(s),s.revision,a.id);}
 s.round=r;setup?.(s);s.players.A.time=t;s=e.act(s,'B',s.revision,e.legalActions(s).find(a=>a.kind==='pass').id);
 if(e.actor(s)!=='A'||s.phase!=='response')throw Error('no A response window');return s;}
const label=a=>a.kind==='pass'?'pass':`${a.kind}:${a.card?.cardId??'-'}${a.slot?':'+a.slot:''}${a.variant?':'+a.variant:''}`;
function ask(s,seat='A'){
 const o=observeCpu(s,seat),out={round:s.round,turn:s.turn,phase:s.phase,window:s.window,time:s.players[seat].time,prepared:s.players[seat].board.prepared.length,
  hand:s.players[seat].hand.map(id=>s.cards[id].cardId),candidates:o.actions.map(label),byDifficulty:{}};
 for(const diff of ['beginner','intermediate']){const prof=PROFILES[diff],t=timeOpportunity(o,prof),cf=timeOpportunityCF(o,prof,{sameName:true}),sb=timeOpportunityCF(o,prof,{strictlyBetter:true});
  const tally={};for(let k=1;k<=SEEDS;k++){const d=chooseCpuAction(o,{difficulty:diff,seed:k,step:0});const l=label(o.actions.find(a=>a.id===d.id));tally[l]=(tally[l]??0)+1;}
  out.byDifficulty[diff]={choices:tally,scores:o.actions.map((a,i)=>({action:label(a),base:+scoreCpuAction(a,o,()=>0,prof).toFixed(2),official:+(t?t[i]:scoreCpuAction(a,o,legacySpend,prof)).toFixed(2),sameNameCounterfactual:cf?+cf[i].toFixed(2):null,strictlyBetterCounterfactual:sb?+sb[i].toFixed(2):null}))};}
 return out;}
const S={};
// S1: egg, R1, time 1, two copies of the same ① main. Same with one copy for comparison.
S['S1a-egg-two-copies']=(()=>{const s=own(1,1);put(s,'A','M-dog-01');put(s,'A','M-dog-01');put(s,'A','W-snow');return ask(s);})();
S['S1b-egg-one-copy']=(()=>{const s=own(1,1);put(s,'A','M-dog-01');put(s,'A','W-snow');return ask(s);})();
S['S1c-egg-two-different-1s']=(()=>{const s=own(1,1);put(s,'A','M-dog-01');put(s,'A','M-beetle-01');put(s,'A','W-snow');return ask(s);})();
// S2: own turn R5, main present, 1 time left, two copies of すごろく (time-dump card) vs one copy.
const withMain=(s,id='M-dog-03')=>{s.players.A.board.main=put(s,'A',id,'board');s.players.B.board.main=put(s,'B','M-dog-03','board');return s;};
S['S2a-own-two-sugoroku-time1']=(()=>{const s=withMain(own(5,1));put(s,'A','G-sugoroku-race');put(s,'A','G-sugoroku-race');return ask(s);})();
S['S2b-own-one-sugoroku-time1']=(()=>{const s=withMain(own(5,1));put(s,'A','G-sugoroku-race');return ask(s);})();
S['S2c-own-two-sugoroku-time2']=(()=>{const s=withMain(own(5,2));put(s,'A','G-sugoroku-race');put(s,'A','G-sugoroku-race');return ask(s);})();
// S3: opponent's turn end request: A holds a time-dump card and time that will be lost at A's next turn start.
S['S3a-opp-end-sugoroku-time2']=oppWindow(5,2,s=>{withMain(s);put(s,'A','G-sugoroku-race');});
S['S3a-opp-end-sugoroku-time2']=ask(S['S3a-opp-end-sugoroku-time2']);
S['S3b-opp-end-two-sugoroku-time1']=ask(oppWindow(5,1,s=>{withMain(s);put(s,'A','G-sugoroku-race');put(s,'A','G-sugoroku-race');}));
S['S3c-opp-end-flower-time1']=ask(oppWindow(5,1,s=>{withMain(s);put(s,'A','E-midlife-flower');}));
S['S3d-opp-end-this-turn-card-time2']=ask(oppWindow(5,2,s=>{withMain(s);put(s,'A','E-fateful-transform');put(s,'A','G-basketball-3d');}));
// S4: prepared zone full (3 face-down/equipped cards): しかける is not offered, すぐつかう still is (rule 7).
S['S4-prepared-full']=(()=>{const s=withMain(own(6,4));const b=s.players.A.board;for(const id of ['G-ski-jump','G-takoyaki-grill','G-missile-command'])b.prepared.push({id:put(s,'A',id,'board'),faceDown:true,setSerial:0});
 put(s,'A','G-ski-jump');put(s,'A','G-sugoroku-race');put(s,'A','I-bowtie');return ask(s);})();
// S5: しかける valuation is flat: ski-jump (challenge deck) vs missile command vs takoyaki, R6 time 2, empty prepared.
S['S5a-set-ski-jump']=(()=>{const s=withMain(own(6,2));put(s,'A','G-ski-jump');return ask(s);})();
S['S5b-set-missile']=(()=>{const s=withMain(own(6,2));put(s,'A','G-missile-command');return ask(s);})();
S['S5c-set-takoyaki']=(()=>{const s=withMain(own(6,2));put(s,'A','G-takoyaki-grill');return ask(s);})();
S['S5d-set-ski-vs-sugoroku']=(()=>{const s=withMain(own(6,2));put(s,'A','G-ski-jump');put(s,'A','G-sugoroku-race');return ask(s);})();
// S6: own challenge on ちから declared with スキージャンプ set on an earlier turn: which stat does the CPU pick for +3?
// S7: opponent's ちから challenge, A holds かくとうバトル (パンチ ちから+1 / キック ちから+3・手札1枚 / ガード ちえ+2).
function challengeState(param,{trap=false,quick=null,declarer='A'}={}){
 let s=withMain(own(6,3));
 if(trap)s.players.A.board.prepared.push({id:put(s,'A','G-ski-jump','board'),faceDown:true,setSerial:-1});
 if(declarer==='B'){s=e.act(s,'A',s.revision,e.legalActions(s).find(a=>a.kind==='pass').id);
  for(let n=0;n<40&&!(s.turn==='B'&&s.phase==='normal');n++){const a=e.legalActions(s).find(a=>a.kind==='pass')??e.legalActions(s)[0];s=e.act(s,e.actor(s),s.revision,a.id);}
  s.round=6;s.players.A.time=3;}
 if(quick)put(s,'A',quick);
 const decl=e.legalActions(s).find(a=>a.kind==='challenge'&&a.parameter===param);if(!decl)throw Error('no challenge '+param);
 s=e.act(s,declarer,s.revision,decl.id);
 for(let n=0;n<20&&e.actor(s)!=='A';n++){const a=e.legalActions(s).find(a=>a.kind==='pass')??e.legalActions(s)[0];s=e.act(s,e.actor(s),s.revision,a.id);}
 return s;}
const variantTally=(s,diff)=>{const o=observeCpu(s,'A'),t={};for(let k=1;k<=SEEDS;k++){const d=chooseCpuAction(o,{difficulty:diff,seed:k,step:0}),r=e.legalActions(s)[o.actions.findIndex(a=>a.id===d.id)];const l=r.kind+':'+(r.variant??'-');t[l]=(t[l]??0)+1;}return t;};
for(const param of ['power','wisdom']){
 const s=challengeState(param,{trap:true});
 S[`S6-own-challenge-${param}-ski-jump`]={...ask(s),variantChoices:{beginner:variantTally(s,'beginner'),intermediate:variantTally(s,'intermediate')}};
 const q=challengeState(param,{quick:'G-street-fight',declarer:'B'});
 S[`S7-opp-challenge-${param}-street-fight`]={...ask(q),variantChoices:{beginner:variantTally(q,'beginner'),intermediate:variantTally(q,'intermediate')}};
}
console.log(JSON.stringify({engine:e.VERSION,seeds:SEEDS,scenarios:S},null,1));
