// Aggregates the partner-deck comparison. Usage: node analyze.mjs <manifest[,manifest2]> runs/PD*-shard*.jsonl.gz > results/summary.json
// Several manifests can be combined; their groups share base seeds, so every variant is paired with L10.
// Opening hands are rebuilt from the manifest seeds exactly as run.mjs builds the initial orders.
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {permutations,apply} from '../balance-verification-20261020/lib.mjs';
const [mp,...files]=process.argv.slice(2);const MS=mp.split(',').map(f=>JSON.parse(readFileSync(f,'utf8')));
const M={decks:Object.assign({},...MS.map(m=>m.decks)),groups:MS.flatMap(m=>m.groups),counts:MS.map(m=>({experiment:m.experiment,...m.counts}))};const G=Object.fromEntries(M.groups.map(g=>[g.group,g]));
const rows=files.flatMap(f=>{const b=readFileSync(f);return (f.endsWith('.gz')?gunzipSync(b):b).toString().split('\n').filter(Boolean).map(l=>JSON.parse(l));});
const isLover=id=>id.startsWith('P-');
const seats=[];const abnormal=[];
for(const r of rows){
 if(r.status!=='completed'){abnormal.push({match:r.match,status:r.status,error:r.error});continue;}
 const g=G[r.group],perm=permutations(g.orderSeed),order={X:apply(M.decks[g.X].cards,perm.A),Y:apply(M.decks[g.Y].cards,perm.B)};
 const seat=r.deck.A===g.X?'A':'B',opp=seat==='A'?'B':'A',cards=r.cards[seat],w=r.result?.winner;
 const L=Object.entries(cards).filter(([c])=>isLover(c));
 const steps=r.kinds[seat]?.relationship??0,placed=L.reduce((a,[,v])=>a+v.played,0);
 const used=Object.entries(cards).filter(([,v])=>v.played>0||v.activated>0).map(([c])=>c);
 seats.push({variant:g.variant,base:g.base,first:r.first,opponent:g.Y,seat,partnerFirst:r.first==='X',
  score:w===seat?1:w==null?0.5:0,win:w===seat,draw:w==null,growth:r.growth[seat],diff:r.growth[seat]-r.growth[opp],
  loversInDeck:L.reduce((a,[,v])=>a+v.deck,0),loverKinds:L.length,loversDrawn:L.reduce((a,[,v])=>a+v.drawn,0),placed,steps,married:placed>0&&steps>=4,
  loversHandEnd:L.reduce((a,[,v])=>a+v.handEnd,0),loverActivations:L.reduce((a,[,v])=>a+v.activated,0),
  openingLovers:order.X.slice(0,5).filter(isLover).length,
  searchHandEnd:['I-c_match','E-new-encounter'].reduce((a,c)=>a+(cards[c]?.handEnd??0),0),searchPlayed:['I-c_match','E-new-encounter'].reduce((a,c)=>a+(cards[c]?.played??0),0),
  datingSupportPlayed:['E-first-date','E-wedding-anniversary','E-reconciliation'].reduce((a,c)=>a+(cards[c]?.played??0),0),
  handEndTotal:Object.values(cards).reduce((a,v)=>a+v.handEnd,0),distinctUsed:used.length,usedIds:used,
  perCard:Object.fromEntries(Object.entries(cards).map(([c,v])=>[c,v]))});
}
const mean=(a,f)=>a.length?a.reduce((s,x)=>s+f(x),0)/a.length:null;
const r3=x=>x==null?null:Math.round(x*1000)/1000;
function summ(a){const placed=a.filter(s=>s.placed>0);return {seats:a.length,score_rate:r3(mean(a,s=>s.score)),win_rate:r3(mean(a,s=>s.win)),draw_rate:r3(mean(a,s=>s.draw)),
 mean_growth:r3(mean(a,s=>s.growth)),mean_growth_diff:r3(mean(a,s=>s.diff)),placed_rate:r3(mean(a,s=>s.placed>0)),married_rate:r3(mean(a,s=>s.married)),
 married_rate_of_placed:r3(mean(placed,s=>s.married)),lovers_drawn:r3(mean(a,s=>s.loversDrawn)),lovers_hand_end:r3(mean(a,s=>s.loversHandEnd)),
 surplus_rate:r3(mean(a,s=>s.loversHandEnd>0)),lover_activations:r3(mean(a,s=>s.loverActivations)),search_played:r3(mean(a,s=>s.searchPlayed)),search_hand_end:r3(mean(a,s=>s.searchHandEnd)),
 dating_support_played:r3(mean(a,s=>s.datingSupportPlayed)),hand_end_total:r3(mean(a,s=>s.handEndTotal)),distinct_cards_used:r3(mean(a,s=>s.distinctUsed)),
 opening_has_lover:r3(mean(a,s=>s.openingLovers>0)),
 score_if_opening_lover:r3(mean(a.filter(s=>s.openingLovers>0),s=>s.score)),score_if_no_opening_lover:r3(mean(a.filter(s=>s.openingLovers===0),s=>s.score)),
 married_if_opening_lover:r3(mean(a.filter(s=>s.openingLovers>0),s=>s.married)),married_if_no_opening_lover:r3(mean(a.filter(s=>s.openingLovers===0),s=>s.married)),
 deck_distinct_used:new Set(a.flatMap(s=>s.usedIds)).size};}
const variants=[...new Set(seats.map(s=>s.variant))];
const byVariant=Object.fromEntries(variants.map(v=>[v,summ(seats.filter(s=>s.variant===v))]));
const byOpp={};for(const v of variants)for(const o of [...new Set(seats.map(s=>s.opponent))]){(byOpp[o]??={})[v]=(x=>({score_rate:x.score_rate,married_rate:x.married_rate,surplus_rate:x.surplus_rate}))(summ(seats.filter(s=>s.variant===v&&s.opponent===o)));}
// Paired with the current list on identical seeds (same base group, same seat order).
const key=s=>s.base+'|'+s.first,ref=Object.fromEntries(seats.filter(s=>s.variant==='L10').map(s=>[key(s),s]));
const paired=Object.fromEntries(variants.filter(v=>v!=='L10').map(v=>{const d=seats.filter(s=>s.variant===v&&ref[key(s)]).map(s=>s.score-ref[key(s)].score);const m=mean(d,x=>x),sd=Math.sqrt(mean(d,x=>(x-m)**2)*d.length/(d.length-1));
 return [v,{pairs:d.length,mean_score_diff_vs_L10:r3(m),se:r3(sd/Math.sqrt(d.length)),better:d.filter(x=>x>0).length,worse:d.filter(x=>x<0).length,same:d.filter(x=>x===0).length}];}));
// Per lover card in each variant.
const cardTable={};for(const v of variants)for(const s of seats.filter(s=>s.variant===v))for(const [c,x] of Object.entries(s.perCard))if(isLover(c)){const t=(cardTable[v]??={})[c]??={deck:0,drawn:0,played:0,activated:0,handEnd:0};for(const f in t)t[f]+=x[f];}
console.log(JSON.stringify({schema:'partner_deck_comparison.v1',manifest_counts:M.counts,completed_matches:rows.length-abnormal.length,abnormal,by_variant:byVariant,paired_vs_L10:paired,by_opponent:byOpp,lover_cards:cardTable},null,1));
