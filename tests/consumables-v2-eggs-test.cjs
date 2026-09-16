const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');
const SAVE = 'naotocchi-save-v1';
const storage = seed => {
  const data = new Map(seed ? [[SAVE,JSON.stringify(seed)]] : []);
  return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
};
const boot = store => harness({resume:true,storage:store});
const random = (h, value) => {h.sandbox.Math=Object.assign(Object.create(Math),{random:()=>value});};
const warm = h => {h.get('lifeCardOverlay').classList.add('hidden');h.api.closeAllMenuOverlays();for(let i=0;i<5;i++)h.dispatch(h.get('playWithBtn'),'click');};

for (const [kind,id] of [['normal','c_egg_normal'],['rare','c_egg_rare']]) {
  test(`${kind} egg reserves an unraised species without changing this life or spending stock`,()=>{
    const h=harness(),s=h.api.state(),pool=h.api[kind+'Lines'];
    s.items[id]=2;s.lifetime.raisedSpecies=[...pool.slice(0,-2)];random(h,0.99);
    const before={line:s.speciesLine,age:s.ageTicks,gender:s.gender,growth:s.growth};
    assert.equal(h.api.useConsumableItem(id),true);
    assert.equal(s.lifetime.nextEggLine,pool.at(-1));assert.equal(s.lifetime.nextEggKind,kind);
    assert.notEqual(s.lifetime.nextEggLine,'ren');assert.equal(h.api.itemStock(id),2);
    assert.deepEqual({line:s.speciesLine,age:s.ageTicks,gender:s.gender,growth:s.growth},before);
    assert.equal(s.lifetime.consumablesUsed,0);
  });
  test(`${kind} egg blocks an exhausted pool and cannot borrow from the other pool`,()=>{
    const h=harness(),s=h.api.state();s.items[id]=2;s.lifetime.raisedSpecies=[...h.api[kind+'Lines']];
    assert.equal(h.api.useConsumableItem(id),false);assert.equal(s.lifetime.nextEggLine,null);assert.equal(h.api.itemStock(id),2);
    h.api.openDreamPicker(kind);assert.equal(s.lifetime.nextEggLine,null);
  });
}

test('one reservation blocks all rerolls; cancellation never duplicates either stock',()=>{
  const h=harness(),s=h.api.state();s.items.c_egg_normal=2;s.items.c_egg_rare=3;random(h,0);
  assert.equal(h.api.useConsumableItem('c_egg_normal'),true);const chosen=s.lifetime.nextEggLine;
  random(h,0.99);
  for(const id of ['c_egg_normal','c_egg_rare'])assert.equal(h.api.useConsumableItem(id),false);
  h.dispatch(h.get('dreamRareBtn'),'click');assert.equal(s.lifetime.nextEggLine,chosen);
  h.api.resolvePickerSelection('ren');assert.equal(s.lifetime.nextEggLine,chosen);
  for(let i=0;i<2;i++)h.dispatch(h.get('dreamCancelBtn'),'click');
  assert.equal(s.lifetime.nextEggLine,null);assert.equal(s.lifetime.nextEggKind,null);
  assert.equal(h.api.itemStock('c_egg_normal'),2);assert.equal(h.api.itemStock('c_egg_rare'),3);
  assert.equal(h.api.useConsumableItem('c_egg_rare'),true);assert.equal(s.lifetime.nextEggKind,'rare');
});

test('reservation and unused stock survive reload, infinite return and next life; five taps consume once',()=>{
  const store=storage();let h=harness({storage:store}),s=h.api.state();
  s.items.c_egg_normal=2;s.items.c_egg_rare=3;
  assert.equal(h.api.useConsumableItem('c_egg_normal'),true);const chosen=s.lifetime.nextEggLine;
  h.api.enterInfinite();h.api.saveState();h=boot(store);h.api.exitInfinite();s=h.api.state();
  assert.equal(s.lifetime.nextEggLine,chosen);assert.equal(h.api.itemStock('c_egg_normal'),2);
  assert.equal(h.api.pickDreamLine(),null);assert.equal(s.lifetime.nextEggLine,chosen);
  h.dispatch(h.get('resetBtn'),'click');h.api.saveState();h=boot(store);s=h.api.state();
  assert.equal(s.stage,'egg');assert.equal(s.lifetime.nextEggLine,chosen);
  assert.equal(h.api.pickDreamLine(),chosen);assert.equal(h.api.itemStock('c_egg_normal'),2);
  warm(h);assert.equal(s.stage,'growing');assert.equal(s.speciesLine,chosen);
  assert.equal(s.lifetime.nextEggLine,null);assert.equal(s.lifetime.nextEggKind,null);
  assert.equal(h.api.itemStock('c_egg_normal'),1);assert.equal(h.api.itemStock('c_egg_rare'),3);
  assert.equal(s.lifetime.consumablesUsed,1);assert.ok(h.api.experiencedSpecies().includes(chosen));
  h.api.hatchEgg();h.api.saveState();h=boot(store);h.api.hatchEgg();
  assert.equal(h.api.itemStock('c_egg_normal'),1);assert.equal(h.api.state().lifeLog.filter(x=>x.text==='たまごからうまれた').length,1);
});

test('funded legacy reservation keeps an already raised species through migration and hatch',()=>{
  const seed=harness().api.state();seed.stage='egg';seed.lifetime.dreamEggs={normal:2,rare:1};
  seed.lifetime.nextEggLine='dog';delete seed.lifetime.nextEggKind;delete seed.lifetime.itemMigrations;
  seed.lifetime.raisedSpecies=['dog'];seed.items.c_safety=2;seed.lifetime.money=7;
  const store=storage(seed);let h=boot(store);
  assert.equal(h.api.state().lifetime.nextEggLine,'dog');assert.equal(h.api.itemStock('c_egg_normal'),2);
  assert.equal(h.api.state().lifetime.money,47);assert.equal(h.api.state().items.c_safety,undefined);
  h.api.saveState();h=boot(store);assert.equal(h.api.state().lifetime.money,47);warm(h);
  assert.equal(h.api.state().speciesLine,'dog');assert.equal(h.api.itemStock('c_egg_normal'),1);
  assert.deepEqual({...h.api.state().lifetime.dreamEggs},{});
});

test('old discovered species seed the unraised pool while new temporary discoveries do not',()=>{
  const seed=harness().api.state();delete seed.lifetime.raisedSpecies;
  seed.discoveredStages=['dog:0','cat:7'];seed.items.c_egg_normal=2;
  const h=boot(storage(seed)),s=h.api.state();random(h,0);
  assert.equal(h.api.useConsumableItem('c_egg_normal'),true);
  assert.ok(!['dog','cat'].includes(s.lifetime.nextEggLine));
  h.dispatch(h.get('dreamCancelBtn'),'click');
  s.lifetime.raisedSpecies=h.api.normalLines.filter(x=>x!=='dog');s.discoveredStages.push('dog:1');
  assert.equal(h.api.useConsumableItem('c_egg_normal'),true);assert.equal(s.lifetime.nextEggLine,'dog');
});

test('malformed or unfunded reservations never grant their species or negative stock',()=>{
  for(const [line,kind,count] of [['ren','rare',1],['nope','normal',1],['dog','rare',1],['dog','nope',1],['dog','',1],['dog','normal',0],['dog','normal',-1],['dog','normal',1.5],['dog','normal','2'],['dog','normal',Infinity]]) {
    const h=harness(),s=h.api.state();s.stage='egg';s.items.c_egg_normal=count;s.items.c_egg_rare=count;
    s.lifetime.nextEggLine=line;s.lifetime.nextEggKind=kind;
    assert.equal(h.api.pickDreamLine(),null,JSON.stringify([line,kind,count]));
    assert.equal(s.lifetime.nextEggLine,null);assert.equal(s.lifetime.nextEggKind,null);
    assert.ok(h.api.itemStock('c_egg_normal')>=0);assert.ok(h.api.itemStock('c_egg_rare')>=0);
    random(h,0.99);h.api.hatchEgg();assert.notEqual(s.speciesLine,line);
  }
});

test('infinite mode cannot reserve or hatch a funded egg',()=>{
  const h=harness(),s=h.api.state();s.infinite=true;s.items.c_egg_rare=1;
  assert.equal(h.api.useConsumableItem('c_egg_rare'),false);
  s.stage='egg';s.lifetime.nextEggLine='phoenix';s.lifetime.nextEggKind='rare';h.api.hatchEgg();
  assert.equal(s.stage,'egg');assert.equal(h.api.itemStock('c_egg_rare'),1);assert.equal(s.lifetime.nextEggLine,'phoenix');
});

test('existing milestone egg grants use new stock once and never revive old dream fields',()=>{
  const h=harness(),s=h.api.state();
  for(const n of [90,100,90,100])h.api.onSodachiMilestone(n);
  assert.equal(h.api.itemStock('c_egg_normal'),1);assert.equal(h.api.itemStock('c_egg_rare'),1);
  assert.deepEqual({...s.lifetime.dreamEggs},{});
});
