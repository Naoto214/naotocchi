const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness}=require('./helpers/runtime-harness.cjs');

test('the shop connects each current item to its illustration and keeps its label',()=>{
  const h=harness();h.api.openExclusiveMenu('item');h.api.render();
  const html=h.get('shopItemGrid').innerHTML;
  const expected={flower:'flower',ribbon:'ribbon',bowtie:'bowtie',poop1:'paper',scarf:'scarf',
    glasses:'glasses',energy1:'band',hat:'hat',travel1:'backpack',sleepboost1:'sleep',
    star:'star_badge',bond1:'paw_badge',partner1:'letter',crown:'crown',itemluck1:'clover'};
  const buttons=[...html.matchAll(/<button\b[^>]*data-id="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
  assert.equal(buttons.length,15);
  for(const [,id,body] of buttons){
    assert.match(body,new RegExp(`data-(?:ui|care)-icon="${expected[id]}"`),id);
    assert.match(body,/<span class="shop-item-label">[^<]+<\/span>/,id);
  }
  assert.match(buttons.find(b=>b[1]==='crown')[2],/220/);
  assert.match(buttons.find(b=>b[1]==='flower')[2],/60/);
});

test('equipment uses the matching illustration without modifying the saved item or actor frame',()=>{
  const h=harness();h.api.state().lifetime.equippedItemId='ribbon';
  h.api.state().lifetime.ownedShopItems=['ribbon'];h.api.render();
  const node=h.get('petAccessory');
  assert.match(node.innerHTML,/data-ui-icon="ribbon"/);
  assert.match(node.innerHTML,/aria-label="リボン"/);
  const size={width:node.style.width,height:node.style.height};
  h.api.state().poopCount=3;h.api.render();
  assert.deepEqual({width:node.style.width,height:node.style.height},size);
  assert.equal(h.api.state().lifetime.equippedItemId,'ribbon');
});

test('manual weather and time retain their labels beside the right illustration',()=>{
  const h=harness();Object.assign(h.api.state().lifetime,{weatherMode:'rain',timeMode:'night'});
  h.api.openExclusiveMenu('world');h.api.renderEnvironment();
  assert.match(h.get('worldNowCard').innerHTML,/data-ui-icon="rain"/);
  assert.match(h.get('worldNowCard').innerHTML,/data-ui-icon="moon"/);
  assert.match(h.get('worldNowCard').innerHTML,/あめ/);
  assert.match(h.get('worldNowCard').innerHTML,/よる/);
  assert.match(h.get('weatherModeGrid').innerHTML,/data-ui-icon="snow"/);
  assert.equal(h.api.state().lifetime.weatherMode,'rain');
  assert.equal(h.api.state().lifetime.timeMode,'night');
});

test('a saved fun item displays its prop and consumes the same single item',()=>{
  const h=harness();
  // Record already-earned age and first-use achievements before this repeat
  // use; otherwise their existing story flash intentionally replaces the prop.
  h.api.state().lifetime.consumablesUsed=1;
  h.api.saveState();h.api.render();
  h.api.state().items.fun_bubbles=2;h.api.render();
  assert.match(h.get('itemsRow').innerHTML,/data-ui-icon="bubbles"/);
  h.get('itemsRow').closest=()=>({dataset:{itemId:'fun_bubbles'},disabled:false});
  h.dispatch(h.get('itemsRow'),'click');
  assert.match(h.get('storyFlashEmoji').innerHTML,/data-ui-icon="bubbles"/);
  assert.equal(h.api.state().items.fun_bubbles,1);
  assert.match(h.get('storyFlashText').textContent,/しゃぼんだま/);
});

test('an atlas error exposes the original inventory emoji without changing counts or equipment',()=>{
  const h=harness();h.api.state().items.fun_bubbles=2;
  h.api.state().lifetime.ownedShopItems=['sleepboost1'];
  h.api.state().lifetime.equippedItemId='sleepboost1';h.api.render();
  const before=JSON.stringify(h.api.state());
  for(const atlas of ['ui','care']) {
    const probe=h.document.body.children.find(e=>e.dataset.iconAtlas===atlas);
    assert.ok(probe,atlas+' loading must have an error signal');
    probe.listeners.find(e=>e.type==='error').fn();
    assert.equal(h.document.documentElement.dataset[atlas+'Atlas'],'failed');
  }
  assert.match(h.get('itemsRow').innerHTML,/class="icon-fallback"[^>]*>🫧<\/span>/);
  assert.match(h.get('petAccessory').innerHTML,/class="icon-fallback"[^>]*>🛏️<\/span>/);
  assert.equal(JSON.stringify(h.api.state()),before);
});

test('cloud, snow and moon use illustrated scenery while retaining weather particle counts',()=>{
  const h=harness();
  for(const [weather,time,icon,particle,count] of [
    ['cloudy','day','cloud','wx-cloud',5],['snow','day','snow','wx-flake',26],
    ['sunny','night','moon','wx-star',30],
  ]){
    Object.assign(h.api.state().lifetime,{weatherMode:weather,timeMode:time});h.api.renderEnvironment();
    const html=h.get('weatherFx').innerHTML;
    assert.match(html,new RegExp(`data-ui-icon="${icon}"`));
    assert.equal((html.match(new RegExp(`class="${particle}"`,'g'))||[]).length,count);
    assert.match(html,/class="icon-fallback"/);
  }
  Object.assign(h.api.state().lifetime,{weatherMode:'rain',timeMode:'day'});h.api.renderEnvironment();
  assert.equal((h.get('weatherFx').innerHTML.match(/class="wx-drop"/g)||[]).length,42);
});

test('lightweight weather keeps its smaller particle sets and unchanged choices',()=>{
  const h=harness();for(let i=0;i<92;i++){h.advance(35);h.api.mgPerfSample();}
  for(const [weather,icon,particle,count] of [['cloudy','cloud','wx-cloud',3],['snow','snow','wx-flake',12]]){
    Object.assign(h.api.state().lifetime,{weatherMode:weather,timeMode:'day'});h.api.renderEnvironment();
    const html=h.get('weatherFx').innerHTML;
    assert.match(html,new RegExp(`data-ui-icon="${icon}"`));
    assert.equal((html.match(new RegExp(`class="${particle}"`,'g'))||[]).length,count);
    assert.equal(h.api.state().lifetime.weatherMode,weather);
  }
});

test('winter decor and season controls reuse matching art without replacing region identity',()=>{
  const h=harness();h.api.state().regionId='home';h.api.state().lifetime.seasonMode='winter';
  h.api.render();h.api.openExclusiveMenu('world');h.api.renderEnvironment();
  const decor=h.get('regionDecor').innerHTML;
  for(const icon of ['snow','cloud','ribbon','scarf'])assert.match(decor,new RegExp(`data-ui-icon="${icon}"`));
  assert.match(decor,/🏠/);
  assert.match(h.get('seasonBgFx').innerHTML,/data-ui-icon="snow"/);
  assert.match(h.get('seasonModeGrid').innerHTML,/data-ui-icon="snow"/);
  assert.match(h.get('worldNowCard').innerHTML,/data-ui-icon="snow"/);
  assert.match(h.get('worldNowCard').innerHTML,/ふゆ/);
  assert.equal(h.api.state().regionId,'home');
  assert.equal(h.api.state().lifetime.seasonMode,'winter');
});

test('reduced motion keeps world labels and illustrated choices without falling rain or snow',()=>{
  const h=harness({reducedMotion:true});h.api.openExclusiveMenu('world');
  for(const [weather,label] of [['rain','あめ'],['snow','ゆき'],['cloudy','くもり']]){
    h.api.state().lifetime.weatherMode=weather;h.api.renderEnvironment();
    assert.doesNotMatch(h.get('weatherFx').innerHTML,/class="wx-(drop|flake|cloud)"/);
    assert.match(h.get('worldNowCard').innerHTML,new RegExp(label));
    assert.match(h.get('worldNowCard').innerHTML,new RegExp(`data-ui-icon="${weather==='cloudy'?'cloud':weather}"`));
  }
});

test('earned header badges use illustrations in tier order without granting an unearned clear',()=>{
  const h=harness(), lifetime=h.api.state().lifetime;
  lifetime.endingTiersReached=[4,0,3,1,2];lifetime.clears=1;h.api.render();
  const buttons=[...h.get('endingBadges').innerHTML.matchAll(/<button\b[^>]*aria-label="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
  assert.equal(buttons.length,5);
  for(const [i,icon] of ['fireworks','lantern','tree','book','naoto_crown'].entries()){
    assert.match(buttons[i][1],/をたっせいずみ$/);
    assert.match(buttons[i][2],new RegExp(`data-ui-icon="${icon}"`));
    assert.match(buttons[i][2],/class="icon-fallback"/);
  }
  assert.deepEqual(Array.from(lifetime.endingTiersReached),[4,0,3,1,2]);
  lifetime.clears=0;h.api.render();
  assert.doesNotMatch(h.get('endingBadges').innerHTML,/data-ui-icon="fireworks"/);
  assert.equal((h.get('endingBadges').innerHTML.match(/class="ending-badge"/g)||[]).length,4);
  assert.equal(lifetime.clears,0);
});

test('spring summer and autumn labels and regional scenery share art while preserving their choices',()=>{
  const h=harness();h.api.state().regionId='home';
  for(const [season,icon,label] of [['spring','cherry_blossom','はる'],['summer','sunflower','なつ'],['autumn','maple_leaf','あき']]){
    h.api.state().lifetime.seasonMode=season;h.api.render();
    assert.match(h.get('seasonLabel').innerHTML,new RegExp(`data-ui-icon="${icon}"`));
    assert.match(h.get('seasonLabel').innerHTML,new RegExp(label));
    assert.match(h.get('regionLabel').innerHTML,/data-ui-icon="house"/);
    h.api.openExclusiveMenu('world');h.api.renderEnvironment();
    assert.match(h.get('worldNowCard').innerHTML,new RegExp(`data-ui-icon="${icon}"`));
    assert.match(h.get('seasonModeGrid').innerHTML,new RegExp(`data-ui-icon="${icon}"`));
    assert.equal(h.api.state().lifetime.seasonMode,season);
    assert.equal(h.api.state().regionId,'home');
  }
  h.api.state().regionId='forest';h.api.state().lifetime.seasonMode='autumn';h.api.render();
  assert.match(h.get('regionDecor').innerHTML,/data-ui-icon="maple_leaf"/);
  assert.match(h.get('regionDecor').innerHTML,/data-care-icon="decline"/);
});

test('the scenery atlas can fail independently and keeps a visible fallback for header badges',()=>{
  const h=harness();h.api.state().lifetime.endingTiersReached=[2];h.api.render();
  const before=JSON.stringify(h.api.state());
  const probes=h.document.body.children.filter(e=>e.dataset.iconAtlas);
  assert.equal(probes.length,3);
  for(const atlas of ['care','ui','scenery']){
    probes.find(e=>e.dataset.iconAtlas===atlas).listeners.find(e=>e.type==='load').fn();
  }
  probes.find(e=>e.dataset.iconAtlas==='scenery').listeners.find(e=>e.type==='error').fn();
  assert.equal(h.document.documentElement.dataset.sceneryAtlas,'failed');
  assert.equal(h.document.documentElement.dataset.careAtlas,'loaded');
  assert.equal(h.document.documentElement.dataset.uiAtlas,'loaded');
  assert.match(h.get('endingBadges').innerHTML,/class="icon-fallback"[^>]*>🌳<\/span>/);
  assert.equal(JSON.stringify(h.api.state()),before);
});
