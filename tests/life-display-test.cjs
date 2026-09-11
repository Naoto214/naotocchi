const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');

test('life card and received life code show the recorded woman, not a system emoji',()=>{
  const h=harness();Object.assign(h.api.state(),{speciesLine:'woman',ageTicks:160,stageIndex:2});
  const before=JSON.stringify(h.api.state());
  assert.match(h.api.buildLifeCard(),/assets\/characters\/woman\/03\.png/);
  const code=h.api.encodeLifeCode(),card=h.api.decodeLifeCode(code);
  assert.match(h.api.lifeCodeCardHTML(card),/assets\/characters\/woman\/03\.png/);
  assert.equal(JSON.stringify(h.api.state()),before);
});

test('overlapping stage names and chosen infinite forms retain their recorded portraits',()=>{
  const h=harness();Object.assign(h.api.state(),{speciesLine:'woman'});
  const html=h.api.buildLifeTimelineHTML([{age:40,icon:'👩',text:'40さい落ちついた大人になった'}],0,'woman');
  assert.match(html,/woman\/07\.png/);assert.doesNotMatch(html,/woman\/06\.png/);
  assert.match(h.api.buildLifeTimelineHTML([{age:40,icon:'🧑',text:'40さい落ちついた大人になった'}],0,'man'),/man\/07\.png/);
  Object.assign(h.api.state(),{ageTicks:2000,infinite:true,infiniteForm:{line:'woman',stageIndex:2}});
  const card=h.api.decodeLifeCode(h.api.encodeLifeCode());
  assert.match(h.api.lifeCodeCardHTML(card),/woman\/03\.png/);
  delete card.visualStage;
  assert.match(h.api.lifeCodeCardHTML(card),/woman\/03\.png/,'older cards infer the matching recorded glyph');
});

test('leaving current location restores the home-region label after presentation caching',()=>{
  const h=harness();h.api.render();
  const expected=h.get('regionLabel').textContent;
  Object.assign(h.api.state().lifetime,{currentLocationSelected:true,currentLocation:{name:'函館市',display:'はこだてし',prefecture:'北海道'}});
  h.api.render();assert.match(h.get('regionLabel').textContent,/はこだてし/);
  h.api.travelToRegion(h.api.REGIONS.find(r=>r.id==='home'));h.api.render();
  assert.equal(h.get('regionLabel').textContent,expected);
});

test('legacy life timeline resolves stage labels and keeps unrelated log strings escaped',()=>{
  const h=harness();Object.assign(h.api.state(),{speciesLine:'woman'});
  const log=[{age:0,icon:'🥚',text:'たまごからうまれた'},
    {age:3,icon:'👶',text:'3さいよちよちになった'},
    {age:7,icon:'🧒',text:'7さい子どもになった'},
    {age:8,icon:'💊',text:'びょうきをなおしてもらった <b>記録</b>'}];
  const before=JSON.stringify(log),html=h.api.buildLifeTimelineHTML(log,0,'woman');
  assert.match(html,/assets\/characters\/egg\/intact\.png/);
  assert.match(html,/assets\/characters\/woman\/02\.png/);
  assert.match(html,/assets\/characters\/woman\/03\.png/);
  assert.match(html,/data-care-icon="medicine"/);
  assert.match(html,/&lt;b&gt;記録&lt;\/b&gt;/);
  assert.equal(JSON.stringify(log),before);
});
