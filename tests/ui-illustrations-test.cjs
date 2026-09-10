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
