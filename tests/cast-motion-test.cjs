const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

function cast(h) {
  const s = h.api.state();
  s.companions = [{id:'snail',bond:100}, {id:'clock',bond:100}];
  s.partner = {id:'forest_bear',label:'もりのくまさん',emoji:'🐻',affection:40,married:true};
  s.lifetime.equippedItemId = 'ribbon';
  h.api.render();
  return s;
}

test('a ticklish line moves the pet and equipment together, then the speaking friend answers', () => {
  const h = harness(); cast(h);
  h.api.speakEvent('play_with', {petText:'くすぐったいよ〜！',partnerChance:0,companionChance:1});
  h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction, 'wiggle');
  const pet = h.get('petSprite').animations.at(-1);
  assert.ok(pet && pet.options.duration > 0);
  assert.deepEqual(h.get('petAccessory').animations.at(-1)?.frames, pet.frames);
  h.advance(2500);
  assert.equal(h.get('speechBubble').dataset.kind, 'companion');
  const speaking = [...h.get('companionLeft').children,...h.get('companionRight').children].filter(n=>n.classList.contains('cast-speaking'));
  assert.equal(speaking.length,1);
  assert.ok(speaking[0].animations.length);
  assert.ok(!h.get('petSprite').classList.contains('cast-speaking'));
});

test('courtship follows the actual partner, while a failed courtship never celebrates', () => {
  const h = harness(); cast(h);
  h.api.speakEvent('court',{petText:'てれちゃう',partnerChance:1,companionChance:0});
  h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,'shy');
  h.advance(2500);
  assert.ok(h.get('partnerCompanion').querySelector('.partner-emoji').classList.contains('cast-speaking'));
  h.api.speakEvent('court_fail',{petText:'またおはなししようね',partnerChance:0,companionChance:0});
  h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,'droop');
  assert.ok(!h.get('partnerCompanion').querySelector('.partner-emoji').classList.contains('cast-speaking'));
});

test('play and courtship visibly lift a crowded cast, while negative outcomes settle once', () => {
  const h = harness(); const s = cast(h);
  const master = require('node:fs').readFileSync('character-world-master.v1.js','utf8');
  const world = new Function(master+';return NAOTOCCHI_CHARACTER_WORLD_MASTER_V1')();
  s.companions = [...world.companions.normal,...world.companions.rare].map(c=>({id:c.id,bond:100}));
  h.api.render();
  const sizes = [h.get('petSprite'),h.get('petAccessory'),h.get('partnerCompanion'),
    ...h.get('companionLeft').children,...h.get('companionRight').children].map(n=>n.style.width);
  for (const [event,text] of [['play_with','くすぐったいよ！'],['court','だいすきだよ！']]) {
    h.api.speakEvent(event,{petText:text,partnerChance:1,companionChance:1}); h.advance(1);
    const animation = h.get('castResponse').animations.at(-1);
    assert.ok(animation, 'an action should visibly move even a full cast');
    const lifts = animation.frames.map(f=>Number(f.transform.match(/translateY\(([-.\d]+)px\)/)?.[1]));
    assert.ok(Math.min(...lifts)<=-10, 'the action should be noticeable on a small screen');
    assert.ok(lifts.every(y=>y>=-16 && y<=0), 'the entire cast stays in the reserved top space');
    assert.equal(lifts.at(-1),0,'the cast settles back to its exact starting position');
    assert.deepEqual([h.get('petSprite'),h.get('petAccessory'),h.get('partnerCompanion'),
      ...h.get('companionLeft').children,...h.get('companionRight').children].map(n=>n.style.width),sizes);
  }
  const last = h.get('castResponse').animations.at(-1);
  h.api.openExclusiveMenu('menu');
  assert.equal(last.playState,'idle','opening a menu cancels the group response');
  h.api.closeAllMenuOverlays(); h.api.render();
  for (const [event,text] of [['court_fail','またおはなししようね'],['play_with_annoyed','ちょっと休ませて']]) {
    h.api.speakEvent(event,{petText:text,partnerChance:0,companionChance:0}); h.advance(1);
    const animation=h.get('castResponse').animations.at(-1);
    assert.equal(animation.playState,'running','negative outcomes also have visible feedback');
    const lifts=animation.frames.map(f=>Number(f.transform.match(/translateY\(([-.\d]+)px\)/)?.[1]));
    assert.ok(Math.min(...lifts)<=-6,'a crowded cast can still show disappointment or tiredness');
    const lowest=lifts.indexOf(Math.min(...lifts));
    assert.ok(lifts.slice(lowest+1).every((y,i)=>y>=lifts[lowest+i]),'negative feedback settles once without a second happy hop');
    assert.equal(lifts.at(-1),0);
  }
  const quiet = harness({reducedMotion:true}); cast(quiet);
  quiet.api.speakEvent('play_with',{petText:'くすぐったい！'}); quiet.advance(1);
  assert.equal(quiet.get('castResponse').animations.length,0);
});

test('poop updates preserve every placed actor and do not interrupt a reaction', () => {
  const h=harness(); const s=cast(h);
  const actors=[h.get('petSprite'),h.get('petAccessory'),h.get('partnerCompanion'),
    ...h.get('companionLeft').children,...h.get('companionRight').children];
  const placement=()=>actors.map(n=>[n.style.width,n.style.height,n.style.left,n.style.top]);
  const before=placement();
  h.api.speakEvent('play_with',{petText:'くすぐったい！',partnerChance:0,companionChance:1}); h.advance(1);
  const response=h.get('castResponse').animations.at(-1);
  // DOM sizing is covered by stylesheet review; this checks the real render
  // path does not mutate cast placement or cancel motion on a poop update.
  for (const count of [1,2,4,0]) {
    s.poopCount=count; h.api.render();
    assert.equal((h.get('poopRow').innerHTML.match(/data-care-icon="poop"/g)||[]).length,count);
    assert.deepEqual(placement(),before);
    assert.equal(response.playState,'running');
  }
  h.setReducedMotion(true);
  assert.equal(response.playState,'idle','the shared response also stops when motion is disabled');
});

test('care moods follow the line and outcome instead of always bouncing happily', () => {
  const h = harness(); h.api.render();
  for (const [event,text,want] of [
    ['feed','おいしい！','munch'],
    ['play_with_annoyed','もういいって！','settle'],
    ['medicine_wrong','元気です。もう一度いうね','shake'],
    ['sleep','おやすみ…','doze'],
    ['wake','おきたよ！','stretch'],
  ]) {
    h.api.speakEvent(event,{petText:text,partnerChance:0,companionChance:0}); h.advance(1);
    assert.equal(h.get('petSprite').dataset.reaction,want,event);
  }
});

test('a comforting reply cannot make the disappointed or unwell pet celebrate', () => {
  const h = harness(); cast(h);
  for (const event of ['court_fail','minigame_bad','medicine_wrong','overfeed']) {
    h.api.speakEvent(event,{partnerChance:0,companionChance:1});
    h.advance(2501);
    assert.equal(h.get('speechBubble').dataset.kind,'companion');
    assert.ok(['nod','droop','settle','shake'].includes(h.get('petSprite').dataset.reaction),`${event} listener celebrates a negative result`);
  }
});

test('a new action cancels old replies and an old animation cannot clear a new one', () => {
  const h = harness(); cast(h);
  h.api.speakEvent('court',{partnerChance:1,companionChance:1}); h.advance(1);
  const old = h.get('petSprite').animations.at(-1);
  h.advance(100);
  h.api.speakEvent('play_with_annoyed',{petText:'ちょっと休ませて',partnerChance:0,companionChance:0}); h.advance(1);
  assert.equal(h.get('petSprite').dataset.reaction,'settle');
  old?.onfinish?.();
  assert.equal(h.get('petSprite').dataset.reaction,'settle');
  h.advance(3000);
  assert.equal(h.get('speechText').textContent,'ちょっと休ませて');
  assert.equal(h.get('petSprite').dataset.reaction,undefined);
});

test('menus and hidden pages stop reactions, and reduced motion still identifies the speaker', () => {
  const h = harness(); cast(h);
  h.api.speakEvent('court',{partnerChance:1,companionChance:1}); h.advance(1);
  h.api.openExclusiveMenu('menu');
  assert.equal(h.get('petSprite').dataset.reaction,undefined);
  h.api.closeAllMenuOverlays(); h.api.render();
  h.api.speakEvent('play_with',{partnerChance:0,companionChance:1}); h.advance(1);
  h.document.visibilityState='hidden'; h.dispatch(h.document,'visibilitychange'); h.advance(3000);
  assert.equal(h.get('petSprite').dataset.reaction,undefined);
  const quiet = harness({reducedMotion:true}); quiet.api.render();
  quiet.api.speakEvent('play_with',{petText:'くすぐったい！'}); quiet.advance(1);
  assert.equal(quiet.get('petSprite').animations.length,0);
  assert.ok(quiet.get('petSprite').classList.contains('cast-speaking'));
});

test('a companion who left before their turn cannot speak or animate a different companion', () => {
  const h = harness(); const s=cast(h);
  h.api.speakEvent('play_with',{partnerChance:0,companionChance:1}); h.advance(1);
  s.companions=[]; h.api.render(); h.advance(2500);
  assert.notEqual(h.get('speechBubble').dataset.kind,'companion');
});

test('enabling reduced motion mid-speech stops movement but preserves the current speaker', () => {
  const h=harness(); h.api.render();
  h.api.speakEvent('play_with',{petText:'くすぐったい！'}); h.advance(1);
  h.setReducedMotion(true);
  assert.ok(h.get('petSprite').animations.every(a=>a.playState==='idle'));
  assert.ok(h.get('petSprite').classList.contains('cast-speaking'));
  h.advance(2500);
  assert.ok(!h.get('petSprite').classList.contains('cast-speaking'));
});

test('every motion and its interpolation stay inside the reserved one- or three-pixel envelope', () => {
  const {motionFrames} = require('../cast-motion.js');
  for (const limit of [1,3]) for (const size of [24,32,48,52,84,104,112]) for (const id of ['', 'snail','clock','sekizou','koala','forest_bear']) {
    for (const mood of ['bounce','wiggle','shy','love','droop','settle','shake','munch','doze','stretch','nod','curious','tick']) {
      const {poses} = motionFrames(mood,size,{id,maxDisplacement:limit});
      assert.deepEqual(poses.at(-1),{x:0,y:0,angle:0,scale:1});
      for (let i=1;i<poses.length;i++) for (let t=0;t<=1;t+=.05) {
        const p=Object.fromEntries(Object.keys(poses[i]).map(k=>[k,poses[i-1][k]*(1-t)+poses[i][k]*t]));
        for (const x of [-size/2,size/2]) for (const y of [-size/2,size/2]) {
          const xx=p.x+p.scale*(x*Math.cos(p.angle)-y*Math.sin(p.angle));
          const yy=p.y+p.scale*(x*Math.sin(p.angle)+y*Math.cos(p.angle));
          assert.ok(Math.hypot(xx-x,yy-y)<=limit,`${id}/${mood}/${size} escapes movement budget`);
        }
      }
    }
  }
});
