const fs = require('node:fs');

const path = 'tools/apply-items-v2-care.js';
let text = fs.readFileSync(path, 'utf8');

// The first version removed only the `.classList.remove(...)` suffix and left
// a bare `el.dateMovieScene` token beside the following statement. Replace
// that source line before the guarded patch runs so the entire obsolete line
// is removed instead.
const badSpecialCleanup = "script = script.replace(/\\.classList\\.remove\\('special-reward'\\);\\n/g, '');";
const goodSpecialCleanup = "script = script.replace(/^.*\\.classList\\.remove\\('special-reward'\\);\\n/gm, '');";
if (!text.includes(badSpecialCleanup)) throw new Error('could not locate special-reward cleanup in patcher');
text = text.replace(badSpecialCleanup, goodSpecialCleanup);

// render() itself restarts sleep recovery while sleeping. The V2 pillow has
// already updated the live state synchronously, and the surrounding action
// render will paint it, so this inner render would recurse forever.
const badPillowRender = "      if (changed) itemContextReaction('sleepboost1', 'ふかふかのまくらで、すぐにげんきまんたん。');\n      render();\n      return;";
const goodPillowRender = "      if (changed) itemContextReaction('sleepboost1', 'ふかふかのまくらで、すぐにげんきまんたん。');\n      return;";
if (!text.includes(badPillowRender)) throw new Error('could not locate pillow rerender in patcher');
text = text.replace(badPillowRender, goodPillowRender);

const start = "let html = read('index.html');\n";
const end = "if (/rewardItemGrid|ミニゲームなどで、たまにもらえます。デートや旅/.test(html)) throw new Error('retired reward UI remains in index.html');\n";
const a = text.indexOf(start);
const b = text.indexOf(end, a + start.length);
if (a < 0 || b < 0) throw new Error('could not locate guarded index cleanup in patcher');
const replacement = `let html = read('index.html');\nhtml = removeBetween(html,\n'            <div class="theme-section">\\n              <div class="theme-section-title">ごほうび</div>\\n',\n'            <div class="theme-section">\\n              <div class="theme-section-title">みにつけるもの</div>\\n', 'remove reward inventory section');\n`;
text = text.slice(0, a) + replacement + text.slice(b);
fs.writeFileSync(path, text);
require('./apply-items-v2-care.js');

// Preserve the useful feedback-priority coverage while changing its trigger
// from the retired "healthy ribbon every 100 ticks" behavior to V2 danger
// automation. These edits happen only in the verified apply workspace.
function replaceWholeTest(source, name, body) {
  const marker = `test('${name}'`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`missing relation test: ${name}`);
  const next = source.indexOf('\ntest(', start + marker.length);
  if (next < 0) return source.slice(0, start) + body.trimEnd() + '\n';
  return source.slice(0, start) + body.trimEnd() + '\n' + source.slice(next + 1);
}

let relations = fs.readFileSync('tests/item-relations-travel-test.cjs', 'utf8');
relations = replaceWholeTest(relations,
  'equipment reactions only occur for actual eligible care and active protection',
`test('equipment reactions only occur for actual eligible care and active protection',()=>{
 const {h,s}=setup('bowtie');s.hunger=50;click(h,'feedBtn');assert.equal(h.get('petSprite').dataset.itemReaction,'bowtie');
 delete h.get('petSprite').dataset.itemReaction;s.hunger=90;click(h,'feedBtn');assert.equal(h.get('petSprite').dataset.itemReaction,undefined);
 s.isSick=false;s.lifetime.equippedItemId='ribbon';s.happiness=80;h.api.tick();assert.equal(h.get('petSprite').dataset.itemReaction,undefined);
 s.happiness=25;h.api.tick();assert.equal(s.happiness,100);assert.equal(h.get('petSprite').dataset.itemReaction,'ribbon');
 delete h.get('petSprite').dataset.itemReaction;s.lifetime.equippedItemId='scarf';s.lifetime.weatherMode='snow';h.api.tick();assert.equal(h.get('petSprite').dataset.itemReaction,undefined);
 s.isSick=true;s.sicknessType='テストのびょうき';h.api.tick();assert.equal(s.isSick,false);assert.equal(h.get('petSprite').dataset.itemReaction,'scarf');
 s.lifetime.equippedItemId=null;s.lifetime.ownedNaotoItems=['naoto_charm'];s.ageTicks=69*20;s.lifetime.itemProgress.ticks=199;delete h.get('petSprite').dataset.itemReaction;h.api.tick();assert.equal(h.get('petSprite').dataset.itemReaction,undefined);
 s.ageTicks=70*20;s.lifetime.itemProgress.ticks=299;h.api.tick();assert.equal(h.get('petSprite').dataset.itemReaction,'naoto_charm');
});`);
relations = replaceWholeTest(relations,
  'eligible ribbon ticks deliver readable feedback in both motion modes',
`test('danger-triggered ribbon recovery delivers readable feedback in both motion modes', () => {
  for (const reducedMotion of [false, true]) {
    const {h,s} = feedbackSetup('ribbon', {reducedMotion});
    s.happiness = 25;
    h.api.tick();
    h.advance(1);
    assert.equal(s.happiness, 100);
    assert.match(h.get('message').textContent, /リボン.*ごきげん.*まんたん/);
    h.api.render();
    assert.match(h.get('message').textContent, /リボン/, 'ordinary render keeps the automatic recovery readable');
  }
});`);
relations = replaceWholeTest(relations,
  'equipment waits for an existing conversation and never replaces critical care',
`test('V2 equipment feedback waits for an existing conversation and never replaces critical care', () => {
  const {h,s} = feedbackSetup('ribbon');
  h.api.speakEvent('feed', {petText:'まだお話の途中だよ', partnerChance:0, companionChance:0, delayMs:5000});
  s.happiness = 25;
  h.api.tick();
  assert.equal(s.happiness, 100);
  h.advance(6000);
  assert.equal(h.get('speechText').textContent, 'まだお話の途中だよ');
  assert.doesNotMatch(h.get('message').textContent, /リボン/);
  h.advance(1750);
  assert.match(h.get('message').textContent, /リボン/);

  // A second danger-triggered recovery loses priority when health becomes
  // critical before its queued feedback can be delivered.
  h.api.setMessage('');
  h.api.speakEvent('feed', {petText:'もうひとこと', partnerChance:0, companionChance:0, delayMs:5000});
  s.happiness = 25;
  h.api.tick();
  s.health = 0;
  h.api.render();
  h.advance(7000);
  assert.equal(h.get('message').dataset.careSeverity, 'critical');
  assert.match(h.get('message').textContent, /けんこうがげんかい/);
  assert.doesNotMatch(h.get('message').textContent, /リボン/);
});`);
fs.writeFileSync('tests/item-relations-travel-test.cjs', relations);
