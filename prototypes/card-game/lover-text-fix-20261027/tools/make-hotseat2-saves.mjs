// Generate hotseat-2 saves (pre-fix engine) containing the two divergent behaviours.
const root=process.argv[2];
const e=await import(root+'/engine.mjs');
const {CATALOG}=await import(root+'/full-catalog.mjs');
const swap={'P-cliff_goat':'P-knitting_spider','C-cat_friend':'P-desert_scorpion','E-first-date':'I-poop1'};
const deck=e.DEFAULT_DECK.map(id=>swap[id]??id);e.validateDeck(deck);
function rng(seed){let n=seed>>>0;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
const pref={trigger:8,relationship:10,place:4,play:3,programAbility:2,choose:1,skip:0.2,pass:0.6};
const want=process.argv[3];const out=[];
for(let seed=1;seed<4000&&out.length<1;seed++){
 let s=e.createGame(seed,{A:deck,B:deck});const r=rng(seed*7+1);let hit=null;let guard=0;
 while(s.phase!=='finished'&&guard++<3000){
  const acts=e.legalActions(s);if(!acts.length)break;
  // weighted choice
  const w=acts.map(a=>pref[a.kind]??1);let t=r()*w.reduce((x,y)=>x+y,0),pick=acts[0];for(let i=0;i<acts.length;i++){t-=w[i];if(t<=0){pick=acts[i];break;}}
  if(pick.kind==='trigger'&&s.phase==='trigger'){const row=s.pending[0];const cid=s.cards[row.source].cardId;
   if(want==='spider'&&cid==='P-knitting_spider'&&row.event?.kind==='marriage')hit=hit??{revision:s.revision,event:'marriage'};
   if(want==='scorpion'&&cid==='P-desert_scorpion'){const items=s.history.filter(h=>h.serial===s.serial&&h.actor===row.actor&&h.kind==='play'&&h.type==='item');if(items.length&&items.every(h=>!h.faceUp))hit=hit??{revision:s.revision,items:items.map(h=>h.cardId)};}
  }
  s=e.act(s,e.actor(s),s.revision,pick.id);
 }
 if(hit&&s.phase==='finished'){out.push({seed,hit,save:e.save(s),final:{growth:[s.players.A.growth,s.players.B.growth],result:s.result,revision:s.revision}});}
}
console.log(JSON.stringify(out[0]??null));
