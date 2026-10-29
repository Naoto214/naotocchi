// Generate real hotseat-2 saves with the PRE-CHANGE engine (main 9e3929da) in which ぴょんぴょんジャンプ's old
// effect resolves in a way the new effect would resolve differently. Usage:
//   node tools/make-hotseat2-saves.mjs <path to a checkout of the pre-change prototypes/card-game> > saves-raw.json
const root=process.argv[2];
const e=await import(root+'/engine.mjs');
const x=spec=>Object.entries(spec).flatMap(([id,n])=>Array(n).fill(id));
const deck=x({'M-dog-01':3,'M-dog-02':3,'M-dog-03':3,'M-dog-04':3,'M-dog-05':2,'M-dog-06':1,'M-beetle-01':3,'M-beetle-02':3,'M-beetle-03':2,
 'G-doodle-jump':3,'E-mirror':3,'C-shiba':3,'W-snow':2,'I-c_coin2':3,'G-sugoroku-race':3});e.validateDeck(deck);
function rng(seed){let n=seed>>>0;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
const pref={trigger:6,place:5,play:3,programPlay:3,programAbility:2,choose:1,skip:0.2,pass:0.5,relationship:4,challenge:3};
const DJ='G-doodle-jump',cid=(s,id)=>s.cards[id]?.cardId;
const res=(s,a)=>Object.fromEntries(s.effects.filter(r=>r.kind==='reservation'&&r.actor===a&&cid(s,r.link.source)===DJ).map(r=>[r.link.source+'#'+r.link.createdRevision,r.index]));
const want={'old-second-skip-plus5':null,'single-step-draw':null,'multi-step-draw':null};
for(let seed=1;seed<3000&&Object.values(want).some(v=>!v);seed++){
 let s=e.createGame(seed,{A:deck,B:deck});const r=rng(seed*13+5);const hits={};let guard=0,lastSkip={A:null,B:null};
 while(s.phase!=='finished'&&guard++<4000){
  const acts=e.legalActions(s);const who=e.actor(s),p=s.players[who];
  const skips=acts.filter(a=>a.kind==='place'&&a.variant==='time_skip');
  const dj=acts.find(a=>['play','programPlay'].includes(a.kind)&&cid(s,a.source)===DJ);
  let pick;
  if(s.phase==='normal'&&dj&&skips.some(k=>k.cost+dj.cost<=p.time)&&!Object.keys(res(s,who)).length)pick=dj;
  else if(s.phase==='normal'&&Object.keys(res(s,who)).length&&skips.length)pick=skips[Math.floor(r()*skips.length)];
  else{const pool=acts.filter(a=>!(cid(s,a.source)===DJ&&['play','programPlay'].includes(a.kind)));const w=pool.map(a=>pref[a.kind]??1);let t=r()*w.reduce((m,n)=>m+n,0);pick=pool[0];for(let i=0;i<pool.length;i++){t-=w[i];if(t<=0){pick=pool[i];break;}}}
  if(pick.kind==='place'&&pick.variant==='time_skip'){const from=cid(s,p.board.main),to=cid(s,pick.source);lastSkip[who]={revision:s.revision,jump:e.CARDS[to].stage-e.CARDS[from].stage};}
  const before={A:res(s,'A'),B:res(s,'B')},g0={A:s.players.A.growth,B:s.players.B.growth},turn0=s.round+':'+s.turn;
  s=e.act(s,who,s.revision,pick.id);
  for(const a of ['A','B'])for(const [k,i] of Object.entries(before[a])){const now=res(s,a);
   if(k in now&&now[k]>i){const kind=lastSkip[a].jump===1?'single-step-draw':'multi-step-draw';hits[kind]??={revision:lastSkip[a].revision,jump:lastSkip[a].jump,seat:a};}
   else if(!(k in now)&&s.round+':'+s.turn===turn0&&s.players[a].growth-g0[a]===5)hits['old-second-skip-plus5']??={revision:lastSkip[a].revision,jump:lastSkip[a].jump,seat:a};}
 }
 if(s.phase!=='finished')continue;
 for(const k of Object.keys(want))if(!want[k]&&hits[k])want[k]={seed,hit:hits[k],save:e.save(s)};
}
console.log(JSON.stringify(want));
