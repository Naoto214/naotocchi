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
  h.advance(26000);
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

// A missing/misassigned speaker, unsafe saved name, or repeated story should
// fail these through the real player, not through a copy of the data builder.
test('date dialogue identifies each speaker with their own portrait and escapes the saved name', () => {
  const h = movieHarness();
  const partner = {id:'robot_neighbor',label:'ロボット<script>probe</script>',affinityTrait:'gentle'};
  h.api.state().partner = partner;
  h.api.playOrdinaryDateMovie(h.api.DATE_PLANS.find(p=>p.id==='walk'), partner, '', 'またね。', false);
  const seen = new Set();
  for (let i=0; i<12; i++) {
    const caption=h.get('dateMovieCaption'), who=caption.dataset.speaker;
    if(who) {
      seen.add(who);
      assert.match(caption.innerHTML,/movie-speaker-name/);
      assert.match(caption.innerHTML,who==='pet' ? /assets\/characters\/dog\/06.png/ : /assets\/characters\/partners\/robot_neighbor.png/);
      assert.ok(!caption.innerHTML.includes('<script>'));
      assert.doesNotMatch(caption.textContent,/\p{Extended_Pictographic}/u);
    }
    h.advance(3500);
  }
  assert.deepEqual([...seen].sort(),['partner','pet']);
  assert.equal(partner.label,'ロボット<script>probe</script>');
  assert.equal(h.get('dateMovieCaption').dataset.speaker,'','closing narration must clear the speaker');
});

test('repeated dates rotate whole small stories before replaying one, even with the same random roll', () => {
  const h=movieHarness();
  const partner={id:'robot_neighbor',label:'ロボット',affinityTrait:'gentle'};
  h.api.state().partner=partner;
  const openings=[];
  for(let n=0;n<4;n++) {
    h.api.playOrdinaryDateMovie(h.api.DATE_PLANS.find(p=>p.id==='photo'),partner,'','またね。',false);
    h.advance(3500);
    openings.push(h.get('dateMovieCaption').textContent);
    h.api.closeDateOverlay();
  }
  assert.equal(new Set(openings).size,4);
});

test('the squid speaks under its own name and portrait; the player reply is not attributed to it', () => {
  const h=movieHarness();
  h.api.playLegendEncounterMovie({id:'boss',name:'あやまりにきただいおういか',emoji:'🦑'},17);
  h.advance(7000);
  assert.equal(h.get('dateMovieCaption').dataset.speaker,'legend');
  assert.match(h.get('dateMovieCaption').textContent,/ダイオウイカ/);
  h.advance(3500);
  assert.equal(h.get('dateMovieCaption').dataset.speaker,'pet');
  h.advance(3500);
  assert.equal(h.get('dateMovieCaption').dataset.speaker,'');
});

test('all 18 partners keep their own speech identity across complete dates and anniversaries', () => {
  const h=movieHarness();
  for(const candidate of h.api.REGIONS.flatMap(region=>region.candidates)) {
    const partner={...candidate,married:true};
    h.api.state().partner=partner;
    for(const kind of ['date','anniversary']) {
      if(kind==='date') h.api.playOrdinaryDateMovie(h.api.DATE_PLANS[3],partner,'','またね。',false);
      else h.api.playMarriageMovie({years:50,title:'きんこんしき',icon:''});
      const before=JSON.stringify(partner), spoken=new Set();
      for(let beat=0;beat<10;beat++) {
        const caption=h.get('dateMovieCaption');
        if(caption.dataset.speaker==='partner') {
          spoken.add('partner');
          assert.equal(caption.dataset.speakerId,partner.id);
          assert.ok(caption.innerHTML.includes('partners/'+partner.id+'.png'),partner.id+' portrait');
          assert.ok(caption.textContent.includes(partner.label),partner.id+' name');
        }
        if(caption.dataset.speaker==='pet') spoken.add('pet');
        h.advance(kind==='date'?3500:4000);
      }
      assert.deepEqual([...spoken].sort(),['partner','pet'],partner.id+' '+kind);
      assert.equal(JSON.stringify(partner),before);
      assert.equal(h.get('dateMovieCloseBtn').classList.contains('hidden'),false);
      h.api.closeDateOverlay();
    }
  }
});

test('four coherent stories per legend finish with the reward and keep water ripples synchronized', () => {
  for(const id of ['gate','stairs','boss','lamp','mirror']) {
    const h=movieHarness(), openings=new Set();
    for(let variant=0;variant<4;variant++) {
      h.api.playLegendEncounterMovie({id,name:id,emoji:{boss:'🦑',lamp:'🏮'}[id] || ''},17);
      openings.add(h.get('dateMovieCaption').textContent);
      for(let beat=0;beat<9;beat++) {
        if(id==='mirror' && h.get('dateMovieScene').dataset.action==='ripple') {
          assert.match(h.get('dateMovieCaption').textContent,/水面|波/);
          assert.equal(h.get('dateMovieCaption').dataset.speaker,'');
        }
        h.advance(3500);
      }
      assert.match(h.get('dateMovieCaption').textContent,/17コイン/);
      assert.equal(h.get('dateMovieCaption').dataset.speaker,'');
      assert.equal(h.get('dateMovieCloseBtn').classList.contains('hidden'),false);
      h.api.closeDateOverlay();
    }
    assert.equal(openings.size,4,id+' story rotation');
  }
});

test('guest and legacy partner speech keeps illustrated saved appearances without rewriting the relationship', () => {
  for(const id of ['guest','neighbor-cat','town-robot']) {
    const h=harness({fullDisplay:true});
    h.sandbox.Math=Object.create(Math);h.sandbox.Math.random=()=>0;
    const partner={id,label:'以前からのこいびと',emoji:'🐈',affinityTrait:'gentle'};
    h.api.state().partner=partner;
    const before=JSON.stringify(partner);
    h.api.playOrdinaryDateMovie(h.api.DATE_PLANS[0],partner,'','またね。',false);
    h.advance(10500);
    const caption=h.get('dateMovieCaption');
    assert.equal(caption.dataset.speaker,'partner');
    assert.match(caption.innerHTML,/<img|<svg|data-ui-icon|data-care-icon|data-display-icon/);
    assert.doesNotMatch(caption.textContent,/\p{Extended_Pictographic}/u);
    assert.equal(JSON.stringify(partner),before);
  }
});

test('underwater dates keep both character asides and the closing consistent with swimming', () => {
  for(const id of ['high_eagle','forest_bear','grove_deer','snow_spirit']) {
    const h=movieHarness();
    const partner=h.api.REGIONS.flatMap(region=>region.candidates).find(p=>p.id===id);
    Object.assign(h.api.state(),{partner,regionId:'deepsea'});
    for(let visit=0;visit<3;visit++) {
      h.api.playOrdinaryDateMovie(h.api.DATE_PLANS[0],partner,'','帰り道を歩いた。',false);
      for(let beat=0;beat<7;beat++) {
        assert.doesNotMatch(h.get('dateMovieCaption').textContent,/風|歩幅|足音|歩く|歩いた/);
        h.advance(3500);
      }
      h.api.closeDateOverlay();
    }
  }
});

test('ordinary and reward dates speak the saved ring phrase under the partner name', () => {
  for (const special of [false, true]) {
    const h = movieHarness(), s = h.api.state();
    s.partner = {...h.api.REGIONS.flatMap(r => r.candidates).find(p => p.id === 'robot_neighbor')};
    s.lifetime.ownedNaotoItems = ['naoto_ring'];
    s.items.reward = special ? 1 : 0;
    h.api.goOnDate(h.api.DATE_PLANS[0], special);
    const memory = s.lifetime.itemMemories.specials[0];
    const phrase = (memory.ringPhrase || memory.text).match(/「(.*)」/)[1];
    let found = false;
    for (let beat = 0; beat < 10; beat++) {
      const caption = h.get('dateMovieCaption');
      if (caption.textContent.includes(phrase)) {
        found = true;
        assert.equal(caption.dataset.speaker, 'partner');
        assert.equal(caption.dataset.speakerId, s.partner.id);
        assert.match(caption.innerHTML, /partners\/robot_neighbor.png/);
      }
      h.advance(special ? 4000 : 3500);
    }
    assert.equal(found, true, `saved ring phrase appears in the ${special ? 'reward' : 'ordinary'} date`);
  }
});
