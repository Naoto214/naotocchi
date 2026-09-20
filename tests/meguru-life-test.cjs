// めぐるの「住民の せいかつ」。
// たいせつなのは「住民が うごく」ことでは なく「その ばしょを つかって くらして いる
// ように 見える」こと なので、ばしょ・じかん・てんき・ほかの 住民 との かんけいから
// 行動が 生まれて いるか、そして しずかな ところが しずかな まま かを いちばん あつく みる。
// 表情の えには いっさい さわらない: emotion は ろんりの じょうたい だけ。
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/runtime-harness.cjs');

const REGIONS = ['home', 'city', 'countryside', 'forest', 'mountain', 'snow', 'sea', 'deepsea', 'river_lake', 'jungle', 'desert', 'star_stop', 'memory_lake'];
const E = (time, weather, season) => ({ time: time || 'day', weather: weather || 'sunny', season: season || 'spring', region: 'x' });

function setup() {
  const h = harness({ fullDisplay: true });
  const s = h.api.state();
  Object.assign(s, { stage: 'growing', isSleeping: false, energy: 100, health: 100, hunger: 80, speciesLine: 'dog', stageIndex: 4, ageTicks: 500 });
  s.petKey = `dog:${h.api.currentFormStageIndex()}`;
  const all = []; const SP = h.api.SPECIES;
  for (const line of Object.keys(SP)) for (let i = 0; i < (SP[line].stages || []).length; i++) all.push(`${line}:${i}`);
  s.discoveredStages = all;
  h.api.render();
  return h.api.meguruMod;
}
const M = setup();
const run = (id, env, secs, every, fn) => {
  const sim = M.createSimulation({ regionId: id, discovered: [], env: env || E() });
  for (let i = 0; i < 60 * secs; i++) { sim.step(1 / 60, { x: 0, y: 0 }); if (fn && i % (60 * (every || 4)) === 0) fn(sim, i); }
  return sim;
};
const free = (a) => !a.plant && !a.fixed && !a.follow;
// テストだけ らんすうの たねを 入れかえる(めぐる本体の Math.random は そのまま)。
// これで「この たねの ときは こう なる」が いつ はしらせても おなじに なる
const seededRandom = (seed) => { let t = seed >>> 0; return () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
const withSeed = (seed, fn) => { M.setRandom(seededRandom(seed)); try { return fn(); } finally { M.setRandom(null); } };
// からだの おおきさ 18 で はかる(めりこみ 0 が「立てて いる」)
const deepest = (w, a) => M.penetrationAt(w, a.x, a.z, 18, !!a.water);
const KNOWN = new Set(['idle', 'walk', 'look', 'rest', 'sit', 'sleep', 'talk', 'gather', 'play', 'swim', 'sway', 'watch', 'fish', 'shop', 'chase']);

test('every spot says what can be done there, and the list comes from the world, not from a hand-written table', () => {
  let total = 0, shelter = 0, seats = 0, sleepable = 0;
  for (const id of REGIONS) {
    const w = M.buildWorld(id, M.buildRegistry(), {});
    for (const s of w.spots) {
      total++;
      assert.ok(Array.isArray(s.activities) && s.activities.length > 0, `${id}/${s.id}: the spot offers at least one activity`);
      for (const act of s.activities) assert.ok(s.actWeights[act] > 0, `${id}/${s.id}/${act}: the weight is positive`);
      if (s.shelter) shelter++;
      if (s.seats) seats++;
      if (s.actWeights.sleep) sleepable++;
      // ねむれる / すわれる のは その ための ばしょ だけ
      if (s.actWeights.sleep) assert.ok(s.shelter || s.kind === 'rest' || s.kind === 'grove', `${id}/${s.id}: you only sleep somewhere it makes sense`);
      if (s.actWeights.sit) assert.ok(s.seats, `${id}/${s.id}: you only sit where there is something to sit on`);
      // かくし ばしょは ひとりで すごす ところ
      if (s.secret) for (const act of ['gather', 'talk', 'play']) assert.ok(!s.actWeights[act], `${id}/${s.id}: nothing sociable happens in a secret place`);
    }
  }
  assert.equal(total, 469, 'all 469 spots carry their activities');
  assert.ok(shelter > 30 && seats > 100 && sleepable > 100, `shelter=${shelter} seats=${seats} sleepable=${sleepable}`);
});

test('the 13 regions do not share one set of AI numbers', () => {
  const seen = new Set();
  for (const id of REGIONS) { const p = M.REGION_LIFE[id]; assert.ok(p, `${id} has a life profile`); seen.add([p.social, p.quiet, p.move, p.view].join(',')); }
  assert.ok(seen.size >= 10, `the regions differ from each other (${seen.size} distinct profiles)`);
  assert.ok(M.REGION_LIFE.city.social > M.REGION_LIFE.memory_lake.social * 4, 'the city is sociable, the lake of memories is not');
  assert.ok(M.REGION_LIFE.memory_lake.quiet > M.REGION_LIFE.city.quiet * 2, 'the lake of memories is the quiet one');
  assert.ok(M.REGION_LIFE.star_stop.view > M.REGION_LIFE.city.view, 'the star stop is for looking');
});

test('a resident picks an activity, walks there along the paths and does it, rather than drifting at random', () => {
  const sim = M.createSimulation({ regionId: 'countryside', discovered: [], env: E() });
  const w = sim.world;
  let routed = 0, arrived = 0, offPath = 0;
  const wasRouting = new Map();
  for (let i = 0; i < 60 * 150; i++) {
    sim.step(1 / 60, { x: 0, y: 0 });
    if (i % 15) continue;
    for (const a of w.residents) {
      if (!free(a)) continue;
      const had = wasRouting.get(a.key);
      if (a.route && a.route.length) { routed++; wasRouting.set(a.key, a.route[a.route.length - 1]); }
      else if (had) { wasRouting.set(a.key, null); arrived++; if (a.spot === had) offPath++; }
    }
  }
  assert.ok(routed > 50, `residents travel to somewhere on purpose (${routed} samples)`);
  assert.ok(arrived > 5, `and they get there (${arrived} arrivals)`);
});

test('residents are held by the same world-space colliders as the player and never enter the sea you may not walk in', () => {
  // らんすうの たねを 3つ 固定して はしらせる。じっこう ごとに 通ったり 落ちたり しない
  for (const seed of [1, 20260920, 777]) withSeed(seed, () => {
    for (const id of REGIONS) {
      const sim = M.createSimulation({ regionId: id, discovered: [], env: E() });
      const w = sim.world;
      let worst = 0, inSea = 0, outside = 0, who = '';
      for (let i = 0; i < 60 * 80; i++) {
        sim.step(1 / 60, { x: 0, y: 0 });
        if (i % 60) continue;
        for (const a of w.residents) {
          if (!free(a) || a.water) continue;
          const p = deepest(w, a);
          if (p > worst) { worst = p; who = `${a.emoji || a.key} at ${Math.round(a.x)}/${Math.round(a.z)} (${a.spot && a.spot.id})`; }
          if (a.x < w.minX - 60 || a.x > w.maxX + 60 || a.z < 0 || a.z > w.len) outside++;
          if (w.terrain && w.terrain.kind === 'coast') {
            const sx = M.shoreX(w, a.z);
            if (sx != null && (w.terrain.side < 0 ? a.x < sx : a.x > sx)) inSea++;
          }
        }
      }
      assert.ok(worst < 9, `${id} (seed ${seed}): nobody stands inside a tree or a wall (worst ${worst.toFixed(1)} against a body of 18, ${who})`);
      assert.equal(inSea, 0, `${id} (seed ${seed}): nobody walks out into the open sea`);
      assert.equal(outside, 0, `${id} (seed ${seed}): nobody leaves the world`);
    }
  });
});

// うまれた とき / 目的地を きめなおした とき / とおい そうから もどった とき /
// さそいあいの あと。どの きっかけでも「木や かべの なか」に 立って いない
test('every way a resident is placed puts them somewhere they can actually stand', () => {
  for (const seed of [3, 20260920]) withSeed(seed, () => {
    for (const id of REGIONS) {
      const sim = M.createSimulation({ regionId: id, discovered: [], env: E() });
      const w = sim.world;
      const standing = (when) => {
        for (const a of w.residents) {
          if (!free(a)) continue;
          const p = deepest(w, a);
          assert.ok(p < 9, `${id} (seed ${seed}) ${when}: ${a.emoji || a.key} stands clear (${p.toFixed(1)} at ${Math.round(a.x)}/${Math.round(a.z)})`);
        }
      };
      // ① うまれた ところ(あたりはんていは 住民の あとに できる)
      standing('at birth');
      // ② とおい そうへ 行って もどって くる。stepDistant で 置きなおされ、
      //    reenterDetail で ちかくの そうへ もどる のを ぜんいんぶん たしかめる
      for (const a of w.residents) {
        if (!free(a)) continue;
        a.tier = 2;
        M.stepDistant(a, E(), w, w.clock + 1000);
        assert.ok(deepest(w, a) < 9, `${id} (seed ${seed}) after stepDistant: ${a.emoji || a.key} stands clear`);
        M.reenterDetail(a, w);
        assert.ok(deepest(w, a) < 9, `${id} (seed ${seed}) back in detail: ${a.emoji || a.key} stands clear`);
      }
      // ③ ながい せいかつ。プレイヤーを 歩かせて そうの 出入りを 何どでも おこす
      const spots = w.spots.filter((s) => !s.secret);
      for (let i = 0; i < 60 * 150; i++) {
        if (i % 600 === 0 && spots.length) { const s = spots[(i / 600) % spots.length]; sim.setPlayer(s.x, s.z); }
        sim.step(1 / 60, { x: 0, y: 0 });
        if (i % 15 === 0) standing(`at ${Math.round(i / 60)}s`);
      }
      // ④ さそいあいの あと(はなし・あつまりを ほどいた 直後の いち)
      for (const a of w.residents) if (a.partner || a.meet) { a.until = -1; }
      for (let i = 0; i < 60 * 20; i++) { sim.step(1 / 60, { x: 0, y: 0 }); if (i % 15 === 0) standing('after interactions end'); }
    }
  });
});

// たねが おなじ なら おなじ けっかに なる(テストが たまたま 通る ことが ない)
test('the same seed replays the same life, so this suite cannot pass by luck', () => {
  const trace = (seed) => withSeed(seed, () => {
    const sim = M.createSimulation({ regionId: 'jungle', discovered: [], env: E() });
    for (let i = 0; i < 60 * 30; i++) sim.step(1 / 60, { x: 0, y: 0 });
    return sim.world.residents.map((a) => `${Math.round(a.x)},${Math.round(a.z)},${a.behavior}`).join('|');
  });
  assert.equal(trace(42), trace(42), 'the same seed gives the same world');
  assert.notEqual(trace(42), trace(43), 'a different seed gives a different world');
});

test('talking starts by two residents coming together and facing each other, never at a distance', () => {
  let pairs = 0, facing = 0, apart = 0, stale = 0;
  for (const id of ['home', 'city', 'sea']) {
    const sim = M.createSimulation({ regionId: id, discovered: [], env: E() });
    const seen = new Set();
    for (let i = 0; i < 60 * 240; i++) {
      sim.step(1 / 60, { x: 0, y: 0 });
      if (i % 30) continue;
      for (const a of sim.world.residents) {
        if (a.behavior !== 'talk') continue;
        const b = a.partner;
        if (!b || b.partner !== a) { stale++; continue; }
        const key = [a.key, b.key].sort().join('|');
        if (!seen.has(key)) { seen.add(key); pairs++; }
        if (Math.hypot(a.x - b.x, a.z - b.z) > 150) apart++;
        const wantA = Math.atan2(b.x - a.x, b.z - a.z), wantB = Math.atan2(a.x - b.x, a.z - b.z);
        if (Math.abs(M.wrapAngle(a.heading - wantA)) < 0.4 && Math.abs(M.wrapAngle(b.heading - wantB)) < 0.4) facing++;
        else assert.fail(`${id}: a talking pair is not facing each other`);
      }
    }
  }
  assert.ok(pairs > 10, `conversations do happen (${pairs} pairs)`);
  assert.ok(facing > 100, 'and both of them turn to look at each other');
  assert.equal(apart, 0, 'nobody talks from across the field');
  assert.ok(stale < pairs, 'a conversation is not left hanging on one side');
});

test('nobody is asked to talk by three people at once: an interaction is reserved before it starts', () => {
  for (const id of ['city', 'sea', 'home']) {
    const sim = M.createSimulation({ regionId: id, discovered: [], env: E() });
    for (let i = 0; i < 60 * 150; i++) {
      sim.step(1 / 60, { x: 0, y: 0 });
      if (i % 20) continue;
      const claims = new Map();
      for (const a of sim.world.residents) if (a.partner) claims.set(a.partner, (claims.get(a.partner) || 0) + 1);
      for (const [who, n] of claims) assert.ok(n <= 1, `${id}: ${who.key} is being asked by ${n} residents at once`);
    }
  }
});

test('a gathering forms as a few residents arriving at the same place, and stays small', () => {
  let groups = 0, biggest = 0; const sizes = [];
  for (const id of ['sea', 'city', 'home']) {
    const sim = M.createSimulation({ regionId: id, discovered: [], env: E() });
    const seen = new Set();
    for (let i = 0; i < 60 * 260; i++) {
      sim.step(1 / 60, { x: 0, y: 0 });
      if (i % 30) continue;
      for (const m of sim.world.meets) {
        const active = m.members.filter((q) => q.behavior === 'gather' || q.behavior === 'play');
        if (active.length < 2) continue;
        if (!seen.has(m)) { seen.add(m); groups++; }
        sizes.push(active.length); biggest = Math.max(biggest, active.length);
        // かさならず、まんなかを 見る
        for (const q of active) {
          assert.ok(Math.hypot(q.x - m.x, q.z - m.z) < 260, `${id}: a member of the gathering stands near it`);
          for (const r of active) if (r !== q) assert.ok(Math.hypot(q.x - r.x, q.z - r.z) > 12, `${id}: members of a gathering do not stand on top of each other`);
        }
      }
    }
  }
  assert.ok(groups > 10, `gatherings do form (${groups})`);
  assert.ok(biggest <= 6, `and they stay small (biggest ${biggest})`);
  const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  assert.ok(avg < 3.2, `a gathering is two or three residents, not a crowd (average ${avg.toFixed(1)})`);
});

test('the time of day changes what residents do, and not everybody changes at the same moment', () => {
  const share = (time) => {
    const c = new Map(); let n = 0;
    for (const id of ['city', 'sea', 'countryside']) {
      run(id, E(time), 180, 4, (sim) => { for (const a of sim.world.residents) { if (!free(a)) continue; c.set(a.behavior, (c.get(a.behavior) || 0) + 1); n++; } });
    }
    return (k) => (c.get(k) || 0) / n;
  };
  const day = share('day'), night = share('night');
  assert.ok(night('sleep') > Math.max(0.02, day('sleep') * 4), `residents sleep at night, not in the day (${(night('sleep') * 100).toFixed(1)}% vs ${(day('sleep') * 100).toFixed(1)}%)`);
  assert.ok(night('rest') > day('rest') * 1.3, `and they rest more (${(night('rest') * 100).toFixed(1)}% vs ${(day('rest') * 100).toFixed(1)}%)`);
  assert.ok(day('play') > night('play') * 2, `playing belongs to the day (${(day('play') * 100).toFixed(1)}% vs ${(night('play') * 100).toFixed(1)}%)`);
  const daySocial = day('talk') + day('gather') + day('play'), nightSocial = night('talk') + night('gather') + night('play');
  assert.ok(daySocial > nightSocial * 1.8, `people meet in the day, not at night (${(daySocial * 100).toFixed(1)}% vs ${(nightSocial * 100).toFixed(1)}%)`);
  // ぜんいんが 同時に かわらない: 行動が きりかわる 時こくが ばらけて いる
  const sim = M.createSimulation({ regionId: 'countryside', discovered: [], env: E() });
  const changeAt = new Map(), last = new Map();
  for (const a of sim.world.residents) last.set(a.key, a.behavior);  // 1フレーム目は ぜんいん「かわった」に なるので かぞえない
  for (let i = 0; i < 60 * 80; i++) {
    sim.step(1 / 60, { x: 0, y: 0 });
    for (const a of sim.world.residents) { if (!free(a)) continue; if (last.get(a.key) !== a.behavior) { last.set(a.key, a.behavior); changeAt.set(i, (changeAt.get(i) || 0) + 1); } }
  }
  const frames = [...changeAt.values()];
  const most = Math.max(...frames);
  const movers = sim.world.residents.filter(free).length;
  assert.ok(most <= Math.max(3, movers * 0.4), `residents do not all change behaviour on the same frame (worst ${most} of ${movers})`);
});

test('the weather changes where residents are: rain moves them under a roof, but not all of them', () => {
  const underRoof = (weather) => {
    let shel = 0, n = 0;
    // 1 回の 見た目は ぶれる ので、4 地域を 2 秒ごとに たくさん かぞえる
    for (const id of ['city', 'sea', 'countryside', 'snow']) {
      run(id, E('day', weather), 180, 2, (sim) => { for (const a of sim.world.residents) { if (!free(a) || !a.spot) continue; n++; if (a.spot.shelter) shel++; } });
    }
    return shel / n;
  };
  const dry = underRoof('sunny'), wet = underRoof('rain');
  assert.ok(wet > dry * 1.2 && wet - dry > 0.04, `rain sends residents under a roof (${(wet * 100).toFixed(1)}% vs ${(dry * 100).toFixed(1)}%)`);
  assert.ok(wet < 0.85, 'but the world does not empty out — some stay outside and watch the rain');
});

test('a quiet district stays quiet and a busy one does not: the district crowd figure reaches the life AI', () => {
  const social = (id) => {
    let soc = 0, n = 0, meets = 0, ticks = 0;
    run(id, E(), 240, 4, (sim) => {
      for (const a of sim.world.residents) { if (!free(a)) continue; n++; if (a.behavior === 'talk' || a.behavior === 'gather' || a.behavior === 'play') soc++; }
      meets += sim.world.meets.length; ticks++;
    });
    return { rate: soc / Math.max(1, n), meets: meets / Math.max(1, ticks) };
  };
  const quiet = social('memory_lake'), deep = social('deepsea'), busy = social('sea');
  assert.ok(quiet.rate < 0.06, `the lake of memories stays a place to be alone (${(quiet.rate * 100).toFixed(1)}% sociable)`);
  assert.ok(deep.rate < 0.2, `the deep sea stays quiet (${(deep.rate * 100).toFixed(1)}%)`);
  assert.ok(busy.rate > quiet.rate * 3, `the coast is livelier than the lake of memories (${(busy.rate * 100).toFixed(1)}%)`);
  assert.ok(busy.meets > quiet.meets, 'and that is where gatherings happen');
});

test('behaviour and emotion are two different things', () => {
  for (const e of M.RESIDENT_EMOTIONS) assert.ok(typeof e === 'string');
  // お世話の じょうたいは この せかいでは つかわない
  for (const care of ['hungry', 'sick', 'weak', 'critical']) assert.ok(!M.RESIDENT_EMOTIONS.includes(care), `${care} belongs to caring for your own pet, not to a resident's life`);
  const byBehavior = new Map();
  for (const id of ['city', 'sea', 'countryside']) {
    for (const time of ['day', 'evening', 'night']) {
      run(id, E(time), 150, 3, (sim) => {
        for (const a of sim.world.residents) {
          if (!free(a)) continue;
          assert.ok(M.RESIDENT_EMOTIONS.includes(a.emotion), `${a.emotion} is one of the known feelings`);
          const set = byBehavior.get(a.behavior) || new Set(); set.add(a.emotion); byBehavior.set(a.behavior, set);
        }
      });
    }
  }
  const talk = byBehavior.get('talk');
  assert.ok(talk && talk.size >= 2, `talking does not always mean one feeling (${talk ? [...talk].join('/') : 'none'})`);
  let multi = 0;
  for (const [, set] of byBehavior) if (set.size >= 2) multi++;
  assert.ok(multi >= 3, 'several behaviours are seen with more than one feeling');
  assert.ok((byBehavior.get('sleep') || new Set()).has('sleeping'), 'a sleeping resident reads as sleeping');
});

test('far-away residents drop to the cheap update, and the cost does not grow with the size of the world', () => {
  for (const id of ['forest', 'desert', 'city']) {
    const sim = M.createSimulation({ regionId: id, discovered: [], env: E() });
    const w = sim.world;
    sim.setPlayer(w.entry.x, w.entry.z);
    let detailMax = 0, sawDistant = 0, moved = 0;
    const before = new Map(w.residents.map((a) => [a.key, { x: a.x, z: a.z }]));
    for (let i = 0; i < 60 * 120; i++) {
      sim.step(1 / 60, { x: 0, y: 0 });
      if (i % 60) continue;
      let d = 0;
      for (const a of w.residents) { if (a.tier === 0) d++; if (a.tier === 2) sawDistant++; }
      detailMax = Math.max(detailMax, d);
    }
    for (const a of w.residents) { const p = before.get(a.key); if (p && Math.hypot(a.x - p.x, a.z - p.z) > 60) moved++; }
    assert.ok(detailMax <= M.LIFE.maxDetail, `${id}: at most ${M.LIFE.maxDetail} residents get the detailed update (saw ${detailMax})`);
    assert.ok(moved > 0, `${id}: the world keeps going where you are not looking`);
  }
  // とおい 住民の ぶんだけ 世界が すすむ(そのばに かたまった まま に ならない)
  const sim = M.createSimulation({ regionId: 'desert', discovered: [], env: E() });
  const far = sim.world.residents.filter((a) => free(a));
  assert.ok(far.length > 0);
  const spots0 = far.map((a) => a.spot && a.spot.id);
  for (let i = 0; i < 60 * 300; i++) sim.step(1 / 60, { x: 0, y: 0 });
  const changed = far.filter((a, i) => (a.spot && a.spot.id) !== spots0[i]).length;
  assert.ok(changed > 0, 'come back later and somebody has moved on');
});

test('nobody is duplicated, the ones walking with you stay out of the resident life, and Naoto keeps the special place', () => {
  for (const id of REGIONS) {
    const sim = M.createSimulation({ regionId: id, discovered: [], env: E() });
    const w = sim.world;
    const partyKeys = new Set(sim.party.map((a) => a.key));
    const naoto = w.residents.filter((a) => a.fixed).map((a) => ({ a, x: a.x, z: a.z }));
    for (let i = 0; i < 60 * 90; i++) sim.step(1 / 60, { x: 0, y: 0 });
    const keys = new Set();
    for (const a of w.residents) {
      assert.ok(!keys.has(a.key), `${id}: ${a.key} appears twice in the world`);
      keys.add(a.key);
      assert.ok(!partyKeys.has(a.key), `${id}: ${a.key} both walks with you and lives here`);
    }
    for (const n of naoto) {
      assert.equal(n.a.behavior, 'watch', `${id}: Naoto keeps the special behaviour`);
      assert.ok(Math.hypot(n.a.x - n.x, n.a.z - n.z) < 1, `${id}: Naoto does not wander off like an ordinary resident`);
    }
  }
});

test('the life AI leaks nothing to the map: living residents do not discover spots, districts or paths for you', () => {
  for (const id of REGIONS) {
    const sim = M.createSimulation({ regionId: id, discovered: [], env: E() });
    sim.setPlayer(sim.world.entry.x, sim.world.entry.z);
    for (let i = 0; i < 60 * 120; i++) sim.step(1 / 60, { x: 0, y: 0 });
    const md = sim.mapData();
    // プレイヤーが 立って いる いりぐち いがいは なにも 出ない
    assert.ok(md.spots.length <= 1, `${id}: standing still, only the spot you are on is on the map (${md.spots.length})`);
    assert.equal(md.paths.length, 0, `${id}: residents walking a path does not draw it on your map`);
    assert.ok(md.zones.filter((z) => z.visited).length <= 1, `${id}: residents do not visit districts on your behalf`);
    for (const sp of sim.world.spots) if (sp.secret) assert.ok(!md.spots.some((q) => q.id === sp.id), `${id}/${sp.id}: a secret place is not revealed by the resident living there`);
  }
});

test('you can still talk to a resident whatever they are doing, and they go back to their life afterwards', () => {
  const sim = M.createSimulation({ regionId: 'home', discovered: [], env: E() });
  const w = sim.world;
  const tried = new Set();
  let ok = 0;
  for (let round = 0; round < 25 && ok < 5; round++) {
    for (let i = 0; i < 60 * 12; i++) sim.step(1 / 60, { x: 0, y: 0 });
    const a = w.residents.find((q) => free(q) && !tried.has(q.behavior));
    if (!a) continue;
    tried.add(a.behavior);
    sim.setPlayer(a.x, a.z - 30);
    for (let i = 0; i < 6; i++) sim.step(1 / 60, { x: 0, y: 0 });
    if (sim.nearest !== a) continue;
    const res = sim.talk();
    assert.ok(res && res.line && res.line.length > 0, 'a line comes back');
    assert.equal(a.partner, null, 'talking to them ends whatever they were doing with someone else');
    ok++;
    assert.equal(a.behavior, 'idle', 'they stop to answer you');
    for (let i = 0; i < 60 * 12; i++) sim.step(1 / 60, { x: 0, y: 0 });
    // そのあとは ふつうの せいかつへ もどる(はなしかけた ことで とまった ままに ならない)
    assert.equal(a.say, null, 'the bubble goes away');
    assert.ok(KNOWN.has(a.behavior), `and afterwards they get on with their life (${a.behavior})`);
  }
  assert.ok(ok >= 3, `residents can be spoken to while doing different things (${ok} of them, behaviours ${[...tried].join('/')})`);
});

test('the renderer can read what a resident is doing and feeling through one stable door', () => {
  const sim = M.createSimulation({ regionId: 'sea', discovered: [], env: E() });
  for (let i = 0; i < 60 * 60; i++) sim.step(1 / 60, { x: 0, y: 0 });
  const v = sim.view();
  assert.equal(typeof v.lifeOf, 'function', 'view() hands the renderer a reader');
  assert.equal(v.lifeDebug, false, 'the debug labels are off in ordinary play');
  for (const a of sim.world.residents) {
    const L = v.lifeOf(a);
    assert.equal(L.key, a.key);
    assert.ok(typeof L.behavior === 'string' && L.behavior.length > 0);
    assert.ok(M.RESIDENT_EMOTIONS.includes(L.emotion));
    assert.ok(L.tier === 0 || L.tier === 1 || L.tier === 2);
    assert.ok(L.energy >= 0 && L.energy <= 1);
  }
  sim.lifeDebug = true;
  assert.equal(sim.view().lifeDebug, true, 'and it can be switched on for an audit');
  sim.lifeDebug = false;
});

test('running a whole day through, nobody freezes, nobody is held in an interaction for ever and nobody vanishes', () => {
  for (const id of ['city', 'forest', 'sea', 'memory_lake']) {
    const sim = M.createSimulation({ regionId: id, discovered: [], env: E('morning') });
    const w = sim.world, n0 = w.residents.length;
    const same = new Map(), last = new Map();
    let heldTalk = 0;
    const talkSince = new Map();
    for (const [time, secs, weather] of [['morning', 120, 'sunny'], ['day', 150, 'sunny'], ['evening', 120, 'rain'], ['night', 150, 'sunny']]) {
      sim.setEnv(E(time, weather, 'autumn'));
      for (let i = 0; i < 60 * secs; i++) {
        sim.step(1 / 60, { x: 0, y: 0 });
        if (i % 120) continue;
        for (const a of w.residents) {
          if (!free(a)) continue;
          if (last.get(a.key) === a.behavior) same.set(a.key, (same.get(a.key) || 0) + 1); else same.set(a.key, 0);
          last.set(a.key, a.behavior);
          if (a.behavior === 'talk') { talkSince.set(a.key, (talkSince.get(a.key) || 0) + 1); heldTalk = Math.max(heldTalk, talkSince.get(a.key)); } else talkSince.set(a.key, 0);
        }
      }
    }
    assert.equal(w.residents.length, n0, `${id}: nobody disappears over a whole day`);
    for (const [key, n] of same) assert.ok(n < 100, `${id}: ${key} is not stuck in one behaviour (${n * 2}s)`);
    assert.ok(heldTalk < 20, `${id}: no conversation goes on for ever (${heldTalk * 2}s)`);
  }
});
