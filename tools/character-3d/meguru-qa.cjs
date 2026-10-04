#!/usr/bin/env node
// Character 3D Pilot — 実際の めぐる(forest 3D)で しらべる QA(しゃしん + 計測 + 片づけ / fallback の 確認)。
//   NODE_PATH=$(npm root -g) node tools/character-3d/meguru-qa.cjs --out docs/qa/character-3d-pilot-2026-10-01/meguru [--seconds 8] [--throttle 1]
// セーブは tests の harness で つくり、ブラウザの localStorage(この QA の origin だけ)へ。ゲームの 正本 セーブは さわらない。
// headless の WebGL は SwiftShader(ソフトウェア)。draw call・三角形・JS の 時間は くらべられるが、GPU の 時間は iPhone と ちがう
const fs = require('fs'), path = require('path');
const pw = require('playwright');
const { serve } = require('./shot.cjs');
const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const OUT = opt('--out', path.join(require('os').tmpdir(), 'c3d-meguru'));
const SECONDS = Number(opt('--seconds', 8));
const THROTTLE = Number(opt('--throttle', 1));
const PERF_ONLY = args.includes('--perf-only'), SPECIES_ONLY = args.includes('--species-only'), NO_PERF = args.includes('--no-perf') || SPECIES_ONLY;
fs.mkdirSync(OUT, { recursive: true });

function makeSave({ line = 'dog', stageIndex = 3, party = [], residents = true } = {}) {
  const { harness } = require(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));
  const h = harness({ deterministic: true, fullDisplay: true }); const s = h.api.state();
  Object.assign(s, { stage: 'growing', speciesLine: line, isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 85, happiness: 90, regionId: 'forest' });
  const life = require(path.join(ROOT,'life-stage-profiles.js'));
  s.ageTicks = (life.minsForLine(line)[stageIndex] + .5) * 20; s.stageIndex = stageIndex;
  const all = Array.from(h.api.normalCompanions).concat(Array.from(h.api.rareCompanions));
  const pick = party.map((id) => all.find((c) => c.id === id)).filter(Boolean);
  s.companions = pick.map((c) => ({ id: c.id, bond: 100 })); s.lifetime.companionsRecruited = pick.map((c) => c.id);
  // forest に すむ pilot の 住人(キノコ 全段・ちょう の 偶数段)
  if (residents) s.discoveredStages = Array.from(new Set([...(s.discoveredStages || []), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => 'mushroom:' + i), 'butterfly:1', 'butterfly:3', 'butterfly:7']));
  return { save: JSON.stringify(s), stage: life.stageForAge(Math.floor(s.ageTicks/20),line) };
}

async function open(browser, base, save, q = '?meguru3d=1&char3d=1&perf=1') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error' || /character 3D/.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
  await page.addInitScript((s) => {
    localStorage.setItem('naotocchi-save-v1',s);
    window.__c3dBoot={frames:[],longTasks:[]};let last=performance.now();
    function frame(t){if(t<30000){window.__c3dBoot.frames.push(t-last);last=t;requestAnimationFrame(frame);}}requestAnimationFrame(frame);
    if(typeof PerformanceObserver!=='undefined')try{new PerformanceObserver(list=>{for(const e of list.getEntries())window.__c3dBoot.longTasks.push(e.duration);}).observe({entryTypes:['longtask']});}catch(_){}
  },save);
  if (THROTTLE > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE }); }
  await page.goto(base + '/index.html' + q);
  await page.locator('.device.ui-home-active').waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.locator('#travelBtn').click();
  await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' });
  await page.locator('#meguruEnterBtn').click();
  await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
  await page.waitForFunction(() => { const r = globalThis.__meguruRun; return r && r.world && (r.renderer.is3D || r.renderer.failed); }, null, { timeout: 60000 });
  // character module の よみこみ と template を 組む ひま(1 frame に 1 つ)
  await page.waitForTimeout(2500);
  const load=await page.evaluate(()=>{const b=window.__c3dBoot,n=performance.getEntriesByType('navigation')[0];return {domContentLoadedMs:n?.domContentLoadedEventEnd,maxFrameMs:Math.max(0,...b.frames.slice(1)),maxLongTaskMs:Math.max(0,...b.longTasks),longTasks:b.longTasks.length};});
  return {ctx,page,errors,load};
}
async function pose(page, p) {
  return page.evaluate((p) => {
    const r = globalThis.__meguruRun, sim = r.sim;
    if (p.env && !sim.__envFixed) { const orig = sim.setEnv.bind(sim); sim.setEnv = (e) => orig(Object.assign({}, e, sim.__env || {})); sim.__envFixed = true; }
    if (p.env) { sim.__env = p.env; sim.setEnv(sim.env || {}); }
    sim.setCameraMotion(false);
    let x = p.x, z = p.z;
    if (p.spot) { const s = r.world.spots.find((q) => q.id === p.spot); x = s.x + (p.dx || 0); z = s.z - 100 + (p.dz || 0); }
    if (p.near) { const a = r.world.residents.find((q) => q.kind === 'form' && q.line === p.near.line && q.stage === p.near.stage); if (a) { x = a.x + (p.dx || 0); z = a.z - 260 + (p.dz || 0); } }
    sim.setPlayer(x, z); sim.camera.yaw = p.yaw || 0; sim.player.heading = p.heading != null ? p.heading : (p.yaw || 0);
    sim.placeParty();
    if (p.faceCam) for (const a of r.party) a.heading = Math.PI;   // QA の しゃしんだけ: なかまも こちらを むく
    return { x: Math.round(sim.player.x), z: Math.round(sim.player.z) };
  }, p);
}
async function snap(page, name) {
  await page.waitForTimeout(900);
  const box = await page.locator('#mgrCanvas').boundingBox();
  const file = path.join(OUT, name + '.png');
  await page.screenshot({ path: file, clip: box });
  return path.relative(ROOT, file);
}
const c3d = (page) => page.evaluate(() => { const r = globalThis.__meguruRun.renderer; const p = r.char3dPresenter; const st = r.stats3d(); return { is3D: r.is3D, failed: r.failed, char3d: r.char3d, live: p ? p.stats() : null, calls: st && st.calls, tris: st && st.triangles }; });

async function walk(page, seconds) {
  await page.evaluate(() => { window.__frames = []; let last = performance.now(); window.__stopFrames = false; const loop = (t) => { window.__frames.push(t - last); last = t; if (!window.__stopFrames) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  const box = await page.locator('#meguruOverlay .mg-pad').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const route = [[0, -1], [0.7, -0.7], [0, -1], [-0.7, -0.7], [-1, 0], [0, 1]];
  const end = Date.now() + seconds * 1000;
  for (let i = 0; Date.now() < end; i++) { const [dx, dy] = route[i % route.length]; await page.mouse.up().catch(() => {}); await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx + dx * 40, cy + dy * 40, { steps: 3 }); await page.waitForTimeout(1200); }
  await page.mouse.up();
  return page.evaluate(() => {
    window.__stopFrames = true;
    const f = window.__frames.slice(10).sort((a, b) => a - b), pick = (q) => f[Math.min(f.length - 1, Math.floor(f.length * q))];
    const r = globalThis.__meguruRun.renderer, st = r.stats3d();
    return { frames: f.length, avgMs: +(f.reduce((s, v) => s + v, 0) / f.length).toFixed(2), p95Ms: +pick(0.95).toFixed(1), over60: f.filter((v) => v > 60).length,
      calls: st && st.calls, tris: st && st.triangles, textures: st && st.textures, geometries: st && st.geometries, jsDrawMs: st && +st.drawMsAvg.toFixed(2), jsDrawP95: st && +st.drawMsP95.toFixed(2), char3d: st && st.char3d,
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null, party: globalThis.__meguruRun.party.length };
  });
}

(async () => {
  const srv = await serve({second:args.includes('--second'),claude:args.includes('--claude'),previous:args.includes('--previous')}); const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const R = { when: new Date().toISOString(), revision: args.includes('--second') ? 'quality2-31fe18f' : args.includes('--claude') ? 'claude-e12f720' : args.includes('--previous') ? 'quality1-8b19ecc' : 'quality3', headless: 'chromium + SwiftShader(ソフトウェア GPU)', throttle: THROTTLE, shots: {}, checks: {}, perf: {} };
  const env = { time: 'day', weather: 'sunny', season: 'summer' };
  let prev = null;
  if (PERF_ONLY || SPECIES_ONLY) { try { prev = JSON.parse(fs.readFileSync(path.join(OUT, 'meguru-qa.json'), 'utf8')); Object.assign(R, { shots: prev.shots, checks: prev.checks, perSpecies: prev.perSpecies, errors: prev.errors }); } catch (_) { /* ない */ } }
  try {
    if (!PERF_ONLY && !SPECIES_ONLY) {
    // ---------- A. ならぶ しゃしん(player = いぬ 04 + なかま 4: しば・ねこ(3D) + たぬき・ペンギン(2D))
    const party = ['shiba', 'cat_friend', 'tanuki', 'penguin_friend'];
    const { save } = makeSave({ line: 'dog', stageIndex: 3, party });
    const { page, errors } = await open(browser, base, save);
    await pose(page, { spot: 'entry', yaw: 0, env });
    R.shots.forest3d = await snap(page, 'forest-entry-3d');
    R.checks.forest3d = await c3d(page);
    await page.evaluate(() => globalThis.__meguruRun.renderer.setChar3D(false));
    R.shots.forest2d = await snap(page, 'forest-entry-2d');
    R.checks.after3dOff = await c3d(page);
    await page.evaluate(() => globalThis.__meguruRun.renderer.setChar3D(true));
    await page.waitForTimeout(1500);
    R.checks.after3dOn = await c3d(page);
    // 横から(4 足の あるき・なかまの ならび)
    await pose(page, { spot: 'entry', yaw: 1.2, heading: 0.0, env });
    R.shots.forestSide3d = await snap(page, 'forest-side-3d');
    // 表情(通常の カメラ距離)
    for (const e of ['normal', 'positive', 'dislike', 'tired', 'sick']) {
      await page.evaluate((e) => globalThis.__meguruRun.renderer.setChar3DForce(e), e);
      await pose(page, { spot: 'entry', yaw: 0, heading: Math.PI, faceCam: true, env });   // こちらを むく(カメラは うしろの まま)
      R.shots['emotion-' + e] = await snap(page, 'gameplay-emotion-' + e);
    }
    await page.evaluate(() => globalThis.__meguruRun.renderer.setChar3DForce(null));
    // 森の 住人(キノコ・ちょう)の そば
    await pose(page, { near: { line: 'mushroom', stage: 7 }, yaw: 0, env });
    R.shots.residentMushroom = await snap(page, 'forest-resident-mushroom-3d');
    await pose(page, { near: { line: 'butterfly', stage: 7 }, yaw: 0, env });
    R.shots.residentButterfly = await snap(page, 'forest-resident-butterfly-3d');
    // よる・雨(おなじ forest の ちがう ひかり / きり)
    await pose(page, { spot: 'entry', yaw: 0.3, env: { time: 'night', weather: 'rain', season: 'autumn' } });
    R.shots.forestNightRain = await snap(page, 'forest-night-rain-3d');
    // 木の うしろ(すかし と player の 見え方)
    await pose(page, { spot: 'fork', yaw: 0.4, env });
    R.shots.occlusion = await snap(page, 'forest-occlusion-3d');
    // ---------- player の 見え方: 120 frame ずっと えがかれて いるか
    R.checks.playerVisible = await page.evaluate(async () => {
      const r = globalThis.__meguruRun, rd = r.renderer, p = rd.char3dPresenter, pl = r.sim.player;
      let ok = 0, n = 0;
      for (let i = 0; i < 120; i++) { await new Promise((res) => requestAnimationFrame(res)); n++; const inst = p && p.instanceOf(pl); if (inst && inst.holder.visible && inst.holder.parent && inst.root.children.length) ok++; }
      return { frames: n, drawn3d: ok };
    });
    // ---------- actor 単位 fallback: しば だけ 3D を こわす → しば だけ 2D、ほかは 3D・world も 3D の まま
    await pose(page, { spot: 'entry', yaw: 0, env });
    await page.evaluate(() => globalThis.__meguruRun.renderer.char3dHooks({ failUpdate: (a) => a.id === 'shiba' }));
    await page.waitForTimeout(1200);
    R.checks.fallback = await page.evaluate(() => {
      const r = globalThis.__meguruRun, rd = r.renderer, p = rd.char3dPresenter;
      const shiba = r.party.find((a) => a.id === 'shiba'), cat = r.party.find((a) => a.id === 'cat_friend');
      return { worldIs3D: rd.is3D, rendererFailed: rd.failed, shibaBroken: p.isBroken(shiba), shiba3d: p.has(shiba), cat3d: p.has(cat), player3d: p.has(r.sim.player), stats: p.stats() };
    });
    R.shots.fallback = await snap(page, 'forest-fallback-shiba-2d');
    await page.evaluate(() => globalThis.__meguruRun.renderer.char3dHooks({}));
    // ---------- 地域の きりかえ: city(main では 2D の world)→ forest。3D の キャラを のこさない
    R.checks.regionSwitch = await page.evaluate(async () => {
      const r = globalThis.__meguruRun, rd = r.renderer, p = rd.char3dPresenter, raf = () => new Promise((res) => requestAnimationFrame(res));
      const before = p.stats().live;
      const sceneCount = () => { const sc = p.scene; let n = 0; if (sc) sc.traverse((o) => { if (o.name && o.name.startsWith('c3d-actor:')) n++; }); return n; };
      const until = async (fn, max = 240) => { for (let i = 0; i < max && !fn(); i++) await raf(); };
      globalThis.__meguruBridge.getState().regionId = 'city'; r.enterWorld('city'); await until(() => r.world.regionId === 'city' && !rd.is3D);
      for (let i = 0; i < 10; i++) await raf();
      const inCity = { region: r.world.regionId, is3D: rd.is3D, live: p.stats().live };
      globalThis.__meguruBridge.getState().regionId = 'forest'; r.enterWorld('forest'); await until(() => r.world.regionId === 'forest' && rd.is3D);
      for (let i = 0; i < 90; i++) await raf();
      return { before, inCity, backInForest: { region: r.world.regionId, is3D: rd.is3D, live: p.stats().live, holdersInScene: sceneCount() } };
    });
    R.errors = errors;
    await page.context().close();

    }
    if (!PERF_ONLY) {
    // ---------- pilot ごと: その species を player に して forest で(こちらを むく / うしろ)
    const SPEC = require(path.join(ROOT, 'character-3d/spec.js'));
    R.perSpecies = {};
    for (const id of Object.keys(SPEC.PILOT)) {
      for (const st of SPEC.STAGE_KEYS[id]) {
      if(args.includes('--focus') && !['dandelion:8','butterfly:8'].includes(id+':'+st))continue;
      const { save: sv, stage } = makeSave({ line: id, stageIndex: st - 1, party: args.includes('--solo')?[]:['shiba', 'cat_friend'], residents: !args.includes('--solo') });
      const { page: pg, errors: er } = await open(browser, base, sv);
      await pose(pg, { spot: 'entry', yaw: 0, heading: Math.PI - 0.5, faceCam: true, env });
      const front = await snap(pg, 'player-' + id + '-' + st + '-front');
      await pose(pg, { spot: 'entry', yaw: 0, env });
      const back = await snap(pg, 'player-' + id + '-' + st + '-back');
      const playerKey = await pg.evaluate(() => globalThis.__meguruBridge.currentPetKey());
      const p3d = await pg.evaluate(() => { const r = globalThis.__meguruRun, p = r.renderer.char3dPresenter; return !!(p && p.has(r.sim.player)); });
      R.perSpecies[id+':'+st] = { requestedStage:st, harnessStageIndex: stage, playerKey, player3d: p3d, specKey: SPEC.specKeyFor({ line: playerKey.split(':')[0], stage: Number(playerKey.split(':')[1]) }), front, back, live: (await c3d(pg)).live, errors: er };
      await pg.context().close();
    }
    }
    }
    // ---------- perf: 1 / 5 / 27 体(3D)。pilot に ない なかまは 代役(pilot の model)で 3D に して はかる。2D baseline も おなじ 条件
    const all = ['shiba', 'cat_friend', 'tanuki', 'penguin_friend', 'rabbit_friend', 'squirrel', 'owl', 'otter', 'hamster', 'panda', 'monkey', 'parrot', 'sheep', 'seal', 'bat', 'chicken', 'hedgehog', 'snail', 'punyu', 'sekizou', 'chameleon', 'clock', 'unicorn', 'many_tail_fox', 'watcher', 'box'];
    if (NO_PERF) { try { R.perf = JSON.parse(fs.readFileSync(path.join(OUT, 'meguru-qa.json'), 'utf8')).perf; } catch (_) { /* ない */ } }
    for (const n of (NO_PERF ? [] : args.includes('--puff-stress') ? [27] : [1, 5, 27])) {
      const { save: sv } = makeSave({ line: args.includes('--puff-stress')?'dandelion':'dog', stageIndex: args.includes('--puff-stress')?7:3, party: all.slice(0, n - 1), residents: false });
      for (const mode of (args.includes('--puff-stress') ? ['3d'] : ['2d', '3d'])) {
        const { page: pg, errors: er, load } = await open(browser, base, sv, '?meguru3d=1&perf=1' + (mode === '3d' ? '&char3d=1' : ''));
        if (mode === '3d') await pg.evaluate((puffs) => { const ids = puffs ? ['dandelion:8'] : ['dog:4', 'penguin:8', 'clownfish:4', 'man:4', 'butterfly:8', 'dandelion:6', 'mushroom:8', 'starfish:4']; let i = 0; const memo = new WeakMap(); globalThis.__meguruRun.renderer.char3dHooks({ standIn: (a) => { if (!a.follow) return null; if (!memo.has(a)) { const [id, s] = ids[i++ % ids.length].split(':'); memo.set(a, { id, stage: Number(s), exact: false }); } return memo.get(a); } }); }, args.includes('--puff-stress'));
        await pg.waitForTimeout(mode === '3d' ? 9000 : 1500);   // template を 1 frame 1 つ ずつ
        await pose(pg, { spot: 'entry', yaw: 0, env });
        if (n === 27) R.shots['perf27-' + mode] = await snap(pg, 'perf-27-' + mode);
        R.perf[n + '-' + mode] = await walk(pg, SECONDS);
        R.perf[n + '-' + mode].templatesByActor = await pg.evaluate(()=>{const r=globalThis.__meguruRun,p=r.renderer.char3dPresenter,out={};if(p)for(const a of [r.sim.player,...r.party]){const t=p.instanceOf(a)?.tpl;if(t){const k=t.id+':'+t.stage;out[k]=(out[k]||0)+1;}}return out;});
        R.perf[n + '-' + mode].errors = er.length; R.perf[n + '-' + mode].load = load;
        await pg.context().close();
      }
    }
  } finally { await browser.close(); srv.close(); }
  // ---- ブラウザでの 合否(この tool は browser test を かねる)
  const C = R.checks, fails = [];
  const must = (ok, msg) => { if (!ok) fails.push(msg); };
  if (!PERF_ONLY && !SPECIES_ONLY) {
  must(C.forest3d.is3D && !C.forest3d.failed && C.forest3d.live.live >= 3, 'forest: world 3D + キャラ 3D(player + しば + ねこ 以上)');
  must(C.after3dOff.live.live === 0 && C.after3dOff.is3D, '3D → 2D: キャラの 3D が のこらない・world は 3D の まま');
  must(C.after3dOn.live.live === C.forest3d.live.live, '2D → 3D: おなじ 数に もどる');
  must(C.playerVisible.drawn3d === C.playerVisible.frames, 'player は 120 frame ずっと 3D で えがかれる');
  must(C.fallback.worldIs3D && !C.fallback.rendererFailed && C.fallback.shibaBroken && !C.fallback.shiba3d && C.fallback.cat3d && C.fallback.player3d, 'actor 単位 fallback(しば だけ 2D)');
  must(C.regionSwitch.inCity.live === 0 && !C.regionSwitch.inCity.is3D, 'city(main では 2D の world): 3D キャラを のこさない');
  must(C.regionSwitch.backInForest.is3D && C.regionSwitch.backInForest.live > 0 && C.regionSwitch.backInForest.holdersInScene === C.regionSwitch.backInForest.live, 'forest に もどる: scene の 3D = live(ghost なし)');
  }
  for (const [id, v] of Object.entries(R.perSpecies || {})) must(v.player3d && v.specKey && v.specKey.exact && v.specKey.stage === v.requestedStage && !v.errors.some((e) => /pageerror|Error/.test(e)), 'player ' + id + ': spec が ある 段なら 3D・ない 段(未 pilot archetype)なら 2D');
  must(!(R.errors || []).some((e) => !/forced update failure \(QA\)/.test(e)), 'page の error なし: ' + (R.errors || []).join(' / '));
  if(args.includes('--puff-stress'))must(R.perf['27-3d']?.templatesByActor['dandelion:8']===25,'stress has 25 puffs plus two native companions');
  if(!NO_PERF) for(const n of (args.includes('--puff-stress')?[27]:[1,5,27])) { const p=R.perf[n+'-3d']; must(p && p.char3d && p.char3d.live===n && p.errors===0, 'exact 3D actor count '+n); }
  R.verdict = fails.length ? { pass: false, fails } : { pass: true };
  fs.writeFileSync(path.join(OUT, 'meguru-qa.json'), JSON.stringify(R, null, 2));
  console.log('VERDICT', JSON.stringify(R.verdict));
  if (fails.length) process.exitCode = 1;
  console.log(JSON.stringify({ checks: R.checks, perf: R.perf, errors: R.errors }, null, 1));
})();
