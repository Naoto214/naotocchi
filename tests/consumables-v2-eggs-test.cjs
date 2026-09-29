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
  h.api.useConsumableItem('c_egg_rare');assert.equal(s.lifetime.nextEggLine,chosen);
  h.api.resolvePickerSelection('ren');assert.equal(s.lifetime.nextEggLine,chosen);
  for(let i=0;i<2;i++)h.api.cancelNextEgg(`c_egg_${s.lifetime.nextEggKind || 'normal'}`);
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
  h.api.cancelNextEgg(`c_egg_${s.lifetime.nextEggKind || 'normal'}`);
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

function itemAction(h, action, id) {
  const button={dataset:{itemAction:action,id},disabled:false};
  const grid=h.get('onetimeItemGrid'),old=grid.closest;grid.closest=()=>button;
  h.dispatch(grid,'click');grid.closest=old;
}
for (const kind of ['normal','rare']) {
  test(`${kind} purchase reserves secretly once; cancel/re-reserve/reload never refunds or clones`,()=>{
    const store=storage();let h=harness({storage:store}),s=h.api.state();
    const id=`c_egg_${kind}`, price=h.api.ITEM_SYSTEM.CATALOG[id].price;
    s.lifetime.money=30000;random(h,0);
    itemAction(h,'buy',id);
    const chosen=s.lifetime.nextEggLine;
    assert.ok(h.api[kind+'Lines'].includes(chosen),'purchase automatically reserves');
    assert.equal(s.lifetime.money,30000-price);assert.equal(h.api.itemStock(id),1);
    const secret=()=>{
      h.api.renderItemOverlay();
      const html=h.get('onetimeItemGrid').innerHTML;
      assert.match(html,/次の人生：？？？/);
      for(const stage of h.api.SPECIES[chosen].stages){assert.ok(!html.includes(stage.label));if(stage.asset)assert.ok(!html.includes(stage.asset));}
      assert.ok(!h.api.getMessage().includes(h.api.SPECIES[chosen].stages[0].label));
    };
    secret();h.api.saveState();h=boot(store);s=h.api.state();secret();
    assert.equal(s.lifetime.nextEggLine,chosen);
    for(const other of ['c_egg_normal','c_egg_rare'])assert.equal(h.api.buyConsumableItem(other),false);
    assert.equal(s.lifetime.money,30000-price);
    itemAction(h,'cancel',id);itemAction(h,'cancel',id);
    assert.equal(s.lifetime.nextEggLine,null);assert.equal(h.api.itemStock(id),1);assert.equal(s.lifetime.money,30000-price);
    itemAction(h,'use',id);assert.ok(s.lifetime.nextEggLine);assert.equal(s.lifetime.money,30000-price);
    s.stage='egg';const next=s.lifetime.nextEggLine;h.api.hatchEgg();h.api.hatchEgg();
    assert.equal(s.speciesLine,next);assert.equal(h.api.itemStock(id),0);assert.equal(s.lifetime.consumablesUsed,1);
  });
  test(`${kind} reserve without stock cannot purchase and unavailable purchase cannot charge`,()=>{
    const h=harness(),s=h.api.state(),id=`c_egg_${kind}`;s.lifetime.money=30000;
    itemAction(h,'use',id);assert.equal(s.lifetime.money,30000);assert.equal(s.lifetime.nextEggLine,null);
    for(const stage of ['dead','clear']){s.stage=stage;assert.equal(h.api.buyConsumableItem(id),false);}
    s.stage='growing';s.infinite=true;assert.equal(h.api.buyConsumableItem(id),false);
    s.infinite=false;s.lifetime.raisedSpecies=[...h.api[kind+'Lines']];assert.equal(h.api.buyConsumableItem(id),false);
    assert.equal(s.lifetime.money,30000);assert.equal(h.api.itemStock(id),0);
  });
}
test('central egg controls are removed from real HTML and runtime listeners',()=>{
  const fs=require('node:fs');
  for(const file of ['index.html','script.js'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/dreamNormalBtn|dreamRareBtn|dreamCancelBtn|dreamStatus/);
});

for(const kind of ['normal','rare'])test(`${kind} egg card has exactly one state-appropriate action and owned stock cannot be repurchased`,()=>{
  const store=storage();let h=harness({storage:store}),s=h.api.state();
  const id=`c_egg_${kind}`,price=h.api.ITEM_SYSTEM.CATALOG[id].price;s.lifetime.money=30000;
  const actions=()=>{h.api.renderItemOverlay();const html=h.get('onetimeItemGrid').innerHTML;
    assert.doesNotMatch(html,/ふくろからよやく|かってよやく/);
    return [...html.matchAll(new RegExp(`<button[^>]*data-item-action="([^"]+)"[^>]*data-id="${id}"[^>]*>([^<]*)</button>`,'g'))].map(m=>[m[1],m[2]]);};
  assert.deepEqual(actions(),[['buy',`かう（${price}コイン）`]]);
  itemAction(h,'buy',id);const reserved=s.lifetime.nextEggLine;
  assert.deepEqual(actions(),[['cancel','よやくをとりけす']]);
  assert.match(h.get('onetimeItemGrid').innerHTML,/次の人生：？？？/);
  for(let i=0;i<3;i++){
    itemAction(h,'cancel',id);assert.equal(h.api.itemStock(id),1);
    assert.deepEqual(actions(),[['use','よやくする']]);
    assert.equal(h.api.buyConsumableItem(id),false);assert.equal(s.lifetime.money,30000-price);
    h.api.saveState();h=boot(store);s=h.api.state();assert.deepEqual(actions(),[['use','よやくする']]);
    itemAction(h,'use',id);assert.deepEqual(actions(),[['cancel','よやくをとりけす']]);
    h.api.saveState();const line=s.lifetime.nextEggLine;h=boot(store);s=h.api.state();
    assert.equal(s.lifetime.nextEggLine,line);assert.equal(h.api.itemStock(id),1);assert.equal(s.lifetime.money,30000-price);
    assert.deepEqual(actions(),[['cancel','よやくをとりけす']]);
  }
  assert.ok(reserved);
});
