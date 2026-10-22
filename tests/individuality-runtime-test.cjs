const test=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');
const I=require('../individuality.js');
function born(){const h=harness({deterministic:true,resume:true});h.api.hatchEgg();return h;}
test('hatching creates four traits, profile and new guest data',()=>{const h=born(),s=h.api.state();assert.ok(s.individuality);assert.equal(Object.keys(s.individuality.temperament).length,4);h.api.renderProfile();assert.match(h.get('profileTraits').innerHTML,/うまれつき/);assert.ok(h.api.decodeGuestCode(h.api.encodeGuestCode()).individuality);});
test('real minigame result grows C and B on first B; quick and repeats do not grow',()=>{const h=born(),s=h.api.state(),g=h.api.games.find(g=>!g.id.startsWith('quick'));h.api.startMinigame(g);h.api.finishMinigame(65);assert.equal(I.points(s.individuality,'perseverance'),8);const before=I.points(s.individuality,'perseverance');h.api.startMinigame(g);h.api.finishMinigame(65);assert.equal(I.points(s.individuality,'perseverance'),before);});
test('real travel deduplicates natural experience',()=>{const h=born(),s=h.api.state();h.api.travelToRegion(h.api.REGIONS.find(r=>r.id==='forest'));assert.equal(I.points(s.individuality,'wonder'),4);h.api.travelToRegion(h.api.REGIONS.find(r=>r.id==='home'));h.api.travelToRegion(h.api.REGIONS.find(r=>r.id==='forest'));assert.equal(I.points(s.individuality,'wonder'),8);});
test('legacy personality removed from fresh save and registered achievements',()=>{const h=born(),s=h.api.state();assert.equal(s.traitCounts,undefined);assert.equal(h.api.achievements.filter(a=>a.id.startsWith('heart-')).length,4);assert.equal(h.api.achievements.some(a=>['gentle-10','brave-10','romantic-10'].includes(a.id)),false);});
function storage(){const data=new Map();return {data,getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
test('twelve real age transitions queue one choice each, preserve midlife effects and 90 guard',()=>{
 const h=born(),s=h.api.state();s.transformMeter=0;
 for(const event of I.data.events){s.ageTicks=event.age*20;h.api.onAgeChanged(event.age-1);assert.equal(s.individuality.events[event.age].status,'pending');const choice=event.choices[0];assert.equal(h.api.chooseIndividualityEvent(event.age,choice.heart,s.individuality.lifeId),true);assert.equal(h.api.chooseIndividualityEvent(event.age,choice.heart,s.individuality.lifeId),false);}
 assert.equal(Object.keys(s.individuality.events).length,12);assert.equal(s.miracleGuard,true);assert.deepEqual(Array.from(s.midlifeSeen),[44,50,56,62,66]);
});
test('pending choice reload and other-tab takeover reject stale choice',()=>{
 const store=storage(),h=harness({storage:store,resume:true,deterministic:true});h.api.hatchEgg();const s=h.api.state();s.ageTicks=60;h.api.onAgeChanged(2);h.api.saveState();
 const h2=harness({storage:store,resume:true,deterministic:true}),s2=h2.api.state();assert.equal(s2.individuality.events[3].status,'pending');assert.equal(h2.api.chooseIndividualityEvent(3,'kindness',s2.individuality.lifeId),true);assert.equal(h.api.chooseIndividualityEvent(3,'courage',s.individuality.lifeId),false);
 const h3=harness({storage:store,resume:true});assert.equal(I.points(h3.api.state().individuality,'kindness'),4);assert.equal(I.points(h3.api.state().individuality,'courage'),0);
});
test('exchange handler supplies 10 experiences with four companions and 15 with five without romance',()=>{
 for(const count of [10,15]){const h=born(),s=h.api.state();s.companions=['owl','cat_friend','rabbit_friend','squirrel','shiba'].slice(0,count===10?4:5).map(id=>({id,bond:100}));
 for(const e of I.data.exchanges.filter(e=>s.companions.some(c=>c.id===e.companion)).slice(0,count))assert.equal(h.api.chooseIndividualExchange(e.id,s.individuality.lifeId),true);
 if(count===10)for(const e of I.data.events.filter(e=>e.choices.some(c=>c.heart==='kindness')).slice(0,5)){s.ageTicks=e.age*20;h.api.onAgeChanged(e.age-1);h.api.chooseIndividualityEvent(e.age,'kindness',s.individuality.lifeId);}
 assert.equal(I.points(s.individuality,'kindness'),60);h.api.checkAchievements();assert.ok(s.achievementsUnlocked.includes('heart-kindness-5'));
 }
});
test('real completed B games supply natural-only perseverance, without A/S or permanent-best dependency',()=>{
 const h=born(),s=h.api.state();s.lifetime.minigameRecords={};
 for(const g of h.api.games.filter(g=>!g.id.startsWith('quick')).slice(0,5)){s.lifetime.minigameRecords[g.id]={best:100,plays:99};h.api.startMinigame(g);h.api.finishMinigame(55);}
 h.api.startMinigame(h.api.games[0]);h.api.finishMinigame(55);
 assert.equal(I.points(s.individuality,'perseverance'),60);assert.equal(s.partner,null);
});
test('real travel, scenery and encounters reach natural-only wonder/courage without meguru',()=>{
 const h=born(),s=h.api.state();
 for(const r of h.api.REGIONS.slice(1,7)) {s.travelStreak=0;h.api.travelToRegion(r);}
 for(const m of Object.values(h.api.ENV_MOMENTS).flat().slice(0,5))h.api.individualScenery(m);
 for(const e of I.data.exchanges.filter(e=>e.category===0).slice(0,5)) {s.companions.push({id:e.companion,bond:100});h.api.chooseIndividualExchange(e.id,s.individuality.lifeId);}
 assert.ok(I.points(s.individuality,'wonder')>=60);
 const genres=new Set();for(const g of h.api.games){const genre=h.api.genreOf(g);if(genres.has(genre)||genre==='quick')continue;genres.add(genre);h.api.startMinigame(g);h.api.finishMinigame(35);if(genres.size===5)break;}
 assert.ok(I.points(s.individuality,'courage')>=60);
});
test('transform and infinity preserve individuality, ended life rejects all growth',()=>{
 const h=born(),s=h.api.state();const before=JSON.stringify(s.individuality);s.transformOptions=['cat'];h.api.chooseTransform('cat');assert.equal(JSON.stringify(s.individuality),before);
 s.lifetime.perfectCleared=true;h.api.enterInfinite();h.api.individualMeeting('owl');h.api.exitInfinite();assert.equal(JSON.stringify(h.api.state().individuality),before);
 h.api.state().stage='dead';h.api.individualMeeting('owl');assert.equal(JSON.stringify(h.api.state().individuality),before);
});
test('old adult save keeps permanent progress and only future events',()=>{
 const h=born(),s=h.api.state();s.ageTicks=1000;s.lifetime.money=12345;s.achievementsUnlocked=['gentle-10'];delete s.individuality;s.traitCounts={gentle:99};const store=storage();store.setItem('naotocchi-save-v1',JSON.stringify(s));const r=harness({storage:store,resume:true});const t=r.api.state();assert.equal(t.lifetime.money,12345);assert.ok(t.achievementsUnlocked.includes('gentle-10'));assert.equal(t.traitCounts,undefined);assert.equal(I.pending(t.individuality).length,0);t.ageTicks=1120;r.api.onAgeChanged(55);assert.equal(t.individuality.events[56].status,'pending');
});
test('closing menus dismisses the choice dialog and permits later resumption',()=>{
 const h=born(),s=h.api.state();s.ageTicks=60;h.api.onAgeChanged(2);h.get('storyFlash').classList.add('hidden');h.api.closeAllMenuOverlays();assert.equal(h.api.showIndividualityEvent(true),true);assert.equal(h.api.isTimePaused(),true);h.api.closeAllMenuOverlays();assert.equal(h.get('individualityDialog').classList.contains('hidden'),true);assert.equal(s.individuality.events[3].status,'pending');
});
test('automatic dialog synchronizes modal inert before the next user action',async()=>{
 const h=born(),s=h.api.state();s.ageTicks=60;h.api.onAgeChanged(2);h.get('storyFlash').classList.add('hidden');h.api.closeAllMenuOverlays();h.api.showIndividualityEvent(true);await Promise.resolve();assert.equal(h.get('screenNormal').inert,true);
});
test('all fifty quick solo wrappers and the mixed run complete without changing individuality',()=>{
 const h=born(),s=h.api.state(),before=JSON.stringify(s.individuality);assert.equal(h.api.QUICK_GAMES.length,50);
 for(const g of h.api.QUICK_GAMES){assert.equal(h.api.startQuickRun(g.id),true,g.id);h.api.finishMinigame(100);assert.equal(JSON.stringify(s.individuality),before,g.id);}
 assert.equal(s.minigameCount,50,'all fifty quick result handlers actually completed');
 assert.equal(h.api.startQuickRun(),true);h.api.finishMinigame(100);
 assert.equal(s.minigameCount,51,'mixed quick result handler also completed');
 assert.equal(JSON.stringify(s.individuality),before);
});
test('registered achievement total is 92 and removed IDs cannot fill new heart slots',()=>{
 const h=born(),a=h.api.achievements;assert.equal(a.length,92);assert.equal(a.filter(x=>x.id.startsWith('heart-')).length,4);
});
test('each heart reaches exactly 60 through ten adapter experiences and five legal age choices',()=>{
 for(const heart of Object.keys(I.data.hearts)){
  const h=born(),s=h.api.state();
  if(heart==='kindness'){s.companions=['owl','cat_friend','rabbit_friend','squirrel'].map(id=>({id,bond:100}));for(const e of I.data.exchanges.filter(e=>s.companions.some(c=>c.id===e.companion)).slice(0,10))h.api.chooseIndividualExchange(e.id,s.individuality.lifeId);}
  if(heart==='perseverance')h.api.games.slice(0,4).forEach((g,i)=>{h.api.startMinigame(g);h.api.finishMinigame(i===3?35:55);});
  if(heart==='wonder'||heart==='courage'){
   for(const r of h.api.REGIONS.slice(1,heart==='wonder'?5:4)){s.travelStreak=0;h.api.travelToRegion(r);}
   s.companions=['owl','cat_friend','rabbit_friend'].map(id=>({id,bond:100}));for(const e of I.data.exchanges.filter(e=>e.category===0&&s.companions.some(c=>c.id===e.companion)))h.api.chooseIndividualExchange(e.id,s.individuality.lifeId);
   if(heart==='wonder')for(const m of Object.values(h.api.ENV_MOMENTS).flat().slice(0,3))h.api.individualScenery(m);
   else{const genres=new Set();for(const g of h.api.games){const genre=h.api.genreOf(g);if(genres.has(genre)||genre==='quick')continue;genres.add(genre);h.api.startMinigame(g);h.api.finishMinigame(35);if(genres.size===4)break;}}
  }
  assert.equal(I.points(s.individuality,heart),40,heart);
  for(const e of I.data.events.filter(e=>e.choices.some(c=>c.heart===heart)).slice(0,5)){s.ageTicks=e.age*20;h.api.onAgeChanged(e.age-1);h.api.chooseIndividualityEvent(e.age,heart,s.individuality.lifeId);}
  assert.equal(I.points(s.individuality,heart),60,heart);h.api.checkAchievements();assert.ok(s.achievementsUnlocked.includes(`heart-${heart}-5`));
 }
});
test('next life keeps permanent achievements and full prior choices but starts hearts and choices anew',()=>{
 const h=born(),s=h.api.state(),old=s.individuality.lifeId;s.ageTicks=60;h.api.onAgeChanged(2);h.api.chooseIndividualityEvent(3,'kindness',old);s.achievementsUnlocked.push('heart-kindness-5');h.dispatch(h.get('resetBtn'),'click');h.api.hatchEgg();const next=h.api.state();assert.notEqual(next.individuality.lifeId,old);assert.equal(I.points(next.individuality,'kindness'),0);assert.equal(Object.keys(next.individuality.events).length,0);assert.equal(next.lifetime.pastLives.at(-1).individuality.events[3].heart,'kindness');assert.ok(next.achievementsUnlocked.includes('heart-kindness-5'));
});
