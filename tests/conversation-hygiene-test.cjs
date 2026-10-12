// Conversation Hygiene(Phase 1)。docs/design/conversation-director-v1-2026-10-12.md §1 と
// docs/audit/existing-conversation-audit-2026-10-03.md の問題一覧に対応する回帰テスト。
//   CA-07 上部お知らせ欄と同じギャグを吹き出しで重ねない
//   CA-10 告白相手がいないときに「振られた」台詞を出さない
//   CA-13 / CA-14 めぐるで設計メモ(hook)・三人称の地の文(flavor / 図鑑)を台詞にしない
//   CA-23 交際・結婚の固有台詞を「」付きのまま吹き出しに出さない
//   CA-25 旧 ID(alias)の恋人も専用台詞を使う
// 既存の台詞の本文はここでは一切変えない(どの台詞が選ばれうるかだけを確かめる)。
const assert = require('node:assert/strict');
const {test} = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const {harness} = require('./helpers/runtime-harness.cjs');

const master = new Function(fs.readFileSync('character-world-master.v1.js', 'utf8') + '\nreturn NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;')();
const stageDescText = fs.readFileSync('script.js', 'utf8');

function setup() {
  const h = harness();
  const s = h.api.state();
  Object.assign(s, {regionId:'home', isSleeping:false, isSick:false, hunger:90, happiness:90, energy:90});
  return {h, s};
}
function setRandom(h, value) { vm.runInContext(`Math.random=()=>${value}`, h.sandbox); }
function bubble(h) { return h.get('speechBubble').classList.contains('hidden') ? '' : h.get('speechText').textContent; }
function addPartner(h, s, id) {
  const base = h.api.REGIONS.flatMap(r => r.candidates || []).find(c => c.id === (master.compatibility.partnerAliases[id] || id));
  s.partner = JSON.parse(JSON.stringify({...base, id, affection:50, bondCount:0, married:false}));
  return s.partner;
}
const key = t => String(t).normalize('NFKC').replace(/[\s。、!?「」]/g, '').replace(/[\p{Extended_Pictographic}️‍]/gu, '');

test('CA-07: a bubble line never repeats the gag already shown in the top message line', () => {
  const echoes = [
    ['sleep', '🌙まぶたが先に帰った'],
    ['medicine_cure', '💊苦さだけ居残りしてる'],
    ['wake', '☀️まぶたと交渉が終わった'],
  ];
  for (const [event, shown] of echoes) {
    const {h} = setup();
    let echoed = 0;
    for (let i = 0; i < 40; i++) {
      // 0〜1 を均等にたどるので、どのプール位置でも同じ文が選ばれないことを確かめられる
      setRandom(h, (i + 0.5) / 40);
      h.api.setMessage(shown);
      h.api.speakEvent(event, {partnerChance:1, companionChance:0});
      for (let beat = 0; beat < 4; beat++) {
        h.advance(beat ? 2500 : 1);
        if (key(bubble(h)) === key(shown)) echoed++;
      }
      h.api.clearConversationTimers();
    }
    assert.equal(echoed, 0, `${event}: "${shown}" appeared in the bubble while it was in the message line`);
  }
});

test('CA-07: the echo guard only removes the duplicate, never empties a pool', () => {
  const {h} = setup();
  setRandom(h, 0);
  h.api.setMessage('🌙まぶたが先に帰った');
  h.api.speakEvent('sleep', {partnerChance:0, companionChance:0});
  h.advance(1);
  assert.ok(bubble(h).length > 0, 'the pet still answers with another sleep line');
  assert.notEqual(key(bubble(h)), key('まぶたが先に帰った'));
});

test('CA-10: courting with nobody to court shows the message only, not rejection lines', () => {
  const {h, s} = setup();
  s.regionId = 'star_stop';   // とくべつな旅先にはこいびと候補がいない
  s.partner = null;
  s.companions = [];
  s.lifetime.partnerEncounters = [];
  h.get('courtBtn').disabled = false;
  h.dispatch(h.get('courtBtn'), 'click');
  h.advance(1);
  assert.match(h.get('message').textContent, /気持ちをつたえたいあいてがいない/);
  assert.equal(bubble(h), '', 'no court_fail speech when there was no confession');
  h.advance(10000);
  assert.equal(bubble(h), '');
});

test('CA-23: relationship lines reach the bubble without outer 「」', () => {
  const {h, s} = setup();
  addPartner(h, s, 'robot_neighbor');
  setRandom(h, 0);
  h.api.speakEvent('partner_new', {petText:'え、ほんとに!?', partnerChance:1, companionChance:0});
  h.advance(1);
  h.advance(2500);
  assert.equal(h.get('speechBubble').dataset.kind, 'partner');
  assert.equal(h.get('speechText').textContent, 'コイビト……登録しました');
});

test('CA-25: a partner saved under a legacy alias id still uses its own lines', () => {
  const {h, s} = setup();
  addPartner(h, s, 'ceo-cat');   // 旧 ID。正規化すると cat_ceo
  const own = ['いま休憩中。……もう少しそのまま', '休憩、5分だけ延長しよう', 'その用事なら優先していい'];
  setRandom(h, 0);
  h.api.speakEvent('play_with', {petText:'もっと!', partnerChance:1, companionChance:0});
  h.advance(1);
  h.advance(2500);
  assert.equal(h.get('speechBubble').dataset.kind, 'partner');
  assert.ok(own.includes(h.get('speechText').textContent), h.get('speechText').textContent);
  h.api.clearConversationTimers();
  setRandom(h, 0);
  h.api.speakEvent('marriage', {petText:'ほんとにけっこんした!', partnerChance:1, companionChance:0});
  h.advance(1);
  h.advance(2500);
  assert.equal(h.get('speechText').textContent, 'これからの予定、ふたりで組もう');
});

// めぐるの住民名簿は本番と同じ bridge → buildRegistry の経路で作る(meguru.js 本体は変えていない)
function meguruActors(h, s) {
  s.lifetime.partnersRecorded = ['rock_octopus', 'swamp_croc'];
  s.lifetime.companionsRecruited = ['otter'];
  s.lifetime.rareCompanionsRecruited = ['box'];
  addPartner(h, s, 'rock_octopus');
  s.companions = [];
  return h.api.meguruMod.buildRegistry().residents;
}

test('CA-13/14: meguru speech never reads out design hooks, encounter flavor or dex narration', () => {
  const {h, s} = setup();
  const M = h.api.meguruMod;
  const hooks = new Set(master.partners.map(p => p.hook));
  const flavors = new Set([...h.api.normalCompanions, ...h.api.rareCompanions].map(c => c.flavor).filter(Boolean));
  const descs = new Set([...stageDescText.matchAll(/^ {6}"([^"\n]+。)",?$/gm)].map(m => m[1]));
  assert.ok(hooks.size >= 18 && flavors.size >= 20 && descs.size > 200, 'reference sets are populated');
  const seen = new Map();
  for (let build = 0; build < 30; build++) {
    const reg = meguruActors(h, s);
    const pick = (key) => reg.find(a => a.key === key);
    const actors = [pick('partner:rock_octopus'), pick('partner:swamp_croc'), pick('companion:otter'), pick('companion:box'),
      {kind:'form', key:'form:dandelion', line:'dandelion', stage:2, withPlayer:false, region:'countryside'}];
    assert.ok(actors.every(Boolean), 'registry contains the partner, companions and form');
    assert.equal(actors[0].withPlayer, true);
    assert.ok(!hooks.has(actors[0].hook) && !hooks.has(actors[1].hook), 'registry hook is not a design memo');
    for (const a of actors) {
      for (let i = 0; i < 20; i++) {
        let n = 0;
        M.setRandom(() => ((i * 7 + build * 3 + (n++) * 13) % 20 + 0.5) / 20);
        const line = M.talkLine({...a, emotion:'normal'});
        assert.ok(typeof line === 'string' && line.length > 0);
        assert.ok(!hooks.has(line), `${a.key} said a design hook: ${line}`);
        assert.ok(!flavors.has(line), `${a.key} said its encounter flavor: ${line}`);
        assert.ok(!descs.has(line), `${a.key} said a dex description: ${line}`);
        if (!seen.has(a.key)) seen.set(a.key, new Set());
        seen.get(a.key).add(line);
      }
    }
  }
  // かわりに本人の台詞(Home の放置台詞と同じ正本。キャラと日付で1つ)が出る
  const own = {
    'partner:rock_octopus': ['お茶と本と手、全部持てるよ', '空いた手だけで拍手してる', '片づけながらでも話は聞けるよ'],
    'partner:swamp_croc': ['……来たなら座っていけば', '隣、あいてる。荷物はどかす', '……笑ってた?そりゃ、少しは'],
    'companion:otter': ['転がすのにちょうどいい石ない?', '石ひとつでずっと遊べる!', '石の名前、まだ決まらない'],
    'companion:box': ['……ただのはこです', '中の話はまだしません', '置いてあっても参加してる'],
  };
  for (const [key, lines] of Object.entries(own)) {
    assert.ok([...seen.get(key)].some(line => lines.includes(line)), `${key} never used its own line: ${[...seen.get(key)].join(' / ')}`);
  }
});

test('CA-13/14: the meguru own line is stable within a day and does not consume page randomness', () => {
  const {h, s} = setup();
  const first = meguruActors(h, s).find(a => a.key === 'partner:rock_octopus').hook;
  vm.runInContext('globalThis.__calls=0;{const r=Math.random;Math.random=()=>{globalThis.__calls++;return r();};}', h.sandbox);
  const again = meguruActors(h, s).find(a => a.key === 'partner:rock_octopus').hook;
  assert.equal(again, first, 'same registry within a day (meguru preloads the next world from it)');
  assert.equal(vm.runInContext('globalThis.__calls', h.sandbox), 0, 'registry building draws no page randomness');
});

test('CA-13/14: the meguru bridge keeps hooks, flavor and dex text in their own places', () => {
  const {h} = setup();
  // 出会いカードの flavor・図鑑の説明文は本来の場所(Home 側のデータ)にそのまま残っている
  const otter = [...h.api.normalCompanions].find(c => c.id === 'otter');
  assert.match(otter.flavor, /カワウソが石をひとつ差しだしてきた/);
  assert.match(stageDescText, /箱に入る。箱がなければ、箱の形をした空気に入る。/);
  assert.equal(master.partners.find(p => p.id === 'cat_ceo').hook, '仕事人なのにデートのため普通にサボる');
  // meguru.js は Character 3D lane の保護対象なので本体は変えない(このブランチでは main と同一)
  const crypto = require('node:crypto');
  const fx = require('./fixtures/character-3d-protected-hashes.json');
  assert.equal(crypto.createHash('sha1').update(fs.readFileSync('meguru.js')).digest('hex'), fx.groups['meguru.js'].sha1);
});
