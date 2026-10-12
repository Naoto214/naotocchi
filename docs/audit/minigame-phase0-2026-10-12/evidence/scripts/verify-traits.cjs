// Run with cwd=/home/user/naotocchi
const assert=require('node:assert/strict');
const {harness}=require('/home/user/naotocchi/tests/helpers/runtime-harness.cjs');
const out=[];const log=(...a)=>{const s=a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ');out.push(s);console.log(s);};
function memStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m};}
const TRAITS=['gentle','wild','calm','brave','romantic'];

// --- A. fresh state + dynamic write instrumentation ---
{
  const storage=memStorage();
  const h=harness({storage,seed:7});
  let s=h.api.state();
  log('A1 fresh traitCounts', s.traitCounts);
  const writes=[];
  const wrap=(obj)=>new Proxy(obj,{set(t,k,v){writes.push([k,v,new Error().stack.split('\n')[2]]);t[k]=v;return true;}});
  s.traitCounts=wrap({...s.traitCounts});
  // 300 normal minigame completions with varied scores
  for(let i=0;i<300;i++){h.api.startMinigame({id:'probe-'+(i%5),start(){}});h.api.finishMinigame([0,30,60,90,100][i%5]);}
  // 3000 ticks
  for(let i=0;i<3000;i++){try{h.api.tick();}catch(e){log('tick err',e.message);break;}}
  s=h.api.state();
  // duel challenge flow (writes duelTraits, must not write traitCounts)
  let duelOk=null;
  try{
    s.lifetime.money=10000;
    const d=h.api.startDuelChallenge(10);
    if(d){for(let q=0;q<5;q++){h.api.chooseDuelTruth(q%2?'a':'b');h.api.chooseDuelHonesty(false);} duelOk=!!h.api.finalizeDuelChallenge();}
  }catch(e){duelOk='err:'+e.message;}
  log('A2 duel finalize ok:',duelOk,'duelTraits:',h.api.state().lifetime.duelTraits);
  // guest code round trip
  const code=h.api.encodeGuestCode();const g=h.api.decodeGuestCode(code);
  log('A3 guest decoded traitCounts',g&&g.traitCounts,'guestCandidate.affinityTrait',g&&h.api.guestCandidate({...g}).affinityTrait);
  // transform (reroll halving)
  s=h.api.state();
  const target=h.api.normalLines.find(l=>l!==s.speciesLine);s.transformOptions=[target];h.api.chooseTransform(target);
  // save/load
  h.api.saveState();
  log('A4 after 300 games/3000 ticks/duel/guest/transform: traitCounts', {...h.api.state().traitCounts}, 'minigameCount',h.api.state().minigameCount,'writes recorded',writes.length, writes.map(w=>w.slice(0,2)));
  const h2=harness({storage,resume:true});
  log('A5 reloaded traitCounts', h2.api.state().traitCounts);
}

// --- B. achievement / goal5 evaluation on a fresh life ---
{
  const h=harness();const s=h.api.state();const A=h.api.achievements;
  const tri=['gentle-10','brave-10','romantic-10'];
  for(const id of tri){const a=A.find(x=>x.id===id);log('B1',id,'tier',a.tier,'condition(fresh)=',a.condition(s.lifetime,s));}
  s.achievementsUnlocked=A.filter(a=>!tri.includes(a.id)).map(a=>a.id);
  s.lifetime.perfectCleared=false;
  h.api.checkAchievements();
  const every=A.every(a=>s.achievementsUnlocked.includes(a.id));
  log('B2 total achievements',A.length,'unlocked after check',s.achievementsUnlocked.length,'all? (script.js:2805 logic)',every,'missing',A.filter(a=>!s.achievementsUnlocked.includes(a.id)).map(a=>a.id));
  // with 9 each (eased threshold irrelevant) still false
  s.traitCounts={gentle:9,wild:0,calm:0,brave:9,romantic:9};h.api.checkAchievements();
  log('B3 traitCounts=9 -> unlocked tri?',tri.map(id=>s.achievementsUnlocked.includes(id)));
  s.traitCounts={gentle:10,wild:0,calm:0,brave:10,romantic:10};h.api.checkAchievements();
  log('B4 traitCounts=10 -> unlocked tri?',tri.map(id=>s.achievementsUnlocked.includes(id)),'all?',A.every(a=>s.achievementsUnlocked.includes(a.id)));
}

// --- C. legacy save with accumulated traits: load preserves, transform halves ---
{
  const storage=memStorage();
  const h=harness({storage});let s=h.api.state();
  s.traitCounts={gentle:12,wild:3,calm:'x',brave:11,romantic:21};
  h.api.saveState();
  const h2=harness({storage,resume:true});s=h2.api.state();
  log('C1 loaded legacy traitCounts (calm was string)',s.traitCounts);
  h2.api.checkAchievements();
  log('C2 legacy save unlocks tri?',['gentle-10','brave-10','romantic-10'].map(id=>s.achievementsUnlocked.includes(id)));
  const seq=[];for(let i=0;i<4;i++){const t=h2.api.normalLines.find(l=>l!==s.speciesLine);s.transformOptions=[t];h2.api.chooseTransform(t);seq.push({...h2.api.state().traitCounts});}
  log('C3 after successive transforms',seq);
}

// --- D. transform candidates: mermaid/unicorn never; ren via romantic vs skill ---
{
  const h=harness({seed:11});const s=h.api.state();
  log('D0 rareLines',h.api.rareLines,'SECRET_LINE',h.api.SECRET_LINE,'ALL_LINES has mermaid/unicorn',['mermaid','unicorn'].map(l=>h.api.ALL_LINES.includes(l)));
  const draw=(n)=>{const c={};for(let i=0;i<n;i++){h.api.state().speciesLine='dog';for(const l of h.api.pickTransformCandidates())c[l]=(c[l]||0)+1;}return c;};
  s.traitCounts={gentle:99,wild:0,calm:0,brave:99,romantic:0};s.careSum=0;s.careTicks=0;s.sicknessCuredThisLife=0;s.minigameCount=0;s.minigameScoreSum=0;
  let c=draw(3000);log('D1 gentle/brave=99, other rare conds off: mermaid',c.mermaid||0,'unicorn',c.unicorn||0,'any RARE',h.api.rareLines.reduce((a,l)=>a+(c[l]||0),0),'ren',c.ren||0);
  s.traitCounts={gentle:0,wild:0,calm:0,brave:0,romantic:0};
  c=draw(3000);log('D2 all zero, minigameCount=0: ren',c.ren||0);
  s.traitCounts.romantic=5;c=draw(3000);log('D3 romantic=5: ren',c.ren||0);
  s.traitCounts.romantic=0;s.minigameCount=5;s.minigameScoreSum=5*85;c=draw(3000);log('D4 romantic=0, 5 games avg85: ren',c.ren||0);
}

// --- E. courtship traitBonus effect (all fixed candidates have affinityTrait) ---
{
  const h=harness();const P=h.api.partnerCandidates;
  log('E1 partner candidates',P.length,'with affinityTrait',P.filter(p=>p.affinityTrait).length,'null',P.filter(p=>!p.affinityTrait).map(p=>p.id));
}
require('fs').writeFileSync(__dirname+'/verify-traits.out.txt',out.join('\n')+'\n');
