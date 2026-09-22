// めぐる:「なにを みつけたのか わかる」しらせ の 正本。
//
// なおす まえは こうだった(ほんものの ブラウザで たしかめた):
//   ・スポットを はじめて 見つけると おび に「Xを みつけた」が 1.5びょう 出る だけ。
//     おびは 1つしか なく、地域の おしらせ(「おうち」「はじめての もり」)に
//     すぐ うわがきされて いた
//   ・地域を こえて いる あいだ の はっけんは **1つも 出なかった**。きろくだけ されて
//     ちず ボタンが ひかる ので「なにか 見つけた らしい けど なに?」に なる
//   ・地区(zone)と めじるし(mark)は ずっと だまったまま ちず ボタンだけ ひからせて いた
//   ・めじるしは こえて いる あいだ に 見つけると すてられて いた(ちずに のらない のに
//     ボタンだけ ひかる)。つぎに 入りなおすと また「はじめて」に なり、また ひかる
//   ・ひみつ も おおきな めじるし も ふつうの ばしょも ぜんぶ おなじ あつかい
//
// ここで しばるのは「いみ」の がわ:
//   なにを 見つけたか(なまえ) と それが どう なったか(ちずに きろくした)を かならず 出す。
//   1フレームに いくつ 見つけても 出すのは 1つずつ。つよい ものから。
//   2かいめ からは 出さない。たんさく率の けいさんは 1つも かえない。
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

function fakeCtx() {
  const state = { imageSmoothingEnabled: true }, stack = [];
  return new Proxy(state, { get(o, k) {
    if (k in o) return o[k];
    if (k === 'save') return () => stack.push({ ...state });
    if (k === 'restore') return () => { const p = stack.pop(); if (p) Object.assign(state, p); };
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (k === 'measureText') return (t) => ({ width: String(t).length * 6 });
    if (k === 'getImageData') return () => ({ data: [] });
    return () => {};
  }, set(o, k, v) { o[k] = v; return true; } });
}
function setup(regionId = 'forest', patch = {}) {
  const h = harness({ fullDisplay: true, canvasContext: fakeCtx() });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80,
    speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  s.discoveredStages = [s.petKey, 'cat:2', 'penguin:3', 'mushroom:0', 'beetle:0', 'ghost:1'];
  s.regionId = regionId;
  // まっさらな たんさく から はじめる(「はじめて 見つけた」を たしかめる ため)
  s.lifetime.meguru = { visits: 0, talkCount: 0, met: {}, talks: {}, spots: {}, zones: {}, paths: {}, marks: {}, world: { regions: [], links: [] } };
  Object.assign(s, patch);
  h.api.render();
  return { h, s, M: h.api.meguruMod };
}
// たんさくを ひらいて、はじめの おび(「Xを めぐる」)が きえる ところまで すすめる
function open(h) {
  assert.equal(h.api.startMeguru(), true);
  const ov = h.get('meguruOverlay');
  const run = h.api.meguruRun();
  h.advance(1800);
  return { ov, run, toast: ov.querySelector('#mgrFoundToast'),
    title: ov.querySelector('#mgrFoundTitle'), sub: ov.querySelector('#mgrFoundSub'),
    icon: ov.querySelector('#mgrFoundIcon'), hint: ov.querySelector('#mgrHint'),
    banner: ov.querySelector('#mgrBanner'), map: ov.querySelector('#mgrMap') };
}
const spotOf = (run, id) => run.world.spots.find((q) => q.id === id);
// いま 出て いる しらせ。もとは foundInfo()、見た目は DOM から よむ(2つが そろって いる ことも みる)
const shown = (u) => {
  const now = u.run.foundInfo().now;
  if (!now) return null;
  return { kind: now.kind, title: u.title.textContent, sub: u.sub.textContent, cls: String(u.toast.className) };
};
// その スポットの まんなかへ 立つ。すこし まわして イベントを 1かい 出させる
function stand(h, run, id) {
  const q = spotOf(run, id);
  assert.ok(q, id + ' が ない');
  run.setPlayer(q.x, q.z); h.advance(120);
  return q;
}
// いま たまって いる しらせを ぜんぶ 出しきる。出た ものを じゅんばんに かえす
function settle(h, u, max = 24) {
  const seen = [];
  for (let i = 0; i < max; i++) {
    const v = shown(u); if (v && (!seen.length || seen[seen.length - 1].title !== v.title)) seen.push(v);
    const info = u.run.foundInfo();
    if (!info.now && !info.queue.length && !info.banner) break;
    h.advance(400);
  }
  return seen;
}

// ────────────────────────────── ① なにを 見つけたのか わかる

test('①-1 ふつうの ばしょ: なまえ と「ちずに きろくした」を 小さく 出す', () => {
  const { h } = setup('forest');
  const u = open(h);
  settle(h, u);                                     // はじまりの しらせを 出しきる
  stand(h, u.run, 'bright2');                       // ひだまり(ふつうの ばしょ・すでに 見た 地区)
  const t = shown(u);
  assert.ok(t, 'はじめて 見つけたら しらせが 出る');
  assert.equal(t.title, 'ひだまりを みつけた', 'なにを 見つけたか が なまえで わかる');
  // この 2行目は **はじめの うちだけ**(⑦-4 / ⑦-5)。ここは まっさらな セーブなので 出る
  assert.equal(t.sub, 'ちずに きろくした', 'はじめの うちは それが どういう いみか も 出す');
  assert.ok(/mgr-found-spot/.test(t.cls), 'ふつうの ばしょ の 見た目');
  assert.ok(!/mgr-found-strong/.test(t.cls), 'ふつうの ばしょ は つよい えんしゅつに しない');
  // ほんとうに その とき ちずに ある(しらせと ちずが ずれない)
  assert.ok(u.run.sim.mapData().spots.some((q) => q.id === 'bright2'), 'ちずに もう のって いる');
  h.api.stopMeguru();
});

test('①-2 おおきな めじるし(landmark)は すこし つよく、ふつうと おなじ おもさに しない', () => {
  const { h } = setup('forest');
  const u = open(h);
  settle(h, u);
  stand(h, u.run, 'great');                         // おおきなき(lmTier 1)
  const seen = settle(h, u);
  const lm = seen.find((v) => v.kind === 'landmark');
  assert.ok(lm, 'おおきな めじるし せんようの しらせが 出る');
  assert.equal(lm.title, 'おおきなきを みつけた！');
  assert.equal(lm.sub, 'ちずに きろくした');
  assert.ok(/mgr-found-strong/.test(lm.cls), 'ふつうの ばしょ より つよい');
  assert.ok(/mgr-found-landmark/.test(lm.cls), 'せんようの 見た目');
  h.api.stopMeguru();
});

test('①-3 ひみつは せんようの しらせ。なまえは 見つけた あとに そえる だけ', () => {
  const { h } = setup('forest');
  const u = open(h);
  // まだ 見つけて いない あいだは、どこにも なまえが 出て いない
  assert.ok(!u.ov.textContent.includes('かくれたいけ'), 'みつける まえに なまえを 先出ししない');
  settle(h, u);
  stand(h, u.run, 'hiddenpond');
  const seen = settle(h, u);
  const sec = seen.find((v) => v.kind === 'secret');
  assert.ok(sec, 'ひみつ せんようの しらせが 出る');
  assert.equal(sec.title, 'ひみつのばしょを みつけた！', 'ひみつを 見つけた かんじ を さきに 出す');
  assert.ok(sec.sub.startsWith('かくれたいけ'), 'なまえは 見つけた あとに そえる');
  assert.ok(sec.sub.includes('ちずに きろくした'));
  assert.ok(/mgr-found-strong/.test(sec.cls), 'ひみつは つよい えんしゅつ');
  h.api.stopMeguru();
});

test('①-4 地区(zone)は わかる なまえで 出す。中の id は 出さない', () => {
  const { h } = setup('forest');
  const u = open(h);
  u.run.setPlayer(0, 250); h.advance(120);         // もりの いりぐち(zone: bright)
  const seen = settle(h, u);
  const zn = seen.find((v) => v.kind === 'zone');
  assert.ok(zn, '地区の しらせが 出る');
  assert.equal(zn.title, 'あかるいもりに きた', 'ユーザーが わかる なまえ');
  assert.equal(zn.sub, 'ちずが すこし ひろがった', 'それが どういう いみか');
  for (const v of seen) assert.ok(!/\bbright\b|\bdeep\b|\bthicket\b/.test(v.title + v.sub), '中の id は 出さない: ' + v.title);
  h.api.stopMeguru();
});

// ────────────────────────────── ② 2かいめ からは 出さない

test('②-1 おなじ ばしょへ もどっても もう「みつけた」と 出さない', () => {
  const { h } = setup('forest');
  const u = open(h);
  settle(h, u);
  stand(h, u.run, 'bright2');
  assert.ok(shown(u), '1かいめは 出る');
  settle(h, u);
  u.run.setPlayer(u.run.world.halfW * 0.95, u.run.world.len * 0.9); h.advance(300);  // はなれる
  settle(h, u);
  assert.equal(shown(u), null, 'はなれたら しらせは きえる');
  stand(h, u.run, 'bright2');                       // もういちど 立つ
  h.advance(400);
  assert.equal(shown(u), null, '2かいめ は 出ない');
  assert.equal(u.run.foundInfo().queue.length, 0, 'ためても いない');
  h.api.stopMeguru();
});

test('②-2 セーブに のこした きろくを よみなおしても 2かいめ は 出ない(セーブ互換)', () => {
  const { h, s } = setup('forest');
  const u1 = open(h);
  settle(h, u1);
  stand(h, u1.run, 'bright2'); settle(h, u1);
  h.api.stopMeguru();
  // セーブの かたちは まえと おなじ。id の ならびを たすだけ
  assert.deepEqual([...Object.keys(s.lifetime.meguru)].sort(),
    ['marks', 'met', 'paths', 'spots', 'talkCount', 'talks', 'visits', 'world', 'zones'].sort());
  assert.ok(s.lifetime.meguru.spots.forest.includes('bright2'));
  const u2 = open(h);                               // 入りなおす
  settle(h, u2);
  stand(h, u2.run, 'bright2'); h.advance(400);
  assert.equal(shown(u2), null, '入りなおしても 2かいめ は 出ない');
  h.api.stopMeguru();
});

test('②-3 めじるしは しらせない。ちずの ボタンも 2かいめ は ひからない', () => {
  const { h } = setup('forest');
  const u = open(h);
  settle(h, u);
  stand(h, u.run, 'great');
  assert.equal(u.map.classList.contains('mgr-map-new'), true, 'ふえた ときは ボタンが そっと ひかる');
  const seen = settle(h, u);
  assert.ok(!seen.some((v) => v.kind === 'mark'), 'めじるしは しらせない');
  u.map.classList.remove('mgr-map-new');
  // おなじ ところに 立ちつづけても もう ふえない(ひからない)
  h.advance(4000);
  assert.equal(u.map.classList.contains('mgr-map-new'), false, 'ふえて いない ときは ひからない');
  assert.equal(shown(u), null, 'しらせも 出ない');
  h.api.stopMeguru();
});

// ────────────────────────────── ③ いちどに いくつ 見つけても かさねない

test('③-1 1フレームに いくつ 見つけても 出すのは 1つ。つよい ものから', () => {
  const { h } = setup('forest');
  const u = open(h);
  settle(h, u);
  // おおきなき は「はじめての ばしょ」と「はじめての 地区」が おなじ フレームで おきる
  stand(h, u.run, 'great');
  const info = u.run.foundInfo();
  const live = [info.now, ...info.queue].filter(Boolean);
  assert.ok(live.length >= 2, 'ふたつ いじょう 見つけて いる');
  assert.equal(info.now.kind, 'landmark', 'つよい ものから 出す(landmark が さき)');
  assert.ok(info.queue.some((q) => q.kind === 'zone'), '地区は うしろに ならぶ');
  // え の うえに 出て いる しらせは いつも 1つ(しらせの わくは 1つ しか ない)
  assert.equal(u.ov.querySelector('#mgrFoundToast'), u.toast, 'しらせの わくは 1つ');
  for (let i = 0; i < 10; i++) { h.advance(400); assert.ok(u.run.foundInfo().now === null || typeof u.run.foundInfo().now.kind === 'string', 'いつも 1つ'); }
  h.api.stopMeguru();
});

test('③-2 じゅんばんは region → secret → landmark → みち → zone → ふつうの spot', () => {
  const { h } = setup('forest');
  const u = open(h);
  const run = u.run;
  settle(h, u);
  // いちどに いくつも 見つけた じょうたいを つくる(ひみつ・おおきなき・ふつうの ばしょ)
  for (const id of ['hearthidden', 'great', 'bright2']) { const q = spotOf(run, id); run.setPlayer(q.x, q.z); h.advance(20); }
  const info = run.foundInfo();
  const order = info.queue.map((e) => e.kind);
  const rank = { secret: 1, landmark: 2, link: 3, zone: 4, spot: 5 };
  assert.ok(order.length >= 2, 'いくつか たまって いる: ' + order.join(','));
  for (let i = 1; i < order.length; i++) assert.ok(rank[order[i - 1]] <= rank[order[i]], 'つよい ものから: ' + order.join(','));
  if (info.now) assert.ok(rank[info.now.kind] <= rank[order[0]], 'いま 出して いるのが いちばん つよい');
  // つぎに 出るのは いちばん つよい もの
  const next = settle(h, u)[0];
  assert.ok(next && rank[next.kind] <= rank[order[order.length - 1]], 'つよい ものから 出る: ' + (next && next.kind));
  // ためこむ かずには 上ばりが ある(1フレームに いくつ 見つけても ながく つづかない)
  assert.ok(info.queue.length <= 4, 'ためこみすぎない: ' + info.queue.length);
  h.api.stopMeguru();
});

test('③-3 地域の はっけんと 二重に 出さない(はじめての 地域では 着いた ばしょの しらせを かさねない)', () => {
  const { h, s } = setup('countryside');
  const u = open(h);
  const sim = u.run.sim;
  const gate = sim.gates.find((g) => g.kind === 'vertical');
  u.run.setPlayer(gate.spot.x, gate.spot.z); h.advance(120);
  const act = u.ov.querySelector('#mgrTalk');
  assert.equal(act.classList.contains('hidden'), false);
  h.dispatch(act, 'click');                        // のる → こえはじめる
  h.advance(6000);                                 // こえおわる
  assert.equal(s.regionId, 'star_stop', 'ほしぞらへ ついた');
  assert.ok(u.banner.textContent.startsWith('はじめての '), '地域の はっけんは おび で 出す: ' + u.banner.textContent);
  assert.equal(shown(u), null, 'おびが 出て いる あいだ は しらせを 出さない');
  const q = u.run.foundInfo().queue;
  assert.ok(q.every((e) => e.kind === 'link'),
    'ついた ばしょ と 地区の しらせは おびと かさねない: ' + q.map((e) => e.kind).join(','));
  const after = settle(h, u);
  assert.ok(!after.some((v) => v.kind === 'spot' || v.kind === 'zone' || v.kind === 'landmark'),
    'おびの あとにも かさねない: ' + after.map((v) => v.kind).join(','));
  // きろく じたいは すんで いる(ちずには ちゃんと のって いる)
  assert.ok(s.lifetime.meguru.spots.star_stop && s.lifetime.meguru.spots.star_stop.length > 0, 'ちずへの きろくは のこる');
  h.api.stopMeguru();
});

// ────────────────────────────── ④ 住民 / あるきかた

test('④-1 住民に ちかづいた ことは はっけんに しない(「はなす」だけ)', () => {
  const { h } = setup('forest');
  const u = open(h);
  const run = u.run;
  settle(h, u);
  assert.ok(run.world.residents.length > 0, '住民が いる');
  // 住民の いちを つかんで しらべると、住民じしんが うごく ぶん だけ ゆれる。
  // ここで しばりたいのは いちでは なく **きまり** なので、sim の できごとを
  // のぞいて「人の できごと(met / nearest)だけの フレームでは しらせが 1つも ふえない」
  // ことを みる。これなら 住民が どう うごいても おなじ 答えに なる
  let metEvents = 0, nearestEvents = 0, peopleFrames = 0, talkSeen = 0;
  const kinds = new Set();
  const orig = run.sim.step.bind(run.sim);
  const pending = () => { const i = run.foundInfo(); return i.queue.length + (i.now ? 1 : 0); };
  run.sim.step = (dt, v) => {
    const before = pending();
    const evs = orig(dt, v);
    let people = 0, place = 0;
    for (const ev of evs) {
      if (ev.type === 'met') { metEvents++; people++; }
      else if (ev.type === 'nearest') { nearestEvents++; people++; }
      // しらせを ふやせるのは「はじめての ばしょ」と「はじめての 地区」だけ
      else if ((ev.type === 'spot' || ev.type === 'zone') && ev.first) place++;
    }
    // 人の できごとが おきた のに、しらせを ふやせる ばしょの できごとが 1つも ない
    // フレーム。ここで ふえたら「住民に ちかづいた ことが はっけんに なって いる」
    if (people && !place) {
      peopleFrames++;
      assert.equal(pending(), before, '住民の できごと では しらせは ふえない');
    }
    const info = run.foundInfo();
    for (const e of [info.now, ...info.queue].filter(Boolean)) kinds.add(e.kind);
    return evs;
  };
  // ボタンは フレームの おわりに きまる ので、step の なかでは なく すすめた あとで みる
  const watch = () => {
    if (!run.nearest) return;
    talkSeen++;
    assert.equal(u.ov.querySelector('#mgrTalk').classList.contains('hidden'), false, 'そばに いるのに「はなす」が 出ない');
    assert.equal(u.ov.querySelector('#mgrTalk').textContent, '💬 はなす', 'その ばの ボタンは かえない');
  };
  // ① ばしょを まわる(ばしょの はっけんと 人の できごとが まざる ばめん)
  for (const q of run.world.spots.filter((x) => !x.secret).slice(0, 8)) {
    run.setPlayer(q.x, q.z);
    for (let i = 0; i < 6; i++) { h.advance(50); watch(); }
  }
  // ② もう ぜんぶ 見つけた ばしょに 立ちどまり、住民の ほうを そばへ つれて くる。
  //    プレイヤーが うごかない ので、ばしょの はっけんは 1つも おきない。
  //    ここで おきる できごとは 人の ことだけ に なる
  settle(h, u);
  const home0 = run.world.spots[0];
  run.setPlayer(home0.x, home0.z); h.advance(200); settle(h, u);
  for (let i = 0; i < 60; i++) {
    const a = run.world.residents[i % run.world.residents.length];
    if (a) { a.x = run.player.x + 18; a.z = run.player.z + 18; }
    h.advance(40); watch();
  }
  assert.ok(metEvents > 0, 'だれかに であって いる(' + metEvents + ')');
  assert.ok(nearestEvents > 0, 'そばに いる / いなくなった が おきて いる(' + nearestEvents + ')');
  assert.ok(peopleFrames > 0, '人の ことだけ おきた フレームが ある(' + peopleFrames + ')');
  assert.ok(talkSeen > 0, 'そばに 住民が いた ときが ある(' + talkSeen + ')');
  // ためられた しらせは ばしょの ことだけ。人は 1つも 入って いない
  for (const k of kinds) assert.ok(['spot', 'secret', 'landmark', 'zone', 'link'].includes(k), '人が しらせに 入って いる: ' + k);
  h.api.stopMeguru();
});

test('④-2 しらせは あるくのを とめない(ボタンも おおいも 出さない)', () => {
  const { h } = setup('forest');
  const u = open(h);
  settle(h, u);
  stand(h, u.run, 'great');
  assert.ok(shown(u), 'しらせが 出て いる');
  assert.equal(u.toast.querySelectorAll('button').length, 0, 'OK ボタンを 出さない');
  const css = require('node:fs').readFileSync('style.css', 'utf8');
  assert.ok(/\.mgr-found\s*\{[^}]*pointer-events:\s*none/.test(css), 'しらせは ゆびの じゃまを しない');
  assert.ok(/\.mgr-found\.hidden\s*\{\s*display:\s*none/.test(css), '.mgr-found.hidden が ほんとうに きえる');
  // なぞる パッドも「もどる」も そのまま つかえる
  for (const id of ['mgrTravel', 'mgrHome', 'mgrMap']) assert.notEqual(u.ov.querySelector('#' + id).disabled, true, id + ' は おせる');
  const before = u.run.player.z;
  u.run.setPlayer(u.run.player.x, before + 40); h.advance(200);
  assert.notEqual(u.run.player.z, before, 'しらせが 出て いても うごける');
  h.api.stopMeguru();
});

test('④-3 しらせの あいだ、した の そうさ せつめいは よわめる(ふたつが まざらない)', () => {
  const { h } = setup('forest');
  const u = open(h);
  settle(h, u);
  assert.equal(u.hint.classList.contains('mgr-hint-quiet'), false, 'ふだんは そのまま');
  stand(h, u.run, 'bright2');
  assert.ok(shown(u));
  assert.equal(u.hint.classList.contains('mgr-hint-quiet'), true, 'しらせの あいだ は よわめる');
  assert.ok(u.hint.textContent.length > 0, 'けしはしない(なぞりかたを わすれた ひとが こまる)');
  settle(h, u);
  assert.equal(u.hint.classList.contains('mgr-hint-quiet'), false, 'おわったら もどす');
  const css = require('node:fs').readFileSync('style.css', 'utf8');
  assert.ok(/\.mgr-hint\.mgr-hint-quiet[^{]*\{[^}]*opacity:\s*0?\.[0-9]+/.test(css), '.mgr-hint-quiet の きまりが ある');
  // world-scene.css が あとから .mg-hint の opacity を 1 に もどす ので、
  // ここが それより つよく ない と 見た目が かわらない
  assert.ok(/\.world-mode \.minigame-overlay \.mgr-hint\.mgr-hint-quiet/.test(css), 'world 表示でも きく きまりに なって いる');
  // おび(上)と しらせ(下)は いちを わけて いる
  assert.ok(/\.mgr-banner\s*\{[^}]*top:/.test(css) && /\.mgr-found\s*\{[^}]*bottom:/.test(css), 'おびは 上、しらせは 下');
  h.api.stopMeguru();
});

// ────────────────────────────── ⑤ ちず と たんさく率

test('⑤-1「ちずに きろくした」と 出た ものは その とき ちずに ある', () => {
  const { h } = setup('forest');
  const u = open(h);
  settle(h, u);
  for (const id of ['bright2', 'great', 'hiddenpond']) {
    stand(h, u.run, id);
    const md = u.run.sim.mapData();
    assert.ok(md.spots.some((q) => q.id === id), id + ': しらせと ちずが そろって いる');
    // 地区も おなじ。「ちずが ひろがった」と 出す まえに もう ちずに ある
    for (const e of [u.run.foundInfo().now, ...u.run.foundInfo().queue].filter((q) => q && q.kind === 'zone')) {
      const zid = e.key.split(':')[2];
      assert.ok(md.zones.some((z) => z.id === zid && z.visited), zid + ': 地区も ちずに ある');
    }
    settle(h, u);
  }
  h.api.stopMeguru();
});

test('⑤-2 こえて いる あいだ に 見つけた めじるしも ちずに のこる', () => {
  const { h, s } = setup('countryside');
  const u = open(h);
  const sim = u.run.sim;
  const gate = sim.gates.find((g) => g.kind === 'vertical');
  u.run.setPlayer(gate.spot.x, gate.spot.z); h.advance(120);
  h.dispatch(u.ov.querySelector('#mgrTalk'), 'click');
  h.advance(6000);
  const rec = s.lifetime.meguru;
  const found = (rec.marks.star_stop || []).length + (rec.marks.countryside || []).length;
  assert.ok(found > 0, 'こえて いる あいだ に 見つけた めじるしが セーブに のこる');
  h.api.stopMeguru();
});

test('⑤-3 たんさく率の けいさんは 1つも かえて いない', () => {
  const { h, M } = setup('forest');
  const u = open(h);
  stand(h, u.run, 'bright2'); h.advance(3000);
  stand(h, u.run, 'hiddenpond'); h.advance(3000);
  // 地域の %: (ひみつ いがいの 見つけた かず + 見つけた ひみつ) / (ひみつ いがい ぜんぶ + 見つけた ひみつ)
  const md = u.run.sim.mapData();
  const all = u.run.world.spots;
  const open0 = all.filter((q) => !q.secret);
  const gotSecret = all.filter((q) => q.secret && md.spots.some((x) => x.id === q.id)).length;
  const gotOpen = open0.filter((q) => md.spots.some((x) => x.id === q.id)).length;
  const denom = open0.length + gotSecret;
  assert.equal(md.progress.percent, Math.round(((gotOpen + gotSecret) / denom) * 100), '地域の % の しきは そのまま');
  // せかいの %: region / link / tier1 めじるし / zone の 4つ。おもみ も ぶんぼ も かえない
  assert.deepEqual({ ...M.WORLD_PROGRESS_WEIGHT }, { regions: 0.4, links: 0.25, marks: 0.2, zones: 0.15 });
  const C = M.worldCountable();
  const wd = M.worldMapData({ regions: C.regions.slice(), links: C.links.slice(), marks: {}, zones: {} });
  assert.equal(wd.progress.percent, Math.round((0.4 + 0.25) * 100), 'せかいの % の しきも そのまま');
  assert.equal(wd.progress.regionTotal, C.regions.length);
  assert.equal(wd.progress.linkTotal, C.links.length);
  assert.equal(wd.progress.markTotal, C.tier1);
  assert.equal(wd.progress.zoneTotal, C.zones);
  h.api.stopMeguru();
});

test('⑤-4 みちの はっけんは 出かたが かわる だけ。ひらく じょうけんは そのまま', () => {
  const { h, s, M } = setup('forest');
  const c = M.WORLD_GEOGRAPHY.connections.find((q) => q.mouths && q.mouths.forest);
  const other = c.a === 'forest' ? c.b : c.a;
  // かたほうだけ 見つけて いる あいだは ひらかない
  s.lifetime.meguru.spots = { [other]: [c.mouths[other]] };
  const u = open(h);
  settle(h, u);
  stand(h, u.run, c.mouths.forest);
  const seen = settle(h, u);
  const link = seen.find((v) => v.kind === 'link');
  assert.ok(link, 'りょうほうの 入口を 見つけたら みちの しらせが 出る');
  assert.ok(/へのみちを みつけた$/.test(link.title), 'いみが わかる ことば: ' + link.title);
  assert.equal(link.sub, 'せかいの ちずに きろくした');
  assert.ok(!/みつけた$/.test(link.title.replace('へのみちを みつけた', '')), 'ふつうの ばしょの しらせと まざらない');
  assert.deepEqual([...s.lifetime.meguru.world.links], [c.id], 'ひらく じょうけん(worldLinksFrom)は そのまま');
  assert.deepEqual([...M.worldLinksFrom({ forest: [c.mouths.forest], [other]: [c.mouths[other]] })], [c.id]);
  assert.deepEqual([...M.worldLinksFrom({ forest: [c.mouths.forest] })], [], 'かたほうだけでは ひらかない');
  h.api.stopMeguru();
});

// ────────────────────────────── ⑥ ほかの しくみを こわして いない

test('⑥-1 travelToRegion() と その ばの ボタンは 1つも かえて いない', () => {
  const src = require('node:fs').readFileSync('script.js', 'utf8');
  assert.ok(src.includes('function travelToRegion('), 'travelToRegion は のこって いる');
  const { h } = setup('forest');
  const u = open(h);
  settle(h, u);
  // なにも ない ところでは その ばの ボタンは 出ない
  u.run.setPlayer(u.run.world.halfW * 0.95, 40); h.advance(200);
  assert.equal(u.ov.querySelector('#mgrTalk').classList.contains('hidden'), true);
  for (const id of ['mgrTravel', 'mgrHome', 'mgrMap']) assert.ok(u.ov.querySelector('#' + id), id + ' は そのまま ある');
  // しらせが 出て いる あいだ も その ばの ボタンの きまりは かわらない
  stand(h, u.run, 'bright2');
  assert.ok(shown(u));
  assert.equal(u.ov.querySelector('#mgrTalk').classList.contains('hidden'), true, 'だれも いなければ「はなす」は 出ない');
  h.api.stopMeguru();
});

test('⑥-2 たんさくを とじると しらせも のこらない', () => {
  const { h } = setup('forest');
  const u = open(h);
  settle(h, u);
  stand(h, u.run, 'great');
  assert.ok(shown(u));
  h.api.stopMeguru();
  assert.equal(u.toast.classList.contains('hidden'), true, 'とじたら しらせも きえる');
  assert.equal(u.hint.classList.contains('mgr-hint-quiet'), false, 'そうさ せつめいの よわめも もどす');
});

// ────────────────────────────── ⑦ はっけんの おおきさ(通知レベル)
//
// 監査(docs/qa/meguru-spot-audit-2026-09-21.md)で わかった こと:
//   471 の spot の うち 188 は、その spot の ための ものが 画面に 1つも ない。
//   それでも 初回に「○○を みつけた」と 出て いた。
//   いちばん ひどい れいが もりの「にたようなこだち」— **おなじ 名前の spot が 3つ** あり、
//   どれも ぶんきの 🪧 いがい 何も ない。
// ここでは「しらせる レベル」の きまりを かためる。

test('⑦-1 レベルは buildWorld() が ほんとうに おく ものから きまる', () => {
  const { M } = setup('forest');
  const lv = (rid, id) => M.spotDiscoveryLevel(M.WORLDS[rid].spots.find((q) => q.id === id));
  // 3: landmark / secret
  assert.equal(lv('forest', 'great'), 3, 'おおきなき は landmark');
  assert.equal(lv('forest', 'hiddenpond'), 3, 'かくれたいけ は secret');
  // 2: 画面に その spot の ものが ある
  assert.equal(lv('forest', 'bright2'), 2, 'ひだまり は 🪵 が 立つ');
  assert.equal(lv('forest', 'creek2'), 2, 'おがわのふち は みずたまりを えがく(kind:water)');
  // 0: 目じるしが ない 通過点
  assert.equal(lv('forest', 'thicket1'), 0, 'にたようなこだち は 何も ない');
  assert.equal(lv('forest', 'anc4'), 0, 'しずかなくぼち は 何も ない');
  assert.equal(lv('forest', 'bright1'), 0, 'あかるいこみち は ただの みち');
  // 🪧 は どの ぶんきにも ある ので 目じるしに ならない
  assert.equal(lv('forest', 'oldsign'), 0, '「ふるいひょうしき」の 🪧 は どの ぶんきにも ある');
  // 地域の 主役に まかせる prop(SPOT_PROP_STRUCT が null)は 何も おかれない
  for (const rid of Object.keys(M.WORLDS)) {
    for (const q of M.WORLDS[rid].spots) {
      if (q.secret || q.landmark) { assert.equal(M.spotDiscoveryLevel(q), 3, rid + '/' + q.id); continue; }
      if (q.prop === '🌊' || q.prop === '🌫️') assert.equal(M.spotDiscoveryLevel(q), 0, rid + '/' + q.id + ': なにも おかれない prop');
    }
  }
});

test('⑦-2 目じるしの ない 通過点では しらせない。でも きろくは のこる(探索率は かわらない)', () => {
  const { h, s } = setup('forest');
  const u = open(h);
  settle(h, u);
  const before = u.run.sim.mapData().progress.percent;
  stand(h, u.run, 'thicket1');                       // 何も ない 通過点
  assert.equal(shown(u), null, '通過点では しらせない');
  assert.equal(u.run.foundInfo().queue.length, 0, 'ためても いない');
  // それでも ちずには のる(きろくは これまで どおり)
  assert.ok(u.run.sim.mapData().spots.some((q) => q.id === 'thicket1'), 'ちずには のこる');
  assert.ok(s.lifetime.meguru.spots.forest.includes('thicket1'), 'セーブにも のこる');
  assert.ok(u.run.sim.mapData().progress.percent >= before, '探索率も すすむ');
  // 左上の チップが どこに いるかを 出しつづける(レベル1 は もともと ある)
  assert.equal(u.ov.querySelector('#mgrSpot').textContent, 'にたようなこだち', 'どこに いるかは わかる');
  h.api.stopMeguru();
});

test('⑦-3 目じるしの ある ばしょは これまで どおり しらせる', () => {
  const { h } = setup('forest');
  const u = open(h);
  settle(h, u);
  stand(h, u.run, 'bright2');
  const t = shown(u);
  assert.ok(t, '🪵 が 立つ ばしょは しらせる');
  assert.equal(t.title, 'ひだまりを みつけた');
  h.api.stopMeguru();
});

test('⑦-4「ちずに きろくした」は はじめの うちだけ(なんども くりかえさない)', () => {
  const { h, s } = setup('forest');
  // もう たくさん 見つけて いる ひと
  s.lifetime.meguru.spots = { forest: ['entry', 'bright1', 'bright3', 'sunspot', 'creek1'] };
  const u = open(h);
  settle(h, u);
  stand(h, u.run, 'bright2');
  const t = shown(u);
  assert.ok(t, 'しらせ じたいは 出る');
  assert.equal(t.title, 'ひだまりを みつけた');
  assert.equal(t.sub, '', 'なれた ひとには「ちずに きろくした」を くりかえさない');
  h.api.stopMeguru();
});

test('⑦-5 はじめて あそぶ ひとには「ちずに きろくした」を そえる', () => {
  const { h } = setup('forest');
  const u = open(h);                                 // まっさら(spots は から)
  settle(h, u);
  stand(h, u.run, 'bright2');
  const seen = [shown(u), ...settle(h, u)].filter(Boolean);
  const first = seen.find((v) => v.title === 'ひだまりを みつけた');
  assert.ok(first, 'はじめの はっけん');
  assert.equal(first.sub, 'ちずに きろくした', 'はじめの うちは しくみを おしえる');
  h.api.stopMeguru();
});

test('⑦-6 レベルは セーブに 何も 足さない(旧セーブでも そのまま 動く)', () => {
  const { h, s } = setup('forest');
  // 旧セーブ: めぐるの きろくが spots だけ(zones/paths/marks/world が ない)
  s.lifetime.meguru = { visits: 2, talkCount: 0, met: {}, talks: {}, spots: { forest: ['bright2'] } };
  const u = open(h);
  settle(h, u);
  stand(h, u.run, 'bright2');
  assert.equal(shown(u), null, 'もう 見つけて いる ので 出さない');
  stand(h, u.run, 'creek2');
  const t = [shown(u), ...settle(h, u)].filter(Boolean).find((v) => /おがわのふち/.test(v.title));
  assert.ok(t, '旧セーブでも あたらしい はっけんは 出る');
  assert.deepEqual([...Object.keys(s.lifetime.meguru)].sort(),
    ['marks', 'met', 'paths', 'spots', 'talkCount', 'talks', 'visits', 'world', 'zones'].sort(),
    'キーは これまでと おなじ(レベル用の 新しい きろくを 足さない)');
  h.api.stopMeguru();
});

test('⑦-7 監査の けっかと 実装が そろって いる', () => {
  const { M } = setup('forest');
  const rows = require('node:fs').readFileSync('docs/qa/meguru-spot-audit-2026-09-21.csv', 'utf8').split('\n').slice(1).filter(Boolean);
  let n = 0; const lv = {};
  for (const line of rows) {
    const c = line.match(/"((?:[^"]|"")*)"/g).map((q) => q.slice(1, -1).replace(/""/g, '"'));
    const [region, id] = c;
    const want = Number(c[14].slice(1));             // 推奨通知レベル "L0" / "L2" / "L3"
    const sp = M.WORLDS[region].spots.find((q) => q.id === id);
    assert.ok(sp, region + '/' + id + ' が せかいに ない');
    assert.equal(M.spotDiscoveryLevel(sp), want, region + '/' + id + '(' + c[2] + ')');
    lv['L' + want] = (lv['L' + want] || 0) + 1; n++;
  }
  assert.equal(n, 471, '監査表は 471 spot ぜんぶ');
  assert.deepEqual(lv, { L0: 184, L2: 216, L3: 71 }, '監査の うちわけ(#319 で みはらし 4件が L0→L2)');
});

// ────────────────────────────── ⑧ みはらしの spot に けしきを 足した(#319)
//
// #318 の 監査で F(なまえは とくちょうを やくそくする のに 画面に 何も ない)と
// 判定された 40 件の うち、まず「みはらし」系 4 件だけを 直した。
// たいせつなのは「けしきを ごうかに する」ことでは なく、
// 「○○のみはらしを みつけた」と 出た とき **画面を 見て わかる** こと。
const VIEW_SPOTS = [
  ['forest', 'stonelook', 'いわばのみはらし', 'ledgerock'],
  ['countryside', 'terracelook', 'たなだのてんぼう', 'cropline'],
  ['mountain', 'lookout1', 'いちのてんぼう', 'telescope'],
  ['river_lake', 'lakelook', 'みずうみのてんぼう', 'springpool'],
];
// 日がわり/天気で けしきの いちは ばらつく。しらべ ものは 環境を 固定して 再現できる ように する
function fixedWorld(h, M, regionId) {
  Object.assign(h.api.state().lifetime, { timeMode: 'day', weatherMode: 'sunny', seasonMode: 'spring' });
  h.api.render();
  return M.buildWorld(regionId, M.buildRegistry(), {});
}

test('⑧-1 4つの みはらしに、その ばしょ だけの けしきが ある', () => {
  const { h, M } = setup('forest');
  for (const [rid, id, label, lead] of VIEW_SPOTS) {
    const w = fixedWorld(h, M, rid);
    const sp = w.spots.find((q) => q.id === id);
    assert.equal(sp.label, label, rid + '/' + id + ': なまえ');
    const mine = w.props.filter((p) => p.view === id);
    assert.ok(mine.length >= 2, `${rid}/${id}: けしきが 足りない(${mine.length})`);
    // 主役が かならず 1つ ある(おけなかった ままに しない)
    const main = mine.filter((p) => p.size === 300);
    assert.equal(main.length, 1, `${rid}/${id}: 主役は 1つ(いまは ${main.length})`);
    assert.equal(main[0].struct, lead, `${rid}/${id}: 主役は ${lead}`);
    // spot の まんなかは あけて おく(あるく ところを うめない)
    for (const p of mine) assert.ok(Math.hypot(p.x - sp.x, p.z - sp.z) > sp.r * 0.6, `${rid}/${id}: まんなかに おいて いる`);
    // ものを おきすぎない(主役 1 + 補助 すこし)
    assert.ok(mine.length <= 4, `${rid}/${id}: おきすぎ(${mine.length})`);
  }
  h.api.stopMeguru && h.api.stopMeguru();
});

test('⑧-2 主役は 地域ごとに ちがう(どこにも おなじ てすりを 置かない)', () => {
  const { h, M } = setup('forest');
  const leads = [];
  for (const [rid, id] of VIEW_SPOTS) {
    const w = fixedWorld(h, M, rid);
    leads.push(w.props.filter((p) => p.view === id && p.size === 300)[0].struct);
  }
  assert.equal(new Set(leads).size, 4, '4つとも ちがう もの: ' + leads.join(','));
  // え を かける ものだけ を つかう(「置いたのに 映らない」を ふせぐ)
  const src = require('node:fs').readFileSync('meguru.js', 'utf8');
  for (const k of leads) assert.ok(src.includes(`case '${k}'`), k + ' は drawStructure が しって いる');
});

test('⑧-3 けしきは あたりはんていを 1つも ふやさない(みち・出口・住民を ふさがない)', () => {
  const { h, M } = setup('forest');
  for (const [rid, id] of VIEW_SPOTS) {
    const w = fixedWorld(h, M, rid);
    const mine = w.props.filter((p) => p.view === id);
    // solid で ない → colliderOf() は null。ふさぐ ことが そもそも できない
    for (const p of mine) {
      assert.ok(!p.solid, `${rid}/${id}: solid に して いる`);
      assert.equal(M.colliderOf(p), null, `${rid}/${id}: あたりはんていが ついて いる`);
    }
    // みちの ふちからも はなれて いる
    for (const p of mine) {
      const n = M.nearestPath({ x: p.x, z: p.z }, w);
      assert.ok(!n || n.dist > n.half, `${rid}/${id}: みちの うえに ある`);
    }
  }
});

test('⑧-4 gate の 発火は 1つも かわらない(connection に さわって いない)', () => {
  const { h, M } = setup('forest');
  const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  // connection の かず と 分母は そのまま
  assert.equal(M.WORLD_GEOGRAPHY.connections.length, 14, 'connection 14本');
  const C = M.worldCountable();
  assert.equal(C.regions.length, 11); assert.equal(C.links.length, 12, 'Phase 3B-Final で いなか|みずべ を けした ぶん 13 → 12');
  assert.equal(C.tier1, 17); assert.equal(C.zones, 103);
  // みはらしを かかえる region で、出口の はんていが すべて 出る ことを みる
  for (const rid of ['forest', 'mountain', 'countryside', 'river_lake']) {
    const w = fixedWorld(h, M, rid);
    const gates = M.regionGates(rid, w);
    assert.ok(gates.length > 0, rid + ': 出口が ある');
    let fired = 0;
    for (const g of gates) {
      const here = gates.filter((q) => q.spot.id === g.spot.id);
      for (let ix = -4; ix <= 4; ix++) for (let iz = -4; iz <= 4; iz++) for (const [mx, mz] of DIRS) {
        const r = M.resolveGate(here, { x: g.spot.x + ix * (g.spot.r / 4), z: g.spot.z + iz * (g.spot.r / 4), mx, mz, kind: 'walk' });
        if (r) fired++;
      }
    }
    assert.ok(fired > 0, rid + ': 出口が 1かいも 発火しない');
  }
});

test('⑧-5 4つとも L2。「みつけた」だけで「ちずに きろくした」は くりかえさない', () => {
  const { h, M, s } = setup('forest');
  for (const [rid, id] of VIEW_SPOTS) {
    const sp = M.WORLDS[rid].spots.find((q) => q.id === id);
    assert.equal(M.spotDiscoveryLevel(sp), 2, rid + '/' + id + ': L2');
  }
  // もう なれた ひと には 2行目を 出さない(#318 の きまりを たもつ)
  s.lifetime.meguru.spots = { forest: ['entry', 'bright1', 'bright3', 'sunspot', 'creek1'] };
  const u = open(h);
  settle(h, u);
  stand(h, u.run, 'stonelook');
  const t = [shown(u), ...settle(h, u)].filter(Boolean).find((v) => /いわばのみはらし/.test(v.title));
  assert.ok(t, 'いわばのみはらしを みつけた が 出る');
  assert.equal(t.title, 'いわばのみはらしを みつけた');
  assert.equal(t.sub, '', '「ちずに きろくした」を くりかえさない');
  h.api.stopMeguru();
});

test('⑧-6 2かいめ は 出さない。旧セーブで もう 見つけて いれば けしきだけ 見える', () => {
  const { h, s } = setup('forest');
  // 旧セーブ: すでに いわばのみはらしを 見つけて いる
  s.lifetime.meguru = { visits: 3, talkCount: 0, met: {}, talks: {}, spots: { forest: ['stonelook'] } };
  const u = open(h);
  settle(h, u);
  stand(h, u.run, 'stonelook');
  h.advance(400);
  assert.equal(shown(u), null, '見つけずみ なら しらせを やりなおさない');
  assert.equal(u.run.foundInfo().queue.length, 0);
  // けしきは ある
  assert.ok(u.run.world.props.some((p) => p.view === 'stonelook'), 'けしきは 見える');
  // チップは 出て いる
  assert.equal(u.ov.querySelector('#mgrSpot').textContent, 'いわばのみはらし');
  h.api.stopMeguru();
});

test('⑧-7 spot / path / zone / secret の かずは 1つも ふえて いない', () => {
  const { M } = setup('forest');
  let spots = 0, secrets = 0, zones = 0, paths = 0;
  for (const rid of Object.keys(M.WORLDS)) {
    const b = M.WORLDS[rid];
    spots += b.spots.length; zones += b.zones.length; paths += (b.paths || []).length;
    secrets += b.spots.filter((q) => q.secret).length;
  }
  assert.equal(spots, 471, 'spot 471');
  assert.equal(secrets, 50, 'secret 50');
  assert.equal(paths, 654, 'path 654');
  // **かぞえかたが 2つ ある**。WORLDS に 書いて ある 地区は ぜんぶで 118。
  // 探索率の 分母 103 は worldCountable() の ほう(ほしぞら・きおくのみずうみ は 入らない)。
  // ここで 103 と 書くと まちがう(⑧-4 が 分母の ほうを みて いる)
  assert.equal(zones, 118, 'WORLDS に ある 地区は 118');
  assert.equal(M.worldCountable().zones, 103, '探索率の 分母は 103');
  // view は spot の データに 足した だけ。landmark には して いない(tier1 の 分母を かえない)
  for (const [rid, id] of VIEW_SPOTS) {
    const sp = M.WORLDS[rid].spots.find((q) => q.id === id);
    assert.ok(!sp.landmark, rid + '/' + id + ': landmark に して いない');
    assert.ok(!sp.secret, rid + '/' + id + ': secret に して いない');
  }
});
