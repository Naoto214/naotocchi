const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

function movieHarness() {
  const h = harness();
  h.sandbox.Math = Object.create(Math);
  h.sandbox.Math.random = () => 0;
  return h;
}
const mirror = {id:'mirror', name:'としをとったじぶん', emoji:'🪞'};

test('the water encounter shows the same species as an elder, without aging the save', () => {
  const h = movieHarness();
  for (const species of ['dog', 'sakura', 'clownfish']) {
    Object.assign(h.api.state(), {speciesLine:species, stageIndex:2});
    h.api.playLegendEncounterMovie(mirror, 17);
    h.advance(3500);
    assert.match(h.get('dateMoviePartner').innerHTML, new RegExp(`assets/characters/${species}/08.png`));
    assert.ok(!h.get('dateMoviePartner').textContent.includes('🪞'));
    assert.equal(h.api.state().stageIndex, 2);
    assert.equal(h.api.state().speciesLine, species);
    h.api.closeDateOverlay();
  }
});

test('both water stories synchronize ripples and the last face with their captions', () => {
  for (const random of [0, .99]) {
    const h = movieHarness();
    h.sandbox.Math.random = () => random;
    h.api.playLegendEncounterMovie(mirror, 17);
    h.advance(14000);
    assert.match(h.get('dateMovieCaption').textContent, /水面|波/);
    assert.equal(h.get('dateMovieScene').dataset.action, 'ripple');
    h.advance(3500);
    assert.equal(h.get('dateMovieScene').dataset.action, random === 0 ? 'fade' : 'return');
    if (random > 0) assert.match(h.get('dateMoviePartner').innerHTML, /dog\/06.png/);
    h.advance(3500);
    assert.match(h.get('dateMovieCaption').textContent, /17コイン/);
  }
});

test('skipping then closing releases the movie and cancels all later scene changes', () => {
  const h = movieHarness();
  h.api.playLegendEncounterMovie(mirror, 17);
  assert.equal(h.document.body.classList.contains('movie-active'), true);
  h.advance(4000);
  h.dispatch(h.get('dateMovieSkipBtn'), 'click');
  assert.equal(h.get('dateMovieCloseBtn').classList.contains('hidden'), false);
  const caption = h.get('dateMovieCaption').textContent;
  h.dispatch(h.get('dateMovieCloseBtn'), 'click');
  assert.equal(h.document.body.classList.contains('movie-active'), false);
  h.advance(40000);
  assert.equal(h.get('dateMovieCaption').textContent, caption);
  assert.equal(h.get('dateOverlay').classList.contains('hidden'), true);
});

test('opening a different overlay cleans up cinema mode and a following date resets legend choreography', () => {
  const h = movieHarness();
  h.api.playLegendEncounterMovie(mirror, 17);
  h.api.openExclusiveMenu('profile');
  assert.equal(h.document.body.classList.contains('movie-active'), false);
  const partner = {id:'robot_neighbor',label:'ロボット',affinityTrait:'gentle',married:true};
  h.api.state().partner = partner;
  h.api.state().regionId = 'deepsea';
  h.api.playOrdinaryDateMovie(h.api.DATE_PLANS.find(p => p.id === 'rain'), partner, '静かな海。', 'また来よう。', false);
  assert.equal(h.get('dateMovieScene').dataset.legend, '');
  assert.equal(h.get('dateMovieScene').dataset.theme, 'deepsea');
  h.advance(16000);
  assert.equal(h.get('dateMovieCloseBtn').classList.contains('hidden'), false);
});

test('cinematic subtitles and titles contain no emoji, including rewards and the ring line', () => {
  const h = movieHarness();
  h.api.playLegendEncounterMovie(mirror, 17);
  h.advance(22000);
  for (const id of ['dateMovieCaption', 'dateMoviePlace']) {
    assert.doesNotMatch(h.get(id).textContent, /\p{Extended_Pictographic}/u);
  }
});
