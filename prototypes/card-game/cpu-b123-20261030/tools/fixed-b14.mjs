// Fixed position (owner's request): opponent's challenge, this seat holds TWO かくとうバトル and time 1.
// Built from real positions (tests/fixtures.json) on a throw-away clone: the seat's deck copy of G-street-fight is
// moved to hand and the seat's time set to 1. Nothing official is changed.
// For off / b1 / b4 / b1+b4: candidate scores and the intermediate choice over 200 policy seeds.
// Usage: node tools/fixed-b14.mjs results/fixed-b14.json   (also imported by tests/b14.test.mjs)
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as e from '../../engine.mjs';
import * as exp from '../lib/policy-exp.mjs';
import {observeExp} from '../lib/observe-exp.mjs';
const F=JSON.parse(readFileSync(new URL('../tests/fixtures.json',import.meta.url)));
export const STAT={power:'power',wisdom:'wisdom','パンチ':'power','キック':'power','ガード':'wisdom'};
export const PROFILES={off:{},b1:{b1:true},b4:{b4:true},b1b4:{b1:true,b4:true}};
export function twoFights(key){
 const f=F[key],s=structuredClone(e.restore(f.save)),p=s.players[f.seat],cid=id=>s.cards[id].cardId;
 const i=p.deck.findIndex(id=>cid(id)==='G-street-fight');if(i<0)throw Error('no second copy in deck');
 p.hand.push(p.deck.splice(i,1)[0]);p.time=1;
 if(p.hand.filter(id=>cid(id)==='G-street-fight').length!==2)throw Error('expected two copies');
 return {f,s};
}
export function evaluate(s,seat,profile){
 const o=observeExp(s,seat),prof={...exp.PROFILES.intermediate,...profile},t=exp.timeOpportunity(o,prof);
 const score=o.actions.map((a,i)=>t?t[i]:exp.scoreCpuAction(a,o,exp.legacySpend,prof)),k=s.challenge.parameter;
 const rows=o.actions.map((a,i)=>({kind:a.kind,card:a.card?.cardId??null,copy:a.card?.id??null,variant:a.variant??null,right:a.variant in STAT?STAT[a.variant]===k:null,score:Math.round(score[i]*1000)/1000}));
 const dist={};for(let seed=1;seed<=200;seed++){const d=exp.chooseCpuAction(o,{difficulty:'intermediate',seed,step:0,profile}),a=o.actions.find(x=>x.id===d.id);
  const key=a.kind==='pass'?'パス':a.card?.cardId==='G-street-fight'?(STAT[a.variant]===k?'正しい型':'種目違いの型'):(a.card?.cardId??a.kind);dist[key]=(dist[key]??0)+1;}
 return {parameter:k,time:s.players[seat].time,rows,dist};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const out={};for(const key of ['fight:wisdom:opp','fight:power:opp']){const {f,s}=twoFights(key);out[key]={match:f.match,seat:f.seat,round:f.round,chain:s.chain.length,
  byProfile:Object.fromEntries(Object.entries(PROFILES).map(([n,pr])=>[n,evaluate(s,f.seat,pr)]))};}
 writeFileSync(process.argv[2],JSON.stringify(out,null,1));
 for(const [k,v] of Object.entries(out)){console.log(k,v.match,'R'+v.round,v.byProfile.off.parameter);for(const [n,r] of Object.entries(v.byProfile))console.log(' ',n.padEnd(5),JSON.stringify(r.dist),r.rows.filter(x=>x.card==='G-street-fight').map(x=>`${x.variant}${x.right?'○':'×'}:${x.score}`).join(' '));}
}
