const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

function memoryStorage() {
  const data = new Map();
  return {data,getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
}

test('time tickets change only the adjacent visual stage for five real minutes', () => {
  const h=harness(),s=h.api.state();
  Object.assign(s,{speciesLine:'dog',ageTicks:500,stageIndex:5,gender:'male',orientationId:'gay',attractedTo:['male']});
  s.items.c_time_forward=1;
  const identity={line:s.speciesLine,age:s.ageTicks,gender:s.gender,orientation:s.orientationId,targets:[...s.attractedTo]};
  assert.equal(h.api.useConsumableItem('c_time_forward'),true);
  assert.deepEqual({line:s.speciesLine,age:s.ageTicks,gender:s.gender,orientation:s.orientationId,targets:[...s.attractedTo]},identity);
  assert.equal(h.api.currentVisualForm().line,'dog'); assert.equal(h.api.currentVisualForm().index,6);
  assert.equal(s.itemLife.temporaryForm.expiresAt-h.api.now(),300000);
  assert.equal(s.discoveredStages.includes('dog:6'),true);
  assert.deepEqual([...h.api.experiencedSpecies()],[]);
  h.advance(299999); assert.equal(h.api.currentVisualForm().index,6);
  h.advance(1); assert.equal(h.api.currentVisualForm().index,5);
  assert.equal(s.itemLife.temporaryForm,undefined);
});

test('time tickets enforce the first and eighth actual-stage boundaries', () => {
  for (const [age,id] of [[0,'c_time_back'],[70,'c_time_forward']]) {
    const h=harness(),s=h.api.state(); s.ageTicks=age*20; s.items[id]=1;
    assert.equal(h.api.useConsumableItem(id),false,id);
    assert.equal(h.api.itemStock(id),1,id);
    assert.equal(s.itemLife.temporaryForm,undefined,id);
  }
});

test('a temporary form survives reload without extending and clears on a real stage change', () => {
  const storage=memoryStorage(),h=harness({storage}),s=h.api.state();
  s.items.c_time_back=1; assert.equal(h.api.useConsumableItem('c_time_back'),true);
  h.advance(120000); h.api.saveState();
  const reloaded=harness({storage,resume:true,clockNow:121000});
  assert.equal(reloaded.api.state().itemLife.temporaryForm.expiresAt-reloaded.api.now(),180000);
  reloaded.api.state().ageTicks=12*20;
  reloaded.api.onAgeChanged(11);
  assert.equal(reloaded.api.state().itemLife.temporaryForm,undefined);
  assert.equal(reloaded.api.currentVisualForm().line,'dog'); assert.equal(reloaded.api.currentVisualForm().index,3);
});

test('dex tickets offer exactly all ordinary and eight rare forms and stale choices do not spend', () => {
  const h=harness(),s=h.api.state(); s.items.c_dex=2;
  assert.equal(h.api.useConsumableItem('c_dex'),false,'picker opens before spending');
  const keys=h.api.pickerValues();
  assert.equal(keys.length,(h.api.normalLines.length+8)*8);
  assert.equal(keys.some(key=>key.startsWith('ren:')),false);
  assert.equal(keys.some(key=>key.startsWith('legend')),false);
  h.api.closePicker(); assert.equal(h.api.itemStock('c_dex'),2);
  assert.equal(h.api.useConsumableItem('c_dex'),false);
  const target=keys.find(key=>!s.discoveredStages.includes(key));
  s.items.c_dex=0; h.api.resolvePickerSelection(target);
  assert.equal(s.discoveredStages.includes(target),false); assert.equal(h.api.itemStock('c_dex'),0);
  s.items.c_dex=1; assert.equal(h.api.useConsumableItem('c_dex'),false);
  h.api.resolvePickerSelection(target);
  assert.equal(s.discoveredStages.includes(target),true); assert.equal(h.api.itemStock('c_dex'),0);
  assert.deepEqual([...h.api.experiencedSpecies()],[]);
});

test('transform tickets fund three legal candidates and favor species never raised', () => {
  const h=harness(),s=h.api.state(); s.items.c_transform=1;
  s.lifetime.raisedSpecies=h.api.normalLines.slice(0,5);
  const beforeMeter=s.transformMeter=37, beforeAge=s.ageTicks, beforeLine=s.speciesLine;
  assert.equal(h.api.useConsumableItem('c_transform'),false);
  assert.equal(h.api.itemStock('c_transform'),1); assert.equal(s.transformMeter,beforeMeter);
  const offered=[...s.transformOptions]; assert.equal(offered.length,3);
  assert.equal(offered.includes(beforeLine),false);
  assert.equal(offered.every(line=>!s.lifetime.raisedSpecies.includes(line)),true);
  h.api.closePicker(); assert.equal(h.api.itemStock('c_transform'),1);
  assert.equal(h.api.useConsumableItem('c_transform'),false);
  const chosen=s.transformOptions[0]; h.api.resolvePickerSelection(chosen);
  assert.equal(s.speciesLine,chosen); assert.equal(s.ageTicks,beforeAge); assert.equal(s.transformMeter,beforeMeter);
  assert.equal(h.api.itemStock('c_transform'),0); assert.equal(s.lifetime.raisedSpecies.includes(chosen),true);
  assert.equal(s.transformOptions,null);
});

test('transform tickets supplement experienced candidates and reject stale or unavailable selections', () => {
  const h=harness(),s=h.api.state(); s.items.c_transform=2;
  s.lifetime.raisedSpecies=[...h.api.normalLines];
  assert.equal(h.api.useConsumableItem('c_transform'),false);
  assert.equal(s.transformOptions.length,3);
  const stale=h.api.normalLines.find(line=>!s.transformOptions.includes(line)&&line!==s.speciesLine);
  h.api.resolvePickerSelection(stale);
  assert.equal(h.api.itemStock('c_transform'),2); assert.equal(s.speciesLine,'dog');
  s.transformOptions=null; s.stage='egg';
  assert.equal(h.api.useConsumableItem('c_transform'),false); assert.equal(h.api.itemStock('c_transform'),2);
});

test('legacy discovery seeds raised species once without later temporary discoveries', () => {
  const storage=memoryStorage(),seed=harness().api.state();
  delete seed.lifetime.raisedSpecies;
  seed.discoveredStages=['cat:2','cat:3','phoenix:1'];
  storage.setItem('naotocchi-save-v1',JSON.stringify(seed));
  const loaded=harness({storage,resume:true});
  assert.deepEqual([...loaded.api.experiencedSpecies()].sort(),['cat','phoenix']);
  loaded.api.state().discoveredStages.push('unicorn:4'); loaded.api.saveState();
  const again=harness({storage,resume:true});
  assert.deepEqual([...again.api.experiencedSpecies()].sort(),['cat','phoenix']);
});

test('an actual transformation clears a temporary appearance', () => {
  const h=harness(),s=h.api.state(); s.items.c_time_forward=1;
  assert.equal(h.api.useConsumableItem('c_time_forward'),true);
  s.transformOptions=['cat']; h.api.chooseTransform('cat');
  assert.equal(s.itemLife.temporaryForm,undefined);
  assert.equal(h.api.currentVisualForm().line,'cat');
  assert.equal(s.lifetime.raisedSpecies.includes('cat'),true);
});
