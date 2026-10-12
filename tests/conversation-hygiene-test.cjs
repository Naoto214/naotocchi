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

test('CA-13/14: meguru speech never reads out design hooks, encounter flavor or dex narration', () => {
  const {h} = setup();
  const M = h.api.meguruMod;
  const hooks = new Set(master.partners.map(p => p.hook));
  const flavors = new Set([...h.api.normalCompanions, ...h.api.rareCompanions].map(c => c.flavor).filter(Boolean));
  const descs = new Set([...stageDescText.matchAll(/^ {6}"([^"\n]+。)",?$/gm)].map(m => m[1]));
  assert.ok(hooks.size >= 18 && flavors.size >= 20 && descs.size > 200, 'reference sets are populated');
  const partner = master.partners.find(p => p.id === 'rock_octopus');
  const companion = [...h.api.normalCompanions].find(c => c.id === 'otter');
  const actors = [
    {kind:'partner', id:partner.id, hook:partner.hook, withPlayer:true, emotion:'normal', region:'sea'},
    {kind:'partner', id:partner.id, hook:partner.hook, withPlayer:false, emotion:'normal', region:'sea'},
    {kind:'companion', id:companion.id, withPlayer:false, emotion:'normal', region:'forest'},
    {kind:'form', id:'dandelion', line:'dandelion', stage:2, withPlayer:false, emotion:'normal', region:'countryside'},
  ];
  const seenOwn = new Set();
  for (const a of actors) {
    for (let i = 0; i < 200; i++) {
      let n = 0;
      M.setRandom(() => ((i * 7 + (n++) * 13) % 200 + 0.5) / 200);
      const line = M.talkLine(a);
      assert.ok(typeof line === 'string' && line.length > 0);
      assert.ok(!hooks.has(line), `${a.kind} said a design hook: ${line}`);
      assert.ok(!flavors.has(line), `${a.kind} said its encounter flavor: ${line}`);
      assert.ok(!descs.has(line), `${a.kind} said a dex description: ${line}`);
      if (a.kind !== 'form') seenOwn.add(line);
    }
  }
  // かわりに本人の台詞(Home の放置台詞と同じ正本)が出る
  for (const own of ['お茶と本と手、全部持てるよ', '転がすのにちょうどいい石ない?']) assert.ok(seenOwn.has(own), `missing own line: ${own}`);
});

test('CA-13: characterTalkLines resolves legacy aliases and unknown ids safely', () => {
  const {h} = setup();
  const M = h.api.meguruMod;
  let n = 0;
  M.setRandom(() => (n++ % 2 ? 0.1 : 0.99));
  const line = M.talkLine({kind:'partner', id:'ceo-cat', hook:'仕事人なのにデートのため普通にサボる', withPlayer:true, emotion:'normal', region:'city'});
  assert.notEqual(line, '仕事人なのにデートのため普通にサボる');
  M.setRandom(() => 0.99);
  const unknown = M.talkLine({kind:'partner', id:'nobody', hook:'設計メモ', withPlayer:true, emotion:'normal', region:'city'});
  assert.equal(unknown, 'ずっと そばに いるよ', 'falls back to the existing generic line, not the hook');
});
