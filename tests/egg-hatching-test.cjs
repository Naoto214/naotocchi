const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

const SAVE = 'naotocchi-save-v1';
function storage() {
  const data = new Map();
  return {data, getItem:key=>data.get(key)??null,
    setItem:(key,value)=>data.set(key,String(value)), removeItem:key=>data.delete(key)};
}
const boot = store => {
  const h=harness({resume:true, storage:store});
  // The minimal DOM harness does not parse index.html's initial hidden class.
  h.get('lifeCardOverlay').classList.add('hidden');
  h.api.render();
  return h;
};
const warm = h => h.dispatch(h.get('playWithBtn'),'click');
const visual = h => h.get('petSprite').querySelector('.character-visual');
const births = h => h.api.state().lifeLog.filter(x=>x.text==='たまごからうまれた');

test('five warming taps show progressive egg art and hatch once at the existing boundary', () => {
  const h=boot(storage()); h.api.render();
  assert.match(h.get('petSprite').innerHTML,/egg\/intact.png/);
  h.api.state().lifetime.nextEggLine='dog';
  for(const [i,asset] of ['intact','cracking','cracking','ready'].entries()) {
    warm(h);
    assert.equal(h.api.state().stage,'egg');
    assert.equal(h.api.state().growth,(i+1)*4);
    assert.match(h.get('petSprite').innerHTML,new RegExp(`egg/${asset}.png`));
    assert.equal(visual(h).classList.contains('egg-warming'),true);
  }
  warm(h);
  assert.equal(h.api.state().stage,'growing');
  assert.equal(h.api.state().speciesLine,'dog');
  assert.equal(h.api.state().growth,0);
  assert.match(h.get('petSprite').innerHTML,/dog\/01.png/);
  assert.equal(visual(h).classList.contains('egg-newborn'),true);
  assert.equal(births(h).length,1);
  h.api.render();
  assert.equal(visual(h).children.filter(x=>x.className==='egg-hatch-shell').length,1);
});

test('each saved egg resumes its crack stage without replaying a touch reaction', () => {
  for(const [taps,asset] of ['intact','intact','cracking','cracking','ready'].entries()) {
    const store=storage(), h=boot(store);
    for(let i=0;i<taps;i++) warm(h);
    h.api.saveState();
    const reloaded=boot(store); reloaded.api.render();
    assert.equal(reloaded.api.state().growth,taps*4);
    assert.match(reloaded.get('petSprite').innerHTML,new RegExp(`egg/${asset}.png`));
    assert.equal(visual(reloaded).classList.contains('egg-warming'),false);
    assert.equal(visual(reloaded).classList.contains('egg-newborn'),false);
    assert.equal(births(reloaded).length,0);
    assert.doesNotMatch(store.getItem(SAVE),/eggVisualReaction|egg-hatch-shell|egg-newborn/);
  }
});

test('reload immediately after the fifth tap keeps the same newborn and one birth record', () => {
  const store=storage(), h=boot(store);
  for(let i=0;i<5;i++) warm(h);
  const identity={speciesLine:h.api.state().speciesLine,gender:h.api.state().gender,orientationId:h.api.state().orientationId};
  const reloaded=boot(store); reloaded.api.render();
  assert.equal(reloaded.api.state().stage,'growing');
  for(const [key,value] of Object.entries(identity)) assert.equal(reloaded.api.state()[key],value);
  assert.equal(births(reloaded).length,1);
  assert.equal(visual(reloaded).classList.contains('egg-newborn'),false);
  reloaded.advance(2000);
  assert.equal(births(reloaded).length,1);
});

test('reset during the hatch effect cannot alter or decorate the replacement egg', () => {
  const h=boot(storage());
  for(let i=0;i<5;i++) warm(h);
  h.api.doWipe();
  h.advance(2000); h.api.render();
  assert.equal(h.api.state().stage,'egg');
  assert.equal(h.api.state().growth,0);
  assert.equal(births(h).length,0);
  assert.match(h.get('petSprite').innerHTML,/egg\/intact.png/);
  assert.equal(visual(h).classList.contains('egg-newborn'),false);
  assert.equal(visual(h).children.length,0);
});

test('the egg itself can be warmed and newborn care remains available immediately', () => {
  const h=boot(storage());
  h.dispatch(h.get('petArea'),'click');
  assert.equal(h.api.state().growth,4);
  for(let i=0;i<4;i++) warm(h);
  const hunger=h.api.state().hunger;
  h.dispatch(h.get('feedBtn'),'click');
  assert.ok(h.api.state().hunger>hunger);
  assert.equal(h.api.state().actionCounts.feed,1);
  assert.equal(births(h).length,1);
});

test('all 31 next-egg species keep their stable identity and first-form artwork', () => {
  const master=boot(storage()).sandbox.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
  const species=Object.values(master.playerSpecies).filter(Array.isArray).flat();
  assert.equal(species.length,31);
  for(const {id} of species) {
    const h=boot(storage());
    h.api.state().lifetime.nextEggLine=id;
    for(let i=0;i<5;i++) warm(h);
    assert.equal(h.api.state().speciesLine,id);
    assert.match(h.get('petSprite').innerHTML,new RegExp(`characters/${id}/01.png`));
    assert.equal(births(h).length,1);
  }
});

test('a failed egg image uses the existing emoji fallback and can still hatch', () => {
  const h=boot(storage()); h.api.render();
  const wrapper=visual(h);
  // Substitute only the browser image event boundary; execute the real handler.
  h.sandbox.HTMLImageElement=class {};
  const img=Object.assign(new h.sandbox.HTMLImageElement(),h.get('brokenEgg'));
  img.classList.add('character-asset');
  img.closest=()=>wrapper;
  img.getAttribute=()=> 'assets/characters/egg/intact.png';
  h.dispatch(img,'error',{bubbles:false});
  assert.equal(wrapper.classList.contains('asset-failed'),true);
  assert.match(h.get('petSprite').innerHTML,/character-emoji-fallback">🥚/);
  h.api.render();
  assert.equal(visual(h),wrapper);
  for(let i=0;i<5;i++) warm(h);
  assert.equal(h.api.state().stage,'growing');
  assert.equal(births(h).length,1);
});

test('finished reactions are removed and cannot replay when returning from a minigame', () => {
  for(const taps of [1,5]) {
    const h=boot(storage());
    for(let i=0;i<taps;i++) warm(h);
    const rendered=visual(h);
    h.advance(1000);
    assert.equal(rendered.classList.contains('egg-warming'),false);
    assert.equal(rendered.classList.contains('egg-newborn'),false);
    assert.equal(rendered.children.filter(x=>x.className==='egg-hatch-shell'&&x.isConnected).length,0);
    if(taps===5) {
      h.dispatch(h.get('playBtn'),'click');
      assert.equal(h.get('screenNormal').classList.contains('hidden'),true);
      h.api.retireMinigame();
      assert.equal(h.get('screenNormal').classList.contains('hidden'),false);
      assert.equal(visual(h).classList.contains('egg-newborn'),false);
      assert.equal(births(h).length,1);
    }
  }
});

test('cancelled hatch animation is cleaned before an immediate minigame return', () => {
  const h=boot(storage());
  for(let i=0;i<5;i++) warm(h);
  const rendered=visual(h);
  h.dispatch(rendered,'animationend',{animationName:'unrelated-character-reaction'});
  assert.equal(rendered.classList.contains('egg-newborn'),true);
  h.dispatch(h.get('playBtn'),'click');
  // The CSS engine emits animationcancel when display:none cancels its child.
  // Only that browser event is substituted; navigation handlers remain real.
  h.dispatch(rendered,'animationcancel',{animationName:'egg-newborn-appear'});
  h.api.retireMinigame();
  assert.equal(rendered.classList.contains('egg-newborn'),false);
  assert.equal(rendered.children.filter(x=>x.className==='egg-hatch-shell'&&x.isConnected).length,0);
  h.advance(1000);
  assert.equal(births(h).length,1);
});

test('reduced motion shows the correct egg and newborn without a pending reveal', () => {
  const h=boot(storage());
  h.sandbox.matchMedia=()=>({matches:true});
  for(let i=0;i<5;i++) {
    warm(h);
    assert.equal(visual(h).classList.contains('egg-warming'),false);
    assert.equal(visual(h).classList.contains('egg-newborn'),false);
    assert.equal(visual(h).children.length,0);
  }
  assert.equal(h.api.state().stage,'growing');
  assert.equal(births(h).length,1);
});
