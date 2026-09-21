const assert = require('node:assert/strict');
const {test} = require('node:test');
const {harness} = require('./helpers/runtime-harness.cjs');

function movieHarness() {
  const h = harness();
  h.sandbox.Math = Object.create(Math);
  h.sandbox.Math.random = () => 0;
  return h;
}
const observer = {id:'mirror', name:'みているひと', emoji:'◌'};

test('the observer legend stays abstract and does not alter the current life', () => {
  const h = movieHarness();
  for (const species of ['dog', 'sakura', 'clownfish']) {
    Object.assign(h.api.state(), {speciesLine:species, stageIndex:2});
    h.api.playLegendEncounterMovie(observer);
    assert.equal(h.api.state().stageIndex, 2);
    assert.equal(h.api.state().speciesLine, species);
    assert.doesNotMatch(h.get('dateMoviePlace').textContent, /なおと|精神科|医者/);
    h.api.closeDateOverlay();
  }
});

test('observer stories keep their clues ambiguous instead of identifying Naoto', () => {
  for (const random of [0, .99]) {
    const h = movieHarness();
    h.sandbox.Math.random = () => random;
    h.api.playLegendEncounterMovie(observer);
    for (let beat=0; beat<8; beat++) {
      assert.doesNotMatch(h.get('dateMovieCaption').textContent, /なおと|精神科医|病院/);
      h.advance(3500);
    }
    assert.equal(h.get('dateMovieCloseBtn').classList.contains('hidden'), false);
  }
});

test('skipping then closing releases the movie and cancels all later scene changes', () => {
  const h = movieHarness();
  h.api.playLegendEncounterMovie(observer);
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
  h.api.playLegendEncounterMovie(observer);
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

test('cinematic legend subtitles and titles contain no emoji', () => {
  const h = movieHarness();
  h.api.playLegendEncounterMovie(observer);
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

test('the 100-beyond voice stays unnamed and separate from the player', () => {
  const h=movieHarness();
  h.api.playLegendEncounterMovie({id:'lamp',name:'100のむこう',emoji:'·'});
  let sawLegend=false, sawPet=false;
  for(let beat=0;beat<8;beat++) {
    const who=h.get('dateMovieCaption').dataset.speaker;
    if(who==='legend') {
      sawLegend=true;
      assert.match(h.get('dateMovieCaption').textContent,/むこうの声/);
    }
    if(who==='pet') sawPet=true;
    h.advance(3500);
  }
  assert.equal(sawLegend,true);
  assert.equal(sawPet,true);
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

test('four coherent stories per legend finish without rewards or explicit world answers', () => {
  const names={gate:'むこうのまど',stairs:'たまごのないところ',boss:'むかしのぼく',lamp:'100のむこう',mirror:'みているひと'};
  for(const id of Object.keys(names)) {
    const h=movieHarness(), openings=new Set();
    for(let variant=0;variant<4;variant++) {
      h.api.playLegendEncounterMovie({id,name:names[id],emoji:''});
      openings.add(h.get('dateMovieCaption').textContent);
      for(let beat=0;beat<9;beat++) {
        assert.doesNotMatch(h.get('dateMovieCaption').textContent,/コイン|💰|精神科医|病院|創造主/);
        assert.notEqual(h.get('dateMovieScene').dataset.action,'reward');
        h.advance(3500);
      }
      assert.ok(h.get('dateMovieCaption').textContent.length>0);
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
