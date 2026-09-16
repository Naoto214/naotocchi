const test = require('node:test');
const assert = require('node:assert/strict');
const {harness} = require('./helpers/runtime-harness.cjs');

function growing(h) {
  const s = h.api.state();
  s.stage = 'growing'; s.gender = 'male'; s.orientationId = 'pan';
  s.attractedTo = ['female','male','nonbinary'];
  return s;
}

test('friend tickets list active-unjoined normal and rare companions without spending before confirmation', () => {
  const h = harness(), s = growing(h), normal = h.api.normalCompanions, rare = h.api.rareCompanions;
  s.items.c_friend = 1; s.items.c_rare_friend = 1;
  s.companions = [{id:normal[0].id,bond:80},{id:rare[0].id,bond:80}];
  s.lifetime.companionsRecruited = [normal[1].id];
  s.lifetime.rareCompanionsRecruited = [rare[1].id];
  const before = JSON.stringify(s.companions);
  assert.equal(h.api.useConsumableItem('c_friend'), false);
  assert.deepEqual(h.api.pickerValues(), normal.slice(1).map(c => c.id));
  assert.equal(JSON.stringify(s.companions), before); assert.equal(s.items.c_friend, 1);
  h.api.closePicker();
  assert.equal(h.api.useConsumableItem('c_rare_friend'), false);
  assert.deepEqual(h.api.pickerValues(), rare.slice(1).map(c => c.id));
  assert.equal(s.items.c_rare_friend, 1, 'rare ticket does not require the natural perk and waits for confirmation');
});

test('confirming a companion ticket opens the normal invitation and stale confirmation does not spend', () => {
  const h = harness(), s = growing(h), id = h.api.normalCompanions[0].id;
  s.items.c_friend = 2; h.api.useConsumableItem('c_friend'); h.api.resolvePickerSelection(id);
  assert.equal(s.items.c_friend, 1); assert.equal(h.api.pendingCompanion(), id);
  assert.equal(s.companions.length, 0, 'ticket does not directly join the companion');
  h.api.setPendingCompanion(null); s.companions.push({id,bond:100});
  h.api.useConsumableItem('c_friend');
  assert.equal(h.api.pickerValues().includes(id), false);
  h.api.resolvePickerSelection(id);
  assert.equal(s.items.c_friend, 1, 'joining after opening invalidates the choice');
  assert.equal(h.api.pendingCompanion(), null);
  s.companions=[]; h.api.useConsumableItem('c_friend'); delete s.items.c_friend;
  h.api.resolvePickerSelection(id);
  assert.equal(h.api.pendingCompanion(),null,'stock exhausted after opening invalidates the choice');
});

test('cancel and no candidate leave friend stock untouched', () => {
  const h = harness(), s = growing(h); s.items.c_friend = 1;
  s.companions = h.api.normalCompanions.map(c => ({id:c.id,bond:100}));
  assert.equal(h.api.useConsumableItem('c_friend'), false); assert.equal(s.items.c_friend, 1);
  s.companions = []; h.api.useConsumableItem('c_friend'); h.api.closePicker();
  assert.equal(s.items.c_friend, 1);
});

test('match ticket lists exactly the mutually attracted candidates for male female and nonbinary pets, including seen candidates', () => {
  const h = harness(), s = growing(h);
  const partners=h.api.partnerCandidates;
  const expectedByGender={
    male:['cat_ceo','robot_neighbor','field_cow','sunflower_partner','forest_bear','grove_deer'],
    female:['cliff_goat','high_eagle','snow_spirit','snowman','rock_octopus','sea_mermaid'],
    nonbinary:['anglerfish','swamp_croc','gentle_gorilla','knitting_spider','desert_scorpion','oasis_cactus'],
  };
  for (const [gender,ids] of Object.entries(expectedByGender)) {
    ids.forEach(id => { partners.find(candidate => candidate.id === id).attractedTo=[gender]; });
  }
  const cases = [
    ['male',expectedByGender.male],
    ['female',expectedByGender.female],
    ['nonbinary',expectedByGender.nonbinary],
  ];
  for (const [gender,expected] of cases) {
    s.gender=gender; s.orientationId='pan'; s.attractedTo=['female','male','nonbinary']; s.items.c_match=1;
    s.lifetime.partnerEncounters=[expected[0]]; h.api.useConsumableItem('c_match');
    const values=h.api.pickerValues();
    assert.equal(JSON.stringify(values),JSON.stringify(expected),`${gender} gets only mutual matches`);
    if (gender==='female') assert.equal(values.includes('cat_ceo'),false,'one-way attraction is excluded');
    h.api.closePicker();
  }
  s.orientationId='aro'; s.attractedTo=[]; s.items.c_match=1;
  assert.equal(h.api.useConsumableItem('c_match'),false); assert.equal(s.items.c_match,1);
});

test('match confirmation calls one candidate to the current region without changing world tables or creating a partner', () => {
  const h = harness(), s = growing(h); s.regionId='forest'; s.items.c_match=1;
  const tables=JSON.stringify(h.api.REGIONS); h.api.useConsumableItem('c_match'); const id='snow_spirit';
  assert.ok(h.api.pickerValues().includes(id)); h.api.resolvePickerSelection(id);
  assert.equal(h.api.itemStock('c_match'),0); assert.equal(JSON.stringify(s.calledMatch),JSON.stringify({id,regionId:'forest'}));
  assert.equal(s.partner,null); assert.equal(s.regionId,'forest'); assert.equal(JSON.stringify(h.api.REGIONS),tables);
});

test('match confirmation revalidates partner while calls survive introductions and clear on travel', () => {
  const h = harness(), s = growing(h); s.regionId='forest'; s.items.c_match=2;
  h.api.useConsumableItem('c_match'); s.partner={id:'existing'}; h.api.resolvePickerSelection('snow_spirit');
  assert.equal(s.items.c_match,2); assert.equal(s.calledMatch,null);
  s.partner=null; h.api.useConsumableItem('c_match'); h.api.resolvePickerSelection('snow_spirit');
  h.dispatch(h.get('courtBtn'),'click');
  assert.equal(s.partner,null, 'first encounter is still an introduction');
  assert.equal(s.calledMatch.id,'snow_spirit', 'introduction alone keeps the call');
  h.advance(1000); h.api.setRandom(()=>0); h.dispatch(h.get('courtBtn'),'click');
  assert.equal(s.partner.id,'snow_spirit', 'the ordinary court flow can form the partnership');
  assert.equal(s.calledMatch,null, 'forming a partnership clears the call');

  s.partner=null; s.items.c_match=1; h.api.useConsumableItem('c_match'); h.api.resolvePickerSelection('snow_spirit');
  h.api.travelToRegion(h.api.REGIONS.find(r => r.id !== s.regionId));
  assert.equal(s.calledMatch,null);
});

test('match confirmation revalidates stock and a local-home display transition keeps the paid call', () => {
  const h=harness(),s=growing(h); s.regionId='home'; s.items.c_match=1;
  h.api.useConsumableItem('c_match'); const id=h.api.pickerValues()[0]; delete s.items.c_match;
  h.api.resolvePickerSelection(id);
  assert.equal(s.calledMatch,null,'stale stock cannot create a call');
  s.items.c_match=1; h.api.useConsumableItem('c_match'); h.api.resolvePickerSelection(id);
  s.lifetime.currentLocationSelected=true; s.lifetime.currentLocation={label:'local scene'};
  assert.equal(h.api.travelToRegion(h.api.REGIONS.find(r=>r.id==='home')),undefined);
  assert.equal(s.regionId,'home');
  assert.equal(s.calledMatch.id,id,'changing only the home display does not count as region travel');
});

test('a called match survives save reload in the same region', () => {
  const data=new Map(), storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};
  const first=harness({storage}), s=growing(first); s.regionId='forest'; s.items.c_match=1;
  first.api.useConsumableItem('c_match'); first.api.resolvePickerSelection('snow_spirit');
  const resumed=harness({storage,resume:true});
  assert.equal(JSON.stringify(resumed.api.state().calledMatch),JSON.stringify({id:'snow_spirit',regionId:'forest'}));
});
