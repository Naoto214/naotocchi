// なおとっち — ミニゲーム本体(100本)。
// script.js(本体)から installNaotocchiMinigames(S) で よびだされる。
// S には 本体の 共通ヘルパー(lerp/clamp/createMgCanvas/ageDifficulty など)が
// はいっていて、ここでは それを つかって ゲームを つくり、MINIGAMES などの
// とうろくデータを かえす。本体の state には さわらない(むずかしさ・きせつは
// ageDifficulty()/minigameEase()/SEASON を とおして うけとる)。
// index.html では script.js より さきに よみこむこと。
(() => {
  'use strict';
  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  root.installNaotocchiMinigames = function installNaotocchiMinigames(S) {
  const sfx = typeof S.sfx === 'function' ? S.sfx : () => {};
  const perfLow = typeof S.perfLow === 'function' ? S.perfLow : () => false;
  const foodIconHTML = typeof S.foodIconHTML === 'function' ? S.foodIconHTML : (_key, emoji) => emoji;
  const { MG_ACTION_START_GRACE_MS, SEASON, ageDifficulty, bindHeldButton, clamp, createMgCanvas, currentSprite, generateMaze, lerp, mazeBfs, mgDuration, mgPointerPos, minigameEase } = S;
  // いくつかの ミニゲームの「しゅるい(category)」は、そうさ・かちはい判定が
  // まったく おなじで テーマ(絵文字・タイトル)だけが ちがう バリエーションが
  // たくさん あった(例:キャッチゲームの「おやつ/くだもの/やさい/おかし」)。
  // これらは べつべつの エントリとして 水増しする かわりに、この ヘルパーで
  // 1つの ゲームに まとめ、あそぶ たびに テーマを ランダムに えらびなおす
  // ことで、見た目の バリエーションは のこしつつ プールの けんすうを
  // へらしている(「あそんだ かんじょく」が おなじ ゲームを 何度も べつの
  // ゲームとして かぞえない ため)
  function randomThemeGame(factory, themes) {
    return {
      start(container, onComplete) {
        const theme = themes[Math.floor(Math.random() * themes.length)];
        return factory(theme).start(container, onComplete);
      },
    };
  }

  // MINIGAME_CATEGORY_GROUPS の 各バリエーションに、配列内の 位置に
  // まったく 依存しない 固定の 文字列id を くっつける ための ヘルパー。
  // ゲームオブジェクトを つくった その場で id を タグづけしておくので、
  // あとから 配列を ならべかえたり、とちゅうに べつの ゲームを 挿入・削除
  // しても、この id は かわらない(state.lifetime.minigamePlayCounts の
  // キーとして つかう。下の minigamePlayCount/recordMinigamePlay 参照)。
  // REGION_MINIGAMES/SEASONAL_MINIGAMES の ゲームには わざと id を つけず、
  // これまでどおり あそんだ かいすうの きろく対象がいの まま にしてある
  function mg(id, game) {
    game.id = id;
    return game;
  }

  // --- ロードげーむ(3れーんを よけよう・キャッチしよう) ---

  // レーンごとの ざひょうを「ちへいせんで せまく・てまえで ひろく」
  // ほかんし、とどくまでの しんちょくに 2じょうの イージングを かけることで、
  // せまい がめんの なかでも「おくから せまってくる」たちたいてきな
  // おくゆき感を だす、みちを はしる/よける タイプの ミニゲーム
  // --- レーンラッシュ(canvas ぎじ3D): 3レーンの みちを はしり、よい ものを
  //     とって わるい ものを よける。どうろ/そら/うみ/うちゅう/ハイウェイの
  //     テーマで 見た目が かわる。ロードげーむ と 3Dふうフライトの きょうつう本体 ---
  const LANE_RUSH_SCENES = {
    road: { sky: ['#69b7ff', '#d9f1ff'], ground: ['#4f9f4a', '#5aae52'], road: ['#5c5c66', '#63636d'], rumble: ['#f3f3f3', '#d8383c'], scenery: ['🌳', '🏠', '🌲', '🪧'] },
    city: { sky: ['#7fb3ff', '#e4f0ff'], ground: ['#8d9aa8', '#98a5b3'], road: ['#4a4d57', '#51545e'], rumble: ['#eeeeee', '#e0a020'], scenery: ['🏢', '🏬', '🏪', '🚏'] },
    jungle: { sky: ['#5fb98a', '#d7f5e3'], ground: ['#2f7a3a', '#357f40'], road: ['#7a5a35', '#82613b'], rumble: ['#c9a96e', '#8a5a2b'], scenery: ['🌴', '🌿', '🌺', '🌳'] },
    desert: { sky: ['#ffb366', '#ffe6b3'], ground: ['#d9b36a', '#e2bf78'], road: ['#b08a55', '#b8925c'], rumble: ['#f2e2c4', '#c0392b'], scenery: ['🌵', '🪨', '🏜️', '🐪'] },
    sky: { sky: ['#3b7dd8', '#bfe0ff'], ground: ['#a9d3ff', '#b6dbff'], road: ['#dbeeff', '#e6f3ff'], rumble: ['#ffffff', '#9fc9ff'], scenery: ['☁️', '🎈', '🪁', '☁️'] },
    sea: { sky: ['#4fb3ff', '#d2efff'], ground: ['#1f6fb5', '#2378bf'], road: ['#2a8fd6', '#3197dc'], rumble: ['#bfe9ff', '#1b5f9a'], scenery: ['🪸', '🐚', '🌊', '⛵'] },
    space: { sky: ['#03061a', '#1b1f4a'], ground: ['#0b0f2a', '#0e1230'], road: ['#1c2350', '#212858'], rumble: ['#6f7cff', '#c46fff'], scenery: ['🪐', '🌟', '🛰️', '✨'] },
    highway: { sky: ['#5aa9ff', '#dff1ff'], ground: ['#5fa85a', '#68b062'], road: ['#4a4a55', '#52525d'], rumble: ['#f3f3f3', '#d8383c'], scenery: ['🌳', '🛣️', '🏢', '🌲'] },
  };
  function makeRoadGame({ title, goodItems, badItems, scene = 'road', playerEmoji, duration }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(duration || Math.round(lerp(16000, 13000, difficulty)));
        const th = LANE_RUSH_SCENES[scene] || LANE_RUSH_SCENES.road;
        const BAD_CHANCE = lerp(0.4, 0.55, difficulty);
        const LANES = [-0.62, 0, 0.62];
        let lane = 1, playerX = 0, position = 0, speed = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, flash = 0, sparkle = 0;
        let good = 0, bad = 0, points = 0, combo = 0, bestCombo = 0, nextSpawnZ = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="lrTimer">残り: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="lrScore">とくてん: 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="lrCanvas"></canvas></div>
          <div class="mg-hint" id="lrHint">◀▶(おしっぱなしOK)かがめんの左/中/右をタップでレーン移動。よいものはとって、わるいものはよけよう</div>
          <div class="mg-race-controls"><button class="mg-tap-btn" id="lrLeft" data-hold="step" data-key="left">◀</button><button class="mg-tap-btn" id="lrRight" data-hold="step" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#lrCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const road = createPseudoRoad(ctx, W, H, { colors: (dark) => (dark ? { grass: th.ground[0], rumble: th.rumble[0], road: th.road[0], lane: scene === 'space' ? 'rgba(160,170,255,.25)' : '#fff8c8' } : { grass: th.ground[1], rumble: th.rumble[1], road: th.road[1] }) });
        const { SEG_LEN, PLAYER_Z, segments } = road;
        const MAX_SPEED = SEG_LEN * lerp(26, 34, difficulty);
        for (let i = 0; i < 14; i++) { const dir = Math.random() < 0.5 ? -1 : 1; road.addRoad(10, 10 + Math.floor(Math.random() * 10), 10, dir * (1 + Math.random() * 2.2), (Math.random() - 0.5) * 30); }
        const TRACK_LEN = road.trackLength();
        for (let n = 0; n < segments.length; n += 3) {
          if (Math.random() < 0.65) segments[n].sprites.push({ emoji: th.scenery[Math.floor(Math.random() * th.scenery.length)], offset: -1.5 - Math.random() * 1.6, size: 0.5 });
          if (Math.random() < 0.65) segments[n].sprites.push({ emoji: th.scenery[Math.floor(Math.random() * th.scenery.length)], offset: 1.5 + Math.random() * 1.6, size: 0.5 });
        }
        const items = [];
        const timerEl = container.querySelector('#lrTimer'), scoreEl = container.querySelector('#lrScore'), hint = container.querySelector('#lrHint');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const setLane = (n) => { lane = clamp(n, 0, 2); };
        container.querySelector('#lrLeft').addEventListener('pointerdown', (e) => { e.preventDefault(); setLane(lane - 1); });
        container.querySelector('#lrRight').addEventListener('pointerdown', (e) => { e.preventDefault(); setLane(lane + 1); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); setLane(p.nx < 1 / 3 ? 0 : p.nx > 2 / 3 ? 2 : 1); });
        const pet = playerEmoji || currentSprite();
        function spawn() {
          const isBad = Math.random() < BAD_CHANCE;
          const pool = isBad ? badItems : goodItems;
          const laneIdx = Math.floor(Math.random() * 3);
          const it = { z: position + PLAYER_Z + SEG_LEN * 42, lane: laneIdx, offset: LANES[laneIdx], bad: isBad, emoji: pool[Math.floor(Math.random() * pool.length)], size: 0.3, done: false };
          items.push(it);
        }
        function update(dt, now) {
          speed = Math.min(MAX_SPEED, speed + MAX_SPEED * dt / 1.2);
          position += speed * dt;
          if (position >= TRACK_LEN) { position -= TRACK_LEN; for (const it of items) it.z -= TRACK_LEN; nextSpawnZ -= TRACK_LEN; }
          playerX += (LANES[lane] - playerX) * Math.min(1, dt * 12);
          const gap = SEG_LEN * lerp(7, 4.5, difficulty);
          if (position + PLAYER_Z + SEG_LEN * 42 > nextSpawnZ) { spawn(); nextSpawnZ = position + PLAYER_Z + SEG_LEN * 42 + gap; }
          for (const seg of segments) seg.dynamic.length = 0;
          const pz = position + PLAYER_Z;
          for (const it of items) {
            if (it.z >= pz - SEG_LEN && it.z < pz + SEG_LEN * 60) road.findSegment(((it.z % TRACK_LEN) + TRACK_LEN) % TRACK_LEN).dynamic.push(it);
            if (!it.done && it.z <= pz + SEG_LEN * 0.4) {
              it.done = true;
              // あたり判定は「えらんだ レーン」ではなく、じっさいの いち(playerX)で。
              // レーン変更は 0.2〜0.3秒 かかる ので、ぎりぎりの きりかえは まにあわない
              if (Math.abs(playerX - it.offset) < Math.abs(LANES[1] - LANES[0]) * 0.45) {
                if (it.bad) { bad++; combo = 0; points = Math.max(0, points - 15); flash = 0.5; say('💥ぶつかった!'); }
                else { sfx('coin'); good++; combo++; bestCombo = Math.max(bestCombo, combo); points += 8 + Math.min(6, combo * 1.5); sparkle = 1; say(combo >= 3 ? '✨ ' + combo + 'れんぞく!' : 'ゲット!', 600); }
                scoreEl.textContent = 'とくてん: ' + Math.round(points);
              }
            }
          }
          for (let i = items.length - 1; i >= 0; i--) if (items[i].z < pz - SEG_LEN * 2) items.splice(i, 1);
        }
        function render(now) {
          if (!ctx) return;
          const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.6); skyG.addColorStop(0, th.sky[0]); skyG.addColorStop(1, th.sky[1]);
          ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, H);
          if (scene === 'space') { ctx.fillStyle = '#fff'; for (let i = 0; i < 46; i++) { const sx = ((i * 173 + 31) % 997 / 997 * W + position / 60) % W, sy = (i * 389 + 7) % 991 / 991 * H * 0.5; ctx.globalAlpha = 0.25 + (i % 5) * 0.15; ctx.fillRect(sx, sy, 1.5 + (i % 3) * 0.5, 1.5 + (i % 3) * 0.5); } ctx.globalAlpha = 1; }
          else { ctx.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 4; i++) { const cx = ((i * 97 + 20) - (position / 500)) % (W + 60); ctx.beginPath(); ctx.ellipse((cx + W + 60) % (W + 60) - 30, 20 + i * 11, 22, 7, 0, 0, Math.PI * 2); ctx.fill(); } }
          road.render(position, playerX);
          const bob = Math.sin(now / 90) * 1.5;
          ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(W / 2, H - 6, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 6; ctx.fillText(pet, W / 2, H - 8 + bob); ctx.shadowBlur = 0;
          if (sparkle > 0) { ctx.globalAlpha = sparkle; ctx.font = '22px sans-serif'; ctx.fillText('✨', W / 2 + 24, H - 40 - (1 - sparkle) * 20); ctx.globalAlpha = 1; sparkle = Math.max(0, sparkle - 0.05); }
          if (flash > 0) { ctx.fillStyle = `rgba(255,70,70,${flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - 0.04); }
          ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 3; i++) if (i === lane) { ctx.fillRect(W / 2 - 18 + (i - 1) * 0, H - 4, 36, 3); }
          if (now < startTime) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('READY…', W / 2, H / 2 - 30); ctx.shadowBlur = 0; }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 80, H / 2 - 44, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2 - 31); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = '残り: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(points * 0.5 + bestCombo * 2 - bad * 10), 0, 100);
          say(`けっか:ゲット${good}こ/ぶつかった${bad}かい`, 1800);
          render(performance.now());
          setTimeout(() => onComplete(score), 800);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }

  const ROAD_GAME_VARIANTS = [
    mg('road-themed', randomThemeGame(makeRoadGame, [
      { title: 'どうろをはしろう!たべものはキャッチ、ゴミはよけて', goodItems: ['🍎', '🍙', '🍬', '🍇'], badItems: ['🪨', '🚧', '🛢️', '⚠️'], scene: 'road' },
      { title: 'そらをとぼう!ほしはキャッチ、いんせきはよけて', goodItems: ['⭐', '🌟', '✨', '🍀'], badItems: ['☄️', '🪨', '⚡', '🛰️'], scene: 'sky' },
      { title: 'うみをおよごう!さかなはキャッチ、ゴミはよけて', goodItems: ['🐟', '🐠', '🦐', '🐚'], badItems: ['🥫', '🪤', '🕸️', '🦈'], scene: 'sea' },
    ])),
  ];

  // Only the three matching stack motifs use the existing scenery atlas.
  // Coordinates follow its JSON frame/clipBounds; tests compare the source crop
  // and destination box against that metadata. Keep the transparent frame and
  // clip out neighboring art without stretching the motif.
  const STACK_BLOCK_ART = {
    '🌾': { frame: [33.5, 923, 293], clip: [54, 927, 306, 1212] },
    '🌸': { frame: [43, 50, 267], clip: [47, 58, 306, 309] },
    '🍁': { frame: [639, 37, 295], clip: [657, 41, 916, 328] },
  };
  function drawStackBlockArt(ctx, emoji, size) {
    const art = STACK_BLOCK_ART[emoji], image = S.sceneryAtlas;
    if (!art || !image || !image.complete || image.naturalWidth !== 1254 || image.naturalHeight !== 1254) return false;
    const [fx, fy, side] = art.frame, [left, top, right, bottom] = art.clip;
    const scale = size / side, width = right - left, height = bottom - top;
    ctx.save();
    try {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, left, top, width, height,
        -size / 2 + (left - fx) * scale, 1 - size / 2 + (top - fy) * scale,
        width * scale, height * scale);
      return true;
    } catch (_) {
      return false;
    } finally {
      ctx.restore();
    }
  }

  // --- スタックタワー(canvas 作りなおし): ゆれる クレーンから ブロックを おとし、
  //     したの ブロックと かさねる。はみでた ぶぶんは きりおとされて ほそくなる。
  //     ぴったり(パーフェクト)なら はばが すこし もどる。カメラは たかさに あわせて うえへ ---
  function makeStackGame({ title, blockEmoji, palette }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(60000), BLOCK_H = 22;
        const colors = palette || ['#f6a5c0', '#a5d8f6', '#c8f6a5', '#f6e2a5', '#d3a5f6', '#a5f6d8', '#f6c8a5'];
        let running = true, rafId = null, last = null, blocks = [], swing = { x: 0, w: 0, dir: 1, speed: lerp(120, 170, difficulty) }, falling = null, camY = 0, perfects = 0, combo = 0, msg = '', msgUntil = 0, parts = [], scraps = [], over = false, bestH = 0, shake = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="stTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="stScore">だん0／✨ 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="stCanvas"></canvas></div>
          <div class="mg-hint" id="stHint">うえでゆれているブロックを、したのブロックとかさなるタイミングでタップしておとす。はみでたぶぶんはきりおとされてどんどんほそくなる。ぴったりかさねると✨パーフェクトではばがもどる!</div>
          <div class="mg-race-controls"><button class="mg-tap-btn primary" id="stDrop" data-key="action">おとす!</button></div>`;
        const canvas = container.querySelector('#stCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * 1.15));
        const BASE_W = W * 0.62, GROUND = H - 24;
        const timerEl = container.querySelector('#stTimer'), scoreEl = container.querySelector('#stScore'), hint = container.querySelector('#stHint');
        const say = (t, ms = 800) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `だん${blocks.length - 1}／✨ ${perfects}`; };
        blocks.push({ x: (W - BASE_W) / 2, w: BASE_W, y: GROUND - BLOCK_H, color: colors[0], wob: 0 });
        swing.w = BASE_W; swing.x = 0;
        const topY = () => blocks[blocks.length - 1].y;
        function drop() { if (!running || falling || over || performance.now() < startTime) return; falling = { x: swing.x, w: swing.w, y: topY() - BLOCK_H * 3.2 - camY * 0 - 60, vy: 0, color: colors[blocks.length % colors.length] }; falling.y = camTop() + 26; }
        const camTop = () => topY() - H * 0.62 + 40; // カメラの うえはし(ワールド座標)
        container.querySelector('#stDrop').addEventListener('pointerdown', (e) => { e.preventDefault(); drop(); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); drop(); });
        function land() {
          const top = blocks[blocks.length - 1]; const L = Math.max(falling.x, top.x), R = Math.min(falling.x + falling.w, top.x + top.w); const overlap = R - L;
          if (overlap <= 4) { over = true; shake = 12; scraps.push({ x: falling.x, w: falling.w, y: falling.y, vy: 60, vx: falling.x < top.x ? -60 : 60, rot: 0, color: falling.color }); falling = null; say('💥おちた…', 1500); setTimeout(() => { if (running) finish(); }, 1400); return; }
          const off = Math.abs((falling.x + falling.w / 2) - (top.x + top.w / 2));
          if (off < 5) { sfx('coin'); perfects++; combo++; const nw = Math.min(BASE_W, top.w + 6); blocks.push({ x: top.x + (top.w - nw) / 2, w: nw, y: top.y - BLOCK_H, color: falling.color, wob: 0, perfect: true }); say(combo > 1 ? `✨パーフェクト×${combo}!` : '✨パーフェクト!', 700); for (let i = 0; i < 10; i++) parts.push({ x: top.x + top.w / 2 + (Math.random() - 0.5) * nw, y: top.y - BLOCK_H, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, life: 0.6, color: '#fff' }); }
          else { sfx('pop'); combo = 0; if (falling.x < L) scraps.push({ x: falling.x, w: L - falling.x, y: top.y - BLOCK_H, vy: 20, vx: -40, rot: 0, color: falling.color }); if (falling.x + falling.w > R) scraps.push({ x: R, w: falling.x + falling.w - R, y: top.y - BLOCK_H, vy: 20, vx: 40, rot: 0, color: falling.color }); blocks.push({ x: L, w: overlap, y: top.y - BLOCK_H, color: falling.color, wob: 0 }); if (overlap < 22) say('ほそい…!', 600); }
          falling = null; hud(); swing.w = blocks[blocks.length - 1].w; swing.speed = lerp(120, 170, difficulty) + blocks.length * 4; bestH = Math.max(bestH, blocks.length - 1);
        }
        function update(dt, now) {
          const tw = topY(); camY += ((camTop()) - camY) * Math.min(1, dt * 5);
          if (!falling && !over) { swing.x += swing.dir * swing.speed * dt; if (swing.x + swing.w > W - 4) { swing.x = W - 4 - swing.w; swing.dir = -1; } if (swing.x < 4) { swing.x = 4; swing.dir = 1; } }
          if (falling) { falling.vy += 1400 * dt; falling.y += falling.vy * dt; if (falling.y + BLOCK_H >= tw) { falling.y = tw - BLOCK_H; land(); } }
          for (const s of scraps) { s.vy += 900 * dt; s.y += s.vy * dt; s.x += s.vx * dt; s.rot += s.vx * dt * 0.02; } scraps = scraps.filter((s) => s.y - camY < H + 60);
          for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; } parts = parts.filter((p) => p.life > 0);
          for (const b of blocks) b.wob *= 0.9; if (shake > 0) shake -= dt * 30;
        }
        function block(x, y, w, color, emoji, rot = 0) { ctx.save(); ctx.translate(x + w / 2, y - camY + BLOCK_H / 2); ctx.rotate(rot); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-w / 2 + 3, -BLOCK_H / 2 + 4, w, BLOCK_H); const g = ctx.createLinearGradient(0, -BLOCK_H / 2, 0, BLOCK_H / 2); g.addColorStop(0, color); g.addColorStop(1, mgShade(color, 0.72)); ctx.fillStyle = g; mgRoundRect(ctx, -w / 2, -BLOCK_H / 2, w, BLOCK_H, 4); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-w / 2 + 3, -BLOCK_H / 2 + 2, w - 6, 3); if (emoji && w > 18) { ctx.font = `${Math.round(BLOCK_H * 0.7)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; if (!drawStackBlockArt(ctx, emoji, Math.round(BLOCK_H * 0.7))) ctx.fillText(emoji, 0, 1); } ctx.restore(); }
        function render(now) {
          if (!ctx) return;
          ctx.save(); if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
          const k = clamp(blocks.length / 40, 0, 1); const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, `rgb(${Math.round(lerp(120, 30, k))},${Math.round(lerp(180, 40, k))},${Math.round(lerp(255, 110, k))})`); bg.addColorStop(1, `rgb(${Math.round(lerp(220, 90, k))},${Math.round(lerp(235, 120, k))},${Math.round(lerp(255, 200, k))})`); ctx.fillStyle = bg; ctx.fillRect(-10, -10, W + 20, H + 20);
          ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 5; i++) { const cy = ((i * 97 + 40) - camY * 0.4) % (H + 80) - 40; const cx = (i * 61) % W; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.arc(cx + 14, cy - 5, 15, 0, Math.PI * 2); ctx.arc(cx + 30, cy, 10, 0, Math.PI * 2); ctx.fill(); }
          if (GROUND - camY < H + 10) { ctx.fillStyle = '#6b8e4e'; ctx.fillRect(0, GROUND - camY, W, H - (GROUND - camY) + 10); }
          for (const b of blocks) block(b.x, b.y, b.w, b.color, blockEmoji);
          for (const s of scraps) block(s.x, s.y, s.w, s.color, null, s.rot);
          if (!over) { const y = falling ? falling.y : camTop() + 26; const x = falling ? falling.x : swing.x, w = falling ? falling.w : swing.w; const color = falling ? falling.color : colors[blocks.length % colors.length];
            // クレーン
            ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w / 2, 0); ctx.lineTo(x + w / 2, y - camY); ctx.stroke(); ctx.fillStyle = '#444'; ctx.fillRect(0, 0, W, 6);
            block(x, y, w, color, blockEmoji);
            // ガイド(したの ブロックの はば)
            const top = blocks[blocks.length - 1]; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(top.x, y - camY + BLOCK_H); ctx.lineTo(top.x, top.y - camY); ctx.moveTo(top.x + top.w, y - camY + BLOCK_H); ctx.lineTo(top.x + top.w, top.y - camY); ctx.stroke(); ctx.setLineDash([]); }
          for (const p of parts) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - camY - 2, 4, 4); } ctx.globalAlpha = 1;
          ctx.restore();
          ctx.fillStyle = 'rgba(0,0,0,.4)'; mgRoundRect(ctx, W - 64, 6, 58, 16, 8); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${(blocks.length - 1) * 0.5}m`, W - 35, 14);
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('スタート!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H * 0.3, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H * 0.3 + 13); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now); if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0 && !over) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId); container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const n = blocks.length - 1; const score = clamp(Math.round(8 + n * 4.5 + perfects * 3), 8, 100);
          say(over ? `${n}だんつんだ!` : `⏰ ${n}だんつんだ!✨${perfects}`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }

  // つみき/パンケーキ/ケーキは ブロックの 見た目だけが ちがう、うごく
  // ブロックを タイミングよく タップで おとす 操作・かちはい判定が おなじ
  // 水増しだった ため、randomThemeGame で 1つに 統合した
  const STACK_THEMES = [
    { title: 'つみきタワー!せいかくにかさねよう', blockEmoji: '🟦', palette: ['#f6a5c0', '#a5d8f6', '#c8f6a5', '#f6e2a5', '#d3a5f6', '#a5f6d8', '#f6c8a5'] },
    { title: 'パンケーキタワー!たかくかさねよう', blockEmoji: '🥞', palette: ['#f6d9a5', '#f0c078', '#e8a95c', '#dba05a', '#c98a4a', '#b87a3f', '#a56a35'] },
    { title: 'ケーキタワー!おいわいのたかづみ', blockEmoji: '🍰', palette: ['#ffd1e8', '#ffe4b5', '#d1f0d8', '#d1e8ff', '#e8d1ff', '#fff5b8', '#ffcccb'] },
  ];
  const STACK_GAME_VARIANTS = [
    mg('stack-themed', randomThemeGame(makeStackGame, STACK_THEMES)),
    // ふゆの ゆきだるまづくり テーマ(育成ゲームらしい あそび むけ)
    mg('stack-snowman', makeStackGame({
      title: 'ゆきだるまタワー!まるくかさねよう',
      blockEmoji: '⚪',
      palette: ['#ffffff', '#f0f8ff', '#e6f2ff', '#f5fbff', '#ffffff', '#eef7ff', '#f8fcff'],
    })),
  ];

  // --- ボウリング(canvas ぎじ3D・10ピン物理): うしろから 見た レーンに
  //     スワイプで なげる。スワイプの むきが ねらい、はやさが パワー、
  //     とちゅうで まげると フック(カーブ)。ピンどうしも ぶつかって たおれる ---
  function makeBowlingGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const LANE_L = 40, LANE_HW = 10, BALL_R = 2.05, PIN_R = 1.14, PIN_H = 7.2;
        const CAM_Z = -8, CAM_Y = 7.5, HOR_RATIO = 0.3;
        const FRAMES = 2;
        let frame = 1, ballNo = 1, pinsDown = 0, strikes = 0, spares = 0, framePins = 0, results = [];
        let ball = null, thrown = false, running = true, rafId = null, last = null, msg = '', msgUntil = 0, startX = 0, settleAt = 0;
        let drag = null, leftHeld = false, rightHeld = false;
        const GIVE_UP_MS = 50000;
        const startTime = performance.now();
        const pins = [];
        function rackPins() {
          pins.length = 0;
          const rows = [[0], [-2.9, 2.9], [-5.8, 0, 5.8], [-8.7, -2.9, 2.9, 8.7]];
          rows.forEach((xs, r) => xs.forEach((x) => pins.push({ x, z: LANE_L - 18 + r * 5.2, vx: 0, vz: 0, up: true, angle: 0, gone: false })));
        }
        container.innerHTML = `
          <div class="mg-header"><span id="bwFrame">1フレーム1投目</span><span id="bwScore">たおした0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="bwCanvas"></canvas></div>
          <div class="mg-hint" id="bwHint">ボールからうえへスワイプ!はやくはらうほどつよく、ななめにはらうとねらいがかわる。◀▶で立ち位置</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="bwLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="bwRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#bwCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const F = W * 0.55, HOR = H * HOR_RATIO;
        const frameEl = container.querySelector('#bwFrame'), scoreEl = container.querySelector('#bwScore'), hint = container.querySelector('#bwHint');
        bindHeldButton(container.querySelector('#bwLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#bwRight'), (v) => { rightHeld = v; });
        const say = (t, ms = 1400) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function project(x, y, z) { const dz = z - CAM_Z; const s = F / dz; return { x: W / 2 + x * s, y: HOR + (CAM_Y - y) * s, s }; }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (thrown || !running) return; const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, pts: [{ x: p.x, y: p.y, t: performance.now() }] }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); drag.pts.push({ x: p.x, y: p.y, t: performance.now() }); if (drag.pts.length > 40) drag.pts.shift(); });
        const release = (e) => {
          if (!drag || e.pointerId !== drag.id) return;
          const pts = drag.pts; drag = null;
          const a = pts[0], b = pts[pts.length - 1];
          const dy = a.y - b.y, dx = b.x - a.x, dt = Math.max(40, b.t - a.t);
          if (dy < 30) { say('もっとながくうえへスワイプしよう', 1000); return; }
          const speedPx = Math.hypot(dx, dy) / dt * 1000;
          const power = clamp(speedPx / 1400, 0.45, 1.25);
          const mid = pts[Math.floor(pts.length / 2)];
          const hook = clamp(((b.x - mid.x) - (mid.x - a.x)) / 60, -1, 1);
          const aim = clamp(dx / dy, -0.6, 0.6);
          throwBall(power, aim, hook);
        };
        canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
        function throwBall(power, aim, hook) {
          sfx('whoosh');
          thrown = true;
          const speed = 26 * power;
          ball = { x: startX, z: 0, vx: aim * speed * 0.55, vz: speed, hook: hook * 9, spin: 0 };
          say(power > 1.1 ? '💨ごうきゅう!' : 'なげた!', 700);
        }
        function step(dt) {
          if (!ball) return;
          const b = ball;
          if (b.z > LANE_L * 0.45 && !b.gutter) b.vx += b.hook * dt * (b.z / LANE_L);
          b.x += b.vx * dt; b.z += b.vz * dt;
          b.vz -= 1.2 * dt;
          if (Math.abs(b.x) > LANE_HW && !b.gutter) { b.gutter = true; b.x = Math.sign(b.x) * (LANE_HW + 1.2); b.vx = 0; b.hook = 0; say('ガター…', 1000); }
          for (const p of pins) {
            if (p.gone) continue;
            const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
            if (d < BALL_R + PIN_R && !b.gutter) {
              const nx = dx / (d || 1), nz = dz / (d || 1);
              const sp = Math.hypot(b.vx, b.vz);
              p.x = b.x + nx * (BALL_R + PIN_R + 0.05); p.z = b.z + nz * (BALL_R + PIN_R + 0.05);
              // インパルスは ピンごとに 1かいだけ(ふれつづけても ボールが とまらない ように)
              if (!p.hitAt || performance.now() - p.hitAt > 250) {
                p.hitAt = performance.now();
                p.vx = nx * sp * (0.7 + Math.random() * 0.4) + b.vx * 0.2; p.vz = nz * sp * (0.8 + Math.random() * 0.3);
                p.up = false; p.angle = Math.atan2(nx, nz);
                b.vx -= nx * sp * 0.06; b.vz *= 0.96;
              }
            }
          }
          for (const p of pins) {
            if (p.gone || p.up) continue;
            p.x += p.vx * dt; p.z += p.vz * dt;
            p.vx *= Math.pow(0.5, dt); p.vz *= Math.pow(0.5, dt);
            p.angle += (Math.abs(p.vx) + Math.abs(p.vz)) * dt * 0.4;
            for (const q of pins) {
              if (q === p || q.gone) continue;
              const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
              // たおれかけの ピンは よこに ひろがるので、あたり判定を ひろめに とる
              const reach = PIN_R * 2 + (q.up ? 1.0 : 0.3);
              if (d < reach && d > 0) {
                const nx = dx / d, nz = dz / d, sp = Math.hypot(p.vx, p.vz);
                const key = pins.indexOf(q);
                p.pinHits = p.pinHits || {};
                // ピンどうしの インパルスも ペアごとに 1かい(ふれつづけて そくどが きえない ように)
                if (sp > 0.8 && !(p.pinHits[key] > performance.now() - 300)) {
                  p.pinHits[key] = performance.now();
                  if (q.up) { q.up = false; q.angle = Math.atan2(nx, nz); q.hitAt = performance.now(); }
                  const scatter = (Math.random() - 0.5) * 0.6;
                  q.vx += (nx + scatter) * sp * 0.6; q.vz += nz * sp * 0.6; p.vx *= 0.55; p.vz *= 0.55;
                }
                if (d < PIN_R * 2) { p.x = q.x - nx * PIN_R * 2; p.z = q.z - nz * PIN_R * 2; }
              }
            }
            if (Math.abs(p.x) > LANE_HW + 3 || p.z > LANE_L + 4 || p.z < 4) p.gone = true;
          }
          if (b.z > LANE_L + 4 || b.vz < 0.5) { ball = null; settleAt = performance.now() + 900; }
        }
        function ballDone() {
          const down = pins.filter((p) => !p.up).length;
          const gained = down - framePins;
          framePins = down; pinsDown += gained;
          scoreEl.textContent = 'たおした' + pinsDown;
          let label;
          if (ballNo === 1 && down === 10) { strikes++; label = '🎳ストライク!!'; results.push('X'); nextFrame(); }
          else if (ballNo === 2 && down === 10) { spares++; label = '✨スペア!'; results.push('/'); nextFrame(); }
          else if (ballNo === 1) { label = gained === 0 ? 'ノーピン…' : gained + 'ほんたおした!'; ballNo = 2; for (const p of pins) if (!p.up) p.gone = true; }
          else { label = gained === 0 ? 'のこった…' : 'あわせて' + down + 'ほん'; results.push(String(down)); nextFrame(); }
          say(label, 1600);
          if (frame > FRAMES) { setTimeout(finish, 1300); return; }
          frameEl.textContent = frame + 'フレーム' + ballNo + '投目';
          thrown = false;
        }
        function nextFrame() { frame++; ballNo = 1; framePins = 0; if (frame <= FRAMES) rackPins(); }
        function drawPin(p) {
          const base = project(p.x, 0, p.z);
          const top = project(p.x, PIN_H, p.z);
          const h = base.y - top.y, w = PIN_R * 2 * base.s;
          ctx.save(); ctx.translate(base.x, base.y);
          if (!p.up) { ctx.rotate(Math.PI / 2 + p.angle * 0.5); ctx.globalAlpha = 0.9; }
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.6, w * 0.25, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.ellipse(0, -h * 0.28, w * 0.5, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(0, -h * 0.7, w * 0.3, h * 0.32, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#e63946'; ctx.fillRect(-w * 0.3, -h * 0.58, w * 0.6, Math.max(1, h * 0.06)); ctx.fillRect(-w * 0.3, -h * 0.5, w * 0.6, Math.max(1, h * 0.06));
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#1d2233'; ctx.fillRect(0, 0, W, H);
          const g = ctx.createLinearGradient(0, 0, 0, HOR); g.addColorStop(0, '#0f1320'); g.addColorStop(1, '#3a3f5a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, HOR + 2);
          const nl = project(-LANE_HW, 0, 0), nr = project(LANE_HW, 0, 0), fl = project(-LANE_HW, 0, LANE_L + 3), fr = project(LANE_HW, 0, LANE_L + 3);
          const gl = project(-LANE_HW - 2.5, 0, 0), gr = project(LANE_HW + 2.5, 0, 0), gfl = project(-LANE_HW - 2.5, 0, LANE_L + 3), gfr = project(LANE_HW + 2.5, 0, LANE_L + 3);
          ctx.fillStyle = '#2b2f3f'; ctx.beginPath(); ctx.moveTo(gl.x, gl.y); ctx.lineTo(gfl.x, gfl.y); ctx.lineTo(gfr.x, gfr.y); ctx.lineTo(gr.x, gr.y); ctx.closePath(); ctx.fill();
          const wood = ctx.createLinearGradient(0, fl.y, 0, nl.y); wood.addColorStop(0, '#b98a53'); wood.addColorStop(1, '#e2b57d');
          ctx.fillStyle = wood; ctx.beginPath(); ctx.moveTo(nl.x, nl.y); ctx.lineTo(fl.x, fl.y); ctx.lineTo(fr.x, fr.y); ctx.lineTo(nr.x, nr.y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(120,80,40,.35)'; ctx.lineWidth = 1;
          for (let i = -4; i <= 4; i++) { const a = project(i * 2.5, 0, 0), b = project(i * 2.5, 0, LANE_L + 3); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          ctx.fillStyle = 'rgba(80,40,10,.5)'; for (let i = -3; i <= 3; i++) { const a = project(i * 2.9, 0, 14 + Math.abs(i) * 1.2); ctx.beginPath(); ctx.moveTo(a.x, a.y - 5 * a.s); ctx.lineTo(a.x - 1.2 * a.s, a.y); ctx.lineTo(a.x + 1.2 * a.s, a.y); ctx.closePath(); ctx.fill(); }
          const order = pins.filter((p) => !p.gone).sort((a, b) => b.z - a.z);
          for (const p of order) if (!ball || p.z > ball.z) drawPin(p);
          if (ball) { const b = project(ball.x, BALL_R, ball.z); const r = BALL_R * b.s; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + r * 0.9, r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); const bg = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 0.35, 1, b.x, b.y, r); bg.addColorStop(0, '#6fa8ff'); bg.addColorStop(1, '#0b2a6b'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill(); }
          for (const p of order) if (ball && p.z <= ball.z) drawPin(p);
          if (!thrown && running) {
            const b = project(startX, BALL_R, 0); const r = BALL_R * b.s;
            ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(b.x, b.y + r * 0.9, r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            const bg = ctx.createRadialGradient(b.x - r * 0.35, b.y - r * 0.35, 1, b.x, b.y, r); bg.addColorStop(0, '#6fa8ff'); bg.addColorStop(1, '#0b2a6b'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
            if (drag && drag.pts.length > 1) { const a = drag.pts[0], e = drag.pts[drag.pts.length - 1]; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + (e.x - a.x), b.y + (e.y - a.y)); ctx.stroke(); ctx.setLineDash([]); }
            else { ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText('↑スワイプでなげる', W / 2, b.y - r - 14); }
          }
          ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
          ctx.fillText(results.map((r) => r === 'X' ? 'X' : r === '/' ? '/' : r).join(' ') || '', 8, 8);
          if (now < msgUntil) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 90, HOR + 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, HOR + 28); }
        }
        function loop(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          if (!thrown) { const mv = ((rightHeld ? 1 : 0) - (leftHeld ? 1 : 0)) * 9 * dt; startX = clamp(startX + mv, -LANE_HW + 2.5, LANE_HW - 2.5); }
          if (ball) { const sub = 3; for (let i = 0; i < sub; i++) step(dt / sub); }
          else if (thrown && settleAt && now > settleAt) { settleAt = 0; ballDone(); }
          render(now);
          if (now - startTime > GIVE_UP_MS && !thrown) { finish(); return; }
          rafId = requestAnimationFrame(loop);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(14 + pinsDown * 2.9 + strikes * 12 + spares * 5), 12, 100);
          say(`けっか: ${pinsDown}ほん${strikes ? 'ストライク' + strikes : ''}${spares ? 'スペア' + spares : ''}`, 2000);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        rackPins();
        rafId = requestAnimationFrame(loop);
      },
    };
  }

  // --- アーチェリー(まとあて): ひっぱって はなす。かぜと 手ぶれを よんで
  //     まとの まんなかを ねらう。5本で 50点まんてん ---
  function makeArcheryGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ARROWS = 5;
        let arrowNo = 0, total = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, holdSince = 0;
        let wind = 0, dist = 1, aim = null, flying = null, hits = [], results = [];
        const GIVE_UP_MS = 55000;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="arNo">1/${ARROWS}本目</span><span id="arScore">0てん</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="arCanvas"></canvas></div>
          <div class="mg-hint" id="arHint">がめんをおさえてうしろへひっぱり、はなすとはっしゃ。かぜのぶんだけずらしてねらおう</div>`;
        const canvas = container.querySelector('#arCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const noEl = container.querySelector('#arNo'), scoreEl = container.querySelector('#arScore'), hint = container.querySelector('#arHint');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const TX = W / 2, TY = H * 0.42;
        function newRound() {
          wind = (Math.random() - 0.5) * 2 * lerp(0.5, 1.0, difficulty);
          dist = 0.85 + Math.random() * 0.5;
          hits = [];
        }
        const targetR = () => W * 0.3 / dist;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (flying || !running || arrowNo >= ARROWS) return; const p = mgPointerPos(canvas, e); aim = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y }; holdSince = performance.now(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!aim || e.pointerId !== aim.id) return; const p = mgPointerPos(canvas, e); aim.x = p.x; aim.y = p.y; });
        const release = (e) => {
          if (!aim || e.pointerId !== aim.id) return;
          const dx = aim.ox - aim.x, dy = aim.oy - aim.y; const len = Math.hypot(dx, dy); aim = null;
          if (len < 18) { say('もっとひっぱろう', 900); return; }
          const draw = clamp(len / 110, 0.2, 1);
          const { sx, sy } = sightPoint(dx, dy, len, draw);
          const shake = shakeAmount();
          const landX = sx + wind * 26 * (1 / draw) + (Math.random() - 0.5) * shake;
          const landY = sy + (Math.random() - 0.5) * shake;
          sfx('whoosh'); flying = { t: 0, fromX: W / 2, fromY: H + 10, toX: landX, toY: landY };
          arrowNo++;
        };
        canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
        function shakeAmount() { const held = (performance.now() - holdSince) / 1000; return lerp(4, 8, difficulty) + Math.max(0, held - 1.5) * 8; }
        // ひっぱった むきの はんたい(=やの とぶ むき)。まっすぐ したへ
        // いっぱいに ひくと まとの まんなか、ひきが よわい/ななめだと したに おちる
        function sightPoint(dx, dy, len, draw) { const ux = dx / len, uy = dy / len; return { sx: W / 2 + ux * 150, sy: TY + (1 - draw) * 90 + (1 + uy) * 45 }; }
        function ringScore(x, y) { const d = Math.hypot(x - TX, y - TY) / targetR(); if (d > 1) return 0; return Math.max(1, 10 - Math.floor(d * 10)); }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8ed0ff'); sky.addColorStop(0.55, '#d8efff'); sky.addColorStop(0.56, '#79b85a'); sky.addColorStop(1, '#4e8f3a');
          ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
          const R = targetR();
          ctx.fillStyle = '#8b5a2b'; ctx.fillRect(TX - 3, TY, 6, H * 0.56 - TY);
          const rings = ['#fff', '#fff', '#222', '#222', '#2b7bd6', '#2b7bd6', '#e63946', '#e63946', '#ffd60a', '#ffd60a'];
          for (let i = 0; i < 10; i++) { ctx.fillStyle = rings[i]; ctx.beginPath(); ctx.arc(TX, TY, R * (1 - i / 10), 0, Math.PI * 2); ctx.fill(); }
          ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; for (let i = 1; i <= 10; i++) { ctx.beginPath(); ctx.arc(TX, TY, R * i / 10, 0, Math.PI * 2); ctx.stroke(); }
          for (const h of hits) { ctx.strokeStyle = '#3b2a12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x - 6, h.y + 14); ctx.stroke(); ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(h.x, h.y, 3, 0, Math.PI * 2); ctx.fill(); }
          // かぜ
          ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(8, 8, 118, 22);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          const wa = Math.abs(wind); ctx.fillText('かぜ' + (wa < 0.15 ? 'なし' : (wind < 0 ? '←' : '→') + ' ' + (wa < 0.5 ? 'よわ' : wa < 0.9 ? 'ふつう' : 'つよ')), 14, 19);
          for (let i = 0; i < 3; i++) { ctx.fillStyle = i < wa * 3 ? '#8ef0ff' : 'rgba(255,255,255,.25)'; ctx.fillRect(96 + i * 9, 13, 6, 12); }
          if (aim) {
            const dx = aim.ox - aim.x, dy = aim.oy - aim.y, len = Math.hypot(dx, dy), draw = clamp(len / 110, 0, 1);
            if (len > 4) {
              const { sx, sy } = sightPoint(dx, dy, len, Math.max(0.2, draw));
              const sh = shakeAmount() * 0.4; const jx = Math.sin(now / 90) * sh, jy = Math.cos(now / 70) * sh;
              ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx + jx, sy + jy, 10, 0, Math.PI * 2); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(sx + jx - 16, sy + jy); ctx.lineTo(sx + jx + 16, sy + jy); ctx.moveTo(sx + jx, sy + jy - 16); ctx.lineTo(sx + jx, sy + jy + 16); ctx.stroke();
              ctx.fillStyle = draw > 0.85 ? '#ff5c8a' : draw > 0.5 ? '#ffd257' : '#8de0a0'; ctx.fillRect(W - 24, H - 16 - 100 * draw, 12, 100 * draw); ctx.strokeStyle = '#fff'; ctx.strokeRect(W - 24, H - 116, 12, 100);
            }
            // ゆみ
            ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, H + 40, 70, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
            ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(W / 2 - 57, H + 40 - 41); ctx.lineTo(W / 2 + (aim.x - aim.ox) * 0.3, H - 6 + Math.min(40, len * 0.3)); ctx.lineTo(W / 2 + 57, H + 40 - 41); ctx.stroke();
          } else if (!flying && arrowNo < ARROWS) {
            ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(W / 2, H + 40, 70, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
            ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText('おさえてうしろへひっぱる', W / 2, H - 30); ctx.shadowBlur = 0;
          }
          if (flying) {
            const t = flying.t, x = flying.fromX + (flying.toX - flying.fromX) * t, y = flying.fromY + (flying.toY - flying.fromY) * t - Math.sin(t * Math.PI) * 60;
            const s = 1 - t * 0.6;
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(flying.toY - flying.fromY, flying.toX - flying.fromX)); ctx.strokeStyle = '#3b2a12'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(-22 * s, 0); ctx.lineTo(6 * s, 0); ctx.stroke(); ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(-22 * s, 0); ctx.lineTo(-30 * s, -5 * s); ctx.lineTo(-30 * s, 5 * s); ctx.closePath(); ctx.fill(); ctx.restore();
          }
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3; ctx.fillText(results.join('・'), W - 8, 8); ctx.shadowBlur = 0;
          if (now < msgUntil) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H * 0.62, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H * 0.62 + 14); }
        }
        function loop(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          if (flying) {
            flying.t += dt / 0.55;
            if (flying.t >= 1) {
              const pts = ringScore(flying.toX, flying.toY);
              if (pts > 0) { hits.push({ x: flying.toX, y: flying.toY }); sfx(pts >= 10 ? 'coin' : 'hit'); } else sfx('bad');
              total += pts; results.push(String(pts)); scoreEl.textContent = total + 'てん';
              say(pts === 10 ? '🎯どまんなか!10てん' : pts === 0 ? 'はずれ…' : pts + 'てん', 1300);
              flying = null;
              if (arrowNo >= ARROWS) { setTimeout(finish, 1200); }
              else { noEl.textContent = (arrowNo + 1) + '/' + ARROWS + '本目'; setTimeout(newRound, 900); }
            }
          }
          render(now);
          if (now - startTime > GIVE_UP_MS) { finish(); return; }
          rafId = requestAnimationFrame(loop);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = clamp(Math.round(total / (ARROWS * 10) * 100), 8, 100);
          say(`けっか: ${total}てん／${ARROWS * 10}`, 2000);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        newRound();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const SWIPE_THROW_VARIANTS = [
    mg('bowling-3d', makeBowlingGame({ title: 'ボウリング!スワイプでなげてストライクをねらえ' })),
    mg('archery-3d', makeArcheryGame({ title: 'アーチェリー!かぜをよんでまとのまんなかへ' })),
  ];

  // --- ブロックくずし(canvas 作りなおし): ゆびで パドルを うごかし、ボールを はねかえして
  //     ブロックを ぜんぶ こわす。かたい ブロック、アイテム(ワイド/マルチボール/スロー)、3ステージ ---
  function makeBreakoutGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(150000), COLS = 8;
        let running = true, rafId = null, last = null, stage = 0, lives = 3, score = 0, bricks = [], balls = [], items = [], parts = [], paddle = { x: 0, w: 64, tw: 64, wideUntil: 0 }, slowUntil = 0, msg = '', msgUntil = 0, drag = null, serveAt = 0, leftHeld = false, rightHeld = false, cleared = 0, hitsTotal = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="bkStage">ステージ1/3</span><span id="bkScore">❤️❤️❤️／0pt</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="bkCanvas"></canvas></div>
          <div class="mg-hint" id="bkHint">がめんをよこになぞる(か◀▶)でパドルをうごかす。パドルのはしでうつとボールがななめにとぶ。おちてくるアイテム: ⬌ワイド、●マルチボール、🐢スロー</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="bkLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="bkRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#bkCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * 1.25));
        const BW = (W - 12) / COLS, BH = 14, PY = H - 22, BR = 5;
        const stageEl = container.querySelector('#bkStage'), scoreEl = container.querySelector('#bkScore'), hint = container.querySelector('#bkHint');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { stageEl.textContent = `ステージ${Math.min(3, stage + 1)}/3`; scoreEl.textContent = `${'❤️'.repeat(Math.max(0, lives))}／${score}pt`; };
        paddle.x = W / 2;
        bindHeldButton(container.querySelector('#bkLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#bkRight'), (v) => { rightHeld = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, x: p.x, px: paddle.x }; });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); paddle.x = clamp(drag.px + (p.x - drag.x) * 1.15, paddle.w / 2, W - paddle.w / 2); });
        const endDrag = () => { drag = null; }; canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
        const COLORS = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
        function buildStage(n) {
          bricks = []; const rows = 4 + n;
          for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) { if (n === 1 && (r + c) % 3 === 0) continue; if (n === 2 && r === 2 && c > 1 && c < COLS - 2) continue; const hard = (n >= 1 && r === 0) || (n === 2 && c % 4 === 0); bricks.push({ x: 6 + c * BW, y: 30 + r * (BH + 3), hp: hard ? 2 : 1, color: COLORS[r % COLORS.length], hard, item: Math.random() < 0.12 ? ['wide', 'multi', 'slow'][Math.floor(Math.random() * 3)] : null }); }
          balls = []; items = []; serve();
        }
        function serve() { balls = [{ x: paddle.x, y: PY - 14, vx: 0, vy: 0, held: true }]; serveAt = performance.now() + 900; }
        function launch(b) { const sp = lerp(245, 295, difficulty) + stage * 20; const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.8; b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.held = false; }
        buildStage(0);
        function burst(x, y, color) { for (let i = 0; i < 8; i++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 100; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.45, color }); } }
        function update(dt, now) {
          const steer = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0); if (steer) paddle.x = clamp(paddle.x + steer * dt * 320, paddle.w / 2, W - paddle.w / 2);
          paddle.tw = now < paddle.wideUntil ? 96 : 64; paddle.w += (paddle.tw - paddle.w) * Math.min(1, dt * 8);
          const slow = now < slowUntil ? 0.65 : 1;
          for (const b of balls) {
            if (b.held) { b.x = paddle.x; b.y = PY - 14; if (now >= serveAt) launch(b); continue; }
            const steps = 3; for (let s = 0; s < steps; s++) {
              b.x += b.vx * dt * slow / steps; b.y += b.vy * dt * slow / steps;
              if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx); } if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx); } if (b.y < BR) { b.y = BR; b.vy = Math.abs(b.vy); }
              if (b.vy > 0 && b.y + BR >= PY - 4 && b.y + BR <= PY + 8 && Math.abs(b.x - paddle.x) <= paddle.w / 2 + BR) { const rel = (b.x - paddle.x) / (paddle.w / 2); const sp = Math.min(400, Math.hypot(b.vx, b.vy) * 1.02); const a = -Math.PI / 2 + rel * 1.05; b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.y = PY - 4 - BR; hitsTotal++; }
              for (const k of bricks) { if (k.hp <= 0) continue; if (b.x + BR < k.x || b.x - BR > k.x + BW - 2 || b.y + BR < k.y || b.y - BR > k.y + BH) continue; const ox = Math.min(b.x + BR - k.x, k.x + BW - 2 - (b.x - BR)), oy = Math.min(b.y + BR - k.y, k.y + BH - (b.y - BR)); if (ox < oy) b.vx *= -1; else b.vy *= -1; k.hp--; sfx(k.hp <= 0 ? 'hit' : 'tick'); if (k.hp <= 0) { score += k.hard ? 30 : 10; burst(k.x + BW / 2, k.y + BH / 2, k.color); if (k.item) items.push({ x: k.x + BW / 2, y: k.y + BH, kind: k.item }); } else { k.flash = now; score += 5; } hud(); break; }
            }
          }
          balls = balls.filter((b) => b.y < H + 20);
          if (!balls.length) { lives--; hud(); if (lives <= 0) { finish(false); return; } say('💦おとした…', 900); serve(); }
          for (const it of items) { it.y += 90 * dt; if (it.y > PY - 10 && it.y < PY + 12 && Math.abs(it.x - paddle.x) < paddle.w / 2 + 8) { it.dead = true; if (it.kind === 'wide') { paddle.wideUntil = now + 9000; say('⬌ワイドパドル!', 900); } else if (it.kind === 'multi') { const src = balls[0] || { x: paddle.x, y: PY - 14, vx: 0, vy: -220 }; for (const d of [-0.5, 0.5]) { const sp = Math.max(200, Math.hypot(src.vx, src.vy)); const a = Math.atan2(src.vy || -1, src.vx || 0.1) + d; balls.push({ x: src.x, y: src.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, held: false }); } say('●マルチボール!', 900); } else { slowUntil = now + 7000; say('🐢スロー!', 900); } } }
          items = items.filter((it) => !it.dead && it.y < H + 20);
          for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } parts = parts.filter((p) => p.life > 0);
          if (bricks.every((k) => k.hp <= 0)) { cleared++; stage++; if (stage >= 3) { finish(true); return; } say(`🎉ステージ${stage}クリア!`, 1400); hud(); buildStage(stage); }
        }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#12122e'); bg.addColorStop(1, '#2a2360'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 30; i++) ctx.fillRect((i * 83) % W, (i * 47) % H, 1.2, 1.2);
          for (const k of bricks) { if (k.hp <= 0) continue; const fl = k.flash && now - k.flash < 120; ctx.fillStyle = 'rgba(0,0,0,.3)'; mgRoundRect(ctx, k.x + 2, k.y + 3, BW - 2, BH, 3); const g = ctx.createLinearGradient(k.x, k.y, k.x, k.y + BH); g.addColorStop(0, fl ? '#fff' : k.hard ? '#dfe4ea' : k.color); g.addColorStop(1, k.hard ? '#8a94a6' : mgShade(k.color, 0.7)); ctx.fillStyle = g; mgRoundRect(ctx, k.x, k.y, BW - 2, BH, 3); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(k.x + 2, k.y + 1, BW - 6, 2); if (k.hard && k.hp === 2) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(k.x + 3.5, k.y + 3.5, BW - 9, BH - 7); } }
          for (const it of items) { ctx.fillStyle = it.kind === 'wide' ? '#3a86ff' : it.kind === 'multi' ? '#ffd23f' : '#8ac926'; mgRoundRect(ctx, it.x - 11, it.y - 7, 22, 14, 6); ctx.fillStyle = '#111'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.kind === 'wide' ? '⬌' : it.kind === 'multi' ? '●' : '🐢', it.x, it.y + 1); }
          for (const p of parts) { ctx.globalAlpha = clamp(p.life * 2.2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); } ctx.globalAlpha = 1;
          const pw = paddle.w; ctx.fillStyle = 'rgba(0,0,0,.35)'; mgRoundRect(ctx, paddle.x - pw / 2 + 2, PY + 2, pw, 9, 4); const pg = ctx.createLinearGradient(0, PY - 4, 0, PY + 6); pg.addColorStop(0, '#b8f0c0'); pg.addColorStop(1, '#4f9a5c'); ctx.fillStyle = pg; mgRoundRect(ctx, paddle.x - pw / 2, PY - 4, pw, 9, 4); ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(currentSprite(), paddle.x, PY - 4);
          for (const b of balls) { ctx.fillStyle = 'rgba(255,226,122,.35)'; ctx.beginPath(); ctx.arc(b.x, b.y, BR + 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, Math.PI * 2); ctx.fill(); }
          if (now < slowUntil) { ctx.fillStyle = 'rgba(138,201,38,.7)'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('🐢スロー', 6, 6); }
          if (balls.some((b) => b.held)) { ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText('よーい…', W / 2, PY - 40); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 80, H / 2 - 13, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.033, (now - last) / 1000); last = now;
          update(dt, now); if (!running) return; render(now);
          if (now - startTime > DURATION_MS) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(all) {
          if (!running) return; running = false; cancelAnimationFrame(rafId); container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const final = all ? clamp(85 + lives * 5, 85, 100) : clamp(Math.round(10 + score / 14 + cleared * 12), 10, 80);
          say(all ? '🏆ぜんステージクリア!' : lives <= 0 ? `ゲームオーバー…${score}pt` : `⏰タイムアップ${score}pt`, 2600); render(performance.now());
          setTimeout(() => onComplete(final), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const BREAKOUT_VARIANTS = [
    mg('breakout-classic', makeBreakoutGame({ title: 'ブロックくずしふう!ぜんぶくずそう' })),
  ];

  // ================================================================
  // 第3段階B: 「あたらしい 操作たいけん」を もつ ミニゲーム7しゅるい
  // ここから したは、既存の絵柄違い水増しとは ちがい、いままで なかった
  // 操作(ドラッグ&ドロップ/まちぶせ→はんのう/れんぞくステアリング/
  // タイミング→バランスの2だんかい/てふだ判断/2だんかい探索)を
  // ついかする。既存の抽選・アンチリピート・履歴永続化のしくみには
  // いっさい 手を くわえていない
  // ================================================================

  // --- ドラッグ&ドロップ きょうつうエンジン(ケーキ/おべんとうで つかう) ---
  // pointerdown した ようそを ゆびに ついて うごかす。position:fixed +
  // clientX/clientYを そのまま つかう ため、ページの スクロールりょうに
  // えいきょうされない。pointerup/pointercancel の どちらでも かならず
  // ドラッグを おわらせ、onDropがfalseを かえした ときは もとの いちへ
  // もどす(ドラッグに しっぱいしても やりなおせる、こどもに やさしい仕様)
  function enableDragItem(itemEl, onDrop) {
    let dragging = false;
    let originLeft = '', originTop = '', originPosition = '';
    function place(x, y) {
      const w = parseFloat(itemEl.style.width) || itemEl.offsetWidth;
      const h = parseFloat(itemEl.style.height) || itemEl.offsetHeight;
      itemEl.style.left = (x - w / 2) + 'px';
      itemEl.style.top = (y - h / 2) + 'px';
    }
    function onPointerDown(e) {
      if (dragging || itemEl.classList.contains('placed')) return;
      e.preventDefault();
      dragging = true;
      try { itemEl.setPointerCapture(e.pointerId); } catch (err) { /* iOS Safariの ふるいばあいも あるので しっぱいは むし */ }
      const rect = itemEl.getBoundingClientRect();
      originLeft = itemEl.style.left;
      originTop = itemEl.style.top;
      originPosition = itemEl.style.position;
      itemEl.style.width = rect.width + 'px';
      itemEl.style.height = rect.height + 'px';
      itemEl.style.position = 'fixed';
      itemEl.classList.add('dragging');
      place(e.clientX, e.clientY);
    }
    function restore() {
      itemEl.style.position = originPosition;
      itemEl.style.left = originLeft;
      itemEl.style.top = originTop;
      itemEl.style.width = '';
      itemEl.style.height = '';
    }
    function onPointerMove(e) {
      if (!dragging) return;
      e.preventDefault();
      place(e.clientX, e.clientY);
    }
    function endDrag(e) {
      if (!dragging) return;
      e.preventDefault();
      dragging = false;
      itemEl.classList.remove('dragging');
      const handled = onDrop(e.clientX, e.clientY, itemEl);
      if (!handled) restore();
    }
    function cancelDrag() {
      if (!dragging) return;
      dragging = false;
      itemEl.classList.remove('dragging');
      restore();
    }
    itemEl.addEventListener('pointerdown', onPointerDown);
    itemEl.addEventListener('pointermove', onPointerMove);
    itemEl.addEventListener('pointerup', endDrag);
    itemEl.addEventListener('pointercancel', cancelDrag);
  }

  function isPointInsideEl(el, x, y) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  // --- 1. ケーキデコレーション(しじされた いちへ ドラッグして おく) ---
  // トッピングを ゆびで つまんで、ケーキ上の しじされた いちへ ドラッグする
  // はじめての「ほんものの ドラッグ&ドロップ」ミニゲーム。1かいに 1しゅるい
  // だけを ハイライトし、まちがえても なにも おこらず やりなおせる
  function makeCakeDecorateGame({ title }) {
    return {
      start(container, onComplete) {
        const ROUNDS_DEF = [
          { key: 'strawberry', emoji: '🍓', label: 'いちご', left: 26, top: 34 },
          { key: 'choco', emoji: '🍫', label: 'チョコ', left: 50, top: 20 },
          { key: 'cherry', emoji: '🍒', label: 'さくらんぼ', left: 74, top: 34 },
        ];
        // ドラッグして かんがえる 時間を たっぷり かくほ(セクション9)
        const TIME_LIMIT_MS = mgDuration(16000);
        let roundIndex = 0;
        let placedCount = 0;
        let finished = false;
        let timer;
        container.innerHTML = `
          <div class="mg-header"><span id="mgScore">${placedCount}/${ROUNDS_DEF.length}</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-cake-stage" id="mgCakeStage">
            <div class="mg-cake-base">${foodIconHTML('slice','🍰')}</div>
            ${ROUNDS_DEF.map((r) => `<div class="mg-drop-target" data-key="${r.key}" style="left:${r.left}%;top:${r.top}%"></div>`).join('')}
          </div>
          <div class="mg-hint" id="mgHint"></div>
          <div class="mg-drag-tray" id="mgTray">
            ${ROUNDS_DEF.map((r) => `<div class="mg-drag-item" data-key="${r.key}">${foodIconHTML(r.key,r.emoji)}</div>`).join('')}
          </div>
        `;
        const hintEl = container.querySelector('#mgHint');
        const scoreEl = container.querySelector('#mgScore');
        const targets = Array.from(container.querySelectorAll('.mg-drop-target'));
        const items = Array.from(container.querySelectorAll('.mg-drag-item'));

        function currentRound() { return ROUNDS_DEF[roundIndex]; }
        function updateHint() {
          const r = currentRound();
          if (r) hintEl.textContent = `${r.label}をここにおいてね!`;
          targets.forEach((t) => t.classList.toggle('active', !!r && t.dataset.key === r.key));
        }
        updateHint();

        function finish(score) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          onComplete(score);
        }

        items.forEach((itemEl) => {
          enableDragItem(itemEl, (x, y) => {
            if (finished) return true;
            const round = currentRound();
            if (!round || itemEl.dataset.key !== round.key) return false;
            const target = targets.find((t) => t.dataset.key === round.key);
            if (!target || !isPointInsideEl(target, x, y)) return false;
            itemEl.classList.add('placed');
            itemEl.style.opacity = '0';
            itemEl.style.pointerEvents = 'none';
            target.classList.remove('active');
            target.classList.add('filled'); sfx('pop');
            target.innerHTML = foodIconHTML(round.key,round.emoji);
            placedCount += 1;
            scoreEl.textContent = `${placedCount}/${ROUNDS_DEF.length}`;
            roundIndex += 1;
            if (placedCount >= ROUNDS_DEF.length) {
              hintEl.innerHTML = 'さいごのひとつをおいて、ケーキができた!'+foodIconHTML('cake','🎂');
              finish(100);
            } else {
              updateHint();
            }
            return true;
          });
        });

        timer = setTimeout(() => {
          finish(Math.round((placedCount / ROUNDS_DEF.length) * 100));
        }, TIME_LIMIT_MS);
      },
    };
  }

  // --- 2. おべんとうづくり(見本を おぼえて おなじ はいちに もどす) ---
  // ケーキと おなじ ドラッグエンジンを つかいまわすが、かちはい判定は
  // まったく べつもの:さいしょに 見本を みじかく 見せてから かくし、
  // プレイヤーは「しじされた いち」ではなく「じぶんの きおく」だけを
  // たよりに もとの はいちを さいげんする(配置精度のケーキ vs
  // 記憶+ドラッグの おべんとう、で ルールを 差別化している)
  function makeBentoBoxGame({ title }) {
    return {
      start(container, onComplete) {
        const ITEMS_DEF = [
          { key: 'rice', emoji: '🍙', left: 26, top: 30 },
          { key: 'egg', emoji: '🥚', left: 74, top: 30 },
          { key: 'shrimp', emoji: '🍤', left: 26, top: 68 },
          { key: 'broccoli', emoji: '🥦', left: 74, top: 68 },
        ];
        const PREVIEW_MS = 2200;
        const TIME_LIMIT_MS = mgDuration(11000);
        let placedCount = 0;
        let finished = false;
        let timer;
        container.innerHTML = `
          <div class="mg-header"><span id="mgScore">見本をおぼえてね!</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-bento-stage" id="mgBentoStage">
            ${ITEMS_DEF.map((it) => `<div class="mg-drop-target" data-key="${it.key}" style="left:${it.left}%;top:${it.top}%"></div>`).join('')}
            ${ITEMS_DEF.map((it) => `<div class="mg-bento-preview" style="left:${it.left}%;top:${it.top}%">${foodIconHTML(it.key,it.emoji)}</div>`).join('')}
          </div>
          <div class="mg-hint" id="mgHint">見本をおぼえてね!</div>
          <div class="mg-drag-tray hidden" id="mgTray">
            ${ITEMS_DEF.map((it) => `<div class="mg-drag-item" data-key="${it.key}">${foodIconHTML(it.key,it.emoji)}</div>`).join('')}
          </div>
        `;
        const hintEl = container.querySelector('#mgHint');
        const scoreEl = container.querySelector('#mgScore');
        const tray = container.querySelector('#mgTray');
        const previews = Array.from(container.querySelectorAll('.mg-bento-preview'));
        const targets = Array.from(container.querySelectorAll('.mg-drop-target'));
        const items = Array.from(container.querySelectorAll('.mg-drag-item'));
        let timer2;

        function finish(score) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          clearTimeout(timer2);
          onComplete(score);
        }

        items.forEach((itemEl) => {
          enableDragItem(itemEl, (x, y) => {
            if (finished) return true;
            const target = targets.find((t) => !t.classList.contains('filled') && isPointInsideEl(t, x, y));
            if (!target) return false;
            const correct = target.dataset.key === itemEl.dataset.key;
            target.classList.add('filled', correct ? 'correct' : 'wrong'); sfx(correct ? 'pop' : 'bad');
            const food = ITEMS_DEF.find(it => it.key === itemEl.dataset.key);
            target.innerHTML = foodIconHTML(food.key,food.emoji);
            itemEl.style.opacity = '0';
            itemEl.style.pointerEvents = 'none';
            if (correct) placedCount += 1;
            scoreEl.textContent = `${placedCount}/${ITEMS_DEF.length}`;
            if (items.every((it) => it.style.pointerEvents === 'none')) {
              hintEl.innerHTML = placedCount === ITEMS_DEF.length ? 'ぜんぶつめて、おべんとうができた!'+foodIconHTML('bento','🍱') : '時間までにここまでつめられた';
              finish(Math.round((placedCount / ITEMS_DEF.length) * 100));
            }
            return true;
          });
        });

        timer = setTimeout(() => {
          previews.forEach((p) => p.remove());
          tray.classList.remove('hidden');
          hintEl.textContent = 'おぼえたばしょへもどそう!';
          timer2 = setTimeout(() => {
            finish(Math.round((placedCount / ITEMS_DEF.length) * 100));
          }, TIME_LIMIT_MS);
        }, PREVIEW_MS);
      },
    };
  }

  const DRAG_DECORATE_VARIANTS = [
    mg('dragDecorate-cake', makeCakeDecorateGame({ title: 'ケーキデコレーション!トッピングをかざろう' })),
    mg('dragDecorate-bento', makeBentoBoxGame({ title: 'おべんとうづくり!見本どおりにつめよう' })),
  ];

  // --- 3. ほんものの さかなつり(まちぶせ→はんのう の あたらしい 操作) ---
  // 既存の「さかなつり」(catchカテゴリ、うごく バスケットで つかまえる)とは
  // まったく べつの 操作。うきを 見つめて まち、あたりが きた しゅんかん
  // だけ タップする「まちぶせ→はんのう」型。うみ地域げんてい

  // --- プレミアム: 3Dふう奥行きゲーム ---
  // CSS perspective + requestAnimationFrame で軽量に奥行きを表現する。
  // 外部3Dライブラリを使わないため、iPhoneでも既存ゲームと同じページ内で遊べる。

  const PERSPECTIVE_3D_VARIANTS = [
    mg('p3-space', makeRoadGame({ title: '3Dうちゅうフライト!ほしをあつめていんせきをよけよう', goodItems: ['⭐', '🌟', '💫', '🪙'], badItems: ['☄️', '🪨', '🛰️', '👾'], scene: 'space', playerEmoji: '🚀' })),
    mg('p3-drive', makeRoadGame({ title: '3Dハイウェイ!コインをひろってくるまをよけよう', goodItems: ['🪙', '💎', '⛽', '🍔'], badItems: ['🚙', '🚚', '🚧', '🛢️'], scene: 'highway', playerEmoji: '🏎️' })),
  ];

  // --- 3D レイキャスト ビュー(おばけ屋敷・ダンジョン きょうつう) ---
  // 外部ライブラリなしの canvas 2D で、マス目の めいろを 一人称の 3Dに
  // 描く。かべは きょりで くらくなり、スプライト(かぎ・ゆうれい・宝箱)は
  // Zバッファで かべの うしろに かくれる
  function createRaycastView(ctx, W, H, theme) {
    const FOV = 1.15;
    const focal = (W / 2) / Math.tan(FOV / 2);
    const COL = 2;
    const cols = Math.ceil(W / COL);
    const zbuf = new Float32Array(cols);
    const horizon = H * 0.5;
    const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    const wallA = rgb(theme.wallA), wallB = rgb(theme.wallB);
    const shade = (c, k) => `rgb(${(c[0] * k) | 0},${(c[1] * k) | 0},${(c[2] * k) | 0})`;
    function render(map, px, py, ang, sprites, opts = {}) {
      if (!ctx) return;
      const rows = map.length, mapCols = map[0].length;
      const cg = ctx.createLinearGradient(0, 0, 0, horizon);
      cg.addColorStop(0, theme.ceilingTop); cg.addColorStop(1, theme.ceilingBottom);
      ctx.fillStyle = cg; ctx.fillRect(0, 0, W, horizon);
      const fg = ctx.createLinearGradient(0, horizon, 0, H);
      fg.addColorStop(0, theme.floorFar); fg.addColorStop(1, theme.floorNear);
      ctx.fillStyle = fg; ctx.fillRect(0, horizon, W, H - horizon);
      for (let c = 0; c < cols; c++) {
        const sx = (c + 0.5) * COL - W / 2;
        const rayA = ang + Math.atan2(sx, focal);
        const dx = Math.cos(rayA), dy = Math.sin(rayA);
        let mx = Math.floor(px), my = Math.floor(py);
        const ddx = Math.abs(1 / (dx || 1e-9)), ddy = Math.abs(1 / (dy || 1e-9));
        let stepX, stepY, sdx, sdy;
        if (dx < 0) { stepX = -1; sdx = (px - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - px) * ddx; }
        if (dy < 0) { stepY = -1; sdy = (py - my) * ddy; } else { stepY = 1; sdy = (my + 1 - py) * ddy; }
        let side = 0, dist = 30, guard = 0;
        while (guard++ < 80) {
          if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
          if (mx < 0 || my < 0 || mx >= mapCols || my >= rows) break;
          if (map[my][mx] === '#') { dist = side === 0 ? sdx - ddx : sdy - ddy; break; }
        }
        const perp = Math.max(0.06, dist * Math.cos(rayA - ang));
        zbuf[c] = perp;
        const lineH = Math.min(H * 6, H * 0.95 / perp);
        const top = horizon - lineH / 2;
        let wallX = side === 0 ? py + dist * dy : px + dist * dx;
        wallX -= Math.floor(wallX);
        const fog = Math.max(0.06, 1 / (1 + perp * perp * (theme.fog || 0.09)));
        ctx.fillStyle = shade(side === 0 ? wallA : wallB, fog);
        ctx.fillRect(c * COL, top, COL + 0.4, lineH);
        if (perp < 6.5) {
          ctx.fillStyle = `rgba(0,0,0,${0.28 * fog})`;
          const bricks = 4;
          for (let k = 1; k < bricks; k++) {
            const yy = top + lineH * k / bricks;
            ctx.fillRect(c * COL, yy, COL + 0.4, Math.max(1, lineH * 0.014));
          }
          const seam = (wallX * 3) % 1;
          if (seam < 0.07) { ctx.fillStyle = `rgba(0,0,0,${0.2 * fog})`; ctx.fillRect(c * COL, top, COL + 0.4, lineH); }
        }
      }
      const list = [];
      for (const s of sprites) {
        const rx = s.x - px, ry = s.y - py;
        const d = Math.hypot(rx, ry);
        let a = Math.atan2(ry, rx) - ang;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(a) < FOV / 2 + 0.4 && d > 0.12) list.push({ s, d, a });
      }
      list.sort((p, q) => q.d - p.d);
      for (const o of list) {
        const perp = o.d * Math.cos(o.a);
        if (perp < 0.1) continue;
        const sx = W / 2 + Math.tan(o.a) * focal;
        const c = Math.floor(sx / COL);
        if (c >= 0 && c < cols && zbuf[c] < perp - 0.12) continue;
        const wallH = H * 0.95 / perp;
        const size = wallH * (o.s.scale || 0.55);
        const floorY = horizon + wallH / 2;
        const fog = 1 / (1 + perp * perp * 0.045);
        ctx.globalAlpha = Math.max(0.12, Math.min(1, fog * 1.5)) * (o.s.alpha == null ? 1 : o.s.alpha);
        const lift = (o.s.lift || 0) * wallH;
        if (o.s.glow) { ctx.shadowColor = o.s.glow; ctx.shadowBlur = Math.min(24, size * 0.35); }
        ctx.font = `${Math.max(4, size)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#fff';
        ctx.fillText(o.s.emoji, sx, floorY - lift - size * 0.06);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, opts.vignette || theme.vignette || 'rgba(0,0,0,.5)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    // 見た ことの ある マスだけを 表示する ミニマップ(右上)
    function drawMinimap(map, px, py, ang, seen, marks) {
      if (!ctx) return;
      const cell = 5, pad = 6;
      const mw = map[0].length * cell, mh = map.length * cell;
      const ox = W - mw - pad, oy = pad;
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(ox - 3, oy - 3, mw + 6, mh + 6);
      for (let y = 0; y < map.length; y++) for (let x = 0; x < map[0].length; x++) {
        if (!seen[y][x]) continue;
        ctx.fillStyle = map[y][x] === '#' ? 'rgba(200,200,220,.7)' : 'rgba(70,70,90,.75)';
        ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
      }
      for (const m of marks) {
        if (m.hidden) continue;
        ctx.fillStyle = m.color;
        ctx.beginPath(); ctx.arc(ox + (m.x + 0.5) * cell, oy + (m.y + 0.5) * cell, cell * 0.42, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      ctx.translate(ox + px * cell, oy + py * cell);
      ctx.rotate(ang);
      ctx.fillStyle = '#7dff9a';
      ctx.beginPath(); ctx.moveTo(cell * 0.9, 0); ctx.lineTo(-cell * 0.5, cell * 0.55); ctx.lineTo(-cell * 0.5, -cell * 0.55); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // 目標の ほうこうを しめす コンパス(左上)
    function drawCompass(px, py, ang, tx, ty, label, color) {
      if (!ctx) return;
      const cx = 22, cy = 22, r = 15;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fill();
      const a = Math.atan2(ty - py, tx - px) - ang;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a - Math.PI / 2);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, -r + 1); ctx.lineTo(6, 4); ctx.lineTo(0, 1); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText(label, cx, cy + r + 9);
    }
    function drawMessage(text, alpha = 1) {
      if (!ctx || !text) return;
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      const w = Math.min(W - 10, ctx.measureText(text).width + 18);
      ctx.fillRect(W / 2 - w / 2, H - 34, w, 24);
      ctx.fillStyle = '#fff'; ctx.fillText(text, W / 2, H - 22);
      ctx.globalAlpha = 1;
    }
    return { render, drawMinimap, drawCompass, drawMessage };
  }
  // まるい あたり判定で かべに めりこまない ように うごく
  function rcMove(map, px, py, dx, dy, r = 0.24) {
    const free = (x, y) => {
      const cx = Math.floor(x), cy = Math.floor(y);
      return cy >= 0 && cx >= 0 && cy < map.length && cx < map[0].length && map[cy][cx] !== '#';
    };
    const ok = (x, y) => free(x - r, y - r) && free(x + r, y - r) && free(x - r, y + r) && free(x + r, y + r);
    if (ok(px + dx, py)) px += dx;
    if (ok(px, py + dy)) py += dy;
    return [px, py];
  }
  // 一人称ゲーム きょうつうの そうさ: ↶ ↑ ↷ ↓ の おしっぱなし + canvasを
  // 左右に ドラッグで むきを かえる + canvasを おさえたままで まえに すすむ
  function bindFirstPersonControls(container, canvas, ids) {
    const s = { left: false, right: false, fwd: false, back: false, touchFwd: false, dragTurn: 0 };
    bindHeldButton(container.querySelector(ids.left), (v) => { s.left = v; });
    bindHeldButton(container.querySelector(ids.right), (v) => { s.right = v; });
    bindHeldButton(container.querySelector(ids.fwd), (v) => { s.fwd = v; });
    if (ids.back) bindHeldButton(container.querySelector(ids.back), (v) => { s.back = v; });
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      drag = { x: e.clientX, id: e.pointerId, moved: 0 };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      s.touchFwd = true;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x; drag.x = e.clientX; drag.moved += Math.abs(dx);
      s.dragTurn += dx * 0.012;
      if (drag.moved > 16) s.touchFwd = false;
    });
    const end = (e) => { if (!drag || e.pointerId !== drag.id) return; drag = null; s.touchFwd = false; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    return {
      consumeDragTurn() { const t = s.dragTurn; s.dragTurn = 0; return t; },
      turn() { return (s.right ? 1 : 0) - (s.left ? 1 : 0); },
      move() { return (s.fwd || s.touchFwd ? 1 : 0) - (s.back ? 1 : 0); },
    };
  }
  function pickFarCell(map, dists, exclude) {
    let best = null;
    for (let y = 0; y < map.length; y++) for (let x = 0; x < map[0].length; x++) {
      if (map[y][x] === '#') continue;
      if (exclude.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) < 3)) continue;
      const score = Math.min(...dists.map((d) => d[y][x]));
      if (score < 0) continue;
      if (!best || score > best.score) best = { x, y, score };
    }
    return best || { x: 1, y: 1, score: 0 };
  }
  function facingOpenDir(map, x, y) {
    for (const [dx, dy, a] of [[1, 0, 0], [0, 1, Math.PI / 2], [-1, 0, Math.PI], [0, -1, -Math.PI / 2]]) {
      if (map[y + dy] && map[y + dy][x + dx] === '.') return a;
    }
    return 0;
  }
  function markSeen(seen, map, px, py, radius = 2) {
    const cx = Math.floor(px), cy = Math.floor(py);
    for (let y = cy - radius; y <= cy + radius; y++) for (let x = cx - radius; x <= cx + radius; x++) {
      if (y >= 0 && x >= 0 && y < map.length && x < map[0].length) seen[y][x] = true;
    }
  }

  // --- 3Dダンジョン: 一人称で 宝箱を あつめて 出口へ ---
  function makeFirstPersonDungeonGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 13, ROWS = 11;
        const map = generateMaze(COLS, ROWS, 3);
        const DURATION_MS = mgDuration(Math.round(lerp(60000, 48000, difficulty)));
        const SPEED = 2.4, TURN = 2.5;
        const start = { x: 1, y: 1 };
        const d0 = mazeBfs(map, start.x, start.y);
        const exit = pickFarCell(map, [d0], [start]);
        const chests = [];
        const floorCells = [];
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === '.' && d0[y][x] >= 4) floorCells.push({ x, y });
        floorCells.sort(() => Math.random() - 0.5);
        for (const c of floorCells) {
          if (chests.length >= 3) break;
          if ([exit, ...chests].some((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 4)) continue;
          chests.push({ x: c.x, y: c.y, taken: false });
        }
        const traps = [];
        for (const c of floorCells) {
          if (traps.length >= 2) break;
          if ([exit, ...chests, ...traps].some((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 3)) continue;
          traps.push({ x: c.x, y: c.y, cool: 0 });
        }
        const torches = floorCells.filter((c) => ![exit, ...chests, ...traps].some((p) => p.x === c.x && p.y === c.y)).slice(0, 5);
        let px = start.x + 0.5, py = start.y + 0.5, ang = facingOpenDir(map, start.x, start.y);
        let taken = 0, trapHits = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, penaltyMs = 0, shake = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
        container.innerHTML = `
          <div class="mg-header"><span id="mgDTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="mgDTreasure">宝箱0/3</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="mgDCanvas"></canvas></div>
          <div class="mg-hint" id="mgDHint">↶↷でむきをかえ、↑ですすむ(おしっぱなしOK)。がめんをドラッグしても見まわせる</div>
          <div class="mg-fp-controls"><button class="mg-tap-btn" id="mgDTurnL" data-key="left">↶</button><button class="mg-tap-btn primary" id="mgDForward" data-key="up">▲すすむ</button><button class="mg-tap-btn" id="mgDBack" data-key="down">▼</button><button class="mg-tap-btn" id="mgDTurnR" data-key="right">↷</button></div>`;
        const canvas = container.querySelector('#mgDCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const view = createRaycastView(ctx, W, H, { wallA: '#a08462', wallB: '#7d6548', ceilingTop: '#1a1410', ceilingBottom: '#3b2f22', floorFar: '#2a231b', floorNear: '#5a4a35', fog: 0.08 });
        const controls = bindFirstPersonControls(container, canvas, { left: '#mgDTurnL', right: '#mgDTurnR', fwd: '#mgDForward', back: '#mgDBack' });
        const timerEl = container.querySelector('#mgDTimer'), treasureEl = container.querySelector('#mgDTreasure'), hint = container.querySelector('#mgDHint');
        const say = (t, ms = 1400) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function sprites(now) {
          const bob = Math.sin(now / 300) * 0.03;
          const list = [];
          for (const c of chests) if (!c.taken) list.push({ x: c.x + 0.5, y: c.y + 0.5, emoji: '🧰', scale: 0.5, lift: 0.05 + bob, glow: 'rgba(255,220,120,.9)' });
          for (const t of traps) list.push({ x: t.x + 0.5, y: t.y + 0.5, emoji: '🕳️', scale: 0.55, lift: -0.02 });
          for (const t of torches) list.push({ x: t.x + 0.5, y: t.y + 0.5, emoji: '🕯️', scale: 0.3, lift: 0.35 + bob, glow: 'rgba(255,170,60,.9)' });
          list.push({ x: exit.x + 0.5, y: exit.y + 0.5, emoji: '🚪', scale: 0.85, lift: 0.02, glow: taken >= 3 ? 'rgba(120,255,160,.9)' : undefined });
          return list;
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) {
            ang += controls.turn() * TURN * dt + controls.consumeDragTurn();
            const mv = controls.move() * SPEED * dt;
            if (mv !== 0) [px, py] = rcMove(map, px, py, Math.cos(ang) * mv, Math.sin(ang) * mv);
            markSeen(seen, map, px, py);
            const cx = Math.floor(px), cy = Math.floor(py);
            for (const c of chests) if (!c.taken && c.x === cx && c.y === cy) { c.taken = true; taken++; sfx('coin'); treasureEl.textContent = '宝箱' + taken + '/3'; say(taken >= 3 ? '✨宝箱をぜんぶあつめた!出口へ!' : '🧰宝箱をゲット!(' + taken + '/3)'); shake = 3; }
            for (const t of traps) { if (t.cool > 0) t.cool -= dt; else if (t.x === cx && t.y === cy) { t.cool = 3; trapHits++; penaltyMs += 4000; sfx('bad'); shake = 7; say('🕳️おとしあな!-4びょう'); } }
            if (cx === exit.x && cy === exit.y) { finish(true); return; }
          }
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime) - penaltyMs);
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          if (rem <= 0) { finish(false); return; }
          if (ctx) {
            ctx.save();
            if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake = Math.max(0, shake - 0.5); }
            view.render(map, px, py, ang, sprites(now));
            ctx.restore();
            view.drawMinimap(map, px, py, ang, seen, [
              ...chests.map((c) => ({ x: c.x, y: c.y, color: '#ffd45c', hidden: c.taken || !seen[c.y][c.x] })),
              { x: exit.x, y: exit.y, color: '#7dff9a', hidden: !seen[exit.y][exit.x] },
            ]);
            const next = chests.find((c) => !c.taken);
            if (next) view.drawCompass(px, py, ang, next.x + 0.5, next.y + 0.5, '宝箱', '#ffd45c');
            else view.drawCompass(px, py, ang, exit.x + 0.5, exit.y + 0.5, '出口', '#7dff9a');
            if (now < msgUntil) view.drawMessage(msg, Math.min(1, (msgUntil - now) / 300));
            else if (now < startTime) view.drawMessage('宝箱をさがして出口へ!');
          }
          rafId = requestAnimationFrame(frame);
        }
        function finish(escaped) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const elapsed = Math.max(0, performance.now() - startTime) + penaltyMs;
          const remRatio = clamp(1 - elapsed / DURATION_MS, 0, 1);
          let score;
          if (escaped) { score = clamp(52 + taken * 12 + remRatio * 16 - trapHits * 4, 40, 100); say(taken >= 3 ? '🏆かんぜんだっしゅつ!' : '🚪だっしゅつ!宝箱' + taken + '/3'); }
          else { score = clamp(18 + taken * 9, 15, 45); say('じかんぎれ…宝箱' + taken + '/3'); }
          if (ctx) { view.render(map, px, py, ang, sprites(performance.now())); view.drawMessage(hint.textContent); }
          setTimeout(() => onComplete(Math.round(score)), 800);
        }
        markSeen(seen, map, px, py);
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const FIRST_PERSON_DUNGEON_VARIANTS=[mg('fp-dungeon',makeFirstPersonDungeonGame({title:'3Dダンジョン!宝箱をあつめて出口をさがそう'}))];

  // --- 4. ゲレンデすべりおり(スキー/スノーボード) ---
  // ◀▶ボタンで さゆうに うごきつづけながら、上から せまってくる
  // しょうがいぶつを よけつつ、はたの あいだ(ゲート)を くぐりぬける。
  // jump/runnerの「1レーンで タイミングよく さばく」だけとはちがい、
  // レーンを またいで うごきつづける れんぞくてきな そうさが ひつよう。
  // スキー/スノーボードは 見ためだけの ちがいなので randomThemeGame で
  // 1エントリに とうごうしてある。ゆきやま地域げんてい
  // --- ゲレンデすべりおり(canvas ぎじ3D版): カーブする ゲレンデを
  //     すべりおり、🚩の あいだを くぐり、木と岩を よけ、丸太は ジャンプ ---
  function makeDownhillGame({ title, rider }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const TIME_LIMIT_MS = mgDuration(Math.round(lerp(40000, 34000, difficulty)));
        let position = 0, speed = 0, playerX = 0, steer = 0, steerTarget = 0, touchSteer = null;
        let hits = 0, gates = 0, gatesTotal = 0, jumpsOk = 0, running = true, rafId = null, last = null, flash = 0, msg = '', msgUntil = 0;
        let airborneUntil = 0, tumbleUntil = 0, offSnow = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="dhTimer">のこり: ${Math.ceil(TIME_LIMIT_MS / 1000)}s</span><span id="dhScore">🚩 0/0／🪵 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="dhCanvas"></canvas></div>
          <div class="mg-hint" id="dhHint">◀▶(おしっぱなし)かがめんドラッグでステア。🚩🚩のあいだをとおり、🪵はジャンプでこえよう</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="dhLeft" data-key="left">◀</button><button class="mg-tap-btn primary" id="dhJump" data-key="action">ジャンプ!</button><button class="mg-tap-btn mg-hold-btn" id="dhRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#dhCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const road = createPseudoRoad(ctx, W, H, { roadWidth: 1500, colors: (dark) => (dark ? { grass: '#cfe6f5', road: '#ffffff', rumble: '#a9d3ec', rumbleWidth: 0.05 } : { grass: '#c4def0', road: '#f4fbff', rumble: '#a9d3ec', rumbleWidth: 0.05 }) });
        const { SEG_LEN, PLAYER_Z, segments } = road;
        const MAX_SPEED = SEG_LEN * 40, ACCEL = MAX_SPEED / 2.6;
        road.addRoad(10, 20, 10, 0, -10);
        for (let i = 0; i < 8; i++) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          road.addRoad(10 + Math.floor(Math.random() * 8), 12 + Math.floor(Math.random() * 12), 10 + Math.floor(Math.random() * 8), dir * (1.5 + Math.random() * 2.5 + difficulty), -(10 + Math.random() * 30));
          if (Math.random() < 0.5) road.addRoad(6, 6 + Math.floor(Math.random() * 10), 6, 0, -(5 + Math.random() * 20));
        }
        road.addRoad(10, 30, 10, 0, -10);
        const FINISH_INDEX = segments.length - 12;
        const items = [];
        for (let n = 8; n < FINISH_INDEX; n += 2) {
          if (Math.random() < 0.55) segments[n].sprites.push({ emoji: '🌲', offset: -1.3 - Math.random() * 1.4, size: 0.5 });
          if (Math.random() < 0.55) segments[n].sprites.push({ emoji: '🌲', offset: 1.3 + Math.random() * 1.4, size: 0.5 });
        }
        for (let n = 30; n < FINISH_INDEX - 10; n += Math.floor(lerp(14, 9, difficulty)) + Math.floor(Math.random() * 6)) {
          const r = Math.random();
          if (r < 0.45) {
            const center = (Math.random() - 0.5) * 1.1;
            const item = { kind: 'gate', z: n * SEG_LEN, center, done: false };
            items.push(item);
            segments[n].sprites.push({ emoji: '🚩', offset: center - 0.32, size: 0.24, item });
            segments[n].sprites.push({ emoji: '🚩', offset: center + 0.32, size: 0.24, item });
          } else if (r < 0.8) {
            const off = (Math.random() - 0.5) * 1.6;
            const item = { kind: 'obstacle', z: n * SEG_LEN, offset: off, done: false };
            items.push(item);
            segments[n].sprites.push({ emoji: Math.random() < 0.5 ? '🌲' : '🪨', offset: off, size: 0.3, item });
          } else {
            const item = { kind: 'log', z: n * SEG_LEN, done: false };
            items.push(item);
            for (let k = -2; k <= 2; k++) segments[n].sprites.push({ emoji: '🪵', offset: k * 0.42, size: 0.28, item });
          }
        }
        for (let n = FINISH_INDEX; n < FINISH_INDEX + 2; n++) { segments[n].sprites.push({ emoji: '🏁', offset: -1.1, size: 0.4 }); segments[n].sprites.push({ emoji: '🏁', offset: 1.1, size: 0.4 }); }
        const timerEl = container.querySelector('#dhTimer'), scoreEl = container.querySelector('#dhScore'), hint = container.querySelector('#dhHint'), jumpBtn = container.querySelector('#dhJump');
        let leftHeld = false, rightHeld = false;
        bindHeldButton(container.querySelector('#dhLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#dhRight'), (v) => { rightHeld = v; });
        function jump() {
          const now = performance.now();
          if (!running || now < startTime || now < airborneUntil || now < tumbleUntil) return;
          airborneUntil = now + 760; sfx('jump');
          jumpBtn.disabled = true; setTimeout(() => { if (running) jumpBtn.disabled = false; }, 760);
        }
        jumpBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
        let drag = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} drag = { x: e.clientX, y: e.clientY, moved: 0 }; touchSteer = clamp((mgPointerPos(canvas, e).nx - 0.5) * 2.6, -1, 1); });
        canvas.addEventListener('pointermove', (e) => { if (!drag) return; drag.moved += Math.abs(e.clientX - drag.x); touchSteer = clamp((mgPointerPos(canvas, e).nx - 0.5) * 2.6, -1, 1); });
        const endTouch = (e) => { if (drag && drag.moved < 6 && e.clientY - drag.y < -20) jump(); drag = null; touchSteer = null; };
        canvas.addEventListener('pointerup', endTouch); canvas.addEventListener('pointercancel', endTouch);
        const say = (t, ms = 1100) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `🚩 ${gates}/${gatesTotal}／🪵 ${jumpsOk}`; };
        function render(now) {
          if (!ctx) return;
          const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.5); skyG.addColorStop(0, '#6fb8ff'); skyG.addColorStop(1, '#dff1ff');
          ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#eef6fb';
          ctx.beginPath(); ctx.moveTo(0, H * 0.42); for (let i = 0; i <= 6; i++) ctx.lineTo(i * W / 6 + ((position / 900) % (W / 6)) * 0 - 0, H * 0.42 - [18, 40, 26, 48, 30, 44, 20][i]); ctx.lineTo(W, H * 0.42); ctx.closePath(); ctx.fill();
          road.render(position, playerX);
          const air = now < airborneUntil ? Math.sin(((airborneUntil - now) / 760) * Math.PI) : 0;
          const tumble = now < tumbleUntil;
          ctx.save();
          if (tumble) { ctx.translate(W / 2, H - 10); ctx.rotate(Math.sin(now / 40) * 0.5); ctx.translate(-W / 2, -(H - 10)); }
          drawRider(ctx, W / 2 + steer * 6, H - 8, 34, rider, steer, air);
          ctx.restore();
          if (air > 0) { ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText('JUMP!', W / 2, H - 70); ctx.shadowBlur = 0; }
          const progress = clamp((position + PLAYER_Z) / (FINISH_INDEX * SEG_LEN), 0, 1);
          ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(8, 8, W - 16, 8);
          ctx.fillStyle = '#7dff9a'; ctx.fillRect(8, 8, (W - 16) * progress, 8);
          ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
          ctx.fillText('🏁 ' + Math.round(progress * 100) + '%／' + Math.round(speed / MAX_SPEED * 80) + ' km/h', 8, 19); ctx.shadowBlur = 0;
          if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - 0.05); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 90, H / 2 - 40, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2 - 27); }
          if (now < startTime) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('READY…', W / 2, H / 2 - 30); ctx.shadowBlur = 0; }
        }
        function update(dt, now) {
          const speedPct = speed / MAX_SPEED;
          const seg = road.findSegment(position + PLAYER_Z);
          const airborne = now < airborneUntil, tumbling = now < tumbleUntil;
          steerTarget = touchSteer != null ? touchSteer : (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
          steer += (steerTarget - steer) * Math.min(1, dt * 8);
          position += speed * dt;
          playerX += steer * dt * 2.3 * speedPct * (airborne ? 0.45 : 1);
          playerX -= dt * 1.6 * speedPct * speedPct * seg.curve * 0.3;
          if (!tumbling) speed += ACCEL * dt * (1 - Math.abs(steer) * 0.25); else speed -= MAX_SPEED * 1.5 * dt;
          if (Math.abs(playerX) > 1) { offSnow += dt; speed = Math.min(speed, MAX_SPEED * 0.42); }
          playerX = clamp(playerX, -1.8, 1.8);
          speed = clamp(speed, 0, MAX_SPEED);
          const pz = position + PLAYER_Z;
          for (const it of items) {
            if (it.done || it.z > pz || it.z < pz - SEG_LEN * 1.5) continue;
            it.done = true;
            if (it.kind === 'gate') { gatesTotal++; if (Math.abs(playerX - it.center) < 0.32) { gates++; sfx('tick'); say('🚩ゲート通過!', 700); } else say('ゲートをはずした…', 900); }
            else if (it.kind === 'obstacle') { if (!airborne && Math.abs(playerX - it.offset) < 0.28) { hits++; tumbleUntil = now + 650; flash = 0.6; say('💥ぶつかった!'); } }
            else if (it.kind === 'log') { if (airborne) { jumpsOk++; say('🪵ジャンプせいこう!', 800); } else if (Math.abs(playerX) < 1.05) { hits++; tumbleUntil = now + 650; flash = 0.6; say('🪵まるたにつまずいた!'); } }
            hud();
          }
          if (pz >= FINISH_INDEX * SEG_LEN) finish(true);
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          if (!running) return;
          const rem = Math.max(0, TIME_LIMIT_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const progress = clamp((position + PLAYER_Z) / (FINISH_INDEX * SEG_LEN), 0, 1);
          const gateRatio = gatesTotal ? gates / gatesTotal : 0.5;
          let score;
          if (win) { score = clamp(45 + gateRatio * 35 + Math.min(20, jumpsOk * 5) - hits * 6, 30, 100); say('🏁ゴール!ゲート' + gates + '/' + gatesTotal); }
          else { score = clamp(10 + progress * 40 + gateRatio * 10, 10, 55); say('タイムアップ…' + Math.round(progress * 100) + '%まですべった'); }
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 800);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const DOWNHILL_THEMES = [
    { title: 'スキーでゲレンデをすべりおりよう!', rider: { kind: 'ski', board: '#ff5a5a', jacket: '#2f6fed', helmet: '#f1f1f1' } },
    { title: 'スノーボードでゲレンデをすべりおりよう!', rider: { kind: 'board', board: '#ffb703', jacket: '#e63946', helmet: '#222' } },
  ];

  // --- 落ちものパズル: 左右移動・回転・高速落下・ライン消し ---
  function makeFallingBlockPuzzleGame(){
    return {start(container,onComplete){
      const W=8,H=14,board=Array.from({length:H},()=>Array(W).fill(0));
      const SHAPES=[
        [[1,1,1,1]],
        [[1,1],[1,1]],
        [[0,1,0],[1,1,1]],
        [[1,0],[1,0],[1,1]],
        [[0,1,1],[1,1,0]],
      ];
      let piece=null,px=2,py=0,lines=0,score=0,done=false,rafId;
      const startTime=performance.now()+MG_ACTION_START_GRACE_MS,DURATION_MS=mgDuration(32000);let lastDrop=startTime;
      container.innerHTML=`
        <div class="mg-header"><span id="fbTimer">のこり: 32s</span><span id="fbScore">ライン0／0pt</span></div>
        <div class="mg-title">ブロックパズル!そろえて消そう</div>
        <div class="mg-falling-wrap"><div class="mg-falling-board" id="fbBoard"></div></div>
        <div class="mg-hint" id="fbHint">◀▶で移動(おしっぱなしOK)／↻で回転／▼おしっぱなしではやくさげる／⏬で一気に</div>
        <div class="mg-falling-controls"><button class="mg-tap-btn" id="fbLeft" data-hold="step" data-key="left">◀</button><button class="mg-tap-btn" id="fbRight" data-hold="step" data-key="right">▶</button><button class="mg-tap-btn fb-rotate" id="fbRotate" data-key="up">↻かいてん</button><button class="mg-tap-btn fb-soft" id="fbSoft" data-hold="fast" data-key="down">▼さげる</button><button class="mg-tap-btn fb-hard" id="fbDrop" data-key="action">⏬いっきに</button></div>`;
      const boardEl=container.querySelector('#fbBoard'),hint=container.querySelector('#fbHint'),timer=container.querySelector('#fbTimer'),scoreEl=container.querySelector('#fbScore');
      function cloneShape(shape){return shape.map(r=>r.slice());}
      function spawn(){piece=cloneShape(SHAPES[Math.floor(Math.random()*SHAPES.length)]);px=Math.floor((W-piece[0].length)/2);py=0;if(collides(piece,px,py)){finish();return;}render();}
      function collides(shape,x,y){for(let r=0;r<shape.length;r++)for(let q=0;q<shape[r].length;q++)if(shape[r][q]){const bx=x+q,by=y+r;if(bx<0||bx>=W||by>=H||by>=0&&board[by][bx])return true;}return false;}
      function rotateShape(shape){const h=shape.length,w=shape[0].length;return Array.from({length:w},(_,x)=>Array.from({length:h},(_,y)=>shape[h-1-y][x]));}
      function lock(){sfx('pop');for(let r=0;r<piece.length;r++)for(let q=0;q<piece[r].length;q++)if(piece[r][q]&&py+r>=0)board[py+r][px+q]=1;clearLines();spawn();}
      function clearLines(){let cleared=0;for(let y=H-1;y>=0;y--){if(board[y].every(Boolean)){board.splice(y,1);board.unshift(Array(W).fill(0));cleared++;y++;}}if(cleared){sfx(cleared>=3?'levelup':'coin');lines+=cleared;score+=cleared===1?100:cleared===2?260:cleared===3?480:800;hint.textContent=cleared>=3?'✨まとめ消し!':'ラインを消した!';scoreEl.textContent='ライン'+lines+'／'+score+'pt';}}
      function render(){const cells=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){let on=board[y][x];if(piece){const ry=y-py,rx=x-px;if(ry>=0&&ry<piece.length&&rx>=0&&rx<piece[0].length&&piece[ry][rx])on=2;}cells.push('<span class="'+(on===2?'active':on===1?'fixed':'')+'"></span>');}boardEl.innerHTML=cells.join('');}
      function move(dx){if(done||!piece)return;if(!collides(piece,px+dx,py)){px+=dx;render();}}
      function rotate(){if(done||!piece)return;const r=rotateShape(piece);for(const kick of [0,-1,1,-2,2]){if(!collides(r,px+kick,py)){piece=r;px+=kick;render();return;}}hint.textContent='ここでは回せない!';}
      function softDrop(){if(done||!piece)return;if(!collides(piece,px,py+1)){py++;score+=1;render();}else lock();}
      function hardDrop(){if(done||!piece)return;sfx('hit');let n=0;while(!collides(piece,px,py+1)){py++;n++;}score+=n*2;lock();scoreEl.textContent='ライン'+lines+'／'+score+'pt';}
      container.querySelector('#fbLeft').onpointerdown=e=>{e.preventDefault();move(-1);};
      container.querySelector('#fbRight').onpointerdown=e=>{e.preventDefault();move(1);};
      container.querySelector('#fbRotate').onpointerdown=e=>{e.preventDefault();rotate();};
      container.querySelector('#fbDrop').onpointerdown=e=>{e.preventDefault();hardDrop();};
      container.querySelector('#fbSoft').onpointerdown=e=>{e.preventDefault();softDrop();};
      let swipeStart=null;
      boardEl.onpointerdown=e=>{e.preventDefault();swipeStart={x:e.clientX,y:e.clientY};try{boardEl.setPointerCapture(e.pointerId);}catch(err){}};
      boardEl.onpointerup=e=>{if(!swipeStart)return;const dx=e.clientX-swipeStart.x,dy=e.clientY-swipeStart.y;swipeStart=null;if(Math.max(Math.abs(dx),Math.abs(dy))<18){rotate();return;}if(Math.abs(dx)>Math.abs(dy))move(dx<0?-1:1);else if(dy>0)hardDrop();};
      boardEl.onpointercancel=()=>{swipeStart=null;};
      function frame(now){if(done)return;if(now<startTime){rafId=requestAnimationFrame(frame);return;}const rem=Math.max(0,DURATION_MS-(now-startTime));timer.textContent='のこり: '+Math.ceil(rem/1000)+'s';const interval=Math.max(240,620-lines*18);if(now-lastDrop>interval){lastDrop=now;softDrop();}if(rem<=0){finish();return;}rafId=requestAnimationFrame(frame);}
      function finish(){if(done)return;done=true;cancelAnimationFrame(rafId);hint.textContent='しゅうりょう!'+lines+'ライン消した';const result=clamp(35+lines*10+Math.min(25,score/80),30,100);setTimeout(()=>onComplete(Math.round(result)),650);}
      spawn();rafId=requestAnimationFrame(frame);
    }};
  }
  const FALLING_BLOCK_VARIANTS=[mg('falling-block-puzzle',makeFallingBlockPuzzleGame())];
  // --- クレーンゲーム: 横位置→奥行き→下降→キャッチ ---
  // --- クレーンゲーム(canvas UFOキャッチャー): ボタンを おしている あいだ
  //     アームが よこ→おくへ うごき、はなした ところで とまる。まんなかを
  //     つかめないと はこぶ とちゅうで おちる。おちた けいひんは その場に
  //     のこるので「ずらして」おとしぐちに ちかづける さくせんも ---
  function makeCraneGame() {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const TRIES = 3;
        const CAM_Z = -5, CAM_Y = 3.2, F_RATIO = 0.9, FLOOR_W = 3.6, FLOOR_D = 3.2;
        const CHUTE = { x: -1.35, z: 0.45, r: 0.5 };
        const prizes = [
          { emoji: '🧸', name: 'くま', x: 0.2, z: 1.0, size: 0.55, value: 30, grip: 0.95 },
          { emoji: '🎁', name: 'プレゼント', x: 1.1, z: 1.9, size: 0.5, value: 45, grip: 0.85 },
          { emoji: '👑', name: 'おうかん', x: -0.6, z: 2.4, size: 0.42, value: 70, grip: 0.6 },
          { emoji: '🍬', name: 'あめ', x: -1.0, z: 1.3, size: 0.32, value: 20, grip: 1.0 },
        ];
        let tries = TRIES, phase = 'idle', claw = { x: -1.4, z: 0.7, y: 2.6, open: 1, sway: 0 }, held = false, carrying = null, gripPower = 0, slipTimer = 0, won = [], running = true, rafId = null, last = null, msg = '', msgUntil = 0, fallers = [];
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="crTries">🪙 ×${TRIES}</span><span id="crScore">けいひん0こ／0pt</span></div>
          <div class="mg-title">UFOキャッチャー!アームで景品をつかもう</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="crCanvas"></canvas></div>
          <div class="mg-hint" id="crHint">ボタンをおしているあいだアームがうごく。けいひんのどまんなかではなそう。落ちても、左手前の落とし口に入ればゲット!</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn primary" id="crMove" data-key="action">▶よこにうごかす(ながおし)</button></div>`;
        const canvas = container.querySelector('#crCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const F = W * F_RATIO, HOR = H * 0.32;
        const triesEl = container.querySelector('#crTries'), scoreEl = container.querySelector('#crScore'), hint = container.querySelector('#crHint'), btn = container.querySelector('#crMove');
        const say = (t, ms = 1400) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function project(x, y, z) { const dz = z - CAM_Z; const s = F / dz; return { x: W / 2 + x * s, y: HOR + (CAM_Y - y) * s, s }; }
        function setPhase(p) {
          phase = p;
          if (p === 'idle') { btn.textContent = '▶よこにうごかす(ながおし)'; btn.disabled = false; }
          else if (p === 'depth') { btn.textContent = '▲おくにうごかす(ながおし)'; btn.disabled = false; }
          else { btn.disabled = true; }
        }
        bindHeldButton(btn, (v) => { if (!running) return; held = v; if (!v) onRelease(); else if (phase === 'idle') { phase = 'x'; btn.textContent = 'はなすととまる'; } else if (phase === 'depth') { phase = 'z'; btn.textContent = 'はなすととまる'; } });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || btn.disabled) return; held = true; if (phase === 'idle') { phase = 'x'; btn.textContent = 'はなすととまる'; } else if (phase === 'depth') { phase = 'z'; btn.textContent = 'はなすととまる'; } try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        const cUp = () => { if (!held) return; held = false; onRelease(); };
        canvas.addEventListener('pointerup', cUp); canvas.addEventListener('pointercancel', cUp);
        function onRelease() {
          if (phase === 'x') setPhase('depth');
          else if (phase === 'z') { setPhase('drop'); tries--; triesEl.textContent = '🪙 ×' + tries; }
        }
        function grabCheck() {
          let best = null, bestScore = 0;
          for (const p of prizes) {
            if (p.taken) continue;
            const d = Math.hypot(p.x - claw.x, p.z - claw.z);
            const align = clamp(1 - d / (p.size * 1.15), 0, 1);
            if (align > bestScore) { bestScore = align; best = p; }
          }
          if (best && bestScore > 0.15) { sfx('pop'); carrying = best; gripPower = bestScore * best.grip * lerp(1.05, 0.9, difficulty); say(bestScore > 0.75 ? '💪がっちりつかんだ!' : bestScore > 0.45 ? 'つかんだ…ちょっとふあんてい' : 'はしをつかんだ…おちそう!', 1200); }
          else { sfx('bad'); say('つかめなかった…', 1000); }
        }
        function dropPrize(p, x, z) {
          p.x = clamp(x, -FLOOR_W / 2 + p.size, FLOOR_W / 2 - p.size); p.z = clamp(z, 0.35, FLOOR_D - 0.2);
          fallers.push({ p, y: claw.y - 0.3, vy: 0 });
          if (Math.hypot(p.x - CHUTE.x, p.z - CHUTE.z) < CHUTE.r + p.size * 0.3) { p.taken = true; won.push(p); sfx('coin'); scoreEl.textContent = `けいひん${won.length}こ／${won.reduce((a, q) => a + q.value, 0)}pt`; say(`🎉 ${p.emoji} ${p.name}ゲット!`, 1600); }
        }
        function update(dt, now) {
          claw.sway = Math.sin(now / 180) * 0.03 * (held ? 1 : 0.3);
          if (phase === 'x' && held) claw.x = Math.min(FLOOR_W / 2 - 0.2, claw.x + 0.95 * dt);
          else if (phase === 'z' && held) claw.z = Math.min(FLOOR_D - 0.25, claw.z + 0.85 * dt);
          else if (phase === 'drop') { claw.open = Math.min(1, claw.open + dt * 2); claw.y -= 1.6 * dt; if (claw.y <= 0.45) { claw.y = 0.45; phase = 'close'; } }
          else if (phase === 'close') { claw.open = Math.max(0, claw.open - dt * 2.4); if (claw.open <= 0) { grabCheck(); phase = 'lift'; slipTimer = 0; } }
          else if (phase === 'lift') { claw.y += 1.2 * dt; if (carrying) { carrying.x = claw.x + claw.sway; carrying.z = claw.z; } if (claw.y >= 2.6) { claw.y = 2.6; phase = 'carry'; } }
          else if (phase === 'carry') {
            const dx = CHUTE.x - claw.x, dz = CHUTE.z - claw.z, d = Math.hypot(dx, dz);
            const sp = 0.9 * dt;
            if (d > sp) { claw.x += dx / d * sp; claw.z += dz / d * sp; } else { claw.x = CHUTE.x; claw.z = CHUTE.z; }
            if (carrying) {
              carrying.x = claw.x + claw.sway * 2; carrying.z = claw.z;
              slipTimer += dt;
              if (slipTimer > 0.35) { slipTimer = 0; if (Math.random() > gripPower + 0.12) { const p = carrying; carrying = null; claw.open = 1; sfx('bad'); say(`${p.emoji}がすべりおちた…`, 1200); dropPrize(p, claw.x, claw.z); } }
            }
            if (d <= sp) { if (carrying) { const p = carrying; carrying = null; claw.open = 1; dropPrize(p, CHUTE.x, CHUTE.z); } phase = 'return'; }
          } else if (phase === 'return') { claw.open = Math.min(1, claw.open + dt * 2); const dx = -1.4 - claw.x, dz = 0.7 - claw.z, d = Math.hypot(dx, dz); const sp = 1.2 * dt; if (d > sp) { claw.x += dx / d * sp; claw.z += dz / d * sp; } else { claw.x = -1.4; claw.z = 0.7; if (tries <= 0 || prizes.every((p) => p.taken)) { finish(); return; } setPhase('idle'); say('つぎのチャレンジ!', 800); } }
          for (const f of fallers) { f.vy += 9.8 * dt; f.y -= f.vy * dt; if (f.y <= 0) { f.y = 0; f.done = true; } }
          fallers = fallers.filter((f) => !f.done);
        }
        function drawPrize(p, y) {
          const q = project(p.x, y, p.z); const sz = p.size * 2 * q.s;
          ctx.fillStyle = 'rgba(0,0,0,.25)'; const sh = project(p.x, 0, p.z); ctx.beginPath(); ctx.ellipse(sh.x, sh.y, sz * 0.45, sz * 0.15, 0, 0, Math.PI * 2); ctx.fill();
          ctx.font = `${sz}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(p.emoji, q.x, q.y + sz * 0.05);
        }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f7d6ff'); bg.addColorStop(1, '#ffd9e8'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          const fl = project(-FLOOR_W / 2, 0, 0.2), fr = project(FLOOR_W / 2, 0, 0.2), bl = project(-FLOOR_W / 2, 0, FLOOR_D), br = project(FLOOR_W / 2, 0, FLOOR_D);
          const wall = ctx.createLinearGradient(0, 0, 0, bl.y); wall.addColorStop(0, '#cfe8ff'); wall.addColorStop(1, '#eaf6ff'); ctx.fillStyle = wall; ctx.fillRect(bl.x, 0, br.x - bl.x, bl.y);
          const floor = ctx.createLinearGradient(0, bl.y, 0, fl.y); floor.addColorStop(0, '#c9b7ff'); floor.addColorStop(1, '#e6d9ff'); ctx.fillStyle = floor; ctx.beginPath(); ctx.moveTo(fl.x, fl.y); ctx.lineTo(bl.x, bl.y); ctx.lineTo(br.x, br.y); ctx.lineTo(fr.x, fr.y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { const a = project(-FLOOR_W / 2 + FLOOR_W * i / 6, 0, 0.2), b = project(-FLOOR_W / 2 + FLOOR_W * i / 6, 0, FLOOR_D); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
          // おとしぐち
          const ch = project(CHUTE.x, 0, CHUTE.z); ctx.fillStyle = '#2a1f3d'; ctx.beginPath(); ctx.ellipse(ch.x, ch.y, CHUTE.r * ch.s, CHUTE.r * ch.s * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GET', ch.x, ch.y);
          // レール
          const rl = project(-FLOOR_W / 2, 2.9, claw.z), rr = project(FLOOR_W / 2, 2.9, claw.z); ctx.strokeStyle = '#8a8fa8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(rl.x, rl.y); ctx.lineTo(rr.x, rr.y); ctx.stroke();
          // けいひん(おくから)
          const order = prizes.filter((p) => !p.taken && p !== carrying).sort((a, b) => b.z - a.z);
          for (const p of order) { const f = fallers.find((ff) => ff.p === p); drawPrize(p, f ? f.y : 0); }
          // アーム
          const cx = claw.x + claw.sway, top = project(cx, 2.9, claw.z), head = project(cx, claw.y, claw.z);
          ctx.strokeStyle = '#555'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(head.x, head.y); ctx.stroke();
          const hs = 0.35 * head.s; ctx.fillStyle = '#ff5ea8'; mgRoundRect(ctx, head.x - hs, head.y - hs * 0.6, hs * 2, hs * 1.2, hs * 0.4); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(head.x, head.y, hs * 0.3, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#9aa3b8'; ctx.lineWidth = Math.max(2, hs * 0.22); ctx.lineCap = 'round';
          for (const side of [-1, 1]) { const spread = hs * (0.5 + claw.open * 0.9); ctx.beginPath(); ctx.moveTo(head.x + side * hs * 0.7, head.y + hs * 0.4); ctx.lineTo(head.x + side * spread, head.y + hs * 1.6); ctx.lineTo(head.x + side * spread * 0.5, head.y + hs * 2.3); ctx.stroke(); }
          if (carrying) drawPrize(carrying, claw.y - 0.7);
          // ゆびの ガイド
          if (phase === 'x' || phase === 'z') { const g = project(claw.x + claw.sway, 0, claw.z); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(head.x, head.y); ctx.lineTo(g.x, g.y); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.ellipse(g.x, g.y, 6, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
          // ガラスの ハイライト
          ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.35, 0); ctx.lineTo(0, H * 0.6); ctx.closePath(); ctx.fill();
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 100, 8, 200, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 21); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          update(dt, now);
          if (!running) return;
          render(now);
          if (now - startTime > 90000 && phase === 'idle') { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          btn.disabled = true;
          const pts = won.reduce((a, q) => a + q.value, 0);
          const score = won.length ? clamp(Math.round(40 + pts * 0.7 + tries * 5), 40, 100) : clamp(Math.round(14 + (TRIES - tries) * 2), 10, 25);
          say(won.length ? `けっか: ${won.map((p) => p.emoji).join('')} ${pts}pt` : 'けいひん0こ。アームだけ帰ってきた…', 2200);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        setPhase('idle');
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const CRANE_GAME_VARIANTS=[mg('crane-game-3d',makeCraneGame())];
  // --- ピンボール: canvas 物理版 ---
  // ボールは じゅうりょくで かならず したへ おちてくる。プランジャー(はっしゃ)を
  // ながおしで ためて うちだし、フリッパーは おしている あいだ 上がる。
  // バンパー/スリングショット/ターゲットで スコアを かせぎ、3つの ボールを
  // おとしきる まえに 目標点を めざす
  function makePinballGame(){
    return {start(container,onComplete){
      const difficulty=ageDifficulty();
      const DURATION_MS=mgDuration(Math.round(lerp(40000,32000,difficulty)));
      const GOAL=Math.round(lerp(1400,1900,difficulty)/50)*50;
      const FW=100,FH=122,BR=2.2,G=78,MAX_V=175;
      const LANE_X=90,LANE_GATE_Y=28;
      let balls=3,score=0,running=true,rafId=null,last=null,startTime=null,launched=false;
      let bx=95,by=113,vx=0,vy=0,inLane=true,charging=false,charge=0,chargeDir=1;
      let flashMsg='',flashUntil=0,shake=0,lastKick=0;
      const flippers=[
        {left:true,px:25,py:105,len:17,rest:0.5,up:-0.42,a:0.5,w:0,held:false},
        {left:false,px:65,py:105,len:17,rest:0.5,up:-0.42,a:0.5,w:0,held:false},
      ];
      const bumpers=[{x:26,y:36,r:6.2,v:100,hit:0},{x:64,y:36,r:6.2,v:100,hit:0},{x:45,y:55,r:6.6,v:150,hit:0}];
      const stars=[{x:9,y:62,lit:false,cool:0},{x:81,y:62,lit:false,cool:0}];
      // かべ(線分)。one='above' は うえから しか あたらない(レーンの 一方通行ゲート)。kick は スリングショット
      const walls=[
        {x1:0,y1:22,x2:22,y2:0},{x1:70,y1:0,x2:100,y2:21},
        {x1:LANE_X,y1:LANE_GATE_Y,x2:LANE_X,y2:FH+10},
        {x1:LANE_X,y1:LANE_GATE_Y,x2:100,y2:LANE_GATE_Y,one:'above'},
        {x1:0,y1:66,x2:25,y2:105},{x1:LANE_X,y1:66,x2:65,y2:105},
        {x1:9.6,y1:81,x2:24,y2:90,kick:true},{x1:24,y1:90,x2:17.3,y2:93},
        {x1:80.4,y1:81,x2:66,y2:90,kick:true},{x1:66,y1:90,x2:72.7,y2:93},
      ];
      container.innerHTML=`
        <div class="mg-header"><span id="pbTimer">のこり: ${Math.ceil(DURATION_MS/1000)}s</span><span id="pbScore">0／${GOAL}pt／●●●</span></div>
        <div class="mg-title">ピンボール!フリッパーではじいて${GOAL}ptをめざそう</div>
        <div class="mg-canvas-wrap mg-pinball-wrap"><canvas class="mg-canvas" id="pbCanvas"></canvas></div>
        <div class="mg-hint" id="pbHint">「はっしゃ」をながおしでためてはなす。フリッパーはおしっぱなしで上がる</div>
        <div class="mg-pinball-controls"><button class="mg-tap-btn mg-hold-btn" id="pbLeft" data-key="left">◀左</button><button class="mg-tap-btn mg-launch-btn" id="pbLaunch" data-key="action">はっしゃ</button><button class="mg-tap-btn mg-hold-btn" id="pbRight" data-key="right">右▶</button></div>`;
      const canvas=container.querySelector('#pbCanvas');
      const {ctx,W,H}=createMgCanvas(canvas,(w)=>w*FH/FW);
      const S=W/FW;
      const timer=container.querySelector('#pbTimer'),scoreEl=container.querySelector('#pbScore'),hint=container.querySelector('#pbHint');
      const launchBtn=container.querySelector('#pbLaunch');
      const say=(msg,ms=900)=>{flashMsg=msg;flashUntil=performance.now()+ms;hint.textContent=msg;};
      bindHeldButton(container.querySelector('#pbLeft'),(v)=>{flippers[0].held=v;});
      bindHeldButton(container.querySelector('#pbRight'),(v)=>{flippers[1].held=v;});
      bindHeldButton(launchBtn,(v)=>{if(!running)return;if(v){if(inLane&&!launched){charging=true;charge=0;chargeDir=1;}}else if(charging){charging=false;launch();}});
      // フィールドを タッチ: 左はんぶん=左フリッパー、右はんぶん=右フリッパー(おしている あいだ)
      const touches=new Map();
      canvas.addEventListener('pointerdown',(e)=>{e.preventDefault();const p=mgPointerPos(canvas,e);const side=p.nx<0.5?0:1;touches.set(e.pointerId,side);flippers[side].held=true;try{canvas.setPointerCapture(e.pointerId);}catch(err){}});
      const endTouch=(e)=>{const side=touches.get(e.pointerId);if(side===undefined)return;touches.delete(e.pointerId);if(![...touches.values()].includes(side))flippers[side].held=false;};
      canvas.addEventListener('pointerup',endTouch);canvas.addEventListener('pointercancel',endTouch);
      function launch(){
        if(!inLane||launched)return;
        const power=charge;
        if(power<0.18){say('よわすぎ!もっとながくためよう');charge=0;return;}
        launched=true;vy=-(96+68*power);vx=(Math.random()-.5)*4;
        if(startTime===null)startTime=performance.now();
        launchBtn.disabled=true;
        say(power>0.85?'フルパワー!':'はっしゃ!');
      }
      function resetBall(){bx=95;by=113;vx=0;vy=0;inLane=true;launched=false;charge=0;launchBtn.disabled=false;}
      function addScore(n,msg){score+=n;sfx(n>=100?'coin':'tick');if(msg)say(msg);}
      function collideSegment(w){
        if(w.one==='above'&&by>w.y1)return;
        const dx=w.x2-w.x1,dy=w.y2-w.y1,len2=dx*dx+dy*dy||1;
        let t=((bx-w.x1)*dx+(by-w.y1)*dy)/len2;t=clamp(t,0,1);
        const cx=w.x1+dx*t,cy=w.y1+dy*t;let nx=bx-cx,ny=by-cy;const d=Math.hypot(nx,ny);
        if(d>=BR||d===0)return;
        nx/=d;ny/=d;bx=cx+nx*BR;by=cy+ny*BR;
        const vn=vx*nx+vy*ny;
        if(vn<0){const e=w.kick?1.0:0.55;vx-=(1+e)*vn*nx;vy-=(1+e)*vn*ny;
          if(w.kick){const sp=Math.hypot(vx,vy);const want=Math.max(sp,70);vx=vx/sp*want;vy=vy/sp*want;const now=performance.now();if(now-lastKick>120){lastKick=now;addScore(30,'スリングショット!+30');shake=3;}}
          else{vx*=0.985;vy*=0.985;}}
      }
      function collideFlipper(f,dt){
        const dirx=(f.left?1:-1)*Math.cos(f.a),diry=Math.sin(f.a);
        const tx=f.px+dirx*f.len,ty=f.py+diry*f.len;
        const dx=tx-f.px,dy=ty-f.py,len2=dx*dx+dy*dy;
        let t=((bx-f.px)*dx+(by-f.py)*dy)/len2;t=clamp(t,0,1);
        const cx=f.px+dx*t,cy=f.py+dy*t;let nx=bx-cx,ny=by-cy;const d=Math.hypot(nx,ny);
        const R=BR+1.5;if(d>=R||d===0)return;
        nx/=d;ny/=d;bx=cx+nx*R;by=cy+ny*R;
        // フリッパー表面の そくど(かいてん × はんけい)
        const rx=cx-f.px,ry=cy-f.py,wz=f.left?f.w:-f.w;
        const sx=-wz*ry,sy=wz*rx;
        const relx=vx-sx,rely=vy-sy;const vn=relx*nx+rely*ny;
        if(vn<0){vx-=(1+0.35)*vn*nx;vy-=(1+0.35)*vn*ny;}
        const sn=sx*nx+sy*ny;
        if(sn>0){vx+=nx*sn*1.15;vy+=ny*sn*1.15;}
      }
      function step(dt){
        // フリッパーの かいてん
        for(const f of flippers){const target=f.held?f.up:f.rest;const speed=f.held?15:9;const prev=f.a;if(f.a>target)f.a=Math.max(target,f.a-speed*dt);else if(f.a<target)f.a=Math.min(target,f.a+speed*dt);f.w=(f.a-prev)/dt;}
        if(inLane&&!launched){return;}
        vy+=G*dt;
        const sp=Math.hypot(vx,vy);if(sp>MAX_V){vx*=MAX_V/sp;vy*=MAX_V/sp;}
        const sub=Math.max(1,Math.min(10,Math.ceil(sp*dt/0.9)));const h=dt/sub;
        for(let i=0;i<sub;i++){
          bx+=vx*h;by+=vy*h;
          if(bx<BR){bx=BR;vx=Math.abs(vx)*0.6;}if(bx>FW-BR){bx=FW-BR;vx=-Math.abs(vx)*0.6;}if(by<BR){by=BR;vy=Math.abs(vy)*0.6;}
          for(const w of walls)collideSegment(w);
          for(const f of flippers)collideFlipper(f,dt);
          for(const b of bumpers){let nx=bx-b.x,ny=by-b.y;const d=Math.hypot(nx,ny);if(d<b.r+BR&&d>0){nx/=d;ny/=d;bx=b.x+nx*(b.r+BR);by=b.y+ny*(b.r+BR);const vn=vx*nx+vy*ny;if(vn<0){vx-=2*vn*nx;vy-=2*vn*ny;}const s2=Math.hypot(vx,vy);const want=Math.max(s2*0.92,66);vx=vx/s2*want;vy=vy/s2*want;if(performance.now()-b.hit>140){b.hit=performance.now();addScore(b.v,'バンパー!+'+b.v);shake=4;}}}
          if(inLane&&by<LANE_GATE_Y-BR){inLane=false;say('フィールドへ!');}
        }
        for(const s of stars){if(s.cool>0)s.cool-=dt;if(!s.lit&&s.cool<=0&&Math.hypot(bx-s.x,by-s.y)<3.6+BR){s.lit=true;s.cool=1;addScore(50,'★ターゲット!+50');if(stars.every(q=>q.lit)){addScore(200,'★★ダブルボーナス!+200');setTimeout(()=>stars.forEach(q=>{q.lit=false;}),400);}}}
        if(by>FH+BR*2){balls--;shake=6;if(balls<=0){finish(false);return;}say('ボールをおとした…のこり'+balls,1400);resetBall();}
      }
      function draw(now){
        if(!ctx)return;
        ctx.save();ctx.clearRect(0,0,W,H);
        if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake=Math.max(0,shake-0.6);}
        const bg=ctx.createRadialGradient(W*.45,H*.2,10,W*.5,H*.5,H);bg.addColorStop(0,'#2f5486');bg.addColorStop(.6,'#17263c');bg.addColorStop(1,'#0b111a');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
        // レーン
        ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(LANE_X*S,LANE_GATE_Y*S,(FW-LANE_X)*S,(FH-LANE_GATE_Y)*S);
        // ドレイン(あな)
        ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(25*S,(FH-4)*S,40*S,6*S);
        // かべ
        ctx.lineCap='round';ctx.lineWidth=3;ctx.strokeStyle='#9aa8bd';
        for(const w of walls){ctx.beginPath();ctx.moveTo(w.x1*S,w.y1*S);ctx.lineTo(w.x2*S,w.y2*S);ctx.strokeStyle=w.kick?'#ff9ad1':w.one?'rgba(154,168,189,.35)':'#9aa8bd';ctx.stroke();}
        // スリングショットの 三かく
        ctx.fillStyle='rgba(255,120,190,.22)';for(const tri of [[9.6,81,24,90,17.3,93],[80.4,81,66,90,72.7,93]]){ctx.beginPath();ctx.moveTo(tri[0]*S,tri[1]*S);ctx.lineTo(tri[2]*S,tri[3]*S);ctx.lineTo(tri[4]*S,tri[5]*S);ctx.closePath();ctx.fill();}
        // ターゲット
        for(const s of stars){ctx.font=`${Math.round(6.5*S)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.globalAlpha=s.lit?1:0.45;ctx.fillStyle=s.lit?'#fff27a':'#8fa2c0';ctx.fillText('★',s.x*S,s.y*S);ctx.globalAlpha=1;}
        // バンパー
        for(const b of bumpers){const hot=now-b.hit<160;const g=ctx.createRadialGradient(b.x*S-2,b.y*S-3,1,b.x*S,b.y*S,b.r*S);g.addColorStop(0,hot?'#ffffff':'#ffe98a');g.addColorStop(1,hot?'#ffb347':'#d9741c');ctx.beginPath();ctx.arc(b.x*S,b.y*S,b.r*S*(hot?1.12:1),0,Math.PI*2);ctx.fillStyle=g;ctx.shadowColor='rgba(255,190,60,.8)';ctx.shadowBlur=hot?18:8;ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=2;ctx.strokeStyle='#fff3c4';ctx.stroke();ctx.fillStyle='#4a2a08';ctx.font=`bold ${Math.round(3.6*S)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(b.v),b.x*S,b.y*S);}
        // フリッパー
        for(const f of flippers){const dirx=(f.left?1:-1)*Math.cos(f.a),diry=Math.sin(f.a);ctx.beginPath();ctx.moveTo(f.px*S,f.py*S);ctx.lineTo((f.px+dirx*f.len)*S,(f.py+diry*f.len)*S);ctx.lineWidth=3*S;ctx.lineCap='round';ctx.strokeStyle=f.held?'#fff0a0':'#f2cf4f';ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=4;ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(f.px*S,f.py*S,1.6*S,0,Math.PI*2);ctx.fillStyle='#8a6a1c';ctx.fill();}
        // プランジャー(ため ゲージ)
        if(inLane&&!launched){const gh=(FH-118)*S;const gy=118*S;ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect((LANE_X+1)*S,gy,8*S,gh);ctx.fillStyle=charge>0.85?'#ff5c8a':charge>0.4?'#ffd257':'#8de0a0';ctx.fillRect((LANE_X+1)*S,gy+gh*(1-charge),8*S,gh*charge);
          ctx.fillStyle='rgba(255,255,255,.75)';ctx.font=`${Math.round(4*S)}px sans-serif`;ctx.textAlign='center';ctx.fillText(charging?'ため中…':'はっしゃをながおし',60*S,113*S);}
        // ボール
        const g2=ctx.createRadialGradient(bx*S-1,by*S-1.2,0.5,bx*S,by*S,BR*S);g2.addColorStop(0,'#ffffff');g2.addColorStop(.5,'#d8dee7');g2.addColorStop(1,'#6a7584');ctx.beginPath();ctx.arc(bx*S,by*S,BR*S,0,Math.PI*2);ctx.fillStyle=g2;ctx.shadowColor='rgba(255,255,255,.6)';ctx.shadowBlur=6;ctx.fill();ctx.shadowBlur=0;
        if(now<flashUntil){ctx.globalAlpha=Math.min(1,(flashUntil-now)/300);ctx.fillStyle='#fff';ctx.font=`bold ${Math.round(5*S)}px sans-serif`;ctx.textAlign='center';ctx.fillText(flashMsg,45*S,16*S);ctx.globalAlpha=1;}
        ctx.restore();
      }
      function frame(now){
        if(!running)return;
        if(last===null)last=now;const dt=Math.min(0.033,(now-last)/1000);last=now;
        if(charging)charge=Math.min(1,charge+dt/0.9);
        step(dt);
        if(!running)return;
        scoreEl.textContent=score+'／'+GOAL+'pt／'+'●'.repeat(Math.max(0,balls));
        if(startTime!==null){const rem=Math.max(0,DURATION_MS-(now-startTime));timer.textContent='のこり: '+Math.ceil(rem/1000)+'s';if(rem<=0){finish(score>=GOAL);return;}}
        if(score>=GOAL){finish(true);return;}
        draw(now);
        rafId=requestAnimationFrame(frame);
      }
      function finish(clear){
        if(!running)return;running=false;cancelAnimationFrame(rafId);
        container.querySelectorAll('button').forEach(b=>b.disabled=true);
        hint.textContent=clear?'🎉目標スコア達成!'+score+'pt':'しゅうりょう!'+score+'pt';
        draw(performance.now());
        const result=clear?clamp(74+balls*8+Math.min(10,(score-GOAL)/50),74,100):clamp(20+score/GOAL*52,20,70);
        setTimeout(()=>onComplete(Math.round(result)),750);
      }
      draw(performance.now());
      rafId=requestAnimationFrame(frame);
    }};
  }
  const PINBALL_VARIANTS=[mg('pinball-physics',makePinballGame())];
  // --- 3Dおばけ屋敷: 一人称の やしきで かぎを さがし、おいかけてくる ゆうれいから にげて 出口へ ---
  function makeHauntedHouseGame() {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 13, ROWS = 11;
        const map = generateMaze(COLS, ROWS, 5);
        const DURATION_MS = mgDuration(Math.round(lerp(70000, 55000, difficulty)));
        const SPEED = 2.4, TURN = 2.5;
        const GHOST_WANDER = 0.8, GHOST_HUNT = lerp(1.45, 1.85, difficulty);
        const start = { x: 1, y: 1 };
        const d0 = mazeBfs(map, start.x, start.y);
        const keyCell = pickFarCell(map, [d0], [start]);
        const dKey = mazeBfs(map, keyCell.x, keyCell.y);
        const exit = pickFarCell(map, [d0, dKey], [start, keyCell]);
        let px = start.x + 0.5, py = start.y + 0.5, ang = facingOpenDir(map, start.x, start.y);
        let gx = exit.x + 0.5, gy = exit.y + 0.5, gPath = [], gRepath = 0, gTarget = null;
        let hasKey = false, running = true, rafId = null, last = null, msg = '', msgUntil = 0, shake = 0, nearMs = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
        const decor = [];
        for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
          if (map[y][x] !== '.' || (x === start.x && y === start.y)) continue;
          if ((x === keyCell.x && y === keyCell.y) || (x === exit.x && y === exit.y)) continue;
          if (Math.random() < 0.12) decor.push({ x: x + 0.5, y: y + 0.5, emoji: ['🕸️', '🕯️', '🪦', '🎃'][Math.floor(Math.random() * 4)], scale: 0.32, lift: 0.3 });
        }
        container.innerHTML = `
          <div class="mg-header"><span id="hhTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="hhKey">🔑なし</span></div>
          <div class="mg-title">3Dおばけ屋敷!かぎを見つけて出口からにげろ</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="hhCanvas"></canvas></div>
          <div class="mg-hint" id="hhHint">↶↷でむきをかえ、▲ですすむ(おしっぱなしOK)。かぎをとるとゆうれいがおいかけてくる!</div>
          <div class="mg-fp-controls"><button class="mg-tap-btn" id="hhTurnL" data-key="left">↶</button><button class="mg-tap-btn primary" id="hhForward" data-key="up">▲すすむ</button><button class="mg-tap-btn" id="hhBack" data-key="down">▼</button><button class="mg-tap-btn" id="hhTurnR" data-key="right">↷</button></div>`;
        const canvas = container.querySelector('#hhCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const view = createRaycastView(ctx, W, H, { wallA: '#8c80a4', wallB: '#635878', ceilingTop: '#0a080e', ceilingBottom: '#241d30', floorFar: '#1a1622', floorNear: '#463a52', fog: 0.1, vignette: 'rgba(0,0,0,.65)' });
        const controls = bindFirstPersonControls(container, canvas, { left: '#hhTurnL', right: '#hhTurnR', fwd: '#hhForward', back: '#hhBack' });
        const timerEl = container.querySelector('#hhTimer'), keyEl = container.querySelector('#hhKey'), hint = container.querySelector('#hhHint');
        const say = (t, ms = 1500) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function ghostStep(dt, now) {
          const speed = hasKey ? GHOST_HUNT : GHOST_WANDER;
          const gcx = Math.floor(gx), gcy = Math.floor(gy);
          if (now > gRepath || !gPath.length) {
            gRepath = now + (hasKey ? 350 : 900);
            let target;
            if (hasKey) target = { x: Math.floor(px), y: Math.floor(py) };
            else {
              if (!gTarget || (gTarget.x === gcx && gTarget.y === gcy) || Math.random() < 0.15) {
                const cand = [];
                for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) if (map[y][x] === '.') cand.push({ x, y });
                gTarget = cand[Math.floor(Math.random() * cand.length)];
              }
              target = gTarget;
            }
            const dist = mazeBfs(map, target.x, target.y);
            gPath = [];
            let cx = gcx, cy = gcy, guard = 0;
            while (dist[cy][cx] > 0 && guard++ < 200) {
              let next = null;
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = cx + dx, ny = cy + dy;
                if (map[ny] && map[ny][nx] === '.' && dist[ny][nx] >= 0 && dist[ny][nx] < dist[cy][cx]) { next = { x: nx, y: ny }; break; }
              }
              if (!next) break;
              gPath.push(next); cx = next.x; cy = next.y;
            }
          }
          const goal = gPath.length ? { x: gPath[0].x + 0.5, y: gPath[0].y + 0.5 } : (hasKey ? { x: px, y: py } : null);
          if (!goal) return;
          const dx = goal.x - gx, dy = goal.y - gy, d = Math.hypot(dx, dy);
          const stepLen = Math.min(d, speed * dt);
          if (d > 1e-4) { gx += dx / d * stepLen; gy += dy / d * stepLen; }
          if (d <= speed * dt + 0.02 && gPath.length) gPath.shift();
        }
        function sprites(now) {
          const bob = Math.sin(now / 260) * 0.04;
          const list = decor.slice();
          if (!hasKey) list.push({ x: keyCell.x + 0.5, y: keyCell.y + 0.5, emoji: '🔑', scale: 0.45, lift: 0.28 + bob, glow: 'rgba(255,230,120,.95)' });
          list.push({ x: exit.x + 0.5, y: exit.y + 0.5, emoji: '🚪', scale: 0.85, lift: 0.02, glow: hasKey ? 'rgba(120,255,160,.9)' : undefined });
          const flicker = 0.75 + Math.sin(now / 90) * 0.15;
          list.push({ x: gx, y: gy, emoji: '👻', scale: 0.7, lift: 0.22 + bob * 2, alpha: flicker, glow: 'rgba(200,200,255,.9)' });
          return list;
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          let ghostDist = Math.hypot(gx - px, gy - py);
          if (now >= startTime) {
            ang += controls.turn() * TURN * dt + controls.consumeDragTurn();
            const mv = controls.move() * SPEED * dt;
            if (mv !== 0) [px, py] = rcMove(map, px, py, Math.cos(ang) * mv, Math.sin(ang) * mv);
            markSeen(seen, map, px, py);
            ghostStep(dt, now);
            const cx = Math.floor(px), cy = Math.floor(py);
            if (!hasKey && cx === keyCell.x && cy === keyCell.y) { hasKey = true; sfx('coin'); keyEl.textContent = '🔑もってる'; say('🔑かぎをとった!ゆうれいがきづいた…出口へにげろ!', 2200); shake = 4; }
            ghostDist = Math.hypot(gx - px, gy - py);
            if (ghostDist < 0.55) { finish('caught'); return; }
            if (cx === exit.x && cy === exit.y) { if (hasKey) { finish('escaped'); return; } if (now > msgUntil) say('🚪かぎがかかっている!先に🔑をさがそう'); }
          }
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          if (rem <= 0) { finish('timeout'); return; }
          const danger = hasKey && ghostDist < 3.5;
          if (danger) nearMs += dt * 1000;
          if (ctx) {
            ctx.save();
            if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake = Math.max(0, shake - 0.5); }
            const pulse = danger ? 0.35 + 0.3 * Math.abs(Math.sin(now / 160)) : 0;
            view.render(map, px, py, ang, sprites(now), { vignette: danger ? `rgba(120,0,25,${0.55 + pulse})` : undefined });
            ctx.restore();
            const ghostSeen = ghostDist < 4;
            view.drawMinimap(map, px, py, ang, seen, [
              { x: keyCell.x, y: keyCell.y, color: '#ffd45c', hidden: hasKey || !seen[keyCell.y][keyCell.x] },
              { x: exit.x, y: exit.y, color: '#7dff9a', hidden: !seen[exit.y][exit.x] },
              { x: Math.floor(gx), y: Math.floor(gy), color: '#d6d0ff', hidden: !ghostSeen },
            ]);
            if (hasKey) view.drawCompass(px, py, ang, exit.x + 0.5, exit.y + 0.5, '出口', '#7dff9a');
            else view.drawCompass(px, py, ang, keyCell.x + 0.5, keyCell.y + 0.5, 'かぎ', '#ffd45c');
            if (now < msgUntil) view.drawMessage(msg, Math.min(1, (msgUntil - now) / 300));
            else if (now < startTime) view.drawMessage('🔑を見つけて🚪からだっしゅつ!');
            else if (danger) view.drawMessage('👻ちかい!にげろ!');
          }
          rafId = requestAnimationFrame(frame);
        }
        function finish(result) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const elapsedSec = Math.max(0, performance.now() - startTime) / 1000;
          let score;
          if (result === 'escaped') { score = clamp(100 - Math.max(0, elapsedSec - 25) * 1.4, 70, 100); say('🚪だっしゅつせいこう!'); }
          else if (result === 'caught') { score = hasKey ? 34 : 22; say('👻つかまった…'); shake = 8; }
          else { score = hasKey ? 40 : 25; say('じかんぎれ…やしきにとじこめられた'); }
          if (ctx) { view.render(map, px, py, ang, sprites(performance.now()), { vignette: result === 'escaped' ? 'rgba(20,60,20,.6)' : 'rgba(80,0,20,.8)' }); view.drawMessage(hint.textContent); }
          setTimeout(() => onComplete(Math.round(score)), 900);
        }
        markSeen(seen, map, px, py);
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const HAUNTED_HOUSE_VARIANTS=[mg('haunted-house-3d',makeHauntedHouseGame())];
  // ================================================================
  // 3D新作: レース / リズムハイウェイ / たまころがし迷路 / スペースガンナー
  // (すべて canvas 2D + requestAnimationFrame。外部ライブラリなし)
  // ================================================================

  // --- ぎじ3D ロードエンジン(3Dレース・ゲレンデ きょうつう) ---
  // セグメントごとの カーブ/おかを カメラから とうえいして、手前から
  // おくへ ならぶ 台形で 道を 描く。スプライトは 道はば きじゅんの
  // offset(0=まん中, ±1=道はし)と size(道はば に たいする わりあい)で おく
  function createPseudoRoad(ctx, W, H, opts) {
    const SEG_LEN = 200, ROAD_W = opts.roadWidth || 1100, RUMBLE = 3, CAM_H = 1000, DRAW_DIST = opts.drawDistance || 70;
    const CAM_DEPTH = 1 / Math.tan((100 / 2) * Math.PI / 180);
    const PLAYER_Z = CAM_H * CAM_DEPTH;
    const segments = [];
    const easeIn = (a, b, p) => a + (b - a) * p * p;
    const easeInOut = (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + 0.5);
    const lastY = () => (segments.length ? segments[segments.length - 1].p2.world.y : 0);
    function addSeg(curve, y) {
      const n = segments.length;
      segments.push({ index: n, p1: { world: { y: lastY(), z: n * SEG_LEN }, camera: {}, screen: {} }, p2: { world: { y, z: (n + 1) * SEG_LEN }, camera: {}, screen: {} }, curve, sprites: [], dynamic: [], dark: Math.floor(n / RUMBLE) % 2 === 0, clip: 0 });
    }
    function addRoad(enter, hold, leave, curve, hill) {
      const startY = lastY(), endY = startY + hill * SEG_LEN, total = enter + hold + leave;
      for (let n = 0; n < enter; n++) addSeg(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
      for (let n = 0; n < hold; n++) addSeg(curve, easeInOut(startY, endY, (enter + n) / total));
      for (let n = 0; n < leave; n++) addSeg(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    }
    const findSegment = (z) => segments[Math.floor(Math.max(0, z) / SEG_LEN) % segments.length];
    const trackLength = () => segments.length * SEG_LEN;
    function project(p, camX, camY, camZ) {
      p.camera.x = (p.world.x || 0) - camX; p.camera.y = p.world.y - camY; p.camera.z = p.world.z - camZ;
      p.screen.scale = CAM_DEPTH / Math.max(1, p.camera.z);
      p.screen.x = W / 2 + p.screen.scale * p.camera.x * W / 2;
      p.screen.y = H / 2 - p.screen.scale * p.camera.y * H / 2;
      p.screen.w = p.screen.scale * ROAD_W * W / 2;
    }
    function polygon(x1, y1, x2, y2, x3, y3, x4, y4, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill(); }
    function drawSegment(seg) {
      const p1 = seg.p1.screen, p2 = seg.p2.screen;
      const c = opts.colors(seg.dark);
      const r1 = p1.w * (c.rumbleWidth || 1 / 6), r2 = p2.w * (c.rumbleWidth || 1 / 6), l1 = p1.w / 28, l2 = p2.w / 28;
      ctx.fillStyle = c.grass; ctx.fillRect(0, p2.y, W, p1.y - p2.y);
      if (c.rumble) {
        polygon(p1.x - p1.w - r1, p1.y, p1.x - p1.w, p1.y, p2.x - p2.w, p2.y, p2.x - p2.w - r2, p2.y, c.rumble);
        polygon(p1.x + p1.w + r1, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x + p2.w + r2, p2.y, c.rumble);
      }
      polygon(p1.x - p1.w, p1.y, p1.x + p1.w, p1.y, p2.x + p2.w, p2.y, p2.x - p2.w, p2.y, c.road);
      if (c.lane) polygon(p1.x - l1, p1.y, p1.x + l1, p1.y, p2.x + l2, p2.y, p2.x - l2, p2.y, c.lane);
    }
    // position: カメラの きょり、playerX: 道はば きじゅんの よこ位置(-1..1 が 道の うえ)
    function render(position, playerX) {
      const baseSeg = findSegment(position);
      const basePercent = (position % SEG_LEN) / SEG_LEN;
      const playerSeg = findSegment(position + PLAYER_Z);
      const playerPercent = ((position + PLAYER_Z) % SEG_LEN) / SEG_LEN;
      const playerY = playerSeg.p1.world.y + (playerSeg.p2.world.y - playerSeg.p1.world.y) * playerPercent;
      let maxy = H, x = 0, dx = -(baseSeg.curve * basePercent);
      const len = trackLength();
      for (let n = 0; n < DRAW_DIST; n++) {
        const seg = segments[(baseSeg.index + n) % segments.length];
        const looped = seg.index < baseSeg.index;
        seg.clip = maxy;
        project(seg.p1, playerX * ROAD_W - x, playerY + CAM_H, position - (looped ? len : 0));
        x += dx; dx += seg.curve;
        project(seg.p2, playerX * ROAD_W - x, playerY + CAM_H, position - (looped ? len : 0));
        if (seg.p1.camera.z <= CAM_DEPTH || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;
        drawSegment(seg);
        maxy = seg.p1.screen.y;
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      for (let n = DRAW_DIST - 1; n > 0; n--) {
        const seg = segments[(baseSeg.index + n) % segments.length];
        if (seg.p1.camera.z <= CAM_DEPTH) continue;
        const scale = seg.p1.screen.scale;
        const drawOne = (s) => {
          const sx = seg.p1.screen.x + scale * s.offset * ROAD_W * W / 2;
          const sy = seg.p1.screen.y;
          if (sy > seg.clip + 2) return;
          const px = Math.max(3, scale * ROAD_W * W / 2 * s.size);
          if (s.draw) s.draw(ctx, sx, sy, px, s);
          else { ctx.font = `${px}px sans-serif`; ctx.fillText(s.emoji, sx, sy + px * 0.08); }
        };
        for (const s of seg.sprites) drawOne(s);
        for (const s of seg.dynamic) drawOne(s);
      }
      return { baseSeg, playerSeg, playerY };
    }
    return { SEG_LEN, ROAD_W, PLAYER_Z, segments, addRoad, addSeg, lastY, findSegment, trackLength, render };
  }
  function mgRoundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h); ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr); ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath(); ctx.fill();
  }
  function mgShade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * k), g = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k);
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  // うしろから 見た くるま(しんこう方向を むいている)。x,y は そこの まん中
  function drawRearCar(ctx, x, y, w, color, lean = 0, sporty = false) {
    const h = w * 0.62;
    ctx.save(); ctx.translate(x, y); ctx.rotate(lean * 0.08);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, -h * 0.02, w * 0.56, h * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1b21'; mgRoundRect(ctx, -w * 0.52, -h * 0.42, w * 0.18, h * 0.44, w * 0.04); mgRoundRect(ctx, w * 0.34, -h * 0.42, w * 0.18, h * 0.44, w * 0.04);
    ctx.fillStyle = color; mgRoundRect(ctx, -w * 0.46, -h * 0.78, w * 0.92, h * 0.72, w * 0.08);
    ctx.fillStyle = mgShade(color, 0.72); mgRoundRect(ctx, -w * 0.46, -h * 0.3, w * 0.92, h * 0.22, w * 0.04);
    if (sporty) { ctx.fillStyle = mgShade(color, 0.6); mgRoundRect(ctx, -w * 0.42, -h * 1.02, w * 0.84, h * 0.08, w * 0.02); ctx.fillRect(-w * 0.4, -h * 1.02, w * 0.05, h * 0.26); ctx.fillRect(w * 0.35, -h * 1.02, w * 0.05, h * 0.26); }
    ctx.fillStyle = mgShade(color, 0.85); mgRoundRect(ctx, -w * 0.32, -h * 1.06, w * 0.64, h * 0.4, w * 0.08);
    ctx.fillStyle = 'rgba(70,90,120,.92)'; mgRoundRect(ctx, -w * 0.28, -h * 1.0, w * 0.56, h * 0.28, w * 0.05);
    ctx.fillStyle = '#ff5a4a'; mgRoundRect(ctx, -w * 0.42, -h * 0.66, w * 0.16, h * 0.13, w * 0.02); mgRoundRect(ctx, w * 0.26, -h * 0.66, w * 0.16, h * 0.13, w * 0.02);
    ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-w * 0.1, -h * 0.5, w * 0.2, h * 0.1);
    ctx.restore();
  }
  // うしろから 見た スキーヤー/スノーボーダー。lean で かたむく、air で うかぶ
  function drawRider(ctx, x, y, w, style, lean = 0, air = 0) {
    const h = w * 1.35;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.5 * (1 - air * 0.35), h * 0.08 * (1 - air * 0.35), 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, -air * h * 0.55); ctx.rotate(lean * 0.35);
    ctx.fillStyle = style.board;
    if (style.kind === 'ski') { mgRoundRect(ctx, -w * 0.42, -h * 0.08, w * 0.3, h * 0.08, w * 0.04); mgRoundRect(ctx, w * 0.12, -h * 0.08, w * 0.3, h * 0.08, w * 0.04); }
    else { mgRoundRect(ctx, -w * 0.5, -h * 0.1, w * 1.0, h * 0.1, w * 0.06); }
    ctx.fillStyle = '#2b2f3a'; mgRoundRect(ctx, -w * 0.28, -h * 0.5, w * 0.2, h * 0.45, w * 0.05); mgRoundRect(ctx, w * 0.08, -h * 0.5, w * 0.2, h * 0.45, w * 0.05);
    ctx.fillStyle = style.jacket; mgRoundRect(ctx, -w * 0.34, -h * 0.95, w * 0.68, h * 0.5, w * 0.12);
    ctx.fillStyle = mgShade(style.jacket, 0.75); ctx.fillRect(-w * 0.34, -h * 0.72, w * 0.68, h * 0.06);
    ctx.fillStyle = style.helmet; ctx.beginPath(); ctx.arc(0, -h * 1.05, w * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe1b8'; ctx.fillRect(-w * 0.12, -h * 1.02, w * 0.24, h * 0.07);
    if (style.kind === 'ski') { ctx.strokeStyle = '#888'; ctx.lineWidth = Math.max(1, w * 0.04); ctx.beginPath(); ctx.moveTo(-w * 0.4, -h * 0.75); ctx.lineTo(-w * 0.5, -h * 0.1); ctx.moveTo(w * 0.4, -h * 0.75); ctx.lineTo(w * 0.5, -h * 0.1); ctx.stroke(); }
    ctx.restore();
  }

  // --- 3Dレース: ぎじ3Dの ロードを はしり、カーブの えんしんりょくと
  //     こうつうを さばきながら 時間内に ゴールを めざす ---
  function makeRoadRaceGame({ title, playerColor, trafficColors, sceneryEmojis, sky, ground, road: roadColors, rumble }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const TIME_LIMIT_MS = mgDuration(Math.round(lerp(52000, 44000, difficulty)));
        const CENTRIFUGAL = 0.26;
        let position = 0, speed = 0, playerX = 0, steer = 0, steerTarget = 0, accelHeld = false, touchAccel = false, touchSteer = null;
        let hits = 0, offroadTime = 0, running = true, rafId = null, last = null, flash = 0, msg = '', msgUntil = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="rcTimer">のこり: ${Math.ceil(TIME_LIMIT_MS / 1000)}s</span><span id="rcSpeed">0 km/h</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="rcCanvas"></canvas></div>
          <div class="mg-hint" id="rcHint">アクセルをおしっぱなしでかそく。カーブでは外にふられるので◀▶でおさえよう</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="rcLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn primary" id="rcAccel" data-key="action">アクセル</button><button class="mg-tap-btn mg-hold-btn" id="rcRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#rcCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const road = createPseudoRoad(ctx, W, H, { colors: (dark) => (dark ? { grass: ground[0], rumble: rumble[0], road: roadColors[0], lane: '#fff8c8' } : { grass: ground[1], rumble: rumble[1], road: roadColors[1] }) });
        const { SEG_LEN, PLAYER_Z, segments } = road;
        // あそびやすさ優先: さいこう速度は ひかえめ(以前は SEG_LEN*60 で はやすぎた)
        const MAX_SPEED = SEG_LEN * 36;
        const ACCEL = MAX_SPEED / 3.0, COAST = -MAX_SPEED / 4.5, OFF_DECEL = -MAX_SPEED / 1.4, OFF_LIMIT = MAX_SPEED / 4;
        road.addRoad(10, 25, 10, 0, 0);
        for (let i = 0; i < 6; i++) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          const curve = dir * (1.6 + Math.random() * 2.6 + difficulty * 1.2);
          road.addRoad(12 + Math.floor(Math.random() * 10), 14 + Math.floor(Math.random() * 14), 12 + Math.floor(Math.random() * 10), curve, (Math.random() - 0.5) * 60);
          if (Math.random() < 0.6) road.addRoad(8, 8 + Math.floor(Math.random() * 12), 8, 0, (Math.random() - 0.5) * 40);
        }
        road.addRoad(10, 40, 10, 0, -road.lastY() / SEG_LEN);
        const FINISH_INDEX = segments.length - 12;
        const TRACK_LEN = road.trackLength();
        for (let n = 0; n < FINISH_INDEX; n += 3) {
          if (Math.random() < 0.7) segments[n].sprites.push({ emoji: sceneryEmojis[Math.floor(Math.random() * sceneryEmojis.length)], offset: -1.4 - Math.random() * 1.6, size: 0.55 });
          if (Math.random() < 0.7) segments[n].sprites.push({ emoji: sceneryEmojis[Math.floor(Math.random() * sceneryEmojis.length)], offset: 1.4 + Math.random() * 1.6, size: 0.55 });
        }
        for (let n = FINISH_INDEX; n < FINISH_INDEX + 2; n++) { segments[n].sprites.push({ emoji: '🏁', offset: -1.25, size: 0.5 }); segments[n].sprites.push({ emoji: '🏁', offset: 1.25, size: 0.5 }); }
        const cars = [];
        const carCount = Math.round(lerp(9, 14, difficulty));
        for (let i = 0; i < carCount; i++) {
          const z = (30 + Math.random() * (FINISH_INDEX - 45)) * SEG_LEN;
          if (cars.some((c) => Math.abs(c.z - z) < SEG_LEN * 5)) { i--; continue; }
          const color = trafficColors[Math.floor(Math.random() * trafficColors.length)];
          cars.push({ z, offset: (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.5), speed: MAX_SPEED * (0.28 + Math.random() * 0.3), size: 0.32, draw: (c, sx, sy, px) => drawRearCar(c, sx, sy, px, color, 0, false) });
        }
        const timerEl = container.querySelector('#rcTimer'), speedEl = container.querySelector('#rcSpeed'), hint = container.querySelector('#rcHint');
        let leftHeld = false, rightHeld = false;
        bindHeldButton(container.querySelector('#rcLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#rcRight'), (v) => { rightHeld = v; });
        bindHeldButton(container.querySelector('#rcAccel'), (v) => { accelHeld = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} touchAccel = true; touchSteer = clamp((mgPointerPos(canvas, e).nx - 0.5) * 2.6, -1, 1); });
        canvas.addEventListener('pointermove', (e) => { if (!touchAccel) return; touchSteer = clamp((mgPointerPos(canvas, e).nx - 0.5) * 2.6, -1, 1); });
        const endTouch = () => { touchAccel = false; touchSteer = null; };
        canvas.addEventListener('pointerup', endTouch); canvas.addEventListener('pointercancel', endTouch);
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function render(now) {
          if (!ctx) return;
          const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.6); skyG.addColorStop(0, sky[0]); skyG.addColorStop(1, sky[1]);
          ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          for (let i = 0; i < 5; i++) { const cx = ((i * 97 + 20) - (position / 400) * 0.35) % (W + 60); ctx.beginPath(); ctx.ellipse((cx + W + 60) % (W + 60) - 30, 22 + i * 9, 22, 7, 0, 0, Math.PI * 2); ctx.fill(); }
          road.render(position, playerX);
          const bounce = speed > 0 ? (Math.random() - 0.5) * 1.4 * (speed / MAX_SPEED) : 0;
          drawRearCar(ctx, W / 2 + steer * 5, H - 8 + bounce, 46, playerColor, steer, true);
          const progress = clamp((position + PLAYER_Z) / (FINISH_INDEX * SEG_LEN), 0, 1);
          ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(8, 8, W - 16, 8);
          ctx.fillStyle = '#7dff9a'; ctx.fillRect(8, 8, (W - 16) * progress, 8);
          ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
          ctx.fillText('🏁 ' + Math.round(progress * 100) + '%', 8, 19);
          if (flash > 0) { ctx.fillStyle = `rgba(255,80,80,${flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - 0.04); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 90, H / 2 - 40, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2 - 27); }
        }
        function update(dt) {
          const speedPct = speed / MAX_SPEED;
          const playerSeg = road.findSegment(position + PLAYER_Z);
          steerTarget = touchSteer != null ? touchSteer : (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
          steer += (steerTarget - steer) * Math.min(1, dt * 9);
          position += speed * dt;
          playerX += steer * dt * 2.1 * speedPct;
          playerX -= dt * 2 * speedPct * speedPct * playerSeg.curve * CENTRIFUGAL;
          if (accelHeld || touchAccel) speed += ACCEL * dt; else speed += COAST * dt;
          const offroad = Math.abs(playerX) > 1;
          if (offroad) { offroadTime += dt; if (speed > OFF_LIMIT) speed += OFF_DECEL * dt; }
          playerX = clamp(playerX, -2.2, 2.2);
          speed = clamp(speed, 0, MAX_SPEED);
          for (const seg of segments) seg.dynamic.length = 0;
          for (const c of cars) {
            c.z += c.speed * dt;
            if (c.z >= TRACK_LEN) c.z -= TRACK_LEN;
            road.findSegment(c.z).dynamic.push(c);
            const rel = c.z - (position + PLAYER_Z);
            if (rel > -SEG_LEN * 0.6 && rel < SEG_LEN * 1.2 && Math.abs(playerX - c.offset) < 0.34 && speed > c.speed) {
              speed = c.speed * 0.6; hits++; flash = 0.5; sfx('hit'); say('💥ぶつかった!');
              c.z += SEG_LEN * 2;
            }
          }
          speedEl.textContent = Math.round(speedPct * 180) + ' km/h';
          if (position + PLAYER_Z >= FINISH_INDEX * SEG_LEN) finish(true);
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt);
          if (!running) return;
          const rem = Math.max(0, TIME_LIMIT_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (now < startTime && ctx) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('READY…', W / 2, H / 2 - 30); ctx.shadowBlur = 0; }
          if (rem <= 0) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const remRatio = clamp(1 - (performance.now() - startTime) / TIME_LIMIT_MS, 0, 1);
          const progress = clamp((position + PLAYER_Z) / (FINISH_INDEX * SEG_LEN), 0, 1);
          let score;
          if (win) { score = clamp(62 + remRatio * 34 - hits * 5 - Math.min(12, offroadTime * 2), 55, 100); say('🏁ゴール!' + (hits === 0 ? 'ノーミス!' : 'しょうとつ' + hits + 'かい')); }
          else { score = clamp(14 + progress * 44, 14, 58); say('タイムアップ…' + Math.round(progress * 100) + '%まではしった'); }
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 800);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const RACE_THEMES = [
    { title: '3Dレース!ハイウェイをはしりぬけゴールへ', playerColor: '#e63946', trafficColors: ['#3a86ff', '#ffbe0b', '#8ecae6', '#f4f1de', '#6a994e'], sceneryEmojis: ['🌴', '🌳', '🏢', '🪧'], sky: ['#69b7ff', '#d9f1ff'], ground: ['#4f9f4a', '#5aae52'], road: ['#5c5c66', '#63636d'], rumble: ['#f3f3f3', '#d8383c'] },
    { title: '3Dレース!さばくのラリーでゴールをめざせ', playerColor: '#ff8c1a', trafficColors: ['#9d8189', '#d8e2dc', '#5c4033', '#457b9d'], sceneryEmojis: ['🌵', '🪨', '🏜️', '🌵'], sky: ['#ffb366', '#ffe6b3'], ground: ['#d9b36a', '#e2bf78'], road: ['#8a7355', '#93795a'], rumble: ['#f2e2c4', '#c0392b'] },
    { title: '3Dレース!よるのネオンハイウェイをかけぬけろ', playerColor: '#b5179e', trafficColors: ['#4cc9f0', '#f72585', '#ffd60a', '#e0e0e0'], sceneryEmojis: ['🏙️', '🌃', '🗼', '🏬'], sky: ['#0b1030', '#3a2a6b'], ground: ['#1e2740', '#242e4a'], road: ['#2f3140', '#353748'], rumble: ['#8f9bff', '#ff4fa3'] },
  ];
  const ROAD_RACE_VARIANTS = [mg('race-3d', randomThemeGame(makeRoadRaceGame, RACE_THEMES))];

  // --- 3Dリズムハイウェイ: おくから ながれてくる ノーツを 3レーンで
  //     ジャストタイミングで たたく ---
  function makeRhythmHighwayGame({ title, noteEmojis, colors }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const BPM = lerp(96, 126, difficulty), BEAT = 60000 / BPM, APPROACH = lerp(1700, 1350, difficulty);
        const LENGTH_MS = 26000;
        const notes = [];
        let lastLane = -1, sameCount = 0;
        for (let t = 2200, k = 0; t < LENGTH_MS - 1200; t += BEAT / 2, k++) {
          const onBeat = k % 2 === 0;
          const p = onBeat ? lerp(0.55, 0.78, difficulty) : lerp(0.18, 0.45, difficulty);
          if (Math.random() >= p) continue;
          let lane = Math.floor(Math.random() * 3);
          if (lane === lastLane) { sameCount++; if (sameCount >= 2) { lane = (lane + 1 + Math.floor(Math.random() * 2)) % 3; sameCount = 0; } } else sameCount = 0;
          lastLane = lane;
          notes.push({ t, lane, hit: false, missed: false, emoji: noteEmojis[lane] });
          if (onBeat && Math.random() < lerp(0.04, 0.22, difficulty)) notes.push({ t, lane: (lane + 1 + Math.floor(Math.random() * 2)) % 3, hit: false, missed: false, emoji: noteEmojis[(lane + 1) % 3] });
        }
        const total = notes.length;
        let perfect = 0, good = 0, miss = 0, combo = 0, maxCombo = 0, running = true, rafId = null;
        let judge = '', judgeUntil = 0, judgeColor = '#fff';
        const laneFlash = [0, 0, 0];
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        const effects = [];
        container.innerHTML = `
          <div class="mg-header"><span id="rhScore">PERFECT 0／GOOD 0／MISS 0</span><span id="rhCombo">コンボ0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="rhCanvas"></canvas></div>
          <div class="mg-hint" id="rhHint">ノーツが手前のラインにかさなったしゅんかんに、そのレーンのボタンをタップ!</div>
          <div class="mg-rhythm-controls"><button class="mg-tap-btn" id="rhL" data-key="left">◀ ${noteEmojis[0]}</button><button class="mg-tap-btn" id="rhM" data-key="action">${noteEmojis[1]}</button><button class="mg-tap-btn" id="rhR" data-key="right">${noteEmojis[2]} ▶</button></div>`;
        const canvas = container.querySelector('#rhCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const scoreEl = container.querySelector('#rhScore'), comboEl = container.querySelector('#rhCombo'), hint = container.querySelector('#rhHint');
        const HORIZON = 34, LINE_Y = H - 34;
        const laneX = (lane, p) => { const far = W / 2 + (lane - 1) * W * 0.07, near = W / 2 + (lane - 1) * W * 0.3; return far + (near - far) * p; };
        const laneY = (p) => HORIZON + (LINE_Y - HORIZON) * p;
        function press(lane) {
          if (!running) return;
          const now = performance.now() - startTime;
          laneFlash[lane] = 1;
          let best = null;
          for (const n of notes) { if (n.hit || n.missed || n.lane !== lane) continue; const d = Math.abs(n.t - now); if (d <= 170 && (!best || d < best.d)) best = { n, d }; }
          if (!best) { setJudge('…', '#aab'); sfx('tick'); return; }
          best.n.hit = true; combo++; maxCombo = Math.max(maxCombo, combo);
          if (best.d <= 60) { perfect++; sfx('coin'); setJudge('PERFECT!', '#ffe36e'); effects.push({ lane, born: now, color: '#ffe36e' }); }
          else { good++; sfx('pop'); setJudge('GOOD', '#8ef0ff'); effects.push({ lane, born: now, color: '#8ef0ff' }); }
          updateHud();
        }
        function setJudge(t, c) { judge = t; judgeColor = c; judgeUntil = performance.now() + 420; }
        function updateHud() { scoreEl.textContent = `PERFECT ${perfect}／GOOD ${good}／MISS ${miss}`; comboEl.textContent = 'コンボ' + combo; }
        ['#rhL', '#rhM', '#rhR'].forEach((id, i) => container.querySelector(id).addEventListener('pointerdown', (e) => { e.preventDefault(); press(i); }));
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); press(p.nx < 1 / 3 ? 0 : p.nx > 2 / 3 ? 2 : 1); });
        function render(now) {
          if (!ctx) return;
          const beatPhase = ((now % BEAT) / BEAT);
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, colors[0]); bg.addColorStop(1, colors[1]);
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = `rgba(255,255,255,${0.08 * (1 - beatPhase)})`; ctx.fillRect(0, 0, W, H);
          // ハイウェイ
          ctx.fillStyle = 'rgba(0,0,0,.35)';
          ctx.beginPath(); ctx.moveTo(laneX(0, 0) - W * 0.045, HORIZON); ctx.lineTo(laneX(2, 0) + W * 0.045, HORIZON); ctx.lineTo(laneX(2, 1) + W * 0.17, H); ctx.lineTo(laneX(0, 1) - W * 0.17, H); ctx.closePath(); ctx.fill();
          for (let lane = 0; lane < 3; lane++) {
            if (laneFlash[lane] > 0) { ctx.fillStyle = `rgba(255,255,255,${laneFlash[lane] * 0.22})`; ctx.beginPath(); ctx.moveTo(laneX(lane, 0) - W * 0.04, HORIZON); ctx.lineTo(laneX(lane, 0) + W * 0.04, HORIZON); ctx.lineTo(laneX(lane, 1) + W * 0.16, H); ctx.lineTo(laneX(lane, 1) - W * 0.16, H); ctx.closePath(); ctx.fill(); laneFlash[lane] = Math.max(0, laneFlash[lane] - 0.08); }
          }
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
          for (const edge of [-0.5, 0.5, 1.5, 2.5]) { ctx.beginPath(); ctx.moveTo(laneX(edge, 0), HORIZON); ctx.lineTo(laneX(edge, 1), H); ctx.stroke(); }
          for (let i = 0; i < 6; i++) { const p = ((i / 6 + beatPhase / 6) % 1); const pp = p * p; ctx.strokeStyle = `rgba(255,255,255,${0.1 + pp * 0.25})`; ctx.beginPath(); ctx.moveTo(laneX(-0.5, pp), laneY(pp)); ctx.lineTo(laneX(2.5, pp), laneY(pp)); ctx.stroke(); }
          // 判定ライン
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(laneX(-0.5, 1), LINE_Y); ctx.lineTo(laneX(2.5, 1), LINE_Y); ctx.stroke(); ctx.shadowBlur = 0;
          for (let lane = 0; lane < 3; lane++) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(laneX(lane, 1), LINE_Y, 15, 0, Math.PI * 2); ctx.stroke(); }
          // ノーツ
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (const n of notes) {
            const z = 1 - (n.t - now) / APPROACH;
            if (z < 0 || z > 1.18 || n.hit) continue;
            const p = z * z;
            const size = 8 + 26 * p;
            ctx.globalAlpha = n.missed ? 0.3 : Math.min(1, 0.3 + z);
            ctx.font = `${size}px sans-serif`;
            ctx.fillText(n.emoji, laneX(n.lane, Math.min(1.18, p)), laneY(Math.min(1.18, p)));
            ctx.globalAlpha = 1;
          }
          for (const fx of effects) { const age = (now - fx.born) / 350; if (age > 1) continue; ctx.strokeStyle = fx.color; ctx.globalAlpha = 1 - age; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(laneX(fx.lane, 1), LINE_Y, 15 + age * 26, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
          if (performance.now() < judgeUntil) { ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = judgeColor; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText(judge, W / 2, H / 2 - 6); ctx.shadowBlur = 0; }
          if (combo >= 5) { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 5; ctx.fillText(combo + ' COMBO', W / 2, H / 2 + 20); ctx.shadowBlur = 0; }
          if (now < 0) { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('リズムにのって…', W / 2, H / 2 - 30); ctx.shadowBlur = 0; }
        }
        function frame(nowAbs) {
          if (!running) return;
          const now = nowAbs - startTime;
          for (const n of notes) if (!n.hit && !n.missed && now > n.t + 170) { n.missed = true; miss++; combo = 0; sfx('bad'); setJudge('MISS', '#ff7a7a'); updateHud(); }
          render(now);
          if (now > LENGTH_MS) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const pts = perfect * 3 + good * 2;
          const score = clamp(Math.round(pts / Math.max(1, total * 3) * 100), 8, 100);
          hint.textContent = `けっか: PERFECT ${perfect}／GOOD ${good}／MISS ${miss}／さいだいコンボ${maxCombo}`;
          setTimeout(() => onComplete(score), 900);
        }
        updateHud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const RHYTHM_THEMES = [
    { title: 'リズムハイウェイ!ながれてくるノーツをジャストでたたけ', noteEmojis: ['🥁', '🎸', '🎹'], colors: ['#1a0f3a', '#4b1f7a'] },
    { title: 'おかしのリズムロード!リズムにのってタップ', noteEmojis: ['🍩', '🍭', '🍪'], colors: ['#3a1030', '#8a2d6b'] },
    { title: 'うちゅうリズムハイウェイ!ほしをタイミングよくキャッチ', noteEmojis: ['🌟', '🪐', '☄️'], colors: ['#020a1e', '#0d2a5c'] },
  ];
  const RHYTHM_HIGHWAY_VARIANTS = [mg('rhythm-highway-3d', randomThemeGame(makeRhythmHighwayGame, RHYTHM_THEMES))];

  // --- たまころがし迷路: ばんを かたむけて ボールを ころがし、あなを
  //     よけながら ゴールへ。ドラッグ(ジョイスティック)か 十字キーで かたむける ---
  function makeTiltMazeGame({ title, ballEmoji, goalEmoji, palette }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 9;
        const map = generateMaze(N, N, 2);
        const DURATION_MS = mgDuration(Math.round(lerp(50000, 40000, difficulty)));
        const start = { x: 1, y: 1 };
        const d0 = mazeBfs(map, 1, 1);
        const goal = pickFarCell(map, [d0], [start]);
        const holes = [];
        const floor = [];
        for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (map[y][x] === '.' && d0[y][x] >= 3) floor.push({ x, y });
        floor.sort(() => Math.random() - 0.5);
        const holeCount = Math.round(lerp(2, 4, difficulty));
        for (const c of floor) {
          if (holes.length >= holeCount) break;
          if ([goal, ...holes].some((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 3)) continue;
          holes.push(c);
        }
        container.innerHTML = `
          <div class="mg-header"><span id="tmTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="tmLives">❤️❤️❤️</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="tmCanvas"></canvas></div>
          <div class="mg-hint" id="tmHint">ばんをドラッグしてかたむける(十字ボタンでもOK)。あなにおちないよう${goalEmoji}へ</div>
          <div class="mg-tilt-dpad"><span></span><button class="mg-tap-btn mg-hold-btn" id="tmUp" data-key="up">▲</button><span></span><button class="mg-tap-btn mg-hold-btn" id="tmLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="tmDown" data-key="down">▼</button><button class="mg-tap-btn mg-hold-btn" id="tmRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#tmCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N, R = CELL * 0.27, G = CELL * 58;
        const timerEl = container.querySelector('#tmTimer'), livesEl = container.querySelector('#tmLives'), hint = container.querySelector('#tmHint');
        let bx = (start.x + 0.5) * CELL, by = (start.y + 0.5) * CELL, vx = 0, vy = 0, tiltX = 0, tiltY = 0;
        let lives = 3, falls = 0, running = true, rafId = null, last = null, falling = 0, msg = '', msgUntil = 0, bestD = d0[goal.y][goal.x];
        const held = { up: false, down: false, left: false, right: false };
        let joy = null;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        for (const k of ['Up', 'Down', 'Left', 'Right']) bindHeldButton(container.querySelector('#tm' + k), (v) => { held[k.toLowerCase()] = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); joy = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!joy || e.pointerId !== joy.id) return; const p = mgPointerPos(canvas, e); joy.x = p.x; joy.y = p.y; });
        const endJoy = (e) => { if (joy && e.pointerId === joy.id) joy = null; };
        canvas.addEventListener('pointerup', endJoy); canvas.addEventListener('pointercancel', endJoy);
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const isWall = (cx, cy) => cx < 0 || cy < 0 || cx >= N || cy >= N || map[cy][cx] === '#';
        function collide() {
          const cx = Math.floor(bx / CELL), cy = Math.floor(by / CELL);
          for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
            if (!isWall(x, y)) continue;
            const rx = x * CELL, ry = y * CELL;
            const nx = clamp(bx, rx, rx + CELL), ny = clamp(by, ry, ry + CELL);
            let dx = bx - nx, dy = by - ny; const d = Math.hypot(dx, dy);
            if (d >= R) continue;
            if (d === 0) { dx = bx - (rx + CELL / 2); dy = by - (ry + CELL / 2); if (Math.abs(dx) > Math.abs(dy)) { dy = 0; } else { dx = 0; } const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd; bx = nx + dx * R; by = ny + dy * R; } else { dx /= d; dy /= d; bx = nx + dx * R; by = ny + dy * R; }
            const vn = vx * dx + vy * dy;
            if (vn < 0) { vx -= (1 + 0.3) * vn * dx; vy -= (1 + 0.3) * vn * dy; }
          }
        }
        function update(dt, now) {
          if (falling > 0) { falling -= dt; if (falling <= 0) { bx = (start.x + 0.5) * CELL; by = (start.y + 0.5) * CELL; vx = vy = 0; } return; }
          let tx = (held.right ? 1 : 0) - (held.left ? 1 : 0), ty = (held.down ? 1 : 0) - (held.up ? 1 : 0);
          if (joy) { tx = clamp((joy.x - joy.ox) / 42, -1, 1); ty = clamp((joy.y - joy.oy) / 42, -1, 1); }
          tiltX += (tx - tiltX) * Math.min(1, dt * 8); tiltY += (ty - tiltY) * Math.min(1, dt * 8);
          vx += tiltX * G * dt; vy += tiltY * G * dt;
          const damp = Math.pow(0.28, dt); vx *= damp; vy *= damp;
          const sp = Math.hypot(vx, vy), cap = CELL * 14; if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
          const sub = Math.max(1, Math.ceil(sp * dt / (R * 0.8)));
          for (let i = 0; i < sub; i++) { bx += vx * dt / sub; collide(); by += vy * dt / sub; collide(); }
          const cx = Math.floor(bx / CELL), cy = Math.floor(by / CELL);
          for (const h of holes) if (Math.hypot(bx - (h.x + 0.5) * CELL, by - (h.y + 0.5) * CELL) < CELL * 0.24) { lives--; falls++; sfx('bad'); livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(3 - Math.max(0, lives)); falling = 0.7; say(lives > 0 ? '🕳️あなにおちた!スタートにもどる' : '🕳️おちてしまった…'); if (lives <= 0) { finish(false); } return; }
          if (!isWall(cx, cy) && d0[cy][cx] >= 0) bestD = Math.min(bestD, Math.abs(cx - goal.x) + Math.abs(cy - goal.y));
          if (Math.hypot(bx - (goal.x + 0.5) * CELL, by - (goal.y + 0.5) * CELL) < CELL * 0.36) finish(true);
        }
        function render(now) {
          if (!ctx) return;
          ctx.save(); ctx.clearRect(0, 0, W, H);
          ctx.fillStyle = palette.frame; ctx.fillRect(0, 0, W, H);
          // ばんの かたむき(ぎじ3D): かたむいた がわが すこし ちぢんで しずむ
          ctx.translate(W / 2, H / 2);
          ctx.transform(1 - Math.abs(tiltX) * 0.05, 0, 0, 1 - Math.abs(tiltY) * 0.05, tiltX * 5, tiltY * 5);
          ctx.translate(-W / 2, -H / 2);
          const ex = -tiltX * 3, ey = 4 - tiltY * 3;
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (map[y][x] === '#') continue;
            ctx.fillStyle = (x + y) % 2 ? palette.floorA : palette.floorB; ctx.fillRect(x * CELL, y * CELL, CELL + 0.5, CELL + 0.5);
          }
          for (const h of holes) { const g = ctx.createRadialGradient((h.x + 0.5) * CELL, (h.y + 0.5) * CELL, 1, (h.x + 0.5) * CELL, (h.y + 0.5) * CELL, CELL * 0.34); g.addColorStop(0, '#000'); g.addColorStop(0.7, '#111'); g.addColorStop(1, 'rgba(0,0,0,.15)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc((h.x + 0.5) * CELL, (h.y + 0.5) * CELL, CELL * 0.34, 0, Math.PI * 2); ctx.fill(); }
          ctx.font = `${CELL * 0.7}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(255,230,120,.9)'; ctx.shadowBlur = 10; ctx.fillText(goalEmoji, (goal.x + 0.5) * CELL, (goal.y + 0.5) * CELL + 1); ctx.shadowBlur = 0;
          // かべ(そくめん → うわめん)
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (map[y][x] !== '#') continue; ctx.fillStyle = palette.wallSide; ctx.fillRect(x * CELL + ex, y * CELL + ey, CELL + 0.5, CELL + 0.5); }
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (map[y][x] !== '#') continue; ctx.fillStyle = palette.wallTop; ctx.fillRect(x * CELL, y * CELL, CELL + 0.5, CELL + 0.5); }
          // ボール
          const shrink = falling > 0 ? Math.max(0.05, falling / 0.7) : 1;
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(bx + 3 - tiltX * 2, by + 4 - tiltY * 2, R * shrink, R * 0.7 * shrink, 0, 0, Math.PI * 2); ctx.fill();
          if (ballEmoji) { ctx.font = `${R * 2.2 * shrink}px sans-serif`; ctx.fillText(ballEmoji, bx, by + 1); }
          else { const g = ctx.createRadialGradient(bx - R * 0.35, by - R * 0.4, 1, bx, by, R); g.addColorStop(0, '#fff'); g.addColorStop(0.4, palette.ball); g.addColorStop(1, palette.ballDark); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, R * shrink, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
          if (joy) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 30, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(joy.ox + tiltX * 30, joy.oy + tiltY * 30, 10, 0, Math.PI * 2); ctx.fill(); }
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 100, H / 2 - 14, 200, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
          if (now < startTime) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 100, H / 2 - 14, 200, 28); ctx.fillStyle = '#fff'; ctx.fillText('ばんをかたむけて' + goalEmoji + 'へ!', W / 2, H / 2); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          if (!running) return;
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const elapsed = Math.max(0, performance.now() - startTime) / 1000;
          let score;
          if (win) { score = clamp(100 - falls * 12 - Math.max(0, elapsed - 18) * 1.5, 55, 100); say('🎉ゴール!' + (falls === 0 ? 'ノーミス!' : '')); }
          else { const prog = 1 - bestD / Math.max(1, d0[goal.y][goal.x]); score = clamp(15 + prog * 30, 15, 45); say(lives <= 0 ? 'ボールがなくなった…' : 'じかんぎれ…'); }
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 800);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const TILT_MAZE_THEMES = [
    { title: 'たまころがし迷路!ばんをかたむけてゴールへ', ballEmoji: '', goalEmoji: '⭐', palette: { frame: '#5b3b1e', floorA: '#e8d3a8', floorB: '#e0c99a', wallTop: '#a86f3a', wallSide: '#6e4522', ball: '#9fc4e8', ballDark: '#3b6a99' } },
    { title: 'こおりのたまころがし!すべるばんでゴールをめざせ', ballEmoji: '', goalEmoji: '🏁', palette: { frame: '#284a6e', floorA: '#d9f1ff', floorB: '#cbe8fb', wallTop: '#7fb8e6', wallSide: '#3f7bb0', ball: '#ffd27a', ballDark: '#b97a12' } },
    { title: 'おかしのたまころがし!あめだまをゴールへころがそう', ballEmoji: '🍬', goalEmoji: '🎁', palette: { frame: '#7a2d5a', floorA: '#ffe4f0', floorB: '#ffd6e8', wallTop: '#ff8fbf', wallSide: '#b8467f', ball: '#fff', ballDark: '#999' } },
  ];
  const TILT_MAZE_VARIANTS = [mg('tilt-maze-3d', randomThemeGame(makeTiltMazeGame, TILT_MAZE_THEMES))];

  // --- スペースガンナー: 一人称の しょうじゅんを うごかして、おくから
  //     せまる てきを うちおとす。てきの こうげきを うける まえに たおせ ---
  function makeSpaceGunnerGame({ title, enemyEmojis, bossEmoji }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(Math.round(lerp(30000, 26000, difficulty)));
        const SPAWN_MS = lerp(1200, 780, difficulty), APPROACH = lerp(1.15, 1.7, difficulty);
        let shields = 3, kills = 0, shots = 0, running = true, rafId = null, last = null, lastSpawn = 0, lastShot = -1, shake = 0, redFlash = 0;
        let enemies = [], particles = [], lasers = [], bolts = [];
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="sgTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="sgScore">🛡️🛡️🛡️／げきは0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="sgCanvas"></canvas></div>
          <div class="mg-hint" id="sgHint">ドラッグでねらいをあわせ、画面をタップするか「うつ!」で発射。赤くなった敵は攻撃直前!</div>
          <div class="mg-gunner-controls"><button class="mg-tap-btn mg-hold-btn" id="sgLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="sgUp" data-key="up">▲</button><button class="mg-tap-btn primary" id="sgFire" data-key="action">うつ!</button><button class="mg-tap-btn mg-hold-btn" id="sgDown" data-key="down">▼</button><button class="mg-tap-btn mg-hold-btn" id="sgRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#sgCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 225);
        const timerEl = container.querySelector('#sgTimer'), scoreEl = container.querySelector('#sgScore'), hint = container.querySelector('#sgHint');
        const F = W * 0.55;
        let cx = W / 2, cy = H / 2;
        const held = { left: false, right: false, up: false, down: false };
        for (const k of ['Left', 'Right', 'Up', 'Down']) bindHeldButton(container.querySelector('#sg' + k), (v) => { held[k.toLowerCase()] = v; });
        container.querySelector('#sgFire').addEventListener('pointerdown', (e) => { e.preventDefault(); fire(); });
        let drag = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, x: p.x, y: p.y, moved: 0 }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); cx = clamp(cx + (p.x - drag.x) * 1.15, 10, W - 10); cy = clamp(cy + (p.y - drag.y) * 1.15, 10, H - 10); drag.moved += Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y); drag.x = p.x; drag.y = p.y; });
        const endDrag = (e) => { if (!drag || e.pointerId !== drag.id) return; if (drag.moved < 8) fire(); drag = null; };
        canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
        const stars = Array.from({ length: 70 }, () => ({ x: (Math.random() - 0.5) * 2.4, y: (Math.random() - 0.5) * 2.4, z: 0.4 + Math.random() * 6 }));
        function panX() { return (cx - W / 2) * 0.28; }
        function panY() { return (cy - H / 2) * 0.28; }
        function projectE(e) { const z = Math.max(0.25, e.z); return { sx: W / 2 + (e.x * F) / z - panX(), sy: H / 2 + (e.y * F) / z - panY(), size: F * 0.5 / z }; }
        function updateHud() { scoreEl.textContent = '🛡️'.repeat(Math.max(0, shields)) + '💔'.repeat(3 - Math.max(0, shields)) + '／げきは' + kills; }
        function spawn(now) {
          const boss = kills > 0 && kills % 6 === 0 && !enemies.some((e) => e.boss);
          enemies.push({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 1.2, z: 7.5, vz: -APPROACH * (boss ? 0.7 : 0.85 + Math.random() * 0.35), vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.25, emoji: boss ? bossEmoji : enemyEmojis[Math.floor(Math.random() * enemyEmojis.length)], hp: boss ? 3 : 1, boss, state: 'approach', stateAt: now, hitFlash: 0 });
        }
        function fire() {
          if (!running) return;
          const now = performance.now();
          if (now < startTime || now - lastShot < 170) return;
          lastShot = now; shots++;
          lasers.push({ born: now, x: cx, y: cy }); sfx('whoosh');
          let target = null, bestD = 1e9;
          for (const e of enemies) { if (e.state === 'flee') continue; const p = projectE(e); const d = Math.hypot(p.sx - cx, p.sy - cy); if (d < p.size * 0.6 + 7 && d < bestD) { bestD = d; target = e; } }
          if (!target) return;
          target.hp--; target.hitFlash = 1;
          const p = projectE(target);
          if (target.hp <= 0) {
            kills++; updateHud(); sfx('hit');
            for (let i = 0; i < 12; i++) particles.push({ x: p.sx, y: p.sy, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, born: now, color: target.boss ? '#ffd45c' : '#8ef0ff' });
            enemies = enemies.filter((e) => e !== target);
            hint.textContent = target.boss ? '💥ボスをげきは!' : 'げきは!' + kills + 'き';
          } else { hint.textContent = 'ヒット!あと' + target.hp + 'はつ'; sfx('tick'); }
        }
        function update(dt, now) {
          const mv = 200 * dt;
          cx = clamp(cx + ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * mv, 10, W - 10);
          cy = clamp(cy + ((held.down ? 1 : 0) - (held.up ? 1 : 0)) * mv, 10, H - 10);
          if (now - lastSpawn > SPAWN_MS && enemies.length < 6) { spawn(now); lastSpawn = now; }
          for (const s of stars) { s.z -= dt * 2.2; if (s.z < 0.3) { s.z = 6.5; s.x = (Math.random() - 0.5) * 2.4; s.y = (Math.random() - 0.5) * 2.4; } }
          for (const e of enemies) {
            e.z += e.vz * dt; e.x += e.vx * dt; e.y += e.vy * dt;
            if (Math.abs(e.x) > 1.1) e.vx *= -1; if (Math.abs(e.y) > 0.7) e.vy *= -1;
            if (e.hitFlash > 0) e.hitFlash -= dt * 4;
            if (e.state === 'approach' && e.z <= 1.9) { e.state = 'aim'; e.stateAt = now; e.vz = 0; e.vx *= 0.3; e.vy *= 0.3; }
            else if (e.state === 'aim' && now - e.stateAt > (e.boss ? 1000 : 800)) {
              e.state = 'flee'; e.stateAt = now; e.vz = 4;
              shields--; updateHud(); shake = 8; redFlash = 0.55; sfx('bad');
              const p = projectE(e); bolts.push({ born: now, x: p.sx, y: p.sy });
              hint.textContent = 'こうげきをうけた!シールド' + Math.max(0, shields);
              if (shields <= 0) { finish(); return; }
            }
          }
          enemies = enemies.filter((e) => e.z < 9);
          particles = particles.filter((p) => now - p.born < 500);
          for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; }
          lasers = lasers.filter((l) => now - l.born < 110);
          bolts = bolts.filter((b) => now - b.born < 220);
        }
        function render(now) {
          if (!ctx) return;
          ctx.save();
          if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake = Math.max(0, shake - 0.6); }
          const bg = ctx.createRadialGradient(W / 2 - panX() * 0.5, H / 2 - panY() * 0.5, 10, W / 2, H / 2, H); bg.addColorStop(0, '#182a55'); bg.addColorStop(1, '#03060f');
          ctx.fillStyle = bg; ctx.fillRect(-10, -10, W + 20, H + 20);
          mgSpaceBackdrop(ctx, W, H, now, { stars: false, top: 'rgba(0,0,0,0)', bottom: 'rgba(0,0,0,0)', blobs: [[0.25 - panX() / W * 0.2, 0.35, 0.5, 'rgba(120,70,200,.22)'], [0.8 - panX() / W * 0.2, 0.7, 0.55, 'rgba(60,150,230,.18)']] });
          for (const s of stars) { const sx = W / 2 + (s.x * F) / s.z - panX(), sy = H / 2 + (s.y * F) / s.z - panY(); const a = clamp(1 - s.z / 7, 0.1, 1); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(sx, sy, 1.5 + a, 1.5 + a); }
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const sorted = enemies.slice().sort((a, b) => b.z - a.z);
          for (const e of sorted) {
            const p = projectE(e);
            if (e.state === 'aim') { const t = (now - e.stateAt) / (e.boss ? 1000 : 800); ctx.strokeStyle = `rgba(255,70,70,${0.4 + 0.6 * Math.abs(Math.sin(now / 70))})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.sx, p.sy, p.size * 0.6 + 4 + (1 - t) * 10, 0, Math.PI * 2); ctx.stroke(); }
            ctx.font = `${p.size}px sans-serif`;
            if (e.hitFlash > 0) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 16; }
            ctx.globalAlpha = clamp(1.3 - e.z / 8, 0.2, 1);
            ctx.fillText(e.emoji, p.sx, p.sy);
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
            if (e.boss) { ctx.fillStyle = '#ffd45c'; ctx.fillRect(p.sx - 15, p.sy - p.size * 0.6 - 6, 30 * e.hp / 3, 3); }
          }
          for (const p of particles) { const a = 1 - (now - p.born) / 500; ctx.fillStyle = p.color; ctx.globalAlpha = a; ctx.fillRect(p.x, p.y, 3, 3); ctx.globalAlpha = 1; }
          for (const b of bolts) { const a = 1 - (now - b.born) / 220; ctx.strokeStyle = `rgba(255,80,80,${a})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(W / 2, H + 10); ctx.stroke(); }
          for (const l of lasers) { const a = 1 - (now - l.born) / 110; ctx.strokeStyle = `rgba(140,240,255,${a})`; ctx.lineWidth = 3; ctx.shadowColor = '#8ef0ff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(8, H + 4); ctx.lineTo(l.x, l.y); ctx.moveTo(W - 8, H + 4); ctx.lineTo(l.x, l.y); ctx.stroke(); ctx.shadowBlur = 0; }
          // しょうじゅん
          ctx.strokeStyle = '#8ef0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - 20, cy); ctx.lineTo(cx - 8, cy); ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 20, cy); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx, cy - 8); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 20); ctx.stroke();
          ctx.fillStyle = '#8ef0ff'; ctx.fillRect(cx - 1, cy - 1, 2, 2);
          // コックピット わく
          ctx.strokeStyle = 'rgba(140,200,255,.35)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
          if (redFlash > 0) { ctx.fillStyle = `rgba(255,40,40,${redFlash})`; ctx.fillRect(-10, -10, W + 20, H + 20); redFlash = Math.max(0, redFlash - 0.03); }
          if (now < startTime) { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('てきがくる…しょうじゅんをあわせろ!', W / 2, H / 2 - 40); ctx.shadowBlur = 0; }
          ctx.restore();
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          if (!running) return;
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const accuracy = shots ? kills / shots : 0;
          const score = shields <= 0 ? clamp(12 + kills * 3, 12, 48) : clamp(30 + kills * 5 + shields * 7 + accuracy * 10, 15, 100);
          hint.textContent = shields <= 0 ? 'シールドがやぶれた…げきは' + kills + 'き' : 'いきのこった!げきは' + kills + 'き/めいちゅうりつ' + Math.round(accuracy * 100) + '%';
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 850);
        }
        updateHud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const GUNNER_THEMES = [
    { title: 'スペースガンナー!せまるてきをしょうじゅんでうちおとせ', enemyEmojis: ['👾', '🛸', '🤖'], bossEmoji: '👹' },
    { title: 'いんせきガンナー!ぶつかるまえにぜんぶこわせ', enemyEmojis: ['☄️', '🪨', '🛰️'], bossEmoji: '🌑' },
  ];
  const SPACE_GUNNER_VARIANTS = [mg('space-gunner-3d', randomThemeGame(makeSpaceGunnerGame, GUNNER_THEMES))];

  // --- ミニゴルフ: ひっぱって はなす スリングショット操作の 物理パット。
  //     かべ・バンカー・いけ・さかみち の ある コースを 3ホール、パー以下を めざす ---
  const MINI_GOLF_HOLES = [
    { par: 2, start: [30, 200], hole: [200, 40], walls: [[110, 90, 20, 110]], sand: [], water: [], slopes: [] },
    { par: 3, start: [30, 210], hole: [210, 30], walls: [[70, 0, 18, 150], [150, 100, 18, 144]], sand: [[120, 60, 26]], water: [], slopes: [] },
    { par: 3, start: [122, 215], hole: [122, 34], walls: [[95, 110, 54, 16]], sand: [], water: [[40, 120, 26], [204, 120, 26]], slopes: [[0, 150, 244, 50, 0, -220]] },
    { par: 3, start: [40, 40], hole: [204, 200], walls: [[0, 100, 150, 16], [94, 160, 150, 16]], sand: [[200, 60, 24]], water: [], slopes: [[150, 0, 94, 100, 90, 0]] },
    { par: 3, start: [122, 210], hole: [122, 60], walls: [[60, 120, 40, 16], [144, 120, 40, 16], [100, 40, 44, 12]], sand: [], water: [[122, 100, 18]], slopes: [] },
    { par: 2, start: [30, 40], hole: [210, 205], walls: [[60, 60, 16, 120]], sand: [[150, 150, 30]], water: [], slopes: [[100, 120, 144, 60, 0, 180]] },
  ];
  function makeMiniGolfGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const holes = MINI_GOLF_HOLES.slice().sort(() => Math.random() - 0.5).slice(0, 3);
        const TIME_LIMIT_MS = mgDuration(80000), MAX_STROKES = 6;
        let holeIdx = 0, strokes = 0, totalStrokes = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0;
        let bx = 0, by = 0, vx = 0, vy = 0, lastRest = [0, 0], moving = false, sunk = false, sinkAnim = 0, aim = null, splash = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="gfHole">HOLE 1/3／PAR ${holes[0].par}</span><span id="gfStrokes">だすう0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="gfCanvas"></canvas></div>
          <div class="mg-hint" id="gfHint">ボールからうしろへひっぱってはなすとパット。ひっぱるながさがつよさ</div>`;
        const canvas = container.querySelector('#gfCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const S = W / 244;
        const holeEl = container.querySelector('#gfHole'), strokesEl = container.querySelector('#gfStrokes'), hint = container.querySelector('#gfHint');
        const R = 6 * S, HOLE_R = 8 * S;
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const cur = () => holes[holeIdx];
        function loadHole() {
          const h = cur(); strokes = 0; bx = h.start[0] * S; by = h.start[1] * S; vx = vy = 0; moving = false; sunk = false; sinkAnim = 0; lastRest = [bx, by];
          holeEl.textContent = `HOLE ${holeIdx + 1}/3／PAR ${h.par}`; strokesEl.textContent = 'だすう0';
        }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || moving || sunk) return; const p = mgPointerPos(canvas, e); aim = { id: e.pointerId, x: p.x, y: p.y }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!aim || e.pointerId !== aim.id) return; const p = mgPointerPos(canvas, e); aim.x = p.x; aim.y = p.y; });
        const release = (e) => {
          if (!aim || e.pointerId !== aim.id) return;
          const dx = bx - aim.x, dy = by - aim.y; aim = null;
          const len = Math.hypot(dx, dy);
          if (len < 10 * S) { say('もっとひっぱろう', 800); return; }
          const power = clamp(len / (95 * S), 0.12, 1);
          vx = dx / len * power * 560 * S; vy = dy / len * power * 560 * S;
          moving = true; strokes++; totalStrokes++; sfx('hit'); strokesEl.textContent = 'だすう' + strokes; lastRest = [bx, by];
        };
        canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
        function inCircle(c) { return Math.hypot(bx - c[0] * S, by - c[1] * S) < c[2] * S; }
        function collideWalls() {
          const h = cur();
          const rects = h.walls.map((w) => [w[0] * S, w[1] * S, w[2] * S, w[3] * S]).concat([[-20, -20, W + 40, 20], [-20, H, W + 40, 20], [-20, -20, 20, H + 40], [W, -20, 20, H + 40]]);
          for (const [rx, ry, rw, rh] of rects) {
            const nx = clamp(bx, rx, rx + rw), ny = clamp(by, ry, ry + rh);
            let dx = bx - nx, dy = by - ny; const d = Math.hypot(dx, dy);
            if (d >= R) continue;
            if (d === 0) { dx = bx - (rx + rw / 2); dy = by - (ry + rh / 2); if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd; bx = nx + dx * R; by = ny + dy * R; }
            else { dx /= d; dy /= d; bx = nx + dx * R; by = ny + dy * R; }
            const vn = vx * dx + vy * dy; if (vn < 0) { vx -= 1.65 * vn * dx; vy -= 1.65 * vn * dy; }
          }
        }
        function update(dt) {
          if (!moving) return;
          const h = cur();
          for (const sl of h.slopes) if (bx >= sl[0] * S && bx <= (sl[0] + sl[2]) * S && by >= sl[1] * S && by <= (sl[1] + sl[3]) * S) { vx += sl[4] * S * dt; vy += sl[5] * S * dt; }
          const inSand = h.sand.some(inCircle);
          const damp = Math.pow(inSand ? 0.004 : 0.32, dt); vx *= damp; vy *= damp;
          const sp = Math.hypot(vx, vy);
          const sub = Math.max(1, Math.ceil(sp * dt / (R * 0.8)));
          for (let i = 0; i < sub; i++) { bx += vx * dt / sub; by += vy * dt / sub; collideWalls(); }
          const hd = Math.hypot(bx - h.hole[0] * S, by - h.hole[1] * S);
          if (hd < HOLE_R && sp < 330 * S) { sunk = true; moving = false; sinkAnim = 1; sfx('coin'); const diff = strokes - h.par; say(diff <= -2 ? '🦅イーグル!' : diff === -1 ? '🐦バーディー!' : diff === 0 ? '⛳パー!' : diff === 1 ? 'ボギー' : 'ダブルボギー…', 1500); setTimeout(nextHole, 1200); return; }
          if (hd < HOLE_R * 1.4 && sp >= 330 * S) { const nx = (bx - h.hole[0] * S) / hd, ny = (by - h.hole[1] * S) / hd; vx += nx * 40 * S; vy += ny * 40 * S; }
          if (h.water.some(inCircle)) { splash = 1; say('💦いけにおちた!+1だすう'); strokes++; totalStrokes++; strokesEl.textContent = 'だすう' + strokes; bx = lastRest[0]; by = lastRest[1]; vx = vy = 0; moving = false; return; }
          if (sp < 9 * S) { vx = vy = 0; moving = false; if (strokes >= MAX_STROKES) { say('だすうオーバー…つぎのホールへ'); setTimeout(nextHole, 900); } }
        }
        function nextHole() {
          if (!running) return;
          holeIdx++;
          if (holeIdx >= holes.length) { finish(); return; }
          loadHole();
        }
        function render(now) {
          if (!ctx) return;
          const h = cur();
          ctx.fillStyle = '#3f8f3a'; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < W; i += 24 * S) ctx.fillRect(i, 0, 12 * S, H);
          for (const sl of h.slopes) { const cx = (sl[0] + sl[2] / 2) * S, cy = (sl[1] + sl[3] / 2) * S, al = Math.hypot(sl[4], sl[5]) || 1, ux = sl[4] / al, uy = sl[5] / al, hl = Math.min(sl[2], sl[3]) * S / 2; const g = ctx.createLinearGradient(cx - ux * hl, cy - uy * hl, cx + ux * hl, cy + uy * hl); g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(0,0,0,.2)'); ctx.fillStyle = g; ctx.fillRect(sl[0] * S, sl[1] * S, sl[2] * S, sl[3] * S); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = `${14 * S}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sl[5] < 0 ? '⬆' : sl[5] > 0 ? '⬇' : sl[4] > 0 ? '➡' : '⬅', (sl[0] + sl[2] / 2) * S, (sl[1] + sl[3] / 2) * S); }
          for (const c of h.sand) { ctx.fillStyle = '#e6d28a'; ctx.beginPath(); ctx.arc(c[0] * S, c[1] * S, c[2] * S, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.arc(c[0] * S, c[1] * S, c[2] * S * 0.6, 0, Math.PI * 2); ctx.fill(); }
          for (const c of h.water) { const g = ctx.createRadialGradient(c[0] * S, c[1] * S, 2, c[0] * S, c[1] * S, c[2] * S); g.addColorStop(0, '#7fd0ff'); g.addColorStop(1, '#2b7fc4'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0] * S, c[1] * S, c[2] * S, 0, Math.PI * 2); ctx.fill(); }
          for (const w of h.walls) { ctx.fillStyle = '#5b3a1e'; ctx.fillRect(w[0] * S, w[1] * S + 4 * S, w[2] * S, w[3] * S); ctx.fillStyle = '#9c6b3c'; ctx.fillRect(w[0] * S, w[1] * S, w[2] * S, w[3] * S); }
          const hg = ctx.createRadialGradient(h.hole[0] * S, h.hole[1] * S, 1, h.hole[0] * S, h.hole[1] * S, HOLE_R); hg.addColorStop(0, '#000'); hg.addColorStop(1, '#1d2a1c');
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(h.hole[0] * S, h.hole[1] * S, HOLE_R, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#eee'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.hole[0] * S, h.hole[1] * S); ctx.lineTo(h.hole[0] * S, h.hole[1] * S - 26 * S); ctx.stroke();
          ctx.fillStyle = '#ff3b5c'; ctx.beginPath(); ctx.moveTo(h.hole[0] * S, h.hole[1] * S - 26 * S); ctx.lineTo(h.hole[0] * S + 14 * S, h.hole[1] * S - 21 * S); ctx.lineTo(h.hole[0] * S, h.hole[1] * S - 16 * S); ctx.closePath(); ctx.fill();
          if (aim && !moving) {
            const dx = bx - aim.x, dy = by - aim.y, len = Math.hypot(dx, dy), power = clamp(len / (95 * S), 0, 1);
            ctx.strokeStyle = `rgba(255,255,255,.85)`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + dx / (len || 1) * power * 90 * S, by + dy / (len || 1) * power * 90 * S); ctx.stroke(); ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(aim.x, aim.y); ctx.stroke();
            ctx.fillStyle = power > 0.8 ? '#ff5c8a' : power > 0.45 ? '#ffd257' : '#8de0a0'; ctx.fillRect(10 * S, H - 16 * S, (W - 20 * S) * power, 8 * S); ctx.strokeStyle = '#fff'; ctx.strokeRect(10 * S, H - 16 * S, W - 20 * S, 8 * S);
          }
          const sh = sunk ? Math.max(0, sinkAnim) : 1;
          if (sunk) sinkAnim = Math.max(0, sinkAnim - 0.05);
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(bx + 2, by + 3, R * sh, R * 0.7 * sh, 0, 0, Math.PI * 2); ctx.fill();
          const g = ctx.createRadialGradient(bx - R * 0.3, by - R * 0.3, 1, bx, by, R); g.addColorStop(0, '#fff'); g.addColorStop(1, '#c9ccd6');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, R * sh, 0, Math.PI * 2); ctx.fill();
          if (splash > 0) { ctx.strokeStyle = `rgba(150,220,255,${splash})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, (1 - splash) * 30 * S + 6, 0, Math.PI * 2); ctx.stroke(); splash = Math.max(0, splash - 0.04); }
          if (now < msgUntil) { ctx.font = `bold ${14 * S}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 90 * S, 12 * S, 180 * S, 26 * S); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 25 * S); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          update(dt);
          if (!running) return;
          render(now);
          if (now - startTime > TIME_LIMIT_MS) { say('じかんぎれ…'); finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const playedPar = holes.reduce((a, h) => a + h.par, 0);
          const over = totalStrokes - playedPar + (holeIdx < holes.length ? (holes.length - holeIdx) * 4 : 0);
          const score = clamp(100 - Math.max(0, over) * 9 + Math.min(0, over) * -4, 15, 100);
          say(over <= 0 ? `🏆 ${totalStrokes}だすう(パー${playedPar})すばらしい!` : `${totalStrokes}だすう(パー${playedPar}) +${over}`, 2000);
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 900);
        }
        loadHole();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const MINI_GOLF_VARIANTS = [mg('mini-golf-physics', makeMiniGolfGame({ title: 'ミニゴルフ!ひっぱってはなしてパー以下をめざせ' }))];

  // --- ほんかく さかなつり: なげる → さかなが よってくる → あたりで あわせる →
  //     テンションを 見ながら まく、の 4だんかい。おおきい さかなほど つよく ひく ---
  const FISHING_SPECIES = [
    { emoji: '🐟', name: 'あじ', size: 1, value: 20, pull: 0.9, speed: 34 },
    { emoji: '🐠', name: 'ねったいぎょ', size: 1.1, value: 26, pull: 1.0, speed: 42 },
    { emoji: '🐡', name: 'ふぐ', size: 1.3, value: 34, pull: 1.3, speed: 26 },
    { emoji: '🦑', name: 'いか', size: 1.4, value: 40, pull: 1.4, speed: 36 },
    { emoji: '🐙', name: 'たこ', size: 1.6, value: 48, pull: 1.7, speed: 22 },
    { emoji: '🦈', name: 'さめ', size: 2.2, value: 70, pull: 2.4, speed: 50 },
  ];
  function makeRealFishingGame({ title, species = FISHING_SPECIES, waterTop = '#3fa6e8', waterBottom = '#0b3f7a' }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(Math.round(lerp(60000, 50000, difficulty)));
        let phase = 'ready', running = true, rafId = null, last = null, charge = 0, charging = false, msg = '', msgUntil = 0;
        let lureX = 0, lureY = 0, lureVx = 0, lureVy = 0, targetDepth = 0, castDist = 0;
        let hooked = null, biteUntil = 0, nibbleUntil = 0, tension = 0, lineLen = 0, reeling = false, dashUntil = 0, slackMs = 0, caught = [], escaped = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="rfTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="rfScore">つった: 0ひき／0pt</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="rfCanvas"></canvas></div>
          <div class="mg-hint" id="rfHint">ボタンながおしでためてはなすとキャスト。うきがしずんだら「あわせる」!</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn primary" id="rfMain" data-key="action">キャスト(ながおし)</button></div>`;
        const canvas = container.querySelector('#rfCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 235);
        const WATER_Y = H * 0.34, SHORE_X = 28;
        const timerEl = container.querySelector('#rfTimer'), scoreEl = container.querySelector('#rfScore'), hint = container.querySelector('#rfHint'), mainBtn = container.querySelector('#rfMain');
        const say = (t, ms = 1400) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const fishes = [];
        function spawnFish() {
          const sp = species[Math.min(species.length - 1, Math.floor(Math.pow(Math.random(), 1.6 - difficulty * 0.5) * species.length))];
          const dir = Math.random() < 0.5 ? 1 : -1;
          fishes.push({ sp, x: dir > 0 ? -20 : W + 20, y: WATER_Y + 30 + Math.random() * (H - WATER_Y - 50), dir, speed: sp.speed * (0.7 + Math.random() * 0.6), state: 'swim', wobble: Math.random() * 10, size: 16 + sp.size * 8 });
        }
        for (let i = 0; i < 3; i++) { spawnFish(); fishes[i].x = 40 + Math.random() * (W - 80); }
        function setPhase(p) {
          phase = p;
          mainBtn.classList.toggle('primary', true);
          if (p === 'ready') mainBtn.textContent = 'キャスト(ながおし)';
          else if (p === 'wait') mainBtn.textContent = 'あわせる!';
          else if (p === 'fight') mainBtn.textContent = 'まく(ながおし)';
        }
        bindHeldButton(mainBtn, (v) => {
          if (!running) return;
          if (phase === 'ready') { if (v) { charging = true; charge = 0; } else if (charging) { charging = false; cast(); } }
          else if (phase === 'wait') { if (v) strike(); }
          else if (phase === 'fight') reeling = v;
        });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (phase === 'wait') strike(); else if (phase === 'ready' && !charging) { charging = true; charge = 0; } else if (phase === 'fight') reeling = true; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        const canvasUp = () => { if (phase === 'ready' && charging) { charging = false; cast(); } if (phase === 'fight') reeling = false; };
        canvas.addEventListener('pointerup', canvasUp); canvas.addEventListener('pointercancel', canvasUp);
        function cast() {
          if (charge < 0.1) { say('もっとながくためよう', 900); return; }
          castDist = 40 + charge * (W - 80);
          lureX = SHORE_X; lureY = WATER_Y - 40; lureVx = castDist / 0.9; lureVy = -140;
          targetDepth = WATER_Y + 40 + Math.random() * (H - WATER_Y - 70);
          setPhase('cast'); sfx('whoosh'); say('キャスト!', 700);
        }
        function strike() {
          if (phase !== 'wait') return;
          const now = performance.now();
          const biter = fishes.find((f) => f.state === 'bite');
          if (biter && now < biteUntil) {
            hooked = biter; biter.state = 'hooked'; tension = 30; lineLen = Math.hypot(lureX - SHORE_X, lureY - (WATER_Y - 40)); reeling = false; slackMs = 0; dashUntil = now + 600;
            setPhase('fight'); sfx('hit'); say('🎣ヒット!' + hooked.sp.name + 'だ!テンションにちゅうい', 1600);
          } else {
            const nib = fishes.find((f) => f.state === 'nibble' || f.state === 'approach');
            if (nib) { nib.state = 'flee'; say('はやすぎ!さかながにげた…'); } else say('まだあたりがない…', 800);
          }
        }
        function landFish() {
          caught.push(hooked.sp); sfx('coin'); const idx = fishes.indexOf(hooked); if (idx >= 0) fishes.splice(idx, 1); spawnFish();
          say('🎉 ' + hooked.sp.name + 'をつった!+' + hooked.sp.value + 'pt', 1600); hooked = null;
          scoreEl.textContent = 'つった: ' + caught.length + 'ひき／' + caught.reduce((a, f) => a + f.value, 0) + 'pt';
          setPhase('ready');
        }
        function loseFish(reason) {
          escaped++; sfx('bad'); if (hooked) { hooked.state = 'flee'; hooked = null; }
          say(reason, 1500); setPhase('ready');
        }
        function update(dt, now) {
          if (charging) charge = Math.min(1, charge + dt / 1.1);
          for (const f of fishes) {
            f.wobble += dt * 6;
            if (f.state === 'swim' || f.state === 'flee') {
              const sp = f.state === 'flee' ? f.speed * 2.2 : f.speed;
              f.x += f.dir * sp * dt; f.y += Math.sin(f.wobble) * 6 * dt;
              if (f.x < -40 || f.x > W + 40) { const i = fishes.indexOf(f); fishes.splice(i, 1); spawnFish(); }
              if (f.state === 'swim' && phase === 'wait' && !fishes.some((o) => o.state === 'approach' || o.state === 'nibble' || o.state === 'bite') && Math.hypot(f.x - lureX, f.y - lureY) < 90 && Math.random() < dt * 0.9) f.state = 'approach';
            } else if (f.state === 'approach') {
              const dx = lureX - f.x, dy = lureY - f.y, d = Math.hypot(dx, dy);
              if (d < 14) { f.state = 'nibble'; nibbleUntil = now + 700 + Math.random() * 900; }
              else { f.x += dx / d * f.speed * 1.1 * dt; f.y += dy / d * f.speed * 1.1 * dt; f.dir = dx > 0 ? 1 : -1; }
              if (phase !== 'wait') f.state = 'swim';
            } else if (f.state === 'nibble') {
              f.x = lureX + Math.sin(now / 60) * 3; f.y = lureY + 8;
              if (now > nibbleUntil) { f.state = 'bite'; biteUntil = now + lerp(750, 520, difficulty); }
              if (phase !== 'wait') f.state = 'swim';
            } else if (f.state === 'bite') {
              f.x = lureX; f.y = lureY + 10;
              if (now > biteUntil) { f.state = 'flee'; say('にがした…あたりをのがした', 1200); }
            } else if (f.state === 'hooked') {
              f.x = SHORE_X + lineLen * 0.98; f.y = lureY + Math.sin(now / 90) * 4;
            }
          }
          if (phase === 'cast') {
            lureVy += 420 * dt; lureX += lureVx * dt; lureY += lureVy * dt;
            if (lureY >= WATER_Y) { lureY = WATER_Y; lureVx = 0; lureVy = 0; setPhase('wait'); say('うきを見て…しずんだらあわせる!', 1400); }
          } else if (phase === 'wait') {
            if (lureY < targetDepth) lureY += 30 * dt;
          } else if (phase === 'fight' && hooked) {
            const f = hooked;
            if (now > dashUntil && Math.random() < dt * 0.55) { dashUntil = now + 500 + Math.random() * 500; }
            const dashing = now < dashUntil;
            const pull = f.sp.pull * (dashing ? 1 : 0.35);
            if (reeling) { lineLen -= 55 * dt; tension += (28 + pull * 34) * dt; slackMs = 0; }
            else { tension -= 42 * dt; lineLen += pull * 14 * dt; slackMs += dt * 1000; }
            tension = clamp(tension, 0, 100);
            lureX = SHORE_X + lineLen; lureY = f.y;
            if (tension >= 100) { loseFish('💥いとがきれた!テンションのあげすぎ'); return; }
            if (slackMs > 2600) { loseFish('いとがたるんでばれた…'); return; }
            if (lineLen <= 6) { landFish(); return; }
          }
        }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, WATER_Y); sky.addColorStop(0, '#7cc6ff'); sky.addColorStop(1, '#dff3ff');
          ctx.fillStyle = sky; ctx.fillRect(0, 0, W, WATER_Y);
          const water = ctx.createLinearGradient(0, WATER_Y, 0, H); water.addColorStop(0, waterTop); water.addColorStop(1, waterBottom);
          ctx.fillStyle = water; ctx.fillRect(0, WATER_Y, W, H - WATER_Y);
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) { ctx.beginPath(); for (let x = 0; x <= W; x += 8) { const y = WATER_Y + 12 + i * 34 + Math.sin(x / 22 + now / 500 + i) * 3; if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
          ctx.fillStyle = '#7a5a3a'; ctx.fillRect(0, WATER_Y - 14, SHORE_X + 10, 14); ctx.fillStyle = '#9ccc65'; ctx.fillRect(0, WATER_Y - 18, SHORE_X + 10, 6);
          ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(currentSprite(), SHORE_X - 6, WATER_Y - 16);
          const rodTipX = SHORE_X + 26, rodTipY = WATER_Y - 62;
          ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(SHORE_X + 4, WATER_Y - 22); ctx.lineTo(rodTipX, rodTipY); ctx.stroke();
          for (const f of fishes) {
            const sh = f.state === 'hooked' ? 1 : 0.55;
            ctx.globalAlpha = sh; ctx.font = `${f.size}px sans-serif`; ctx.textBaseline = 'middle';
            ctx.save(); ctx.translate(f.x, f.y); if (f.dir > 0) ctx.scale(-1, 1); ctx.fillText(f.sp.emoji, 0, 0); ctx.restore();
            ctx.globalAlpha = 1;
            if (f.state === 'nibble') { ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.fillText('…', f.x, f.y - f.size * 0.7); }
          }
          if (phase !== 'ready') {
            ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rodTipX, rodTipY); ctx.lineTo(lureX, Math.min(lureY, WATER_Y)); if (lureY > WATER_Y) ctx.lineTo(lureX, lureY); ctx.stroke();
            const bobbing = fishes.some((f) => f.state === 'nibble'), biting = fishes.some((f) => f.state === 'bite');
            const floatY = phase === 'fight' ? Math.min(lureY, WATER_Y + 8) : WATER_Y + (biting ? 12 : bobbing ? Math.sin(now / 50) * 4 : Math.sin(now / 400) * 1.5);
            ctx.font = '16px sans-serif'; ctx.textBaseline = 'middle'; ctx.fillText(phase === 'cast' ? '🪝' : '🔴', lureX, phase === 'cast' ? lureY : floatY);
            if (phase === 'wait' && lureY > WATER_Y + 4) { ctx.fillStyle = '#ffd257'; ctx.beginPath(); ctx.arc(lureX, lureY, 3, 0, Math.PI * 2); ctx.fill(); }
            if (biting) { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#ff3b5c'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 6; ctx.fillText('あたり!いま!', lureX, WATER_Y - 18); ctx.shadowBlur = 0; }
          }
          if (charging) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(W / 2 - 60, 12, 120, 12); ctx.fillStyle = charge > 0.8 ? '#ff5c8a' : '#8de0a0'; ctx.fillRect(W / 2 - 60, 12, 120 * charge, 12); ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textBaseline = 'top'; ctx.fillText('とおくへなげる', W / 2, 26); }
          if (phase === 'fight') {
            ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(10, 10, W - 20, 30);
            ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('テンション', 14, 13);
            ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(14, 26, W - 28, 9);
            ctx.fillStyle = tension > 80 ? '#ff3b5c' : tension > 55 ? '#ffd257' : '#8de0a0'; ctx.fillRect(14, 26, (W - 28) * tension / 100, 9);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText('あと' + Math.max(0, Math.round(lineLen)) + 'm', W - 14, 13);
            if (tension > 80) { ctx.fillStyle = `rgba(255,60,60,${0.2 + 0.2 * Math.abs(Math.sin(now / 90))})`; ctx.fillRect(0, 0, W, H); }
          }
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 100, H - 34, 200, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 21); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          update(dt, now);
          if (!running) return;
          const rem = Math.max(0, DURATION_MS - (now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          mainBtn.disabled = true;
          const pts = caught.reduce((a, f) => a + f.value, 0);
          const score = clamp(18 + pts * 0.85 - escaped * 4, 10, 100);
          say(caught.length ? `しゅうりょう!${caught.length}ひき${pts}pt` : '今日は0ひき。うきだけ眺めていた', 2000);
          render(performance.now());
          setTimeout(() => onComplete(Math.round(score)), 900);
        }
        setPhase('ready');
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const RIVER_FISH = [
    { emoji: '🐟', name: 'あゆ', size: 1, value: 20, pull: 0.9, speed: 36 },
    { emoji: '🦐', name: 'てながえび', size: 0.9, value: 22, pull: 0.7, speed: 30 },
    { emoji: '🐸', name: 'かえる', size: 1.1, value: 24, pull: 1.0, speed: 28 },
    { emoji: '🦞', name: 'ざりがに', size: 1.3, value: 32, pull: 1.4, speed: 22 },
    { emoji: '🐢', name: 'かめ', size: 1.5, value: 40, pull: 1.6, speed: 18 },
    { emoji: '🐊', name: 'ワニ', size: 2.2, value: 70, pull: 2.5, speed: 40 },
  ];
  const DEEPSEA_FISH = [
    { emoji: '🐡', name: 'ふぐ', size: 1.2, value: 28, pull: 1.2, speed: 26 },
    { emoji: '🦑', name: 'いか', size: 1.4, value: 40, pull: 1.4, speed: 36 },
    { emoji: '🐙', name: 'たこ', size: 1.6, value: 48, pull: 1.7, speed: 22 },
    { emoji: '🦀', name: 'かに', size: 1.3, value: 36, pull: 1.5, speed: 20 },
    { emoji: '🦈', name: 'さめ', size: 2.2, value: 70, pull: 2.4, speed: 50 },
    { emoji: '🐋', name: 'くじら', size: 2.8, value: 95, pull: 3.0, speed: 30 },
  ];
  const REAL_FISHING_VARIANTS = [mg('real-fishing', makeRealFishingGame({ title: 'ほんかくさかなつり!あわせて、まいて、つりあげろ' }))];

  // --- 3Dバスケ シュート: うえに はらって シュート。ボールは ほうぶつせんを
  //     えがき、リング/バックボードに あたる。うごく ゴールも ---
  function makeBasketballGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(Math.round(lerp(40000, 34000, difficulty)));
        const CAM_Z = -4, CAM_Y = 3.2, F_RATIO = 0.62;
        const HOOP_Z = 9, HOOP_Y = 3.05, RIM_R = 0.45, BALL_R = 0.24, BOARD_Z = HOOP_Z + 0.55;
        let hoopX = 0, hoopVx = 0, made = 0, shots = 0, streak = 0, best = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0;
        let ball = null, drag = null, net = 0, rimFlash = 0, sway = lerp(0, 1.0, difficulty);
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="bkTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="bkScore">🏀 0／0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="bkCanvas"></canvas></div>
          <div class="mg-hint" id="bkHint">ボールをうえへはらってシュート。はらうながさとはやさでとぶきょりがかわる。バックボードにあててもOK</div>`;
        const canvas = container.querySelector('#bkCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const F = W * F_RATIO, HOR = H * 0.36;
        const timerEl = container.querySelector('#bkTimer'), scoreEl = container.querySelector('#bkScore'), hint = container.querySelector('#bkHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function project(x, y, z) { const dz = z - CAM_Z; const s = F / dz; return { x: W / 2 + x * s, y: HOR + (CAM_Y - y) * s, s }; }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (ball || !running || performance.now() < startTime) return; const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, pts: [{ x: p.x, y: p.y, t: performance.now() }] }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); drag.pts.push({ x: p.x, y: p.y, t: performance.now() }); if (drag.pts.length > 30) drag.pts.shift(); });
        const release = (e) => {
          if (!drag || e.pointerId !== drag.id) return;
          const pts = drag.pts; drag = null;
          const a = pts[0], b = pts[pts.length - 1];
          const dy = a.y - b.y, dx = b.x - a.x, dt = Math.max(50, b.t - a.t);
          if (dy < 30) { say('うえへはらってシュート!', 900); return; }
          const speed = Math.hypot(dx, dy) / dt * 1000;
          const power = clamp(speed / 1500 * 0.55 + dy / 200 * 0.45, 0.35, 1.3);
          const vz = 5.2 + power * 5.8, vy = 5.6 + power * 3.2, vx = clamp(dx / 90, -1, 1) * 3.2;
          ball = { x: 0, y: 1.2, z: 0.6, vx, vy, vz, scored: false, done: false, rimHits: 0 }; sfx('whoosh');
          shots++; updateHud();
        };
        canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
        function updateHud() { scoreEl.textContent = `🏀 ${made}／${shots}` + (streak >= 2 ? `／🔥${streak}れんぞく` : ''); }
        function step(dt) {
          if (!ball) return;
          const b = ball;
          b.vy -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
          // バックボード
          if (!b.done && b.z + BALL_R > BOARD_Z && b.vz > 0 && Math.abs(b.x - hoopX) < 1.1 && b.y > HOOP_Y - 0.3 && b.y < HOOP_Y + 1.3) { b.z = BOARD_Z - BALL_R; b.vz *= -0.55; b.vx *= 0.8; rimFlash = 0.3; }
          // リング
          const dxr = b.x - hoopX, dzr = b.z - HOOP_Z, dr = Math.hypot(dxr, dzr);
          if (!b.done && b.vy < 0 && b.y - BALL_R < HOOP_Y + 0.05 && b.y + BALL_R > HOOP_Y - 0.05) {
            if (dr < RIM_R - BALL_R * 0.55) { b.scored = true; b.done = true; made++; sfx('coin'); streak++; best = Math.max(best, streak); net = 1; say(b.rimHits ? '🏀リングにあたってイン!' : streak >= 3 ? '🔥スウィッシュ!' + streak + 'れんぞく' : '🏀ナイスシュート!', 1200); updateHud(); }
            else if (dr < RIM_R + BALL_R) { const nx = dxr / (dr || 1), nz = dzr / (dr || 1); b.vx = nx * 2.2 + b.vx * 0.3; b.vz = nz * 2.2 + b.vz * 0.2; b.vy = Math.abs(b.vy) * 0.45; b.rimHits++; rimFlash = 0.4; sfx('tick'); }
          }
          if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy) * 0.5; b.vx *= 0.7; b.vz *= 0.7; if (!b.done) { b.done = true; streak = 0; sfx('bad'); say(b.rimHits ? 'おしい!リングにはじかれた' : 'はずれ…', 1000); updateHud(); } }
          if (b.z > 14 || b.z < -3 || (b.done && Math.abs(b.vy) < 0.6 && b.y <= 0.01)) ball = null;
        }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1b1f3a'); bg.addColorStop(0.36, '#2d3358'); bg.addColorStop(0.361, '#c98a4a'); bg.addColorStop(1, '#e0a66a');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          // コートの せん
          ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
          for (const xx of [-2.4, 2.4]) { const a = project(xx, 0, 0), c = project(xx, 0, HOOP_Z + 1); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
          const kl = project(-2.4, 0, HOOP_Z - 2.5), kr = project(2.4, 0, HOOP_Z - 2.5); ctx.beginPath(); ctx.moveTo(kl.x, kl.y); ctx.lineTo(kr.x, kr.y); ctx.stroke();
          // ゴール
          const pole = project(hoopX, 0, BOARD_Z + 0.4), poleTop = project(hoopX, HOOP_Y + 1.4, BOARD_Z + 0.4);
          ctx.strokeStyle = '#555'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(pole.x, pole.y); ctx.lineTo(poleTop.x, poleTop.y); ctx.stroke();
          const bl = project(hoopX - 1.1, HOOP_Y - 0.3, BOARD_Z), br = project(hoopX + 1.1, HOOP_Y + 1.3, BOARD_Z);
          ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(bl.x, br.y, br.x - bl.x, bl.y - br.y); ctx.strokeStyle = '#e63946'; ctx.lineWidth = 2; ctx.strokeRect(bl.x, br.y, br.x - bl.x, bl.y - br.y);
          const il = project(hoopX - 0.45, HOOP_Y, BOARD_Z), ir = project(hoopX + 0.45, HOOP_Y + 0.4, BOARD_Z); ctx.strokeRect(il.x, ir.y, ir.x - il.x, il.y - ir.y);
          const rc = project(hoopX, HOOP_Y, HOOP_Z); const rr = RIM_R * rc.s;
          // ネット
          ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1;
          for (let i = 0; i < 8; i++) { const ang = i / 8 * Math.PI * 2; const nx = rc.x + Math.cos(ang) * rr, ny = rc.y + Math.sin(ang) * rr * 0.35; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(rc.x + Math.cos(ang) * rr * 0.6, rc.y + rr * 1.1 + net * 6); ctx.stroke(); }
          ctx.strokeStyle = rimFlash > 0 ? '#fff' : '#ff6b1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(rc.x, rc.y, rr, rr * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
          if (rimFlash > 0) rimFlash = Math.max(0, rimFlash - 0.03);
          if (net > 0) net = Math.max(0, net - 0.04);
          // ボール
          const drawBall = (x, y, z) => { const p = project(x, y, z); const r = Math.max(2, BALL_R * p.s); const sh = project(x, 0, z); ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r * 1.1, r * 0.4, 0, 0, Math.PI * 2); ctx.fill(); const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 1, p.x, p.y, r); g.addColorStop(0, '#ffb066'); g.addColorStop(1, '#c4520d'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(60,20,0,.6)'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x + r, p.y); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x, p.y + r); ctx.stroke(); return p; };
          if (ball) drawBall(ball.x, ball.y, ball.z);
          else if (running) { const p = drawBall(0, 1.2, 0.6); if (drag && drag.pts.length > 1) { const a = drag.pts[0], e = drag.pts[drag.pts.length - 1]; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (e.x - a.x), p.y + (e.y - a.y)); ctx.stroke(); ctx.setLineDash([]); } else if (performance.now() >= startTime) { ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillText('↑はらってシュート', W / 2, p.y - 40); } }
          if (now < startTime) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('READY…', W / 2, H / 2); ctx.shadowBlur = 0; }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 95, 10, 190, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 23); }
        }
        function loop(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          if (now >= startTime) {
            if (sway > 0) { hoopX = Math.sin((now - startTime) / 1000 * 0.9) * sway; }
            const sub = 3; for (let i = 0; i < sub; i++) step(dt / sub);
          }
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(); return; }
          rafId = requestAnimationFrame(loop);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const acc = shots ? made / shots : 0;
          const score = clamp(Math.round(18 + made * 9 + acc * 20 + best * 3), 12, 100);
          say(`けっか: ${made}ほんせいこう／${shots}ほん/さいだい${best}れんぞく`, 2000);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        updateHud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const BASKETBALL_VARIANTS = [mg('basketball-3d', makeBasketballGame({ title: '3Dバスケ!はらってシュート、リングをねらえ' }))];

  // --- 3Dたっきゅう: ラケットは ゆびに ついてくる。ボールが 手前に きた
  //     しゅんかんに ラケットが あれば かえせる。あてる いちで コースが かわる ---
  function makePingPongGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const WIN = 5, TIME_LIMIT_MS = mgDuration(75000);
        const TABLE_L = 2.74, TABLE_HW = 0.76, NET_H = 0.15, CAM_Z = -1.3, CAM_Y = 1.25, F_RATIO = 0.62;
        const AI_SPEED = lerp(1.3, 2.2, difficulty), AI_ERR = lerp(0.22, 0.11, difficulty);
        let me = 0, ai = 0, rally = 0, bestRally = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, serveAt = 0, server = 'me';
        let ball = null, px = 0, py = 0.25, prevPx = 0, prevPy = 0.25, pvx = 0, aiX = 0, aiY = 0.25, hitFlash = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="ppScore">じぶん0 - 0あいて</span><span id="ppRally">ラリー0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="ppCanvas"></canvas></div>
          <div class="mg-hint" id="ppHint">がめんをなぞってラケットをうごかす。ボールのきたところにラケットをおけばかえせる。さきに${WIN}てん!</div>`;
        const canvas = container.querySelector('#ppCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const F = W * F_RATIO, HOR = H * 0.34;
        const scoreEl = container.querySelector('#ppScore'), rallyEl = container.querySelector('#ppRally'), hint = container.querySelector('#ppHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function project(x, y, z) { const dz = z - CAM_Z; const s = F / dz; return { x: W / 2 + x * s, y: HOR + (CAM_Y - y) * s, s }; }
        function unproject(sx, sy) { const s = F / (0 - CAM_Z); return { x: (sx - W / 2) / s, y: CAM_Y - (sy - HOR) / s }; }
        let pid = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; const p = mgPointerPos(canvas, e); const u = unproject(p.x, p.y); px = clamp(u.x, -1.1, 1.1); py = clamp(u.y, 0.05, 0.9); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (pid !== e.pointerId) return; const p = mgPointerPos(canvas, e); const u = unproject(p.x, p.y); px = clamp(u.x, -1.1, 1.1); py = clamp(u.y, 0.05, 0.9); });
        const up = (e) => { if (pid === e.pointerId) pid = null; };
        canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
        function serve(who) {
          server = who;
          if (who === 'me') ball = { x: px * 0.5, y: 0.35, z: 0.2, vx: (Math.random() - 0.5) * 0.6, vy: 2.5, vz: 2.6, lastHit: 'me' };
          else ball = { x: aiX * 0.5, y: 0.35, z: TABLE_L - 0.2, vx: (Math.random() - 0.5) * 0.6, vy: 2.5, vz: -2.6, lastHit: 'ai' };
          rally = 0; rallyEl.textContent = 'ラリー0';
        }
        function point(who, why) {
          if (who === 'me') me++; else ai++;
          scoreEl.textContent = `じぶん${me} - ${ai}あいて`;
          say(why, 1300);
          ball = null;
          if (me >= WIN || ai >= WIN) { setTimeout(finish, 1200); return; }
          serveAt = performance.now() + 1400;
          server = who === 'me' ? 'ai' : 'me';
        }
        function step(dt, now) {
          if (!ball) { if (serveAt && now > serveAt) { serveAt = 0; serve(server); } return; }
          const b = ball;
          b.vy -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
          // テーブルで バウンド
          if (b.y < 0.02 && b.vy < 0) {
            if (Math.abs(b.x) <= TABLE_HW + 0.02 && b.z >= -0.02 && b.z <= TABLE_L + 0.02) { b.y = 0.02; b.vy = Math.abs(b.vy) * 0.82; }
            else { point(b.lastHit === 'me' ? 'me' : 'ai', b.lastHit === 'me' ? '🎉あいてがかえせなかった!' : 'あいてのポイント…'); return; }
          }
          // ネット
          if (Math.abs(b.z - TABLE_L / 2) < 0.03 && b.y < NET_H && Math.abs(b.x) < TABLE_HW + 0.1) { point(b.lastHit === 'me' ? 'ai' : 'me', b.lastHit === 'me' ? 'ネットにかかった…' : 'あいてがネットにかけた!'); return; }
          // じぶんの ラケット
          if (b.z <= 0.05 && b.vz < 0) {
            if (Math.abs(b.x - px) < 0.26 && Math.abs(b.y - py) < 0.3) {
              const off = (b.x - px) / 0.26, swing = clamp(pvx, -1.5, 1.5);
              const power = 2.8 + Math.min(1.4, Math.abs(swing) * 0.8) + rally * 0.05;
              b.vz = power; b.vx = off * 1.4 + swing * 0.8 - b.x * 0.4; b.vy = 2.55 + Math.max(0, 0.25 - b.y) * 5; b.lastHit = 'me';
              sfx('pop'); rally++; bestRally = Math.max(bestRally, rally); rallyEl.textContent = 'ラリー' + rally; hitFlash = 1;
            } else if (b.z < -0.25) { point('ai', 'とれなかった…'); return; }
          }
          // あいての ラケット(AI)
          if (b.z >= TABLE_L - 0.05 && b.vz > 0) {
            if (Math.abs(b.x - aiX) < 0.28) {
              const off = (b.x - aiX) / 0.28;
              b.vz = -(2.6 + rally * 0.06 + difficulty * 0.6); b.vx = off * 1.0 + (Math.random() - 0.5) * 0.9 - b.x * 0.5; b.vy = 2.5 + Math.random() * 0.4; b.lastHit = 'ai';
            } else if (b.z > TABLE_L + 0.25) { point('me', '🎉あいてがミス!'); return; }
          }
          if (b.z < -1 || b.z > TABLE_L + 1 || Math.abs(b.x) > 2.5) { point(b.lastHit === 'me' ? 'me' : 'ai', b.lastHit === 'me' ? '🎉ポイント!' : 'アウト…'); }
        }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#26304a'); bg.addColorStop(0.5, '#3a4664'); bg.addColorStop(1, '#5b6a8a');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          const tl = project(-TABLE_HW, 0, 0), tr = project(TABLE_HW, 0, 0), fl = project(-TABLE_HW, 0, TABLE_L), fr = project(TABLE_HW, 0, TABLE_L);
          ctx.fillStyle = '#1f6fb5'; ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(fl.x, fl.y); ctx.lineTo(fr.x, fr.y); ctx.lineTo(tr.x, tr.y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
          const ml = project(0, 0, 0), mf = project(0, 0, TABLE_L); ctx.beginPath(); ctx.moveTo(ml.x, ml.y); ctx.lineTo(mf.x, mf.y); ctx.stroke();
          // ネット
          const nl = project(-TABLE_HW - 0.1, 0, TABLE_L / 2), nr = project(TABLE_HW + 0.1, 0, TABLE_L / 2), nlt = project(-TABLE_HW - 0.1, NET_H, TABLE_L / 2), nrt = project(TABLE_HW + 0.1, NET_H, TABLE_L / 2);
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(nl.x, nlt.y, nr.x - nl.x, nl.y - nlt.y); ctx.strokeStyle = '#fff'; ctx.strokeRect(nl.x, nlt.y, nr.x - nl.x, nl.y - nlt.y);
          // あいて
          const ap = project(aiX, aiY, TABLE_L + 0.15); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.ellipse(ap.x, ap.y, 0.13 * ap.s, 0.15 * ap.s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.font = `${Math.max(10, 0.4 * ap.s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('🤖', ap.x, ap.y - 0.1 * ap.s);
          // ボール
          if (ball) { const sh = project(ball.x, 0, ball.z); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 0.05 * sh.s, 0.02 * sh.s, 0, 0, Math.PI * 2); ctx.fill(); const p = project(ball.x, ball.y, ball.z); ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2, 0.04 * p.s), 0, Math.PI * 2); ctx.fill(); }
          // じぶんの ラケット
          const rp = project(px, py, 0.02);
          ctx.fillStyle = hitFlash > 0 ? '#ff8f8f' : '#d64545'; ctx.beginPath(); ctx.ellipse(rp.x, rp.y, 0.16 * rp.s, 0.18 * rp.s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#3b1f10'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#c99a5b'; ctx.fillRect(rp.x - 0.03 * rp.s, rp.y + 0.15 * rp.s, 0.06 * rp.s, 0.18 * rp.s);
          if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - 0.1);
          if (!ball && serveAt) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 5; ctx.fillText((server === 'me' ? 'じぶんの' : 'あいての') + 'サーブ…', W / 2, H * 0.55); ctx.shadowBlur = 0; }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 95, 10, 190, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 23); }
        }
        function loop(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          pvx = (px - prevPx) / Math.max(0.001, dt); prevPx = px; prevPy = py;
          if (ball) { const tx = ball.vz > 0 ? clamp(ball.x + ball.vx * Math.max(0, (TABLE_L - ball.z) / Math.max(0.1, ball.vz)) * 0.9 + (Math.random() - 0.5) * AI_ERR, -1, 1) : 0; aiX += clamp(tx - aiX, -AI_SPEED * dt, AI_SPEED * dt); }
          const sub = 4; for (let i = 0; i < sub; i++) step(dt / sub, now);
          render(now);
          if (now - startTime > TIME_LIMIT_MS) { finish(); return; }
          rafId = requestAnimationFrame(loop);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const won = me > ai;
          const score = clamp(Math.round((won ? 62 : 20) + (me - ai) * 5 + Math.min(18, bestRally * 2)), 12, 100);
          say(won ? `🏆 ${me}-${ai}でかった!さいだいラリー${bestRally}` : `${me}-${ai}でまけた…さいだいラリー${bestRally}`, 2200);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        serveAt = performance.now() + MG_ACTION_START_GRACE_MS + 600;
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const PING_PONG_VARIANTS = [mg('pingpong-3d', makePingPongGame({ title: '3Dたっきゅう!ラリーであいてをぬけ' }))];

  // ================================================================
  // フラッグシップ新作: れんさパズル / かくとう / フリーキック / タワーディフェンス / ローグライク
  // ================================================================

  // --- れんさパズル: 2こ1くみの いろだまを つんで、おなじ いろが 4こ
  //     つながると きえる。きえた あとに おちて また つながると れんさ! ---
  function makeChainPuzzleGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 6, ROWS = 12, COLORS = difficulty > 0.6 ? 5 : 4;
        const PALETTE = [['#ff5f7e', '#ffb3c1'], ['#4cc9f0', '#bdefff'], ['#7ed957', '#d2f5c0'], ['#ffd23f', '#fff0b3'], ['#c77dff', '#ead9ff']];
        const DURATION_MS = mgDuration(Math.round(lerp(60000, 50000, difficulty)));
        const board = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
        let piece = null, nextPair = [rnd(), rnd()], popped = 0, chains = 0, maxChain = 0, score = 0, running = true, rafId = null, last = null, dropAcc = 0, phase = 'fall', phaseUntil = 0, popping = [], chainNow = 0, msg = '', msgUntil = 0, softHeld = false, gameOver = false;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        function rnd() { return Math.floor(Math.random() * COLORS); }
        container.innerHTML = `
          <div class="mg-header"><span id="cpTimer">のこり: ${Math.ceil(DURATION_MS / 1000)}s</span><span id="cpScore">0pt／さいだい0れんさ</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="cpCanvas"></canvas></div>
          <div class="mg-hint" id="cpHint">おなじいろを4こつなげるときえる。きえたあとにおちてつながればれんさ!</div>
          <div class="mg-falling-controls"><button class="mg-tap-btn" id="fbLeft" data-hold="step" data-key="left">◀</button><button class="mg-tap-btn" id="fbRight" data-hold="step" data-key="right">▶</button><button class="mg-tap-btn fb-rotate" id="fbRotate" data-key="up">↻かいてん</button><button class="mg-tap-btn fb-soft mg-hold-btn" id="fbSoft" data-key="down">▼さげる</button><button class="mg-tap-btn fb-hard" id="fbDrop" data-key="action">⏬いっきに</button></div>`;
        const canvas = container.querySelector('#cpCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 300);
        const CELL = Math.floor(Math.min((W - 70) / COLS, (H - 8) / ROWS)), OX = 8, OY = H - CELL * ROWS - 4;
        const timerEl = container.querySelector('#cpTimer'), scoreEl = container.querySelector('#cpScore'), hint = container.querySelector('#cpHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function spawn() {
          piece = { x: 2, y: 0, rot: 0, a: nextPair[0], b: nextPair[1] };
          nextPair = [rnd(), rnd()];
          if (!fits(piece)) { gameOver = true; finish(); }
        }
        function cells(p) { const d = [[0, -1], [1, 0], [0, 1], [-1, 0]][p.rot]; return [{ x: p.x, y: p.y, c: p.a }, { x: p.x + d[0], y: p.y + d[1], c: p.b }]; }
        function fits(p) { return cells(p).every((c) => c.x >= 0 && c.x < COLS && c.y < ROWS && (c.y < 0 || board[c.y][c.x] === -1)); }
        function move(dx) { if (!piece || phase !== 'fall') return; const q = { ...piece, x: piece.x + dx }; if (fits(q)) piece = q; }
        function rotate() { if (!piece || phase !== 'fall') return; for (const kick of [0, -1, 1]) { const q = { ...piece, rot: (piece.rot + 1) % 4, x: piece.x + kick }; if (fits(q)) { piece = q; return; } } }
        function stepDown() { if (!piece) return false; const q = { ...piece, y: piece.y + 1 }; if (fits(q)) { piece = q; return true; } lock(); return false; }
        function hardDrop() { if (!piece || phase !== 'fall') return; while (stepDown()); }
        function lock() {
          for (const c of cells(piece)) if (c.y >= 0) board[c.y][c.x] = c.c;
          piece = null; chainNow = 0; applyGravity(); phase = 'settle'; phaseUntil = performance.now() + 120;
        }
        function applyGravity() { for (let x = 0; x < COLS; x++) { let w = ROWS - 1; for (let y = ROWS - 1; y >= 0; y--) { if (board[y][x] !== -1) { const v = board[y][x]; board[y][x] = -1; board[w][x] = v; w--; } } } }
        function findGroups() {
          const seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false)); const groups = [];
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
            if (board[y][x] === -1 || seen[y][x]) continue;
            const col = board[y][x], stack = [[x, y]], g = []; seen[y][x] = true;
            while (stack.length) { const [cx, cy] = stack.pop(); g.push([cx, cy]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !seen[ny][nx] && board[ny][nx] === col) { seen[ny][nx] = true; stack.push([nx, ny]); } } }
            if (g.length >= 4) groups.push(g);
          }
          return groups;
        }
        function resolve() {
          const groups = findGroups();
          if (!groups.length) { phase = 'fall'; if (chainNow > 0) { chains++; maxChain = Math.max(maxChain, chainNow); } spawn(); return; }
          chainNow++;
          popping = groups.flat();
          const n = popping.length;
          const mult = chainNow === 1 ? 1 : chainNow === 2 ? 2 : chainNow === 3 ? 4 : chainNow === 4 ? 8 : 16;
          sfx('pop'); score += n * 10 * mult; popped += n;
          if (chainNow >= 2) say(chainNow + 'れんさ!×' + mult, 1200); else if (n >= 6) say('おおきくけした!', 800);
          scoreEl.textContent = score + 'pt／さいだい' + Math.max(maxChain, chainNow) + 'れんさ';
          phase = 'pop'; phaseUntil = performance.now() + 340;
        }
        function afterPop() { for (const [x, y] of popping) board[y][x] = -1; popping = []; applyGravity(); phase = 'settle'; phaseUntil = performance.now() + 140; }
        container.querySelector('#fbLeft').addEventListener('pointerdown', (e) => { e.preventDefault(); move(-1); });
        container.querySelector('#fbRight').addEventListener('pointerdown', (e) => { e.preventDefault(); move(1); });
        container.querySelector('#fbRotate').addEventListener('pointerdown', (e) => { e.preventDefault(); rotate(); });
        container.querySelector('#fbDrop').addEventListener('pointerdown', (e) => { e.preventDefault(); hardDrop(); });
        bindHeldButton(container.querySelector('#fbSoft'), (v) => { softHeld = v; });
        let swipe = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointerup', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) { rotate(); return; } if (Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? -1 : 1); else if (dy > 0) hardDrop(); });
        canvas.addEventListener('pointercancel', () => { swipe = null; });
        function drawBlob(px, py, col, size, alpha = 1, glow = false) {
          const [c1, c2] = PALETTE[col]; ctx.globalAlpha = alpha;
          if (glow) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 12; }
          const g = ctx.createRadialGradient(px - size * 0.2, py - size * 0.25, size * 0.1, px, py, size * 0.55); g.addColorStop(0, c2); g.addColorStop(1, c1);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, size * 0.46, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - size * 0.14, py - size * 0.06, size * 0.1, 0, Math.PI * 2); ctx.arc(px + size * 0.14, py - size * 0.06, size * 0.1, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(px - size * 0.12, py - size * 0.05, size * 0.05, 0, Math.PI * 2); ctx.arc(px + size * 0.16, py - size * 0.05, size * 0.05, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#1e2233'; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#2a3048'; ctx.fillRect(OX, OY, CELL * COLS, CELL * ROWS);
          ctx.strokeStyle = 'rgba(255,255,255,.06)'; for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(OX + x * CELL, OY); ctx.lineTo(OX + x * CELL, OY + CELL * ROWS); ctx.stroke(); } for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(OX, OY + y * CELL); ctx.lineTo(OX + CELL * COLS, OY + y * CELL); ctx.stroke(); }
          // つながり
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = board[y][x]; if (c === -1) continue; ctx.fillStyle = PALETTE[c][0]; if (x + 1 < COLS && board[y][x + 1] === c) ctx.fillRect(OX + x * CELL + CELL / 2, OY + y * CELL + CELL * 0.3, CELL, CELL * 0.4); if (y + 1 < ROWS && board[y + 1][x] === c) ctx.fillRect(OX + x * CELL + CELL * 0.3, OY + y * CELL + CELL / 2, CELL * 0.4, CELL); }
          const popSet = new Set(popping.map(([x, y]) => x + ',' + y));
          const popT = phase === 'pop' ? (phaseUntil - now) / 340 : 1;
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const c = board[y][x]; if (c === -1) continue; const isPop = popSet.has(x + ',' + y); drawBlob(OX + x * CELL + CELL / 2, OY + y * CELL + CELL / 2, c, isPop ? CELL * (0.6 + 0.5 * popT) : CELL, isPop ? Math.max(0.2, popT) : 1, isPop); }
          if (piece) { const gy = ghostY(); for (const c of cells({ ...piece, y: gy })) if (c.y >= 0) { ctx.strokeStyle = PALETTE[c.c][0]; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.arc(OX + c.x * CELL + CELL / 2, OY + c.y * CELL + CELL / 2, CELL * 0.4, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; } for (const c of cells(piece)) if (c.y >= 0) drawBlob(OX + c.x * CELL + CELL / 2, OY + c.y * CELL + CELL / 2, c.c, CELL); }
          // NEXT
          const nx = OX + CELL * COLS + 12; ctx.fillStyle = 'rgba(255,255,255,.08)'; mgRoundRect(ctx, nx, OY, W - nx - 6, CELL * 3, 8);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('NEXT', nx + (W - nx - 6) / 2, OY + 4);
          drawBlob(nx + (W - nx - 6) / 2, OY + CELL * 1.2, nextPair[1], CELL * 0.8); drawBlob(nx + (W - nx - 6) / 2, OY + CELL * 2.1, nextPair[0], CELL * 0.8);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.fillText('けした', nx + (W - nx - 6) / 2, OY + CELL * 3.4); ctx.font = 'bold 16px sans-serif'; ctx.fillText(String(popped), nx + (W - nx - 6) / 2, OY + CELL * 3.9);
          ctx.font = 'bold 11px sans-serif'; ctx.fillText('れんさ', nx + (W - nx - 6) / 2, OY + CELL * 5.2); ctx.font = 'bold 16px sans-serif'; ctx.fillText(String(maxChain), nx + (W - nx - 6) / 2, OY + CELL * 5.7);
          if (now < msgUntil) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#ff5f7e'; ctx.shadowBlur = 10; ctx.fillText(msg, OX + CELL * COLS / 2, OY + CELL * 4); ctx.shadowBlur = 0; }
          if (now < startTime) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('READY…', OX + CELL * COLS / 2, OY + CELL * 5); }
        }
        function ghostY() { let q = { ...piece }; while (fits({ ...q, y: q.y + 1 })) q.y++; return q.y; }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) {
            if (phase === 'fall') {
              if (!piece) spawn();
              if (piece) { const interval = softHeld ? 0.05 : Math.max(0.28, 0.75 - (now - startTime) / 90000); dropAcc += dt; if (dropAcc >= interval) { dropAcc = 0; stepDown(); } }
            } else if (phase === 'settle' && now >= phaseUntil) resolve();
            else if (phase === 'pop' && now >= phaseUntil) afterPop();
          }
          if (!running) return;
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const result = clamp(Math.round(12 + popped * 0.7 + maxChain * 9 + Math.min(20, score / 80)), 10, 100);
          say(gameOver ? 'つみあがった…' + popped + 'こけした' : 'しゅうりょう!' + popped + 'こけした/さいだい' + maxChain + 'れんさ', 2200);
          render(performance.now());
          setTimeout(() => onComplete(result), 900);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const CHAIN_PUZZLE_VARIANTS = [mg('chain-puzzle', makeChainPuzzleGame({ title: 'れんさパズル!いろだまを4こつなげてけそう' }))];

  // --- かくとう(リアルタイム): よこから 見た ステージで、うごく・パンチ・
  //     キック・ガードを つかいわけて AIあいてを たおす ---
  function makeStreetFightGame({ title, rival }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(50000), FLOOR = 0.78;
        const me = { x: 0.25, hp: 100, face: 1, state: 'idle', stateUntil: 0, guard: false, stun: 0, emoji: currentSprite(), color: '#3a86ff', combo: 0 };
        const ai = { x: 0.75, hp: 100, face: -1, state: 'idle', stateUntil: 0, guard: false, stun: 0, emoji: rival.emoji, color: rival.color, think: 0, aggro: lerp(0.55, 0.85, difficulty) };
        let running = true, rafId = null, last = null, msg = '', msgUntil = 0, shake = 0, sparks = [], leftHeld = false, rightHeld = false, hits = 0, taken = 0, ko = null;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="sfTimer">のこり: 50s</span><span id="sfRound">${rival.name}とたいせん</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="sfCanvas"></canvas></div>
          <div class="mg-hint" id="sfHint">パンチははやい、キックはつよくてふきとばす。あいてがひかったらガード(ながおし)!</div>
          <div class="mg-fight-controls"><button class="mg-tap-btn mg-hold-btn" id="sfLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="sfRight" data-key="right">▶</button><button class="mg-tap-btn punch" id="sfPunch" data-key="action">👊パンチ</button><button class="mg-tap-btn kick" id="sfKick" data-key="action2">🦵キック</button><button class="mg-tap-btn mg-hold-btn guard" id="sfGuard" data-key="down">🛡️ガード</button></div>`;
        const canvas = container.querySelector('#sfCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 230);
        const timerEl = container.querySelector('#sfTimer'), hint = container.querySelector('#sfHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        bindHeldButton(container.querySelector('#sfLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#sfRight'), (v) => { rightHeld = v; });
        bindHeldButton(container.querySelector('#sfGuard'), (v) => { me.guard = v; });
        container.querySelector('#sfPunch').addEventListener('pointerdown', (e) => { e.preventDefault(); attack(me, ai, 'punch'); });
        container.querySelector('#sfKick').addEventListener('pointerdown', (e) => { e.preventDefault(); attack(me, ai, 'kick'); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); attack(me, ai, p.ny < 0.5 ? 'punch' : 'kick'); });
        const MOVES = { punch: { windup: 120, active: 110, recover: 180, range: 0.17, dmg: 7, push: 0.02 }, kick: { windup: 260, active: 140, recover: 320, range: 0.23, dmg: 13, push: 0.07 } };
        function attack(f, target, kind) {
          const now = performance.now();
          if (!running || now < startTime || f.state !== 'idle' || f.stun > 0 || f.guard) return;
          f.state = 'windup'; f.move = kind; f.stateUntil = now + MOVES[kind].windup; f.hitDone = false; if (f === me) sfx('whoosh');
        }
        function updateFighter(f, target, dt, now) {
          if (f.stun > 0) { f.stun -= dt; if (f.stun <= 0) f.state = 'idle'; return; }
          const mv = MOVES[f.move] || MOVES.punch;
          if (f.state === 'windup' && now >= f.stateUntil) { f.state = 'active'; f.stateUntil = now + mv.active; }
          else if (f.state === 'active') {
            if (!f.hitDone && Math.abs(target.x - f.x) < mv.range + 0.06 && Math.sign(target.x - f.x) === f.face) {
              f.hitDone = true;
              const blocked = target.guard && target.stun <= 0;
              const dmg = blocked ? Math.round(mv.dmg * 0.2) : mv.dmg;
              target.hp = Math.max(0, target.hp - dmg);
              target.x = clamp(target.x + f.face * (blocked ? mv.push * 0.5 : mv.push), 0.08, 0.92);
              if (!blocked) { target.stun = f.move === 'kick' ? 0.45 : 0.25; target.state = 'hit'; target.guard = false; shake = f.move === 'kick' ? 7 : 4; }
              sparks.push({ x: target.x, y: FLOOR - 0.45, born: now, blocked }); sfx(blocked ? 'tick' : 'hit');
              if (f === me) { hits++; if (!blocked) { me.combo++; if (me.combo >= 3) say('🔥 ' + me.combo + 'れんぞくヒット!', 800); } else say('ガードされた!', 600); }
              else { taken++; me.combo = 0; if (blocked) say('🛡️ガードせいこう!', 700); }
              if (target.hp <= 0) { ko = target === ai ? 'win' : 'lose'; setTimeout(() => finish(), 900); }
            }
            if (now >= f.stateUntil) { f.state = 'recover'; f.stateUntil = now + mv.recover; }
          } else if (f.state === 'recover' && now >= f.stateUntil) f.state = 'idle';
        }
        function aiThink(dt, now) {
          if (ai.stun > 0 || ai.state !== 'idle') return;
          ai.think -= dt; if (ai.think > 0) return;
          ai.think = 0.12 + Math.random() * 0.2;
          const dist = Math.abs(me.x - ai.x);
          ai.face = me.x < ai.x ? -1 : 1;
          const threatened = me.state === 'windup' && dist < 0.3;
          if (threatened && Math.random() < lerp(0.45, 0.8, difficulty)) { ai.guard = true; ai.guardUntil = now + 420; return; }
          ai.guard = false;
          if (dist > 0.26) { ai.x = clamp(ai.x + ai.face * 0.55 * dt * 4, 0.08, 0.92); }
          else if (Math.random() < ai.aggro) attack(ai, me, Math.random() < 0.55 ? 'punch' : 'kick');
          else if (Math.random() < 0.3) ai.x = clamp(ai.x - ai.face * 0.5 * dt * 4, 0.08, 0.92);
        }
        function drawFighter(f, now, isMe) {
          const px = f.x * W, base = FLOOR * H, s = 1;
          const bob = f.state === 'idle' ? Math.sin(now / 160 + (isMe ? 0 : 2)) * 2 : 0;
          const lean = f.state === 'windup' ? -f.face * 6 : f.state === 'active' ? f.face * 10 : f.state === 'hit' ? -f.face * 12 : 0;
          ctx.save(); ctx.translate(px, base);
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.translate(lean, bob);
          // あし
          ctx.strokeStyle = '#2b2f3a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
          const kick = f.state === 'active' && f.move === 'kick';
          ctx.beginPath(); ctx.moveTo(-6, -34); ctx.lineTo(-10, -4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(6, -34); if (kick) ctx.lineTo(f.face * 34, -30); else ctx.lineTo(10, -4); ctx.stroke();
          if (kick) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.face * 38, -30, 7, 0, Math.PI * 2); ctx.fill(); }
          // どう
          ctx.fillStyle = f.color; mgRoundRect(ctx, -14, -66, 28, 36, 8);
          ctx.fillStyle = mgShade(f.color, 0.8); mgRoundRect(ctx, -14, -46, 28, 8, 3);
          // うで
          ctx.strokeStyle = f.color; ctx.lineWidth = 7;
          const punch = f.state === 'active' && f.move === 'punch';
          ctx.beginPath(); ctx.moveTo(f.face * 10, -58); if (punch) ctx.lineTo(f.face * 40, -56); else if (f.guard) ctx.lineTo(f.face * 18, -44); else ctx.lineTo(f.face * 20, -40); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-f.face * 10, -58); if (f.guard) ctx.lineTo(f.face * 14, -60); else ctx.lineTo(-f.face * 14, -42); ctx.stroke();
          ctx.fillStyle = '#ffe1b8'; ctx.beginPath(); ctx.arc(punch ? f.face * 44 : f.guard ? f.face * 18 : f.face * 20, punch ? -56 : f.guard ? -46 : -40, 7, 0, Math.PI * 2); ctx.fill();
          if (f.guard) { ctx.fillStyle = 'rgba(120,200,255,.45)'; ctx.beginPath(); ctx.arc(f.face * 20, -56, 18, 0, Math.PI * 2); ctx.fill(); }
          // あたま(えもじ)
          ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (f.stun > 0) ctx.rotate(-f.face * 0.2);
          ctx.fillText(f.emoji, 0, -84);
          if (f.state === 'windup') { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -84, 22 + (f.stateUntil - now) / 20, 0, Math.PI * 2); ctx.stroke(); }
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          ctx.save();
          if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake = Math.max(0, shake - 0.6); }
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, rival.bg[0]); bg.addColorStop(0.75, rival.bg[1]); bg.addColorStop(0.76, rival.floor[0]); bg.addColorStop(1, rival.floor[1]);
          ctx.fillStyle = bg; ctx.fillRect(-10, -10, W + 20, H + 20);
          ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.globalAlpha = 0.85;
          rival.decor.forEach((d, i) => ctx.fillText(d, 30 + i * 60, H * 0.62)); ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, FLOOR * H, W, 2);
          // HPバー
          const bar = (x, w, hp, col, right) => { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, 8, w, 12); ctx.fillStyle = hp > 40 ? col : '#ff5c5c'; ctx.fillRect(right ? x + w - w * hp / 100 : x, 8, w * hp / 100, 12); ctx.strokeStyle = '#fff'; ctx.strokeRect(x, 8, w, 12); };
          bar(8, W / 2 - 20, me.hp, '#3ae374', false); bar(W / 2 + 12, W / 2 - 20, ai.hp, '#3ae374', true);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('じぶん', 8, 22); ctx.textAlign = 'right'; ctx.fillText(rival.name, W - 8, 22);
          const order = me.x < ai.x ? [me, ai] : [ai, me];
          drawFighter(order[0], now, order[0] === me); drawFighter(order[1], now, order[1] === me);
          sparks = sparks.filter((s) => now - s.born < 260);
          for (const s of sparks) { const t = (now - s.born) / 260; ctx.globalAlpha = 1 - t; ctx.font = `${22 + t * 20}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.blocked ? '🛡️' : '💥', s.x * W, s.y * H); ctx.globalAlpha = 1; }
          if (ko) { ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = ko === 'win' ? '#ffd23f' : '#ff5c5c'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillText(ko === 'win' ? 'K.O.!' : 'まけ…', W / 2, H * 0.4); ctx.shadowBlur = 0; }
          else if (now < startTime) { ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('FIGHT!', W / 2, H * 0.4); ctx.shadowBlur = 0; }
          if (now < msgUntil && !ko) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 80, 30, 160, 22); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 41); }
          ctx.restore();
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime && !ko) {
            if (me.state === 'idle' && me.stun <= 0 && !me.guard) { const mv = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0); if (mv) { me.x = clamp(me.x + mv * 0.42 * dt, 0.08, 0.92); } }
            me.face = ai.x >= me.x ? 1 : -1;
            if (ai.guard && now > (ai.guardUntil || 0)) ai.guard = false;
            aiThink(dt, now);
            updateFighter(me, ai, dt, now); updateFighter(ai, me, dt, now);
            if (Math.abs(me.x - ai.x) < 0.12) { const mid = (me.x + ai.x) / 2; me.x = clamp(mid - me.face * 0.06, 0.08, 0.92); ai.x = clamp(mid + me.face * 0.06, 0.08, 0.92); }
          }
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0 && !ko) { ko = me.hp >= ai.hp ? 'win' : 'lose'; setTimeout(() => finish(), 900); }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const win = ko === 'win';
          const score = clamp(Math.round((win ? 50 : 16) + me.hp * 0.3 + Math.min(12, hits) - Math.min(15, taken)), 10, 100);
          say(win ? `🏆かった!のこりHP ${me.hp}` : `まけた…あいてののこりHP ${ai.hp}`, 2200);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const FIGHT_RIVALS = [
    { title: 'かくとうバトル!パンチ・キック・ガードでたおせ', rival: { name: 'おに', emoji: '👹', color: '#c0392b', bg: ['#2b1d3a', '#5a3a6b'], floor: ['#6b4a2b', '#4a3220'], decor: ['🏮', '⛩️', '🏮', '🎋'] } },
    { title: 'かくとうバトル!ロボとたたかえ', rival: { name: 'ロボ', emoji: '🤖', color: '#5f6f8a', bg: ['#0d1b2a', '#1b3a5a'], floor: ['#3a4a5a', '#2a3440'], decor: ['🛰️', '💡', '⚙️', '🔋'] } },
    { title: 'かくとうバトル!にんじゃにいどめ', rival: { name: 'にんじゃ', emoji: '🥷', color: '#2d2d3a', bg: ['#1a2a1a', '#3a5a3a'], floor: ['#5a4a3a', '#3a3020'], decor: ['🎋', '🌙', '🏯', '🍃'] } },
  ];
  const STREET_FIGHT_VARIANTS = [mg('street-fight', randomThemeGame(makeStreetFightGame, FIGHT_RIVALS))];

  // --- フリーキック(ぎじ3D): かべと キーパーを こえて ゴールへ。スワイプの
  //     むきと はやさ、とちゅうの まがりで カーブを かける ---
  function makeFreeKickGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const KICKS = 5, CAM_Z = -3, CAM_Y = 1.7, F_RATIO = 0.95;
        const GOAL_Z = 15, GOAL_HW = 3.66, GOAL_H = 2.44, WALL_Z = 8, BALL_R = 0.11;
        let kick = 0, goals = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, ball = null, drag = null, net = 0, results = [];
        let wallX = 0, keeper = { x: 0, tx: 0, dive: 0, react: 0 };
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="fkNo">1/${KICKS}本目</span><span id="fkScore">⚽ 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="fkCanvas"></canvas></div>
          <div class="mg-hint" id="fkHint">ボールからうえへはらってシュート。はやさでつよさ、ななめでねらい、とちゅうでまげるとカーブ!</div>`;
        const canvas = container.querySelector('#fkCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const F = W * F_RATIO, HOR = H * 0.42;
        const noEl = container.querySelector('#fkNo'), scoreEl = container.querySelector('#fkScore'), hint = container.querySelector('#fkHint');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function project(x, y, z) { const dz = z - CAM_Z; const s = F / dz; return { x: W / 2 + x * s, y: HOR + (CAM_Y - y) * s, s }; }
        function setup() { wallX = (Math.random() - 0.5) * 2.4; keeper = { x: (Math.random() - 0.5) * 1.2, tx: 0, dive: 0, react: lerp(0.55, 0.3, difficulty), reach: lerp(1.5, 2.2, difficulty) }; }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (ball || !running || kick >= KICKS) return; const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, pts: [{ x: p.x, y: p.y, t: performance.now() }] }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); drag.pts.push({ x: p.x, y: p.y, t: performance.now() }); if (drag.pts.length > 30) drag.pts.shift(); });
        const release = (e) => {
          if (!drag || e.pointerId !== drag.id) return;
          const pts = drag.pts; drag = null;
          const a = pts[0], b = pts[pts.length - 1];
          const dy = a.y - b.y, dx = b.x - a.x, dt = Math.max(50, b.t - a.t);
          if (dy < 30) { say('うえへはらってシュート!', 900); return; }
          const speed = Math.hypot(dx, dy) / dt * 1000;
          const power = clamp(speed / 1600 * 0.6 + dy / 220 * 0.4, 0.4, 1.25);
          const mid = pts[Math.floor(pts.length / 2)];
          const curve = clamp(((b.x - mid.x) - (mid.x - a.x)) / 50, -1, 1);
          const aim = clamp(dx / dy, -0.7, 0.7);
          sfx('whoosh'); ball = { x: 0, y: BALL_R, z: 0, vx: aim * 9 * power, vy: 4.2 + power * 4.6 * (1 - Math.abs(aim) * 0.3), vz: 14 + power * 12, curve: curve * 7, done: false, result: null };
          kick++; noEl.textContent = Math.min(KICKS, kick) + '/' + KICKS + '本目';
          keeper.tx = keeper.x; keeper.timer = 0;
        };
        canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
        function step(dt) {
          if (!ball) return;
          const b = ball;
          b.vy -= 9.8 * dt; b.vx += b.curve * dt * (b.z > 3 ? 1 : 0.3);
          b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
          if (b.y < BALL_R && b.vy < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy) * 0.45; b.vx *= 0.8; b.vz *= 0.85; }
          // かべ
          if (!b.done && b.z >= WALL_Z - 0.2 && b.z <= WALL_Z + 0.4 && b.y < 1.85 && Math.abs(b.x - wallX) < 1.35) { b.done = true; b.result = 'wall'; sfx('hit'); b.vz = -b.vz * 0.3; b.vx = (b.x - wallX) * 2; say('🧱かべにあたった!'); }
          // キーパー
          keeper.timer = (keeper.timer || 0) + dt;
          if (keeper.timer > keeper.react && !b.done) { const tGoal = Math.max(0.01, (GOAL_Z - b.z) / Math.max(1, b.vz)); const predX = b.x + b.vx * tGoal + b.curve * tGoal * tGoal * 0.5; keeper.tx = clamp(predX + (Math.random() - 0.5) * 0.6, -GOAL_HW, GOAL_HW); }
          keeper.x += clamp(keeper.tx - keeper.x, -keeper.reach * dt * 2.2, keeper.reach * dt * 2.2);
          if (!b.done && b.z >= GOAL_Z) {
            b.done = true;
            const inFrame = Math.abs(b.x) < GOAL_HW && b.y < GOAL_H;
            const saved = inFrame && Math.abs(b.x - keeper.x) < 0.75 && b.y < 2.1;
            if (!inFrame) { b.result = 'miss'; sfx('bad'); say(b.y >= GOAL_H ? 'うえにはずれた…' : 'よこにはずれた…'); b.vz *= 0.3; }
            else if (saved) { b.result = 'save'; keeper.dive = 1; sfx('bad'); say('🧤キーパーにとめられた!'); b.vz = -b.vz * 0.25; b.vx = (b.x - keeper.x) * 3; }
            else { b.result = 'goal'; goals++; net = 1; sfx('coin'); scoreEl.textContent = '⚽ ' + goals; say(Math.abs(b.curve) > 3 ? '⚽カーブがきまった!ゴール!!' : '⚽ゴール!!', 1500); b.vz *= 0.15; b.vx *= 0.2; }
            results.push(b.result);
          }
          if (b.z > GOAL_Z + 3 || b.z < -2 || (b.done && Math.hypot(b.vx, b.vz) < 0.5)) { ball = null; if (kick >= KICKS) setTimeout(finish, 900); else { setup(); } }
        }
        function drawPlayer(x, z, color, head, dive = 0, face = 1) {
          const p = project(x, 0, z); const s = p.s;
          ctx.save(); ctx.translate(p.x, p.y);
          ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, 0, 0.35 * s, 0.1 * s, 0, 0, Math.PI * 2); ctx.fill();
          if (dive) ctx.rotate(face * dive * 1.1);
          ctx.strokeStyle = '#2b2f3a'; ctx.lineWidth = Math.max(2, 0.12 * s); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-0.1 * s, -0.8 * s); ctx.lineTo(-0.16 * s, 0); ctx.moveTo(0.1 * s, -0.8 * s); ctx.lineTo(0.16 * s, 0); ctx.stroke();
          ctx.fillStyle = color; mgRoundRect(ctx, -0.26 * s, -1.4 * s, 0.52 * s, 0.65 * s, 0.1 * s);
          ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(-0.24 * s, -1.3 * s); ctx.lineTo(-0.45 * s, dive ? -1.7 * s : -0.9 * s); ctx.moveTo(0.24 * s, -1.3 * s); ctx.lineTo(0.45 * s, dive ? -1.7 * s : -0.9 * s); ctx.stroke();
          ctx.font = `${0.55 * s}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(head, 0, -1.65 * s);
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, HOR); sky.addColorStop(0, '#2b3a6b'); sky.addColorStop(1, '#5e7fc4'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HOR + 1);
          ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 60; i++) ctx.fillRect((i * 53) % W, HOR - 22 + (i * 17) % 18, 3, 3);
          const g = ctx.createLinearGradient(0, HOR, 0, H); g.addColorStop(0, '#2f8f3a'); g.addColorStop(1, '#4fb04a'); ctx.fillStyle = g; ctx.fillRect(0, HOR, W, H - HOR);
          for (let z = 2; z < GOAL_Z; z += 4) { const a = project(-10, 0, z), b2 = project(-10, 0, z + 2); ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(0, b2.y, W, a.y - b2.y); }
          // ゴール
          const gl = project(-GOAL_HW, 0, GOAL_Z), gr = project(GOAL_HW, 0, GOAL_Z), glt = project(-GOAL_HW, GOAL_H, GOAL_Z), grt = project(GOAL_HW, GOAL_H, GOAL_Z);
          const bl = project(-GOAL_HW, 0, GOAL_Z + 1.5), br = project(GOAL_HW, 0, GOAL_Z + 1.5), blt = project(-GOAL_HW, GOAL_H, GOAL_Z + 1.5), brt = project(GOAL_HW, GOAL_H, GOAL_Z + 1.5);
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
          for (let i = 0; i <= 8; i++) { const t = i / 8; ctx.beginPath(); ctx.moveTo(gl.x + (gr.x - gl.x) * t, glt.y + net * 3); ctx.lineTo(bl.x + (br.x - bl.x) * t, blt.y); ctx.lineTo(bl.x + (br.x - bl.x) * t, bl.y); ctx.stroke(); }
          for (let i = 0; i <= 5; i++) { const t = i / 5; ctx.beginPath(); ctx.moveTo(gl.x, glt.y + (gl.y - glt.y) * t); ctx.lineTo(bl.x, blt.y + (bl.y - blt.y) * t); ctx.lineTo(br.x, brt.y + (br.y - brt.y) * t); ctx.lineTo(gr.x, grt.y + (gr.y - grt.y) * t); ctx.stroke(); }
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(gl.x, gl.y); ctx.lineTo(glt.x, glt.y); ctx.lineTo(grt.x, grt.y); ctx.lineTo(gr.x, gr.y); ctx.stroke();
          if (net > 0) net = Math.max(0, net - 0.03);
          // ペナルティエリアの せん
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; const pl = project(-9, 0, GOAL_Z), pr = project(9, 0, GOAL_Z), pfl = project(-9, 0, GOAL_Z - 5.5), pfr = project(9, 0, GOAL_Z - 5.5);
          ctx.beginPath(); ctx.moveTo(pl.x, pl.y); ctx.lineTo(pfl.x, pfl.y); ctx.lineTo(pfr.x, pfr.y); ctx.lineTo(pr.x, pr.y); ctx.stroke();
          // キーパー・かべ・ボールを おくから じゅんに
          drawPlayer(keeper.x, GOAL_Z - 0.6, '#ffd23f', '🧤', keeper.dive, ball && ball.x < keeper.x ? -1 : 1);
          if (keeper.dive > 0) keeper.dive = Math.max(0, keeper.dive - 0.02);
          const drawBallAt = () => { if (!ball) return; const b = ball; const sh = project(b.x, 0, b.z); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 0.16 * sh.s, 0.06 * sh.s, 0, 0, Math.PI * 2); ctx.fill(); const p = project(b.x, b.y, b.z); const r = Math.max(2.5, BALL_R * p.s * 1.4); ctx.font = `${r * 2.4}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚽', p.x, p.y); };
          if (ball && ball.z > WALL_Z) drawBallAt();
          for (let i = -1; i <= 1; i++) drawPlayer(wallX + i * 0.62, WALL_Z, '#e63946', '🧍');
          if (ball && ball.z <= WALL_Z) drawBallAt();
          if (!ball && running && kick < KICKS) {
            const p = project(0, BALL_R, 0); ctx.font = `${BALL_R * p.s * 3.4}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚽', p.x, p.y);
            if (drag && drag.pts.length > 1) { const a = drag.pts[0], e = drag.pts[drag.pts.length - 1]; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (e.x - a.x), p.y + (e.y - a.y)); ctx.stroke(); ctx.setLineDash([]); }
            else { ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText('↑はらってシュート(まげるとカーブ)', W / 2, p.y - 36); ctx.shadowBlur = 0; }
          }
          ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
          ctx.fillText(results.map((r) => r === 'goal' ? '⚽' : r === 'save' ? '🧤' : r === 'wall' ? '🧱' : '✖').join(' '), 8, 8); ctx.shadowBlur = 0;
          if (now < msgUntil) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 95, HOR + 8, 190, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, HOR + 22); }
        }
        function loop(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.04, (now - last) / 1000); last = now;
          const sub = 3; for (let i = 0; i < sub; i++) step(dt / sub);
          render(now);
          if (now - startTime > 70000) { finish(); return; }
          rafId = requestAnimationFrame(loop);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = clamp(Math.round(12 + goals * 18 + (goals === KICKS ? 10 : 0)), 10, 100);
          say(`けっか: ${goals}／${KICKS}ゴール`, 2000);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        setup();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const FREE_KICK_VARIANTS = [mg('free-kick-3d', makeFreeKickGame({ title: 'フリーキック!かべとキーパーをこえてゴールへ' }))];

  // --- タワーディフェンス: みちを あるいてくる てきを、マスに おいた
  //     タワーで たおす。おかねで タワーを たてて/きょうかして 6ウェーブ まもりきる ---
  function makeTowerDefenseGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 8, ROWS = 7;
        const PATH = [[0, 1], [1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [1, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [5, 4], [5, 3], [5, 2], [6, 2], [7, 2]];
        const pathSet = new Set(PATH.map(([x, y]) => x + ',' + y));
        const TOWER_TYPES = { arrow: { name: 'ゆみ', emoji: '🏹', cost: 40, range: 1.9, rate: 0.55, dmg: 3, splash: 0 }, bomb: { name: 'ばくだん', emoji: '💣', cost: 70, range: 1.6, rate: 1.4, dmg: 6, splash: 0.9 }, ice: { name: 'こおり', emoji: '❄️', cost: 55, range: 1.7, rate: 0.9, dmg: 1.5, splash: 0, slow: 0.5 } };
        const WAVES = 6;
        let gold = 90, lives = 10, wave = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, selType = 'arrow', selected = null;
        let towers = [], enemies = [], shots = [], booms = [], spawnQueue = [], spawnTimer = 0, waveActive = false, nextWaveAt = 0, kills = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="tdWave">ウェーブ0/${WAVES}</span><span id="tdStat">💰 90／❤️ 10</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="tdCanvas"></canvas></div>
          <div class="mg-hint" id="tdHint">茶色い道の外にタワーを建てよう。タワーを選び、もう一度タップすると強化。敵が来る前にそなえて!</div>
          <div class="mg-td-controls"><button class="mg-tap-btn sel" id="tdArrow" data-key="left">🏹 40</button><button class="mg-tap-btn" id="tdBomb" data-key="up">💣 70</button><button class="mg-tap-btn" id="tdIce" data-key="right">❄️ 55</button><button class="mg-tap-btn primary" id="tdNext" data-key="action">つぎのウェーブ▶</button></div>`;
        const canvas = container.querySelector('#tdCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * ROWS / COLS));
        const CELL = W / COLS;
        const waveEl = container.querySelector('#tdWave'), statEl = container.querySelector('#tdStat'), hint = container.querySelector('#tdHint');
        const btns = { arrow: container.querySelector('#tdArrow'), bomb: container.querySelector('#tdBomb'), ice: container.querySelector('#tdIce') };
        const nextBtn = container.querySelector('#tdNext');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { statEl.textContent = `💰 ${gold}／❤️ ${lives}`; waveEl.textContent = `ウェーブ${wave}/${WAVES}`; for (const k in btns) btns[k].classList.toggle('sel', selType === k); };
        for (const k in btns) btns[k].addEventListener('pointerdown', (e) => { e.preventDefault(); selType = k; selected = null; hud(); });
        nextBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!waveActive && wave < WAVES) startWave(true); });
        canvas.addEventListener('pointerdown', (e) => {
          e.preventDefault(); if (!running) return;
          const p = mgPointerPos(canvas, e); const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
          if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
          const t = towers.find((tw) => tw.cx === cx && tw.cy === cy);
          if (t) { if (selected === t) { upgrade(t); } else { selected = t; say(`${TOWER_TYPES[t.type].emoji} Lv${t.level}／もういちどタップできょうか(💰${upgradeCost(t)})`, 1500); } return; }
          selected = null;
          if (pathSet.has(cx + ',' + cy)) { say('みちのうえにはたてられない', 800); return; }
          const tt = TOWER_TYPES[selType];
          if (gold < tt.cost) { say('おかねがたりない…', 800); return; }
          gold -= tt.cost; towers.push({ cx, cy, type: selType, level: 1, cd: 0 }); sfx('pop'); hud(); say(`${tt.emoji} ${tt.name}をたてた!`, 700);
        });
        const upgradeCost = (t) => 30 + t.level * 25;
        function upgrade(t) { const c = upgradeCost(t); if (t.level >= 3) { say('もうさいきょう!', 700); return; } if (gold < c) { say('おかねがたりない…', 800); return; } gold -= c; t.level++; sfx('levelup'); hud(); say(`⬆️ Lv${t.level}にきょうか!`, 800); }
        function startWave(early) {
          wave++; waveActive = true; hud();
          if (early && wave > 1) { gold += 15; say(`はやめのウェーブ!ボーナス💰15`, 1000); }
          const count = 6 + wave * 3, boss = wave === WAVES;
          spawnQueue = [];
          for (let i = 0; i < count; i++) {
            const fast = Math.random() < 0.25 + wave * 0.05;
            spawnQueue.push({ hp: (fast ? 5 : 9) * (1 + wave * 0.45) * lerp(0.85, 1.2, difficulty), speed: fast ? 1.5 : 0.9, emoji: fast ? '🐇' : ['👾', '🐌', '🐗', '🦂'][wave % 4], gold: fast ? 4 : 6 });
          }
          if (boss) spawnQueue.push({ hp: 140 * lerp(0.85, 1.25, difficulty), speed: 0.55, emoji: '🐉', gold: 40, boss: true });
          spawnTimer = 0;
        }
        function posAlong(d) { const i = Math.min(PATH.length - 2, Math.floor(d)); const t = d - i; const a = PATH[i], b = PATH[i + 1]; return { x: (a[0] + (b[0] - a[0]) * t + 0.5) * CELL, y: (a[1] + (b[1] - a[1]) * t + 0.5) * CELL }; }
        function update(dt, now) {
          if (waveActive) {
            spawnTimer -= dt;
            if (spawnQueue.length && spawnTimer <= 0) { const e = spawnQueue.shift(); enemies.push({ ...e, maxHp: e.hp, d: 0, slow: 0 }); spawnTimer = e.boss ? 1.2 : 0.75; }
            if (!spawnQueue.length && !enemies.length) { waveActive = false; if (wave >= WAVES) { finish(true); return; } gold += 25; hud(); say(`ウェーブ${wave}クリア!💰+25`, 1400); nextWaveAt = now + 6000; }
          } else if (wave < WAVES && now > nextWaveAt) startWave(false);
          for (const e of enemies) {
            const sp = e.speed * (e.slow > 0 ? 0.5 : 1); if (e.slow > 0) e.slow -= dt;
            e.d += sp * dt;
            if (e.d >= PATH.length - 1) { e.dead = true; lives -= e.boss ? 3 : 1; hud(); sfx('bad'); say('てきがとおりぬけた!❤️-1', 900); if (lives <= 0) { finish(false); return; } }
          }
          enemies = enemies.filter((e) => !e.dead);
          for (const t of towers) {
            const tt = TOWER_TYPES[t.type]; t.cd -= dt; if (t.cd > 0) continue;
            const tx = (t.cx + 0.5) * CELL, ty = (t.cy + 0.5) * CELL, range = tt.range * CELL * (1 + (t.level - 1) * 0.15);
            let target = null, bestD = -1;
            for (const e of enemies) { const p = posAlong(e.d); if (Math.hypot(p.x - tx, p.y - ty) <= range && e.d > bestD) { bestD = e.d; target = e; } }
            if (!target) continue;
            t.cd = tt.rate / (1 + (t.level - 1) * 0.3);
            const p = posAlong(target.d);
            shots.push({ x: tx, y: ty, tx: p.x, ty: p.y, born: now, type: t.type });
            const dmg = tt.dmg * (1 + (t.level - 1) * 0.6);
            const hitList = tt.splash ? enemies.filter((e) => { const q = posAlong(e.d); return Math.hypot(q.x - p.x, q.y - p.y) <= tt.splash * CELL; }) : [target];
            if (tt.splash) booms.push({ x: p.x, y: p.y, born: now });
            for (const e of hitList) { e.hp -= dmg; if (tt.slow) e.slow = 1.2; if (e.hp <= 0 && !e.dead) { e.dead = true; kills++; gold += e.gold; hud(); sfx('tick'); } }
            enemies = enemies.filter((e) => !e.dead);
          }
          shots = shots.filter((s) => now - s.born < 120); booms = booms.filter((b) => now - b.born < 300);
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#5fae4a'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
          ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = CELL * 0.72; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); PATH.forEach(([x, y], i) => { const px = (x + 0.5) * CELL, py = (y + 0.5) * CELL; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }); ctx.stroke();
          ctx.strokeStyle = '#a97142'; ctx.lineWidth = CELL * 0.6; ctx.stroke();
          const s0 = posAlong(0), sE = posAlong(PATH.length - 1.001);
          ctx.font = `${CELL * 0.6}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚪', s0.x, s0.y); ctx.fillText('🏰', sE.x, sE.y);
          for (const t of towers) {
            const tx = (t.cx + 0.5) * CELL, ty = (t.cy + 0.5) * CELL, tt = TOWER_TYPES[t.type];
            if (selected === t) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(tx, ty, tt.range * CELL * (1 + (t.level - 1) * 0.15), 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = '#d9c9a5'; ctx.beginPath(); ctx.arc(tx, ty, CELL * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.stroke();
            ctx.font = `${CELL * 0.5}px sans-serif`; ctx.fillText(tt.emoji, tx, ty);
            for (let i = 0; i < t.level; i++) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(tx - CELL * 0.25 + i * CELL * 0.25, ty + CELL * 0.36, 2.5, 0, Math.PI * 2); ctx.fill(); }
          }
          for (const s of shots) { ctx.strokeStyle = s.type === 'ice' ? '#bdefff' : s.type === 'bomb' ? '#ffb347' : '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.tx, s.ty); ctx.stroke(); }
          for (const b of booms) { const t = (now - b.born) / 300; ctx.strokeStyle = `rgba(255,140,40,${1 - t})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, CELL * 0.9 * t, 0, Math.PI * 2); ctx.stroke(); }
          for (const e of enemies) {
            const p = posAlong(e.d); const sz = e.boss ? CELL * 0.85 : CELL * 0.55;
            ctx.font = `${sz}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            if (e.slow > 0) { ctx.fillStyle = 'rgba(150,220,255,.5)'; ctx.beginPath(); ctx.arc(p.x, p.y, sz * 0.6, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillText(e.emoji, p.x, p.y);
            ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(p.x - sz * 0.5, p.y - sz * 0.65, sz, 3); ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#3ae374' : '#ff5c5c'; ctx.fillRect(p.x - sz * 0.5, p.y - sz * 0.65, sz * clamp(e.hp / e.maxHp, 0, 1), 3);
          }
          if (!waveActive && wave < WAVES && running) { const secs = Math.max(0, Math.ceil((nextWaveAt - now) / 1000)); ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, 4, 160, 22); ctx.fillStyle = '#fff'; ctx.fillText(wave === 0 ? 'タワーをおいてそなえよう' : `つぎのウェーブまで${secs}s`, W / 2, 15); }
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 95, H - 30, 190, 24); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 18); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          update(dt, now);
          if (!running) return;
          render(now);
          if (now - startTime > 150000) { finish(lives > 0); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = win ? clamp(Math.round(62 + lives * 3.8), 60, 100) : clamp(Math.round(12 + wave * 6 + kills * 0.4), 10, 55);
          say(win ? `🏆まもりきった!❤️${lives}のこし` : `おしろがおちた…ウェーブ${wave}まで`, 2400);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        nextWaveAt = startTime + 12000;
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const TOWER_DEFENSE_VARIANTS = [mg('tower-defense', makeTowerDefenseGame({ title: 'タワーディフェンス!おしろを6ウェーブまもりきれ' }))];

  // --- ローグライク ダンジョン: ターンせいで うごく。まいかい ちがう
  //     ダンジョンを 3かい おりて、てきと たたかい、アイテムを ひろう ---
  function makeRoguelikeGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 11, ROWS = 11, FLOORS = 3;
        let floor = 1, map, seen, px, py, hp = 20, maxHp = 20, atk = 3, gold = 0, kills = 0, enemies = [], items = [], stairs, running = true, rafId = null, msg = '', msgUntil = 0, anim = [], log = [], turn = 0, potions = 0, dead = false;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="rgFloor">B1F</span><span id="rgStat">❤️ 20/20／⚔️ 3／💰 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="rgCanvas"></canvas></div>
          <div class="mg-hint" id="rgHint">1マスうごくとてきもうごく。てきにぶつかってこうげき。🧪はかいふく、⚔️はこうげき力アップ、🪜でつぎのかいへ</div>
          <div class="mg-tilt-dpad"><button class="mg-tap-btn" id="rgPotion" data-key="action2">🧪 0</button><button class="mg-tap-btn" id="rgUp" data-hold="step" data-key="up">▲</button><button class="mg-tap-btn" id="rgWait" data-key="action">⏳まつ</button><button class="mg-tap-btn" id="rgLeft" data-hold="step" data-key="left">◀</button><button class="mg-tap-btn" id="rgDown" data-hold="step" data-key="down">▼</button><button class="mg-tap-btn" id="rgRight" data-hold="step" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#rgCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / COLS;
        const floorEl = container.querySelector('#rgFloor'), statEl = container.querySelector('#rgStat'), hint = container.querySelector('#rgHint'), potionBtn = container.querySelector('#rgPotion');
        const say = (t, ms = 1500) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { statEl.textContent = `❤️ ${hp}/${maxHp}／⚔️ ${atk}／💰 ${gold}`; floorEl.textContent = 'B' + floor + 'F'; potionBtn.textContent = '🧪 ' + potions; };
        function genFloor() {
          map = generateMaze(COLS, ROWS, 10 + floor * 2).map((r) => r.split(''));
          // すこし ひろい へやを つくる
          for (let k = 0; k < 3; k++) { const rx = 1 + Math.floor(Math.random() * (COLS - 4)), ry = 1 + Math.floor(Math.random() * (ROWS - 4)); for (let y = ry; y < ry + 3; y++) for (let x = rx; x < rx + 3; x++) map[y][x] = '.'; }
          seen = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
          px = 1; py = 1; map[1][1] = '.';
          const d = mazeBfs(map.map((r) => r.join('')), 1, 1);
          const cells = []; for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (map[y][x] === '.' && d[y][x] >= 4) cells.push({ x, y, d: d[y][x] });
          cells.sort((a, b) => b.d - a.d);
          stairs = cells[0] || { x: COLS - 2, y: ROWS - 2 };
          const rest = cells.slice(1).sort(() => Math.random() - 0.5);
          enemies = []; items = [];
          const nE = 3 + floor + Math.round(difficulty * 2);
          for (let i = 0; i < nE && rest.length; i++) { const c = rest.pop(); const strong = Math.random() < 0.3 + floor * 0.15; enemies.push({ x: c.x, y: c.y, hp: strong ? 8 + floor * 3 : 4 + floor * 2, maxHp: strong ? 8 + floor * 3 : 4 + floor * 2, atk: strong ? 3 + floor : 1 + floor, emoji: strong ? ['👺', '🐗', '🧟'][floor - 1] : ['🦇', '🐀', '🕷️'][Math.floor(Math.random() * 3)], awake: false, gold: strong ? 12 : 5 }); }
          for (let i = 0; i < 2 && rest.length; i++) { const c = rest.pop(); items.push({ x: c.x, y: c.y, kind: 'potion', emoji: '🧪' }); }
          for (let i = 0; i < 3 && rest.length; i++) { const c = rest.pop(); items.push({ x: c.x, y: c.y, kind: 'gold', emoji: '💰' }); }
          if (rest.length) { const c = rest.pop(); items.push({ x: c.x, y: c.y, kind: 'sword', emoji: '⚔️' }); }
          reveal();
          hud();
        }
        function reveal() { for (let y = py - 2; y <= py + 2; y++) for (let x = px - 2; x <= px + 2; x++) if (y >= 0 && x >= 0 && y < ROWS && x < COLS && Math.abs(x - px) + Math.abs(y - py) <= 3) seen[y][x] = true; }
        const free = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && map[y][x] === '.';
        function tryMove(dx, dy) {
          if (!running || dead) return;
          const nx = px + dx, ny = py + dy;
          const en = enemies.find((e) => e.x === nx && e.y === ny);
          if (en) { hitEnemy(en); endTurn(); return; }
          if (!free(nx, ny)) { say('かべだ', 500); return; }
          anim.push({ kind: 'move', from: [px, py], born: performance.now() });
          px = nx; py = ny; reveal();
          const it = items.find((i) => i.x === px && i.y === py);
          if (it) { items.splice(items.indexOf(it), 1); if (it.kind === 'potion') { potions++; sfx('pop'); say('🧪くすりをひろった'); } else if (it.kind === 'gold') { gold += 10 + floor * 5; sfx('coin'); say('💰おかねをひろった'); } else { atk += 2; say('⚔️けんをひろった!こうげき力+2'); } hud(); }
          if (px === stairs.x && py === stairs.y) { if (floor >= FLOORS) { finish(true); return; } floor++; sfx('levelup'); say(`🪜 B${floor}Fへおりた…`, 1400); genFloor(); return; }
          endTurn();
        }
        function hitEnemy(en) {
          const dmg = atk + Math.floor(Math.random() * 2); en.hp -= dmg; en.awake = true; sfx('hit'); anim.push({ kind: 'hit', x: en.x, y: en.y, born: performance.now(), text: '-' + dmg });
          if (en.hp <= 0) { enemies.splice(enemies.indexOf(en), 1); kills++; gold += en.gold; say(`${en.emoji}をたおした!💰+${en.gold}`, 900); hud(); } else say(`${en.emoji}に${dmg}ダメージ`, 700);
        }
        function endTurn() {
          turn++;
          for (const e of enemies) {
            const dist = Math.abs(e.x - px) + Math.abs(e.y - py);
            if (dist <= 5) e.awake = true;
            if (!e.awake) { if (Math.random() < 0.3) { const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5); for (const [dx, dy] of dirs) if (free(e.x + dx, e.y + dy) && !enemies.some((o) => o.x === e.x + dx && o.y === e.y + dy)) { e.x += dx; e.y += dy; break; } } continue; }
            if (dist === 1) { const dmg = e.atk + Math.floor(Math.random() * 2); hp -= dmg; sfx('bad'); anim.push({ kind: 'hit', x: px, y: py, born: performance.now(), text: '-' + dmg, me: true }); say(`${e.emoji}のこうげき!${dmg}ダメージ`, 800); hud(); if (hp <= 0) { dead = true; finish(false); return; } continue; }
            const dmap = mazeBfs(map.map((r) => r.join('')), px, py);
            let best = null;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = e.x + dx, ny = e.y + dy; if (!free(nx, ny) || enemies.some((o) => o.x === nx && o.y === ny) || (nx === px && ny === py)) continue; if (dmap[ny][nx] >= 0 && (!best || dmap[ny][nx] < best.d)) best = { x: nx, y: ny, d: dmap[ny][nx] }; }
            if (best && best.d < dmap[e.y][e.x]) { e.x = best.x; e.y = best.y; }
          }
        }
        container.querySelector('#rgUp').addEventListener('pointerdown', (e) => { e.preventDefault(); tryMove(0, -1); });
        container.querySelector('#rgDown').addEventListener('pointerdown', (e) => { e.preventDefault(); tryMove(0, 1); });
        container.querySelector('#rgLeft').addEventListener('pointerdown', (e) => { e.preventDefault(); tryMove(-1, 0); });
        container.querySelector('#rgRight').addEventListener('pointerdown', (e) => { e.preventDefault(); tryMove(1, 0); });
        container.querySelector('#rgWait').addEventListener('pointerdown', (e) => { e.preventDefault(); if (running && !dead) { hp = Math.min(maxHp, hp + 1); hud(); endTurn(); } });
        potionBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || dead || potions <= 0) return; potions--; hp = Math.min(maxHp, hp + 10); sfx('good'); hud(); say('🧪 HPが10かいふく', 900); });
        let swipe = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointerup', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) { const p = mgPointerPos(canvas, e); const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL); const ddx = cx - px, ddy = cy - py; if (Math.abs(ddx) + Math.abs(ddy) === 1) tryMove(ddx, ddy); return; } if (Math.abs(dx) > Math.abs(dy)) tryMove(dx < 0 ? -1 : 1, 0); else tryMove(0, dy < 0 ? -1 : 1); });
        canvas.addEventListener('pointercancel', () => { swipe = null; });
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#0d0b12'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
            if (!seen[y][x]) continue;
            const inSight = Math.abs(x - px) + Math.abs(y - py) <= 3;
            const wall = map[y][x] === '#';
            ctx.fillStyle = wall ? (inSight ? '#4a3f5c' : '#2a2434') : (inSight ? '#8a7a66' : '#4a4238');
            ctx.fillRect(x * CELL, y * CELL, CELL + 0.5, CELL + 0.5);
            if (!wall) { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2); }
            else { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(x * CELL, y * CELL, CELL, 3); }
          }
          ctx.font = `${CELL * 0.72}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (seen[stairs.y][stairs.x]) ctx.fillText('🪜', (stairs.x + 0.5) * CELL, (stairs.y + 0.5) * CELL);
          for (const it of items) if (seen[it.y][it.x]) ctx.fillText(it.emoji, (it.x + 0.5) * CELL, (it.y + 0.5) * CELL);
          for (const e of enemies) { if (!seen[e.y][e.x] || Math.abs(e.x - px) + Math.abs(e.y - py) > 4) continue; ctx.fillText(e.emoji, (e.x + 0.5) * CELL, (e.y + 0.5) * CELL); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x * CELL + 3, e.y * CELL + 2, CELL - 6, 3); ctx.fillStyle = '#ff5c5c'; ctx.fillRect(e.x * CELL + 3, e.y * CELL + 2, (CELL - 6) * clamp(e.hp / e.maxHp, 0, 1), 3); }
          const mv = anim.find((a) => a.kind === 'move' && now - a.born < 110);
          let dx = 0, dy = 0; if (mv) { const t = 1 - (now - mv.born) / 110; dx = (mv.from[0] - px) * t; dy = (mv.from[1] - py) * t; }
          ctx.fillStyle = 'rgba(255,230,150,.18)'; ctx.beginPath(); ctx.arc((px + 0.5 + dx) * CELL, (py + 0.5 + dy) * CELL, CELL * 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.font = `${CELL * 0.8}px sans-serif`; ctx.fillText(currentSprite(), (px + 0.5 + dx) * CELL, (py + 0.5 + dy) * CELL);
          anim = anim.filter((a) => now - a.born < 600);
          for (const a of anim) if (a.kind === 'hit') { const t = (now - a.born) / 600; ctx.globalAlpha = 1 - t; ctx.fillStyle = a.me ? '#ff5c5c' : '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(a.text, (a.x + 0.5) * CELL, (a.y + 0.2) * CELL - t * 14); ctx.globalAlpha = 1; }
          if (now < msgUntil) { ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 100, H - 26, 200, 22); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 15); }
        }
        function loop(now) { if (!running) return; render(now); if (now - startTime > 180000) { finish(false); return; } rafId = requestAnimationFrame(loop); }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = win ? clamp(Math.round(60 + hp * 1.2 + Math.min(20, gold * 0.3)), 60, 100) : clamp(Math.round(12 + (floor - 1) * 14 + kills * 3 + Math.min(10, gold * 0.2)), 10, 58);
          say(win ? `🏆ダンジョンをぬけた!💰${gold}たおした${kills}` : dead ? `たおれた…B${floor}Fでちからつきた` : 'じかんぎれ…', 2400);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        genFloor();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const ROGUELIKE_VARIANTS = [mg('roguelike-dungeon', makeRoguelikeGame({ title: 'ローグライク!ダンジョンを3かいおりてだっしゅつ' }))];

  // ================================================================
  // フラッグシップ第2弾: グランプリ / 横スクロールシューティング / プラットフォーマー / 倉庫番 / オセロ
  // ================================================================

  // --- グランプリ: ライバル5台と 3しゅうの レース。ブーストパッドと オイルで
  //     じゅんいが いれかわる。ゴールした じゅんいが スコア ---
  function makeGrandPrixGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const LAPS = 3, TIME_LIMIT_MS = mgDuration(95000);
        const rivalColors = ['#3a86ff', '#ffbe0b', '#8338ec', '#06d6a0', '#f4f1de'];
        let position = 0, speed = 0, playerX = 0, steer = 0, steerTarget = 0, accelHeld = false, touchAccel = false, touchSteer = null, lap = 1, boostUntil = 0, slipUntil = 0;
        let running = true, rafId = null, last = null, flash = 0, msg = '', msgUntil = 0, leftHeld = false, rightHeld = false, finished = false, finalRank = 0, hits = 0, lastHit = -1e9;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS + 1500;
        container.innerHTML = `
          <div class="mg-header"><span id="gpLap">LAP 1/${LAPS}</span><span id="gpPos">6位／6</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="gpCanvas"></canvas></div>
          <div class="mg-hint" id="gpHint">アクセルを長押し、◀▶でハンドル操作。青いパッドでブースト、オイルはすべる。ライバルをぬいて1位をめざせ!</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="gpLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn primary" id="gpAccel" data-key="action">アクセル</button><button class="mg-tap-btn mg-hold-btn" id="gpRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#gpCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 215);
        const road = createPseudoRoad(ctx, W, H, { roadWidth: 1300, colors: (dark) => (dark ? { grass: '#4f9f4a', rumble: '#f3f3f3', road: '#5c5c66', lane: '#fff8c8' } : { grass: '#5aae52', rumble: '#d8383c', road: '#63636d' }) });
        const { SEG_LEN, PLAYER_Z, segments } = road;
        const MAX_SPEED = SEG_LEN * 34, ACCEL = MAX_SPEED / 2.6, COAST = -MAX_SPEED / 4, OFF_DECEL = -MAX_SPEED / 1.4, OFF_LIMIT = MAX_SPEED / 3;
        road.addRoad(10, 20, 10, 0, 0);
        for (let i = 0; i < 6; i++) { const dir = i % 2 ? -1 : 1; road.addRoad(10, 14 + Math.floor(Math.random() * 8), 10, dir * (2 + Math.random() * 2), (Math.random() - 0.5) * 50); if (i % 2) road.addRoad(6, 8, 6, 0, (Math.random() - 0.5) * 30); }
        road.addRoad(10, 16, 10, 0, -road.lastY() / SEG_LEN);
        const TRACK_LEN = road.trackLength();
        for (let n = 0; n < segments.length; n += 3) { if (Math.random() < 0.6) segments[n].sprites.push({ emoji: ['🌳', '🏁', '🌲', '📣'][Math.floor(Math.random() * 4)], offset: -1.5 - Math.random() * 1.4, size: 0.5 }); if (Math.random() < 0.6) segments[n].sprites.push({ emoji: ['🌳', '🎪', '🌲', '🏢'][Math.floor(Math.random() * 4)], offset: 1.5 + Math.random() * 1.4, size: 0.5 }); }
        for (let i = 0; i < 4; i++) segments[i].sprites.push({ emoji: '🏁', offset: i % 2 ? 1.1 : -1.1, size: 0.45 });
        const pads = [];
        for (let i = 0; i < 6; i++) { const n = 30 + Math.floor(Math.random() * (segments.length - 40)); const kind = i < 4 ? 'boost' : 'oil'; const offset = (Math.random() - 0.5) * 1.2; pads.push({ n, kind, offset }); segments[n].sprites.push({ emoji: '', offset, size: 0.42, draw: (c, sx, sy, px) => { c.fillStyle = kind === 'boost' ? 'rgba(80,160,255,.9)' : 'rgba(30,30,40,.8)'; c.beginPath(); c.ellipse(sx, sy - px * 0.1, px * 0.9, px * 0.28, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.font = `${px * 0.5}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(kind === 'boost' ? '»' : '~', sx, sy - px * 0.12); } }); }
        const rivals = rivalColors.map((color, i) => ({ color, z: SEG_LEN * (2 + i * 2.5), offset: (i % 2 ? 0.45 : -0.45) * (1 - i * 0.12), target: MAX_SPEED * lerp(0.78, 0.9, difficulty) * (0.94 + i * 0.02 + Math.random() * 0.04), speed: 0, lap: 1, size: 0.3, name: ['アオ', 'キイロ', 'ムラサキ', 'ミドリ', 'シロ'][i] }));
        for (const r of rivals) r.draw = (c, sx, sy, px) => drawRearCar(c, sx, sy, px, r.color, 0, false);
        const lapEl = container.querySelector('#gpLap'), posEl = container.querySelector('#gpPos'), hint = container.querySelector('#gpHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        bindHeldButton(container.querySelector('#gpLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#gpRight'), (v) => { rightHeld = v; });
        bindHeldButton(container.querySelector('#gpAccel'), (v) => { accelHeld = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} touchAccel = true; touchSteer = clamp((mgPointerPos(canvas, e).nx - 0.5) * 2.6, -1, 1); });
        canvas.addEventListener('pointermove', (e) => { if (!touchAccel) return; touchSteer = clamp((mgPointerPos(canvas, e).nx - 0.5) * 2.6, -1, 1); });
        const endTouch = () => { touchAccel = false; touchSteer = null; };
        canvas.addEventListener('pointerup', endTouch); canvas.addEventListener('pointercancel', endTouch);
        const progress = (z, l) => (l - 1) * TRACK_LEN + z;
        function rank() { const me = progress(position + PLAYER_Z, lap); return 1 + rivals.filter((r) => progress(r.z, r.lap) > me).length; }
        function update(dt, now) {
          const speedPct = speed / MAX_SPEED;
          const pz = position + PLAYER_Z;
          const seg = road.findSegment(pz % TRACK_LEN);
          steerTarget = touchSteer != null ? touchSteer : (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
          steer += (steerTarget - steer) * Math.min(1, dt * 9);
          const slipping = now < slipUntil, boosting = now < boostUntil;
          position += speed * dt;
          if (position >= TRACK_LEN) { position -= TRACK_LEN; lap++; sfx('notify'); if (lap > LAPS) { finished = true; finalRank = rank(); finish(); return; } lapEl.textContent = `LAP ${lap}/${LAPS}`; say(lap === LAPS ? '🏁ファイナルラップ!' : 'LAP ' + lap, 1200); }
          playerX += steer * dt * 2.2 * speedPct * (slipping ? 0.35 : 1);
          playerX -= dt * 2 * speedPct * speedPct * seg.curve * 0.26;
          if (slipping) playerX += Math.sin(now / 70) * dt * 0.6;
          const cap = boosting ? MAX_SPEED * 1.28 : MAX_SPEED;
          if (accelHeld || touchAccel) speed += ACCEL * dt * (boosting ? 1.6 : 1); else speed += COAST * dt;
          if (Math.abs(playerX) > 1) { if (speed > OFF_LIMIT) speed += OFF_DECEL * dt; }
          playerX = clamp(playerX, -2, 2);
          speed = clamp(speed, 0, cap);
          for (const p of pads) { const pz2 = p.n * SEG_LEN; if (!p.hitLap || p.hitLap !== lap) { if (Math.abs(((pz % TRACK_LEN) - pz2)) < SEG_LEN && Math.abs(playerX - p.offset) < 0.35) { p.hitLap = lap; if (p.kind === 'boost') { boostUntil = now + 1500; sfx('whoosh'); say('🚀ブースト!', 800); } else { slipUntil = now + 1100; speed *= 0.8; sfx('bad'); say('💦オイルですべった!', 900); } } } }
          for (const s of segments) s.dynamic.length = 0;
          for (const r of rivals) {
            const rseg = road.findSegment(r.z);
            r.speed += (r.target - r.speed) * Math.min(1, dt * 1.2);
            r.z += r.speed * dt;
            if (r.z >= TRACK_LEN) { r.z -= TRACK_LEN; r.lap++; }
            r.offset += (-(rseg.curve) * 0.08 - r.offset * 0.3) * dt;
            r.offset = clamp(r.offset, -0.8, 0.8);
            rseg.dynamic.push(r);
            const rel = progress(r.z, r.lap) - progress(pz, lap);
            if (Math.abs(rel) < SEG_LEN * 1.1 && Math.abs(playerX - r.offset) < 0.36) { if (rel > 0 && speed > r.speed) { speed = r.speed * 0.75; if (now - lastHit > 700) { hits++; lastHit = now; sfx('hit'); } flash = 0.4; } else if (rel <= 0) { r.speed *= 0.8; } playerX += (playerX > r.offset ? 1 : -1) * 0.02; }
          }
          posEl.textContent = `${rank()}位／${rivals.length + 1}`;
        }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6); sky.addColorStop(0, '#69b7ff'); sky.addColorStop(1, '#e0f2ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
          road.render(position, playerX);
          const boosting = now < boostUntil;
          if (boosting) { ctx.fillStyle = 'rgba(80,160,255,.25)'; ctx.fillRect(0, 0, W, H); ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🔥', W / 2 - 18, H - 4); ctx.fillText('🔥', W / 2 + 18, H - 4); }
          drawRearCar(ctx, W / 2 + steer * 5, H - 8, 46, '#e63946', steer, true);
          const r = rank(); ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = r === 1 ? '#ffd23f' : '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText(r + '位', 8, 6); ctx.shadowBlur = 0;
          ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 3; ctx.fillText(Math.round(speed / MAX_SPEED * 180) + ' km/h', W - 8, 8); ctx.shadowBlur = 0;
          if (flash > 0) { ctx.fillStyle = `rgba(255,80,80,${flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - 0.04); }
          if (now < startTime) { const cd = Math.ceil((startTime - now) / 1000); ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillText(cd > 0 ? String(cd) : 'GO!', W / 2, H / 2 - 20); ctx.shadowBlur = 0; }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 90, 40, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 53); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now); else { for (const s of segments) s.dynamic.length = 0; for (const r of rivals) road.findSegment(r.z).dynamic.push(r); }
          if (!running) return;
          render(now);
          if (now - startTime > TIME_LIMIT_MS) { finalRank = rank(); finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const table = [100, 86, 74, 62, 50, 40];
          const score = clamp((finished ? table[finalRank - 1] : table[finalRank - 1] - 25) - Math.min(10, hits), 12, 100);
          say(finished ? (finalRank === 1 ? '🏆ゆうしょう!!' : `🏁 ${finalRank}位でゴール!`) : `タイムアップ…${finalRank}位`, 2400);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const GRAND_PRIX_VARIANTS = [mg('grand-prix-3d', makeGrandPrixGame({ title: 'グランプリ!ライバル5台と3しゅうレース' }))];

  // --- 横スクロール シューティング: じどう れんしゃ。ゆびで きたいを うごかし、
  //     てきの だんまくを かわして パワーアップを あつめ、ボスを たおす ---
  function makeSkyShooterGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(62000), BOSS_AT = 34000;
        let ship = { x: 40, y: 110, r: 9, lives: 3, inv: 0, power: 1, bombs: 2 }, bullets = [], enemies = [], eBullets = [], drops = [], particles = [], boss = null, kills = 0, score = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, fireAcc = 0, spawnAcc = 0, wave = 0, shake = 0, bossDead = false;
        const held = { left: false, right: false, up: false, down: false };
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="ssTimer">のこり: 62s</span><span id="ssScore">❤️❤️❤️／0pt</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="ssCanvas"></canvas></div>
          <div class="mg-hint" id="ssHint">画面をなぞって機体を動かそう。弾は自動で出るよ。Pを取るとパワーアップ。ピンチではボム!</div>
          <div class="mg-gunner-controls"><button class="mg-tap-btn mg-hold-btn" id="ssLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="ssUp" data-key="up">▲</button><button class="mg-tap-btn primary" id="ssBomb" data-key="action">💣×2</button><button class="mg-tap-btn mg-hold-btn" id="ssDown" data-key="down">▼</button><button class="mg-tap-btn mg-hold-btn" id="ssRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#ssCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 220);
        const timerEl = container.querySelector('#ssTimer'), scoreEl = container.querySelector('#ssScore'), hint = container.querySelector('#ssHint'), bombBtn = container.querySelector('#ssBomb');
        const say = (t, ms = 1100) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = '❤️'.repeat(Math.max(0, ship.lives)) + '／' + score + 'pt'; bombBtn.textContent = '💣×' + ship.bombs; };
        for (const k of ['Left', 'Right', 'Up', 'Down']) bindHeldButton(container.querySelector('#ss' + k), (v) => { held[k.toLowerCase()] = v; });
        bombBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); bomb(); });
        let drag = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, x: p.x, y: p.y }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); ship.x = clamp(ship.x + (p.x - drag.x) * 1.1, 10, W - 10); ship.y = clamp(ship.y + (p.y - drag.y) * 1.1, 10, H - 10); drag.x = p.x; drag.y = p.y; });
        const endDrag = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
        canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
        const stars = Array.from({ length: 50 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + (i % 3) * 0.4 }));
        function bomb() { if (!running || ship.bombs <= 0 || performance.now() < startTime) return; ship.bombs--; hud(); shake = 10; for (const e of enemies) { e.hp -= 6; if (e.hp <= 0) killEnemy(e); } enemies = enemies.filter((e) => e.hp > 0); eBullets = []; if (boss) { boss.hp -= 12; } say('💣ボム!', 800); }
        function killEnemy(e) { sfx('hit'); kills++; score += e.value; for (let i = 0; i < 8; i++) particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, born: performance.now(), color: '#ffb347' }); if (Math.random() < 0.18) drops.push({ x: e.x, y: e.y, kind: Math.random() < 0.7 ? 'P' : 'B' }); }
        function spawnWave(now) {
          wave++;
          const kind = ['sine', 'line', 'dive'][wave % 3];
          const n = 4 + Math.min(4, Math.floor(wave / 2));
          for (let i = 0; i < n; i++) enemies.push({ kind, x: W + 20 + i * 26, y: kind === 'line' ? 40 + (wave % 3) * 50 : 40 + Math.random() * (H - 80), baseY: 0, t: -i * 0.3, hp: 2 + Math.floor(wave / 3), r: 10, value: 10, emoji: ['👾', '🛸', '🐝', '🦇'][wave % 4], shot: 1.4 + Math.random() });
        }
        function update(dt, now) {
          const mv = 170 * dt;
          ship.x = clamp(ship.x + ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * mv, 10, W - 10);
          ship.y = clamp(ship.y + ((held.down ? 1 : 0) - (held.up ? 1 : 0)) * mv, 10, H - 10);
          for (const s of stars) { s.x -= (40 + s.s * 60) * dt; if (s.x < 0) { s.x = W; s.y = Math.random() * H; } }
          fireAcc += dt; if (fireAcc > 0.17) { fireAcc = 0; bullets.push({ x: ship.x + 12, y: ship.y, vx: 320, vy: 0 }); if (ship.power >= 2) { bullets.push({ x: ship.x + 8, y: ship.y - 7, vx: 300, vy: -40 }); bullets.push({ x: ship.x + 8, y: ship.y + 7, vx: 300, vy: 40 }); } if (ship.power >= 3) bullets.push({ x: ship.x + 12, y: ship.y, vx: 380, vy: 0, big: true }); }
          const elapsed = now - startTime;
          if (!boss && elapsed < BOSS_AT) { spawnAcc += dt; if (spawnAcc > lerp(2.6, 1.9, difficulty) && enemies.length < 14) { spawnAcc = 0; spawnWave(now); } }
          if (!boss && elapsed >= BOSS_AT && !bossDead) { boss = { x: W + 40, y: H / 2, hp: 70 + difficulty * 40, maxHp: 70 + difficulty * 40, t: 0, fire: 0, r: 26 }; say('⚠️ボスしゅつげん!', 1600); }
          for (const e of enemies) { e.t += dt; e.x -= (60 + wave * 4) * dt; if (e.kind === 'sine') e.y += Math.sin(e.t * 3) * 60 * dt; if (e.kind === 'dive' && e.x < W * 0.6) e.y += (ship.y - e.y) * dt * 1.2; e.shot -= dt; if (e.shot <= 0 && e.x < W) { e.shot = 1.8 + Math.random() * 1.2; const a = Math.atan2(ship.y - e.y, ship.x - e.x); eBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 }); } }
          enemies = enemies.filter((e) => e.x > -30);
          if (boss) { boss.t += dt; boss.x += (W - 50 - boss.x) * dt * 1.5; boss.y = H / 2 + Math.sin(boss.t * 1.1) * 60; boss.fire -= dt; if (boss.fire <= 0) { boss.fire = 0.9; for (let k = -2; k <= 2; k++) { const a = Math.PI + k * 0.25; eBullets.push({ x: boss.x - 20, y: boss.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130 }); } } if (boss.hp <= 0) { bossDead = true; score += 200; shake = 12; for (let i = 0; i < 30; i++) particles.push({ x: boss.x, y: boss.y, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, born: now, color: '#ff5ea8' }); boss = null; say('🎆ボスをたおした!!', 2000); hud(); } }
          // 1はつの たまは 1たいにしか あたらない(あたった たまは そこで おわり)。
          // hp が 0 いかの てきは、この フレームの あとで けされる ので もう あてない
          for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; for (const e of enemies) { if (e.hp <= 0) continue; if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + 3) { e.hp -= b.big ? 2 : 1; b.dead = true; if (e.hp <= 0) killEnemy(e); break; } } if (!b.dead && boss && Math.hypot(boss.x - b.x, boss.y - b.y) < boss.r) { boss.hp -= b.big ? 2 : 1; b.dead = true; } }
          bullets = bullets.filter((b) => !b.dead && b.x < W + 10); enemies = enemies.filter((e) => e.hp > 0);
          for (const b of eBullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
          eBullets = eBullets.filter((b) => b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10);
          if (ship.inv > 0) ship.inv -= dt;
          else {
            const hitB = eBullets.find((b) => Math.hypot(b.x - ship.x, b.y - ship.y) < ship.r), hitE = enemies.find((e) => Math.hypot(e.x - ship.x, e.y - ship.y) < e.r + ship.r * 0.7);
            if (hitB || hitE || (boss && Math.hypot(boss.x - ship.x, boss.y - ship.y) < boss.r + ship.r * 0.6)) { ship.lives--; ship.inv = 2; ship.power = Math.max(1, ship.power - 1); shake = 8; hud(); if (hitB) eBullets.splice(eBullets.indexOf(hitB), 1); say(ship.lives > 0 ? '💥ひがい!のこり❤️' + ship.lives : '💥きたいが…', 1000); if (ship.lives <= 0) { finish(); return; } }
          }
          for (const d of drops) { d.x -= 50 * dt; if (Math.hypot(d.x - ship.x, d.y - ship.y) < 16) { d.taken = true; sfx('coin'); if (d.kind === 'P') { ship.power = Math.min(3, ship.power + 1); say('⚡パワーアップ!', 800); } else { ship.bombs++; say('💣ボム+1', 800); } hud(); } }
          drops = drops.filter((d) => !d.taken && d.x > -20);
          particles = particles.filter((p) => now - p.born < 500); for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; }
        }
        function render(now) {
          if (!ctx) return;
          ctx.save(); if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake = Math.max(0, shake - 0.6); }
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1030'); bg.addColorStop(1, '#22306b'); ctx.fillStyle = bg; ctx.fillRect(-10, -10, W + 20, H + 20);
          for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${0.3 + s.s * 0.5})`; ctx.fillRect(s.x, s.y, 1 + s.s, 1 + s.s); }
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (const e of enemies) { ctx.font = `${e.r * 2}px sans-serif`; ctx.fillText(e.emoji, e.x, e.y); }
          if (boss) { ctx.font = `${boss.r * 2}px sans-serif`; ctx.fillText('🐙', boss.x, boss.y); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 60, 6, 120, 8); ctx.fillStyle = '#ff5ea8'; ctx.fillRect(W / 2 - 60, 6, 120 * clamp(boss.hp / boss.maxHp, 0, 1), 8); }
          for (const b of bullets) { ctx.fillStyle = b.big ? '#ffd23f' : '#8ef0ff'; ctx.fillRect(b.x - 5, b.y - 1.5, b.big ? 12 : 8, b.big ? 4 : 3); }
          for (const b of eBullets) { ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill(); }
          for (const d of drops) { ctx.fillStyle = d.kind === 'P' ? '#ffd23f' : '#8ef0ff'; ctx.beginPath(); ctx.arc(d.x, d.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.font = 'bold 11px sans-serif'; ctx.fillText(d.kind, d.x, d.y); }
          for (const p of particles) { ctx.globalAlpha = 1 - (now - p.born) / 500; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); ctx.globalAlpha = 1; }
          if (ship.inv <= 0 || Math.floor(now / 80) % 2 === 0) { ctx.save(); ctx.translate(ship.x, ship.y); ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -9); ctx.lineTo(-6, 0); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#8ef0ff'; ctx.beginPath(); ctx.arc(2, 0, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = `rgba(255,180,60,${0.5 + Math.random() * 0.5})`; ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-18 - Math.random() * 6, 0); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill(); ctx.font = '13px sans-serif'; ctx.fillText(currentSprite(), 0, -13); ctx.restore(); }
          if (now < startTime) { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('READY…', W / 2, H / 2); ctx.shadowBlur = 0; }
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 90, H - 30, 180, 24); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 18); }
          ctx.restore();
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          if (!running) return;
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0 || (bossDead && now - startTime > BOSS_AT + 3000 && !boss)) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const result = clamp(Math.round(14 + Math.min(44, kills * 2.0) + (bossDead ? 34 : 0) + ship.lives * 6), 10, 100);
          say(ship.lives <= 0 ? `げきついされた…げきは${kills}` : bossDead ? `🏆ボスげきは!げきは${kills} ❤️${ship.lives}` : `しゅうりょう!げきは${kills}`, 2200);
          render(performance.now());
          setTimeout(() => onComplete(result), 900);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const SKY_SHOOTER_VARIANTS = [mg('sky-shooter', makeSkyShooterGame({ title: 'スカイシューター!だんまくをかわしてボスをたおせ' }))];

  // --- プラットフォーマー: はしって ジャンプ。コインを あつめ、てきを ふんで、
  //     はたまで たどりつく。ジャンプは おしている ながさで たかさが かわる ---
  function makeJumpQuestGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const T = 22, ROWS = 10, LEN = 90, DURATION_MS = mgDuration(70000);
        const map = Array.from({ length: ROWS }, () => Array(LEN).fill(0));
        const coins = [], enemies = [], spikes = [];
        let x = 0;
        while (x < LEN) {
          const chunk = x < 6 ? 'ground' : ['ground', 'ground', 'gap', 'platform', 'enemy', 'spikes', 'steps'][Math.floor(Math.random() * 7)];
          const w = chunk === 'gap' ? 2 + Math.floor(Math.random() * (difficulty > 0.5 ? 2 : 1)) : 4 + Math.floor(Math.random() * 4);
          for (let i = 0; i < w && x + i < LEN; i++) {
            const cx = x + i;
            if (chunk !== 'gap') { map[ROWS - 1][cx] = 1; map[ROWS - 2][cx] = 1; }
            if (chunk === 'platform' && i > 0 && i < w - 1) { map[ROWS - 5][cx] = 1; if (Math.random() < 0.7) coins.push({ x: cx, y: ROWS - 6 }); }
            if (chunk === 'steps') { const h = Math.min(4, i + 1); for (let k = 0; k < h; k++) map[ROWS - 3 - k][cx] = 1; if (i === w - 1) coins.push({ x: cx, y: ROWS - 4 - h }); }
            if (chunk === 'ground' && Math.random() < 0.35) coins.push({ x: cx, y: ROWS - 4 });
            if (chunk === 'spikes' && i > 0 && i < w - 1 && Math.random() < 0.6) spikes.push({ x: cx, y: ROWS - 3 });
          }
          if (chunk === 'enemy') enemies.push({ x: (x + 1) * T, y: (ROWS - 3) * T, vx: 40, w: T * 0.9, h: T * 0.9, dead: false, emoji: ['🐢', '🐌', '👾'][Math.floor(Math.random() * 3)], minX: x * T, maxX: (x + w - 1) * T });
          x += w;
        }
        for (let cx = LEN - 4; cx < LEN; cx++) { map[ROWS - 1][cx] = 1; map[ROWS - 2][cx] = 1; }
        const GOAL_X = (LEN - 2) * T;
        const p = { x: T * 1.5, y: (ROWS - 3) * T, vx: 0, vy: 0, w: T * 0.7, h: T * 0.9, ground: false, coyote: 0, jumpHold: 0, lives: 3, inv: 0, face: 1 };
        let camX = 0, got = 0, stomps = 0, running = true, rafId = null, last = null, msg = '', msgUntil = 0, leftHeld = false, rightHeld = false, jumpHeld = false, jumpQueued = false, won = false, shake = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="jqTimer">のこり: 70s</span><span id="jqScore">❤️❤️❤️／🪙 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="jqCanvas"></canvas></div>
          <div class="mg-hint" id="jqHint">◀▶ではしり、ジャンプはながおしでたかく。てきはうえからふむ、とげはとびこえて、🚩まで!</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="jqLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn primary" id="jqJump" data-key="action">ジャンプ</button><button class="mg-tap-btn mg-hold-btn" id="jqRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#jqCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, ROWS * T);
        const timerEl = container.querySelector('#jqTimer'), scoreEl = container.querySelector('#jqScore'), hint = container.querySelector('#jqHint');
        const say = (t, ms = 1100) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = '❤️'.repeat(Math.max(0, p.lives)) + '／🪙 ' + got; };
        bindHeldButton(container.querySelector('#jqLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#jqRight'), (v) => { rightHeld = v; });
        bindHeldButton(container.querySelector('#jqJump'), (v) => { jumpHeld = v; if (v) jumpQueued = true; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); jumpHeld = true; jumpQueued = true; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        const cUp = () => { jumpHeld = false; };
        canvas.addEventListener('pointerup', cUp); canvas.addEventListener('pointercancel', cUp);
        const solid = (px, py) => { const cx = Math.floor(px / T), cy = Math.floor(py / T); if (cx < 0 || cx >= LEN) return true; if (cy >= ROWS) return false; if (cy < 0) return false; return map[cy][cx] === 1; };
        function respawn() { p.lives--; hud(); shake = 8; if (p.lives <= 0) { finish(false); return; } p.inv = 1.5; let sx = Math.max(1, Math.floor(p.x / T) - 3); while (!map[ROWS - 2][sx] && sx > 1) sx--; p.x = sx * T + 2; p.y = (ROWS - 3) * T; p.vx = 0; p.vy = 0; say('やりなおし!のこり❤️' + p.lives, 1000); }
        function update(dt, now) {
          const accel = 900, maxV = 150;
          const dir = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
          if (dir) { p.vx = clamp(p.vx + dir * accel * dt, -maxV, maxV); p.face = dir; } else p.vx *= Math.pow(0.001, dt);
          if (p.ground) p.coyote = 0.1; else p.coyote -= dt;
          if (jumpQueued) { jumpQueued = false; if (p.coyote > 0) { sfx('jump'); p.vy = -330; p.ground = false; p.coyote = 0; p.jumpHold = 0.22; } }
          if (jumpHeld && p.jumpHold > 0 && p.vy < 0) { p.vy -= 520 * dt; p.jumpHold -= dt; } else p.jumpHold = 0;
          p.vy = Math.min(420, p.vy + 900 * dt);
          // よこ
          let nx = p.x + p.vx * dt;
          if (p.vx > 0 && (solid(nx + p.w, p.y + 1) || solid(nx + p.w, p.y + p.h - 1))) { nx = Math.floor((nx + p.w) / T) * T - p.w - 0.01; p.vx = 0; }
          if (p.vx < 0 && (solid(nx, p.y + 1) || solid(nx, p.y + p.h - 1))) { nx = Math.floor(nx / T + 1) * T + 0.01; p.vx = 0; }
          p.x = clamp(nx, 0, LEN * T - p.w);
          // たて
          let ny = p.y + p.vy * dt; p.ground = false;
          if (p.vy > 0 && (solid(p.x + 1, ny + p.h) || solid(p.x + p.w - 1, ny + p.h))) { ny = Math.floor((ny + p.h) / T) * T - p.h - 0.01; p.vy = 0; p.ground = true; }
          if (p.vy < 0 && (solid(p.x + 1, ny) || solid(p.x + p.w - 1, ny))) { ny = Math.floor(ny / T + 1) * T + 0.01; p.vy = 0; }
          p.y = ny;
          if (p.y > ROWS * T + 10) { respawn(); return; }
          if (p.inv > 0) p.inv -= dt;
          for (const c of coins) if (!c.got && Math.abs((c.x + 0.5) * T - (p.x + p.w / 2)) < T * 0.6 && Math.abs((c.y + 0.5) * T - (p.y + p.h / 2)) < T * 0.7) { c.got = true; got++; sfx('coin'); hud(); }
          for (const s of spikes) if (p.inv <= 0 && Math.abs((s.x + 0.5) * T - (p.x + p.w / 2)) < T * 0.55 && p.y + p.h > s.y * T + T * 0.4 && p.y < (s.y + 1) * T) { say('🔺とげにあたった!', 900); respawn(); return; }
          for (const e of enemies) {
            if (e.dead) continue;
            e.x += e.vx * dt; if (e.x < e.minX || e.x > e.maxX) e.vx *= -1;
            if (Math.abs(e.x + e.w / 2 - (p.x + p.w / 2)) < (e.w + p.w) / 2 - 3 && p.y + p.h > e.y + 2 && p.y < e.y + e.h) {
              if (p.vy > 60 && p.y + p.h < e.y + e.h * 0.6) { e.dead = true; stomps++; sfx('hit'); p.vy = -230; say('ふんだ!', 700); shake = 3; }
              else if (p.inv <= 0) { say(e.emoji + 'にぶつかった!', 900); respawn(); return; }
            }
          }
          if (p.x + p.w / 2 >= GOAL_X) { won = true; finish(true); return; }
          camX += ((p.x - W * 0.35) - camX) * Math.min(1, dt * 6); camX = clamp(camX, 0, LEN * T - W);
        }
        function render(now) {
          if (!ctx) return;
          ctx.save(); if (shake > 0) { ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake = Math.max(0, shake - 0.5); }
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#79c7ff'); bg.addColorStop(1, '#dff3ff'); ctx.fillStyle = bg; ctx.fillRect(-10, -10, W + 20, H + 20);
          ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 5; i++) { const cx = ((i * 137 - camX * 0.3) % (W + 80) + W + 80) % (W + 80) - 40; ctx.beginPath(); ctx.ellipse(cx, 24 + (i % 3) * 14, 26, 9, 0, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = 'rgba(60,140,80,.35)'; for (let i = 0; i < 6; i++) { const hx = ((i * 190 - camX * 0.5) % (W + 200) + W + 200) % (W + 200) - 100; ctx.beginPath(); ctx.moveTo(hx - 70, H - 2 * T); ctx.lineTo(hx, H - 2 * T - 60); ctx.lineTo(hx + 70, H - 2 * T); ctx.closePath(); ctx.fill(); }
          ctx.translate(-camX, 0);
          const c0 = Math.max(0, Math.floor(camX / T) - 1), c1 = Math.min(LEN, c0 + Math.ceil(W / T) + 3);
          for (let cy = 0; cy < ROWS; cy++) for (let cx = c0; cx < c1; cx++) { if (map[cy][cx] !== 1) continue; const top = cy === 0 || map[cy - 1][cx] !== 1; ctx.fillStyle = top ? '#6ab04c' : '#8d5a3b'; ctx.fillRect(cx * T, cy * T, T, T); ctx.fillStyle = top ? '#9be07a' : '#a5704b'; ctx.fillRect(cx * T + 2, cy * T + 2, T - 4, 4); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(cx * T, cy * T + T - 3, T, 3); }
          for (const s of spikes) { if (s.x < c0 || s.x > c1) continue; ctx.fillStyle = '#b8c2cc'; ctx.beginPath(); for (let k = 0; k < 3; k++) { ctx.moveTo(s.x * T + k * T / 3, (s.y + 1) * T); ctx.lineTo(s.x * T + k * T / 3 + T / 6, s.y * T + T * 0.25); ctx.lineTo(s.x * T + (k + 1) * T / 3, (s.y + 1) * T); } ctx.fill(); }
          ctx.font = `${T * 0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (const c of coins) if (!c.got && c.x >= c0 && c.x <= c1) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.ellipse((c.x + 0.5) * T, (c.y + 0.5) * T + Math.sin(now / 200 + c.x) * 2, T * 0.28 * Math.abs(Math.cos(now / 300 + c.x)), T * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5; ctx.stroke(); }
          for (const e of enemies) if (!e.dead) { ctx.save(); ctx.translate(e.x + e.w / 2, e.y + e.h / 2); if (e.vx > 0) ctx.scale(-1, 1); ctx.fillText(e.emoji, 0, 0); ctx.restore(); }
          ctx.fillStyle = '#eee'; ctx.fillRect(GOAL_X, (ROWS - 2) * T - T * 3.2, 3, T * 3.2); ctx.font = `${T * 1.1}px sans-serif`; ctx.fillText('🚩', GOAL_X + T * 0.5, (ROWS - 2) * T - T * 2.8);
          if (p.inv <= 0 || Math.floor(now / 90) % 2 === 0) { ctx.save(); ctx.translate(p.x + p.w / 2, p.y + p.h / 2); if (p.face < 0) ctx.scale(-1, 1); const squash = p.ground ? 1 : 1.08; ctx.scale(1 / squash, squash); ctx.font = `${T * 0.95}px sans-serif`; ctx.fillText(currentSprite(), 0, 0); ctx.restore(); }
          ctx.restore();
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(8, 6, W - 16, 5); ctx.fillStyle = '#ffd23f'; ctx.fillRect(8, 6, (W - 16) * clamp(p.x / GOAL_X, 0, 1), 5);
          if (now < startTime) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6; ctx.fillText('READY…', W / 2, H / 2 - 20); ctx.shadowBlur = 0; }
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 90, 16, 180, 24); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 28); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.033, (now - last) / 1000); last = now;
          if (now >= startTime) { const sub = 2; for (let i = 0; i < sub && running; i++) update(dt / sub, now); }
          if (!running) return;
          const rem = Math.max(0, DURATION_MS - Math.max(0, now - startTime));
          timerEl.textContent = 'のこり: ' + Math.ceil(rem / 1000) + 's';
          render(now);
          if (rem <= 0) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const prog = clamp(p.x / GOAL_X, 0, 1);
          const score = win ? clamp(Math.round(62 + got * 2.5 + stomps * 3 + p.lives * 5), 60, 100) : clamp(Math.round(12 + prog * 40 + got * 1.5), 10, 58);
          say(win ? `🚩ゴール!🪙${got}ふんだ${stomps}` : p.lives <= 0 ? 'ライフがなくなった…' : 'じかんぎれ…' + Math.round(prog * 100) + '%', 2200);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const JUMP_QUEST_VARIANTS = [mg('jump-quest', makeJumpQuestGame({ title: 'ジャンプクエスト!はしってとんではたまで' }))];

  // --- 倉庫番パズル: はこを おして ゴールへ。もどす ボタンつき。3もん ---
  const PUSH_PUZZLE_LEVELS = [
    ['#######', '#..#..#', '#.$...#', '#..#$.#', '#.@..##', '#..##.#', '#######'].map((r) => r.replace(/\./g, ' ')),
    ['#######', '#.....#', '#.#$#.#', '#.$@$.#', '#.#$#.#', '#.....#', '#######'].map((r) => r.replace(/\./g, ' ')),
    ['#######', '#....##', '#.#.$.#', '#..$#.#', '##.@..#', '#.....#', '#######'].map((r) => r.replace(/\./g, ' ')),
    ['#######', '#.....#', '#..$..#', '#.$@$.#', '#..$..#', '#.....#', '#######'].map((r) => r.replace(/\./g, ' ')),
  ];
  const PUSH_PUZZLE_GOALS = [
    [[1, 1], [1, 4]], [[1, 1], [1, 5], [5, 1], [5, 5]], [[1, 1], [5, 5]], [[1, 1], [1, 5], [5, 1], [5, 5]],
  ];
  function makePushPuzzleGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 3);
        const TIME_LIMIT_MS = mgDuration(150000);
        let lvIdx = 0, moves = 0, totalMoves = 0, solved = 0, running = true, rafId = null, grid, goals, px, py, history = [], msg = '', msgUntil = 0, anim = null, pushes = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="pzLevel">1/3もんめ</span><span id="pzMoves">て0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="pzCanvas"></canvas></div>
          <div class="mg-hint" id="pzHint">はこ(📦)をおして★のマスへ。ひっぱれないのでおすむきをかんがえよう。↩で1てもどせる</div>
          <div class="mg-tilt-dpad"><button class="mg-tap-btn" id="pzUndo" data-key="action2">↩もどす</button><button class="mg-tap-btn" id="pzUp" data-hold="step" data-key="up">▲</button><button class="mg-tap-btn" id="pzReset" data-key="action">↻やりなおし</button><button class="mg-tap-btn" id="pzLeft" data-hold="step" data-key="left">◀</button><button class="mg-tap-btn" id="pzDown" data-hold="step" data-key="down">▼</button><button class="mg-tap-btn" id="pzRight" data-hold="step" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#pzCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const N = 7, CELL = W / N;
        const levelEl = container.querySelector('#pzLevel'), movesEl = container.querySelector('#pzMoves'), hint = container.querySelector('#pzHint');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        function load() {
          const L = PUSH_PUZZLE_LEVELS[order[lvIdx]]; goals = PUSH_PUZZLE_GOALS[order[lvIdx]];
          grid = L.map((r) => r.split(''));
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (grid[y][x] === '@') { px = x; py = y; grid[y][x] = ' '; }
          moves = 0; history = []; levelEl.textContent = `${lvIdx + 1}/3もんめ`; movesEl.textContent = 'て0';
        }
        const isGoal = (x, y) => goals.some(([gy, gx]) => gx === x && gy === y);
        function solvedAll() { return goals.every(([gy, gx]) => grid[gy][gx] === '$'); }
        function move(dx, dy) {
          if (!running || anim) return;
          const nx = px + dx, ny = py + dy;
          if (grid[ny][nx] === '#') return;
          const snap = { grid: grid.map((r) => r.slice()), px, py };
          if (grid[ny][nx] === '$') { const bx = nx + dx, by = ny + dy; if (grid[by][bx] !== ' ') { say('そのむきにはおせない', 600); return; } grid[by][bx] = '$'; grid[ny][nx] = ' '; pushes++; sfx('pop'); }
          history.push(snap); if (history.length > 60) history.shift();
          anim = { fx: px, fy: py, born: performance.now() }; sfx('tick');
          px = nx; py = ny; moves++; totalMoves++; movesEl.textContent = 'て' + moves;
          if (solvedAll()) { solved++; say(lvIdx + 1 < 3 ? '✅クリア!つぎのもんだい' : '🏆ぜんぶクリア!', 1400); setTimeout(() => { if (!running) return; lvIdx++; if (lvIdx >= 3) { finish(); return; } load(); }, 1200); }
        }
        container.querySelector('#pzUp').addEventListener('pointerdown', (e) => { e.preventDefault(); move(0, -1); });
        container.querySelector('#pzDown').addEventListener('pointerdown', (e) => { e.preventDefault(); move(0, 1); });
        container.querySelector('#pzLeft').addEventListener('pointerdown', (e) => { e.preventDefault(); move(-1, 0); });
        container.querySelector('#pzRight').addEventListener('pointerdown', (e) => { e.preventDefault(); move(1, 0); });
        container.querySelector('#pzUndo').addEventListener('pointerdown', (e) => { e.preventDefault(); const s = history.pop(); if (!s) return; sfx('close'); grid = s.grid; px = s.px; py = s.py; moves++; totalMoves++; movesEl.textContent = 'て' + moves; });
        container.querySelector('#pzReset').addEventListener('pointerdown', (e) => { e.preventDefault(); load(); say('やりなおし', 600); });
        let swipe = null;
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointerup', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) return; if (Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? -1 : 1, 0); else move(0, dy < 0 ? -1 : 1); });
        canvas.addEventListener('pointercancel', () => { swipe = null; });
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#3b2f2f'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const c = grid[y][x];
            if (c === '#') { ctx.fillStyle = '#6b4f3a'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); ctx.fillStyle = '#8a6a4f'; ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL / 2 - 3); ctx.fillRect(x * CELL + 2, y * CELL + CELL / 2 + 1, CELL / 2 - 3, CELL / 2 - 3); ctx.fillRect(x * CELL + CELL / 2 + 1, y * CELL + CELL / 2 + 1, CELL / 2 - 3, CELL / 2 - 3); continue; }
            ctx.fillStyle = (x + y) % 2 ? '#e9dcc4' : '#e0d2b8'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            if (isGoal(x, y)) { ctx.fillStyle = 'rgba(255,200,60,.35)'; ctx.fillRect(x * CELL + 3, y * CELL + 3, CELL - 6, CELL - 6); ctx.font = `${CELL * 0.5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#e0a020'; ctx.fillText('★', (x + 0.5) * CELL, (y + 0.5) * CELL); }
            if (c === '$') { ctx.font = `${CELL * 0.78}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; if (isGoal(x, y)) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 12; } ctx.fillText('📦', (x + 0.5) * CELL, (y + 0.5) * CELL); ctx.shadowBlur = 0; }
          }
          let drawX = px, drawY = py; if (anim) { const t = Math.min(1, (now - anim.born) / 110); drawX = anim.fx + (px - anim.fx) * t; drawY = anim.fy + (py - anim.fy) * t; if (t >= 1) anim = null; }
          ctx.font = `${CELL * 0.8}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentSprite(), (drawX + 0.5) * CELL, (drawY + 0.5) * CELL);
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, H / 2 - 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; render(now); if (now - startTime > TIME_LIMIT_MS) { finish(); return; } rafId = requestAnimationFrame(loop); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(15 + solved * 25 + Math.max(0, 15 - Math.max(0, totalMoves - 45) * 0.5)), 10, 100);
          say(solved >= 3 ? `🏆 3もんクリア!${totalMoves}て` : `じかんぎれ…${solved}もんクリア`, 2200);
          render(performance.now());
          setTimeout(() => onComplete(score), 900);
        }
        load();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const PUSH_PUZZLE_VARIANTS = [mg('push-puzzle', makePushPuzzleGame({ title: 'そうこばん!はこをおして★へ' }))];

  // --- オセロ(6×6): AIと たいせん。かどと はしを ねらう AI。おける ばしょは ひかる ---
  function makeReversiGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 6, ME = 1, AI = 2, TIME_LIMIT_MS = mgDuration(170000);
        const board = Array.from({ length: N }, () => Array(N).fill(0));
        board[2][2] = AI; board[3][3] = AI; board[2][3] = ME; board[3][2] = ME;
        let turn = ME, running = true, rafId = null, msg = '', msgUntil = 0, flips = [], aiAt = 0, passes = 0, lastMove = null;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="rvScore">● 2 - 2 ○</span><span id="rvTurn">あなたのばん</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="rvCanvas"></canvas></div>
          <div class="mg-hint" id="rvHint">ひかっているマスをタップ。あいてのいしをはさむとぜんぶじぶんのいろに。かどをとるとつよい!</div>`;
        const canvas = container.querySelector('#rvCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N;
        const scoreEl = container.querySelector('#rvScore'), turnEl = container.querySelector('#rvTurn'), hint = container.querySelector('#rvHint');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
        function captures(b, x, y, who) {
          if (b[y][x] !== 0) return [];
          const out = [];
          for (const [dx, dy] of DIRS) { const line = []; let cx = x + dx, cy = y + dy; while (cx >= 0 && cy >= 0 && cx < N && cy < N && b[cy][cx] === 3 - who) { line.push([cx, cy]); cx += dx; cy += dy; } if (line.length && cx >= 0 && cy >= 0 && cx < N && cy < N && b[cy][cx] === who) out.push(...line); }
          return out;
        }
        function legal(b, who) { const m = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (captures(b, x, y, who).length) m.push([x, y]); return m; }
        function count() { let a = 0, c = 0; for (const r of board) for (const v of r) { if (v === ME) a++; else if (v === AI) c++; } return [a, c]; }
        function hud() { const [a, c] = count(); scoreEl.textContent = `● ${a} - ${c} ○`; turnEl.textContent = turn === ME ? 'あなたのばん' : 'あいてのばん…'; }
        function place(x, y, who) { const caps = captures(board, x, y, who); board[y][x] = who; sfx(caps.length >= 4 ? 'coin' : 'pop'); for (const [cx, cy] of caps) board[cy][cx] = who; flips = caps.map(([cx, cy]) => ({ x: cx, y: cy, born: performance.now() })); lastMove = { x, y }; hud(); }
        function next() {
          const other = 3 - turn;
          if (legal(board, other).length) { turn = other; passes = 0; }
          else if (legal(board, turn).length) { passes++; say(other === ME ? 'あなたはパス' : 'あいてはパス', 900); }
          else { finish(); return; }
          hud();
          if (turn === AI) aiAt = performance.now() + 700;
        }
        const WEIGHTS = [[30, -4, 6, 6, -4, 30], [-4, -8, 1, 1, -8, -4], [6, 1, 2, 2, 1, 6], [6, 1, 2, 2, 1, 6], [-4, -8, 1, 1, -8, -4], [30, -4, 6, 6, -4, 30]];
        function aiMove() {
          const moves = legal(board, AI); if (!moves.length) { next(); return; }
          let best = null, bestV = -1e9;
          for (const [x, y] of moves) {
            const caps = captures(board, x, y, AI);
            const b2 = board.map((r) => r.slice()); b2[y][x] = AI; for (const [cx, cy] of caps) b2[cy][cx] = AI;
            const mob = legal(b2, ME).length;
            let v = WEIGHTS[y][x] * 2 + caps.length * lerp(1.5, 0.8, difficulty) - mob * lerp(0.6, 1.4, difficulty) + (Math.random() - 0.5) * lerp(3, 0.6, difficulty);
            if (v > bestV) { bestV = v; best = [x, y]; }
          }
          place(best[0], best[1], AI); next();
        }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || turn !== ME) return; const p = mgPointerPos(canvas, e); const x = Math.floor(p.x / CELL), y = Math.floor(p.y / CELL); if (x < 0 || y < 0 || x >= N || y >= N) return; if (!captures(board, x, y, ME).length) { say('そこにはおけない', 600); return; } place(x, y, ME); next(); });
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#1f6f3a'; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.5; for (let i = 0; i <= N; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke(); }
          const hints = turn === ME && running ? legal(board, ME) : [];
          for (const [x, y] of hints) { ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.15 * Math.sin(now / 250)})`; ctx.beginPath(); ctx.arc((x + 0.5) * CELL, (y + 0.5) * CELL, CELL * 0.14, 0, Math.PI * 2); ctx.fill(); }
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const v = board[y][x]; if (!v) continue;
            const f = flips.find((q) => q.x === x && q.y === y); let sx = 1; if (f) { const t = Math.min(1, (now - f.born) / 320); sx = Math.abs(Math.cos(t * Math.PI)); }
            ctx.save(); ctx.translate((x + 0.5) * CELL, (y + 0.5) * CELL); ctx.scale(Math.max(0.05, sx), 1);
            ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(2, 3, CELL * 0.38, 0, Math.PI * 2); ctx.fill();
            const g = ctx.createRadialGradient(-CELL * 0.12, -CELL * 0.14, 2, 0, 0, CELL * 0.4); if (v === ME) { g.addColorStop(0, '#555'); g.addColorStop(1, '#0a0a0a'); } else { g.addColorStop(0, '#fff'); g.addColorStop(1, '#cfcfd6'); }
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, CELL * 0.38, 0, Math.PI * 2); ctx.fill();
            if (v === ME && x === 0 && y === 0) {} ctx.restore();
          }
          if (lastMove) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.strokeRect(lastMove.x * CELL + 2, lastMove.y * CELL + 2, CELL - 4, CELL - 4); }
          flips = flips.filter((f) => now - f.born < 320);
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, H / 2 - 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; if (turn === AI && aiAt && now >= aiAt) { aiAt = 0; aiMove(); } render(now); if (now - startTime > TIME_LIMIT_MS) { finish(); return; } rafId = requestAnimationFrame(loop); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const [a, c] = count(); const diff = a - c;
          const score = diff > 0 ? clamp(Math.round(62 + diff * 2), 60, 100) : diff === 0 ? 50 : clamp(Math.round(40 + diff * 1.5), 12, 45);
          say(diff > 0 ? `🏆 ${a}-${c}でかち!` : diff === 0 ? `${a}-${c}ひきわけ` : `${a}-${c}でまけ…`, 2500);
          hud(); turnEl.textContent = 'しゅうりょう';
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const REVERSI_VARIANTS = [mg('reversi-6', makeReversiGame({ title: 'オセロ!かどをとってあいてにかとう' }))];

  // ================================================================
  // 新作バッチ1(2026-09-08): ビリヤード / どうぶつしょうぎ / マインスイーパー / スネーク
  // ================================================================

  // --- ビリヤード(canvas 物理): ボールから うしろへ ひっぱって はなす。
  //     6この ボールを ぜんぶ ポケットに。ガイド線で さいしょの あたりが みえる ---
  function makeBilliardsGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const MAX_SHOTS = Math.round(lerp(14, 10, difficulty)), TIME_LIMIT_MS = mgDuration(120000);
        let running = true, rafId = null, last = null, shots = 0, pocketed = 0, aiming = null, moving = false, msg = '', msgUntil = 0, scratchPending = false, lastShotPocketed = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="blShots">のこり${MAX_SHOTS}ショット</span><span id="blBalls">🎱 0/6</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="blCanvas"></canvas></div>
          <div class="mg-hint" id="blHint">白いボールからうしろへひっぱってはなすとショット。ひっぱるながさでつよさがかわる。ガイド線をみてねらおう!</div>`;
        const canvas = container.querySelector('#blCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * 1.42));
        const PAD = 16, R = 8.5, PR = 13;
        const L = PAD, T = PAD, Rt = W - PAD, B = H - PAD;
        const pockets = [[L, T], [Rt, T], [L, (T + B) / 2], [Rt, (T + B) / 2], [L, B], [Rt, B]];
        const colors = ['#f2c14e', '#2f7ed8', '#e63946', '#7b2cbf', '#f77f00', '#2a9d8f'];
        const balls = [];
        const cue = { x: W / 2, y: B - (B - T) * 0.22, vx: 0, vy: 0, r: R, cue: true, color: '#fff', alive: true };
        balls.push(cue);
        const rackY = T + (B - T) * 0.3;
        const rack = [[0, 0], [-1, -1], [1, -1], [-2, -2], [0, -2], [2, -2]];
        rack.forEach(([dx, dy], i) => balls.push({ x: W / 2 + dx * (R + 0.4), y: rackY + dy * (R * 1.75), vx: 0, vy: 0, r: R, color: colors[i], num: i + 1, alive: true }));
        const shotsEl = container.querySelector('#blShots'), ballsEl = container.querySelector('#blBalls'), hint = container.querySelector('#blHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { shotsEl.textContent = `のこり${MAX_SHOTS - shots}ショット`; ballsEl.textContent = `🎱 ${pocketed}/6`; };
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || moving || !cue.alive) return; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); aiming = { id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y }; });
        canvas.addEventListener('pointermove', (e) => { if (!aiming || e.pointerId !== aiming.id) return; const p = mgPointerPos(canvas, e); aiming.x = p.x; aiming.y = p.y; });
        const release = (e) => {
          if (!aiming || (e && e.pointerId !== aiming.id)) return;
          const dx = aiming.sx - aiming.x, dy = aiming.sy - aiming.y; const len = Math.hypot(dx, dy); aiming = null;
          if (len < 12 || !running) return;
          const power = clamp(len / 110, 0.12, 1) * 620;
          sfx('whoosh'); cue.vx = dx / len * power; cue.vy = dy / len * power; moving = true; shots++; lastShotPocketed = 0; hud();
        };
        canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', () => { aiming = null; });
        // ガイド: cue から dir へ のばして さいしょに あたる ボール/かべ
        function guide(dirx, diry) {
          let best = null;
          for (const b of balls) { if (b === cue || !b.alive) continue; const rx = b.x - cue.x, ry = b.y - cue.y; const t = rx * dirx + ry * diry; if (t <= 0) continue; const d2 = rx * rx + ry * ry - t * t; const rr = (2 * R) * (2 * R); if (d2 > rr) continue; const th = t - Math.sqrt(rr - d2); if (!best || th < best.t) best = { t: th, ball: b }; }
          let tw = Infinity;
          if (dirx > 0) tw = Math.min(tw, (Rt - R - cue.x) / dirx); if (dirx < 0) tw = Math.min(tw, (L + R - cue.x) / dirx);
          if (diry > 0) tw = Math.min(tw, (B - R - cue.y) / diry); if (diry < 0) tw = Math.min(tw, (T + R - cue.y) / diry);
          if (best && best.t < tw) return { x: cue.x + dirx * best.t, y: cue.y + diry * best.t, ball: best.ball };
          return { x: cue.x + dirx * tw, y: cue.y + diry * tw, ball: null };
        }
        function step(dt) {
          let any = false;
          for (const b of balls) {
            if (!b.alive) continue;
            b.x += b.vx * dt; b.y += b.vy * dt;
            const sp = Math.hypot(b.vx, b.vy);
            if (sp > 0) { const dec = Math.max(0, sp - (28 + sp * 0.9) * dt); b.vx *= dec / sp; b.vy *= dec / sp; if (dec < 2) { b.vx = 0; b.vy = 0; } else any = true; }
            // ポケット
            for (const [px, py] of pockets) { if (Math.hypot(b.x - px, b.y - py) < PR) { b.alive = false; b.vx = b.vy = 0; if (b.cue) { scratchPending = true; say('💦スクラッチ!白をもどします', 1300); } else { pocketed++; lastShotPocketed++; say(lastShotPocketed > 1 ? `✨ ${lastShotPocketed}こいっきに!` : '🎱ポケット!', 900); hud(); } break; } }
            if (!b.alive) continue;
            if (b.x < L + R) { b.x = L + R; b.vx = Math.abs(b.vx) * 0.85; } if (b.x > Rt - R) { b.x = Rt - R; b.vx = -Math.abs(b.vx) * 0.85; }
            if (b.y < T + R) { b.y = T + R; b.vy = Math.abs(b.vy) * 0.85; } if (b.y > B - R) { b.y = B - R; b.vy = -Math.abs(b.vy) * 0.85; }
          }
          for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
            const a = balls[i], b = balls[j]; if (!a.alive || !b.alive) continue;
            const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy); if (d >= 2 * R || d === 0) continue;
            const nx = dx / d, ny = dy / d; const overlap = 2 * R - d; a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; b.x += nx * overlap / 2; b.y += ny * overlap / 2;
            const rvx = a.vx - b.vx, rvy = a.vy - b.vy; const vn = rvx * nx + rvy * ny; if (vn <= 0) continue;
            a.vx -= vn * nx * 0.98; a.vy -= vn * ny * 0.98; b.vx += vn * nx * 0.98; b.vy += vn * ny * 0.98; any = true;
          }
          return any;
        }
        function settle() {
          moving = false;
          if (scratchPending) { scratchPending = false; cue.alive = true; cue.x = W / 2; cue.y = B - (B - T) * 0.22; cue.vx = cue.vy = 0; for (const b of balls) { if (b !== cue && b.alive && Math.hypot(b.x - cue.x, b.y - cue.y) < 2.2 * R) cue.y += 3 * R; } }
          if (pocketed >= 6) { finish(true); return; }
          if (shots >= MAX_SHOTS) { finish(false); return; }
        }
        function drawBall(b) {
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(b.x + 2, b.y + 3, b.r, 0, Math.PI * 2); ctx.fill();
          const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, 1, b.x, b.y, b.r); g.addColorStop(0, '#fff'); g.addColorStop(0.25, b.color); g.addColorStop(1, mgShade(b.color === '#fff' ? '#dddddd' : b.color, 0.55));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
          if (b.num) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.num), b.x, b.y + 0.5); }
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#5b3a1e'; ctx.fillRect(0, 0, W, H);
          const wood = ctx.createLinearGradient(0, 0, W, H); wood.addColorStop(0, '#7a4a25'); wood.addColorStop(1, '#4a2c12'); ctx.fillStyle = wood; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#1f7a45'; ctx.fillRect(L, T, Rt - L, B - T);
          const felt = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, H * 0.7); felt.addColorStop(0, 'rgba(255,255,255,.08)'); felt.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = felt; ctx.fillRect(L, T, Rt - L, B - T);
          ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(L, B - (B - T) * 0.22); ctx.lineTo(Rt, B - (B - T) * 0.22); ctx.stroke(); ctx.setLineDash([]);
          for (const [px, py] of pockets) { ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.arc(px, py, PR, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#d4a24c'; ctx.lineWidth = 2; ctx.stroke(); }
          if (aiming && cue.alive) {
            const dx = aiming.sx - aiming.x, dy = aiming.sy - aiming.y; const len = Math.hypot(dx, dy);
            if (len > 4) {
              const dirx = dx / len, diry = dy / len; const g = guide(dirx, diry);
              ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(g.x, g.y); ctx.stroke(); ctx.setLineDash([]);
              ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(g.x, g.y, R, 0, Math.PI * 2); ctx.stroke();
              if (g.ball) { const bx = g.ball.x - g.x, by = g.ball.y - g.y; const bl = Math.hypot(bx, by) || 1; ctx.strokeStyle = 'rgba(255,220,120,.8)'; ctx.beginPath(); ctx.moveTo(g.ball.x, g.ball.y); ctx.lineTo(g.ball.x + bx / bl * 34, g.ball.y + by / bl * 34); ctx.stroke(); }
              // キュー
              const pw = clamp(len / 110, 0, 1); ctx.strokeStyle = '#c99a5b'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cue.x - dirx * (R + 6 + pw * 30), cue.y - diry * (R + 6 + pw * 30)); ctx.lineTo(cue.x - dirx * (R + 90 + pw * 30), cue.y - diry * (R + 90 + pw * 30)); ctx.stroke(); ctx.lineCap = 'butt';
              ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(W / 2 - 40, H - 12, 80, 6); ctx.fillStyle = pw > 0.75 ? '#ff6b6b' : '#ffd23f'; ctx.fillRect(W / 2 - 40, H - 12, 80 * pw, 6);
            }
          }
          for (const b of balls) if (b.alive) drawBall(b);
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, H / 2 - 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (moving) { let any = false; const n = 4; for (let i = 0; i < n; i++) any = step(dt / n) || any; if (!any) settle(); if (!running) return; }
          render(now);
          if (now - startTime > TIME_LIMIT_MS) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(cleared) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = cleared ? clamp(70 + (MAX_SHOTS - shots) * 5, 70, 100) : clamp(10 + pocketed * 9, 10, 64);
          say(cleared ? '🏆ぜんぶポケット!' : `おわり…${pocketed}/6ポケット`, 2500);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const BILLIARDS_VARIANTS = [mg('billiards-6', makeBilliardsGame({ title: 'ビリヤード!6このボールをぜんぶポケットへ' }))];

  // --- どうぶつしょうぎ(3×4): 🦁を とるか、🦁が いちばん おくの だんに
  //     たどりつけば かち。とった こまは うちなおせる。AIは 3手よみ ---
  function makeAnimalShogiGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 3, ROWS = 4, ME = 1, AI = 2, TIME_LIMIT_MS = mgDuration(180000);
        // こまの うごき(じぶんの まえ = -1 方向)
        const MOVES = {
          L: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]],
          G: [[0, -1], [-1, 0], [1, 0], [0, 1]],
          E: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
          C: [[0, -1]],
          H: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]],
        };
        const EMOJI = { L: '🦁', G: '🦒', E: '🐘', C: '🐤', H: '🐔' };
        const VALUE = { L: 1000, G: 6, E: 5, C: 2, H: 7 };
        // board[y][x] = {t, o} | null
        let board = [[{ t: 'G', o: AI }, { t: 'L', o: AI }, { t: 'E', o: AI }], [null, { t: 'C', o: AI }, null], [null, { t: 'C', o: ME }, null], [{ t: 'E', o: ME }, { t: 'L', o: ME }, { t: 'G', o: ME }]];
        let hands = { [ME]: [], [AI]: [] };
        let turn = ME, running = true, rafId = null, sel = null, msg = '', msgUntil = 0, aiAt = 0, moves = 0, lastMove = null, anim = null;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="asTurn">あなたのばん</span><span id="asMoves">0手</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="asCanvas"></canvas></div>
          <div class="mg-hint" id="asHint">こまをタップ→ひかったマスへ。🦁をとるか、🦁がいちばんおくまでいけばかち。とったこまはしたのてもちからうてる</div>`;
        const canvas = container.querySelector('#asCanvas');
        const CELL = 58, HAND_H = 44;
        const { ctx, W, H } = createMgCanvas(canvas, HAND_H * 2 + CELL * ROWS + 16);
        const bx = Math.round((W - CELL * COLS) / 2), TOP = HAND_H + 8;
        const turnEl = container.querySelector('#asTurn'), movesEl = container.querySelector('#asMoves'), hint = container.querySelector('#asHint');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const fwd = (o) => (o === ME ? 1 : -1); // MOVES の dy<0 が「まえ」。じぶんは うえ(-y)へ すすむ
        const inB = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
        function pieceMoves(b, x, y) {
          const p = b[y][x]; if (!p) return []; const out = [];
          for (const [dx, dy] of MOVES[p.t]) { const nx = x + dx, ny = y + dy * fwd(p.o); if (!inB(nx, ny)) continue; const q = b[ny][nx]; if (q && q.o === p.o) continue; out.push([nx, ny]); }
          return out;
        }
        function allMoves(b, h, who) {
          const out = [];
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const p = b[y][x]; if (p && p.o === who) for (const [nx, ny] of pieceMoves(b, x, y)) out.push({ from: [x, y], to: [nx, ny] }); }
          const seen = new Set();
          h[who].forEach((t, i) => { if (seen.has(t)) return; seen.add(t); for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!b[y][x]) out.push({ drop: i, t, to: [x, y] }); });
          return out;
        }
        function apply(b, h, who, m) {
          const nb = b.map((r) => r.map((c) => (c ? { ...c } : null))); const nh = { [ME]: h[ME].slice(), [AI]: h[AI].slice() };
          const [tx, ty] = m.to; let captured = null;
          if (m.drop != null) { nh[who].splice(m.drop, 1); nb[ty][tx] = { t: m.t, o: who }; }
          else { const [fx, fy] = m.from; const p = nb[fy][fx]; nb[fy][fx] = null; const q = nb[ty][tx]; if (q) { captured = q.t; nh[who].push(q.t === 'H' ? 'C' : q.t); } const lastRank = who === ME ? 0 : ROWS - 1; if (p.t === 'C' && ty === lastRank) p.t = 'H'; nb[ty][tx] = p; }
          return { b: nb, h: nh, captured };
        }
        function attacked(b, x, y, by) { for (let yy = 0; yy < ROWS; yy++) for (let xx = 0; xx < COLS; xx++) { const p = b[yy][xx]; if (p && p.o === by) for (const [mx, my] of pieceMoves(b, xx, yy)) if (mx === x && my === y) return true; } return false; }
        function lionPos(b, who) { for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const p = b[y][x]; if (p && p.t === 'L' && p.o === who) return [x, y]; } return null; }
        // かち判定: あいての 🦁が いない / じぶんの 🦁が おくの だんで あんぜん
        function winner(b, mover) {
          const other = 3 - mover;
          if (!lionPos(b, other)) return mover;
          const lp = lionPos(b, mover); if (!lp) return other;
          const goal = mover === ME ? 0 : ROWS - 1;
          if (lp[1] === goal && !attacked(b, lp[0], lp[1], other)) return mover;
          return 0;
        }
        function evaluate(b, h, who) {
          let v = 0;
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const p = b[y][x]; if (!p) continue; const s = p.o === who ? 1 : -1; v += s * VALUE[p.t]; if (p.t === 'L') { const adv = p.o === ME ? (ROWS - 1 - y) : y; v += s * adv * 0.8; } if (p.t === 'C') { const adv = p.o === ME ? (ROWS - 1 - y) : y; v += s * adv * 0.3; } }
          for (const t of h[who]) v += VALUE[t] * 0.9; for (const t of h[3 - who]) v -= VALUE[t] * 0.9;
          return v;
        }
        function search(b, h, who, depth, alpha, beta, root) {
          const w = winner(b, 3 - who); if (w) return (w === root ? 1 : -1) * (5000 + depth);
          if (depth === 0) return (who === root ? 1 : -1) * evaluate(b, h, who);
          const ms = allMoves(b, h, who); if (!ms.length) return (who === root ? -1 : 1) * 4000;
          if (who === root) { let best = -Infinity; for (const m of ms) { const r = apply(b, h, who, m); best = Math.max(best, search(r.b, r.h, 3 - who, depth - 1, alpha, beta, root)); alpha = Math.max(alpha, best); if (beta <= alpha) break; } return best; }
          let best = Infinity; for (const m of ms) { const r = apply(b, h, who, m); best = Math.min(best, search(r.b, r.h, 3 - who, depth - 1, alpha, beta, root)); beta = Math.min(beta, best); if (beta <= alpha) break; } return best;
        }
        function aiMove() {
          const ms = allMoves(board, hands, AI); if (!ms.length) { end(ME); return; }
          const depth = difficulty < 0.35 ? 2 : 3; let best = null, bestV = -Infinity;
          for (const m of ms) { const r = apply(board, hands, AI, m); let v = search(r.b, r.h, ME, depth - 1, -Infinity, Infinity, AI); v += (Math.random() - 0.5) * lerp(3, 0.4, difficulty); if (v > bestV) { bestV = v; best = m; } }
          doMove(AI, best);
        }
        function doMove(who, m) {
          const r = apply(board, hands, who, m); const from = m.from || null;
          board = r.b; hands = r.h; moves++; lastMove = m.to.slice(); sfx(r.captured ? 'hit' : 'pop');
          anim = { from: from ? cellCenter(from[0], from[1]) : handPos(who), to: cellCenter(m.to[0], m.to[1]), t: m.drop != null ? m.t : board[m.to[1]][m.to[0]].t, o: who, born: performance.now() };
          if (r.captured) say(r.captured === 'L' ? '🦁をとった!' : `${EMOJI[r.captured]}をとった`, 900);
          const w = winner(board, who); if (w) { end(w); return; }
          turn = 3 - who; hud();
          if (turn === AI) aiAt = performance.now() + 650;
          if (turn === ME && !allMoves(board, hands, ME).length) end(AI);
        }
        function cellCenter(x, y) { return [bx + (x + 0.5) * CELL, TOP + (y + 0.5) * CELL]; }
        function handPos(who) { return [W / 2, who === ME ? H - HAND_H / 2 : HAND_H / 2]; }
        function hud() { turnEl.textContent = turn === ME ? 'あなたのばん' : 'あいてのばん…'; movesEl.textContent = `${moves}手`; }
        canvas.addEventListener('pointerdown', (e) => {
          e.preventDefault(); if (!running || turn !== ME) return;
          const p = mgPointerPos(canvas, e);
          // てもち(した)
          if (p.y > H - HAND_H - 4) { const idx = Math.floor((p.x - 8) / 40); if (idx >= 0 && idx < hands[ME].length) { sel = { drop: idx, t: hands[ME][idx] }; } else sel = null; return; }
          const x = Math.floor((p.x - bx) / CELL), y = Math.floor((p.y - TOP) / CELL);
          if (!inB(x, y)) { sel = null; return; }
          const q = board[y][x];
          if (sel) {
            const legal = sel.drop != null ? !q : pieceMoves(board, sel.from[0], sel.from[1]).some(([mx, my]) => mx === x && my === y);
            if (legal) { doMove(ME, sel.drop != null ? { drop: sel.drop, t: sel.t, to: [x, y] } : { from: sel.from, to: [x, y] }); sel = null; return; }
          }
          if (q && q.o === ME) { sel = { from: [x, y] }; } else { sel = null; if (q) say('それはあいてのこま', 700); }
        });
        function drawPiece(t, o, cx, cy, size) {
          ctx.save(); ctx.translate(cx, cy); if (o === AI) ctx.rotate(Math.PI);
          ctx.fillStyle = o === ME ? '#fff3d6' : '#d6e4ff'; ctx.strokeStyle = o === ME ? '#c98a3a' : '#4d6fb0'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(0, -size * 0.46); ctx.lineTo(size * 0.36, -size * 0.28); ctx.lineTo(size * 0.42, size * 0.44); ctx.lineTo(-size * 0.42, size * 0.44); ctx.lineTo(-size * 0.36, -size * 0.28); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.font = `${Math.round(size * 0.5)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(EMOJI[t], 0, size * 0.06);
          // うごける むきの てん
          ctx.fillStyle = '#b3261e'; for (const [dx, dy] of MOVES[t]) { ctx.beginPath(); ctx.arc(dx * size * 0.3, dy * size * 0.32, 1.6, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#f6e7c8'; ctx.fillRect(0, 0, W, H);
          // てもち エリア
          ctx.fillStyle = 'rgba(77,111,176,.15)'; ctx.fillRect(0, 0, W, HAND_H); ctx.fillStyle = 'rgba(201,138,58,.15)'; ctx.fillRect(0, H - HAND_H, W, HAND_H);
          ctx.font = '10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#4d6fb0'; ctx.fillText('あいてのてもち', 8, 8); ctx.fillStyle = '#9a6a2a'; ctx.fillText('じぶんのてもち', 8, H - HAND_H + 8);
          hands[AI].forEach((t, i) => drawPiece(t, AI, 28 + i * 40, HAND_H / 2 + 5, 30));
          hands[ME].forEach((t, i) => { if (sel && sel.drop === i) { ctx.fillStyle = 'rgba(255,210,63,.6)'; ctx.fillRect(8 + i * 40, H - HAND_H, 40, HAND_H); } drawPiece(t, ME, 28 + i * 40, H - HAND_H / 2 + 5, 30); });
          // ばん
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const cx = bx + x * CELL, cy = TOP + y * CELL; ctx.fillStyle = y === 0 ? '#dfe9ff' : y === ROWS - 1 ? '#ffe9c9' : (x + y) % 2 ? '#efdcb4' : '#f5e6c4'; ctx.fillRect(cx, cy, CELL, CELL); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1; ctx.strokeRect(cx + 0.5, cy + 0.5, CELL - 1, CELL - 1); }
          if (lastMove) { ctx.fillStyle = 'rgba(255,210,63,.35)'; ctx.fillRect(bx + lastMove[0] * CELL, TOP + lastMove[1] * CELL, CELL, CELL); }
          if (sel && turn === ME) {
            const targets = sel.drop != null ? [].concat(...board.map((r, y) => r.map((c, x) => (c ? null : [x, y])).filter(Boolean))) : pieceMoves(board, sel.from[0], sel.from[1]);
            if (sel.from) { ctx.fillStyle = 'rgba(255,160,60,.45)'; ctx.fillRect(bx + sel.from[0] * CELL, TOP + sel.from[1] * CELL, CELL, CELL); }
            for (const [x, y] of targets) { ctx.fillStyle = `rgba(80,200,120,${0.3 + 0.15 * Math.sin(now / 200)})`; ctx.beginPath(); ctx.arc(bx + (x + 0.5) * CELL, TOP + (y + 0.5) * CELL, CELL * 0.18, 0, Math.PI * 2); ctx.fill(); }
          }
          for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { const p = board[y][x]; if (!p) continue; if (anim && anim.to[0] === bx + (x + 0.5) * CELL && anim.to[1] === TOP + (y + 0.5) * CELL && now - anim.born < 220) continue; drawPiece(p.t, p.o, bx + (x + 0.5) * CELL, TOP + (y + 0.5) * CELL, CELL * 0.86); }
          if (anim) { const t = Math.min(1, (now - anim.born) / 220); const e = 1 - (1 - t) * (1 - t); drawPiece(anim.t, anim.o, anim.from[0] + (anim.to[0] - anim.from[0]) * e, anim.from[1] + (anim.to[1] - anim.from[1]) * e, CELL * 0.86 * (1 + 0.25 * Math.sin(t * Math.PI))); if (t >= 1) anim = null; }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, H / 2 - 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; if (turn === AI && aiAt && now >= aiAt) { aiAt = 0; aiMove(); if (!running) return; } render(now); if (now - startTime > TIME_LIMIT_MS) { end(0); return; } rafId = requestAnimationFrame(loop); }
        function end(w) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = w === ME ? clamp(100 - Math.max(0, moves - 12) * 2, 70, 100) : w === AI ? clamp(18 + moves, 18, 45) : 50;
          say(w === ME ? '🏆かち!すごい!' : w === AI ? 'まけ…つぎはかとう' : 'じかんぎれひきわけ', 2600);
          turnEl.textContent = 'しゅうりょう'; render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const ANIMAL_SHOGI_VARIANTS = [mg('animal-shogi', makeAnimalShogiGame({ title: 'どうぶつしょうぎ!🦁をとるかおくまですすめ' }))];

  // --- マインスイーパー(8×8): タップで ひらく、🚩モードで はたを たてる。
  //     さいしょの タップは あんぜん。すうじは まわりの ばくだんの かず ---
  function makeMinesweeperGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 8, MINES = Math.round(lerp(8, 12, difficulty)), TIME_LIMIT_MS = mgDuration(150000);
        let running = true, rafId = null, flagMode = false, placed = false, revealed = 0, msg = '', msgUntil = 0, boom = null, pressTimer = null, pressCell = null, longPressed = false;
        const startTime = performance.now();
        const mine = Array.from({ length: N }, () => Array(N).fill(false)), open = Array.from({ length: N }, () => Array(N).fill(false)), flag = Array.from({ length: N }, () => Array(N).fill(false)), num = Array.from({ length: N }, () => Array(N).fill(0));
        const openAt = Array.from({ length: N }, () => Array(N).fill(0));
        container.innerHTML = `
          <div class="mg-header"><span id="msLeft">💣 ${MINES}</span><span id="msTime">0s</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="msCanvas"></canvas></div>
          <div class="mg-hint" id="msHint">マスをタップでひらく。すうじはまわり8マスのばくだんのかず。あやしいマスは🚩モード(かながおし)ではたをたてよう</div>
          <div class="mg-race-controls"><button class="mg-tap-btn" id="msFlag" data-key="action">🚩フラグモード: OFF</button></div>`;
        const canvas = container.querySelector('#msCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N;
        const leftEl = container.querySelector('#msLeft'), timeEl = container.querySelector('#msTime'), hint = container.querySelector('#msHint'), flagBtn = container.querySelector('#msFlag');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const nb = (x, y, f) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N) f(nx, ny); } };
        function place(sx, sy) {
          let n = 0; while (n < MINES) { const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N); if (mine[y][x] || (Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1)) continue; mine[y][x] = true; n++; }
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let c = 0; nb(x, y, (nx, ny) => { if (mine[ny][nx]) c++; }); num[y][x] = c; }
          placed = true;
        }
        function flags() { let c = 0; for (const r of flag) for (const v of r) if (v) c++; return c; }
        function hud() { leftEl.textContent = `💣 ${MINES - flags()}`; flagBtn.textContent = `🚩フラグモード: ${flagMode ? 'ON' : 'OFF'}`; flagBtn.classList.toggle('primary', flagMode); }
        function reveal(x, y) {
          if (open[y][x] || flag[y][x]) return;
          if (!placed) place(x, y);
          if (mine[y][x]) { boom = { x, y, at: performance.now() }; sfx('hit'); finish(false); return; }
          const stack = [[x, y]]; const t0 = performance.now(); let k = 0;
          while (stack.length) { const [cx, cy] = stack.pop(); if (open[cy][cx] || flag[cy][cx]) continue; open[cy][cx] = true; openAt[cy][cx] = t0 + k * 18; k++; revealed++; if (num[cy][cx] === 0) nb(cx, cy, (nx, ny) => { if (!open[ny][nx]) stack.push([nx, ny]); }); }
          sfx('pop');
          if (revealed >= N * N - MINES) finish(true);
        }
        function toggleFlag(x, y) { if (open[y][x]) return; flag[y][x] = !flag[y][x]; sfx('tick'); hud(); }
        // ひらいた すうじを タップ → まわりの はたが そろっていれば まとめて ひらく(コード)
        function chord(x, y) { let f = 0; nb(x, y, (nx, ny) => { if (flag[ny][nx]) f++; }); if (f !== num[y][x]) return; nb(x, y, (nx, ny) => { if (!flag[ny][nx] && !open[ny][nx] && running) reveal(nx, ny); }); }
        const cellAt = (e) => { const p = mgPointerPos(canvas, e); const x = Math.floor(p.x / CELL), y = Math.floor(p.y / CELL); return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null; };
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running) return; const c = cellAt(e); if (!c) return; pressCell = c; longPressed = false; clearTimeout(pressTimer); pressTimer = setTimeout(() => { longPressed = true; toggleFlag(c[0], c[1]); }, 420); });
        canvas.addEventListener('pointerup', (e) => { clearTimeout(pressTimer); if (!running || !pressCell || longPressed) { pressCell = null; return; } const c = cellAt(e); pressCell = null; if (!c) return; const [x, y] = c; if (flagMode) toggleFlag(x, y); else if (open[y][x]) chord(x, y); else reveal(x, y); });
        canvas.addEventListener('pointercancel', () => { clearTimeout(pressTimer); pressCell = null; });
        flagBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running) return; flagMode = !flagMode; hud(); });
        const NUM_COLORS = ['', '#1d4ed8', '#15803d', '#dc2626', '#6d28d9', '#9a3412', '#0f766e', '#111', '#555'];
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#cfd6e0'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const cx = x * CELL, cy = y * CELL;
            if (open[y][x]) {
              const t = clamp((now - openAt[y][x]) / 160, 0, 1);
              ctx.fillStyle = (x + y) % 2 ? '#e8edf3' : '#dfe5ec'; ctx.fillRect(cx, cy, CELL, CELL);
              if (t < 1) { ctx.fillStyle = `rgba(160,175,195,${1 - t})`; ctx.fillRect(cx, cy, CELL, CELL); }
              if (num[y][x] > 0 && t > 0.4) { ctx.fillStyle = NUM_COLORS[num[y][x]]; ctx.font = `bold ${Math.round(CELL * 0.55)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(num[y][x]), cx + CELL / 2, cy + CELL / 2 + 1); }
              if (!running && mine[y][x]) { ctx.font = `${Math.round(CELL * 0.6)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💣', cx + CELL / 2, cy + CELL / 2 + 1); }
            } else {
              const g = ctx.createLinearGradient(cx, cy, cx + CELL, cy + CELL); g.addColorStop(0, '#b9c6d6'); g.addColorStop(1, '#8fa2b8'); ctx.fillStyle = g; ctx.fillRect(cx, cy, CELL, CELL);
              ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(cx, cy, CELL, 2); ctx.fillRect(cx, cy, 2, CELL); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(cx, cy + CELL - 2, CELL, 2); ctx.fillRect(cx + CELL - 2, cy, 2, CELL);
              if (pressCell && pressCell[0] === x && pressCell[1] === y) { ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(cx, cy, CELL, CELL); }
              if (flag[y][x] || (!running && mine[y][x] && !boom)) { ctx.font = `${Math.round(CELL * 0.6)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(flag[y][x] ? (!running && !mine[y][x] ? '❌' : '🚩') : '💣', cx + CELL / 2, cy + CELL / 2 + 1); }
              else if (!running && mine[y][x]) { ctx.font = `${Math.round(CELL * 0.6)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💣', cx + CELL / 2, cy + CELL / 2 + 1); }
            }
            ctx.strokeStyle = 'rgba(60,80,110,.35)'; ctx.lineWidth = 1; ctx.strokeRect(cx + 0.5, cy + 0.5, CELL - 1, CELL - 1);
          }
          if (boom) { const t = Math.min(1, (now - boom.at) / 700); ctx.fillStyle = `rgba(255,120,60,${0.6 * (1 - t)})`; ctx.beginPath(); ctx.arc((boom.x + 0.5) * CELL, (boom.y + 0.5) * CELL, CELL * (0.5 + t * 3), 0, Math.PI * 2); ctx.fill(); ctx.font = `${Math.round(CELL * 0.9)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💥', (boom.x + 0.5) * CELL, (boom.y + 0.5) * CELL); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, H / 2 - 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; timeEl.textContent = `${Math.floor((now - startTime) / 1000)}s`; render(now); if (now - startTime > TIME_LIMIT_MS) { finish(false); return; } rafId = requestAnimationFrame(loop); }
        function finish(win) {
          if (!running) return; running = false; cancelAnimationFrame(rafId); clearTimeout(pressTimer);
          const el = (performance.now() - startTime) / 1000; const total = N * N - MINES;
          const score = win ? clamp(Math.round(72 + Math.max(0, 90 - el) * 0.3), 72, 100) : clamp(Math.round(10 + (revealed / total) * 45), 10, 55);
          say(win ? `🏆クリア!${Math.round(el)}びょう` : boom ? '💥ばくだんをふんだ…' : 'じかんぎれ…', 2600);
          flagBtn.disabled = true; render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const MINESWEEPER_VARIANTS = [mg('minesweeper-8', makeMinesweeperGame({ title: 'マインスイーパー!すうじをよんでばくだんをさけろ' }))];

  // --- スネーク: 十字キーか スワイプで むきを かえ、🍎を たべて のびる。
  //     かべと じぶんの からだに ぶつかると おわり。⭐は ボーナス ---
  function makeSnakeGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 15, DURATION_MS = mgDuration(75000);
        let running = true, rafId = null, last = null, acc = 0, dir = [1, 0], nextDir = [1, 0], queued = null, snake = [[7, 7], [6, 7], [5, 7]], food = null, star = null, ate = 0, alive = true, msg = '', msgUntil = 0, tick = lerp(230, 190, difficulty), grow = 0, swipe = null, deathAt = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="snTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="snScore">🍎 0／ながさ3</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="snCanvas"></canvas></div>
          <div class="mg-hint" id="snHint">十字キーかがめんスワイプでむきをかえる。🍎でのびてスピードアップ、⭐は3こぶん!かべとからだにぶつからないで</div>
          <div class="mg-tilt-dpad"><span></span><button class="mg-tap-btn" id="snUp" data-key="up">▲</button><span></span><button class="mg-tap-btn" id="snLeft" data-key="left">◀</button><button class="mg-tap-btn" id="snDown" data-key="down">▼</button><button class="mg-tap-btn" id="snRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#snCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N;
        const timerEl = container.querySelector('#snTimer'), scoreEl = container.querySelector('#snScore'), hint = container.querySelector('#snHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `🍎 ${ate}／ながさ${snake.length}`; };
        function turnTo(dx, dy) { const cur = queued || nextDir; if (cur[0] === -dx && cur[1] === -dy) return; if (cur[0] === dx && cur[1] === dy) return; if (queued) return; queued = [dx, dy]; }
        const bind = (id, dx, dy) => container.querySelector(id).addEventListener('pointerdown', (e) => { e.preventDefault(); turnTo(dx, dy); });
        bind('#snUp', 0, -1); bind('#snDown', 0, 1); bind('#snLeft', -1, 0); bind('#snRight', 1, 0);
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; if (Math.hypot(dx, dy) < 18) return; if (Math.abs(dx) > Math.abs(dy)) turnTo(Math.sign(dx), 0); else turnTo(0, Math.sign(dy)); swipe = null; });
        const endSwipe = () => { swipe = null; }; canvas.addEventListener('pointerup', endSwipe); canvas.addEventListener('pointercancel', endSwipe);
        function freeCell() { for (let k = 0; k < 200; k++) { const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N); if (!snake.some(([sx, sy]) => sx === x && sy === y) && !(food && food[0] === x && food[1] === y)) return [x, y]; } return null; }
        food = freeCell();
        function stepSnake() {
          if (queued) { nextDir = queued; queued = null; }
          dir = nextDir;
          const head = snake[0]; const nx = head[0] + dir[0], ny = head[1] + dir[1];
          if (nx < 0 || ny < 0 || nx >= N || ny >= N || snake.some(([sx, sy], i) => i < snake.length - (grow > 0 ? 0 : 1) && sx === nx && sy === ny)) { alive = false; deathAt = performance.now(); sfx('hit'); say('💫ぶつかった…', 1500); return; }
          snake.unshift([nx, ny]);
          if (food && nx === food[0] && ny === food[1]) { ate++; grow += 1; sfx('pop'); food = freeCell(); tick = Math.max(105, tick - 5); say(['🍎おいしい!', '🍎もぐもぐ', '🍎のびた!'][ate % 3], 600); if (!star && Math.random() < 0.3) { star = { pos: freeCell(), until: performance.now() + 6000 }; } }
          else if (star && nx === star.pos[0] && ny === star.pos[1]) { ate += 3; grow += 3; star = null; sfx('coin'); say('⭐ボーナス+3!', 900); }
          if (grow > 0) grow--; else snake.pop();
          hud();
        }
        function drawCell(x, y, color, r = 3) { ctx.fillStyle = color; mgRoundRect(ctx, x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, r); }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#16351f'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if ((x + y) % 2) { ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); } }
          if (food) { ctx.font = `${Math.round(CELL * 0.85)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🍎', (food[0] + 0.5) * CELL, (food[1] + 0.5) * CELL + 1); }
          if (star) { if (now > star.until) star = null; else { const s = 0.8 + 0.15 * Math.sin(now / 120); ctx.font = `${Math.round(CELL * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⭐', (star.pos[0] + 0.5) * CELL, (star.pos[1] + 0.5) * CELL + 1); } }
          const L = snake.length;
          for (let i = L - 1; i >= 0; i--) { const [x, y] = snake[i]; const k = i / Math.max(1, L - 1); const col = `hsl(${lerp(120, 95, k)},${lerp(70, 55, k)}%,${lerp(50, 36, k)}%)`; if (!alive && Math.floor((now - deathAt) / 120) % 2 === 0) { drawCell(x, y, '#c44'); } else drawCell(x, y, col, i === 0 ? 5 : 3); }
          const [hx, hy] = snake[0]; ctx.fillStyle = '#fff'; const ex = dir[0], ey = dir[1]; const cx = (hx + 0.5) * CELL, cy = (hy + 0.5) * CELL; const ox = -ey * CELL * 0.22, oy = ex * CELL * 0.22;
          for (const s of [1, -1]) { ctx.beginPath(); ctx.arc(cx + ex * CELL * 0.15 + ox * s, cy + ey * CELL * 0.15 + oy * s, CELL * 0.14, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = '#111'; for (const s of [1, -1]) { ctx.beginPath(); ctx.arc(cx + ex * CELL * 0.22 + ox * s, cy + ey * CELL * 0.22 + oy * s, CELL * 0.07, 0, Math.PI * 2); ctx.fill(); }
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('スタート!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, 16, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 29); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(80, now - last); last = now;
          if (alive && now >= startTime) { acc += dt; while (acc >= tick && alive) { acc -= tick; stepSnake(); } }
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (!alive && now - deathAt > 1100) { finish(); return; }
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(10 + ate * 7 + (alive ? 12 : 0)), 10, 100);
          say(alive ? `🎉タイムアップ!${ate}こたべた` : `${ate}こたべた!`, 2500);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const SNAKE_VARIANTS = [mg('snake-classic', makeSnakeGame({ title: 'スネーク!🍎をたべてどこまでのびる?' }))];

  // ================================================================
  // 新作バッチ1(2026-09-08): やきゅうバッティング / リングフライト3D / バブルシューター
  // ================================================================

  // --- やきゅう バッティング(擬似3D): ピッチャーの たまが てまえに とんでくる。
  //     ◀▶(か ドラッグ)で バットの いちを あわせ、タイミングよく スイング ---
  function makeBaseballGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const PITCHES = 8;
        let running = true, rafId = null, last = null, pitchNo = 0, bases = 0, hits = 0, hrs = 0, batX = 0, leftHeld = false, rightHeld = false, drag = null, ball = null, flying = null, swing = null, msg = '', msgUntil = 0, nextPitchAt = 0, results = [];
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="bbCount">1/${PITCHES}きゅうめ</span><span id="bbScore">🏟 0ベース</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="bbCanvas"></canvas></div>
          <div class="mg-hint" id="bbHint">◀▶かがめんドラッグでバットをたまのコースへ。たまがホームベースにくるしゅんかんにスイング!まんなかであてるとホームラン</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="bbLeft" data-key="left">◀</button><button class="mg-tap-btn primary" id="bbSwing" data-key="action">スイング!</button><button class="mg-tap-btn mg-hold-btn" id="bbRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#bbCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const countEl = container.querySelector('#bbCount'), scoreEl = container.querySelector('#bbScore'), hint = container.querySelector('#bbHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { countEl.textContent = `${Math.min(PITCHES, pitchNo + 1)}/${PITCHES}きゅうめ`; scoreEl.textContent = `🏟 ${bases}ベース`; };
        bindHeldButton(container.querySelector('#bbLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#bbRight'), (v) => { rightHeld = v; });
        container.querySelector('#bbSwing').addEventListener('pointerdown', (e) => { e.preventDefault(); doSwing(); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, x: p.x, bx: batX, moved: false }; });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); const dx = p.x - drag.x; if (Math.abs(dx) > 4) drag.moved = true; batX = clamp(drag.bx + dx / (W * 0.28), -1.3, 1.3); });
        const endDrag = (e) => { if (!drag || (e && e.pointerId !== drag.id)) return; if (!drag.moved) doSwing(); drag = null; };
        canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', () => { drag = null; });
        // カメラ: ホームベース(z=0)の うしろから ピッチャー(z=1)を みる
        const HORIZON = H * 0.42, MOUND_Y = H * 0.5, PLATE_Y = H * 0.9;
        const proj = (x, y, z) => { const s = lerp(1.6, 0.18, clamp(z, 0, 1.05)); return { sx: W / 2 + x * W * 0.28 * s, sy: lerp(PLATE_Y, MOUND_Y, z) - y * 90 * s, s }; };
        function newPitch() {
          const types = [{ n: 'ストレート', spd: lerp(0.62, 0.95, difficulty), curve: 0 }, { n: 'カーブ', spd: lerp(0.55, 0.8, difficulty), curve: (Math.random() < 0.5 ? -1 : 1) * 0.7 }, { n: 'スローボール', spd: lerp(0.42, 0.6, difficulty), curve: 0 }];
          const t = types[pitchNo === 0 ? 0 : Math.floor(Math.random() * types.length)];
          const tx = (Math.random() - 0.5) * 1.5;
          ball = { z: 1, x: tx - t.curve * 0.6, tx, y: 0.5 + Math.random() * 0.4, spd: t.spd, curve: t.curve, type: t.n, born: performance.now(), done: false };
          say(`${t.n}!`, 700);
        }
        function doSwing() { if (!running || swing || !ball || ball.done) return; swing = { at: performance.now(), x: batX }; sfx('whoosh'); }
        function judge() {
          // タイミング: たまが z=0.04(ベース)を とおる しゅんかん
          const timing = ball.z - 0.04; const dx = Math.abs(swing.x - ball.x);
          const q = 1 - Math.abs(timing) / 0.13 - dx / 0.45;
          ball.done = true; let text, add = 0, kind;
          if (q > 0.72) { text = '💥ホームラン!!'; add = 4; kind = 'hr'; hrs++; }
          else if (q > 0.5) { text = '⚾ 3ベース!'; add = 3; kind = 'hit'; }
          else if (q > 0.3) { text = '⚾ 2ベースヒット!'; add = 2; kind = 'hit'; }
          else if (q > 0.08) { text = '⚾ヒット!'; add = 1; kind = 'hit'; }
          else if (q > -0.35) { text = 'ファウル…'; kind = 'foul'; }
          else { text = 'からぶり!'; kind = 'miss'; }
          if (add) { hits++; bases += add; sfx(kind === 'hr' ? 'levelup' : 'hit'); } else sfx(kind === 'foul' ? 'tick' : 'bad');
          const dir = timing > 0.03 ? 1 : timing < -0.03 ? -1 : (Math.random() - 0.5) * 0.6;
          if (kind !== 'miss') flying = { x: ball.x, y: 0.4, z: 0.04, vx: kind === 'foul' ? (Math.random() < 0.5 ? -1 : 1) * 1.2 : dir * 0.5, vy: kind === 'hr' ? 2.6 : kind === 'foul' ? 1.4 : 1.2 + add * 0.35, vz: kind === 'foul' ? 0.3 : 1.2 + add * 0.5, born: performance.now(), kind };
          say(text, 1300); results.push(kind); hud();
          nextPitchAt = performance.now() + 1700;
        }
        function update(dt, now) {
          const steer = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0); if (steer) batX = clamp(batX + steer * dt * 2.4, -1.3, 1.3);
          if (ball && !ball.done) {
            ball.z -= ball.spd * dt; const prog = 1 - ball.z; ball.x = ball.tx - ball.curve * 0.6 * (1 - prog) + ball.curve * 0.25 * Math.sin(prog * Math.PI); ball.y = lerp(0.9, 0.35, prog) + (ball.type === 'スローボール' ? Math.sin(prog * Math.PI) * 0.5 : 0);
            if (swing && now - swing.at < 40 && !ball.done) judge();
            else if (ball.z < -0.08) { ball.done = true; say(swing ? 'からぶり!' : 'みのがし…ストライク', 1100); results.push('miss'); nextPitchAt = now + 1300; }
          }
          if (flying) { flying.x += flying.vx * dt; flying.z += flying.vz * dt; flying.vy -= 3.2 * dt; flying.y += flying.vy * dt; if (flying.y < 0) { flying.y = 0; flying.vy *= -0.4; flying.vx *= 0.7; flying.vz *= 0.7; } if (now - flying.born > 1600) flying = null; }
          if (swing && now - swing.at > 260) swing = null;
          if (ball && ball.done && now >= nextPitchAt) { pitchNo++; if (pitchNo >= PITCHES) { finish(); return; } hud(); newPitch(); }
        }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, HORIZON); sky.addColorStop(0, '#6fb6ff'); sky.addColorStop(1, '#d8ecff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HORIZON);
          ctx.fillStyle = '#3f8f4a'; ctx.fillRect(0, HORIZON, W, H - HORIZON);
          const grass = ctx.createLinearGradient(0, HORIZON, 0, H); grass.addColorStop(0, 'rgba(255,255,255,.12)'); grass.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = grass; ctx.fillRect(0, HORIZON, W, H - HORIZON);
          // スタンド
          ctx.fillStyle = '#5d6b7a'; ctx.fillRect(0, HORIZON - 26, W, 26); for (let i = 0; i < 18; i++) { ctx.fillStyle = ['#e63946', '#ffd23f', '#3a86ff', '#fff'][i % 4]; ctx.fillRect(i * (W / 18) + 3, HORIZON - 20 + (i % 3) * 5, 6, 6); }
          // ないや(土)
          ctx.fillStyle = '#c99a63'; ctx.beginPath(); ctx.moveTo(W / 2, MOUND_Y - 30); ctx.lineTo(W * 1.1, PLATE_Y + 10); ctx.lineTo(-W * 0.1, PLATE_Y + 10); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2, MOUND_Y - 8); ctx.lineTo(W * 1.2, PLATE_Y + 20); ctx.moveTo(W / 2, MOUND_Y - 8); ctx.lineTo(-W * 0.2, PLATE_Y + 20); ctx.stroke();
          ctx.fillStyle = '#b3824a'; ctx.beginPath(); ctx.ellipse(W / 2, MOUND_Y + 2, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
          ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(ball && !ball.done && now - ball.born < 300 ? '🤾' : '🧍', W / 2, MOUND_Y - 2);
          // ホームベース と ストライクゾーン
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(W / 2 - 22, PLATE_Y); ctx.lineTo(W / 2 + 22, PLATE_Y); ctx.lineTo(W / 2 + 22, PLATE_Y + 8); ctx.lineTo(W / 2, PLATE_Y + 16); ctx.lineTo(W / 2 - 22, PLATE_Y + 8); ctx.closePath(); ctx.fill();
          const zl = proj(-0.75, 0.3, 0.04), zr = proj(0.75, 0.95, 0.04); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.strokeRect(zl.sx, zr.sy, zr.sx - zl.sx, zl.sy - zr.sy); ctx.setLineDash([]);
          // とんでいく たま
          if (flying) { const p = proj(flying.x, flying.y, Math.min(1.2, flying.z)); ctx.fillStyle = 'rgba(0,0,0,.25)'; const g = proj(flying.x, 0, Math.min(1.2, flying.z)); ctx.beginPath(); ctx.ellipse(g.sx, g.sy, 5 * p.s, 2 * p.s, 0, 0, Math.PI * 2); ctx.fill(); ctx.font = `${Math.max(6, Math.round(14 * p.s))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚾', p.sx, p.sy); }
          // とんでくる たま
          if (ball && !ball.done) { const p = proj(ball.x, ball.y, clamp(ball.z, 0, 1)); const g = proj(ball.x, 0, clamp(ball.z, 0, 1)); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(g.sx, g.sy, 6 * p.s, 2.5 * p.s, 0, 0, Math.PI * 2); ctx.fill(); ctx.font = `${Math.round(lerp(8, 30, 1 - ball.z))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⚾', p.sx, p.sy); }
          // バッター と バット(てまえ)
          const bp = proj(batX, 0.6, 0.02); const bx0 = bp.sx;
          const swT = swing ? clamp((now - swing.at) / 220, 0, 1) : 0; const ang = swing ? lerp(-0.9, 1.6, swT) : -0.9;
          ctx.save(); ctx.translate(bx0 + (batX < 0 ? 70 : -70), PLATE_Y - 20); ctx.font = '38px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(currentSprite(), 0, 14); ctx.restore();
          ctx.save(); ctx.translate(bx0 + (batX < 0 ? 40 : -40), PLATE_Y - 34); ctx.rotate((batX < 0 ? -1 : 1) * ang); ctx.fillStyle = '#d9a066'; ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-4, -66, 9, 68, 4) : ctx.rect(-4, -66, 9, 68); ctx.fill(); ctx.stroke(); ctx.restore();
          // バットの めじるし(ストライクゾーンの どこを カバーしているか)
          ctx.fillStyle = swing ? 'rgba(255,230,120,.9)' : 'rgba(255,255,255,.7)'; ctx.fillRect(bp.sx - 22, PLATE_Y - 4, 44, 4);
          if (now < msgUntil) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, 30, 180, 30); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 45); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime + MG_ACTION_START_GRACE_MS) { if (!ball) newPitch(); update(dt, now); }
          if (!running) return;
          render(now);
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(12 + bases * 5.5 + hrs * 4), 12, 100);
          say(`おわり!${hits}あんだ${bases}ベース${hrs ? `HR${hrs}本!` : ''}`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const BASEBALL_VARIANTS = [mg('baseball-batting', makeBaseballGame({ title: 'やきゅう!コースをあわせてタイミングよくスイング' }))];

  // --- リングフライト3D: ゆびで ひこうきを うごかし、まえから くる リングを
  //     くぐる。くもは よける。コインも あつめて ---
  function makeRingFlightGame({ title, theme }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const T = theme === 'summer' ? { sky: ['#ff8c5a', '#ffd9a8'], sea: ['#2f6fb5', '#0b2f5c'], sun: 'rgba(255,110,70,.95)', coin: '🐚', deco: '🐬' } : { sky: ['#3f8fe0', '#b9e2ff'], sea: ['#2f7fb8', '#0f4f80'], sun: 'rgba(255,240,180,.9)', coin: '🪙', deco: null };
        const DURATION_MS = mgDuration(60000);
        let running = true, rafId = null, last = null, px = 0, py = 0, tx = 0, ty = 0, held = { left: false, right: false, up: false, down: false }, drag = null, rings = 0, missed = 0, coins = 0, speed = lerp(2.0, 2.6, difficulty), objs = [], spawnZ = 6, msg = '', msgUntil = 0, shake = 0, bank = 0, flash = 0, streak = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="rfTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="rfScore">⭕ 0／🪙 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="rfCanvas"></canvas></div>
          <div class="mg-hint" id="rfHint">がめんをなぞってひこうきをうごかす(十字キーでもOK)。リングのまんなかをくぐると○、くもにあたるとスピードダウン</div>
          <div class="mg-gunner-controls"><button class="mg-tap-btn mg-hold-btn" id="rfLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="rfUp" data-key="up">▲</button><button class="mg-tap-btn mg-hold-btn" id="rfDown" data-key="down">▼</button><button class="mg-tap-btn mg-hold-btn" id="rfRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#rfCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 240);
        const timerEl = container.querySelector('#rfTimer'), scoreEl = container.querySelector('#rfScore'), hint = container.querySelector('#rfHint');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `⭕ ${rings}／${T.coin} ${coins}`; };
        for (const k of ['Left', 'Right', 'Up', 'Down']) bindHeldButton(container.querySelector('#rf' + k), (v) => { held[k.toLowerCase()] = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, x: p.x, y: p.y, tx, ty }; });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); tx = clamp(drag.tx + (p.x - drag.x) / (W * 0.3), -1, 1); ty = clamp(drag.ty - (p.y - drag.y) / (H * 0.3), -1, 1); });
        const endDrag = () => { drag = null; }; canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
        const F = 1.1; // 焦点
        const proj = (x, y, z) => { const s = F / (z + 0.35); return { sx: W / 2 + x * W * 0.42 * s, sy: H * 0.5 - y * H * 0.36 * s, s }; };
        function spawn() {
          const r = Math.random();
          const x = (Math.random() - 0.5) * 1.6, y = (Math.random() - 0.5) * 1.4;
          if (r < 0.55) objs.push({ kind: 'ring', x, y, z: spawnZ, r: lerp(0.42, 0.3, difficulty), hit: false });
          else if (r < 0.8) objs.push({ kind: 'cloud', x, y, z: spawnZ, r: 0.34, hit: false });
          else { for (let i = 0; i < 3; i++) objs.push({ kind: 'coin', x: x + (i - 1) * 0.28, y, z: spawnZ + i * 0.25, r: 0.12, hit: false }); }
          spawnZ += lerp(1.9, 1.5, difficulty);
        }
        for (let i = 0; i < 4; i++) spawn();
        function update(dt, now) {
          const kx = (held.right ? 1 : 0) - (held.left ? 1 : 0), ky = (held.up ? 1 : 0) - (held.down ? 1 : 0);
          if (kx || ky) { tx = clamp(tx + kx * dt * 2.2, -1, 1); ty = clamp(ty + ky * dt * 2.2, -1, 1); }
          const ox = px; px += (tx - px) * Math.min(1, dt * 7); py += (ty - py) * Math.min(1, dt * 7); bank += ((px - ox) / Math.max(dt, 0.001) * 0.25 - bank) * Math.min(1, dt * 6);
          speed = Math.min(speed + dt * 0.06, lerp(3.2, 4.0, difficulty));
          for (const o of objs) o.z -= speed * dt;
          spawnZ -= speed * dt; while (spawnZ < 7) spawn();
          for (const o of objs) {
            if (o.hit || o.z > 0.05 || o.z < -0.3) continue;
            const d = Math.hypot(o.x - px, o.y - py); o.hit = true;
            if (o.kind === 'ring') { if (d < o.r) { rings++; streak++; sfx('coin'); flash = 0.35; say(d < o.r * 0.4 ? `🎯まんなか!×${streak}` : `⭕くぐった!`, 700); } else { missed++; streak = 0; say('はずれ…', 600); } }
            else if (o.kind === 'cloud') { if (d < o.r + 0.12) { speed = Math.max(1.6, speed * 0.7); shake = 10; streak = 0; say('☁くもにつっこんだ!', 800); } }
            else if (o.kind === 'coin') { if (d < o.r + 0.16) { coins++; sfx('coin'); say(T.coin, 400); } }
            hud();
          }
          objs = objs.filter((o) => o.z > -0.4);
          if (shake > 0) shake -= dt * 30;
        }
        function drawPlane(x, y, b) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(clamp(b, -0.6, 0.6));
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 26, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(-42, 4); ctx.lineTo(42, 4); ctx.lineTo(30, -4); ctx.lineTo(-30, -4); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#f1faee'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 20, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#457b9d'; ctx.beginPath(); ctx.ellipse(0, -6, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#e63946'; ctx.fillRect(-12, 14, 24, 5); ctx.fillRect(-2, 8, 4, 12);
          ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentSprite(), 0, -5);
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          ctx.save(); if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
          const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, T.sky[0]); sky.addColorStop(0.55, T.sky[1]); sky.addColorStop(0.56, T.sea[0]); sky.addColorStop(1, T.sea[1]); ctx.fillStyle = sky; ctx.fillRect(-10, -10, W + 20, H + 20);
          ctx.fillStyle = T.sun; ctx.beginPath(); ctx.arc(W * 0.78, H * 0.2, 16, 0, Math.PI * 2); ctx.fill(); if (T.deco) { ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const jump = Math.abs(Math.sin(now / 700)); ctx.fillText(T.deco, W * 0.2 + Math.sin(now / 1500) * 20, H * 0.62 - jump * 18); }
          // うみの ライン(スピードかん)
          for (let i = 0; i < 6; i++) { const z = ((i * 1.2 + (now / 1000 * speed) % 1.2)); const p = proj(0, -1.1, z); ctx.strokeStyle = `rgba(255,255,255,${0.25 * (1 - z / 7)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, p.sy); ctx.lineTo(W, p.sy); ctx.stroke(); }
          const sorted = objs.slice().sort((a, b) => b.z - a.z);
          for (const o of sorted) {
            if (o.z < -0.2) continue; const p = proj(o.x, o.y, o.z); const R = o.r * W * 0.42 * p.s; const a = clamp(1 - o.z / 7, 0.15, 1);
            if (o.kind === 'ring') { ctx.lineWidth = Math.max(2, 7 * p.s); ctx.strokeStyle = o.hit ? 'rgba(120,255,140,.9)' : `rgba(255,${Math.round(lerp(120, 210, a))},60,${a})`; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, R, R * 1.05, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = Math.max(1, 2 * p.s); ctx.strokeStyle = `rgba(255,255,255,${a * 0.6})`; ctx.beginPath(); ctx.ellipse(p.sx, p.sy, R * 0.86, R * 0.9, 0, 0, Math.PI * 2); ctx.stroke(); }
            else if (o.kind === 'cloud') { ctx.fillStyle = `rgba(255,255,255,${a * 0.9})`; for (const [dx, dy, k] of [[0, 0, 1], [-0.7, 0.2, 0.7], [0.7, 0.2, 0.7], [0.2, -0.4, 0.6]]) { ctx.beginPath(); ctx.arc(p.sx + dx * R, p.sy + dy * R, R * k, 0, Math.PI * 2); ctx.fill(); } }
            else { ctx.font = `${Math.max(6, Math.round(R * 2.2))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = a; ctx.fillText(T.coin, p.sx, p.sy); ctx.globalAlpha = 1; }
          }
          const pp = proj(px, py, 0); drawPlane(pp.sx, pp.sy, bank);
          if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(-10, -10, W + 20, H + 20); flash = Math.max(0, flash - 0.03); }
          ctx.restore();
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('テイクオフ!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, 10, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 23); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const total = rings + missed; const rate = total ? rings / total : 0;
          const score = clamp(Math.round(15 + rings * 4 + rate * 20 + coins * 1.5), 15, 100);
          say(`🛬ちゃくりく!リング${rings}/${total}コイン${coins}`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const RING_FLIGHT_VARIANTS = [mg('ring-flight-3d', makeRingFlightGame({ title: 'リングフライト3D!そらのリングをくぐりぬけろ' }))];

  // --- バブルシューター: ゆびで ねらって はなす。おなじ いろを 3こ そろえて
  //     けす。うかんだ かたまりは おちる。なんショットかごとに 1だん おりてくる ---
  function makeBubbleShooterGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 9, ROWS_INIT = Math.round(lerp(4, 6, difficulty)), DURATION_MS = mgDuration(100000), DROP_EVERY = Math.round(lerp(7, 5, difficulty));
        const COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#c77dff'];
        const NCOL = Math.round(lerp(4, 5, difficulty));
        let running = true, rafId = null, last = null, grid = [], shooting = null, aim = null, shotsSince = 0, popped = 0, msg = '', msgUntil = 0, particles = [], falling = [], nextColor = 0, queueColor = 0, gameOver = false;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="bsTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="bsScore">💥 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="bsCanvas"></canvas></div>
          <div class="mg-hint" id="bsHint">がめんをおさえてねらいをきめ、はなすとはっしゃ。おなじいろが3こつながるときえる。かべにはねかえしてうらからねらうのもアリ</div>`;
        const canvas = container.querySelector('#bsCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * 1.3));
        const R = W / (COLS * 2 + 1), RH = R * Math.sqrt(3);
        const SHOOTER = { x: W / 2, y: H - R - 6 }, DEAD_Y = H - R * 4.2;
        const timerEl = container.querySelector('#bsTimer'), scoreEl = container.querySelector('#bsScore'), hint = container.querySelector('#bsHint');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `💥 ${popped}`; };
        const rowLen = (r) => (r % 2 ? COLS - 1 : COLS);
        const cellPos = (r, c) => ({ x: R + c * 2 * R + (r % 2 ? R : 0) + R * 0.5, y: R + r * RH + 4 });
        const randColor = () => Math.floor(Math.random() * NCOL);
        for (let r = 0; r < ROWS_INIT; r++) { grid.push(Array.from({ length: rowLen(r) }, () => randColor())); }
        const ensureRow = (r) => { while (grid.length <= r) grid.push(Array(rowLen(grid.length)).fill(-1)); };
        function neighbors(r, c) { const odd = r % 2; const d = odd ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]; const out = []; for (const [dr, dc] of d) { const nr = r + dr, nc = c + dc; if (nr < 0 || nr >= grid.length || nc < 0 || nc >= rowLen(nr)) continue; out.push([nr, nc]); } return out; }
        function colorsLeft() { const s = new Set(); for (const row of grid) for (const v of row) if (v >= 0) s.add(v); return [...s]; }
        function pickColor() { const left = colorsLeft(); if (!left.length) return randColor(); return left[Math.floor(Math.random() * left.length)]; }
        nextColor = pickColor(); queueColor = pickColor();
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || shooting) return; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); aim = { id: e.pointerId, x: p.x, y: p.y }; });
        canvas.addEventListener('pointermove', (e) => { if (!aim || e.pointerId !== aim.id) return; const p = mgPointerPos(canvas, e); aim.x = p.x; aim.y = p.y; });
        canvas.addEventListener('pointerup', (e) => { if (!aim || e.pointerId !== aim.id) return; const a = aimAngle(); aim = null; if (a == null || shooting || !running) return; shooting = { x: SHOOTER.x, y: SHOOTER.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, color: nextColor }; nextColor = queueColor; queueColor = pickColor(); });
        canvas.addEventListener('pointercancel', () => { aim = null; });
        function aimAngle() { if (!aim) return null; const dx = aim.x - SHOOTER.x, dy = aim.y - SHOOTER.y; if (dy > -8 && Math.hypot(dx, dy) < 30) return null; let a = Math.atan2(Math.min(dy, -8), dx); a = clamp(a, -Math.PI + 0.18, -0.18); return a; }
        function nearestCell(x, y) {
          let best = null, bd = Infinity; const rMax = Math.max(grid.length + 1, 1);
          for (let r = 0; r <= rMax; r++) for (let c = 0; c < rowLen(r); c++) { const p = cellPos(r, c); const d = Math.hypot(p.x - x, p.y - y); if (d < bd && (r >= grid.length || grid[r][c] < 0)) { bd = d; best = [r, c]; } }
          return best;
        }
        function place(r, c, color) {
          ensureRow(r); grid[r][c] = color;
          // 3こ いじょう つながり
          const seen = new Set([r + ',' + c]); const stack = [[r, c]]; const group = [];
          while (stack.length) { const [cr, cc] = stack.pop(); group.push([cr, cc]); for (const [nr, nc] of neighbors(cr, cc)) { const k = nr + ',' + nc; if (!seen.has(k) && grid[nr][nc] === color) { seen.add(k); stack.push([nr, nc]); } } }
          if (group.length >= 3) {
            for (const [gr, gc] of group) { const p = cellPos(gr, gc); burst(p.x, p.y, COLORS[grid[gr][gc]]); grid[gr][gc] = -1; }
            sfx('pop'); popped += group.length;
            // うかんだ かたまり
            const anchored = new Set(); const st = [];
            for (let c2 = 0; c2 < rowLen(0); c2++) if (grid[0] && grid[0][c2] >= 0) { anchored.add('0,' + c2); st.push([0, c2]); }
            while (st.length) { const [cr, cc] = st.pop(); for (const [nr, nc] of neighbors(cr, cc)) { const k = nr + ',' + nc; if (!anchored.has(k) && grid[nr][nc] >= 0) { anchored.add(k); st.push([nr, nc]); } } }
            let drop = 0;
            for (let rr = 0; rr < grid.length; rr++) for (let cc = 0; cc < grid[rr].length; cc++) if (grid[rr][cc] >= 0 && !anchored.has(rr + ',' + cc)) { const p = cellPos(rr, cc); falling.push({ x: p.x, y: p.y, vy: 40, color: grid[rr][cc] }); grid[rr][cc] = -1; drop++; }
            popped += drop * 2;
            say(drop ? `💥 ${group.length}こ+おとした${drop}こ!` : `💥 ${group.length}こけした!`, 800);
            hud();
          }
          while (grid.length && grid[grid.length - 1].every((v) => v < 0)) grid.pop();
          if (!grid.length) { finish(true); return; }
          shotsSince++;
          if (shotsSince >= DROP_EVERY) { shotsSince = 0; grid.unshift(Array.from({ length: COLS }, () => randColor())); // ぜんたいが 1だん さがる: かたよりを なおすため 行の ながさを あわせる
            for (let rr = 1; rr < grid.length; rr++) { const need = rowLen(rr); if (grid[rr].length > need) grid[rr] = grid[rr].slice(0, need); while (grid[rr].length < need) grid[rr].push(-1); }
            say('⬇ 1だんおりてきた!', 800); }
          for (let rr = 0; rr < grid.length; rr++) for (let cc = 0; cc < grid[rr].length; cc++) if (grid[rr][cc] >= 0 && cellPos(rr, cc).y + R > DEAD_Y) { gameOver = true; finish(false); return; }
        }
        function burst(x, y, color) { for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 90; particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, color }); } }
        function update(dt) {
          if (shooting) {
            const steps = 3;
            for (let i = 0; i < steps && shooting; i++) {
              shooting.x += shooting.vx * dt / steps; shooting.y += shooting.vy * dt / steps;
              if (shooting.x < R) { shooting.x = R; shooting.vx = Math.abs(shooting.vx); } if (shooting.x > W - R) { shooting.x = W - R; shooting.vx = -Math.abs(shooting.vx); }
              let stick = shooting.y <= R + 4;
              if (!stick) for (let r = 0; r < grid.length && !stick; r++) for (let c = 0; c < grid[r].length; c++) { if (grid[r][c] < 0) continue; const p = cellPos(r, c); if (Math.hypot(p.x - shooting.x, p.y - shooting.y) < 2 * R * 0.92) { stick = true; break; } }
              if (stick) { const cell = nearestCell(shooting.x, shooting.y); const col = shooting.color; shooting = null; if (cell) place(cell[0], cell[1], col); }
            }
          }
          for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; } particles = particles.filter((p) => p.life > 0);
          for (const f of falling) { f.vy += 700 * dt; f.y += f.vy * dt; } falling = falling.filter((f) => f.y < H + R);
        }
        function drawBubble(x, y, color, r = R) {
          ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(x + 1.5, y + 2, r - 1, 0, Math.PI * 2); ctx.fill();
          const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(0.3, color); g.addColorStop(1, mgShade(color, 0.6)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.fill();
        }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1b1f3a'); bg.addColorStop(1, '#2c2a5a'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(255,90,90,.5)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, DEAD_Y); ctx.lineTo(W, DEAD_Y); ctx.stroke(); ctx.setLineDash([]);
          for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) { if (grid[r][c] < 0) continue; const p = cellPos(r, c); drawBubble(p.x, p.y, COLORS[grid[r][c]]); }
          for (const f of falling) drawBubble(f.x, f.y, COLORS[f.color]);
          for (const p of particles) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
          // ねらい線(かべ はんしゃ 1回まで)
          const a = aimAngle();
          if (a != null && !shooting) { let x = SHOOTER.x, y = SHOOTER.y, dx = Math.cos(a), dy = Math.sin(a); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.setLineDash([3, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); for (let i = 0; i < 260; i++) { x += dx * 3; y += dy * 3; if (x < R || x > W - R) dx = -dx; if (y < R) break; let hit = false; for (let r = 0; r < grid.length && !hit; r++) for (let c = 0; c < grid[r].length; c++) { if (grid[r][c] < 0) continue; const p = cellPos(r, c); if (Math.hypot(p.x - x, p.y - y) < 2 * R * 0.92) { hit = true; break; } } ctx.lineTo(x, y); if (hit) break; } ctx.stroke(); ctx.setLineDash([]); }
          // シューター
          ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(SHOOTER.x, SHOOTER.y, R * 1.6, 0, Math.PI * 2); ctx.fill();
          if (shooting) drawBubble(shooting.x, shooting.y, COLORS[shooting.color]); else drawBubble(SHOOTER.x, SHOOTER.y, COLORS[nextColor]);
          drawBubble(SHOOTER.x + R * 3.2, SHOOTER.y + 2, COLORS[queueColor], R * 0.7); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('つぎ', SHOOTER.x + R * 3.2, SHOOTER.y - R * 1.1);
          ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.textAlign = 'left'; ctx.fillText(`つぎの1だんまで${DROP_EVERY - shotsSince}`, 8, SHOOTER.y);
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, H / 2 - 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          update(dt); if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(cleared) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = cleared ? 100 : gameOver ? clamp(Math.round(10 + popped * 0.8), 10, 55) : clamp(Math.round(20 + popped * 1.2), 20, 92);
          say(cleared ? '🏆ぜんぶけした!' : gameOver ? '💦したまできてしまった…' : `タイムアップ!${popped}こけした`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const BUBBLE_SHOOTER_VARIANTS = [mg('bubble-shooter', makeBubbleShooterGame({ title: 'バブルシューター!おなじいろを3こそろえてけせ' }))];

  // ================================================================
  // 新作バッチ2(2026-09-08): カタパルト / コネクトフォー / 2048 / フロッガー
  // ================================================================

  // --- カタパルト(物理): ボールを うしろへ ひっぱって はなす。ブロックの とうを
  //     くずして 👻を ぜんぶ たおす。よそう線で かるく ねらえる ---
  function makeCatapultGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const SHOTS = Math.round(lerp(6, 5, difficulty)), TIME_LIMIT_MS = mgDuration(120000), G = 520;
        let running = true, rafId = null, last = null, shots = 0, level = 0, killed = 0, totalTargets = 0, aiming = null, proj = null, blocks = [], msg = '', msgUntil = 0, settleTimer = 0, particles = [];
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="ctShots">のこり${SHOTS}はつ</span><span id="ctTargets">👻 0/0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="ctCanvas"></canvas></div>
          <div class="mg-hint" id="ctHint">ボールをおさえてうしろへひっぱり、はなすとはっしゃ。ブロックをくずして👻をたおそう。たかいところからおとしてもOK</div>`;
        const canvas = container.querySelector('#ctCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 240);
        const GROUND = H - 22, SLING = { x: 38, y: GROUND - 46 }, PR = 8;
        const shotsEl = container.querySelector('#ctShots'), targetsEl = container.querySelector('#ctTargets'), hint = container.querySelector('#ctHint');
        const say = (t, ms = 1100) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const alive = () => blocks.filter((b) => b.kind === 'target' && !b.dead).length;
        const hud = () => { shotsEl.textContent = `のこり${SHOTS - shots}はつ`; targetsEl.textContent = `👻 ${killed}/${totalTargets}`; };
        function buildLevel(n) {
          blocks = [];
          const add = (x, y, w, h, kind) => blocks.push({ x, y, w, h, vx: 0, vy: 0, kind, dead: false, rot: 0, hp: kind === 'target' ? 1 : 3 });
          const bx = W * 0.62;
          if (n === 0) {
            add(bx - 30, GROUND - 60, 10, 60, 'wood'); add(bx + 20, GROUND - 60, 10, 60, 'wood'); add(bx - 34, GROUND - 70, 68, 10, 'wood');
            add(bx - 10, GROUND - 22, 20, 22, 'target'); add(bx - 10, GROUND - 92, 20, 22, 'target');
            add(bx + 60, GROUND - 40, 10, 40, 'stone'); add(bx + 76, GROUND - 22, 20, 22, 'target');
          } else {
            add(bx - 40, GROUND - 50, 10, 50, 'stone'); add(bx + 30, GROUND - 50, 10, 50, 'stone'); add(bx - 44, GROUND - 60, 84, 10, 'wood');
            add(bx - 30, GROUND - 110, 10, 50, 'wood'); add(bx + 20, GROUND - 110, 10, 50, 'wood'); add(bx - 34, GROUND - 120, 68, 10, 'wood');
            add(bx - 10, GROUND - 22, 20, 22, 'target'); add(bx - 10, GROUND - 82, 20, 22, 'target'); add(bx - 10, GROUND - 142, 20, 22, 'target'); add(bx + 60, GROUND - 22, 20, 22, 'target');
          }
          totalTargets += blocks.filter((b) => b.kind === 'target').length;
          hud();
        }
        buildLevel(0);
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || proj) return; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); aiming = { id: e.pointerId, x: p.x, y: p.y }; });
        canvas.addEventListener('pointermove', (e) => { if (!aiming || e.pointerId !== aiming.id) return; const p = mgPointerPos(canvas, e); aiming.x = p.x; aiming.y = p.y; });
        canvas.addEventListener('pointerup', (e) => { if (!aiming || e.pointerId !== aiming.id) return; const v = launchVec(); aiming = null; if (!v || !running) return; sfx('whoosh'); proj = { x: SLING.x, y: SLING.y, vx: v.vx, vy: v.vy, born: performance.now(), trail: [] }; shots++; hud(); });
        canvas.addEventListener('pointercancel', () => { aiming = null; });
        function launchVec() { if (!aiming) return null; const dx = SLING.x - aiming.x, dy = SLING.y - aiming.y; const len = Math.hypot(dx, dy); if (len < 10) return null; const p = clamp(len / 95, 0.15, 1); return { vx: dx / len * p * 560, vy: dy / len * p * 560, p }; }
        function burst(x, y, color, n = 8) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 120; particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.6, color }); } }
        function kill(b) { if (b.dead) return; b.dead = true; killed++; sfx('hit'); burst(b.x + b.w / 2, b.y + b.h / 2, '#c9a7ff', 12); say(['👻やった!', '👻たおした!', '👻ふっとんだ!'][killed % 3], 800); hud(); }
        function physics(dt) {
          let moving = false;
          for (const b of blocks) {
            if (b.dead) continue;
            b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.995;
            if (b.y + b.h > GROUND) { const impact = b.vy; b.y = GROUND - b.h; b.vy = -b.vy * 0.15; b.vx *= 0.8; if (Math.abs(b.vy) < 12) b.vy = 0; if (b.kind === 'target' && impact > 200) kill(b); }
            if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx) * 0.5; } if (b.x + b.w > W) { b.x = W - b.w; b.vx = -Math.abs(b.vx) * 0.5; }
            if (Math.abs(b.vx) > 4 || Math.abs(b.vy) > 4) moving = true;
          }
          for (let i = 0; i < blocks.length; i++) for (let j = 0; j < blocks.length; j++) {
            if (i === j) continue; const a = blocks[i], b = blocks[j]; if (a.dead || b.dead) continue;
            const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
            if (ox <= 0 || oy <= 0) continue;
            if (oy < ox) { // たてに かさなり: うえの ものを おす
              const top = a.y < b.y ? a : b, bot = top === a ? b : a; const rel = top.vy - bot.vy;
              top.y -= oy; if (rel > 0) { if (top.kind === 'target' && rel > 230) kill(top); if (bot.kind === 'target' && rel > 260) kill(bot); top.vy = bot.vy - rel * 0.1; } top.vx += (bot.vx - top.vx) * 0.5;
            } else {
              const left = a.x < b.x ? a : b, right = left === a ? b : a; const rel = left.vx - right.vx;
              left.x -= ox / 2; right.x += ox / 2; if (rel > 0) { const imp = rel * 0.5; left.vx -= imp; right.vx += imp; if (right.kind === 'target' && rel > 160) kill(right); if (left.kind === 'target' && rel > 160) kill(left); }
            }
          }
          for (const b of blocks) { if (b.dead) continue; // ささえが ないと かたむいて おちる
            const supported = b.y + b.h >= GROUND - 0.5 || blocks.some((o) => o !== b && !o.dead && Math.abs(o.y - (b.y + b.h)) < 2 && o.x < b.x + b.w - 2 && o.x + o.w > b.x + 2);
            if (!supported) { b.rot += dt * 1.5 * (b.vx >= 0 ? 1 : -1); } else b.rot *= 0.8;
          }
          if (proj) {
            proj.vy += G * dt; proj.x += proj.vx * dt; proj.y += proj.vy * dt; if (proj.trail.length < 40 && Math.random() < 0.5) proj.trail.push([proj.x, proj.y]);
            for (const b of blocks) { if (b.dead) continue; const cx = clamp(proj.x, b.x, b.x + b.w), cy = clamp(proj.y, b.y, b.y + b.h); const d = Math.hypot(proj.x - cx, proj.y - cy); if (d < PR) {
              const sp = Math.hypot(proj.vx, proj.vy); const nx = d > 0.01 ? (proj.x - cx) / d : 0, ny = d > 0.01 ? (proj.y - cy) / d : -1;
              const massK = b.kind === 'stone' ? 0.35 : b.kind === 'target' ? 0.9 : 0.6;
              b.vx += proj.vx * massK * 0.7; b.vy += proj.vy * massK * 0.5 - 40; if (b.kind === 'target' && sp > 150) kill(b); else if (b.kind !== 'target') { b.hp -= sp > 300 ? 2 : 1; if (b.hp <= 0) { b.dead = true; burst(b.x + b.w / 2, b.y + b.h / 2, b.kind === 'stone' ? '#999' : '#c9853a', 10); } }
              const vn = proj.vx * nx + proj.vy * ny; proj.vx = (proj.vx - 1.5 * vn * nx) * 0.45; proj.vy = (proj.vy - 1.5 * vn * ny) * 0.45; proj.x = cx + nx * (PR + 0.5); proj.y = cy + ny * (PR + 0.5);
            } }
            if (proj.y > GROUND - PR) { proj.y = GROUND - PR; proj.vy = -proj.vy * 0.35; proj.vx *= 0.7; }
            if (proj.x > W + 40 || proj.x < -40 || (performance.now() - proj.born > 4500) || (Math.abs(proj.vx) < 6 && Math.abs(proj.vy) < 6 && proj.y > GROUND - PR - 1)) { proj = null; settleTimer = 0.9; }
          }
          if (!proj && settleTimer > 0) { settleTimer -= dt; if (settleTimer <= 0 && !moving) afterShot(); else if (settleTimer <= 0) settleTimer = 0.3; }
          for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; } particles = particles.filter((p) => p.life > 0);
        }
        function afterShot() {
          if (alive() === 0) { if (level === 0) { level = 1; say('🎉つぎのとう!', 1200); buildLevel(1); return; } finish(true); return; }
          if (shots >= SHOTS) finish(false);
        }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8fd3ff'); sky.addColorStop(1, '#e6f6ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,255,255,.8)'; for (const [cx, cy, r] of [[50, 36, 12], [66, 30, 15], [82, 38, 11], [180, 50, 10], [194, 44, 13]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = '#6fbf5a'; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = '#4f9a42'; ctx.fillRect(0, GROUND, W, 4);
          // ふりこ台
          ctx.strokeStyle = '#6b3f1d'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(SLING.x - 10, GROUND); ctx.lineTo(SLING.x - 2, SLING.y + 6); ctx.moveTo(SLING.x + 10, GROUND); ctx.lineTo(SLING.x + 2, SLING.y + 6); ctx.stroke(); ctx.lineCap = 'butt';
          for (const b of blocks) { if (b.dead) continue; ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.rotate(clamp(b.rot, -0.5, 0.5));
            if (b.kind === 'target') { ctx.font = `${Math.round(b.h)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👻', 0, 1); }
            else { const g = ctx.createLinearGradient(-b.w / 2, -b.h / 2, b.w / 2, b.h / 2); if (b.kind === 'stone') { g.addColorStop(0, '#c7ccd4'); g.addColorStop(1, '#7d868f'); } else { g.addColorStop(0, '#e2a865'); g.addColorStop(1, '#a86a2c'); } ctx.fillStyle = g; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.strokeRect(-b.w / 2 + 0.5, -b.h / 2 + 0.5, b.w - 1, b.h - 1); if (b.hp < 3 && b.kind !== 'target') { ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.moveTo(-b.w / 4, -b.h / 4); ctx.lineTo(b.w / 6, b.h / 5); ctx.stroke(); } }
            ctx.restore(); }
          for (const p of particles) { ctx.globalAlpha = clamp(p.life * 1.6, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); } ctx.globalAlpha = 1;
          if (proj) { ctx.fillStyle = 'rgba(0,0,0,.15)'; for (const [tx, ty] of proj.trail) { ctx.beginPath(); ctx.arc(tx, ty, 2, 0, Math.PI * 2); ctx.fill(); } }
          const v = launchVec(); const bx = aiming && v ? SLING.x - v.vx / 560 * 30 : SLING.x, by = aiming && v ? SLING.y - v.vy / 560 * 30 : SLING.y;
          if (aiming && v) { ctx.strokeStyle = '#6b3f1d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(SLING.x - 4, SLING.y + 2); ctx.lineTo(bx, by); ctx.lineTo(SLING.x + 4, SLING.y + 2); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.7)'; let px = SLING.x, py = SLING.y, vx = v.vx, vy = v.vy; for (let i = 0; i < 14; i++) { px += vx * 0.06; vy += G * 0.06; py += vy * 0.06; if (py > GROUND) break; ctx.beginPath(); ctx.arc(px, py, 2.2 - i * 0.1, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(8, 8, 60, 6); ctx.fillStyle = v.p > 0.8 ? '#ff6b6b' : '#ffd23f'; ctx.fillRect(8, 8, 60 * v.p, 6); }
          const ballX = proj ? proj.x : bx, ballY = proj ? proj.y : by;
          if (proj || shots < SHOTS) { const g = ctx.createRadialGradient(ballX - 3, ballY - 3, 1, ballX, ballY, PR); g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#e63946'); g.addColorStop(1, '#8a1c25'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ballX, ballY, PR, 0, Math.PI * 2); ctx.fill(); ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentSprite(), ballX, ballY + 0.5); }
          ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = '#2b4a6b'; ctx.fillText(`ステージ${level + 1}/2`, W - 8, 8);
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, 36, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 49); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.04, (now - last) / 1000); last = now;
          for (let i = 0; i < 2; i++) physics(dt / 2); if (!running) return;
          render(now);
          if (now - startTime > TIME_LIMIT_MS) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(cleared) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = cleared ? clamp(75 + (SHOTS - shots) * 6, 75, 100) : clamp(Math.round(10 + killed * 11), 10, 70);
          say(cleared ? '🏆ぜんぶたおした!' : `おわり…👻 ${killed}/${totalTargets}`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const CATAPULT_VARIANTS = [mg('catapult-castle', makeCatapultGame({ title: 'カタパルト!とうをくずして👻をたおせ' }))];

  // --- コネクトフォー(7×6): れつを タップして おとす。たて・よこ・ななめに
  //     4つ そろえたら かち。AIは 4手よみ ---
  function makeConnectFourGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 7, ROWS = 6, ME = 1, AI = 2, TIME_LIMIT_MS = mgDuration(180000);
        let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0)), turn = ME, running = true, rafId = null, hoverCol = -1, drop = null, aiAt = 0, moves = 0, winLine = null, msg = '', msgUntil = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="c4Turn">あなたのばん(🔴)</span><span id="c4Moves">0手</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="c4Canvas"></canvas></div>
          <div class="mg-hint" id="c4Hint">おとしたいれつをタップ。たて・よこ・ななめに4つならべたらかち。あいて(🟡)の3つならびはふさごう</div>`;
        const canvas = container.querySelector('#c4Canvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * (ROWS + 1) / COLS) + 6);
        const CELL = W / COLS, TOP = CELL;
        const turnEl = container.querySelector('#c4Turn'), movesEl = container.querySelector('#c4Moves'), hint = container.querySelector('#c4Hint');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { turnEl.textContent = turn === ME ? 'あなたのばん(🔴)' : 'あいてのばん(🟡)…'; movesEl.textContent = `${moves}手`; };
        const landing = (b, c) => { for (let r = ROWS - 1; r >= 0; r--) if (!b[r][c]) return r; return -1; };
        function lineAt(b, who) {
          const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (b[r][c] !== who) continue; for (const [dc, dr] of dirs) { const cells = [[r, c]]; for (let k = 1; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || b[rr][cc] !== who) break; cells.push([rr, cc]); } if (cells.length === 4) return cells; } }
          return null;
        }
        function evaluate(b) {
          let v = 0; const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) for (const [dc, dr] of dirs) {
            let me = 0, ai = 0, ok = true; for (let k = 0; k < 4; k++) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) { ok = false; break; } if (b[rr][cc] === ME) me++; else if (b[rr][cc] === AI) ai++; }
            if (!ok) continue; if (me && ai) continue; if (ai === 3) v += 60; else if (ai === 2) v += 6; else if (ai === 1) v += 1; if (me === 3) v -= 70; else if (me === 2) v -= 7; else if (me === 1) v -= 1;
          }
          for (let r = 0; r < ROWS; r++) { if (b[r][3] === AI) v += 3; if (b[r][3] === ME) v -= 3; }
          return v;
        }
        function search(b, depth, who, alpha, beta) {
          if (lineAt(b, AI)) return 10000 + depth; if (lineAt(b, ME)) return -10000 - depth;
          const cols = [3, 2, 4, 1, 5, 0, 6].filter((c) => landing(b, c) >= 0); if (!cols.length) return 0; if (depth === 0) return evaluate(b);
          if (who === AI) { let best = -Infinity; for (const c of cols) { const r = landing(b, c); b[r][c] = AI; const v = search(b, depth - 1, ME, alpha, beta); b[r][c] = 0; best = Math.max(best, v); alpha = Math.max(alpha, v); if (beta <= alpha) break; } return best; }
          let best = Infinity; for (const c of cols) { const r = landing(b, c); b[r][c] = ME; const v = search(b, depth - 1, AI, alpha, beta); b[r][c] = 0; best = Math.min(best, v); beta = Math.min(beta, v); if (beta <= alpha) break; } return best;
        }
        function aiMove() {
          const depth = difficulty < 0.3 ? 2 : difficulty < 0.7 ? 4 : 5; let bestC = -1, bestV = -Infinity;
          for (const c of [3, 2, 4, 1, 5, 0, 6]) { const r = landing(board, c); if (r < 0) continue; board[r][c] = AI; let v = search(board, depth - 1, ME, -Infinity, Infinity); board[r][c] = 0; v += (Math.random() - 0.5) * lerp(8, 0.5, difficulty); if (v > bestV) { bestV = v; bestC = c; } }
          if (bestC >= 0) place(AI, bestC);
        }
        function place(who, c) {
          const r = landing(board, c); if (r < 0) return false;
          board[r][c] = who; moves++; sfx('pop'); drop = { r, c, who, born: performance.now() };
          const line = lineAt(board, who); if (line) { winLine = line; end(who); return true; }
          if (moves >= ROWS * COLS) { end(0); return true; }
          turn = 3 - who; hud(); if (turn === AI) aiAt = performance.now() + 500; return true;
        }
        const colAt = (e) => { const p = mgPointerPos(canvas, e); const c = Math.floor(p.x / CELL); return c >= 0 && c < COLS ? c : -1; };
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || turn !== ME) return; hoverCol = colAt(e); });
        canvas.addEventListener('pointermove', (e) => { if (!running || turn !== ME) return; hoverCol = colAt(e); });
        canvas.addEventListener('pointerup', (e) => { if (!running || turn !== ME) return; const c = colAt(e); hoverCol = -1; if (c < 0) return; if (landing(board, c) < 0) { say('そのれつはいっぱい', 700); return; } place(ME, c); });
        canvas.addEventListener('pointercancel', () => { hoverCol = -1; });
        function disc(x, y, who, r = CELL * 0.4) { const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, 1, x, y, r); if (who === ME) { g.addColorStop(0, '#ff9b9b'); g.addColorStop(1, '#c1121f'); } else { g.addColorStop(0, '#fff3a3'); g.addColorStop(1, '#e0a800'); } ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, W, H);
          if (hoverCol >= 0 && turn === ME && running) { ctx.fillStyle = 'rgba(193,18,31,.12)'; ctx.fillRect(hoverCol * CELL, 0, CELL, H); disc((hoverCol + 0.5) * CELL, CELL / 2, ME, CELL * 0.36); }
          else if (turn === ME && running) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('▼れつをタップ', W / 2, CELL / 2); }
          ctx.fillStyle = '#1d4ed8'; mgRoundRect(ctx, 0, TOP, W, H - TOP, 10);
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const x = (c + 0.5) * CELL, y = TOP + (r + 0.5) * CELL; ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(x, y, CELL * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(x, y + 1.5, CELL * 0.4, 0, Math.PI); ctx.fill();
            const v = board[r][c]; if (!v) continue;
            if (drop && drop.r === r && drop.c === c && now - drop.born < 260) { const t = (now - drop.born) / 260; const yy = lerp(CELL / 2, y, t * t); disc(x, yy, v); } else disc(x, y, v);
          }
          if (winLine) { ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(now / 150)})`; ctx.lineWidth = 4; for (const [r, c] of winLine) { ctx.beginPath(); ctx.arc((c + 0.5) * CELL, TOP + (r + 0.5) * CELL, CELL * 0.42, 0, Math.PI * 2); ctx.stroke(); } }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, H / 2 - 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; if (turn === AI && aiAt && now >= aiAt) { aiAt = 0; aiMove(); if (!running) return; } render(now); if (now - startTime > TIME_LIMIT_MS) { end(0); return; } rafId = requestAnimationFrame(loop); }
        function end(w) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = w === ME ? clamp(100 - Math.max(0, moves - 14) * 2, 72, 100) : w === AI ? clamp(15 + moves, 15, 45) : 55;
          say(w === ME ? '🏆 4つそろった!かち!' : w === AI ? 'まけ…あいてがそろえた' : 'ひきわけ', 2600);
          turnEl.textContent = 'しゅうりょう'; render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const CONNECT_FOUR_VARIANTS = [mg('connect-four', makeConnectFourGame({ title: 'コネクトフォー!4つならべてあいてにかとう' }))];

  // --- 2048: スワイプ(か 十字キー)で タイルを すべらせ、おなじ かずを あわせる ---
  function makeTwentyFortyEightGame({ title }) {
    return {
      start(container, onComplete) {
        const N = 4, DURATION_MS = mgDuration(120000);
        let grid = Array.from({ length: N }, () => Array(N).fill(0)), running = true, rafId = null, score = 0, best = 0, moves = 0, anims = [], animStart = 0, swipe = null, msg = '', msgUntil = 0, over = false, spawnAt = null;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="tfTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="tfScore">スコア0／さいだい0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="tfCanvas"></canvas></div>
          <div class="mg-hint" id="tfHint">スワイプ(か十字キー)でぜんぶのタイルがすべる。おなじかずがぶつかるとたされて1つに。おおきいかずをかどにためるのがコツ</div>
          <div class="mg-tilt-dpad"><span></span><button class="mg-tap-btn" id="tfUp" data-key="up">▲</button><span></span><button class="mg-tap-btn" id="tfLeft" data-key="left">◀</button><button class="mg-tap-btn" id="tfDown" data-key="down">▼</button><button class="mg-tap-btn" id="tfRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#tfCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const PAD = 8, GAP = 6, CELL = (W - PAD * 2 - GAP * (N - 1)) / N;
        const timerEl = container.querySelector('#tfTimer'), scoreEl = container.querySelector('#tfScore'), hint = container.querySelector('#tfHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `スコア${score}／さいだい${best}`; };
        const pos = (r, c) => ({ x: PAD + c * (CELL + GAP), y: PAD + r * (CELL + GAP) });
        function spawn() { const empty = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) empty.push([r, c]); if (!empty.length) return; const [r, c] = empty[Math.floor(Math.random() * empty.length)]; grid[r][c] = Math.random() < 0.9 ? 2 : 4; spawnAt = { r, c, at: performance.now() }; }
        spawn(); spawn();
        function slide(dr, dc) {
          if (anims.length && performance.now() - animStart < 120) return;
          const moved = []; const merged = Array.from({ length: N }, () => Array(N).fill(false)); let any = false; let gained = 0;
          const order = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) order.push([r, c]);
          if (dr === 1) order.sort((a, b) => b[0] - a[0]); if (dr === -1) order.sort((a, b) => a[0] - b[0]); if (dc === 1) order.sort((a, b) => b[1] - a[1]); if (dc === -1) order.sort((a, b) => a[1] - b[1]);
          for (const [r, c] of order) {
            const v = grid[r][c]; if (!v) continue; let nr = r, nc = c;
            while (true) { const tr = nr + dr, tc = nc + dc; if (tr < 0 || tr >= N || tc < 0 || tc >= N) break; if (grid[tr][tc] === 0) { nr = tr; nc = tc; continue; } if (grid[tr][tc] === v && !merged[tr][tc]) { nr = tr; nc = tc; } break; }
            if (nr === r && nc === c) continue; any = true;
            if (grid[nr][nc] === v) { grid[nr][nc] = v * 2; merged[nr][nc] = true; gained += v * 2; best = Math.max(best, v * 2); moved.push({ from: [r, c], to: [nr, nc], v, merge: true }); }
            else { grid[nr][nc] = v; moved.push({ from: [r, c], to: [nr, nc], v }); }
            grid[r][c] = 0;
          }
          if (!any) return;
          score += gained; moves++; sfx(gained >= 128 ? 'coin' : gained ? 'pop' : 'tick'); anims = moved; animStart = performance.now(); hud();
          if (gained >= 128) say(`✨ ${gained}!`, 700);
          spawn();
          if (!canMove()) { over = true; say('うごけなくなった…', 2000); setTimeout(() => finish(), 1500); }
        }
        function canMove() { for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { if (!grid[r][c]) return true; if (c + 1 < N && grid[r][c] === grid[r][c + 1]) return true; if (r + 1 < N && grid[r][c] === grid[r + 1][c]) return true; } return false; }
        const bind = (id, dr, dc) => container.querySelector(id).addEventListener('pointerdown', (e) => { e.preventDefault(); if (running && !over) slide(dr, dc); });
        bind('#tfUp', -1, 0); bind('#tfDown', 1, 0); bind('#tfLeft', 0, -1); bind('#tfRight', 0, 1);
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointerup', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.hypot(dx, dy) < 16 || !running || over) return; if (Math.abs(dx) > Math.abs(dy)) slide(0, Math.sign(dx)); else slide(Math.sign(dy), 0); });
        canvas.addEventListener('pointercancel', () => { swipe = null; });
        const COLORS = { 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
        function tile(x, y, v, s = 1) { const cx = x + CELL / 2, cy = y + CELL / 2; const sz = CELL * s; ctx.fillStyle = COLORS[v] || '#3c3a32'; mgRoundRect(ctx, cx - sz / 2, cy - sz / 2, sz, sz, 6); ctx.fillStyle = v <= 4 ? '#776e65' : '#fff'; ctx.font = `bold ${v >= 1024 ? 16 : v >= 128 ? 20 : 24}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(v), cx, cy + 1); }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#bbada0'; mgRoundRect(ctx, 0, 0, W, H, 10);
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const p = pos(r, c); ctx.fillStyle = 'rgba(238,228,218,.35)'; mgRoundRect(ctx, p.x, p.y, CELL, CELL, 6); }
          const t = clamp((now - animStart) / 120, 0, 1); const animating = anims.length && t < 1;
          const covered = new Set(); if (animating) for (const a of anims) covered.add(a.to[0] + ',' + a.to[1]);
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = grid[r][c]; if (!v) continue; if (covered.has(r + ',' + c)) continue; const p = pos(r, c); let s = 1; if (spawnAt && spawnAt.r === r && spawnAt.c === c) { const st = clamp((now - spawnAt.at) / 160, 0, 1); s = animating ? 0.001 : lerp(0.3, 1, st); } if (s > 0.01) tile(p.x, p.y, v, s); }
          if (animating) for (const a of anims) { const f = pos(a.from[0], a.from[1]), to = pos(a.to[0], a.to[1]); tile(lerp(f.x, to.x, t), lerp(f.y, to.y, t), a.v); }
          else if (anims.length) { for (const a of anims) if (a.merge && t < 1.6) { const p = pos(a.to[0], a.to[1]); tile(p.x, p.y, grid[a.to[0]][a.to[1]], 1 + 0.12 * Math.sin(clamp((now - animStart - 120) / 140, 0, 1) * Math.PI)); } }
          if (now < msgUntil) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 15, 160, 30); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function frame(now) { if (!running) return; const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`; render(now); if (remain <= 0) { finish(); return; } rafId = requestAnimationFrame(frame); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const tierScore = best >= 1024 ? 100 : best >= 512 ? 86 : best >= 256 ? 70 : best >= 128 ? 54 : best >= 64 ? 40 : best >= 32 ? 28 : 16;
          const finalScore = clamp(Math.round(tierScore + Math.min(10, score / 300)), 10, 100);
          say(`おわり!さいだい${best}、スコア${score}`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(finalScore), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const TWENTY48_VARIANTS = [mg('puzzle-2048', makeTwentyFortyEightGame({ title: '2048!おなじかずをあわせておおきく' }))];

  // --- フロッガー: 十字キー/スワイプで 1マスずつ。くるまを よけ、いかだに のって
  //     かわを わたり、うえの おうちへ。3かい ゴールで クリア ---
  function makeFroggerGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 9, ROWS = 12, DURATION_MS = mgDuration(75000), GOAL_N = 3;
        let running = true, rafId = null, last = null, fx = 4, fy = ROWS - 1, fxf = 4, fyf = ROWS - 1, lives = 3, goals = 0, dead = 0, msg = '', msgUntil = 0, swipe = null, homes = [1, 4, 7], filled = [], ride = 0, hopAt = 0, maxRow = ROWS - 1, bestReached = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="frTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="frScore">❤️❤️❤️／🏠 0/${GOAL_N}</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="frCanvas"></canvas></div>
          <div class="mg-hint" id="frHint">十字キーかスワイプで1マスとぶ。くるまにあたらないでどうろをわたり、かわは🪵のうえだけあんぜん。あいている🏠へ!</div>
          <div class="mg-tilt-dpad"><span></span><button class="mg-tap-btn" id="frUp" data-key="up">▲</button><span></span><button class="mg-tap-btn" id="frLeft" data-key="left">◀</button><button class="mg-tap-btn" id="frDown" data-key="down">▼</button><button class="mg-tap-btn" id="frRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#frCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * ROWS / COLS));
        const CELL = W / COLS;
        const timerEl = container.querySelector('#frTimer'), scoreEl = container.querySelector('#frScore'), hint = container.querySelector('#frHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `${'❤️'.repeat(Math.max(0, lives))}／🏠 ${goals}/${GOAL_N}`; };
        // レーン: row → {kind, speed(cells/s), items:[{x,w,emoji}]}
        const lanes = {};
        const mk = (row, kind, speed, count, w, emojis) => { const items = []; for (let i = 0; i < count; i++) items.push({ x: (i * COLS / count) + Math.random() * 1.2, w, emoji: emojis[i % emojis.length] }); lanes[row] = { kind, speed, items }; };
        const sp = lerp(1.0, 1.55, difficulty);
        mk(1, 'log', 1.1 * sp, 2, 3, ['🪵']); mk(2, 'log', -1.5 * sp, 3, 2, ['🐢']); mk(3, 'log', 0.9 * sp, 2, 4, ['🪵']); mk(4, 'log', -1.2 * sp, 3, 2, ['🪵']);
        mk(6, 'car', -1.6 * sp, 2, 1, ['🚗']); mk(7, 'car', 1.2 * sp, 2, 1.6, ['🚚']); mk(8, 'car', -2.4 * sp, 1, 1, ['🏎️']); mk(9, 'car', 1.4 * sp, 3, 1, ['🚙', '🚕']); mk(10, 'car', -1.0 * sp, 2, 1.4, ['🚌']);
        function hop(dx, dy) {
          if (!running || dead || performance.now() < startTime) return;
          const nx = clamp(fx + dx, 0, COLS - 1), ny = clamp(fy + dy, 0, ROWS - 1); if (nx === fx && ny === fy) return;
          fx = nx; fy = ny; hopAt = performance.now(); sfx('jump');
          if (fy === 0) { const slot = homes.find((h) => Math.abs(h - fx) <= 0.6 && !filled.includes(h)); if (slot != null) { filled.push(slot); goals++; sfx('coin'); say('🏠ゴール!', 1000); hud(); if (goals >= GOAL_N) { finish(); return; } reset(); } else { die('そこはおうちじゃない'); } }
          if (fy < maxRow) { maxRow = fy; }
        }
        function reset() { fx = 4; fy = ROWS - 1; fxf = fx; fyf = fy; maxRow = ROWS - 1; }
        function die(reason) { if (dead) return; dead = performance.now(); lives--; say(`💫 ${reason}`, 1100); hud(); setTimeout(() => { if (!running) return; dead = 0; if (lives <= 0) { finish(); return; } reset(); }, 900); }
        const bind = (id, dx, dy) => container.querySelector(id).addEventListener('pointerdown', (e) => { e.preventDefault(); hop(dx, dy); });
        bind('#frUp', 0, -1); bind('#frDown', 0, 1); bind('#frLeft', -1, 0); bind('#frRight', 1, 0);
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointerup', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null; if (Math.hypot(dx, dy) < 12) { hop(0, -1); return; } if (Math.abs(dx) > Math.abs(dy)) hop(Math.sign(dx), 0); else hop(0, Math.sign(dy)); });
        canvas.addEventListener('pointercancel', () => { swipe = null; });
        function update(dt, now) {
          for (const row in lanes) { const l = lanes[row]; for (const it of l.items) { it.x += l.speed * dt; if (l.speed > 0 && it.x > COLS + 1) it.x -= COLS + 2 + it.w; if (l.speed < 0 && it.x + it.w < -1) it.x += COLS + 2 + it.w; } }
          if (dead) return;
          const lane = lanes[fy];
          if (lane) {
            const onItem = lane.items.find((it) => fx + 0.5 > it.x - 0.15 && fx + 0.5 < it.x + it.w + 0.15);
            if (lane.kind === 'car') { if (onItem) die('くるまにぶつかった!'); }
            else { if (onItem) { fx += lane.speed * dt; if (fx < -0.4 || fx > COLS - 0.6) die('ながされた…'); } else die('かわにおちた!'); }
          }
          fxf += (fx - fxf) * Math.min(1, dt * 14); fyf += (fy - fyf) * Math.min(1, dt * 14);
        }
        function render(now) {
          if (!ctx) return;
          for (let r = 0; r < ROWS; r++) { const y = r * CELL; if (r === 0) { ctx.fillStyle = '#4a7c3f'; } else if (r <= 4) { ctx.fillStyle = r % 2 ? '#2f6fb5' : '#3579c2'; } else if (r === 5 || r === ROWS - 1) { ctx.fillStyle = '#8fbf6a'; } else { ctx.fillStyle = r % 2 ? '#3b3b44' : '#40404a'; } ctx.fillRect(0, y, W, CELL); }
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; for (let r = 6; r < ROWS - 1; r++) { ctx.beginPath(); ctx.moveTo(0, (r + 1) * CELL); ctx.lineTo(W, (r + 1) * CELL); ctx.stroke(); } ctx.setLineDash([]);
          ctx.font = `${Math.round(CELL * 0.85)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (const h of homes) { ctx.fillStyle = '#2f5a2a'; mgRoundRect(ctx, h * CELL + 2, 2, CELL - 4, CELL - 4, 5); ctx.fillText(filled.includes(h) ? '🏠' : '🚪', (h + 0.5) * CELL, CELL / 2 + 1); }
          for (const row in lanes) { const l = lanes[row]; const y = (+row + 0.5) * CELL; for (const it of l.items) { if (l.kind === 'log') { ctx.fillStyle = it.emoji === '🐢' ? '#4f7a3a' : '#8b5a2b'; mgRoundRect(ctx, it.x * CELL, y - CELL * 0.36, it.w * CELL, CELL * 0.72, 8); for (let k = 0; k < it.w; k++) ctx.fillText(it.emoji, (it.x + k + 0.5) * CELL, y + 1); } else { ctx.save(); if (l.speed < 0) { ctx.translate((it.x + it.w / 2) * CELL, 0); ctx.scale(-1, 1); ctx.translate(-(it.x + it.w / 2) * CELL, 0); } ctx.font = `${Math.round(CELL * 0.95 * Math.min(1.4, it.w))}px sans-serif`; ctx.fillText(it.emoji, (it.x + it.w / 2) * CELL, y + 1); ctx.restore(); ctx.font = `${Math.round(CELL * 0.85)}px sans-serif`; } } }
          const hopT = clamp((now - hopAt) / 160, 0, 1); const lift = Math.sin(hopT * Math.PI) * 6;
          if (!dead || Math.floor(now / 100) % 2) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse((fxf + 0.5) * CELL, (fyf + 0.85) * CELL, CELL * 0.3, CELL * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.font = `${Math.round(CELL * 0.9)}px sans-serif`; ctx.fillText(dead ? '💫' : currentSprite(), (fxf + 0.5) * CELL, (fyf + 0.5) * CELL - lift); }
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('スタート!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, H / 2 - 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now); if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const prog = (ROWS - 1 - maxRow) / (ROWS - 1);
          const score = goals >= GOAL_N ? clamp(80 + lives * 7, 80, 100) : clamp(Math.round(12 + goals * 22 + prog * 12), 12, 75);
          say(goals >= GOAL_N ? '🏆ぜんいんおうちにかえった!' : lives <= 0 ? `ライフがなくなった…🏠 ${goals}` : `タイムアップ!🏠 ${goals}`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const FROGGER_VARIANTS = [mg('frogger-road', makeFroggerGame({ title: 'どうろとかわをわたっておうちへかえろう' }))];

  // ================================================================
  // 新作バッチ2(2026-09-08): スキージャンプ / エアホッケー / サブマリン3D
  // ================================================================

  // --- スキージャンプ: ジャンプ台の はしで タップして とびだし、くうちゅうは
  //     ボタンを おして まえかがみ(かぜの めじるしに あわせる)。ちゃくちの
  //     しゅんかんに タップで テレマーク。3本の ごうけい きょり ---
  function makeSkiJumpGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const JUMPS = 3, G = 9.8;
        let running = true, rafId = null, last = null, jump = 0, phase = 'ready', x = 0, y = 0, vx = 0, vy = 0, lean = 0, leanTarget = 0.5, held = false, dist = 0, total = 0, bestDist = 0, msg = '', msgUntil = 0, landedAt = 0, telemark = false, tapAt = -1e9, wind = 0, windT = 0, results = [], flightT = 0, crashed = false, camX = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="sjJump">1/${JUMPS}本目</span><span id="sjDist">ごうけい0.0m</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="sjCanvas"></canvas></div>
          <div class="mg-hint" id="sjHint">ボタンでスタート→だいのはし(あかい線)でタップしてとびだす!くうちゅうはながおしでまえかがみ。かぜのめじるし(▽)にかさねよう。ちゃくちちょくぜんにタップでテレマーク</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn primary" id="sjBtn" data-key="action">スタート</button></div>`;
        const canvas = container.querySelector('#sjCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 235);
        const jumpEl = container.querySelector('#sjJump'), distEl = container.querySelector('#sjDist'), hint = container.querySelector('#sjHint'), btn = container.querySelector('#sjBtn');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { jumpEl.textContent = `${Math.min(JUMPS, jump + 1)}/${JUMPS}本目`; distEl.textContent = `ごうけい${total.toFixed(1)}m`; };
        // コース(m単位): 助走 0..40 くだり坂、台の端 x=40 y=0、着地斜面 y = -(x-40)*0.62 - 6 (x>44)
        const RAMP_END = 40, SCALE = 4.2;
        // 助走路: たかさ24mから だんだん ゆるくなって x=40 で 0。着地斜面: ゆるく おちてから 0.62 の かたむき
        const rampY = (px) => (px < RAMP_END ? 24 * Math.pow(1 - px / RAMP_END, 1.6) : 0);
        const hillY = (px) => { const d = px - RAMP_END; return d <= 0 ? 0 : -(0.62 * d + 2 * (1 - Math.exp(-d / 2))); };
        const groundY = (px) => (px <= RAMP_END ? rampY(px) : hillY(px));
        function startRun() { phase = 'run'; x = 0; y = rampY(0); vx = 0; vy = 0; lean = 0; telemark = false; crashed = false; flightT = 0; wind = (Math.random() - 0.5) * lerp(0.3, 0.8, difficulty); leanTarget = 0.5 + wind * 0.4; say('だいのはしでタップ!', 1500); }
        function takeoff() {
          if (phase !== 'run') return; const late = x - RAMP_END; // >0 は はしを こえてから
          const err = Math.abs(late); const q = clamp(1 - err / 4, 0, 1);
          phase = 'fly'; sfx('jump'); vy = 2.2 + q * 4.2; vx = vx * (0.98 + q * 0.08); btn.textContent = 'まえかがみ(ながおし)'; say(q > 0.85 ? '🔥かんぺきなとびだし!' : q > 0.5 ? 'いいタイミング' : 'すこしずれた…', 900);
          if (x < RAMP_END) { x = RAMP_END; y = 0; }
        }
        bindHeldButton(btn, (v) => {
          held = v; if (!v || !running) return;
          if (phase === 'ready') { startRun(); btn.textContent = 'とぶ!'; } else if (phase === 'run') { takeoff(); } else if (phase === 'fly') { tapAt = performance.now(); }
        });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running) return; held = true; if (phase === 'ready') { startRun(); btn.textContent = 'とぶ!'; } else if (phase === 'run') { takeoff(); } else if (phase === 'fly') tapAt = performance.now(); });
        const cUp = () => { held = false; }; canvas.addEventListener('pointerup', cUp); canvas.addEventListener('pointercancel', cUp);
        function update(dt, now) {
          if (phase === 'run') {
            const slope = (rampY(x + 0.1) - rampY(x)) / 0.1; vx += (G * -slope * 0.9 - vx * 0.02) * dt; vx = Math.max(vx, 0); x += vx * dt; y = rampY(x);
            if (x > RAMP_END + 2.5) { takeoff(); vy = 0.5; say('とびだしがおそい!', 900); }
          } else if (phase === 'fly') {
            flightT += dt; windT += dt; if (windT > 0.6) { windT = 0; leanTarget = clamp(0.5 + wind * 0.4 + (Math.random() - 0.5) * lerp(0.1, 0.3, difficulty), 0.1, 0.95); }
            lean += ((held ? 1 : 0) - lean) * Math.min(1, dt * 3.2);
            const q = 1 - Math.abs(lean - leanTarget) / 0.5; const lift = 1.0 + clamp(q, -0.6, 1) * 3.5;
            vy += (-G + lift) * dt; vx += (q > 0.6 ? 0.6 : -0.8) * dt; vx = Math.max(vx, 8);
            x += vx * dt; y += vy * dt;
            if (y <= hillY(x) + 0.01 && x > RAMP_END + 0.5) {
              phase = 'land'; landedAt = now; y = hillY(x); dist = Math.max(0, x - RAMP_END); telemark = now - tapAt < 260 && now - tapAt >= 0;
              crashed = Math.abs(lean - leanTarget) > 0.5 || flightT < 0.6;
              sfx(crashed ? 'bad' : telemark ? 'coin' : 'hit'); if (crashed) dist *= 0.55;
              const gain = dist + (telemark && !crashed ? 3 : 0); total += gain; bestDist = Math.max(bestDist, gain); results.push(gain);
              say(crashed ? `💫てんとう…${gain.toFixed(1)}m` : telemark ? `🏅テレマーク!${gain.toFixed(1)}m` : `${gain.toFixed(1)}m!`, 2000); hud();
              setTimeout(() => { if (!running) return; jump++; if (jump >= JUMPS) { finish(); return; } phase = 'ready'; hud(); btn.textContent = 'スタート'; say('つぎのジャンプ!ボタンでスタート', 1500); }, 2000);
            }
          } else if (phase === 'land') { x += vx * dt * 0.98; vx *= 0.985; y = hillY(x); }
          camX += ((phase === 'ready' ? 0 : x) - camX) * Math.min(1, dt * 6);
        }
        function screen(px, py) { const cy = phase === 'ready' ? rampY(0) : (phase === 'fly' ? Math.max(y, hillY(x)) - 8 : y); return { sx: W * 0.32 + (px - camX) * SCALE, sy: H * 0.62 - (py - cy) * SCALE * 0.75 }; }
        function drawSkier(sx, sy, ang, pose) {
          ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
          ctx.strokeStyle = '#e63946'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          if (pose === 'fly') { ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(20, 2); ctx.moveTo(-6, 6); ctx.lineTo(18, -2); ctx.stroke(); ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(8 - lean * 8, -12 + lean * 6); ctx.stroke(); ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentSprite(), 10 - lean * 10, -18 + lean * 8); }
          else if (pose === 'crash') { ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(12, 4); ctx.stroke(); ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💫', 0, -6); }
          else { ctx.beginPath(); ctx.moveTo(-12, 6); ctx.lineTo(12, 6); ctx.stroke(); ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(pose === 'tele' ? 6 : 2, -8); ctx.stroke(); ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentSprite(), 4, -16); }
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5aa9ff'); sky.addColorStop(1, '#dbeeff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
          // とおくの やま
          ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.moveTo(0, H * 0.5); for (let i = 0; i <= 8; i++) { const px = i * W / 8; ctx.lineTo(px, H * 0.5 - 30 - 25 * Math.abs(Math.sin(i * 1.7 + camX * 0.002))); } ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
          // ゆきめん
          ctx.fillStyle = '#fbfdff'; ctx.beginPath(); let first = true; for (let sx = -10; sx <= W + 10; sx += 4) { const px = camX + (sx - W * 0.32) / SCALE; const gy = groundY(px); const p = screen(px, gy); if (first) { ctx.moveTo(p.sx, p.sy); first = false; } else ctx.lineTo(p.sx, p.sy); } ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(120,160,200,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
          // だいの はし(あかい 線) と きょりの めじるし
          const edge = screen(RAMP_END, 0); ctx.strokeStyle = '#e63946'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(edge.sx, edge.sy - 8); ctx.lineTo(edge.sx, edge.sy + 6); ctx.stroke();
          ctx.fillStyle = '#2b4a6b'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; for (let m = 20; m <= 140; m += 20) { const p = screen(RAMP_END + m, hillY(RAMP_END + m)); if (p.sx > -10 && p.sx < W + 10) { ctx.fillText(m + 'm', p.sx, p.sy - 3); ctx.fillRect(p.sx - 1, p.sy - 2, 2, 5); } }
          // きゅうぎょう(スキーヤー)
          const p = screen(x, y);
          if (phase === 'ready') drawSkier(screen(0, rampY(0)).sx, screen(0, rampY(0)).sy - 4, 0.35, 'stand');
          else if (phase === 'run') drawSkier(p.sx, p.sy - 4, 0.45, 'stand');
          else if (phase === 'fly') drawSkier(p.sx, p.sy, -0.2 + lean * 0.3, 'fly');
          else drawSkier(p.sx, p.sy - 4, 0.5, crashed ? 'crash' : telemark ? 'tele' : 'stand');
          // かぜ/まえかがみ メーター
          if (phase === 'fly') { const mx = W - 30, my = 30, mh = 90; ctx.fillStyle = 'rgba(0,0,0,.35)'; mgRoundRect(ctx, mx - 8, my, 16, mh, 6); ctx.fillStyle = '#ffd23f'; ctx.fillRect(mx - 6, my + (1 - lean) * mh - 3, 12, 6); ctx.fillStyle = '#fff'; ctx.beginPath(); const ty = my + (1 - leanTarget) * mh; ctx.moveTo(mx - 14, ty - 5); ctx.lineTo(mx - 14, ty + 5); ctx.lineTo(mx - 8, ty); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(mx + 14, ty - 5); ctx.lineTo(mx + 14, ty + 5); ctx.lineTo(mx + 8, ty); ctx.closePath(); ctx.fill(); ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#2b4a6b'; ctx.fillText('まえかがみ', mx, my + mh + 2); ctx.fillText(`${(x - RAMP_END).toFixed(0)}m`, W / 2, 8); }
          if (phase === 'run') { ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#2b4a6b'; ctx.fillText(`${Math.round(vx * 3.6)} km/h`, 8, 8); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 95, H - 34, 190, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 21); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.04, (now - last) / 1000); last = now;
          update(dt, now); if (!running) return; render(now);
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId); btn.disabled = true;
          const score = clamp(Math.round(10 + total * 0.26), 10, 100);
          say(`おわり!ごうけい${total.toFixed(1)}m(さいちょう${bestDist.toFixed(1)}m)`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const SKI_JUMP_VARIANTS = [mg('ski-jump', makeSkiJumpGame({ title: 'スキージャンプ!とびだしとまえかがみでとおくへ' }))];

  // --- エアホッケー: したがわの マレットを ゆびで うごかし、パックを あいての
  //     ゴールへ。さきに 5てん ---
  function makeAirHockeyGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const WIN = 5, DURATION_MS = mgDuration(90000);
        let running = true, rafId = null, last = null, me = 0, ai = 0, msg = '', msgUntil = 0, drag = null, serveAt = 0, rally = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="ahScore">じぶん0 - 0あいて</span><span id="ahTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="ahCanvas"></canvas></div>
          <div class="mg-hint" id="ahHint">したはんぶんでゆびをうごかすとマレットがついてくる。パックをはじいてうえのゴールへ!じぶんのゴールはまもろう。さきに5てん</div>`;
        const canvas = container.querySelector('#ahCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * 1.45));
        const PR = 9, MR = 17, GOAL_W = W * 0.36;
        const puck = { x: W / 2, y: H / 2, vx: 0, vy: 0 }, mine = { x: W / 2, y: H * 0.82, vx: 0, vy: 0, px: W / 2, py: H * 0.82 }, opp = { x: W / 2, y: H * 0.18, vx: 0, vy: 0 };
        const scoreEl = container.querySelector('#ahScore'), timerEl = container.querySelector('#ahTimer'), hint = container.querySelector('#ahHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `じぶん${me} - ${ai}あいて`; };
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, dx: mine.x - p.x, dy: mine.y - p.y }; if (Math.hypot(p.x - mine.x, p.y - mine.y) > 60) { drag.dx = 0; drag.dy = 0; } });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); mine.px = clamp(p.x + drag.dx, MR, W - MR); mine.py = clamp(p.y + drag.dy, H / 2 + MR, H - MR); });
        const endDrag = () => { drag = null; }; canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
        function serve(toMe) { puck.x = W / 2; puck.y = toMe ? H * 0.6 : H * 0.4; puck.vx = 0; puck.vy = 0; serveAt = performance.now() + 700; rally = 0; }
        serve(true);
        function collide(m, dt) {
          const dx = puck.x - m.x, dy = puck.y - m.y; const d = Math.hypot(dx, dy); if (d >= PR + MR || d === 0) return false;
          const nx = dx / d, ny = dy / d; puck.x = m.x + nx * (PR + MR + 0.5); puck.y = m.y + ny * (PR + MR + 0.5);
          const rvx = puck.vx - m.vx, rvy = puck.vy - m.vy; const vn = rvx * nx + rvy * ny; if (vn < 0) { puck.vx -= 1.9 * vn * nx; puck.vy -= 1.9 * vn * ny; }
          puck.vx += m.vx * 0.35; puck.vy += m.vy * 0.35; const sp = Math.hypot(puck.vx, puck.vy); const maxS = 760; if (sp > maxS) { puck.vx *= maxS / sp; puck.vy *= maxS / sp; }
          return true;
        }
        function update(dt, now) {
          // じぶんの マレット(ゆびに ついてくる)
          const nx = mine.x + (mine.px - mine.x) * Math.min(1, dt * 22), ny = mine.y + (mine.py - mine.y) * Math.min(1, dt * 22); mine.vx = (nx - mine.x) / dt; mine.vy = (ny - mine.y) / dt; mine.x = nx; mine.y = ny;
          // AI
          const aiSpeed = lerp(230, 380, difficulty); let tx = W / 2, ty = H * 0.18;
          if (puck.y < H / 2 + 40 && puck.vy <= 80) { tx = puck.x; ty = puck.y - (puck.y < opp.y ? -30 : 0); if (puck.y < opp.y) ty = puck.y + 10; else ty = Math.max(MR + 4, puck.y - 6); }
          else { tx = W / 2 + (puck.x - W / 2) * 0.4; ty = H * 0.16; }
          const ddx = tx - opp.x, ddy = clamp(ty, MR, H / 2 - MR) - opp.y; const dd = Math.hypot(ddx, ddy) || 1; const stepL = Math.min(dd, aiSpeed * dt); const ox = opp.x, oy = opp.y; opp.x += ddx / dd * stepL; opp.y += ddy / dd * stepL; opp.vx = (opp.x - ox) / dt; opp.vy = (opp.y - oy) / dt;
          if (now < serveAt) return;
          puck.x += puck.vx * dt; puck.y += puck.vy * dt; puck.vx *= Math.pow(0.35, dt); puck.vy *= Math.pow(0.35, dt);
          if (puck.x < PR) { puck.x = PR; puck.vx = Math.abs(puck.vx) * 0.92; } if (puck.x > W - PR) { puck.x = W - PR; puck.vx = -Math.abs(puck.vx) * 0.92; }
          const inGoal = Math.abs(puck.x - W / 2) < GOAL_W / 2;
          if (puck.y < PR) { if (inGoal) { me++; sfx('coin'); hud(); say(rally >= 3 ? '🔥ゴール!!' : '⚽ゴール!', 1000); if (me >= WIN) { finish(); return; } serve(false); return; } puck.y = PR; puck.vy = Math.abs(puck.vy) * 0.92; }
          if (puck.y > H - PR) { if (inGoal) { ai++; sfx('bad'); hud(); say('💦とられた…', 1000); if (ai >= WIN) { finish(); return; } serve(true); return; } puck.y = H - PR; puck.vy = -Math.abs(puck.vy) * 0.92; }
          if (collide(mine, dt)) { rally++; sfx('pop'); } if (collide(opp, dt)) { rally++; sfx('tick'); }
          if (Math.hypot(puck.vx, puck.vy) < 6 && Math.abs(puck.y - H / 2) < 40 && now - serveAt > 4000) { serve(Math.random() < 0.5); }
        }
        function mallet(m, color) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(m.x + 2, m.y + 3, MR, 0, Math.PI * 2); ctx.fill(); const g = ctx.createRadialGradient(m.x - 5, m.y - 6, 2, m.x, m.y, MR); g.addColorStop(0, '#fff'); g.addColorStop(0.25, color); g.addColorStop(1, mgShade(color, 0.55)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, MR, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(m.x, m.y, MR * 0.45, 0, Math.PI * 2); ctx.fill(); }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#e9eef5'; ctx.fillRect(0, 0, W, H);
          const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, H * 0.7); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(180,200,230,.6)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = '#2f6fb5'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2); ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, H / 2, 34, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = '#e63946'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(W / 2 - GOAL_W / 2, 3); ctx.lineTo(W / 2 + GOAL_W / 2, 3); ctx.stroke(); ctx.strokeStyle = '#2a9d8f'; ctx.beginPath(); ctx.moveTo(W / 2 - GOAL_W / 2, H - 3); ctx.lineTo(W / 2 + GOAL_W / 2, H - 3); ctx.stroke();
          mallet(opp, '#e63946'); mallet(mine, '#2a9d8f');
          ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(puck.x + 1.5, puck.y + 2.5, PR, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(puck.x, puck.y, PR, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(puck.x - 2, puck.y - 2, PR * 0.5, 0, Math.PI * 2); ctx.fill();
          if (now < serveAt) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 50, H / 2 - 13, 100, 26); ctx.fillStyle = '#fff'; ctx.fillText('よーい…', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 80, H / 2 - 40, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2 - 26); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.max(0.001, Math.min(0.033, (now - last) / 1000)); last = now;
          for (let i = 0; i < 2; i++) { update(dt / 2, now); if (!running) return; }
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = me > ai ? clamp(70 + (me - ai) * 7, 70, 100) : me === ai ? 50 : clamp(15 + me * 8, 15, 48);
          say(me > ai ? '🏆かち!' : me === ai ? 'ひきわけ' : 'まけ…つぎはかとう', 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const AIR_HOCKEY_VARIANTS = [mg('air-hockey', makeAirHockeyGame({ title: 'エアホッケー!パックをはじいてさきに5てん' }))];

  // --- サブマリン3D: くらい うみを せんすいかんで すすみ、💎を あつめる。
  //     いわと クラゲに あたると ダメージ、さんそは 🫧で ほきゅう ---
  function makeSubmarineGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(70000);
        let running = true, rafId = null, last = null, px = 0, py = 0, tx = 0, ty = 0, held = { left: false, right: false, up: false, down: false }, drag = null, gems = 0, hp = 3, o2 = 100, objs = [], spawnZ = 5, speed = lerp(2.0, 2.6, difficulty), msg = '', msgUntil = 0, shake = 0, flash = 0, depth = 20, sonar = 0, invuln = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="smTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="smScore">💎 0／❤️❤️❤️</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="smCanvas"></canvas></div>
          <div class="mg-hint" id="smHint">がめんをなぞって(か十字キー)せんすいかんをうごかす。💎をとり、いわ・クラゲはよける。さんそメーターがへったら🫧をとろう</div>
          <div class="mg-gunner-controls"><button class="mg-tap-btn mg-hold-btn" id="smLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="smUp" data-key="up">▲</button><button class="mg-tap-btn mg-hold-btn" id="smDown" data-key="down">▼</button><button class="mg-tap-btn mg-hold-btn" id="smRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#smCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 240);
        const timerEl = container.querySelector('#smTimer'), scoreEl = container.querySelector('#smScore'), hint = container.querySelector('#smHint');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `💎 ${gems}／${'❤️'.repeat(Math.max(0, hp))}`; };
        for (const k of ['Left', 'Right', 'Up', 'Down']) bindHeldButton(container.querySelector('#sm' + k), (v) => { held[k.toLowerCase()] = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, x: p.x, y: p.y, tx, ty }; });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); tx = clamp(drag.tx + (p.x - drag.x) / (W * 0.3), -1, 1); ty = clamp(drag.ty - (p.y - drag.y) / (H * 0.3), -1, 1); });
        const endDrag = () => { drag = null; }; canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
        const F = 1.0, proj = (x, y, z) => { const s = F / (z + 0.4); return { sx: W / 2 + x * W * 0.42 * s, sy: H * 0.5 - y * H * 0.36 * s, s }; };
        function spawn() {
          const r = Math.random(); const x = (Math.random() - 0.5) * 1.7, y = (Math.random() - 0.5) * 1.5;
          if (r < 0.38) objs.push({ kind: 'gem', x, y, z: spawnZ, r: 0.16, hit: false });
          else if (r < 0.66) objs.push({ kind: 'rock', x: Math.random() < 0.5 ? -0.9 + Math.random() * 0.5 : 0.4 + Math.random() * 0.5, y: -0.9 + Math.random() * 0.6, z: spawnZ, r: 0.42 + Math.random() * 0.2, hit: false });
          else if (r < 0.86) objs.push({ kind: 'jelly', x, y, z: spawnZ, r: 0.22, hit: false, ph: Math.random() * 6 });
          else objs.push({ kind: 'air', x, y: 0.6 + Math.random() * 0.3, z: spawnZ, r: 0.2, hit: false });
          spawnZ += lerp(1.3, 1.0, difficulty);
        }
        for (let i = 0; i < 5; i++) spawn();
        function update(dt, now) {
          const kx = (held.right ? 1 : 0) - (held.left ? 1 : 0), ky = (held.up ? 1 : 0) - (held.down ? 1 : 0);
          if (kx || ky) { tx = clamp(tx + kx * dt * 2, -1, 1); ty = clamp(ty + ky * dt * 2, -1, 1); }
          px += (tx - px) * Math.min(1, dt * 5); py += (ty - py) * Math.min(1, dt * 5);
          speed = Math.min(speed + dt * 0.04, lerp(2.8, 3.6, difficulty)); depth += dt * 1.5;
          o2 -= dt * lerp(4.5, 6.5, difficulty); if (o2 <= 0) { o2 = 0; finish('さんそがなくなった…'); return; }
          for (const o of objs) { o.z -= speed * dt; if (o.kind === 'jelly') o.x += Math.sin(now / 600 + o.ph) * dt * 0.25; }
          spawnZ -= speed * dt; while (spawnZ < 6) spawn();
          if (invuln > 0) invuln -= dt;
          for (const o of objs) {
            if (o.hit || o.z > 0.08 || o.z < -0.3) continue; const d = Math.hypot(o.x - px, o.y - py);
            if (o.kind === 'gem') { if (d < o.r + 0.2) { o.hit = true; gems++; flash = 0.3; sfx('coin'); say(['💎ゲット!', '💎キラキラ', '💎おたから!'][gems % 3], 600); hud(); } }
            else if (o.kind === 'air') { if (d < o.r + 0.22) { o.hit = true; o2 = Math.min(100, o2 + 40); sfx('good'); say('🫧さんそほきゅう!', 800); } }
            else if (d < o.r + 0.14 && invuln <= 0) { o.hit = true; hp--; invuln = 1.2; shake = 12; sfx('hit'); speed = Math.max(1.5, speed * 0.75); say(o.kind === 'rock' ? '💥いわにぶつかった!' : '⚡クラゲにさされた!', 900); hud(); if (hp <= 0) { finish('せんすいかんがこわれた…'); return; } }
          }
          objs = objs.filter((o) => o.z > -0.5);
          if (shake > 0) shake -= dt * 30; sonar = (sonar + dt * 0.8) % 1;
        }
        function drawSub(x, y, tilt) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(clamp(tilt, -0.35, 0.35));
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 22, 30, 5, 0, 0, Math.PI * 2); ctx.fill();
          const g = ctx.createLinearGradient(0, -14, 0, 14); g.addColorStop(0, '#ffd23f'); g.addColorStop(1, '#b8860b'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 34, 14, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#e0a800'; ctx.fillRect(-8, -24, 16, 12); ctx.fillRect(-2, -30, 4, 8);
          ctx.fillStyle = '#8fd3ff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(8, -1, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentSprite(), 8, -1);
          ctx.fillStyle = '#555'; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-44, -8); ctx.lineTo(-44, 8); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          ctx.save(); if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
          const k = clamp(depth / 120, 0, 1); const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, `rgb(${Math.round(lerp(30, 5, k))},${Math.round(lerp(120, 30, k))},${Math.round(lerp(190, 80, k))})`); bg.addColorStop(1, `rgb(${Math.round(lerp(5, 2, k))},${Math.round(lerp(40, 10, k))},${Math.round(lerp(90, 40, k))})`); ctx.fillStyle = bg; ctx.fillRect(-12, -12, W + 24, H + 24);
          // ひかりの すじ
          ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 5; i++) { const lx = ((i * 61 + now / 40) % (W + 60)) - 30; ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + 22, 0); ctx.lineTo(lx + 50, H); ctx.lineTo(lx + 10, H); ctx.fill(); }
          // かいてい
          for (let i = 0; i < 5; i++) { const z = ((i * 1.2 + (now / 1000 * speed) % 1.2)); const p = proj(0, -1.05, z); ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - z / 6)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, p.sy); ctx.lineTo(W, p.sy); ctx.stroke(); }
          const sorted = objs.slice().sort((a, b) => b.z - a.z);
          for (const o of sorted) {
            if (o.z < -0.2 || o.hit) continue; const p = proj(o.x, o.y, o.z); const R = o.r * W * 0.42 * p.s; const a = clamp(1 - o.z / 6, 0.1, 1);
            if (o.kind === 'rock') { ctx.fillStyle = `rgba(${Math.round(70 * a + 10)},${Math.round(75 * a + 10)},${Math.round(90 * a + 20)},${a})`; ctx.beginPath(); ctx.moveTo(p.sx - R, p.sy + R * 0.6); ctx.lineTo(p.sx - R * 0.6, p.sy - R * 0.5); ctx.lineTo(p.sx - R * 0.1, p.sy - R * 0.9); ctx.lineTo(p.sx + R * 0.5, p.sy - R * 0.4); ctx.lineTo(p.sx + R, p.sy + R * 0.5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = `rgba(150,160,180,${a * 0.5})`; ctx.stroke(); }
            else if (o.kind === 'jelly') { ctx.globalAlpha = a; ctx.fillStyle = 'rgba(255,120,200,.75)'; ctx.beginPath(); ctx.arc(p.sx, p.sy, R, Math.PI, 0); ctx.fill(); ctx.strokeStyle = 'rgba(255,160,220,.8)'; ctx.lineWidth = Math.max(1, 2 * p.s); for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(p.sx + i * R * 0.35, p.sy); ctx.quadraticCurveTo(p.sx + i * R * 0.35 + Math.sin(now / 200 + i) * R * 0.3, p.sy + R * 0.8, p.sx + i * R * 0.4, p.sy + R * 1.5); ctx.stroke(); } ctx.globalAlpha = 1; }
            else { ctx.globalAlpha = a; ctx.font = `${Math.max(6, Math.round(R * 2.4))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.kind === 'gem' ? '💎' : '🫧', p.sx, p.sy + (o.kind === 'gem' ? Math.sin(now / 300) * 2 : 0)); ctx.globalAlpha = 1; }
          }
          const pp = proj(px, py, 0); if (invuln <= 0 || Math.floor(now / 90) % 2) drawSub(pp.sx, pp.sy, (tx - px) * 1.2);
          // ソナー & さんそ
          ctx.strokeStyle = `rgba(120,255,180,${0.5 * (1 - sonar)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pp.sx, pp.sy, 20 + sonar * 60, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(0,0,0,.4)'; mgRoundRect(ctx, 8, 8, 90, 10, 5); ctx.fillStyle = o2 < 30 ? (Math.floor(now / 200) % 2 ? '#ff5a5a' : '#ff9a9a') : '#7fe0ff'; mgRoundRect(ctx, 9, 9, 88 * (o2 / 100), 8, 4); ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('さんそ', 10, 20); ctx.textAlign = 'right'; ctx.fillText(`ふかさ${Math.round(depth)}m`, W - 8, 8);
          if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(-12, -12, W + 24, H + 24); flash = Math.max(0, flash - 0.03); }
          ctx.restore();
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('せんこうかいし!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H - 34, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 21); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now); if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(reason) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(12 + gems * 6 + (reason ? 0 : 10) + hp * 3), 12, 100);
          say(reason ? `${reason} 💎 ${gems}` : `🌊たんさくおわり!💎 ${gems}こ`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const SUBMARINE_VARIANTS = [mg('submarine-3d', makeSubmarineGame({ title: 'サブマリン3D!ふかいうみでおたからをさがせ' }))];

  // ================================================================
  // 新作バッチ3(2026-09-09): マッチ3 / 五目ならべ / タンクバトル / テニス
  // ================================================================

  // --- マッチ3: となりの フルーツを いれかえて 3つ そろえる。れんさで ボーナス ---
  function makeMatchThreeGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 7, MOVES = Math.round(lerp(22, 16, difficulty)), DURATION_MS = mgDuration(120000);
        const KINDS = ['🍓', '🍋', '🍇', '🍏', '🫐', '🍊'].slice(0, Math.round(lerp(5, 6, difficulty)));
        let grid = [], running = true, rafId = null, last = null, moves = MOVES, score = 0, sel = null, swipe = null, anim = null, busy = false, msg = '', msgUntil = 0, combo = 0, pops = [], fall = [], idleAt = 0, hintPair = null;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="m3Moves">のこり${MOVES}手</span><span id="m3Score">0pt</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="m3Canvas"></canvas></div>
          <div class="mg-hint" id="m3Hint">となりあうフルーツをスワイプ(か2かいタップ)でいれかえ。たて・よこに3ついじょうそろうときえる。4つ・5つやれんさでおおきくかせごう</div>`;
        const canvas = container.querySelector('#m3Canvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N;
        const movesEl = container.querySelector('#m3Moves'), scoreEl = container.querySelector('#m3Score'), hint = container.querySelector('#m3Hint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { movesEl.textContent = `のこり${moves}手`; scoreEl.textContent = `${score}pt`; };
        const rnd = () => Math.floor(Math.random() * KINDS.length);
        function findMatches(g) {
          const m = new Set();
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const v = g[r][c]; if (v < 0) continue; if (c + 2 < N && g[r][c + 1] === v && g[r][c + 2] === v) { let k = c; while (k < N && g[r][k] === v) { m.add(r + ',' + k); k++; } } if (r + 2 < N && g[r + 1][c] === v && g[r + 2][c] === v) { let k = r; while (k < N && g[k][c] === v) { m.add(k + ',' + c); k++; } } }
          return m;
        }
        function anyMove(g) { for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) { const r2 = r + dr, c2 = c + dc; if (r2 >= N || c2 >= N) continue; const t = g[r][c]; g[r][c] = g[r2][c2]; g[r2][c2] = t; const ok = findMatches(g).size > 0; g[r2][c2] = g[r][c]; g[r][c] = t; if (ok) return [[r, c], [r2, c2]]; } return null; }
        function fillNoMatch() { do { grid = Array.from({ length: N }, () => Array.from({ length: N }, rnd)); while (findMatches(grid).size) { for (const k of findMatches(grid)) { const [r, c] = k.split(',').map(Number); grid[r][c] = rnd(); } } } while (!anyMove(grid)); }
        fillNoMatch();
        const cellAt = (e) => { const p = mgPointerPos(canvas, e); const c = Math.floor(p.x / CELL), r = Math.floor(p.y / CELL); return r >= 0 && c >= 0 && r < N && c < N ? [r, c] : null; };
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || busy) return; const cell = cellAt(e); if (!cell) return; swipe = { x: e.clientX, y: e.clientY, cell, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} idleAt = performance.now(); hintPair = null; });
        canvas.addEventListener('pointermove', (e) => { if (!swipe || e.pointerId !== swipe.id || busy) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; if (Math.hypot(dx, dy) < CELL * 0.45) return; const [r, c] = swipe.cell; const t = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c]; swipe = null; sel = null; trySwap([r, c], t); });
        canvas.addEventListener('pointerup', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const cell = swipe.cell; swipe = null; if (busy) return; if (sel && Math.abs(sel[0] - cell[0]) + Math.abs(sel[1] - cell[1]) === 1) { trySwap(sel, cell); sel = null; } else if (sel && sel[0] === cell[0] && sel[1] === cell[1]) sel = null; else sel = cell; });
        canvas.addEventListener('pointercancel', () => { swipe = null; });
        function trySwap(a, b) {
          if (b[0] < 0 || b[1] < 0 || b[0] >= N || b[1] >= N || busy) return; busy = true;
          const t = grid[a[0]][a[1]]; grid[a[0]][a[1]] = grid[b[0]][b[1]]; grid[b[0]][b[1]] = t;
          const ok = findMatches(grid).size > 0;
          anim = { a, b, born: performance.now() };
          setTimeout(() => { if (!running) return; if (!ok) { const t2 = grid[a[0]][a[1]]; grid[a[0]][a[1]] = grid[b[0]][b[1]]; grid[b[0]][b[1]] = t2; anim = { a, b, born: performance.now() }; setTimeout(() => { anim = null; busy = false; say('そろわない…', 600); }, 160); return; } anim = null; moves--; combo = 0; hud(); resolve(); }, 170);
        }
        function resolve() {
          const m = findMatches(grid);
          if (!m.size) { busy = false; if (moves <= 0) { finish(); return; } if (!anyMove(grid)) { say('うごかせるところがないのでまぜます', 1400); setTimeout(() => { if (running) fillNoMatch(); }, 800); } idleAt = performance.now(); return; }
          sfx('pop'); combo++; const gained = m.size * 10 * combo + (m.size >= 5 ? 40 : m.size === 4 ? 15 : 0); score += gained; hud();
          say(combo > 1 ? `🔥 ${combo}れんさ!+${gained}` : m.size >= 4 ? `✨ ${m.size}こ!+${gained}` : `+${gained}`, 800);
          const now = performance.now(); for (const k of m) { const [r, c] = k.split(',').map(Number); pops.push({ r, c, v: grid[r][c], born: now }); grid[r][c] = -1; }
          setTimeout(() => { if (!running) return; // おとす
            fall = []; for (let c = 0; c < N; c++) { let w = N - 1; for (let r = N - 1; r >= 0; r--) { if (grid[r][c] >= 0) { if (w !== r) { fall.push({ from: r, to: w, c, v: grid[r][c] }); grid[w][c] = grid[r][c]; grid[r][c] = -1; } w--; } } for (let r = w; r >= 0; r--) { grid[r][c] = rnd(); fall.push({ from: r - (w + 1), to: r, c, v: grid[r][c] }); } }
            for (const f of fall) f.born = performance.now();
            setTimeout(() => { if (!running) return; fall = []; resolve(); }, 200);
          }, 200);
        }
        function drawTile(x, y, v, s = 1, alpha = 1) { if (v < 0) return; ctx.globalAlpha = alpha; ctx.fillStyle = 'rgba(255,255,255,.18)'; mgRoundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 7); ctx.font = `${Math.round(CELL * 0.68 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(KINDS[v], x + CELL / 2, y + CELL / 2 + 1); ctx.globalAlpha = 1; }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#7b3fa0'); bg.addColorStop(1, '#3a2a6b'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          if (!hintPair && !busy && now - idleAt > 5000 && running) hintPair = anyMove(grid);
          const skip = new Set(); if (anim) { skip.add(anim.a.join(',')); skip.add(anim.b.join(',')); } for (const f of fall) skip.add(f.to + ',' + f.c);
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { if (skip.has(r + ',' + c)) continue; const x = c * CELL, y = r * CELL; if (sel && sel[0] === r && sel[1] === c) { ctx.fillStyle = 'rgba(255,220,80,.45)'; mgRoundRect(ctx, x + 1, y + 1, CELL - 2, CELL - 2, 8); } if (hintPair && hintPair.some(([hr, hc]) => hr === r && hc === c)) { ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(now / 150)})`; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4); } drawTile(x, y, grid[r][c]); }
          if (anim) { const e = clamp((now - anim.born) / 160, 0, 1); const [ar, ac] = anim.a, [br, bc] = anim.b; const va = grid[ar][ac], vb = grid[br][bc]; drawTile(lerp(bc * CELL, ac * CELL, e), lerp(br * CELL, ar * CELL, e), va); drawTile(lerp(ac * CELL, bc * CELL, e), lerp(ar * CELL, br * CELL, e), vb); }
          for (const f of fall) { const t = clamp((now - f.born) / 190, 0, 1); const y = lerp(f.from * CELL, f.to * CELL, t * t); drawTile(f.c * CELL, y, f.v); }
          pops = pops.filter((p) => now - p.born < 260); for (const p of pops) { const t = (now - p.born) / 260; drawTile(p.c * CELL, p.r * CELL, p.v, 1 + t * 0.6, 1 - t); }
          if (now < msgUntil) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 15, 160, 30); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function frame(now) { if (!running) return; render(now); if (now - startTime > DURATION_MS) { finish(); return; } rafId = requestAnimationFrame(frame); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const final = clamp(Math.round(10 + score / 30), 10, 100);
          say(`おわり!${score}pt`, 2600); render(performance.now());
          setTimeout(() => onComplete(final), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const MATCH_THREE_VARIANTS = [mg('match-3', makeMatchThreeGame({ title: 'フルーツマッチ3!いれかえてそろえてけす' }))];

  // --- 五目ならべ(9×9): タップで いしを おく。5つ ならべたら かち。AIは パターン評価 ---
  function makeGomokuGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 9, ME = 1, AI = 2, TIME_LIMIT_MS = mgDuration(180000);
        let board = Array.from({ length: N }, () => Array(N).fill(0)), turn = ME, running = true, rafId = null, moves = 0, lastMove = null, winLine = null, aiAt = 0, msg = '', msgUntil = 0, pending = null;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="gmTurn">あなたのばん(●)</span><span id="gmMoves">0手</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="gmCanvas"></canvas></div>
          <div class="mg-hint" id="gmHint">マスをタップするとかりおき、もういちどおなじところをタップでけってい。たて・よこ・ななめに5つならべたらかち。あいての3・4はふさごう</div>`;
        const canvas = container.querySelector('#gmCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N;
        const turnEl = container.querySelector('#gmTurn'), movesEl = container.querySelector('#gmMoves'), hint = container.querySelector('#gmHint');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { turnEl.textContent = turn === ME ? 'あなたのばん(●)' : 'あいてのばん(○)…'; movesEl.textContent = `${moves}手`; };
        const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
        function lineAt(x, y, who) { for (const [dx, dy] of DIRS) { const cells = [[x, y]]; for (const s of [1, -1]) { let k = 1; while (true) { const nx = x + dx * k * s, ny = y + dy * k * s; if (nx < 0 || ny < 0 || nx >= N || ny >= N || board[ny][nx] !== who) break; cells.push([nx, ny]); k++; } } if (cells.length >= 5) return cells; } return null; }
        // あるマスに who が おいた ときの パターン点
        function scoreCell(x, y, who) {
          let total = 0;
          for (const [dx, dy] of DIRS) {
            let count = 1, open = 0;
            for (const s of [1, -1]) { let k = 1; while (true) { const nx = x + dx * k * s, ny = y + dy * k * s; if (nx < 0 || ny < 0 || nx >= N || ny >= N) break; if (board[ny][nx] === who) { count++; k++; continue; } if (board[ny][nx] === 0) open++; break; } }
            if (count >= 5) total += 100000; else if (count === 4) total += open === 2 ? 10000 : open === 1 ? 1200 : 0; else if (count === 3) total += open === 2 ? 900 : open === 1 ? 90 : 0; else if (count === 2) total += open === 2 ? 40 : open === 1 ? 8 : 0; else total += open;
          }
          return total;
        }
        function aiMove() {
          let best = null, bestV = -Infinity; const aggro = lerp(0.8, 1.1, difficulty);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (board[y][x]) continue; let near = false; for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N && board[ny][nx]) { near = true; break; } } if (!near && moves > 0) continue;
            const v = scoreCell(x, y, AI) * aggro + scoreCell(x, y, ME) * 1.0 + (Math.random() * lerp(60, 5, difficulty)) - (Math.abs(x - 4) + Math.abs(y - 4)) * 2; if (v > bestV) { bestV = v; best = [x, y]; } }
          if (!best) best = [4, 4];
          place(AI, best[0], best[1]);
        }
        function place(who, x, y) {
          board[y][x] = who; moves++; lastMove = [x, y]; sfx('pop'); const line = lineAt(x, y, who); if (line) { winLine = line; end(who); return; }
          if (moves >= N * N) { end(0); return; }
          turn = 3 - who; hud(); if (turn === AI) aiAt = performance.now() + 450;
        }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || turn !== ME) return; const p = mgPointerPos(canvas, e); const x = Math.floor(p.x / CELL), y = Math.floor(p.y / CELL); if (x < 0 || y < 0 || x >= N || y >= N || board[y][x]) { pending = null; return; } if (pending && pending[0] === x && pending[1] === y) { pending = null; place(ME, x, y); } else pending = [x, y]; });
        function stone(x, y, who, alpha = 1) { const cx = (x + 0.5) * CELL, cy = (y + 0.5) * CELL, r = CELL * 0.4; ctx.globalAlpha = alpha; ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(cx + 1.5, cy + 2, r, 0, Math.PI * 2); ctx.fill(); const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 1, cx, cy, r); if (who === ME) { g.addColorStop(0, '#777'); g.addColorStop(1, '#0a0a0a'); } else { g.addColorStop(0, '#fff'); g.addColorStop(1, '#cfcfcf'); } ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#dcb35c'; ctx.fillRect(0, 0, W, H); const wood = ctx.createLinearGradient(0, 0, W, 0); wood.addColorStop(0, 'rgba(255,255,255,.12)'); wood.addColorStop(0.5, 'rgba(0,0,0,0)'); wood.addColorStop(1, 'rgba(0,0,0,.1)'); ctx.fillStyle = wood; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = '#5b3a1e'; ctx.lineWidth = 1; for (let i = 0; i < N; i++) { const p = (i + 0.5) * CELL; ctx.beginPath(); ctx.moveTo(CELL / 2, p); ctx.lineTo(W - CELL / 2, p); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p, CELL / 2); ctx.lineTo(p, H - CELL / 2); ctx.stroke(); }
          ctx.fillStyle = '#5b3a1e'; for (const [sx, sy] of [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]]) { ctx.beginPath(); ctx.arc((sx + 0.5) * CELL, (sy + 0.5) * CELL, 3, 0, Math.PI * 2); ctx.fill(); }
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x]) stone(x, y, board[y][x]);
          if (lastMove) { ctx.strokeStyle = '#e63946'; ctx.lineWidth = 2; ctx.strokeRect((lastMove[0] + 0.5) * CELL - 4, (lastMove[1] + 0.5) * CELL - 4, 8, 8); }
          if (pending && turn === ME && running) { stone(pending[0], pending[1], ME, 0.45 + 0.15 * Math.sin(now / 150)); ctx.fillStyle = '#5b3a1e'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('もう1かいタップでけってい', W / 2, H - 8); }
          if (winLine) { ctx.strokeStyle = `rgba(230,57,70,${0.6 + 0.4 * Math.sin(now / 150)})`; ctx.lineWidth = 4; ctx.beginPath(); const a = winLine[0], b = winLine[winLine.length - 1]; ctx.moveTo((a[0] + 0.5) * CELL, (a[1] + 0.5) * CELL); ctx.lineTo((b[0] + 0.5) * CELL, (b[1] + 0.5) * CELL); ctx.stroke(); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, H / 2 - 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; if (turn === AI && aiAt && now >= aiAt) { aiAt = 0; aiMove(); if (!running) return; } render(now); if (now - startTime > TIME_LIMIT_MS) { end(0); return; } rafId = requestAnimationFrame(loop); }
        function end(w) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = w === ME ? clamp(100 - Math.max(0, moves - 16) * 2, 72, 100) : w === AI ? clamp(15 + moves, 15, 45) : 55;
          say(w === ME ? '🏆 5つならんだ!かち!' : w === AI ? 'まけ…あいてが5つならべた' : 'ひきわけ', 2600);
          turnEl.textContent = 'しゅうりょう'; render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const GOMOKU_VARIANTS = [mg('gomoku-9', makeGomokuGame({ title: '五目ならべ!5つならべてあいてにかとう' }))];

  // --- タンクバトル(トップダウン): 十字キーで うごき、まんなかの ボタンで はっしゃ。
  //     レンガは くだける、てつは こわれない。てきタンクを ぜんぶ たおせ ---
  function makeTankBattleGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 11, DURATION_MS = mgDuration(90000), TOTAL_ENEMIES = Math.round(lerp(6, 9, difficulty));
        let running = true, rafId = null, last = null, held = { up: false, down: false, left: false, right: false }, map = [], player, enemies = [], bullets = [], spawned = 0, killed = 0, lives = 3, msg = '', msgUntil = 0, fireCd = 0, spawnCd = 1.5, parts = [], invuln = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="tkTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="tkScore">❤️❤️❤️／💥 0/${TOTAL_ENEMIES}</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="tkCanvas"></canvas></div>
          <div class="mg-hint" id="tkHint">十字キー(ながおし)でうごき、まんなかの🔥ではっしゃ。むいているむきにたまがとぶ。レンガのかべはこわしてみちをつくれる</div>
          <div class="mg-tilt-dpad"><span></span><button class="mg-tap-btn mg-hold-btn" id="tkUp" data-key="up">▲</button><span></span><button class="mg-tap-btn mg-hold-btn" id="tkLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn primary" id="tkFire" data-key="action">🔥</button><button class="mg-tap-btn mg-hold-btn" id="tkRight" data-key="right">▶</button><span></span><button class="mg-tap-btn mg-hold-btn" id="tkDown" data-key="down">▼</button><span></span></div>`;
        const canvas = container.querySelector('#tkCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N;
        const timerEl = container.querySelector('#tkTimer'), scoreEl = container.querySelector('#tkScore'), hint = container.querySelector('#tkHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `${'❤️'.repeat(Math.max(0, lives))}／💥 ${killed}/${TOTAL_ENEMIES}`; };
        // マップ: 0 ゆか, 1 レンガ, 2 てつ
        for (let y = 0; y < N; y++) { map.push([]); for (let x = 0; x < N; x++) { let v = 0; if ((x % 3 === 1) && y >= 2 && y <= N - 3 && y % 4 !== 0) v = 1; if ((x === 3 || x === 7) && (y === 3 || y === 7)) v = 2; if (y === 0 || y === N - 1) v = 0; map[y].push(v); } }
        for (let x = 3; x <= 7; x++) map[N - 2][x] = 0; map[N - 3][5] = 0; map[1][5] = 0;
        player = { x: 5.5, y: N - 1.5, dir: 0, alive: true };
        const DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        let fireHeld = false;
        for (const k of ['Up', 'Down', 'Left', 'Right']) bindHeldButton(container.querySelector('#tk' + k), (v) => { held[k.toLowerCase()] = v; });
        bindHeldButton(container.querySelector('#tkFire'), (v) => { fireHeld = v; if (v) fire(player, true); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); fire(player, true); });
        const solid = (x, y) => { const cx = Math.floor(x), cy = Math.floor(y); if (cx < 0 || cy < 0 || cx >= N || cy >= N) return true; return map[cy][cx] > 0; };
        function canStand(x, y, r = 0.38) { return !solid(x - r, y - r) && !solid(x + r, y - r) && !solid(x - r, y + r) && !solid(x + r, y + r); }
        function tryMove(t, dx, dy, dt, spd) { const nx = t.x + dx * spd * dt, ny = t.y + dy * spd * dt; if (canStand(nx, ny) && !enemies.some((e) => e !== t && e.alive && Math.hypot(e.x - nx, e.y - ny) < 0.8) && !(t !== player && player.alive && Math.hypot(player.x - nx, player.y - ny) < 0.8)) { t.x = nx; t.y = ny; return true; } // マスに そろえて すりぬけ やすく
          const ax = Math.floor(t.x) + 0.5, ay = Math.floor(t.y) + 0.5; if (dx) { t.y += (ay - t.y) * Math.min(1, dt * 8); } else { t.x += (ax - t.x) * Math.min(1, dt * 8); } return false; }
        function fire(t, isPlayer) { if (!running || !t.alive) return; if (isPlayer && (fireCd > 0 || performance.now() < startTime)) return; if (isPlayer) fireCd = 0.45; const [dx, dy] = DIRV[t.dir]; bullets.push({ x: t.x + dx * 0.5, y: t.y + dy * 0.5, vx: dx * (isPlayer ? 7 : 5), vy: dy * (isPlayer ? 7 : 5), mine: isPlayer }); }
        function burst(x, y, color, n = 10) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, color }); } }
        function spawnEnemy() { const spots = [[0.5, 0.5], [5.5, 0.5], [N - 0.5, 0.5]].filter(([sx, sy]) => !enemies.some((e) => e.alive && Math.hypot(e.x - sx, e.y - sy) < 1.5)); if (!spots.length) return; const [sx, sy] = spots[Math.floor(Math.random() * spots.length)]; enemies.push({ x: sx, y: sy, dir: 2, alive: true, think: 0, fireCd: 1 + Math.random(), hp: spawned % 3 === 2 ? 2 : 1 }); spawned++; }
        function update(dt, now) {
          if (fireCd > 0) fireCd -= dt; if (invuln > 0) invuln -= dt;
          if (fireHeld) fire(player, true);
          if (player.alive) { let dx = 0, dy = 0; if (held.up) { dy = -1; player.dir = 0; } else if (held.down) { dy = 1; player.dir = 2; } else if (held.left) { dx = -1; player.dir = 3; } else if (held.right) { dx = 1; player.dir = 1; } if (dx || dy) tryMove(player, dx, dy, dt, 2.6); }
          if (spawned < TOTAL_ENEMIES) { spawnCd -= dt; if (spawnCd <= 0 && enemies.filter((e) => e.alive).length < 4) { spawnEnemy(); spawnCd = lerp(2.6, 1.8, difficulty); } }
          for (const e of enemies) {
            if (!e.alive) continue; e.think -= dt; e.fireCd -= dt;
            if (e.think <= 0) { e.think = 0.6 + Math.random() * 1.2; const toP = Math.random() < lerp(0.35, 0.6, difficulty); if (toP && player.alive) { const ddx = player.x - e.x, ddy = player.y - e.y; e.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 1 : 3) : (ddy > 0 ? 2 : 0); } else e.dir = Math.floor(Math.random() * 4); }
            const [dx, dy] = DIRV[e.dir]; if (!tryMove(e, dx, dy, dt, lerp(1.6, 2.3, difficulty))) e.think = Math.min(e.think, 0.15);
            if (e.fireCd <= 0) { e.fireCd = lerp(1.8, 1.1, difficulty) + Math.random(); const aligned = player.alive && ((Math.abs(player.x - e.x) < 0.5 && ((e.dir === 2 && player.y > e.y) || (e.dir === 0 && player.y < e.y))) || (Math.abs(player.y - e.y) < 0.5 && ((e.dir === 1 && player.x > e.x) || (e.dir === 3 && player.x < e.x)))); if (aligned || Math.random() < 0.55) fire(e, false); }
          }
          for (const b of bullets) {
            b.x += b.vx * dt; b.y += b.vy * dt; const cx = Math.floor(b.x), cy = Math.floor(b.y);
            if (cx < 0 || cy < 0 || cx >= N || cy >= N) { b.dead = true; continue; }
            if (map[cy][cx] === 1) { map[cy][cx] = 0; b.dead = true; burst(b.x, b.y, '#c96b3a', 6); continue; } if (map[cy][cx] === 2) { b.dead = true; burst(b.x, b.y, '#bbb', 4); continue; }
            if (b.mine) { for (const e of enemies) { if (e.alive && Math.hypot(e.x - b.x, e.y - b.y) < 0.45) { b.dead = true; e.hp--; sfx('hit'); if (e.hp <= 0) { e.alive = false; killed++; burst(e.x, e.y, '#ffb347', 14); say(['💥たおした!', '💥めいちゅう!', '💥ドーン!'][killed % 3], 700); hud(); if (killed >= TOTAL_ENEMIES) { finish(true); return; } } else burst(e.x, e.y, '#fff', 4); break; } } }
            else if (player.alive && invuln <= 0 && Math.hypot(player.x - b.x, player.y - b.y) < 0.45) { b.dead = true; lives--; invuln = 1.5; burst(player.x, player.y, '#ff6b6b', 14); say('💫やられた!', 900); hud(); if (lives <= 0) { player.alive = false; finish(false); return; } }
          }
          for (let i = 0; i < bullets.length; i++) for (let j = i + 1; j < bullets.length; j++) { const a = bullets[i], b = bullets[j]; if (!a.dead && !b.dead && a.mine !== b.mine && Math.hypot(a.x - b.x, a.y - b.y) < 0.3) { a.dead = b.dead = true; burst(a.x, a.y, '#fff', 4); } }
          bullets = bullets.filter((b) => !b.dead);
          for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } parts = parts.filter((p) => p.life > 0);
        }
        function drawTank(t, color, blink) {
          if (blink) return; const cx = t.x * CELL, cy = t.y * CELL, s = CELL * 0.5; ctx.save(); ctx.translate(cx, cy); ctx.rotate(t.dir * Math.PI / 2);
          ctx.fillStyle = '#6b6b75'; ctx.fillRect(-s, -s * 0.85, s * 0.34, s * 1.7); ctx.fillRect(s * 0.66, -s * 0.85, s * 0.34, s * 1.7);
          ctx.fillStyle = color; mgRoundRect(ctx, -s * 0.72, -s * 0.72, s * 1.44, s * 1.44, 3); ctx.fillStyle = mgShade(color, 1.35); ctx.beginPath(); ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ddd'; ctx.fillRect(-2, -s * 1.3, 4, s * 1.3); ctx.restore();
          if (t === player) { ctx.font = `${Math.round(CELL * 0.45)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentSprite(), cx, cy + 1); }
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#4a4a3c'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = map[y][x]; if (!v) { ctx.fillStyle = (x + y) % 2 ? '#575a44' : '#4f523f'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); const h1 = Math.sin((x * 31 + y * 17) * 12.9898) * 43758.5453, k = h1 - Math.floor(h1); if (k > 0.55) { ctx.fillStyle = 'rgba(120,150,70,.35)'; ctx.fillRect(x * CELL + k * CELL * 0.6, y * CELL + (1 - k) * CELL * 0.6, 4, 2); } continue; } if (v === 1) { ctx.fillStyle = '#b5552b'; ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x * CELL + 1, y * CELL + CELL / 2 - 1, CELL - 2, 2); ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + 1, 2, CELL / 2); ctx.fillRect(x * CELL + CELL / 4, y * CELL + CELL / 2, 2, CELL / 2); } else { const g = ctx.createLinearGradient(x * CELL, y * CELL, (x + 1) * CELL, (y + 1) * CELL); g.addColorStop(0, '#d0d5dd'); g.addColorStop(1, '#7d8794'); ctx.fillStyle = g; ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2); } }
          for (const e of enemies) if (e.alive) drawTank(e, e.hp > 1 ? '#7b2cbf' : '#c1121f', false);
          if (player.alive) drawTank(player, '#2a9d8f', invuln > 0 && Math.floor(now / 90) % 2 === 0);
          for (const b of bullets) { ctx.fillStyle = b.mine ? '#ffd23f' : '#ff8fa3'; ctx.beginPath(); ctx.arc(b.x * CELL, b.y * CELL, 3, 0, Math.PI * 2); ctx.fill(); }
          for (const p of parts) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x * CELL - 2, p.y * CELL - 2, 4, 4); } ctx.globalAlpha = 1;
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('しゅつげき!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 80, 14, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 27); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now); if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(cleared) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = cleared ? clamp(78 + lives * 7, 78, 100) : clamp(Math.round(12 + killed * 9), 12, 70);
          say(cleared ? '🏆ぜんめつ!しょうり!' : lives <= 0 ? `やられた…💥 ${killed}` : `タイムアップ!💥 ${killed}`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const TANK_BATTLE_VARIANTS = [mg('tank-battle', makeTankBattleGame({ title: 'タンクバトル!かべをくだいててきをぜんめつ' }))];

  // --- テニス(よこ視点ラリー): ◀▶で うごき、ボールが ちかづいたら スイング。
  //     うつ たかさで ロブ/ドライブが かわる。4ポイント さきどり ---
  function makeTennisGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const WIN = 4, DURATION_MS = mgDuration(100000), G = 780;
        let running = true, rafId = null, last = null, me = 0, ai = 0, leftHeld = false, rightHeld = false, msg = '', msgUntil = 0, serveAt = 0, rally = 0, swing = 0, aiSwing = 0, bounces = 0, lastSide = 0, pointOver = false;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="tnScore">じぶん0 - 0あいて</span><span id="tnTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="tnCanvas"></canvas></div>
          <div class="mg-hint" id="tnHint">◀▶でうごいて、ボールがちかづいたらスイング!ひくいところでうつとはやいドライブ、たかいところでうつとロブ。あいてのコートにおとそう。4ポイントさきどり</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="tnLeft" data-key="left">◀</button><button class="mg-tap-btn primary" id="tnSwing" data-key="action">スイング!</button><button class="mg-tap-btn mg-hold-btn" id="tnRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#tnCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 210);
        const GROUND = H - 26, NET_X = W / 2, NET_H = 34;
        const pl = { x: W * 0.22, vx: 0 }, op = { x: W * 0.78 }; const ball = { x: 0, y: 0, vx: 0, vy: 0, live: false, trail: [] };
        const scoreEl = container.querySelector('#tnScore'), timerEl = container.querySelector('#tnTimer'), hint = container.querySelector('#tnHint');
        const say = (t, ms = 1100) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `じぶん${me} - ${ai}あいて`; };
        bindHeldButton(container.querySelector('#tnLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#tnRight'), (v) => { rightHeld = v; });
        container.querySelector('#tnSwing').addEventListener('pointerdown', (e) => { e.preventDefault(); doSwing(); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); doSwing(); });
        function serve(byMe) { ball.live = true; bounces = 0; rally = 0; pointOver = false; lastSide = byMe ? -1 : 1; if (byMe) { ball.x = pl.x + 14; ball.y = GROUND - 70; ball.vx = 250; ball.vy = -240; } else { ball.x = op.x - 14; ball.y = GROUND - 70; ball.vx = -250 * lerp(0.9, 1.15, difficulty); ball.vy = -240; } ball.trail = []; }
        function doSwing() { if (!running || swing > 0) return; swing = 0.28; const reach = 46; if (ball.live && Math.abs(ball.x - pl.x) < reach && ball.y > GROUND - 110 && ball.x < NET_X) hitBall(true); }
        function hitBall(byMe) {
          const h = clamp((GROUND - 5 - ball.y) / 100, 0, 1); // 0 ひくい .. 1 たかい
          // ねらった ばしょに おちる ように vx を きめる(ひくく うつと おく、たかいと ロブで まんなか)
          const lob = byMe ? h > 0.5 : Math.random() < 0.3;
          const vy = lob ? -430 : -(250 + Math.random() * 50);
          const target = byMe ? (lob ? lerp(NET_X + 40, W - 60, Math.random()) : lerp(NET_X + 30, W - 24, (1 - h) * lerp(0.6, 1, Math.random()))) : (lob ? lerp(24, NET_X - 40, Math.random()) : lerp(18, NET_X - 30, Math.random() * lerp(0.7, 1, difficulty)));
          const hgt = Math.max(0, GROUND - 5 - ball.y); const T = (-vy + Math.sqrt(vy * vy + 2 * G * hgt)) / G;
          ball.vx = (target - ball.x) / Math.max(0.3, T); ball.vy = vy; sfx('pop');
          if (byMe && ball.vx < 60) ball.vx = 60; if (!byMe && ball.vx > -60) ball.vx = -60;
          bounces = 0; rally++; lastSide = byMe ? -1 : 1; if (byMe) say(lob ? '🎾ロブ!' : rally > 3 ? `🎾 ${rally}ラリー!` : '🎾ナイスショット!', 500);
        }
        function point(toMe, why) { if (pointOver) return; pointOver = true; ball.live = false; if (toMe) me++; else ai++; hud(); say(`${toMe ? '⭐ポイント!' : '💦とられた'} ${why}`, 1300); if (me >= WIN || ai >= WIN) { finish(); return; } serveAt = performance.now() + 1500; }
        function update(dt, now) {
          const steer = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0); pl.x = clamp(pl.x + steer * dt * 220, 18, NET_X - 30);
          if (swing > 0) swing -= dt; if (aiSwing > 0) aiSwing -= dt;
          if (!ball.live) { if (serveAt && now >= serveAt) { serveAt = 0; serve(lastSide === 1); } return; }
          ball.vy += G * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; if (Math.random() < 0.6) { ball.trail.push([ball.x, ball.y]); if (ball.trail.length > 10) ball.trail.shift(); }
          // ネット
          if (Math.abs(ball.x - NET_X) < 4 && ball.y > GROUND - NET_H) { ball.vx *= -0.3; ball.x = NET_X + (ball.vx > 0 ? 5 : -5); say('ネット!', 600); }
          // ゆか
          if (ball.y >= GROUND - 5) { ball.y = GROUND - 5; ball.vy = -Math.abs(ball.vy) * 0.62; ball.vx *= 0.85; bounces++; const side = ball.x < NET_X ? -1 : 1; if (bounces === 1 && side === lastSide) { point(side === 1, 'じぶんのコートにおちた'); return; } if (bounces >= 2) { point(side === 1, 'ツーバウンド'); return; } }
          if (ball.x < -10) { point(bounces === 0, bounces === 0 ? 'あいてのアウト' : 'ぬかれた…'); return; }
          if (ball.x > W + 10) { point(bounces > 0, bounces > 0 ? 'ぬいた!' : 'アウト…'); return; }
          // AI
          const tx = ball.vx > 0 || ball.x > NET_X ? clamp(ball.x + ball.vx * 0.12, NET_X + 30, W - 18) : W * 0.78; op.x += clamp(tx - op.x, -1, 1) * Math.min(Math.abs(tx - op.x), lerp(150, 260, difficulty) * dt);
          if (ball.x > NET_X && Math.abs(ball.x - op.x) < 44 && ball.y > GROUND - 110 && ball.vx > -50 && aiSwing <= 0) { aiSwing = 0.5; if (Math.random() < lerp(0.8, 0.95, difficulty)) hitBall(false); }
        }
        function drawPlayer(x, isMe, sw) { ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(isMe ? currentSprite() : '🤖', x, GROUND + 2); ctx.save(); ctx.translate(x + (isMe ? 14 : -14), GROUND - 22); ctx.rotate((isMe ? 1 : -1) * (sw > 0 ? lerp(1.2, -1.0, sw / 0.28) : 0.9)); ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16); ctx.stroke(); ctx.fillStyle = 'rgba(230,57,70,.85)'; ctx.beginPath(); ctx.ellipse(0, -24, 7, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, '#7cc0ff'); sky.addColorStop(1, '#dff0ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#3b7d3a'; ctx.fillRect(0, GROUND - 60, W, 60); // かんきゃくせき
          for (let i = 0; i < 12; i++) { ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(['🧑', '👩', '👦', '👵'][i % 4], 10 + i * (W / 12), GROUND - 52 + (i % 2) * 6); }
          ctx.fillStyle = '#c96b3a'; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = '#fff'; ctx.fillRect(0, GROUND, W, 2); ctx.fillRect(18, GROUND, 2, 6); ctx.fillRect(W - 20, GROUND, 2, 6);
          ctx.fillStyle = '#eee'; ctx.fillRect(NET_X - 2, GROUND - NET_H, 4, NET_H); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; for (let yy = GROUND - NET_H; yy < GROUND; yy += 5) { ctx.beginPath(); ctx.moveTo(NET_X - 2, yy); ctx.lineTo(NET_X + 2, yy); ctx.stroke(); }
          drawPlayer(pl.x, true, swing); drawPlayer(op.x, false, aiSwing);
          if (ball.live) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(ball.x, GROUND - 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < ball.trail.length; i++) { ctx.fillStyle = `rgba(220,255,60,${i / ball.trail.length * 0.4})`; ctx.beginPath(); ctx.arc(ball.trail[i][0], ball.trail[i][1], 3, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#d7f542'; ctx.beginPath(); ctx.arc(ball.x, ball.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ball.x, ball.y, 3, 0.5, 2.6); ctx.stroke(); }
          if (!ball.live && serveAt) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 60, 12, 120, 22); ctx.fillStyle = '#fff'; ctx.fillText(lastSide === 1 ? 'あなたのサーブ' : 'あいてのサーブ', W / 2, 23); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, H / 2 - 30, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2 - 17); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.033, (now - last) / 1000); last = now;
          for (let i = 0; i < 2; i++) { update(dt / 2, now); if (!running) return; }
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = me > ai ? clamp(70 + (me - ai) * 8, 70, 100) : me === ai ? 50 : clamp(15 + me * 9, 15, 48);
          say(me > ai ? '🏆ゲームセット!かち!' : me === ai ? 'ひきわけ' : 'まけ…つぎはかとう', 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud(); serveAt = performance.now() + 1200; lastSide = 1;
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const TENNIS_VARIANTS = [mg('tennis-rally', makeTennisGame({ title: 'テニス!ラリーであいてをゆさぶれ' }))];

  // ================================================================
  // 新作バッチ3(2026-09-09): ピクロス / ダーツ / ハンググライダー3D
  // ================================================================

  const PICROSS_PUZZLES = [
    { name: 'ハート', emoji: '💗', rows: ['01010', '11111', '11111', '01110', '00100'] },
    { name: 'スマイル', emoji: '🙂', rows: ['01010', '01010', '00000', '10001', '01110'] },
    { name: 'おうち', emoji: '🏠', rows: ['00100', '01110', '11111', '01010', '01110'] },
    { name: 'き', emoji: '🌲', rows: ['00100', '01110', '11111', '00100', '00100'] },
    { name: 'ねこ', emoji: '🐱', rows: ['10001', '11111', '10101', '11111', '01110'] },
    { name: 'かさ', emoji: '☂️', rows: ['01110', '11111', '00100', '00100', '01100'] },
    { name: 'カップ', emoji: '☕', rows: ['11110', '11111', '11111', '11110', '01100'] },
    { name: 'ほし', emoji: '⭐', rows: ['00100', '11111', '01110', '01110', '10001'] },
    { name: 'ふね', emoji: '⛵', rows: ['00100', '01100', '01110', '11111', '01110'] },
    { name: 'かぎ', emoji: '🔑', rows: ['01100', '10010', '01100', '00100', '00110'] },
  ];
  // --- ピクロス(5×5): よこ・たての すうじを ヒントに マスを ぬる。3もん ---
  function makePicrossGame({ title }) {
    return {
      start(container, onComplete) {
        const N = 5, ROUNDS = 3, TIME_LIMIT_MS = mgDuration(180000);
        const pool = PICROSS_PUZZLES.slice().sort(() => Math.random() - 0.5).slice(0, ROUNDS);
        let running = true, rafId = null, round = 0, puzzle, cells, marks, solved = 0, mistakes = 0, markMode = false, msg = '', msgUntil = 0, solvedAt = 0, pressTimer = null, pressCell = null, longPressed = false, drawing = null;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="pcRound">1/${ROUNDS}もんめ</span><span id="pcMiss">ミス0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="pcCanvas"></canvas></div>
          <div class="mg-hint" id="pcHint">すうじはそのれつでつづけてぬるマスのかず(「2 1」なら2つぬってあいだをあけて1つ)。タップでぬる、✕モード(かながおし)でぬらないしるし</div>
          <div class="mg-race-controls"><button class="mg-tap-btn" id="pcMark" data-key="action">✕モード: OFF</button></div>`;
        const canvas = container.querySelector('#pcCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CLUE = W * 0.28, CELL = (W - CLUE) / N;
        const roundEl = container.querySelector('#pcRound'), missEl = container.querySelector('#pcMiss'), hint = container.querySelector('#pcHint'), markBtn = container.querySelector('#pcMark');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { roundEl.textContent = `${Math.min(ROUNDS, round + 1)}/${ROUNDS}もんめ`; missEl.textContent = `ミス${mistakes}`; markBtn.textContent = `✕モード: ${markMode ? 'ON' : 'OFF'}`; markBtn.classList.toggle('primary', markMode); };
        const clues = (line) => { const out = []; let run = 0; for (const ch of line) { if (ch === '1') run++; else if (run) { out.push(run); run = 0; } } if (run) out.push(run); return out.length ? out : [0]; };
        function load() { puzzle = pool[round]; cells = Array.from({ length: N }, () => Array(N).fill(0)); marks = Array.from({ length: N }, () => Array(N).fill(false)); solvedAt = 0; }
        load();
        const rowClues = () => puzzle.rows.map(clues), colClues = () => Array.from({ length: N }, (_, c) => clues(puzzle.rows.map((r) => r[c]).join('')));
        const isSolved = () => puzzle.rows.every((r, y) => [...r].every((ch, x) => (ch === '1') === (cells[y][x] === 1)));
        const lineDone = (y, x) => { if (y != null) return [...puzzle.rows[y]].every((ch, xx) => (ch === '1') === (cells[y][xx] === 1)); return puzzle.rows.every((r, yy) => (r[x] === '1') === (cells[yy][x] === 1)); };
        function fill(x, y) { if (solvedAt || cells[y][x] === 1) return; if (puzzle.rows[y][x] !== '1') { mistakes++; marks[y][x] = true; sfx('bad'); say('✕そこはぬらない', 700); hud(); return; } cells[y][x] = 1; marks[y][x] = false; sfx('tick'); if (isSolved()) { solvedAt = performance.now(); solved++; say(`${puzzle.emoji} ${puzzle.name}!せいかい`, 1600); setTimeout(() => { if (!running) return; round++; if (round >= ROUNDS) { finish(); return; } load(); hud(); }, 1700); } }
        function toggleMark(x, y) { if (solvedAt || cells[y][x] === 1) return; marks[y][x] = !marks[y][x]; }
        const cellAt = (e) => { const p = mgPointerPos(canvas, e); const x = Math.floor((p.x - CLUE) / CELL), y = Math.floor((p.y - CLUE) / CELL); return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null; };
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running) return; const c = cellAt(e); if (!c) return; pressCell = c; longPressed = false; drawing = { id: e.pointerId, cells: new Set([c.join(',')]) }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} clearTimeout(pressTimer); pressTimer = setTimeout(() => { longPressed = true; toggleMark(c[0], c[1]); }, 420); });
        canvas.addEventListener('pointermove', (e) => { if (!drawing || e.pointerId !== drawing.id || longPressed) return; const c = cellAt(e); if (!c) return; const k = c.join(','); if (drawing.cells.has(k)) return; if (drawing.cells.size === 1) { clearTimeout(pressTimer); const [fx, fy] = pressCell; if (markMode) toggleMark(fx, fy); else fill(fx, fy); } drawing.cells.add(k); if (markMode) toggleMark(c[0], c[1]); else fill(c[0], c[1]); });
        canvas.addEventListener('pointerup', (e) => { clearTimeout(pressTimer); const d = drawing; drawing = null; if (!running || !pressCell || longPressed || !d || d.cells.size > 1) { pressCell = null; return; } const [x, y] = pressCell; pressCell = null; if (markMode) toggleMark(x, y); else fill(x, y); });
        canvas.addEventListener('pointercancel', () => { clearTimeout(pressTimer); drawing = null; pressCell = null; });
        markBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running) return; markMode = !markMode; hud(); });
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#f7f3ea'; ctx.fillRect(0, 0, W, H);
          const rc = rowClues(), cc = colClues();
          ctx.fillStyle = '#e9e2d3'; ctx.fillRect(0, CLUE, CLUE, H - CLUE); ctx.fillRect(CLUE, 0, W - CLUE, CLUE);
          ctx.font = `bold ${Math.round(CELL * 0.34)}px sans-serif`; ctx.textBaseline = 'middle';
          for (let y = 0; y < N; y++) { ctx.textAlign = 'right'; ctx.fillStyle = lineDone(y, null) ? '#9aa' : '#333'; ctx.fillText(rc[y].join(' '), CLUE - 6, CLUE + (y + 0.5) * CELL); }
          for (let x = 0; x < N; x++) { ctx.textAlign = 'center'; ctx.fillStyle = lineDone(null, x) ? '#9aa' : '#333'; const arr = cc[x]; arr.forEach((n, i) => ctx.fillText(String(n), CLUE + (x + 0.5) * CELL, CLUE - 8 - (arr.length - 1 - i) * CELL * 0.36)); }
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const px = CLUE + x * CELL, py = CLUE + y * CELL; ctx.fillStyle = cells[y][x] ? '#2b2d42' : '#fff'; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); if (marks[y][x] && !cells[y][x]) { ctx.strokeStyle = '#c66'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + CELL * 0.3, py + CELL * 0.3); ctx.lineTo(px + CELL * 0.7, py + CELL * 0.7); ctx.moveTo(px + CELL * 0.7, py + CELL * 0.3); ctx.lineTo(px + CELL * 0.3, py + CELL * 0.7); ctx.stroke(); } }
          ctx.strokeStyle = '#8a8378'; ctx.lineWidth = 1; for (let i = 0; i <= N; i++) { ctx.beginPath(); ctx.moveTo(CLUE + i * CELL, CLUE); ctx.lineTo(CLUE + i * CELL, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(CLUE, CLUE + i * CELL); ctx.lineTo(W, CLUE + i * CELL); ctx.stroke(); }
          if (solvedAt) { const t = clamp((now - solvedAt) / 500, 0, 1); ctx.fillStyle = `rgba(255,255,255,${0.75 * t})`; ctx.fillRect(CLUE, CLUE, W - CLUE, H - CLUE); ctx.font = `${Math.round(60 * t)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(puzzle.emoji, CLUE + (W - CLUE) / 2, CLUE + (H - CLUE) / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, 6, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 19); }
        }
        function loop(now) { if (!running) return; render(now); if (now - startTime > TIME_LIMIT_MS) { finish(); return; } rafId = requestAnimationFrame(loop); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId); clearTimeout(pressTimer); markBtn.disabled = true;
          const score = clamp(Math.round(10 + solved * 28 - mistakes * 2 + (solved >= ROUNDS ? 6 : 0)), 10, 100);
          say(solved >= ROUNDS ? `🏆ぜんもんせいかい!ミス${mistakes}` : `おわり!${solved}もんせいかい`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const PICROSS_VARIANTS = [mg('picross-5', makePicrossGame({ title: 'ピクロス!すうじをよんでえをぬろう' }))];

  // --- ダーツ: おさえると ねらいが ゆれはじめる。ゆれが ちいさい うちに はなして
  //     なげる。9本の ごうけい。ブル(まんなか)50てん、トリプルは 3ばい ---
  function makeDartsGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DARTS = 9;
        let running = true, rafId = null, last = null, thrown = 0, total = 0, aim = null, holdT = 0, darts = [], flying = null, msg = '', msgUntil = 0, best = 0, wob = { x: 0, y: 0 }, drift = { x: 0, y: 0 };
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="dtLeft">のこり${DARTS}本</span><span id="dtScore">0てん</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="dtCanvas"></canvas></div>
          <div class="mg-hint" id="dtHint">がめんをおさえてねらいをうごかし、はなすとなげる。おさえているあいだてがゆれてくるので、はやめにはなすのがコツ。まんなかのブルは50てん!</div>`;
        const canvas = container.querySelector('#dtCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * 1.05));
        const CX = W / 2, CY = H * 0.47, R = Math.min(W, H) * 0.42;
        const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
        const leftEl = container.querySelector('#dtLeft'), scoreEl = container.querySelector('#dtScore'), hint = container.querySelector('#dtHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { leftEl.textContent = `のこり${DARTS - thrown}本`; scoreEl.textContent = `${total}てん`; };
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || flying || thrown >= DARTS) return; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); aim = { id: e.pointerId, x: p.x, y: p.y, ox: p.x, oy: p.y }; holdT = 0; drift = { x: 0, y: 0 }; });
        canvas.addEventListener('pointermove', (e) => { if (!aim || e.pointerId !== aim.id) return; const p = mgPointerPos(canvas, e); aim.x = p.x; aim.y = p.y; });
        canvas.addEventListener('pointerup', (e) => { if (!aim || e.pointerId !== aim.id) return; const tx = aim.x + wob.x + drift.x, ty = aim.y + wob.y + drift.y; aim = null; throwDart(tx, ty); });
        canvas.addEventListener('pointercancel', () => { aim = null; });
        function scoreAt(x, y) {
          const dx = x - CX, dy = y - CY; const d = Math.hypot(dx, dy) / R; if (d > 1) return { pts: 0, label: 'はずれ' };
          if (d < 0.07) return { pts: 50, label: '🎯ブル!50' }; if (d < 0.16) return { pts: 25, label: 'アウターブル25' };
          let ang = Math.atan2(dx, -dy); if (ang < 0) ang += Math.PI * 2; const idx = Math.round(ang / (Math.PI * 2 / 20)) % 20; const n = SECTORS[idx];
          if (d > 0.92) return { pts: n * 2, label: `ダブル${n}! ${n * 2}` }; if (d > 0.56 && d < 0.64) return { pts: n * 3, label: `トリプル${n}!! ${n * 3}` }; return { pts: n, label: `${n}てん` };
        }
        function throwDart(tx, ty) { const spread = lerp(3, 6, difficulty); const fx = tx + (Math.random() - 0.5) * spread, fy = ty + (Math.random() - 0.5) * spread; flying = { fx, fy, born: performance.now() }; sfx('whoosh'); setTimeout(() => { if (!running) return; const r = scoreAt(fx, fy); sfx(r.pts >= 50 ? 'coin' : r.pts > 0 ? 'hit' : 'bad'); darts.push({ x: fx, y: fy, pts: r.pts }); total += r.pts; best = Math.max(best, r.pts); thrown++; flying = null; say(r.label, 1100); hud(); if (thrown >= DARTS) setTimeout(finish, 1300); }, 320); }
        function update(dt, now) { if (aim) { holdT += dt; const amp = Math.min(26, holdT * holdT * lerp(9, 14, difficulty)); wob.x = Math.sin(now / 90) * amp * 0.6 + Math.sin(now / 37) * amp * 0.25; wob.y = Math.cos(now / 73) * amp * 0.6 + Math.sin(now / 51) * amp * 0.25; drift.x += (Math.random() - 0.5) * dt * 40 * holdT; drift.y += (Math.random() - 0.5) * dt * 40 * holdT; } else { wob.x *= 0.8; wob.y *= 0.8; } }
        function drawBoard() {
          ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.arc(CX, CY, R * 1.12, 0, Math.PI * 2); ctx.fill();
          for (let i = 0; i < 20; i++) { const a0 = (i - 0.5) * Math.PI * 2 / 20 - Math.PI / 2, a1 = a0 + Math.PI * 2 / 20; const dark = i % 2 === 0;
            const ring = (r0, r1, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(CX, CY, r1 * R, a0, a1); ctx.arc(CX, CY, r0 * R, a1, a0, true); ctx.closePath(); ctx.fill(); };
            ring(0.16, 0.56, dark ? '#1c1c1c' : '#f3e9d2'); ring(0.56, 0.64, dark ? '#c1121f' : '#2a9d8f'); ring(0.64, 0.92, dark ? '#1c1c1c' : '#f3e9d2'); ring(0.92, 1.0, dark ? '#c1121f' : '#2a9d8f');
            const am = (a0 + a1) / 2; ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(R * 0.11)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(SECTORS[i]), CX + Math.cos(am) * R * 1.06, CY + Math.sin(am) * R * 1.06); }
          ctx.fillStyle = '#2a9d8f'; ctx.beginPath(); ctx.arc(CX, CY, R * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c1121f'; ctx.beginPath(); ctx.arc(CX, CY, R * 0.07, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; for (const r of [0.16, 0.56, 0.64, 0.92, 1]) { ctx.beginPath(); ctx.arc(CX, CY, r * R, 0, Math.PI * 2); ctx.stroke(); }
        }
        function drawDart(x, y, scale = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(2, 3, 3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(9, -14); ctx.stroke(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(9, -14); ctx.lineTo(16, -22); ctx.lineTo(11, -12); ctx.lineTo(7, -20); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#5b3a1e'); bg.addColorStop(1, '#2d1b0e'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          drawBoard();
          for (const d of darts) drawDart(d.x, d.y);
          if (flying) { const t = clamp((now - flying.born) / 320, 0, 1); const sx = lerp(W / 2, flying.fx, t), sy = lerp(H + 20, flying.fy, t) - Math.sin(t * Math.PI) * 30; drawDart(sx, sy, lerp(2.2, 1, t)); }
          if (aim) { const ax = aim.x + wob.x + drift.x, ay = aim.y + wob.y + drift.y; const amp = Math.min(26, holdT * holdT * 12); ctx.strokeStyle = amp > 12 ? 'rgba(255,90,90,.9)' : 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ax, ay, 10 + amp * 0.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(ax - 16, ay); ctx.lineTo(ax - 6, ay); ctx.moveTo(ax + 6, ay); ctx.lineTo(ax + 16, ay); ctx.moveTo(ax, ay - 16); ctx.lineTo(ax, ay - 6); ctx.moveTo(ax, ay + 6); ctx.lineTo(ax, ay + 16); ctx.stroke();
            ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(W / 2 - 40, H - 14, 80, 6); ctx.fillStyle = amp > 12 ? '#ff6b6b' : '#7fe0a0'; ctx.fillRect(W / 2 - 40, H - 14, 80 * clamp(1 - amp / 26, 0, 1), 6); ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#fff'; ctx.fillText('おちつき', W / 2, H - 16); }
          if (now < msgUntil) { ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(W / 2 - 90, 6, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 20); }
        }
        function frame(now) { if (!running) return; if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt, now); render(now); rafId = requestAnimationFrame(frame); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = clamp(Math.round(10 + total / 3.2), 10, 100);
          say(`おわり!ごうけい${total}てん(さいこう${best})`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const DARTS_VARIANTS = [mg('darts-board', makeDartsGame({ title: 'ダーツ!ゆれるねらいをおさえてブルをねらえ' }))];

  // --- ハンググライダー3D: たかさを たもちながら とおくへ。🌀の うわむき気流で
  //     じょうしょう、🎈を あつめる。ひくく なると ちゃくりく ---
  function makeHangGliderGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(70000);
        let running = true, rafId = null, last = null, px = 0, alt = 0.7, tx = 0, pitch = 0, held = { left: false, right: false, up: false, down: false }, drag = null, dist = 0, balloons = 0, thermals = 0, objs = [], spawnZ = 4, speed = 2.4, msg = '', msgUntil = 0, bank = 0, landed = false, inThermal = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="hgTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="hgScore">📏 0m／🎈 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="hgCanvas"></canvas></div>
          <div class="mg-hint" id="hgHint">なぞって(か◀▶)ひだりみぎ、▲▼できしゅのあげさげ。さげるとはやくすすむがたかさがへる。🌀のじょうしょう気流でたかさをかせぎ、🎈をあつめよう。じめんにつくとちゃくりく</div>
          <div class="mg-gunner-controls"><button class="mg-tap-btn mg-hold-btn" id="hgLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="hgUp" data-key="up">▲</button><button class="mg-tap-btn mg-hold-btn" id="hgDown" data-key="down">▼</button><button class="mg-tap-btn mg-hold-btn" id="hgRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#hgCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 240);
        const timerEl = container.querySelector('#hgTimer'), scoreEl = container.querySelector('#hgScore'), hint = container.querySelector('#hgHint');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `📏 ${Math.round(dist)}m／🎈 ${balloons}`; };
        for (const k of ['Left', 'Right', 'Up', 'Down']) bindHeldButton(container.querySelector('#hg' + k), (v) => { held[k.toLowerCase()] = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, x: p.x, y: p.y, tx, pitch }; });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); tx = clamp(drag.tx + (p.x - drag.x) / (W * 0.3), -1, 1); pitch = clamp(drag.pitch + (p.y - drag.y) / (H * 0.35), -1, 1); });
        const endDrag = () => { drag = null; }; canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
        // カメラは グライダーの うしろ うえ。alt 0..1 で 地面との たかさ
        const HORIZON = H * 0.38;
        const proj = (x, y, z) => { const s = 1.0 / (z + 0.5); return { sx: W / 2 + x * W * 0.45 * s, sy: HORIZON + (0.9 - y) * H * 0.55 * s, s }; };
        function spawn() {
          const r = Math.random(); const x = (Math.random() - 0.5) * 2.2;
          if (r < 0.3) objs.push({ kind: 'thermal', x, z: spawnZ, r: 0.45, hit: false });
          else if (r < 0.55) objs.push({ kind: 'balloon', x, y: 0.3 + Math.random() * 0.6, z: spawnZ, r: 0.16, hit: false });
          else if (r < 0.8) objs.push({ kind: 'tree', x: x * 1.4, z: spawnZ, r: 0.2 });
          else objs.push({ kind: 'house', x: x * 1.4, z: spawnZ, r: 0.25 });
          spawnZ += lerp(0.9, 0.7, difficulty);
        }
        for (let i = 0; i < 8; i++) spawn();
        function update(dt, now) {
          const kx = (held.right ? 1 : 0) - (held.left ? 1 : 0), ky = (held.down ? 1 : 0) - (held.up ? 1 : 0);
          if (kx) tx = clamp(tx + kx * dt * 2, -1, 1); if (ky) pitch = clamp(pitch + ky * dt * 2, -1, 1); else if (!drag) pitch += (0 - pitch) * Math.min(1, dt * 1.5);
          const ox = px; px += (tx - px) * Math.min(1, dt * 4); bank += ((px - ox) / Math.max(dt, 0.001) * 0.35 - bank) * Math.min(1, dt * 5);
          // きしゅを さげる(pitch>0)と はやく、たかさは へる。あげると おそく、しっそく ぎみ
          speed += ((2.2 + pitch * 1.3) - speed) * Math.min(1, dt * 2);
          let sink = lerp(0.085, 0.11, difficulty) + pitch * 0.09 - (pitch < -0.5 ? -0.03 : 0);
          inThermal = Math.max(0, inThermal - dt);
          for (const o of objs) { o.z -= speed * dt; if (o.kind === 'thermal' && !o.hit && o.z < 0.3 && o.z > -0.5 && Math.abs(o.x - px) < o.r) { if (!o.counted) { o.counted = true; thermals++; sfx('whoosh'); say('🌀じょうしょう気流!', 800); } inThermal = 0.4; } }
          if (inThermal > 0) sink -= 0.34;
          alt = clamp(alt - sink * dt, 0, 1.05);
          dist += speed * dt * 12; spawnZ -= speed * dt; while (spawnZ < 6) spawn();
          for (const o of objs) { if (o.kind !== 'balloon' || o.hit || o.z > 0.12 || o.z < -0.3) continue; if (Math.abs(o.x - px) < o.r + 0.18 && Math.abs(o.y - alt) < 0.22) { o.hit = true; balloons++; sfx('coin'); say('🎈ゲット!', 600); } }
          objs = objs.filter((o) => o.z > -0.8);
          hud();
          if (alt <= 0) { landed = true; finish(); }
        }
        function drawGlider(x, y, b) {
          ctx.save(); ctx.translate(x, y); ctx.rotate(clamp(b, -0.5, 0.5));
          ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 30, 34, 5, 0, 0, Math.PI * 2); ctx.fill();
          const g = ctx.createLinearGradient(-50, 0, 50, 0); g.addColorStop(0, '#e63946'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#3a86ff'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(-52, 10); ctx.lineTo(-40, 16); ctx.lineTo(0, 4); ctx.lineTo(40, 16); ctx.lineTo(52, 10); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.moveTo(-14, 6); ctx.lineTo(0, 22); ctx.moveTo(14, 6); ctx.lineTo(0, 22); ctx.stroke();
          ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentSprite(), 0, 26);
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, HORIZON); sky.addColorStop(0, '#4a9de0'); sky.addColorStop(1, '#cfe9ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HORIZON);
          const gnd = ctx.createLinearGradient(0, HORIZON, 0, H); gnd.addColorStop(0, '#9fcf7a'); gnd.addColorStop(1, '#4f8f3f'); ctx.fillStyle = gnd; ctx.fillRect(0, HORIZON, W, H - HORIZON);
          // とおくの やま と くも
          ctx.fillStyle = 'rgba(90,120,160,.5)'; ctx.beginPath(); ctx.moveTo(0, HORIZON); for (let i = 0; i <= 10; i++) ctx.lineTo(i * W / 10, HORIZON - 14 - 18 * Math.abs(Math.sin(i * 1.3 + dist * 0.0004))); ctx.lineTo(W, HORIZON); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 3; i++) { const cx = ((i * 97 + dist * 0.5) % (W + 80)) - 40; ctx.beginPath(); ctx.arc(cx, 22 + i * 14, 10, 0, Math.PI * 2); ctx.arc(cx + 12, 18 + i * 14, 13, 0, Math.PI * 2); ctx.arc(cx + 26, 24 + i * 14, 9, 0, Math.PI * 2); ctx.fill(); }
          // 地面の グリッド(スピードかん)
          ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; for (let i = 0; i < 8; i++) { const z = (i * 0.8 + (dist / 12) % 0.8); const p = proj(0, 0, z); ctx.beginPath(); ctx.moveTo(0, p.sy); ctx.lineTo(W, p.sy); ctx.stroke(); } for (let i = -3; i <= 3; i++) { const a = proj(i * 0.7, 0, 0), b = proj(i * 0.7, 0, 6); ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke(); }
          const sorted = objs.slice().sort((a, b) => b.z - a.z);
          for (const o of sorted) {
            if (o.z < -0.3) continue; const a = clamp(1 - o.z / 6.5, 0.15, 1);
            if (o.kind === 'thermal') { const base = proj(o.x, 0, o.z), top = proj(o.x, 1.0, o.z); const w = o.r * W * 0.45 * base.s; ctx.fillStyle = `rgba(255,255,255,${0.16 * a})`; ctx.beginPath(); ctx.moveTo(base.sx - w, base.sy); ctx.lineTo(top.sx - w * 0.7, top.sy); ctx.lineTo(top.sx + w * 0.7, top.sy); ctx.lineTo(base.sx + w, base.sy); ctx.closePath(); ctx.fill(); ctx.font = `${Math.max(8, Math.round(22 * base.s))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = a; for (let k = 0; k < 3; k++) { const yy = ((now / 900 + k / 3) % 1); const pp = proj(o.x, yy, o.z); ctx.fillText('🌀', pp.sx, pp.sy); } ctx.globalAlpha = 1; }
            else if (o.kind === 'balloon') { const p = proj(o.x, o.y, o.z); ctx.globalAlpha = a; ctx.font = `${Math.max(8, Math.round(26 * p.s))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; if (!o.hit) ctx.fillText('🎈', p.sx, p.sy); ctx.globalAlpha = 1; }
            else { const p = proj(o.x, 0, o.z); ctx.globalAlpha = a; ctx.font = `${Math.max(6, Math.round(28 * p.s))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(o.kind === 'tree' ? '🌳' : '🏡', p.sx, p.sy + 2); ctx.globalAlpha = 1; }
          }
          const gp = proj(px, alt, 0); drawGlider(gp.sx, gp.sy, bank);
          // たかさメーター
          const mh = 90, mx = W - 18, my = 16; ctx.fillStyle = 'rgba(0,0,0,.35)'; mgRoundRect(ctx, mx - 6, my, 12, mh, 5); ctx.fillStyle = alt < 0.25 ? '#ff6b6b' : '#7fe0a0'; mgRoundRect(ctx, mx - 5, my + mh * (1 - alt / 1.05), 10, mh * (alt / 1.05), 4); ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('たかさ', mx, my + mh + 2);
          ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = 'bold 11px sans-serif'; ctx.fillText(`${Math.round(speed * 25)} km/h`, 8, 8);
          if (inThermal > 0) { ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(0, 0, W, H); }
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('テイクオフ!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H - 34, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 21); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now); if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(8 + dist / 42 + balloons * 5 + thermals * 2 + (landed ? 0 : 8)), 8, 100);
          say(landed ? `🛬ちゃくりく!${Math.round(dist)}m 🎈${balloons}` : `⏰タイムアップ!${Math.round(dist)}m 🎈${balloons}`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const HANG_GLIDER_VARIANTS = [mg('hang-glider-3d', makeHangGliderGame({ title: 'ハンググライダー3D!気流にのってとおくまで' }))];

  // ================================================================
  // 新作バッチ4(2026-09-09): ボンバー / ブラックジャック / パイプつなぎ / フルーツ斬り
  // ================================================================

  // --- ボンバー: 十字キーで うごき、💣を おいて 2びょうご に じゅうじに ばくはつ。
  //     レンガを こわし、てきを ぜんぶ たおす。アイテムで はんい/スピード アップ ---
  function makeBomberGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 11, DURATION_MS = mgDuration(100000), ENEMIES = Math.round(lerp(3, 5, difficulty));
        let running = true, rafId = null, last = null, held = { up: false, down: false, left: false, right: false }, map = [], items = [], bombs = [], fires = [], enemies = [], player = { x: 1.5, y: 1.5, spd: 3.2, range: 2, maxBombs: 1, alive: true }, lives = 2, killed = 0, msg = '', msgUntil = 0, invuln = 0, parts = [];
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="bmTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="bmScore">❤️❤️／👾 0/${ENEMIES}</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="bmCanvas"></canvas></div>
          <div class="mg-hint" id="bmHint">十字キー(ながおし)でうごき、💣でばくだんをおく。2びょうでじゅうじにばくはつ!じぶんもまきこまれるのではなれよう。レンガからアイテムがでる</div>
          <div class="mg-tilt-dpad"><span></span><button class="mg-tap-btn mg-hold-btn" id="bmUp" data-key="up">▲</button><span></span><button class="mg-tap-btn mg-hold-btn" id="bmLeft" data-key="left">◀</button><button class="mg-tap-btn primary" id="bmBomb" data-key="action">💣</button><button class="mg-tap-btn mg-hold-btn" id="bmRight" data-key="right">▶</button><span></span><button class="mg-tap-btn mg-hold-btn" id="bmDown" data-key="down">▼</button><span></span></div>`;
        const canvas = container.querySelector('#bmCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N;
        const timerEl = container.querySelector('#bmTimer'), scoreEl = container.querySelector('#bmScore'), hint = container.querySelector('#bmHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `${'❤️'.repeat(Math.max(0, lives))}／👾 ${killed}/${ENEMIES}`; };
        // 0 ゆか, 1 かべ(こわれない), 2 レンガ
        for (let y = 0; y < N; y++) { map.push([]); for (let x = 0; x < N; x++) { let v = 0; if (x === 0 || y === 0 || x === N - 1 || y === N - 1 || (x % 2 === 0 && y % 2 === 0)) v = 1; else if (!(x <= 2 && y <= 2) && Math.random() < lerp(0.42, 0.55, difficulty)) v = 2; map[y].push(v); } }
        const spots = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (map[y][x] === 0 && x + y > 10) spots.push([x, y]);
        for (let i = 0; i < ENEMIES && spots.length; i++) { const k = Math.floor(Math.random() * spots.length); const [x, y] = spots.splice(k, 1)[0]; enemies.push({ x: x + 0.5, y: y + 0.5, dir: Math.floor(Math.random() * 4), alive: true, think: 0, spd: lerp(1.4, 2.2, difficulty) }); }
        const DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (const k of ['Up', 'Down', 'Left', 'Right']) bindHeldButton(container.querySelector('#bm' + k), (v) => { held[k.toLowerCase()] = v; });
        container.querySelector('#bmBomb').addEventListener('pointerdown', (e) => { e.preventDefault(); placeBomb(); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); placeBomb(); });
        const solidAt = (cx, cy) => cx < 0 || cy < 0 || cx >= N || cy >= N || map[cy][cx] > 0 || bombs.some((b) => b.cx === cx && b.cy === cy && !b.walk);
        function canStand(x, y, r = 0.36) { for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (solidAt(Math.floor(x + dx), Math.floor(y + dy))) return false; return true; }
        function move(t, dx, dy, dt) { const spd = t.spd; let nx = t.x + dx * spd * dt, ny = t.y + dy * spd * dt; if (canStand(nx, ny)) { t.x = nx; t.y = ny; return true; } // かどで ひっかからない ように マスの まんなかへ よせる
          const ax = Math.floor(t.x) + 0.5, ay = Math.floor(t.y) + 0.5; if (dx) { const ty2 = t.y + clamp(ay - t.y, -spd * dt, spd * dt); if (canStand(t.x, ty2)) t.y = ty2; } else { const tx2 = t.x + clamp(ax - t.x, -spd * dt, spd * dt); if (canStand(tx2, t.y)) t.x = tx2; } return false; }
        function placeBomb() { if (!running || !player.alive || performance.now() < startTime) return; const cx = Math.floor(player.x), cy = Math.floor(player.y); if (bombs.filter((b) => b.mine).length >= player.maxBombs || bombs.some((b) => b.cx === cx && b.cy === cy)) return; bombs.push({ cx, cy, t: 2.0, range: player.range, mine: true, walk: true }); }
        function explode(b) {
          sfx('hit');
          const cells = [[b.cx, b.cy]];
          for (const [dx, dy] of DIRV) for (let k = 1; k <= b.range; k++) { const x = b.cx + dx * k, y = b.cy + dy * k; if (map[y][x] === 1) break; cells.push([x, y]); if (map[y][x] === 2) { map[y][x] = 0; if (Math.random() < 0.3) items.push({ x, y, kind: Math.random() < 0.5 ? 'range' : 'speed' }); break; } }
          for (const [x, y] of cells) { fires.push({ x, y, t: 0.5 }); for (const o of bombs) if (o !== b && o.cx === x && o.cy === y && o.t > 0.05) o.t = 0.05; }
          for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 3; parts.push({ x: b.cx + 0.5, y: b.cy + 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 }); }
        }
        function hurtPlayer() { if (invuln > 0 || !player.alive) return; lives--; invuln = 1.6; say('💫ばくはつにまきこまれた!', 1000); hud(); if (lives <= 0) { player.alive = false; finish(false); } }
        function update(dt, now) {
          if (invuln > 0) invuln -= dt;
          if (player.alive) { let dx = 0, dy = 0; if (held.up) dy = -1; else if (held.down) dy = 1; else if (held.left) dx = -1; else if (held.right) dx = 1; if (dx || dy) move(player, dx, dy, dt);
            const cx = Math.floor(player.x), cy = Math.floor(player.y); for (const b of bombs) if (b.walk && (b.cx !== cx || b.cy !== cy)) b.walk = false;
            const it = items.findIndex((i) => i.x === cx && i.y === cy); if (it >= 0) { const k = items.splice(it, 1)[0].kind; if (k === 'range') { player.range = Math.min(5, player.range + 1); say('🔥はんいアップ!', 800); } else { player.spd = Math.min(5, player.spd + 0.6); say('👟スピードアップ!', 800); } } }
          for (const b of bombs) { b.t -= dt; if (b.t <= 0) { explode(b); b.dead = true; } } bombs = bombs.filter((b) => !b.dead);
          for (const f of fires) f.t -= dt; fires = fires.filter((f) => f.t > 0);
          for (const f of fires) { if (player.alive && Math.floor(player.x) === f.x && Math.floor(player.y) === f.y) hurtPlayer(); for (const e of enemies) if (e.alive && Math.floor(e.x) === f.x && Math.floor(e.y) === f.y) { e.alive = false; killed++; say(['👾たおした!', '👾やった!', '👾めいちゅう!'][killed % 3], 800); hud(); if (killed >= ENEMIES) { finish(true); return; } } }
          for (const e of enemies) { if (!e.alive) continue; e.think -= dt; const [dx, dy] = DIRV[e.dir]; if (!move(e, dx, dy, dt) || e.think <= 0) { e.think = 0.8 + Math.random() * 1.5; const opts = [0, 1, 2, 3].filter((d) => { const [ox, oy] = DIRV[d]; return canStand(e.x + ox * 0.6, e.y + oy * 0.6); }); if (opts.length) e.dir = opts[Math.floor(Math.random() * opts.length)]; }
            if (player.alive && Math.hypot(e.x - player.x, e.y - player.y) < 0.6) hurtPlayer(); }
          for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } parts = parts.filter((p) => p.life > 0);
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#3f8f4a'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = map[y][x]; const px = x * CELL, py = y * CELL; if (v === 0) { ctx.fillStyle = (x + y) % 2 ? '#4f9f5a' : '#479552'; ctx.fillRect(px, py, CELL, CELL); } else if (v === 1) { ctx.fillStyle = '#6d7f8f'; ctx.fillRect(px, py, CELL, CELL); ctx.fillStyle = '#8ea0b0'; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL * 0.4); ctx.fillStyle = '#556676'; ctx.fillRect(px + 1, py + CELL - 4, CELL - 2, 3); } else { ctx.fillStyle = '#b5552b'; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px + 1, py + CELL / 2 - 1, CELL - 2, 2); ctx.fillRect(px + CELL / 2, py + 1, 2, CELL / 2 - 1); ctx.fillRect(px + CELL / 4, py + CELL / 2, 2, CELL / 2 - 1); } }
          ctx.font = `${Math.round(CELL * 0.7)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (const i of items) { ctx.fillStyle = 'rgba(255,255,255,.7)'; mgRoundRect(ctx, i.x * CELL + 3, i.y * CELL + 3, CELL - 6, CELL - 6, 4); ctx.fillText(i.kind === 'range' ? '🔥' : '👟', (i.x + 0.5) * CELL, (i.y + 0.5) * CELL + 1); }
          for (const b of bombs) { const s = 1 + 0.12 * Math.sin(now / (b.t < 0.6 ? 40 : 120)); ctx.font = `${Math.round(CELL * 0.75 * s)}px sans-serif`; ctx.fillText('💣', (b.cx + 0.5) * CELL, (b.cy + 0.5) * CELL + 1); }
          for (const f of fires) { const a = clamp(f.t * 2, 0, 1); ctx.fillStyle = `rgba(255,${Math.round(140 + 100 * a)},40,${0.5 + 0.4 * a})`; mgRoundRect(ctx, f.x * CELL + 2, f.y * CELL + 2, CELL - 4, CELL - 4, 6); ctx.fillStyle = `rgba(255,255,200,${0.7 * a})`; ctx.beginPath(); ctx.arc((f.x + 0.5) * CELL, (f.y + 0.5) * CELL, CELL * 0.22, 0, Math.PI * 2); ctx.fill(); }
          ctx.font = `${Math.round(CELL * 0.8)}px sans-serif`;
          for (const e of enemies) if (e.alive) ctx.fillText('👾', e.x * CELL, e.y * CELL + 1 + Math.sin(now / 150) * 1.5);
          if (player.alive && (invuln <= 0 || Math.floor(now / 90) % 2)) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(player.x * CELL, player.y * CELL + CELL * 0.4, CELL * 0.3, CELL * 0.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillText(currentSprite(), player.x * CELL, player.y * CELL); }
          for (const p of parts) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = '#ffb347'; ctx.fillRect(p.x * CELL - 2, p.y * CELL - 2, 4, 4); } ctx.globalAlpha = 1;
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('スタート!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, 6, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 19); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now); if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(false); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(cleared) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = cleared ? clamp(80 + lives * 10, 80, 100) : clamp(Math.round(12 + killed * 14), 12, 70);
          say(cleared ? '🏆ぜんぶたおした!' : lives <= 0 ? `やられた…👾 ${killed}` : `タイムアップ!👾 ${killed}`, 2600);
          render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const BOMBER_VARIANTS = [mg('bomber-maze', makeBomberGame({ title: 'ボンバー!ばくだんでレンガをくだきてきをたおせ' }))];

  // --- ブラックジャック: 21に ちかづける。ディーラーは 17で ストップ。5ハンド ---
  function makeBlackjackGame({ title }) {
    return {
      start(container, onComplete) {
        const HANDS = 5, START = 100, BET = 20;
        let running = true, rafId = null, chips = START, hand = 0, deck = [], me = [], dealer = [], phase = 'deal', msg = '', msgUntil = 0, revealAt = 0, dealAt = 0, result = '';
        container.innerHTML = `
          <div class="mg-header"><span id="bjHand">1/${HANDS}ハンド</span><span id="bjChips">🪙 ${START}</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="bjCanvas"></canvas></div>
          <div class="mg-hint" id="bjHint">カードのごうけいを21にちかづける(21をこえたらまけ)。Aは1か11、えふだは10。ヒットで1まいひく、スタンドでしょうぶ。ディーラーは17いじょうでとまる</div>
          <div class="mg-race-controls"><button class="mg-tap-btn primary" id="bjHit" data-key="action">ヒット</button><button class="mg-tap-btn" id="bjStand" data-key="action2">スタンド</button><button class="mg-tap-btn" id="bjNext" data-key="right">つぎへ</button></div>`;
        const canvas = container.querySelector('#bjCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 230);
        const handEl = container.querySelector('#bjHand'), chipsEl = container.querySelector('#bjChips'), hint = container.querySelector('#bjHint');
        const hitBtn = container.querySelector('#bjHit'), standBtn = container.querySelector('#bjStand'), nextBtn = container.querySelector('#bjNext');
        const say = (t, ms = 1500) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { handEl.textContent = `${Math.min(HANDS, hand + 1)}/${HANDS}ハンド`; chipsEl.textContent = `🪙 ${chips}`; hitBtn.disabled = phase !== 'play'; standBtn.disabled = phase !== 'play'; nextBtn.disabled = phase !== 'done'; };
        const SUITS = ['♠', '♥', '♦', '♣'];
        function newDeck() { deck = []; for (const s of SUITS) for (let r = 1; r <= 13; r++) deck.push({ s, r }); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } }
        const draw = () => { if (deck.length < 10) newDeck(); const c = deck.pop(); c.born = performance.now(); return c; };
        const value = (cards) => { let v = 0, aces = 0; for (const c of cards) { if (c.r === 1) { aces++; v += 11; } else v += Math.min(10, c.r); } while (v > 21 && aces > 0) { v -= 10; aces--; } return v; };
        const label = (r) => (r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r));
        function deal() { sfx('pop'); me = [draw(), draw()]; dealer = [draw(), draw()]; phase = 'play'; result = ''; hud(); say('ヒットかスタンド?', 1200); if (value(me) === 21) { stand(true); } }
        function settle(text, mult) { sfx(mult > 0 ? 'coin' : mult < 0 ? 'bad' : 'tick'); chips += Math.round(BET * mult); result = text; phase = 'done'; hud(); say(text, 2200); }
        function stand(natural) {
          phase = 'dealer'; hud(); revealAt = performance.now();
          const step = () => { if (!running) return; if (value(dealer) < 17) { dealer.push(draw()); setTimeout(step, 550); return; } const dv = value(dealer), mv = value(me);
            if (natural && dv !== 21) settle('🎉ブラックジャック!×1.5', 1.5); else if (dv > 21) settle('🎉ディーラーがバースト!かち', 1); else if (mv > dv) settle(`🎉 ${mv} vs ${dv}かち!`, 1); else if (mv === dv) settle(`ひきわけ${mv} vs ${dv}`, 0); else settle(`💦 ${mv} vs ${dv}まけ`, -1); };
          setTimeout(step, 600);
        }
        hitBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (phase !== 'play' || !running) return; sfx('pop'); me.push(draw()); const v = value(me); if (v > 21) { settle(`💦バースト(${v})…まけ`, -1); } else if (v === 21) stand(false); });
        standBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (phase !== 'play' || !running) return; stand(false); });
        nextBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (phase !== 'done' || !running) return; hand++; if (hand >= HANDS || chips < BET) { finish(); return; } deal(); });
        function card(x, y, c, faceDown, scale = 1) {
          const w = 34 * scale, h = 48 * scale; const t = c ? clamp((performance.now() - c.born) / 220, 0, 1) : 1; const yy = y - (1 - t) * 30;
          ctx.fillStyle = 'rgba(0,0,0,.3)'; mgRoundRect(ctx, x + 2, yy + 3, w, h, 4);
          if (faceDown) { ctx.fillStyle = '#2f5fb5'; mgRoundRect(ctx, x, yy, w, h, 4); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.strokeRect(x + 4, yy + 4, w - 8, h - 8); return; }
          ctx.fillStyle = '#fff'; mgRoundRect(ctx, x, yy, w, h, 4); const red = c.s === '♥' || c.s === '♦'; ctx.fillStyle = red ? '#d62828' : '#222'; ctx.font = `bold ${Math.round(12 * scale)}px sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(label(c.r), x + 4, yy + 3); ctx.font = `${Math.round(10 * scale)}px sans-serif`; ctx.fillText(c.s, x + 4, yy + 16 * scale); ctx.font = `${Math.round(18 * scale)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.s, x + w / 2, yy + h * 0.62);
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#1f6f45'; ctx.fillRect(0, 0, W, H); const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7); g.addColorStop(0, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(0,0,0,.3)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(255,220,120,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W / 2, -40, W * 0.62, 0.35, Math.PI - 0.35); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          const hide = phase === 'play'; const dv = hide ? value([dealer[0]]) : value(dealer); ctx.fillText(`ディーラー${dealer.length ? (hide ? dv + ' + ?' : dv) : ''}`, 8, 8);
          dealer.forEach((c, i) => card(W / 2 - (dealer.length * 38) / 2 + i * 38, 24, c, hide && i === 1));
          ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`あなた${me.length ? value(me) : ''}`, 8, H - 78);
          me.forEach((c, i) => card(W / 2 - (me.length * 38) / 2 + i * 38, H - 60, c, false));
          ctx.fillStyle = 'rgba(0,0,0,.35)'; mgRoundRect(ctx, W - 74, H - 84, 66, 18, 9); ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`かけ🪙${BET}`, W - 41, H - 75);
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(W / 2 - 100, H / 2 - 14, 200, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; render(now); rafId = requestAnimationFrame(loop); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId); container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(50 + (chips - START) * 0.5), 15, 100);
          say(chips > START ? `🏆 🪙${chips}でおわり!+${chips - START}` : chips === START ? 'イーブンでおわり' : `🪙${chips}でおわり…${chips - START}`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        newDeck(); deal();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const BLACKJACK_VARIANTS = [mg('blackjack-21', makeBlackjackGame({ title: 'ブラックジャック!21にちかづけてディーラーにかとう' }))];

  // --- パイプつなぎ(6×6): タップで パイプを 90°まわし、みずを 🚰から 🌻へ ---
  function makePipeConnectGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 6, ROUNDS = 3, DURATION_MS = mgDuration(150000);
        let running = true, rafId = null, round = 0, grid, src, dst, solved = 0, taps = 0, flow = null, msg = '', msgUntil = 0, wet = new Set(), rot = [];
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="ppRound">1/${ROUNDS}もんめ</span><span id="ppTaps">タップ0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="ppCanvas"></canvas></div>
          <div class="mg-hint" id="ppHint">パイプをタップすると90°まわる。ひだりの🚰からみぎの🌻までみずがとおるみちをつくろう。すくないタップでつなぐとこうとくてん</div>`;
        const canvas = container.querySelector('#ppCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const PAD = 20, CELL = (W - PAD * 2) / N;
        const roundEl = container.querySelector('#ppRound'), tapsEl = container.querySelector('#ppTaps'), hint = container.querySelector('#ppHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { roundEl.textContent = `${Math.min(ROUNDS, round + 1)}/${ROUNDS}もんめ`; tapsEl.textContent = `タップ${taps}`; };
        // パイプ: 4ビット(上1 右2 下4 左8)。まわす = ビットを 1つ ずらす
        const rotate = (m) => ((m << 1) & 15) | (m >> 3);
        const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 }; const DIR = { 1: [0, -1], 2: [1, 0], 4: [0, 1], 8: [-1, 0] };
        function gen() {
          // ランダムな みちを つくる
          let path, tries = 0;
          do { path = []; const seen = new Set(); let x = 0, y = Math.floor(Math.random() * N); src = y; seen.add(x + ',' + y); path.push([x, y]); let ok = false;
            while (path.length < 40) { const opts = []; for (const d of [1, 2, 4, 8]) { const [dx, dy] = DIR[d]; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N || seen.has(nx + ',' + ny)) continue; opts.push([nx, ny, d]); } if (!opts.length) break; const w = opts.map(([nx]) => (nx > x ? 1.6 : 1)); let r = Math.random() * w.reduce((a, b) => a + b, 0), k = 0; while (r > w[k]) { r -= w[k]; k++; } const [nx, ny] = opts[k]; x = nx; y = ny; seen.add(x + ',' + y); path.push([x, y]); if (x === N - 1 && path.length >= lerp(8, 12, difficulty)) { ok = true; break; } }
            if (ok) { dst = y; break; } tries++; } while (tries < 200);
          grid = Array.from({ length: N }, () => Array(N).fill(0));
          for (let i = 0; i < path.length; i++) { const [x, y] = path[i]; let m = 0; if (i > 0) { const [px, py] = path[i - 1]; for (const d of [1, 2, 4, 8]) { const [dx, dy] = DIR[d]; if (x + dx === px && y + dy === py) m |= d; } } else m |= 8; if (i < path.length - 1) { const [nx, ny] = path[i + 1]; for (const d of [1, 2, 4, 8]) { const [dx, dy] = DIR[d]; if (x + dx === nx && y + dy === ny) m |= d; } } else m |= 2; grid[y][x] = m; }
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!grid[y][x]) grid[y][x] = [3, 5, 6, 9, 10, 12, 7, 11, 13, 14][Math.floor(Math.random() * 10)];
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = Math.floor(Math.random() * 4); for (let i = 0; i < k; i++) grid[y][x] = rotate(grid[y][x]); }
          rot = Array.from({ length: N }, () => Array(N).fill(0)); wet = new Set(); flow = null;
          if (check()) gen();
        }
        function check() { // 🚰から たどる
          const reach = new Set(); const st = []; if (grid[src][0] & 8) { st.push([0, src]); reach.add('0,' + src); }
          while (st.length) { const [x, y] = st.pop(); for (const d of [1, 2, 4, 8]) { if (!(grid[y][x] & d)) continue; const [dx, dy] = DIR[d]; const nx = x + dx, ny = y + dy; if (nx === N && ny === dst && d === 2) return reach; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; if (!(grid[ny][nx] & OPP[d])) continue; const k = nx + ',' + ny; if (!reach.has(k)) { reach.add(k); st.push([nx, ny]); } } }
          wet = reach; return null;
        }
        gen(); hud();
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || flow) return; const p = mgPointerPos(canvas, e); const x = Math.floor((p.x - PAD) / CELL), y = Math.floor((p.y - PAD) / CELL); if (x < 0 || y < 0 || x >= N || y >= N) return; grid[y][x] = rotate(grid[y][x]); rot[y][x] = performance.now(); taps++; sfx('tick'); hud(); const r = check(); if (r) { wet = r; flow = { at: performance.now(), cells: r.size }; solved++; sfx('coin'); say('💧つながった!', 1500); setTimeout(() => { if (!running) return; round++; if (round >= ROUNDS) { finish(); return; } gen(); hud(); say('つぎのパイプ!', 900); }, 1800); } });
        function drawPipe(x, y, m, isWet, ang) {
          const cx = PAD + (x + 0.5) * CELL, cy = PAD + (y + 0.5) * CELL; ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
          const w = CELL * 0.3; ctx.lineCap = 'butt'; ctx.lineWidth = w; ctx.strokeStyle = '#6b7280'; for (const d of [1, 2, 4, 8]) if (m & d) { const [dx, dy] = DIR[d]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dx * CELL / 2, dy * CELL / 2); ctx.stroke(); }
          ctx.fillStyle = '#6b7280'; ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = w * 0.55; ctx.strokeStyle = isWet ? '#38bdf8' : '#cbd5e1'; for (const d of [1, 2, 4, 8]) if (m & d) { const [dx, dy] = DIR[d]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(dx * CELL / 2, dy * CELL / 2); ctx.stroke(); }
          ctx.fillStyle = isWet ? '#38bdf8' : '#cbd5e1'; ctx.beginPath(); ctx.arc(0, 0, w * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#e2e8f0'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ctx.fillStyle = (x + y) % 2 ? '#d5dde8' : '#dde4ee'; ctx.fillRect(PAD + x * CELL, PAD + y * CELL, CELL, CELL); }
          ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.strokeRect(PAD, PAD, N * CELL, N * CELL);
          ctx.font = `${Math.round(CELL * 0.6)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🚰', PAD / 2, PAD + (src + 0.5) * CELL); ctx.fillText(flow ? '🌻' : '🥀', W - PAD / 2, PAD + (dst + 0.5) * CELL);
          ctx.lineWidth = CELL * 0.16; ctx.strokeStyle = '#38bdf8'; ctx.beginPath(); ctx.moveTo(0, PAD + (src + 0.5) * CELL); ctx.lineTo(PAD, PAD + (src + 0.5) * CELL); ctx.stroke(); ctx.strokeStyle = flow ? '#38bdf8' : '#cbd5e1'; ctx.beginPath(); ctx.moveTo(W - PAD, PAD + (dst + 0.5) * CELL); ctx.lineTo(W, PAD + (dst + 0.5) * CELL); ctx.stroke();
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const t = clamp((now - rot[y][x]) / 150, 0, 1); drawPipe(x, y, grid[y][x], wet.has(x + ',' + y), (t - 1) * Math.PI / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; render(now); if (now - startTime > DURATION_MS) { finish(); return; } rafId = requestAnimationFrame(loop); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = clamp(Math.round(12 + solved * 26 + (solved >= ROUNDS ? Math.max(0, 10 - Math.max(0, taps - 30) * 0.5) : 0)), 12, 100);
          say(solved >= ROUNDS ? `🏆ぜんぶつないだ!タップ${taps}` : `おわり!${solved}もんつないだ`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const PIPE_CONNECT_VARIANTS = [mg('pipe-connect', makePipeConnectGame({ title: 'パイプつなぎ!まわしてみずをとおそう' }))];

  // --- フルーツ斬り: とんでくる フルーツを スワイプで きる。💣は きらない ---
  function makeFruitSliceGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(60000), G = 520;
        let running = true, rafId = null, last = null, objs = [], halves = [], splashes = [], trail = [], sliced = 0, missed = 0, lives = 3, combo = 0, comboAt = 0, spawnCd = 0.6, msg = '', msgUntil = 0, ptr = null, score = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        const FRUITS = ['🍎', '🍊', '🍉', '🍌', '🍓', '🥝', '🍍'];
        container.innerHTML = `
          <div class="mg-header"><span id="fsTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="fsScore">❤️❤️❤️／0pt</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="fsCanvas"></canvas></div>
          <div class="mg-hint" id="fsHint">ゆびをすばやくなぞってフルーツをきる!1かいのスワイプでなんこもきるとコンボ。💣をきるとライフがへる。おとしすぎにもちゅうい</div>`;
        const canvas = container.querySelector('#fsCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * 1.2));
        const timerEl = container.querySelector('#fsTimer'), scoreEl = container.querySelector('#fsScore'), hint = container.querySelector('#fsHint');
        const say = (t, ms = 800) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `${'❤️'.repeat(Math.max(0, lives))}／${score}pt`; };
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); ptr = { id: e.pointerId, x: p.x, y: p.y }; trail = [{ x: p.x, y: p.y, t: performance.now() }]; combo = 0; });
        canvas.addEventListener('pointermove', (e) => { if (!ptr || e.pointerId !== ptr.id) return; const p = mgPointerPos(canvas, e); const now = performance.now(); const speed = Math.hypot(p.x - ptr.x, p.y - ptr.y); if (speed > 3) cut(ptr.x, ptr.y, p.x, p.y, now); ptr.x = p.x; ptr.y = p.y; trail.push({ x: p.x, y: p.y, t: now }); if (trail.length > 14) trail.shift(); });
        const endPtr = () => { ptr = null; }; canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
        function segCircle(ax, ay, bx, by, cx, cy, r) { const dx = bx - ax, dy = by - ay; const l2 = dx * dx + dy * dy || 1; let t = ((cx - ax) * dx + (cy - ay) * dy) / l2; t = clamp(t, 0, 1); const px = ax + dx * t, py = ay + dy * t; return Math.hypot(px - cx, py - cy) < r; }
        function cut(ax, ay, bx, by, now) {
          for (const o of objs) { if (o.dead || !segCircle(ax, ay, bx, by, o.x, o.y, o.r)) continue; o.dead = true;
            if (o.bomb) { lives--; combo = 0; say('💥ばくだんをきった!', 1000); hud(); for (let i = 0; i < 16; i++) splashes.push({ x: o.x, y: o.y, vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 0.5) * 400, life: 0.6, color: '#333' }); if (lives <= 0) { finish(); return; } continue; }
            sfx('whoosh'); sliced++; combo++; comboAt = now; const gain = 10 * combo; score += gain; const ang = Math.atan2(by - ay, bx - ax);
            halves.push({ x: o.x, y: o.y, vx: o.vx + Math.cos(ang + Math.PI / 2) * 90, vy: o.vy - 40, emoji: o.emoji, ang, side: 1, rot: 0 }, { x: o.x, y: o.y, vx: o.vx - Math.cos(ang + Math.PI / 2) * 90, vy: o.vy - 40, emoji: o.emoji, ang, side: -1, rot: 0 });
            for (let i = 0; i < 10; i++) splashes.push({ x: o.x, y: o.y, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.7) * 300, life: 0.5, color: o.color });
            if (combo >= 2) say(`✨ ${combo}コンボ!+${gain}`, 700); hud(); }
        }
        function spawn() {
          const n = 1 + (Math.random() < lerp(0.3, 0.55, difficulty) ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0);
          for (let i = 0; i < n; i++) { const bomb = Math.random() < lerp(0.12, 0.2, difficulty); const x = 30 + Math.random() * (W - 60); const k = Math.floor(Math.random() * FRUITS.length); objs.push({ x, y: H + 20, vx: (W / 2 - x) * 0.6 + (Math.random() - 0.5) * 60, vy: -(lerp(520, 560, difficulty) + Math.random() * 90), r: 20, emoji: bomb ? '💣' : FRUITS[k], bomb, color: ['#e63946', '#f77f00', '#d62839', '#ffd23f', '#e5383b', '#80b918', '#ffb703'][k], rot: (Math.random() - 0.5) * 4 }); }
        }
        function update(dt, now) {
          spawnCd -= dt; if (spawnCd <= 0) { spawn(); spawnCd = lerp(1.3, 0.9, difficulty) + Math.random() * 0.5; }
          for (const o of objs) { o.vy += G * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.a = (o.a || 0) + o.rot * dt; if (o.y > H + 40 && o.vy > 0) { o.dead = true; if (!o.bomb) { missed++; combo = 0; if (missed % 3 === 0) say('おとした…', 600); } } }
          objs = objs.filter((o) => !o.dead);
          for (const h of halves) { h.vy += G * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.side * dt * 4; } halves = halves.filter((h) => h.y < H + 60);
          for (const s of splashes) { s.vy += G * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; } splashes = splashes.filter((s) => s.life > 0);
          trail = trail.filter((t) => now - t.t < 180);
        }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#4b2c5e'); bg.addColorStop(1, '#1f1533'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          const spot = ctx.createRadialGradient(W / 2, H * 0.35, 10, W / 2, H * 0.35, W * 0.7); spot.addColorStop(0, 'rgba(255,200,240,.22)'); spot.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = spot; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < 14; i++) { const h1 = Math.sin(i * 12.9898) * 43758.5453, h2 = Math.sin(i * 78.233) * 12345.678; const k1 = h1 - Math.floor(h1), k2 = h2 - Math.floor(h2); ctx.beginPath(); ctx.arc(k1 * W, ((k2 + now / 9000) % 1) * H, 2 + k1 * 3, 0, Math.PI * 2); ctx.fill(); }
          const wood = ctx.createLinearGradient(0, H - 14, 0, H); wood.addColorStop(0, '#8a5a32'); wood.addColorStop(1, '#4a2c16'); ctx.fillStyle = wood; ctx.fillRect(0, H - 14, W, 14); ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < W; i += 23) ctx.fillRect(i, H - 14, 1, 14);
          for (const s of splashes) { ctx.globalAlpha = clamp(s.life * 2, 0, 1); ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          for (const h of halves) { ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.ang + h.rot); ctx.beginPath(); ctx.rect(-30, h.side > 0 ? -30 : 0, 60, 30); ctx.clip(); ctx.font = '36px sans-serif'; ctx.fillText(h.emoji, 0, 1); ctx.restore(); }
          for (const o of objs) { ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a || 0); ctx.font = '36px sans-serif'; ctx.fillText(o.emoji, 0, 1); ctx.restore(); if (o.bomb) { ctx.fillStyle = `rgba(255,80,80,${0.4 + 0.3 * Math.sin(now / 100)})`; ctx.beginPath(); ctx.arc(o.x + 10, o.y - 14, 3, 0, Math.PI * 2); ctx.fill(); } }
          if (trail.length > 1) { ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for (let i = 1; i < trail.length; i++) { const a = i / trail.length; ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`; ctx.lineWidth = 2 + a * 5; ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke(); } }
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('スタート!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, 10, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 24); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now); if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const final = clamp(Math.round(10 + score / 9 + lives * 4), 10, 100);
          say(lives <= 0 ? `💥ライフがなくなった…${sliced}こきった` : `おわり!${sliced}こきった${score}pt`, 2600); render(performance.now());
          setTimeout(() => onComplete(final), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const FRUIT_SLICE_VARIANTS = [mg('fruit-slice', makeFruitSliceGame({ title: 'フルーツ斬り!スワイプでスパッときろう' }))];

  // ================================================================
  // 新作バッチ4(2026-09-09): りくじょう(100m&はばとび) / ボクセルマイニング / かいてんずし
  // ================================================================

  // --- りくじょう: ◀▶を こうごに れんだして はしる。100mの あとは はばとび。
  //     ラインの てまえで ジャンプ! おしている ながさで かくどが きまる ---
  function makeTrackFieldGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        let running = true, rafId = null, last = null, event = 'dash', x = 0, speed = 0, lastKey = 0, taps = 0, t100 = 0, dashDone = false, jumpPhase = 'run', jx = 0, jy = 0, jvx = 0, jvy = 0, holdStart = 0, jumpDist = 0, foul = false, msg = '', msgUntil = 0, countdown = 3, camX = 0, stride = 0, rivals = [], results = {};
        const startTime = performance.now() + 900;
        container.innerHTML = `
          <div class="mg-header"><span id="tfEvent">🏃 100m</span><span id="tfTime">0.00s</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="tfCanvas"></canvas></div>
          <div class="mg-hint" id="tfHint">◀と▶をこうごにすばやくタップしてはしる!100mのあとははばとび。しろいラインのてまえでジャンプボタンをおして、はなすととぶ(ながくおすとたかく)</div>
          <div class="mg-race-controls"><button class="mg-tap-btn" id="tfL" data-key="left">◀はしる</button><button class="mg-tap-btn primary" id="tfJump" data-key="action">ジャンプ</button><button class="mg-tap-btn" id="tfR" data-key="right">はしる▶</button></div>`;
        const canvas = container.querySelector('#tfCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 220);
        const eventEl = container.querySelector('#tfEvent'), timeEl = container.querySelector('#tfTime'), hint = container.querySelector('#tfHint'), jumpBtn = container.querySelector('#tfJump');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const GROUND = H * 0.78, SCALE = 9; // px per m
        for (let i = 0; i < 3; i++) rivals.push({ x: 0, spd: lerp(6.2, 8.2, difficulty) * (0.92 + i * 0.05), emoji: ['🧑', '👩', '🧒'][i], lane: i });
        const run = (k) => { if (!running || performance.now() < startTime + 3000) return; if (event === 'jump' && jumpPhase !== 'run') return; if (k === lastKey) { speed = Math.max(0, speed - 0.3); return; } lastKey = k; taps++; sfx('tick'); speed = Math.min(lerp(9.5, 11.5, 1 - difficulty * 0.4), speed + lerp(1.4, 1.1, difficulty)); };
        container.querySelector('#tfL').addEventListener('pointerdown', (e) => { e.preventDefault(); run(1); });
        container.querySelector('#tfR').addEventListener('pointerdown', (e) => { e.preventDefault(); run(2); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); run(p.x < W / 2 ? 1 : 2); });
        bindHeldButton(jumpBtn, (v) => { if (!running || event !== 'jump') return; if (v) { if (jumpPhase === 'run') { holdStart = performance.now(); jumpPhase = 'hold'; } } else if (jumpPhase === 'hold') doJump(); });
        function doJump() { const hold = clamp((performance.now() - holdStart) / 900, 0.1, 1); const ang = lerp(0.35, 1.2, hold); // 20°〜69°
          jumpPhase = 'fly'; foul = x > 60; sfx(foul ? 'bad' : 'jump'); const v = Math.max(3, speed) * 0.82; jvx = v * Math.cos(ang); jvy = v * Math.sin(ang); jx = x; jy = 0; say(foul ? '❌ファウル!ラインをこえた' : hold > 0.5 && hold < 0.8 ? '🔥いいかくど!' : 'ジャンプ!', 900); }
        function update(dt, now) {
          if (now < startTime + 3000) { countdown = Math.ceil((startTime + 3000 - now) / 1000); return; }
          if (event === 'dash') {
            speed = Math.max(0, speed - dt * 2.2); x += speed * dt; t100 += dt; stride += speed * dt * 2;
            for (const r of rivals) r.x += r.spd * dt * (0.9 + 0.2 * Math.sin(now / 400 + r.lane));
            if (x >= 100) { dashDone = true; sfx('notify'); const rank = 1 + rivals.filter((r) => r.x >= 100).length; results.dash = t100; results.rank = rank; say(`🏁 ${t100.toFixed(2)}びょう${rank}位!`, 2000); event = 'wait'; setTimeout(() => { if (!running) return; event = 'jump'; x = 0; speed = 0; lastKey = 0; camX = 0; eventEl.textContent = '🦘はばとび'; say('れんだではしり、ラインのてまえでジャンプ!', 1500); }, 2200); }
          } else if (event === 'jump') {
            if (jumpPhase === 'run' || jumpPhase === 'hold') { speed = Math.max(0, speed - dt * 2.2); x += speed * dt; stride += speed * dt * 2; if (x > 66) { jumpPhase = 'fly'; foul = true; jvx = speed; jvy = 1; jx = x; jy = 0; say('❌とびそこねた…ファウル', 1200); } }
            else if (jumpPhase === 'fly') { jvy -= 9.8 * dt; jx += jvx * dt; jy += jvy * dt; if (jy <= 0) { jy = 0; jumpPhase = 'land'; jumpDist = foul ? 0 : Math.max(0, jx - 60); sfx(foul ? 'bad' : jumpDist >= 6 ? 'coin' : 'hit'); results.jump = jumpDist; say(foul ? 'ファウル…0m' : `📏 ${jumpDist.toFixed(2)}m!`, 2200); setTimeout(() => { if (running) finish(); }, 2300); } x = jx; }
          }
          camX += (x - camX) * Math.min(1, dt * 8);
        }
        const sx = (wx) => W * 0.3 + (wx - camX) * SCALE;
        function drawRunner(px, py, emoji, moving, air) { ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; const bob = moving ? Math.abs(Math.sin(stride)) * 4 : 0; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(px, py + 2, 12, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillText(emoji, px, py - bob - air); if (moving && !air) { ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 3, py - 2); ctx.lineTo(px - 3 - Math.sin(stride) * 8, py); ctx.moveTo(px + 3, py - 2); ctx.lineTo(px + 3 + Math.sin(stride) * 8, py); ctx.stroke(); } }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, '#6fb6ff'); sky.addColorStop(1, '#d8ecff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#5d6b7a'; ctx.fillRect(0, GROUND - 70, W, 40); for (let i = 0; i < 24; i++) { ctx.fillStyle = ['#e63946', '#ffd23f', '#3a86ff', '#fff', '#2a9d8f'][i % 5]; ctx.fillRect(((i * 41 - camX * SCALE * 0.3) % (W + 40) + W + 40) % (W + 40) - 20, GROUND - 62 + (i % 3) * 9, 8, 8); }
          ctx.fillStyle = '#3f8f4a'; ctx.fillRect(0, GROUND - 30, W, 30);
          ctx.fillStyle = '#c2553a'; ctx.fillRect(0, GROUND - 6, W, H - GROUND + 6);
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; for (let l = 0; l < 4; l++) { const y = GROUND + 2 + l * 9; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
          ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          if (event === 'dash' || event === 'wait') { for (let m = 0; m <= 100; m += 10) { const px = sx(m); if (px < -10 || px > W + 10) continue; ctx.fillRect(px - 1, GROUND - 6, 2, 8); ctx.fillText(m + 'm', px, GROUND + 30); } const gx = sx(100); ctx.fillStyle = '#fff'; ctx.fillRect(gx - 2, GROUND - 40, 4, 40); ctx.font = '20px sans-serif'; ctx.fillText('🏁', gx, GROUND - 60);
            rivals.forEach((r) => drawRunner(sx(r.x) + 10 + r.lane * 6, GROUND - 2 - r.lane * 7, r.emoji, true, 0));
            drawRunner(sx(x), GROUND + 20, currentSprite(), speed > 0.5, 0);
          } else {
            const lx = sx(60); ctx.fillStyle = '#fff'; ctx.fillRect(lx - 2, GROUND - 6, 4, 34); ctx.fillStyle = '#e9d8a6'; ctx.fillRect(lx + 2, GROUND - 6, W, 34); ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; for (let m = 1; m <= 12; m++) { const px = sx(60 + m); if (px < -10 || px > W + 10) continue; ctx.fillRect(px - 1, GROUND + 22, 2, 5); if (m % 2 === 0) ctx.fillText(m + 'm', px, GROUND + 28); }
            ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('ジャンプライン', lx, GROUND - 40);
            drawRunner(sx(x), GROUND + 20, currentSprite(), jumpPhase !== 'fly' && speed > 0.5, jumpPhase === 'fly' ? jy * SCALE : 0);
            if (jumpPhase === 'hold') { const h = clamp((now - holdStart) / 900, 0, 1); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(W / 2 - 40, 26, 80, 8); ctx.fillStyle = h > 0.5 && h < 0.8 ? '#7fe0a0' : '#ffd23f'; ctx.fillRect(W / 2 - 40, 26, 80 * h, 8); ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.fillText('かくど', W / 2, 36); }
          }
          ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(8, 8, 70, 8); ctx.fillStyle = '#ffd23f'; ctx.fillRect(8, 8, 70 * clamp(speed / 11, 0, 1), 8); ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`${(speed * 3.6).toFixed(0)} km/h`, 8, 18);
          if (now < startTime + 3000) { ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 60, H / 2 - 26, 120, 52); ctx.fillStyle = '#fff'; ctx.fillText(now < startTime ? 'よーい' : String(countdown), W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 95, H / 2 - 14, 190, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          update(dt, now); if (!running) return;
          timeEl.textContent = event === 'dash' ? `${t100.toFixed(2)}s` : event === 'wait' ? `${t100.toFixed(2)}s` : jumpPhase === 'land' ? `${jumpDist.toFixed(2)}m` : `${(x).toFixed(1)}m`;
          render(now); rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId); container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const dashPts = results.dash ? clamp(60 - (results.dash - 11) * 6, 10, 60) : 5; const jumpPts = clamp((results.jump || 0) * 5.5, 0, 40);
          const score = clamp(Math.round(dashPts + jumpPts), 10, 100);
          say(`おわり!100m ${results.dash ? results.dash.toFixed(2) + 's' : '-'}／はばとび${(results.jump || 0).toFixed(2)}m`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const TRACK_FIELD_VARIANTS = [mg('track-field', makeTrackFieldGame({ title: 'りくじょう!100mダッシュとはばとび' }))];

  // --- ボクセルマイニング: 十字キー(ながおし)で ほりすすむ。つち<いし<こうせき。
  //     💎ほど ふかい。マグマは ダメージ。ライトの とどく はんいだけ みえる ---
  function makeVoxelMineGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 9, ROWS = 60, DURATION_MS = mgDuration(75000);
        let running = true, rafId = null, last = null, held = { up: false, down: false, left: false, right: false }, map = [], px = 4, py = 0, dig = null, hp = 3, loot = { coal: 0, iron: 0, gold: 0, gem: 0 }, score = 0, camY = 0, msg = '', msgUntil = 0, invuln = 0, parts = [], depthMax = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="vmTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="vmScore">❤️❤️❤️／0pt</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="vmCanvas"></canvas></div>
          <div class="mg-hint" id="vmHint">十字キーをながおしでそのむきにほる。いしはじかんがかかる。⚫せきたん→⛓てつ→🟡きん→💎ダイヤはふかいほどおおい。🔥マグマにさわるとダメージ!</div>
          <div class="mg-tilt-dpad"><span></span><button class="mg-tap-btn mg-hold-btn" id="vmUp" data-key="up">▲</button><span></span><button class="mg-tap-btn mg-hold-btn" id="vmLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="vmDown" data-key="down">▼</button><button class="mg-tap-btn mg-hold-btn" id="vmRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#vmCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const CELL = W / COLS, VIEW_ROWS = Math.ceil(H / CELL) + 2;
        const timerEl = container.querySelector('#vmTimer'), scoreEl = container.querySelector('#vmScore'), hint = container.querySelector('#vmHint');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `${'❤️'.repeat(Math.max(0, hp))}／${score}pt`; };
        // 0 くうき, 1 つち, 2 いし, 3 せきたん, 4 てつ, 5 きん, 6 ダイヤ, 7 マグマ
        const HARD = { 1: 0.28, 2: 0.7, 3: 0.5, 4: 0.8, 5: 0.9, 6: 1.1 }; const VAL = { 3: 5, 4: 12, 5: 25, 6: 60 }; const NAME = { 3: '⚫せきたん', 4: '⛓てつ', 5: '🟡きん!', 6: '💎ダイヤ!!' };
        for (let y = 0; y < ROWS; y++) { map.push([]); for (let x = 0; x < COLS; x++) { let v; if (y === 0) v = 0; else { const d = y / ROWS; const r = Math.random(); if (r < 0.04 + d * 0.06 && y > 6) v = 7; else if (r < 0.06 + d * 0.1 && y > 14) v = 6; else if (r < 0.1 + d * 0.16 && y > 8) v = 5; else if (r < 0.18 + d * 0.15 && y > 3) v = 4; else if (r < 0.3) v = 3; else if (r < 0.3 + d * 0.5) v = 2; else v = 1; } map[y].push(v); } }
        map[1][4] = 1; map[0][4] = 0;
        for (const k of ['Up', 'Down', 'Left', 'Right']) bindHeldButton(container.querySelector('#vm' + k), (v) => { held[k.toLowerCase()] = v; });
        let swipe = null; canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; }); canvas.addEventListener('pointermove', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; if (Math.hypot(dx, dy) < 14) return; held = { up: false, down: false, left: false, right: false }; if (Math.abs(dx) > Math.abs(dy)) held[dx > 0 ? 'right' : 'left'] = true; else held[dy > 0 ? 'down' : 'up'] = true; swipe.tap = true; setTimeout(() => { held = { up: false, down: false, left: false, right: false }; }, 450); swipe = null; }); canvas.addEventListener('pointerup', () => { swipe = null; });
        function update(dt, now) {
          if (invuln > 0) invuln -= dt;
          const dir = held.down ? [0, 1] : held.up ? [0, -1] : held.left ? [-1, 0] : held.right ? [1, 0] : null;
          if (!dir) { dig = null; }
          else {
            const tx = px + dir[0], ty = py + dir[1];
            if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) { dig = null; }
            else if (map[ty][tx] === 0 || map[ty][tx] === 7) { // うつる
              if (!dig || dig.tx !== tx || dig.ty !== ty || dig.move) { dig = { tx, ty, move: true, t: 0 }; }
              dig.t += dt * 6; if (dig.t >= 1) { px = tx; py = ty; dig = null; if (map[py][px] === 7) hurt(); }
            } else {
              if (!dig || dig.tx !== tx || dig.ty !== ty || dig.move) dig = { tx, ty, move: false, t: 0 };
              dig.t += dt / HARD[map[ty][tx]]; if (dig.t >= 1) { const v = map[ty][tx]; map[ty][tx] = 0; sfx(VAL[v] ? 'coin' : 'hit'); if (VAL[v]) { score += VAL[v]; loot[['', '', '', 'coal', 'iron', 'gold', 'gem'][v]]++; say(NAME[v], 700); hud(); } for (let i = 0; i < 8; i++) parts.push({ x: tx + 0.5, y: ty + 0.5, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.8) * 4, life: 0.5, color: v === 6 ? '#8ff' : v === 5 ? '#fc3' : v === 2 ? '#999' : '#8b5a2b' }); dig = null; }
            }
          }
          // したが くうきなら おちる
          if (!dig && py + 1 < ROWS && map[py + 1][px] === 0 && !held.up) { py += 1; if (map[py][px] === 7) hurt(); }
          depthMax = Math.max(depthMax, py);
          camY += (Math.max(0, py - 3) - camY) * Math.min(1, dt * 6);
          for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 9 * dt; p.life -= dt; } parts = parts.filter((p) => p.life > 0);
        }
        function hurt() { if (invuln > 0) return; hp--; invuln = 1.5; say('🔥マグマでやけど!', 1000); hud(); if (hp <= 0) { finish('たおれた…'); return; } // うえに にげる
          if (py > 0) { map[py][px] = 0; } }
        function block(x, y, v, now) {
          const sx = x * CELL, sy = (y - camY) * CELL; if (sy < -CELL || sy > H) return;
          const dark = clamp(1 - (Math.abs(x - px) + Math.abs(y - py)) / 6, 0.15, 1);
          let top, side; if (v === 1) { top = '#9c6b3f'; side = '#7a4f2a'; } else if (v === 2) { top = '#9aa3ad'; side = '#6b737c'; } else if (v === 7) { top = '#ff7b2e'; side = '#c8471a'; } else { top = '#8b8f96'; side = '#5f636a'; }
          ctx.fillStyle = side; ctx.fillRect(sx, sy, CELL, CELL); ctx.fillStyle = top; ctx.fillRect(sx + 1, sy + 1, CELL - 2, CELL * 0.55); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(sx + CELL - 4, sy + 1, 3, CELL - 2);
          if (v >= 3 && v <= 6) { ctx.font = `${Math.round(CELL * 0.55)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(['', '', '', '⚫', '⛓', '🟡', '💎'][v], sx + CELL / 2, sy + CELL / 2 + 1); }
          if (v === 7) { ctx.fillStyle = `rgba(255,230,120,${0.3 + 0.2 * Math.sin(now / 200 + x)})`; ctx.fillRect(sx + 3, sy + CELL * 0.4, CELL - 6, 3); }
          ctx.fillStyle = `rgba(0,0,0,${(1 - dark) * 0.85})`; ctx.fillRect(sx, sy, CELL, CELL);
        }
        function render(now) {
          if (!ctx) return;
          const skyH = Math.max(0, (1 - camY) * CELL); const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1a1a24'); bg.addColorStop(1, '#0d0d14'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          if (skyH > 0) { const sky = ctx.createLinearGradient(0, 0, 0, skyH); sky.addColorStop(0, '#6fb6ff'); sky.addColorStop(1, '#cfe9ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, skyH); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(W * 0.8, skyH * 0.4, 10, 0, Math.PI * 2); ctx.fill(); ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('🌳', W * 0.15, skyH); ctx.fillText('⛏️', W * 0.9, skyH); }
          const y0 = Math.max(0, Math.floor(camY) - 1), y1 = Math.min(ROWS - 1, y0 + VIEW_ROWS);
          for (let y = y0; y <= y1; y++) for (let x = 0; x < COLS; x++) { const v = map[y][x]; if (v === 0) { if (y > 0) { ctx.fillStyle = `rgba(60,40,30,${clamp(1 - (Math.abs(x - px) + Math.abs(y - py)) / 6, 0.1, 0.6)})`; ctx.fillRect(x * CELL, (y - camY) * CELL, CELL, CELL); } continue; } block(x, y, v, now); }
          if (dig && !dig.move) { const sx = dig.tx * CELL, sy = (dig.ty - camY) * CELL; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.strokeRect(sx + 2, sy + 2, CELL - 4, CELL - 4); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(sx + 3, sy + CELL - 8, CELL - 6, 5); ctx.fillStyle = '#ffd23f'; ctx.fillRect(sx + 3, sy + CELL - 8, (CELL - 6) * clamp(dig.t, 0, 1), 5); }
          const ppx = (dig && dig.move ? lerp(px, dig.tx, dig.t) : px), ppy = (dig && dig.move ? lerp(py, dig.ty, dig.t) : py);
          if (invuln <= 0 || Math.floor(now / 90) % 2) { ctx.font = `${Math.round(CELL * 0.85)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentSprite(), (ppx + 0.5) * CELL, (ppy + 0.5 - camY) * CELL + 1); ctx.font = `${Math.round(CELL * 0.45)}px sans-serif`; ctx.fillText('⛏️', (ppx + (held.left ? 0.1 : 0.9)) * CELL, (ppy + 0.3 - camY) * CELL); }
          for (const p of parts) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x * CELL - 2, (p.y - camY) * CELL - 2, 4, 4); } ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(0,0,0,.45)'; mgRoundRect(ctx, W - 64, 6, 58, 16, 8); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`ふかさ${py}m`, W - 35, 14);
          ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '10px sans-serif'; ctx.fillText(`⚫${loot.coal} ⛓${loot.iron} 🟡${loot.gold} 💎${loot.gem}`, 6, 14);
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('ほりはじめ!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 80, H - 34, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 21); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now); if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish(reason) {
          if (!running) return; running = false; cancelAnimationFrame(rafId); container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const final = clamp(Math.round(10 + score / 3.2 + depthMax * 0.5 + (reason ? 0 : hp * 2)), 10, 100);
          say(reason ? `${reason} ${score}pt` : `⛏️おわり!${score}ptふかさ${depthMax}m`, 2600); render(performance.now());
          setTimeout(() => onComplete(final), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const VOXEL_MINE_VARIANTS = [mg('voxel-mine', makeVoxelMineGame({ title: 'ボクセルマイニング!ほってお宝をさがそう' }))];

  // --- かいてんずし: レーンを ながれる おさらの なかから ちゅうもんの ネタを タップで とる。
  //     ちがう おさらは ペナルティ。🌶は わさびトラップ ---
  function makeSushiBeltGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(60000);
        const MENU = ['🍣', '🍤', '🍙', '🍮', '🥚', '🍵', '🐟', '🦑'];
        let running = true, rafId = null, last = null, plates = [], order = [], served = 0, wrong = 0, score = 0, combo = 0, spawnCd = 0.3, msg = '', msgUntil = 0, speed = lerp(70, 95, difficulty), popups = [], orderNo = 0, orderStart = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="sbTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="sbScore">0pt</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="sbCanvas"></canvas></div>
          <div class="mg-hint" id="sbHint">うえの「ちゅうもん」とおなじネタのおさらを、レーンからタップしてとる。ちがうおさらや🌶わさびはペナルティ。はやくそろえるとボーナス</div>`;
        const canvas = container.querySelector('#sbCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 240);
        const timerEl = container.querySelector('#sbTimer'), scoreEl = container.querySelector('#sbScore'), hint = container.querySelector('#sbHint');
        const say = (t, ms = 800) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `${score}pt`; };
        const LANES = [{ y: H * 0.5, dir: 1, scale: 0.85 }, { y: H * 0.78, dir: -1, scale: 1.1 }];
        function newOrder() { const n = Math.min(4, 2 + Math.floor(orderNo / 2)); order = []; for (let i = 0; i < n; i++) order.push({ item: MENU[Math.floor(Math.random() * Math.min(MENU.length, 4 + orderNo))], done: false }); orderStart = performance.now(); orderNo++; }
        newOrder();
        function spawn() { const lane = Math.floor(Math.random() * LANES.length); const L = LANES[lane]; const need = order.filter((o) => !o.done).map((o) => o.item); const wasabi = Math.random() < lerp(0.08, 0.14, difficulty); const item = wasabi ? '🌶' : (Math.random() < 0.45 && need.length ? need[Math.floor(Math.random() * need.length)] : MENU[Math.floor(Math.random() * Math.min(MENU.length, 4 + orderNo))]); plates.push({ lane, x: L.dir > 0 ? -30 : W + 30, item, taken: false, color: ['#e63946', '#3a86ff', '#ffd23f', '#2a9d8f', '#8338ec'][Math.floor(Math.random() * 5)] }); }
        canvas.addEventListener('pointerdown', (e) => {
          e.preventDefault(); if (!running || performance.now() < startTime) return; const p = mgPointerPos(canvas, e);
          let best = null, bd = 1e9; for (const pl of plates) { if (pl.taken) continue; const L = LANES[pl.lane]; const d = Math.hypot(pl.x - p.x, L.y - 6 - p.y); if (d < 26 * L.scale && d < bd) { bd = d; best = pl; } }
          if (!best) return; best.taken = true; best.takenAt = performance.now();
          if (best.item === '🌶') { score = Math.max(0, score - 15); combo = 0; sfx('bad'); say('🌶わさび!からい〜', 900); popups.push({ x: best.x, y: LANES[best.lane].y - 20, t: 'からい!', born: performance.now(), color: '#ff6b6b' }); hud(); return; }
          const o = order.find((q) => !q.done && q.item === best.item);
          if (o) { o.done = true; combo++; sfx('coin'); const gain = 10 + combo * 2; score += gain; popups.push({ x: best.x, y: LANES[best.lane].y - 20, t: `+${gain}`, born: performance.now(), color: '#fff' }); if (order.every((q) => q.done)) { served++; const fast = performance.now() - orderStart < 6000; const bonus = fast ? 25 : 10; score += bonus; say(fast ? `⚡はやい!ちゅうもんかんりょう+${bonus}` : `✅ちゅうもんかんりょう+${bonus}`, 1000); newOrder(); } hud(); }
          else { wrong++; combo = 0; score = Math.max(0, score - 8); sfx('bad'); say('❌ちがうおさら', 700); popups.push({ x: best.x, y: LANES[best.lane].y - 20, t: '-8', born: performance.now(), color: '#ff6b6b' }); hud(); }
        });
        function update(dt, now) {
          spawnCd -= dt; if (spawnCd <= 0) { spawn(); spawnCd = lerp(1.1, 0.8, difficulty) + Math.random() * 0.4; }
          speed = Math.min(lerp(120, 150, difficulty), speed + dt * 0.8);
          for (const pl of plates) { const L = LANES[pl.lane]; pl.x += L.dir * speed * L.scale * dt; }
          plates = plates.filter((pl) => (!pl.taken || now - pl.takenAt < 300) && pl.x > -60 && pl.x < W + 60);
          popups = popups.filter((p) => now - p.born < 800);
        }
        function plate(pl, now) {
          const L = LANES[pl.lane]; const s = L.scale; let y = L.y; let a = 1;
          if (pl.taken) { const t = (now - pl.takenAt) / 300; y -= t * 30; a = 1 - t; }
          ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(pl.x, y + 8 * s, 22 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(pl.x, y + 4 * s, 22 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = pl.color; ctx.lineWidth = 2.5 * s; ctx.stroke();
          ctx.font = `${Math.round(22 * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pl.item, pl.x, y - 6 * s); ctx.globalAlpha = 1;
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#f5e9d5'; ctx.fillRect(0, 0, W, H);
          // のれん と ちゅうもん
          ctx.fillStyle = '#b23a48'; ctx.fillRect(0, 0, W, 54); ctx.fillStyle = 'rgba(255,255,255,.15)'; for (let i = 0; i < 6; i++) ctx.fillRect(i * W / 6 + 2, 0, 2, 54);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`ちゅうもん${orderNo}`, 8, 6);
          order.forEach((o, i) => { const x = 14 + i * 40, y = 20; ctx.fillStyle = o.done ? 'rgba(255,255,255,.35)' : '#fff'; mgRoundRect(ctx, x, y, 34, 30, 6); ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = o.done ? 0.4 : 1; ctx.fillText(o.item, x + 17, y + 16); ctx.globalAlpha = 1; if (o.done) { ctx.fillStyle = '#2a9d8f'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('✓', x + 17, y + 15); } });
          const el = clamp(1 - (now - orderStart) / 6000, 0, 1); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(W - 60, 10, 50, 6); ctx.fillStyle = el > 0 ? '#ffd23f' : '#aaa'; ctx.fillRect(W - 60, 10, 50 * el, 6); ctx.fillStyle = '#fff'; ctx.font = '8px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('はやさボーナス', W - 10, 18);
          // レーン
          for (const L of LANES) { const h = 26 * L.scale; ctx.fillStyle = '#444b55'; ctx.fillRect(0, L.y - h / 2 + 6, W, h); ctx.fillStyle = '#5a626d'; for (let i = -1; i < W / 18 + 1; i++) { const off = (now / 1000 * speed * L.scale * L.dir) % 18; ctx.fillRect(i * 18 + off, L.y - h / 2 + 8, 10, h - 4); } ctx.fillStyle = '#2e333b'; ctx.fillRect(0, L.y + h / 2 + 4, W, 3); }
          const sorted = plates.slice().sort((a, b) => a.lane - b.lane); for (const pl of sorted) plate(pl, now);
          for (const p of popups) { const t = (now - p.born) / 800; ctx.globalAlpha = 1 - t; ctx.fillStyle = p.color; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; ctx.strokeText(p.t, p.x, p.y - t * 20); ctx.fillText(p.t, p.x, p.y - t * 20); ctx.globalAlpha = 1; }
          ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(currentSprite(), W - 24, H - 4); ctx.fillText('🧑‍🍳', 24, H - 4);
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('へいらっしゃい!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 95, 58, 190, 24); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 70); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const final = clamp(Math.round(10 + score / 4 + served * 3), 10, 100);
          say(`おわり!${served}けんさばいた${score}pt`, 2600); render(performance.now());
          setTimeout(() => onComplete(final), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const SUSHI_BELT_VARIANTS = [mg('sushi-belt', makeSushiBeltGame({ title: 'かいてんずし!注文どおりに取ろう' }))];

  // ================================================================
  // 新作バッチ5(2026-09-09): アステロイド / ヨット(サイコロ) / ライツアウト / ドゥードルジャンプ
  // ================================================================

  // --- アステロイド: ◀▶で きたいを まわし、▲で ふんしゃ、🔥で はっしゃ。
  //     いわは わると ちいさくなる。がめんの はしは つながっている ---
  function makeAsteroidsGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(75000);
        let running = true, rafId = null, last = null, held = { left: false, right: false, thrust: false }, ship = { x: 0, y: 0, vx: 0, vy: 0, a: -Math.PI / 2 }, rocks = [], bullets = [], parts = [], lives = 3, score = 0, destroyed = 0, msg = '', msgUntil = 0, fireCd = 0, invuln = 2, wave = 1;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="asTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="asScore">❤️❤️❤️／0pt</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="asCanvas"></canvas></div>
          <div class="mg-hint" id="asHint">◀▶でまわり、▲ながおしですすむ。🔥かがめんタップでうつ。いわをわると、小さくはやくなる。がめんのはしはつながっている</div>
          <div class="mg-gunner-controls"><button class="mg-tap-btn mg-hold-btn" id="asLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="asThrust" data-key="up">▲</button><button class="mg-tap-btn primary" id="asFire" data-key="action">🔥</button><button class="mg-tap-btn mg-hold-btn" id="asRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#asCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        ship.x = W / 2; ship.y = H / 2;
        const timerEl = container.querySelector('#asTimer'), scoreEl = container.querySelector('#asScore'), hint = container.querySelector('#asHint');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `${'❤️'.repeat(Math.max(0, lives))}／${score}pt`; };
        bindHeldButton(container.querySelector('#asLeft'), (v) => { held.left = v; });
        bindHeldButton(container.querySelector('#asRight'), (v) => { held.right = v; });
        bindHeldButton(container.querySelector('#asThrust'), (v) => { held.thrust = v; });
        container.querySelector('#asFire').addEventListener('pointerdown', (e) => { e.preventDefault(); fire(); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); fire(); });
        const wrap = (o) => { if (o.x < -20) o.x += W + 40; if (o.x > W + 20) o.x -= W + 40; if (o.y < -20) o.y += H + 40; if (o.y > H + 20) o.y -= H + 40; };
        function spawnRock(size, x, y) { const r = size === 3 ? 26 : size === 2 ? 16 : 9; const a = Math.random() * Math.PI * 2; const sp = lerp(30, 45, difficulty) * (4 - size) * 0.8 + 20; const pts = []; const n = 9; for (let i = 0; i < n; i++) pts.push(0.7 + Math.random() * 0.4); rocks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, size, pts, rot: 0, rs: (Math.random() - 0.5) * 2 }); }
        function spawnWave() { const n = 2 + wave; for (let i = 0; i < n; i++) { let x, y; do { x = Math.random() * W; y = Math.random() * H; } while (Math.hypot(x - ship.x, y - ship.y) < 90); spawnRock(3, x, y); } }
        spawnWave();
        function fire() { if (!running || fireCd > 0 || performance.now() < startTime) return; fireCd = 0.28; bullets.push({ x: ship.x + Math.cos(ship.a) * 12, y: ship.y + Math.sin(ship.a) * 12, vx: Math.cos(ship.a) * 330 + ship.vx * 0.3, vy: Math.sin(ship.a) * 330 + ship.vy * 0.3, life: 0.9 }); }
        function burst(x, y, n, color) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6, color }); } }
        function update(dt, now) {
          if (fireCd > 0) fireCd -= dt; if (invuln > 0) invuln -= dt;
          if (held.left) ship.a -= dt * 3.6; if (held.right) ship.a += dt * 3.6;
          if (held.thrust) { ship.vx += Math.cos(ship.a) * 220 * dt; ship.vy += Math.sin(ship.a) * 220 * dt; if (Math.random() < 0.6) parts.push({ x: ship.x - Math.cos(ship.a) * 12, y: ship.y - Math.sin(ship.a) * 12, vx: -Math.cos(ship.a) * 80 + (Math.random() - 0.5) * 40, vy: -Math.sin(ship.a) * 80 + (Math.random() - 0.5) * 40, life: 0.3, color: '#ffb347' }); }
          const sp = Math.hypot(ship.vx, ship.vy); if (sp > 230) { ship.vx *= 230 / sp; ship.vy *= 230 / sp; } ship.vx *= Math.pow(0.5, dt); ship.vy *= Math.pow(0.5, dt);
          ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship);
          for (const r of rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.rs * dt; wrap(r); }
          for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; wrap(b); }
          for (const b of bullets) { if (b.life <= 0) continue; for (const r of rocks) { if (r.dead || Math.hypot(r.x - b.x, r.y - b.y) > r.r) continue; b.life = 0; r.dead = true; destroyed++; sfx('hit'); score += r.size === 3 ? 20 : r.size === 2 ? 50 : 100; burst(r.x, r.y, 8, '#bbb'); if (r.size > 1) { spawnRock(r.size - 1, r.x, r.y); spawnRock(r.size - 1, r.x, r.y); } hud(); break; } }
          bullets = bullets.filter((b) => b.life > 0); rocks = rocks.filter((r) => !r.dead);
          if (!rocks.length) { wave++; say(`🌊ウェーブ${wave}!`, 1200); spawnWave(); }
          if (invuln <= 0) for (const r of rocks) { if (Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + 9) { lives--; invuln = 2; burst(ship.x, ship.y, 16, '#ff6b6b'); ship.x = W / 2; ship.y = H / 2; ship.vx = ship.vy = 0; say('💥ぶつかった!', 1000); hud(); if (lives <= 0) { finish(); return; } break; } }
          for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } parts = parts.filter((p) => p.life > 0);
        }
        function drawShip(x, y, a) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, 9); ctx.lineTo(-6, 0); ctx.lineTo(-10, -9); ctx.closePath(); ctx.stroke(); ctx.fillStyle = 'rgba(80,160,255,.35)'; ctx.fill(); ctx.rotate(-a); ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentSprite(), 0, 0); ctx.restore(); }
        function render(now) {
          if (!ctx) return;
          mgSpaceBackdrop(ctx, W, H, now, { planet: [W - 40, 44, 16, '#ffb27a', '#7a3a4a'] });
          for (const r of rocks) { ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot); ctx.strokeStyle = '#d8d8e0'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(120,120,140,.35)'; ctx.beginPath(); r.pts.forEach((k, i) => { const a = i / r.pts.length * Math.PI * 2; const px = Math.cos(a) * r.r * k, py = Math.sin(a) * r.r * k; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
          for (const b of bullets) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2); ctx.fill(); }
          for (const p of parts) { ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); } ctx.globalAlpha = 1;
          if (invuln <= 0 || Math.floor(now / 100) % 2) drawShip(ship.x, ship.y, ship.a);
          ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(`WAVE ${wave}`, W - 8, 8);
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('スタート!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 80, 14, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 27); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now); if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const final = clamp(Math.round(8 + score / 18 + lives * 4), 8, 100);
          say(lives <= 0 ? `💥きたいそうしつ…${score}pt` : `おわり!${score}ptいわ${destroyed}こ`, 2600); render(performance.now());
          setTimeout(() => onComplete(final), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const ASTEROIDS_VARIANTS = [mg('asteroids-classic', makeAsteroidsGame({ title: 'アステロイド!まわしてふんしゃしていわをくだけ' }))];

  // --- ヨット(サイコロ): 5この サイコロを 3かいまで ふり、やくを えらぶ。6ターン ---
  function makeYachtDiceGame({ title }) {
    return {
      start(container, onComplete) {
        const TURNS = 6;
        const CATS = [
          { id: 'ones', name: '1のめ', f: (d) => d.filter((v) => v === 1).length * 1 },
          { id: 'twos', name: '2のめ', f: (d) => d.filter((v) => v === 2).length * 2 },
          { id: 'threes', name: '3のめ', f: (d) => d.filter((v) => v === 3).length * 3 },
          { id: 'fours', name: '4のめ', f: (d) => d.filter((v) => v === 4).length * 4 },
          { id: 'fives', name: '5のめ', f: (d) => d.filter((v) => v === 5).length * 5 },
          { id: 'sixes', name: '6のめ', f: (d) => d.filter((v) => v === 6).length * 6 },
          { id: 'three', name: 'スリーカード', f: (d) => (Math.max(...counts(d)) >= 3 ? sum(d) : 0) },
          { id: 'four', name: 'フォーカード', f: (d) => (Math.max(...counts(d)) >= 4 ? sum(d) : 0) },
          { id: 'full', name: 'フルハウス', f: (d) => { const c = counts(d).filter((x) => x).sort(); return c.length === 2 && c[0] === 2 ? 25 : 0; } },
          { id: 'sstr', name: 'Sストレート', f: (d) => { const s = [...new Set(d)].sort().join(''); return /1234|2345|3456/.test(s) ? 30 : 0; } },
          { id: 'lstr', name: 'Lストレート', f: (d) => { const s = [...new Set(d)].sort().join(''); return s === '12345' || s === '23456' ? 40 : 0; } },
          { id: 'yacht', name: 'ヨット!', f: (d) => (Math.max(...counts(d)) === 5 ? 50 : 0) },
          { id: 'chance', name: 'チャンス', f: (d) => sum(d) },
        ];
        function counts(d) { const c = [0, 0, 0, 0, 0, 0, 0]; for (const v of d) c[v]++; return c.slice(1); }
        function sum(d) { return d.reduce((a, b) => a + b, 0); }
        let running = true, rafId = null, dice = [1, 2, 3, 4, 5], heldD = [false, false, false, false, false], rolls = 0, turn = 0, used = {}, total = 0, rolling = 0, msg = '', msgUntil = 0, rollAnim = [];
        container.innerHTML = `
          <div class="mg-header"><span id="ydTurn">1/${TURNS}ターン</span><span id="ydScore">ごうけい0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="ydCanvas"></canvas></div>
          <div class="mg-hint" id="ydHint">「ふる」は1ターンに全部で3回。サイコロをタップでキープし、残りだけふりなおす。やくをタップできろく。同じやくは1回だけ</div>
          <div class="mg-race-controls"><button class="mg-tap-btn primary" id="ydRoll" data-key="action">🎲ふる(3かい)</button></div>`;
        const canvas = container.querySelector('#ydCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 300);
        const turnEl = container.querySelector('#ydTurn'), scoreEl = container.querySelector('#ydScore'), hint = container.querySelector('#ydHint'), rollBtn = container.querySelector('#ydRoll');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { turnEl.textContent = `${Math.min(TURNS, turn + 1)}/${TURNS}ターン`; scoreEl.textContent = `ごうけい${total}`; rollBtn.textContent = rolls >= 3 ? 'やくをえらんで' : `🎲ふる(のこり${3 - rolls}かい)`; rollBtn.disabled = rolls >= 3; };
        const DICE_Y = 26, DS = 34, LIST_Y = 78, ROW = (H - LIST_Y - 4) / 7;
        function roll() { if (!running || rolls >= 3 || rolling) return; rolls++; rolling = 1; sfx('whoosh'); rollAnim = dice.map((v, i) => (heldD[i] ? null : { at: performance.now() })); setTimeout(() => { if (!running) return; dice = dice.map((v, i) => (heldD[i] ? v : 1 + Math.floor(Math.random() * 6))); rolling = 0; rollAnim = []; hud(); if (rolls >= 3) say('やくをえらんできろく!', 1200); }, 450); hud(); }
        rollBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); roll(); });
        canvas.addEventListener('pointerdown', (e) => {
          e.preventDefault(); if (!running || rolling) return; const p = mgPointerPos(canvas, e);
          if (p.y < LIST_Y) { const i = Math.floor((p.x - (W - 5 * (DS + 8)) / 2) / (DS + 8)); if (i >= 0 && i < 5 && rolls > 0) { heldD[i] = !heldD[i]; sfx('tick'); } return; }
          if (rolls === 0) { say('まずサイコロをふろう', 900); return; }
          const col = p.x < W / 2 ? 0 : 1, row = Math.floor((p.y - LIST_Y) / ROW); const idx = col * 7 + row; if (idx < 0 || idx >= CATS.length) return; const cat = CATS[idx]; if (used[cat.id] != null) { say('そのやくはもうつかった', 800); return; }
          const pts = cat.f(dice); used[cat.id] = pts; total += pts; sfx(pts >= 25 ? 'coin' : pts ? 'pop' : 'bad'); say(pts ? `${cat.name} +${pts}!` : `${cat.name} 0てん…`, 1300);
          turn++; if (turn >= TURNS) { hud(); setTimeout(finish, 1200); return; }
          rolls = 0; heldD = [false, false, false, false, false]; hud();
        });
        function die(x, y, v, held, anim) {
          ctx.fillStyle = 'rgba(0,0,0,.25)'; mgRoundRect(ctx, x + 2, y + 3, DS, DS, 6); ctx.fillStyle = held ? '#ffe9a8' : '#fff'; mgRoundRect(ctx, x, y, DS, DS, 6); ctx.strokeStyle = held ? '#e0a800' : '#999'; ctx.lineWidth = held ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, DS - 1, DS - 1);
          const shown = anim ? 1 + Math.floor(Math.random() * 6) : v; const pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[shown];
          ctx.fillStyle = shown === 1 ? '#d62828' : '#222'; for (const [px, py] of pips) { ctx.beginPath(); ctx.arc(x + DS / 2 + px * DS * 0.26, y + DS / 2 + py * DS * 0.26, DS * 0.08, 0, Math.PI * 2); ctx.fill(); }
          if (held) { ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('🔒', x + DS / 2, y + DS + 2); }
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#1f6f45'; ctx.fillRect(0, 0, W, H); const g = ctx.createRadialGradient(W / 2, 40, 10, W / 2, 40, W); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          const x0 = (W - 5 * (DS + 8)) / 2 + 4; dice.forEach((v, i) => die(x0 + i * (DS + 8), DICE_Y - 6, v, heldD[i], rolling && !heldD[i]));
          ctx.fillStyle = 'rgba(255,255,255,.9)'; mgRoundRect(ctx, 6, LIST_Y - 2, W - 12, H - LIST_Y - 2, 8);
          for (let i = 0; i < CATS.length; i++) { const col = i < 7 ? 0 : 1, row = i % 7; const x = 10 + col * (W - 12) / 2, y = LIST_Y + row * ROW; const cat = CATS[i]; const done = used[cat.id] != null; const preview = rolls > 0 && !done ? cat.f(dice) : null;
            if (done) { ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(x - 2, y + 1, (W - 12) / 2 - 4, ROW - 2); } else if (preview) { ctx.fillStyle = 'rgba(42,157,143,.18)'; ctx.fillRect(x - 2, y + 1, (W - 12) / 2 - 4, ROW - 2); }
            ctx.fillStyle = done ? '#999' : '#222'; ctx.font = `${done ? '' : 'bold '}10px sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(cat.name, x + 2, y + ROW / 2);
            ctx.textAlign = 'right'; ctx.fillStyle = done ? '#555' : preview ? '#2a9d8f' : '#bbb'; ctx.fillText(done ? String(used[cat.id]) : preview != null ? String(preview) : '-', x + (W - 12) / 2 - 8, y + ROW / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(W / 2 - 90, H / 2 - 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; render(now); rafId = requestAnimationFrame(loop); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId); rollBtn.disabled = true;
          const score = clamp(Math.round(10 + total * 0.55), 10, 100);
          say(`おわり!ごうけい${total}てん`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const YACHT_DICE_VARIANTS = [mg('yacht-dice', makeYachtDiceGame({ title: 'ヨット!サイコロでやくをそろえよう' }))];

  // --- ライツアウト(5×5): タップすると そのマスと 上下左右が はんてん。ぜんぶ けそう ---
  function makeLightsOutGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 5, ROUNDS = 3, DURATION_MS = mgDuration(150000);
        let running = true, rafId = null, grid, round = 0, moves = 0, par = 0, solved = 0, totalMoves = 0, flips = [], msg = '', msgUntil = 0, solvedAt = 0, totalPar = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="loRound">1/${ROUNDS}もんめ</span><span id="loMoves">て0／さいてい?</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="loCanvas"></canvas></div>
          <div class="mg-hint" id="loHint">タップしたマスと、上下左右のライトがはんてんする。ぜんぶ消せばクリア。「さいてい」の手数をめざそう</div>`;
        const canvas = container.querySelector('#loCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const PAD = 14, CELL = (W - PAD * 2) / N;
        const roundEl = container.querySelector('#loRound'), movesEl = container.querySelector('#loMoves'), hint = container.querySelector('#loHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { roundEl.textContent = `${Math.min(ROUNDS, round + 1)}/${ROUNDS}もんめ`; movesEl.textContent = `て${moves}／さいてい${par}`; };
        function press(x, y, anim) { if (anim) sfx('tick'); for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; grid[ny][nx] = !grid[ny][nx]; if (anim) flips.push({ x: nx, y: ny, at: performance.now() }); } }
        function gen() { grid = Array.from({ length: N }, () => Array(N).fill(false)); const n = Math.round(lerp(3, 6, difficulty)) + round; const used = new Set(); let k = 0; while (k < n) { const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N); const key = x + ',' + y; if (used.has(key)) continue; used.add(key); press(x, y, false); k++; } par = n; totalPar += n; moves = 0; solvedAt = 0; if (grid.every((r) => r.every((v) => !v))) gen(); }
        gen(); hud();
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || solvedAt) return; const p = mgPointerPos(canvas, e); const x = Math.floor((p.x - PAD) / CELL), y = Math.floor((p.y - PAD) / CELL); if (x < 0 || y < 0 || x >= N || y >= N) return; press(x, y, true); moves++; totalMoves++; hud(); if (grid.every((r) => r.every((v) => !v))) { solvedAt = performance.now(); solved++; say(moves <= par ? '✨さいてい手数でクリア!' : `クリア!${moves}手`, 1500); setTimeout(() => { if (!running) return; round++; if (round >= ROUNDS) { finish(); return; } gen(); hud(); }, 1600); } });
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#12131f'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const px = PAD + x * CELL, py = PAD + y * CELL; const on = grid[y][x]; const f = flips.find((q) => q.x === x && q.y === y); const t = f ? clamp((now - f.at) / 180, 0, 1) : 1; const s = 1 - Math.sin(t * Math.PI) * 0.18;
            ctx.save(); ctx.translate(px + CELL / 2, py + CELL / 2); ctx.scale(s, s);
            if (on) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 16; const g = ctx.createRadialGradient(0, 0, 2, 0, 0, CELL * 0.5); g.addColorStop(0, '#fff6c8'); g.addColorStop(1, '#ffb703'); ctx.fillStyle = g; } else { ctx.shadowBlur = 0; ctx.fillStyle = '#2a2c3d'; }
            mgRoundRect(ctx, -CELL / 2 + 4, -CELL / 2 + 4, CELL - 8, CELL - 8, 8); ctx.shadowBlur = 0; ctx.strokeStyle = on ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.5; ctx.strokeRect(-CELL / 2 + 4.5, -CELL / 2 + 4.5, CELL - 9, CELL - 9); ctx.restore(); }
          flips = flips.filter((q) => now - q.at < 200);
          if (solvedAt) { const t = clamp((now - solvedAt) / 400, 0, 1); ctx.fillStyle = `rgba(255,255,255,${0.15 * t})`; ctx.fillRect(0, 0, W, H); ctx.font = `${Math.round(48 * t)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✨', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(W / 2 - 90, 4, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 17); }
        }
        function loop(now) { if (!running) return; render(now); if (now - startTime > DURATION_MS) { finish(); return; } rafId = requestAnimationFrame(loop); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const eff = solved ? clamp(1 - Math.max(0, totalMoves - totalPar) / Math.max(6, totalPar * 2), 0, 1) : 0;
          const score = clamp(Math.round(10 + solved * 24 + eff * 18), 10, 100);
          say(solved >= ROUNDS ? `🏆ぜんぶけした!${totalMoves}手(さいてい${totalPar})` : `おわり!${solved}もんクリア`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const LIGHTS_OUT_VARIANTS = [mg('lights-out', makeLightsOutGame({ title: 'ライツアウト!ぜんぶのライトをけそう' }))];

  // --- ドゥードルジャンプ: じどうで はねる。◀▶(か ドラッグ)で いどう。うえへ うえへ!
  //     うごく だい、こわれる だい、バネ。おちたら おわり ---
  function makeDoodleJumpGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(70000), G = 900;
        let running = true, rafId = null, last = null, leftHeld = false, rightHeld = false, drag = null, p = { x: 0, y: 0, vx: 0, vy: 0 }, plats = [], camY = 0, best = 0, msg = '', msgUntil = 0, dead = 0, coins = 0, nextY = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="djTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="djScore">📏 0m／⭐ 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="djCanvas"></canvas></div>
          <div class="mg-hint" id="djHint">◀▶かよこドラッグで動き、だいにおりよう。ジャンプはじどう。みどりはふつう、あおは動く、茶色は1回でこわれる。🔴バネは大ジャンプ。左右のはしはつながっている</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="djLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="djRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#djCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * 1.3));
        const timerEl = container.querySelector('#djTimer'), scoreEl = container.querySelector('#djScore'), hint = container.querySelector('#djHint');
        const say = (t, ms = 800) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `📏 ${Math.round(best / 10)}m／⭐ ${coins}`; };
        bindHeldButton(container.querySelector('#djLeft'), (v) => { leftHeld = v; });
        bindHeldButton(container.querySelector('#djRight'), (v) => { rightHeld = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const q = mgPointerPos(canvas, e); drag = { id: e.pointerId, x: q.x, px: p.x }; });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const q = mgPointerPos(canvas, e); p.x = drag.px + (q.x - drag.x) * 1.4; });
        const endDrag = () => { drag = null; }; canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
        const PW = 52;
        function addPlat(y) { const r = Math.random(); const kind = r < lerp(0.6, 0.45, difficulty) ? 'normal' : r < 0.78 ? 'move' : r < 0.92 ? 'break' : 'normal'; const pl = { x: 20 + Math.random() * (W - PW - 40), y, kind, vx: (Math.random() < 0.5 ? -1 : 1) * lerp(40, 80, difficulty), spring: kind === 'normal' && Math.random() < 0.15, coin: Math.random() < 0.25 && kind !== 'break', broken: false }; plats.push(pl); }
        p.x = W / 2; p.y = H - 60; plats.push({ x: W / 2 - PW / 2, y: H - 30, kind: 'normal', vx: 0 }); nextY = H - 30;
        while (nextY > -H) { nextY -= lerp(48, 62, difficulty) + Math.random() * 18; addPlat(nextY); }
        function update(dt, now) {
          const steer = (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0); if (steer) p.vx += steer * 1400 * dt; p.vx *= Math.pow(0.02, dt); p.vx = clamp(p.vx, -260, 260); if (!drag) p.x += p.vx * dt;
          if (p.x < -10) p.x += W + 20; if (p.x > W + 10) p.x -= W + 20;
          const prevY = p.y; p.vy += G * dt; p.y += p.vy * dt;
          for (const pl of plats) { if (pl.kind === 'move') { pl.x += pl.vx * dt; if (pl.x < 4 || pl.x > W - PW - 4) pl.vx *= -1; } if (pl.broken) { pl.y += 300 * dt; continue; }
            if (p.vy > 0 && p.x > pl.x - 10 && p.x < pl.x + PW + 10 && prevY + 14 <= pl.y + 4 && p.y + 14 >= pl.y) { sfx('jump'); if (pl.kind === 'break') { pl.broken = true; p.vy = -420; say('💥こわれた!', 500); } else { p.vy = pl.spring ? -880 : -560; if (pl.spring) say('🔴バネ!びよーん', 600); } p.y = pl.y - 14; }
            if (pl.coin && Math.hypot(p.x - (pl.x + PW / 2), p.y - (pl.y - 22)) < 20) { pl.coin = false; coins++; say('⭐', 300); hud(); } }
          if (p.y < camY + H * 0.4) camY = p.y - H * 0.4;
          const height = -(camY); if (height > best) { best = height; hud(); }
          while (nextY > camY - 60) { nextY -= lerp(48, 62, difficulty) + Math.random() * 18 + Math.min(30, best / 300); addPlat(nextY); }
          plats = plats.filter((pl) => pl.y < camY + H + 40);
          if (p.y > camY + H + 30) { dead = now; finish(); }
        }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); const k = clamp(best / 6000, 0, 1); bg.addColorStop(0, `rgb(${Math.round(lerp(170, 20, k))},${Math.round(lerp(215, 30, k))},${Math.round(lerp(255, 80, k))})`); bg.addColorStop(1, `rgb(${Math.round(lerp(230, 60, k))},${Math.round(lerp(245, 80, k))},${Math.round(lerp(255, 140, k))})`); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { const y = ((i * 40 - camY) % (H + 40) + H + 40) % (H + 40) - 20; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
          if (k > 0.4) { ctx.fillStyle = `rgba(255,255,255,${(k - 0.4)})`; for (let i = 0; i < 30; i++) ctx.fillRect((i * 83) % W, ((i * 47 - camY * 0.2) % H + H) % H, 1.5, 1.5); }
          for (const pl of plats) { const y = pl.y - camY; if (y < -20 || y > H + 20) continue; ctx.fillStyle = 'rgba(0,0,0,.2)'; mgRoundRect(ctx, pl.x + 2, y + 3, PW, 10, 5); ctx.fillStyle = pl.kind === 'move' ? '#3a86ff' : pl.kind === 'break' ? (pl.broken ? '#8a5a2b' : '#b5835a') : '#4caf50'; mgRoundRect(ctx, pl.x, y, PW, 10, 5); ctx.fillStyle = 'rgba(255,255,255,.35)'; mgRoundRect(ctx, pl.x + 3, y + 1, PW - 6, 3, 2); if (pl.kind === 'break' && !pl.broken) { ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(pl.x + PW * 0.45, y); ctx.lineTo(pl.x + PW * 0.55, y + 10); ctx.stroke(); }
            if (pl.spring) { ctx.fillStyle = '#e63946'; ctx.fillRect(pl.x + PW / 2 - 7, y - 8, 14, 8); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pl.x + PW / 2 - 5, y - 2); ctx.lineTo(pl.x + PW / 2 + 5, y - 5); ctx.lineTo(pl.x + PW / 2 - 5, y - 7); ctx.stroke(); }
            if (pl.coin) { ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⭐', pl.x + PW / 2, y - 22 + Math.sin(now / 250) * 2); } }
          const py = p.y - camY; ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(p.x, py + 16, 12, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.save(); ctx.translate(p.x, py); ctx.scale(p.vy < 0 ? 0.92 : 1.05, p.vy < 0 ? 1.1 : 0.95); ctx.fillText(currentSprite(), 0, 0); ctx.restore();
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('ジャンプ!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 70, 10, 140, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 23); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.033, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now); if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(10 + best / 10 / 6 + coins * 3), 10, 100);
          say(dead ? `おちた…${Math.round(best / 10)}m` : `⏰タイムアップ!${Math.round(best / 10)}m`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const DOODLE_JUMP_VARIANTS = [mg('doodle-jump', makeDoodleJumpGame({ title: 'ぴょんぴょんジャンプ!だいをつたってうえへ' }))];

  // ================================================================
  // 新作バッチ5(2026-09-09): カーリング(物理) / ジェンガ / せんなぞり
  // ================================================================

  // --- カーリング: ストーンを うえへ スワイプして なげる。ながさで つよさ、
  //     ななめで カール。なげた あと タップれんだで スイープ(のびる)。
  //     4こずつ なげて、ボタンに いちばん ちかい ほうが とくてん ---
  function makeCurlingGame({ title, stoneCount }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const STONES = stoneCount || 4, TIME_LIMIT_MS = mgDuration(150000);
        let running = true, rafId = null, last = null, stones = [], turn = 0, myThrown = 0, aiThrown = 0, aiming = null, moving = false, sweep = 0, msg = '', msgUntil = 0, phase = 'me', aiAt = 0, sweeps = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="cuTurn">あなた🔴のこり${STONES}</span><span id="cuScore">あいて🟡のこり${STONES}</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="cuCanvas"></canvas></div>
          <div class="mg-hint" id="cuHint">🔴をうえへスワイプ。はやいほど強く、ななめなら曲がる。投げたあとは連打でのばそう。まんなかにいちばん近い石のチームが得点</div>`;
        const canvas = container.querySelector('#cuCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * 1.5));
        const R = 9, BTN = { x: W / 2, y: H * 0.22 }, HOG = H * 0.6, START = { x: W / 2, y: H - 30 };
        const turnEl = container.querySelector('#cuTurn'), scoreEl = container.querySelector('#cuScore'), hint = container.querySelector('#cuHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { turnEl.textContent = `あなた🔴のこり${STONES - myThrown}`; scoreEl.textContent = `あいて🟡のこり${STONES - aiThrown}`; };
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running) return; if (moving) { sweep = Math.min(1.5, sweep + 0.35); sweeps++; return; } if (phase !== 'me') return; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); aiming = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, t0: performance.now() }; });
        canvas.addEventListener('pointermove', (e) => { if (!aiming || e.pointerId !== aiming.id) return; const p = mgPointerPos(canvas, e); aiming.x = p.x; aiming.y = p.y; });
        canvas.addEventListener('pointerup', (e) => { if (!aiming || e.pointerId !== aiming.id) return; const dx = aiming.x - aiming.x0, dy = aiming.y - aiming.y0; const dt = Math.max(60, performance.now() - aiming.t0); aiming = null; if (dy > -20) return; const speed = clamp(Math.hypot(dx, dy) / dt * 1000 * 0.42, 120, 420); const ang = Math.atan2(dy, dx); throwStone(true, Math.cos(ang) * speed, Math.sin(ang) * speed, clamp(dx / 60, -1, 1)); });
        canvas.addEventListener('pointercancel', () => { aiming = null; });
        function throwStone(mine, vx, vy, curl) { sfx('whoosh'); stones.push({ x: START.x, y: START.y, vx, vy, mine, curl, alive: true }); moving = true; sweep = 0; if (mine) myThrown++; else aiThrown++; hud(); say(mine ? '🔴なげた!タップでスイープ' : '🟡あいてのショット', 900); }
        function aiThrow() { const target = bestTarget(); const dx = target.x - START.x, dy = target.y - START.y; const d = Math.hypot(dx, dy); // ひつような はやさ(まさつ 0.45 * 60 ぐらい) を てきとうに
          const spd = Math.sqrt(2 * 38 * d) * lerp(0.93, 1.0, difficulty) * (0.96 + Math.random() * 0.08); const err = (Math.random() - 0.5) * lerp(0.16, 0.06, difficulty); const ang = Math.atan2(dy, dx) + err; throwStone(false, Math.cos(ang) * spd, Math.sin(ang) * spd, (Math.random() - 0.5) * 0.6); }
        function bestTarget() { const mine = stones.filter((s) => s.alive && s.mine); if (mine.length && Math.random() < 0.5) { const c = mine.sort((a, b) => Math.hypot(a.x - BTN.x, a.y - BTN.y) - Math.hypot(b.x - BTN.x, b.y - BTN.y))[0]; return { x: c.x, y: c.y - 6 }; } return { x: BTN.x + (Math.random() - 0.5) * 20, y: BTN.y + (Math.random() - 0.5) * 20 }; }
        function step(dt) {
          let any = false;
          for (const s of stones) { if (!s.alive) continue; const sp = Math.hypot(s.vx, s.vy); if (sp > 0) { const fr = (38 - Math.min(20, sweep * 14)) * dt; const ns = Math.max(0, sp - fr); s.vx *= ns / sp; s.vy *= ns / sp; if (ns > 0) { any = true; s.vx += s.curl * 9 * dt * (ns / 200); } } s.x += s.vx * dt; s.y += s.vy * dt;
            if (s.x < R || s.x > W - R || s.y < R || s.y > H + 20) { s.alive = false; } }
          for (let i = 0; i < stones.length; i++) for (let j = i + 1; j < stones.length; j++) { const a = stones[i], b = stones[j]; if (!a.alive || !b.alive) continue; const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy); if (d >= 2 * R || d === 0) continue; const nx = dx / d, ny = dy / d; const ov = 2 * R - d; a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2; const rvx = a.vx - b.vx, rvy = a.vy - b.vy; const vn = rvx * nx + rvy * ny; if (vn <= 0) continue; a.vx -= vn * nx * 0.95; a.vy -= vn * ny * 0.95; b.vx += vn * nx * 0.95; b.vy += vn * ny * 0.95; any = true; }
          if (sweep > 0) sweep = Math.max(0, sweep - dt * 1.2);
          return any;
        }
        function settle() {
          moving = false; for (const s of stones) if (s.alive && s.y > HOG + 40) { s.alive = false; say('ホッグラインにとどかず…', 900); }
          if (myThrown >= STONES && aiThrown >= STONES) { finish(); return; }
          phase = phase === 'me' ? 'ai' : 'me'; if (phase === 'ai' && aiThrown >= STONES) phase = 'me'; if (phase === 'me' && myThrown >= STONES) phase = 'ai';
          if (phase === 'ai') aiAt = performance.now() + 900; else say('あなたのばん: 🔴をうえへスワイプ', 1200);
        }
        function tally() { const alive = stones.filter((s) => s.alive && Math.hypot(s.x - BTN.x, s.y - BTN.y) < 62).sort((a, b) => Math.hypot(a.x - BTN.x, a.y - BTN.y) - Math.hypot(b.x - BTN.x, b.y - BTN.y)); if (!alive.length) return { who: 0, n: 0 }; const who = alive[0].mine; let n = 0; for (const s of alive) { if (s.mine === who) n++; else break; } return { who: who ? 1 : 2, n }; }
        function drawStone(s) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(s.x + 1.5, s.y + 2.5, R, 0, Math.PI * 2); ctx.fill(); const g = ctx.createRadialGradient(s.x - 3, s.y - 3, 1, s.x, s.y, R); g.addColorStop(0, '#999'); g.addColorStop(1, '#333'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = s.mine ? '#e63946' : '#ffd23f'; ctx.beginPath(); ctx.arc(s.x, s.y, R * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(s.x - 2, s.y - 2, R * 0.25, 0, Math.PI * 2); ctx.fill(); }
        function render(now) {
          if (!ctx) return;
          const ice = ctx.createLinearGradient(0, 0, 0, H); ice.addColorStop(0, '#eaf6ff'); ice.addColorStop(1, '#cfe6f7'); ctx.fillStyle = ice; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(120,160,200,.35)'; ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(0, i * H / 12); ctx.lineTo(W, i * H / 12); ctx.stroke(); }
          for (const [r, c] of [[62, '#2f6fb5'], [44, '#fff'], [26, '#e63946'], [9, '#fff']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(BTN.x, BTN.y, r, 0, Math.PI * 2); ctx.fill(); }
          ctx.strokeStyle = '#e63946'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, HOG); ctx.lineTo(W, HOG); ctx.stroke(); ctx.strokeStyle = 'rgba(60,80,120,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, BTN.y); ctx.lineTo(W, BTN.y); ctx.stroke();
          ctx.fillStyle = 'rgba(60,80,120,.6)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText('ホッグライン', 4, HOG - 2);
          for (const s of stones) if (s.alive) drawStone(s);
          if (!moving && phase === 'me' && myThrown < STONES) { drawStone({ x: START.x, y: START.y, mine: true }); if (aiming) { const dx = aiming.x - aiming.x0, dy = aiming.y - aiming.y0; if (dy < -10) { ctx.strokeStyle = 'rgba(230,57,70,.6)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(START.x, START.y); ctx.lineTo(START.x + dx * 2.2, START.y + dy * 2.2); ctx.stroke(); ctx.setLineDash([]); } } else { ctx.fillStyle = 'rgba(230,57,70,.5)'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('↑スワイプでなげる', START.x, START.y - 14); } }
          if (moving) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(W / 2 - 40, H - 14, 80, 6); ctx.fillStyle = '#7fe0ff'; ctx.fillRect(W / 2 - 40, H - 14, 80 * clamp(sweep / 1.5, 0, 1), 6); ctx.fillStyle = '#2b4a6b'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('🧹スイープ(タップれんだ)', W / 2, H - 16); }
          const t = tally(); if (t.n) { ctx.fillStyle = 'rgba(0,0,0,.45)'; mgRoundRect(ctx, 6, 6, 92, 16, 8); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(`${t.who === 1 ? '🔴あなた' : '🟡あいて'} +${t.n}`, 12, 14); }
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 95, H * 0.42, 190, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H * 0.42 + 13); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (moving) { let any = false; for (let i = 0; i < 3; i++) any = step(dt / 3) || any; if (!any) { settle(); if (!running) return; } }
          else if (phase === 'ai' && aiAt && now >= aiAt) { aiAt = 0; aiThrow(); }
          render(now);
          if (now - startTime > TIME_LIMIT_MS) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const t = tally(); const win = t.who === 1;
          const score = win ? clamp(70 + t.n * 10, 70, 100) : t.who === 0 ? 45 : clamp(40 - t.n * 6, 15, 40);
          say(win ? `🏆 ${t.n}てんとってかち!` : t.who === 0 ? 'ハウスにいしがなし…ひきわけ' : `あいてが${t.n}てん…まけ`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud(); say('🔴をうえへスワイプしてなげよう', 1500);
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const CURLING_VARIANTS = [mg('curling-ice', makeCurlingGame({ title: 'カーリング!まんなかによせよう' }))];

  // --- ジェンガ: タップした ブロックを ぬいて、うえに つみなおす。
  //     のこった ブロックの ささえが たりないと とうが くずれる ---
  function makeJengaGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ROWS = 10, TIME_LIMIT_MS = mgDuration(150000);
        let running = true, rafId = null, last = null, rows = [], pulled = 0, msg = '', msgUntil = 0, collapsing = null, wobble = 0, topRow = [], pieces = [], anim = null;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="jgPulled">ぬいた0</span><span id="jgRisk">あんてい100%</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="jgCanvas"></canvas></div>
          <div class="mg-hint" id="jgHint">タップしたブロックをぬいて、上につみなおすよ。まんなかを残すとあんてい、はしだけだとくずれやすい。あんてい%を見ながら選ぼう</div>`;
        const canvas = container.querySelector('#jgCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * 1.25));
        const BW = 34, BH = 16, CX = W / 2, BASE_Y = H - 30;
        const pulledEl = container.querySelector('#jgPulled'), riskEl = container.querySelector('#jgRisk'), hint = container.querySelector('#jgHint');
        const say = (t, ms = 1100) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        for (let r = 0; r < ROWS; r++) rows.push([true, true, true]);
        topRow = [];
        // あんていど: それぞれの だんで、うえの おもさの ちゅうしんが ささえの はんいに あるか
        function stability() {
          let worst = 1;
          for (let r = 0; r < rows.length; r++) { const sup = rows[r].map((v, i) => (v ? i - 1 : null)).filter((v) => v !== null); if (!sup.length) return 0; let mass = 0, mom = 0; for (let k = r + 1; k < rows.length; k++) rows[k].forEach((v, i) => { if (v) { mass++; mom += i - 1; } }); topRow.forEach((v, i) => { if (v) { mass++; mom += i - 1; } }); if (!mass) continue; const com = mom / mass; const lo = Math.min(...sup) - 0.5, hi = Math.max(...sup) + 0.5; const margin = Math.min(com - lo, hi - com); const s = clamp(margin / 0.5, 0, 1); worst = Math.min(worst, s); }
          return worst;
        }
        const hud = () => { pulledEl.textContent = `ぬいた${pulled}`; const s = stability(); riskEl.textContent = `あんてい${Math.round(s * 100)}%`; };
        function blockAt(px, py) { for (let r = 0; r < rows.length; r++) { const y = BASE_Y - (r + 1) * BH; if (py < y || py > y + BH) continue; for (let i = 0; i < 3; i++) { if (!rows[r][i]) continue; const x = CX + (i - 1) * BW; if (px >= x - BW / 2 && px <= x + BW / 2) return [r, i]; } } return null; }
        canvas.addEventListener('pointerdown', (e) => {
          e.preventDefault(); if (!running || collapsing || anim) return; const p = mgPointerPos(canvas, e); const b = blockAt(p.x, p.y); if (!b) return; const [r, i] = b;
          if (rows[r].filter(Boolean).length === 1) { say('そのだんは1つしかのこっていない', 900); return; }
          if (r === rows.length - 1 && topRow.length && topRow.length < 3) { say('いちばんうえのだんはぬけない', 900); return; }
          rows[r][i] = false; pulled++; sfx('pop');
          // うえに のせる(3つ そろったら あたらしい だん)
          if (topRow.length >= 3) { rows.push(topRow); topRow = []; }
          topRow.push(true);
          anim = { from: [CX + (i - 1) * BW, BASE_Y - (r + 1) * BH], to: [CX + (topRow.length - 2) * BW, BASE_Y - (rows.length + 1) * BH], at: performance.now() };
          const s = stability(); hud();
          const risk = 1 - s; const fall = s <= 0 || Math.random() < Math.max(0, risk - 0.55) * lerp(0.6, 1.0, difficulty);
          if (fall) { setTimeout(() => { if (running) collapse(); }, 350); } else { wobble = Math.max(wobble, risk * 8); say(s < 0.4 ? '😱ぐらぐら…!' : s < 0.7 ? 'ちょっとぐらつく' : 'ぬけた!', 800); }
        });
        function collapse() { sfx('hit'); collapsing = performance.now(); pieces = []; for (let r = 0; r < rows.length; r++) rows[r].forEach((v, i) => { if (v) pieces.push({ x: CX + (i - 1) * BW, y: BASE_Y - (r + 1) * BH, vx: (Math.random() - 0.5) * 120 + (i - 1) * 40, vy: -Math.random() * 60, rot: 0, rs: (Math.random() - 0.5) * 6 }); }); topRow.forEach((v, i) => pieces.push({ x: CX + (i - 1) * BW, y: BASE_Y - (rows.length + 1) * BH, vx: (Math.random() - 0.5) * 160, vy: -80, rot: 0, rs: (Math.random() - 0.5) * 8 })); say('💥くずれた!', 2000); setTimeout(() => { if (running) finish(); }, 2200); }
        function drawBlock(x, y, rot = 0, alpha = 1) { ctx.save(); ctx.translate(x, y + BH / 2); ctx.rotate(rot); ctx.globalAlpha = alpha; const g = ctx.createLinearGradient(0, -BH / 2, 0, BH / 2); g.addColorStop(0, '#e8c48c'); g.addColorStop(1, '#b8895a'); ctx.fillStyle = g; ctx.fillRect(-BW / 2 + 1, -BH / 2 + 1, BW - 2, BH - 2); ctx.strokeStyle = 'rgba(90,50,20,.6)'; ctx.lineWidth = 1; ctx.strokeRect(-BW / 2 + 1.5, -BH / 2 + 1.5, BW - 3, BH - 3); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-BW / 2 + 3, -BH / 2 + 3, BW - 6, 2); ctx.restore(); }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fdf6e3'); bg.addColorStop(1, '#e8d5b5'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#7a4f2a'; ctx.fillRect(0, BASE_Y, W, H - BASE_Y); ctx.fillStyle = '#5a3a1e'; ctx.fillRect(0, BASE_Y, W, 3);
          if (wobble > 0) wobble = Math.max(0, wobble - 0.08);
          if (collapsing) { const dt = 1 / 60; for (const p of pieces) { p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.rs * dt; if (p.y > BASE_Y - BH) { p.y = BASE_Y - BH; p.vy *= -0.3; p.vx *= 0.8; p.rs *= 0.6; } drawBlock(p.x, p.y, p.rot); } }
          else {
            const sway = Math.sin(now / 90) * wobble;
            for (let r = 0; r < rows.length; r++) { const y = BASE_Y - (r + 1) * BH; const sx = sway * (r / rows.length); rows[r].forEach((v, i) => { if (!v) return; if (anim && anim.from[0] === CX + (i - 1) * BW && anim.from[1] === y) return; drawBlock(CX + (i - 1) * BW + sx, y); }); }
            topRow.forEach((v, i) => { const y = BASE_Y - (rows.length + 1) * BH; if (anim && anim.to[0] === CX + (i - 1) * BW && anim.to[1] === y && now - anim.at < 500) return; drawBlock(CX + (i - 1) * BW + sway, y); });
            if (anim) { const t = clamp((now - anim.at) / 500, 0, 1); const e = t < 0.5 ? t * 2 : 1; const x = t < 0.5 ? anim.from[0] + (anim.from[0] < CX ? -60 : 60) * Math.sin(t * Math.PI) : lerp(anim.from[0], anim.to[0], (t - 0.5) * 2); const y = t < 0.5 ? anim.from[1] : lerp(anim.from[1], anim.to[1], (t - 0.5) * 2); drawBlock(t < 0.5 ? x : x, t < 0.5 ? y : y - Math.sin((t - 0.5) * 2 * Math.PI) * 30); if (t >= 1) anim = null; }
            const s = stability(); ctx.fillStyle = 'rgba(0,0,0,.35)'; mgRoundRect(ctx, W - 20, 20, 12, 100, 5); ctx.fillStyle = s > 0.6 ? '#7fe0a0' : s > 0.3 ? '#ffd23f' : '#ff6b6b'; mgRoundRect(ctx, W - 19, 21 + 98 * (1 - s), 10, 98 * s, 4); ctx.fillStyle = '#5a3a1e'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('あんてい', W - 14, 122);
            ctx.font = '22px sans-serif'; ctx.textBaseline = 'bottom'; ctx.fillText(currentSprite(), 26, BASE_Y);
          }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 80, 8, 160, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 21); }
        }
        function loop(now) { if (!running) return; render(now); if (now - startTime > TIME_LIMIT_MS) { finish(); return; } rafId = requestAnimationFrame(loop); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = clamp(Math.round(10 + pulled * 6 + (collapsing ? 0 : 12)), 10, 100);
          say(collapsing ? `くずれた…${pulled}こぬいた` : `おわり!${pulled}こぬいた`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const JENGA_VARIANTS = [mg('jenga-tower', makeJengaGame({ title: 'ジェンガ!くずさずなんこぬける?' }))];

  // --- せんなぞり: おてほんの せんを ゆびで なぞる。せんから はなれない ほど こうとくてん ---
  const TRACE_SHAPES = [
    { name: 'まる', f: (t) => [Math.cos(t * Math.PI * 2), Math.sin(t * Math.PI * 2)] },
    { name: 'ほし', f: (t) => { const k = t * 5, i = Math.floor(k), fr = k - i; const p = (n) => [Math.cos(-Math.PI / 2 + n * Math.PI * 4 / 5), Math.sin(-Math.PI / 2 + n * Math.PI * 4 / 5)]; const a = p(i), b = p(i + 1); return [a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr]; } },
    { name: 'なみ', f: (t) => [-1 + t * 2, Math.sin(t * Math.PI * 3) * 0.6] },
    { name: 'ハート', f: (t) => { const a = t * Math.PI * 2; return [0.9 * Math.pow(Math.sin(a), 3), -(0.75 * Math.cos(a) - 0.3 * Math.cos(2 * a) - 0.12 * Math.cos(3 * a) - 0.06 * Math.cos(4 * a)) * 0.95]; } },
    { name: 'うずまき', f: (t) => { const a = t * Math.PI * 5; const r = 0.15 + t * 0.85; return [Math.cos(a) * r, Math.sin(a) * r]; } },
    { name: 'むげん', f: (t) => { const a = t * Math.PI * 2; return [Math.sin(a), Math.sin(a) * Math.cos(a) * 0.9]; } },
  ];
  function makeLineTraceGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ROUNDS = 3, TIME_LIMIT_MS = mgDuration(120000);
        const pool = TRACE_SHAPES.slice().sort(() => Math.random() - 0.5).slice(0, ROUNDS);
        let running = true, rafId = null, round = 0, shape, pts = [], trail = [], drawing = null, covered = [], scores = [], msg = '', msgUntil = 0, doneAt = 0, roundScore = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="ltRound">1/${ROUNDS}もんめ</span><span id="ltScore">せいど-</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="ltCanvas"></canvas></div>
          <div class="mg-hint" id="ltHint">●から灰色の線をひと筆でなぞろう。線に近いとみどり、離れると赤。指を離すと判定するよ</div>`;
        const canvas = container.querySelector('#ltCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CX = W / 2, CY = H / 2, RAD = W * 0.36, TOL = lerp(16, 11, difficulty);
        const roundEl = container.querySelector('#ltRound'), scoreEl = container.querySelector('#ltScore'), hint = container.querySelector('#ltHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { roundEl.textContent = `${Math.min(ROUNDS, round + 1)}/${ROUNDS}もんめ`; scoreEl.textContent = scores.length ? `せいど${Math.round(scores[scores.length - 1])}%` : 'せいど-'; };
        function load() { shape = pool[round]; pts = []; for (let i = 0; i <= 160; i++) { const [x, y] = shape.f(i / 160); pts.push([CX + x * RAD, CY + y * RAD]); } covered = pts.map(() => false); trail = []; doneAt = 0; roundScore = 0; }
        load();
        const nearest = (x, y) => { let bd = 1e9, bi = 0; for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - x, pts[i][1] - y); if (d < bd) { bd = d; bi = i; } } return [bd, bi]; };
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || doneAt) return; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); if (Math.hypot(p.x - pts[0][0], p.y - pts[0][1]) > 30) { say('●のスタートからはじめて', 800); return; } drawing = { id: e.pointerId }; trail = []; covered = pts.map(() => false); addPoint(p.x, p.y); });
        canvas.addEventListener('pointermove', (e) => { if (!drawing || e.pointerId !== drawing.id) return; const p = mgPointerPos(canvas, e); addPoint(p.x, p.y); });
        const endDraw = (e) => { if (!drawing || (e && e.pointerId !== drawing.id)) return; drawing = null; judge(); };
        canvas.addEventListener('pointerup', endDraw); canvas.addEventListener('pointercancel', endDraw);
        function addPoint(x, y) { const [d, i] = nearest(x, y); const q = clamp(1 - d / TOL, 0, 1); trail.push({ x, y, q }); for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < pts.length && d < TOL) covered[j] = true; } }
        function judge() {
          if (trail.length < 5) { trail = []; return; }
          const acc = trail.reduce((a, t) => a + t.q, 0) / trail.length; const cov = covered.filter(Boolean).length / covered.length;
          roundScore = clamp(Math.round(acc * 55 + cov * 45), 0, 100); scores.push(roundScore); doneAt = performance.now(); hud();
          sfx(roundScore >= 85 ? 'coin' : roundScore >= 60 ? 'good' : 'bad'); say(roundScore >= 85 ? `🌟すごい!せいど${roundScore}%` : roundScore >= 60 ? `いいね!せいど${roundScore}%` : `せいど${roundScore}%…もっとせんのうえを`, 1500);
          setTimeout(() => { if (!running) return; round++; if (round >= ROUNDS) { finish(); return; } load(); hud(); }, 1700);
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#fffdf7'; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(0,0,0,.05)'; ctx.lineWidth = 1; for (let i = 0; i < W; i += 20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }
          ctx.strokeStyle = 'rgba(120,120,130,.45)'; ctx.lineWidth = TOL * 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
          // すすむ むきの やじるし
          for (let i = 20; i < pts.length; i += 40) { const [x, y] = pts[i], [px, py] = pts[i - 4]; const a = Math.atan2(y - py, x - px); ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = 'rgba(80,80,90,.6)'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-3, 4); ctx.lineTo(-3, -4); ctx.closePath(); ctx.fill(); ctx.restore(); }
          if (trail.length > 1) { for (let i = 1; i < trail.length; i++) { const t = trail[i]; ctx.strokeStyle = `hsl(${lerp(0, 130, t.q)},80%,50%)`; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(t.x, t.y); ctx.stroke(); } }
          if (!doneAt) { ctx.fillStyle = drawing ? 'rgba(42,157,143,.5)' : `rgba(42,157,143,${0.6 + 0.3 * Math.sin(now / 200)})`; ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('●', pts[0][0], pts[0][1]); }
          ctx.fillStyle = '#5a5a66'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(shape.name, 8, 8);
          if (doneAt) { ctx.fillStyle = `rgba(255,255,255,${0.7 * clamp((now - doneAt) / 300, 0, 1)})`; ctx.fillRect(0, 0, W, H); ctx.fillStyle = roundScore >= 85 ? '#2a9d8f' : roundScore >= 60 ? '#e0a800' : '#c1121f'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${roundScore}%`, CX, CY); }
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 95, H - 34, 190, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 21); }
        }
        function loop(now) { if (!running) return; render(now); if (now - startTime > TIME_LIMIT_MS) { finish(); return; } rafId = requestAnimationFrame(loop); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          const score = clamp(Math.round(10 + avg * 0.9), 10, 100);
          say(`おわり!へいきんせいど${Math.round(avg)}%`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const LINE_TRACE_VARIANTS = [mg('line-trace', makeLineTraceGame({ title: 'せんなぞり!おてほんをぴったりなぞろう' }))];

  // ================================================================
  // 新作バッチ6(2026-09-09): チェッカー / しんけいすいじゃく / ハーフパイプ / ドミノたおし
  // ================================================================

  // --- チェッカー(6×6): ななめ まえに 1マス。あいての こまを とびこして とる(れんぞく OK)。
  //     いちばん おくに つくと キング(うしろにも うごける) ---
  function makeCheckersGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 6, ME = 1, AI = 2, TIME_LIMIT_MS = mgDuration(180000);
        let board = Array.from({ length: N }, () => Array(N).fill(null)), turn = ME, running = true, rafId = null, sel = null, moves = 0, msg = '', msgUntil = 0, aiAt = 0, lastMove = null, anim = null, chain = null;
        const startTime = performance.now();
        for (let y = 0; y < 2; y++) for (let x = 0; x < N; x++) if ((x + y) % 2 === 1) board[y][x] = { o: AI, k: false };
        for (let y = N - 2; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2 === 1) board[y][x] = { o: ME, k: false };
        container.innerHTML = `
          <div class="mg-header"><span id="ckTurn">あなたのばん(🔴)</span><span id="ckCount">🔴 6 - 6 ⚫</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="ckCanvas"></canvas></div>
          <div class="mg-hint" id="ckHint">こまをタップ→ひかったマスへ。ななめまえに1マス、あいてのこまをとびこすととれる(つづけてとべる)。おくまでいくと👑キングになってうしろにもすすめる</div>`;
        const canvas = container.querySelector('#ckCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N;
        const turnEl = container.querySelector('#ckTurn'), countEl = container.querySelector('#ckCount'), hint = container.querySelector('#ckHint');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const count = (o) => board.flat().filter((p) => p && p.o === o).length;
        const hud = () => { turnEl.textContent = turn === ME ? 'あなたのばん(🔴)' : 'あいてのばん(⚫)…'; countEl.textContent = `🔴 ${count(ME)} - ${count(AI)} ⚫`; };
        const inB = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
        function movesFor(b, x, y, capturesOnly) {
          const p = b[y][x]; if (!p) return []; const dirs = p.k ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : (p.o === ME ? [[-1, -1], [1, -1]] : [[-1, 1], [1, 1]]); const out = [];
          for (const [dx, dy] of dirs) { const nx = x + dx, ny = y + dy; if (!inB(nx, ny)) continue; if (!b[ny][nx]) { if (!capturesOnly) out.push({ to: [nx, ny] }); } else if (b[ny][nx].o !== p.o) { const jx = nx + dx, jy = ny + dy; if (inB(jx, jy) && !b[jy][jx]) out.push({ to: [jx, jy], cap: [nx, ny] }); } }
          return out;
        }
        function allMoves(b, who) { const caps = [], plain = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const p = b[y][x]; if (!p || p.o !== who) continue; for (const m of movesFor(b, x, y, false)) (m.cap ? caps : plain).push({ from: [x, y], ...m }); } return caps.length ? caps : plain; }
        function apply(b, m) { const nb = b.map((r) => r.map((c) => (c ? { ...c } : null))); const p = nb[m.from[1]][m.from[0]]; nb[m.from[1]][m.from[0]] = null; if (m.cap) nb[m.cap[1]][m.cap[0]] = null; const [tx, ty] = m.to; if ((p.o === ME && ty === 0) || (p.o === AI && ty === N - 1)) p.k = true; nb[ty][tx] = p; return nb; }
        function evaluate(b) { let v = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const p = b[y][x]; if (!p) continue; const s = p.o === AI ? 1 : -1; v += s * (p.k ? 3.2 : 2 + (p.o === AI ? y : N - 1 - y) * 0.08); } return v; }
        function search(b, depth, who, alpha, beta) { const ms = allMoves(b, who); if (!ms.length) return who === AI ? -50 : 50; if (depth === 0) return evaluate(b); if (who === AI) { let best = -Infinity; for (const m of ms) { const v = search(apply(b, m), depth - 1, ME, alpha, beta); best = Math.max(best, v); alpha = Math.max(alpha, v); if (beta <= alpha) break; } return best; } let best = Infinity; for (const m of ms) { const v = search(apply(b, m), depth - 1, AI, alpha, beta); best = Math.min(best, v); beta = Math.min(beta, v); if (beta <= alpha) break; } return best; }
        function aiMove() { const ms = allMoves(board, AI); if (!ms.length) { end(ME); return; } const depth = difficulty < 0.35 ? 2 : 4; let best = null, bestV = -Infinity; for (const m of ms) { let v = search(apply(board, m), depth - 1, ME, -Infinity, Infinity) + (Math.random() - 0.5) * lerp(1.2, 0.1, difficulty); if (v > bestV) { bestV = v; best = m; } } doMove(AI, best); }
        function doMove(who, m) {
          const wasKing = board[m.from[1]][m.from[0]].k; board = apply(board, m); moves++; sfx(m.cap ? 'hit' : 'pop'); lastMove = m.to; anim = { from: m.from, to: m.to, at: performance.now(), who, k: board[m.to[1]][m.to[0]].k };
          if (m.cap) say(who === ME ? '🔴とった!' : '⚫とられた…', 800); if (!wasKing && board[m.to[1]][m.to[0]].k) say('👑キングになった!', 1000);
          if (!count(AI)) { end(ME); return; } if (!count(ME)) { end(AI); return; }
          // れんぞく キャプチャ
          if (m.cap && movesFor(board, m.to[0], m.to[1], true).length) { chain = m.to; if (who === ME) { sel = m.to; say('つづけてとれる!', 900); hud(); return; } setTimeout(() => { if (!running) return; const ms = movesFor(board, chain[0], chain[1], true); doMove(AI, { from: chain, ...ms[0] }); }, 500); return; }
          chain = null; turn = 3 - who; hud(); if (turn === AI) aiAt = performance.now() + 600; else if (!allMoves(board, ME).length) end(AI);
        }
        canvas.addEventListener('pointerdown', (e) => {
          e.preventDefault(); if (!running || turn !== ME || anim && performance.now() - anim.at < 200) return; const p = mgPointerPos(canvas, e); const x = Math.floor(p.x / CELL), y = Math.floor(p.y / CELL); if (!inB(x, y)) return;
          const legal = allMoves(board, ME);
          if (sel) { const m = legal.find((q) => q.from[0] === sel[0] && q.from[1] === sel[1] && q.to[0] === x && q.to[1] === y); if (m) { doMove(ME, m); if (!chain) sel = null; return; } if (chain) { say('つづけてとるこまをうごかして', 800); return; } }
          const q = board[y][x]; if (q && q.o === ME) { if (!legal.some((m) => m.from[0] === x && m.from[1] === y)) { say(legal[0] && legal[0].cap ? 'とれるこまがあるのでそちらをうごかそう' : 'そのこまはうごけない', 900); sel = null; return; } sel = [x, y]; } else sel = null;
        });
        function piece(x, y, p, scale = 1) { const cx = x, cy = y, r = CELL * 0.36 * scale; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(cx + 1.5, cy + 3, r, 0, Math.PI * 2); ctx.fill(); const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 1, cx, cy, r); if (p.o === ME) { g.addColorStop(0, '#ff9b9b'); g.addColorStop(1, '#b3121f'); } else { g.addColorStop(0, '#777'); g.addColorStop(1, '#111'); } ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.stroke(); if (p.k) { ctx.font = `${Math.round(r * 1.1)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👑', cx, cy + 1); } }
        function render(now) {
          if (!ctx) return;
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { ctx.fillStyle = (x + y) % 2 ? '#8b5a2b' : '#f1d9b5'; ctx.fillRect(x * CELL, y * CELL, CELL, CELL); }
          const legal = running && turn === ME ? allMoves(board, ME) : [];
          if (lastMove) { ctx.fillStyle = 'rgba(255,220,80,.3)'; ctx.fillRect(lastMove[0] * CELL, lastMove[1] * CELL, CELL, CELL); }
          if (sel) { ctx.fillStyle = 'rgba(255,220,80,.5)'; ctx.fillRect(sel[0] * CELL, sel[1] * CELL, CELL, CELL); for (const m of legal) if (m.from[0] === sel[0] && m.from[1] === sel[1]) { ctx.fillStyle = `rgba(80,220,120,${0.4 + 0.2 * Math.sin(now / 200)})`; ctx.beginPath(); ctx.arc((m.to[0] + 0.5) * CELL, (m.to[1] + 0.5) * CELL, CELL * 0.16, 0, Math.PI * 2); ctx.fill(); } }
          else for (const m of legal) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.strokeRect(m.from[0] * CELL + 3, m.from[1] * CELL + 3, CELL - 6, CELL - 6); }
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const p = board[y][x]; if (!p) continue; if (anim && anim.to[0] === x && anim.to[1] === y && now - anim.at < 220) continue; piece((x + 0.5) * CELL, (y + 0.5) * CELL, p); }
          if (anim) { const t = clamp((now - anim.at) / 220, 0, 1); if (t < 1) piece(lerp(anim.from[0] + 0.5, anim.to[0] + 0.5, t) * CELL, lerp(anim.from[1] + 0.5, anim.to[1] + 0.5, t) * CELL - Math.sin(t * Math.PI) * 14, { o: anim.who, k: anim.k }, 1 + Math.sin(t * Math.PI) * 0.2); else anim = null; }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 100, H / 2 - 14, 200, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; if (turn === AI && aiAt && now >= aiAt && !chain) { aiAt = 0; aiMove(); if (!running) return; } render(now); if (now - startTime > TIME_LIMIT_MS) { end(count(ME) > count(AI) ? ME : count(ME) < count(AI) ? AI : 0); return; } rafId = requestAnimationFrame(loop); }
        function end(w) {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = w === ME ? clamp(78 + count(ME) * 4, 78, 100) : w === AI ? clamp(15 + count(ME) * 5, 15, 45) : 50;
          say(w === ME ? '🏆かち!ぜんぶとった!' : w === AI ? 'まけ…つぎはかとう' : 'じかんぎれひきわけ', 2600); turnEl.textContent = 'しゅうりょう'; render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const CHECKERS_VARIANTS = [mg('checkers-6', makeCheckersGame({ title: 'チェッカー!とびこしてあいてのこまをとれ' }))];

  // --- しんけいすいじゃく: カードを 2まい めくって おなじ えを そろえる。すくない かいすうで ---
  function makeMemoryCardsGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const COLS = 4, ROWS = difficulty > 0.5 ? 5 : 4, PAIRS = (COLS * ROWS) / 2, DURATION_MS = mgDuration(120000);
        const EMOJI = ['🍎', '🐶', '🚗', '⭐', '🌸', '🎵', '🐟', '🎈', '🍰', '🦋', '⚽', '🌙'].slice(0, PAIRS);
        let cards = [], running = true, rafId = null, open = [], matched = 0, tries = 0, lock = 0, msg = '', msgUntil = 0, streak = 0;
        const startTime = performance.now();
        const deck = EMOJI.concat(EMOJI).sort(() => Math.random() - 0.5); deck.forEach((e, i) => cards.push({ e, flip: 0, done: false, x: i % COLS, y: Math.floor(i / COLS), shakeAt: 0 }));
        container.innerHTML = `
          <div class="mg-header"><span id="mcPairs">ペア0/${PAIRS}</span><span id="mcTries">めくり0かい</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="mcCanvas"></canvas></div>
          <div class="mg-hint" id="mcHint">カードを2まいタップしてめくる。おなじえならそのまま、ちがえばもどる。ばしょをおぼえて、すくないかいすうでぜんぶそろえよう</div>`;
        const canvas = container.querySelector('#mcCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => Math.round(w * ROWS / COLS));
        const CW = W / COLS, CH = H / ROWS;
        const pairsEl = container.querySelector('#mcPairs'), triesEl = container.querySelector('#mcTries'), hint = container.querySelector('#mcHint');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { pairsEl.textContent = `ペア${matched}/${PAIRS}`; triesEl.textContent = `めくり${tries}かい`; };
        canvas.addEventListener('pointerdown', (e) => {
          e.preventDefault(); if (!running || performance.now() < lock) return; const p = mgPointerPos(canvas, e); const x = Math.floor(p.x / CW), y = Math.floor(p.y / CH); const c = cards.find((k) => k.x === x && k.y === y); if (!c || c.done || open.includes(c)) return;
          c.flipAt = performance.now(); c.faceUp = true; open.push(c); sfx('pop');
          if (open.length === 2) { tries++; hud(); const [a, b] = open; if (a.e === b.e) { streak++; setTimeout(() => { a.done = b.done = true; a.doneAt = b.doneAt = performance.now(); matched++; sfx('coin'); hud(); say(streak > 1 ? `✨ ${streak}れんぞく!` : '✅そろった!', 800); open = []; if (matched >= PAIRS) finish(); }, 350); } else { streak = 0; lock = performance.now() + 900; setTimeout(() => { a.faceUp = b.faceUp = false; a.flipAt = b.flipAt = performance.now(); a.shakeAt = b.shakeAt = performance.now(); open = []; }, 800); } }
        });
        function card(c, now) {
          const x = c.x * CW + 5, y = c.y * CH + 5, w = CW - 10, h = CH - 10; const t = clamp((now - (c.flipAt || 0)) / 260, 0, 1); const face = c.faceUp || c.done; const sx = Math.abs(Math.cos(t * Math.PI)); const showFace = face ? t > 0.5 : t < 0.5;
          ctx.save(); ctx.translate(x + w / 2, y + h / 2); if (c.shakeAt && now - c.shakeAt < 300) ctx.translate(Math.sin((now - c.shakeAt) / 20) * 3, 0); ctx.scale(Math.max(0.04, sx), 1);
          if (c.done) { const dt = clamp((now - c.doneAt) / 400, 0, 1); ctx.globalAlpha = 1 - dt * 0.45; ctx.scale(1 - dt * 0.08, 1 - dt * 0.08); }
          ctx.fillStyle = 'rgba(0,0,0,.25)'; mgRoundRect(ctx, -w / 2 + 2, -h / 2 + 3, w, h, 8);
          if (showFace) { ctx.fillStyle = '#fff'; mgRoundRect(ctx, -w / 2, -h / 2, w, h, 8); ctx.strokeStyle = c.done ? '#2a9d8f' : '#e0a800'; ctx.lineWidth = 2; ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2); ctx.font = `${Math.round(Math.min(w, h) * 0.6)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.e, 0, 2); }
          else { const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, '#5b8def'); g.addColorStop(1, '#2f5fb5'); ctx.fillStyle = g; mgRoundRect(ctx, -w / 2, -h / 2, w, h, 8); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10); ctx.font = `${Math.round(Math.min(w, h) * 0.4)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText('?', 0, 1); }
          ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1e3a5f'); bg.addColorStop(1, '#0f2340'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
          for (const c of cards) card(c, now);
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; render(now); if (now - startTime > DURATION_MS) { finish(); return; } rafId = requestAnimationFrame(loop); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const el = (performance.now() - startTime) / 1000; const eff = clamp(1 - Math.max(0, tries - PAIRS) / (PAIRS * 1.6), 0, 1);
          const score = matched >= PAIRS ? clamp(Math.round(42 + eff * 50 + Math.max(0, 60 - el) * 0.13), 42, 100) : clamp(Math.round(10 + matched * 5), 10, 45);
          say(matched >= PAIRS ? `🏆ぜんぶそろった!${tries}かい` : `じかんぎれ…${matched}ペア`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const MEMORY_CARDS_VARIANTS = [mg('memory-cards', makeMemoryCardsGame({ title: 'しんけいすいじゃく!おなじえをそろえよう' }))];

  // --- ハーフパイプ: U字の ランプを じどうで いったりきたり。くだりで ながおし(ポンプ)で
  //     かそく、くうちゅうで トリックボタン。ちゃくちまでに まわりきれば せいこう ---
  function makeHalfpipeGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(60000), G = 14;
        // ランプ: s(-1..1) で いち、たかさ h(s) = s^2 * 2.2 (m)。くうちゅうは じゆう らっか
        let running = true, rafId = null, last = null, s = -0.6, v = 0, pump = false, air = null, score = 0, tricks = 0, bails = 0, msg = '', msgUntil = 0, combo = 0, trickBtn, lastLand = '';
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="hpTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="hpScore">0pt</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="hpCanvas"></canvas></div>
          <div class="mg-hint" id="hpHint">くだり坂で「ポンプ」をながおしするとかそく。いきおいがつくとふちからとびだす。くうちゅうで「トリック」をおすと1かいてん(なんどもおせる)。ちゃくちまでにまわりきらないとてんとう!</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="hpPump" data-key="left">ポンプ(ながおし)</button><button class="mg-tap-btn primary" id="hpTrick" data-key="action">🌀トリック</button></div>`;
        const canvas = container.querySelector('#hpCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 230);
        const timerEl = container.querySelector('#hpTimer'), scoreEl = container.querySelector('#hpScore'), hint = container.querySelector('#hpHint'); trickBtn = container.querySelector('#hpTrick');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `${score}pt`; };
        bindHeldButton(container.querySelector('#hpPump'), (vv) => { pump = vv; });
        trickBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); trick(); });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); trick(); });
        const RAMP_H = 2.2, hOf = (q) => q * q * RAMP_H; const px = (q) => W / 2 + q * W * 0.42, py = (h) => H - 30 - h * 60;
        function trick() { if (!running || !air) return; air.spins++; sfx('whoosh'); air.spinTarget += Math.PI * 2 * (air.dir > 0 ? 1 : -1); say(`🌀 ${air.spins}かいてん!`, 500); }
        function update(dt, now) {
          if (air) { air.vy -= G * dt; air.x += air.vx * dt; air.y += air.vy * dt; air.rot += (air.spinTarget - air.rot) * Math.min(1, dt * 6); air.t += dt;
            if (air.y <= RAMP_H && air.t > 0.15) { // ちゃくち
              const rem = Math.abs(air.spinTarget - air.rot); const spins = air.spins, dir = air.dir, v0 = air.v0; const ok = rem < 0.9 || spins === 0; air = null;
              s = dir > 0 ? 1 : -1; if (ok) { const gain = spins * spins * 20 + (spins ? 10 : 0); if (spins) { tricks++; combo++; sfx('coin'); score += gain * Math.min(3, combo); say(`✨ ${spins}かいてんせいこう!+${gain * Math.min(3, combo)}`, 900); hud(); } v = -dir * Math.max(3.2, Math.abs(v0) * 0.95); }
              else { bails++; combo = 0; v = 0; s = dir * 0.95; say('💫てんとう…', 1000); }
            } return; }
          // ランプ上: ちからは かたむき ぶん。ポンプは くだりで かそく
          const slope = 2 * s * RAMP_H; const down = (s > 0 && v < 0) || (s < 0 && v > 0);
          let acc = -slope * G * 0.45; if (pump && down) acc += -Math.sign(s) * 3.4; acc -= v * 0.12; v += acc * dt; s += v * dt * 0.42;
          if (Math.abs(s) >= 1) { const dir = Math.sign(s); const speed = Math.abs(v); s = dir * 1; if (speed > 3.0) { sfx('jump'); air = { x: dir, y: RAMP_H, vx: dir * speed * 0.12, vy: speed * 0.9, rot: 0, spinTarget: 0, spins: 0, dir, t: 0, v0: v }; say('🛹エア!', 500); } else v = -v * 0.6; }
        }
        function drawSkater(x, y, rot, lean) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 14, 16, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e63946'; mgRoundRect(ctx, -16, 6, 32, 5, 2); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(-10, 12, 3, 0, Math.PI * 2); ctx.arc(10, 12, 3, 0, Math.PI * 2); ctx.fill(); ctx.rotate(lean); ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(currentSprite(), 0, 8); ctx.restore(); }
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#ffb385'); sky.addColorStop(0.6, '#ffe0c2'); sky.addColorStop(1, '#c9d6e3'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.beginPath(); ctx.arc(W * 0.8, 40, 18, 0, Math.PI * 2); ctx.fill();
          for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(60,70,90,${0.25 + i * 0.05})`; ctx.fillRect(i * W / 6 + 4, 60 + (i % 3) * 14, W / 6 - 12, H); }
          // ランプ
          ctx.fillStyle = '#8d99ae'; ctx.beginPath(); ctx.moveTo(px(-1), 0); for (let q = -1; q <= 1.001; q += 0.05) ctx.lineTo(px(q), py(hOf(q))); ctx.lineTo(px(1), 0); ctx.lineTo(px(1) + 12, 0); ctx.lineTo(px(1) + 12, H); ctx.lineTo(px(-1) - 12, H); ctx.lineTo(px(-1) - 12, 0); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#edf2f4'; ctx.beginPath(); ctx.moveTo(px(-1), py(RAMP_H)); for (let q = -1; q <= 1.001; q += 0.05) ctx.lineTo(px(q), py(hOf(q))); ctx.lineTo(px(1), H); ctx.lineTo(px(-1), H); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 3; ctx.beginPath(); for (let q = -1; q <= 1.001; q += 0.05) { const X = px(q), Y = py(hOf(q)); q === -1 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); } ctx.stroke();
          ctx.fillStyle = '#e63946'; ctx.fillRect(px(-1) - 12, py(RAMP_H) - 3, 14, 4); ctx.fillRect(px(1) - 2, py(RAMP_H) - 3, 14, 4);
          if (air) drawSkater(px(air.x), py(air.y) - 12, air.rot, 0); else { const slope = 2 * s * RAMP_H; drawSkater(px(s), py(hOf(s)) - 12, Math.atan(slope * 0.3), v * 0.03); }
          // いきおいメーター
          ctx.fillStyle = 'rgba(0,0,0,.4)'; mgRoundRect(ctx, 8, 8, 80, 8, 4); ctx.fillStyle = Math.abs(v) > 3 ? '#7fe0a0' : '#ffd23f'; mgRoundRect(ctx, 8, 8, 80 * clamp(Math.abs(v) / 6, 0, 1), 8, 4); ctx.fillStyle = '#2b2d42'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('いきおい(みどりでエア)', 8, 18);
          if (combo > 1) { ctx.fillStyle = '#e63946'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(`コンボ×${Math.min(3, combo)}`, W - 8, 8); }
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('ドロップイン!', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, 34, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 47); }
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(0.033, (now - last) / 1000); last = now;
          if (now >= startTime) update(dt, now);
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const final = clamp(Math.round(10 + score / 6 - bails * 3), 10, 100);
          say(`おわり!トリック${tricks}かい${score}pt`, 2600); render(performance.now());
          setTimeout(() => onComplete(final), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const HALFPIPE_VARIANTS = [mg('halfpipe-skate', makeHalfpipeGame({ title: 'ハーフパイプ!ポンプでかそく、エアでかいてん' }))];

  // --- ドミノたおし: とちゅうが かけた ドミノの みちに、てもちの ドミノを タップで おいて
  //     つなげ、「おす!」で さいしょを たおす。🔔まで つづけば クリア ---
  function makeDominoRunGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ROUNDS = 3, TIME_LIMIT_MS = mgDuration(150000);
        let running = true, rafId = null, last = null, round = 0, path = [], slots = [], spare = 0, phase = 'build', fallen = 0, msg = '', msgUntil = 0, cleared = 0, pushAt = 0, totalUsed = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="dmRound">1/${ROUNDS}もんめ</span><span id="dmSpare">てもち0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="dmCanvas"></canvas></div>
          <div class="mg-hint" id="dmHint">みちのとちゅうでドミノがかけている(てんせん)。てもちのドミノをかけたばしょにタップでおき、ぜんぶつながったら「おす!」。あまったてもちはボーナス</div>
          <div class="mg-race-controls"><button class="mg-tap-btn primary" id="dmPush" data-key="action">👉おす!</button></div>`;
        const canvas = container.querySelector('#dmCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const roundEl = container.querySelector('#dmRound'), spareEl = container.querySelector('#dmSpare'), hint = container.querySelector('#dmHint'), pushBtn = container.querySelector('#dmPush');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { roundEl.textContent = `${Math.min(ROUNDS, round + 1)}/${ROUNDS}もんめ`; spareEl.textContent = `てもち${spare}`; pushBtn.disabled = phase !== 'build'; };
        function gen() {
          // なめらかな みち: いくつかの ウェイポイントを つないで とうかんかくに ドミノを おく
          const wps = [[20, H - 30]]; let x = 20, y = H - 30; const n = 4 + round; for (let i = 0; i < n; i++) { x = clamp(x + (W - 40) / n + (Math.random() - 0.5) * 30, 20, W - 20); y = clamp(y - (H - 60) / n + (Math.random() - 0.5) * 60, 30, H - 30); wps.push([x, y]); }
          const pts = []; for (let i = 0; i < wps.length - 1; i++) { const [ax, ay] = wps[i], [bx, by] = wps[i + 1]; const d = Math.hypot(bx - ax, by - ay); const k = Math.max(2, Math.round(d / 14)); for (let j = 0; j < k; j++) pts.push([ax + (bx - ax) * j / k, ay + (by - ay) * j / k]); } pts.push(wps[wps.length - 1]);
          path = pts.map(([px, py], i) => { const [nx, ny] = pts[Math.min(pts.length - 1, i + 1)]; const [qx, qy] = pts[Math.max(0, i - 1)]; return { x: px, y: py, a: Math.atan2(ny - qy, nx - qx), present: true, fallen: 0, tilt: 0 }; });
          const gaps = Math.round(lerp(4, 7, difficulty)) + round; const idx = []; while (idx.length < gaps) { const k = 2 + Math.floor(Math.random() * (path.length - 4)); if (!idx.includes(k) && !idx.includes(k - 1) && !idx.includes(k + 1)) idx.push(k); }
          for (const k of idx) path[k].present = false; slots = idx; spare = gaps + 1; phase = 'build'; fallen = 0; hud();
        }
        gen();
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || phase !== 'build') return; const p = mgPointerPos(canvas, e); let best = -1, bd = 22; path.forEach((d, i) => { const dist = Math.hypot(d.x - p.x, d.y - p.y); if (dist < bd) { bd = dist; best = i; } }); if (best < 0) return; const d = path[best]; if (d.present) { if (d.placed) { d.present = false; d.placed = false; spare++; hud(); } else say('そこにはもうある', 600); return; } if (spare <= 0) { say('てもちがない!', 800); return; } d.present = true; d.placed = true; spare--; sfx('pop'); hud(); });
        pushBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || phase !== 'build') return; phase = 'run'; sfx('whoosh'); pushAt = performance.now(); path[0].fallen = performance.now(); fallen = 1; hud(); say('👉パタパタ…', 1000); });
        function update(dt, now) {
          if (phase !== 'run') return;
          for (let i = 0; i < path.length; i++) { const d = path[i]; if (!d.fallen || !d.present) continue; d.tilt = Math.min(1, d.tilt + dt * 6); const nxt = path[i + 1]; if (d.tilt > 0.55 && nxt && !nxt.fallen) { if (nxt.present) { sfx('tick'); nxt.fallen = now; fallen++; if (i + 1 === path.length - 1) { phase = 'done'; cleared++; totalUsed += slots.length; say('🔔ゴール!ぜんぶたおれた!', 1500); setTimeout(next, 1700); return; } } else { phase = 'done'; say('💦とちゅうでとまった…', 1500); setTimeout(next, 1700); return; } } }
        }
        function next() { if (!running) return; round++; if (round >= ROUNDS) { finish(); return; } gen(); say('つぎのみち!', 900); }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#e9dcc5'; ctx.fillRect(0, 0, W, H); const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(120,80,40,.15)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(120,80,40,.15)'; ctx.lineWidth = 1; for (let i = 0; i < W; i += 24) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
          // みち(ガイド)
          ctx.strokeStyle = 'rgba(120,80,40,.25)'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); path.forEach((d, i) => (i ? ctx.lineTo(d.x, d.y) : ctx.moveTo(d.x, d.y))); ctx.stroke();
          for (const d of path) { ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); if (!d.present) { ctx.strokeStyle = 'rgba(200,60,60,.7)'; ctx.setLineDash([2, 2]); ctx.lineWidth = 1.5; ctx.strokeRect(-2.5, -8, 5, 16); ctx.setLineDash([]); ctx.restore(); continue; }
            const tilt = d.fallen ? d.tilt : 0; ctx.rotate(0); const h = 16 * (1 - tilt * 0.75), w = 5 + tilt * 9; ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(-w / 2 + 2 + tilt * 6, -h / 2 + 3, w, h); ctx.fillStyle = d.placed ? '#ffe08a' : '#fff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.fillRect(-w / 2 + tilt * 6, -h / 2, w, h); ctx.strokeRect(-w / 2 + tilt * 6, -h / 2, w, h); ctx.fillStyle = '#333'; if (!tilt) { ctx.fillRect(-w / 2 + 1, -0.5, w - 2, 1); } ctx.restore(); }
          const last = path[path.length - 1]; ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(phase === 'done' && cleared > round ? '🔔' : '🔕', last.x + Math.cos(last.a) * 16, last.y + Math.sin(last.a) * 16);
          ctx.font = '18px sans-serif'; ctx.fillText('👆', path[0].x - Math.cos(path[0].a) * 14, path[0].y - Math.sin(path[0].a) * 14 - 6);
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, 8, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 21); }
        }
        function frame(now) { if (!running) return; if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt, now); if (!running) return; render(now); if (now - startTime > TIME_LIMIT_MS) { finish(); return; } rafId = requestAnimationFrame(frame); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId); pushBtn.disabled = true;
          const score = clamp(Math.round(10 + cleared * 28 + (cleared >= ROUNDS ? 6 : 0)), 10, 100);
          say(cleared >= ROUNDS ? '🏆ぜんぶ🔔までとどいた!' : `おわり!${cleared}もんクリア`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const DOMINO_RUN_VARIANTS = [mg('domino-run', makeDominoRunGame({ title: 'ドミノたおし!かけたところをうめて🔔まで' }))];

  // ================================================================
  // 新作バッチ6(2026-09-09): ナンプレ(4×4/6×6) / マンカラ / ひこうき ちゃくりく
  // ================================================================

  // --- ナンプレ: たて・よこ・ブロックに おなじ かずが 1つずつ。マスを タップして かずを えらぶ ---
  function makeSudokuGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = difficulty > 0.55 ? 6 : 4, BR = N === 6 ? 2 : 2, BC = N === 6 ? 3 : 2, ROUNDS = N === 6 ? 2 : 3, TIME_LIMIT_MS = mgDuration(200000);
        let running = true, rafId = null, sol, grid, fixed, sel = null, round = 0, solved = 0, mistakes = 0, msg = '', msgUntil = 0, solvedAt = 0, popAt = {};
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="sdRound">1/${ROUNDS}もんめ</span><span id="sdMiss">ミス0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="sdCanvas"></canvas></div>
          <div class="mg-hint" id="sdHint">たて・よこ・ふといわくのなかに、1〜${N}が1つずつはいる。マスをタップしてえらび、したのかずボタンでいれる。まちがうとあかくひかる</div>
          <div class="mg-tilt-dpad" id="sdPad" style="grid-template-columns:repeat(${N === 6 ? 4 : 3},1fr)"></div>`;
        const pad = container.querySelector('#sdPad'); for (let v = 1; v <= N; v++) { const b = document.createElement('button'); b.className = 'mg-tap-btn'; b.textContent = String(v); b.dataset.v = String(v); pad.appendChild(b); } const clr = document.createElement('button'); clr.className = 'mg-tap-btn'; clr.textContent = 'けす'; clr.dataset.v = '0'; pad.appendChild(clr);
        const canvas = container.querySelector('#sdCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const PAD = 10, CELL = (W - PAD * 2) / N;
        const roundEl = container.querySelector('#sdRound'), missEl = container.querySelector('#sdMiss'), hint = container.querySelector('#sdHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { roundEl.textContent = `${Math.min(ROUNDS, round + 1)}/${ROUNDS}もんめ`; missEl.textContent = `ミス${mistakes}`; };
        function base(r, c) { return ((r % BR) * BC + Math.floor(r / BR) + c) % N; }
        function gen() {
          const perm = [...Array(N).keys()].sort(() => Math.random() - 0.5).map((v) => v + 1); const rows = []; for (let b = 0; b < N / BR; b++) { const rs = [...Array(BR).keys()].sort(() => Math.random() - 0.5); for (const r of rs) rows.push(b * BR + r); } const cols = []; for (let b = 0; b < N / BC; b++) { const cs = [...Array(BC).keys()].sort(() => Math.random() - 0.5); for (const c of cs) cols.push(b * BC + c); }
          sol = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => perm[base(rows[r], cols[c])]));
          const blanks = N === 4 ? Math.round(lerp(7, 9, difficulty)) + round : 18 + round * 2; grid = sol.map((r) => r.slice()); fixed = sol.map((r) => r.map(() => true)); const cells = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]); cells.sort(() => Math.random() - 0.5); for (let i = 0; i < blanks; i++) { const [r, c] = cells[i]; grid[r][c] = 0; fixed[r][c] = false; }
          sel = null; solvedAt = 0; popAt = {};
        }
        gen(); hud();
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || solvedAt) return; const p = mgPointerPos(canvas, e); const c = Math.floor((p.x - PAD) / CELL), r = Math.floor((p.y - PAD) / CELL); if (r < 0 || c < 0 || r >= N || c >= N) return; if (fixed[r][c]) { sel = null; say('それはさいしょからあるかず', 700); return; } sel = [r, c]; });
        pad.addEventListener('pointerdown', (e) => {
          e.preventDefault(); const b = e.target.closest('button');
          if (!b || !running || solvedAt) return;
          if (!sel) { say('まずマスをタップして', 700); return; }
          const v = +b.dataset.v; const [r, c] = sel;
          if (v === 0) { grid[r][c] = 0; return; }
          grid[r][c] = v; popAt[r + ',' + c] = performance.now();
          if (v !== sol[r][c]) {
            mistakes++; sfx('bad'); hud(); say('❌ちがう…', 700);
          } else if (grid.every((row, rr) => row.every((val, cc) => val === sol[rr][cc]))) {
            solvedAt = performance.now(); solved++; sfx('coin'); say('🎉かんせい!', 1500);
            setTimeout(() => { if (!running) return; round++; if (round >= ROUNDS) { finish(); return; } gen(); hud(); }, 1700);
          } else { sfx('tick'); }
        });
        const conflict = (r, c) => { const v = grid[r][c]; if (!v) return false; for (let i = 0; i < N; i++) { if (i !== c && grid[r][i] === v) return true; if (i !== r && grid[i][c] === v) return true; } const br = Math.floor(r / BR) * BR, bc = Math.floor(c / BC) * BC; for (let rr = br; rr < br + BR; rr++) for (let cc = bc; cc < bc + BC; cc++) if ((rr !== r || cc !== c) && grid[rr][cc] === v) return true; return false; };
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#f8f5ee'; ctx.fillRect(0, 0, W, H);
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const x = PAD + c * CELL, y = PAD + r * CELL; const inSelLine = sel && (sel[0] === r || sel[1] === c || (Math.floor(sel[0] / BR) === Math.floor(r / BR) && Math.floor(sel[1] / BC) === Math.floor(c / BC))); ctx.fillStyle = sel && sel[0] === r && sel[1] === c ? '#ffe08a' : inSelLine ? '#f1ead6' : fixed[r][c] ? '#ebe6da' : '#fff'; ctx.fillRect(x, y, CELL, CELL); const v = grid[r][c]; if (v) { const bad = conflict(r, c); const t = clamp((now - (popAt[r + ',' + c] || 0)) / 200, 0, 1); ctx.fillStyle = bad ? '#c1121f' : fixed[r][c] ? '#222' : '#1d4ed8'; ctx.font = `bold ${Math.round(CELL * (0.5 + (1 - t) * 0.2))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(v), x + CELL / 2, y + CELL / 2 + 1); } }
          ctx.strokeStyle = '#999'; ctx.lineWidth = 1; for (let i = 0; i <= N; i++) { ctx.beginPath(); ctx.moveTo(PAD + i * CELL, PAD); ctx.lineTo(PAD + i * CELL, PAD + N * CELL); ctx.stroke(); ctx.beginPath(); ctx.moveTo(PAD, PAD + i * CELL); ctx.lineTo(PAD + N * CELL, PAD + i * CELL); ctx.stroke(); }
          ctx.strokeStyle = '#222'; ctx.lineWidth = 3; for (let i = 0; i <= N; i += BC) { ctx.beginPath(); ctx.moveTo(PAD + i * CELL, PAD); ctx.lineTo(PAD + i * CELL, PAD + N * CELL); ctx.stroke(); } for (let i = 0; i <= N; i += BR) { ctx.beginPath(); ctx.moveTo(PAD, PAD + i * CELL); ctx.lineTo(PAD + N * CELL, PAD + i * CELL); ctx.stroke(); }
          if (solvedAt) { const t = clamp((now - solvedAt) / 400, 0, 1); ctx.fillStyle = `rgba(255,255,255,${0.6 * t})`; ctx.fillRect(0, 0, W, H); ctx.font = `${Math.round(50 * t)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🎉', W / 2, H / 2); }
          if (now < msgUntil) { ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 90, H / 2 - 14, 180, 28); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; render(now); if (now - startTime > TIME_LIMIT_MS) { finish(); return; } rafId = requestAnimationFrame(loop); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId); pad.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(10 + solved * (90 / ROUNDS) - mistakes * 3), 10, 100);
          say(solved >= ROUNDS ? `🏆ぜんもんかんせい!ミス${mistakes}` : `おわり!${solved}もんかんせい`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const SUDOKU_VARIANTS = [mg('sudoku-mini', makeSudokuGame({ title: 'ナンプレ!かずをぜんぶうめよう' }))];

  // --- マンカラ(カラー): じぶんの あなを タップして たねを はんとけいまわりに まく。
  //     さいごが じぶんの ストアなら もう1かい、からの じぶんの あななら むかいを とる ---
  function makeMancalaGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const PITS = 6, TIME_LIMIT_MS = mgDuration(180000);
        // pits[0..5] じぶん(した、ひだり→みぎ)、pits[6] じぶんの ストア、pits[7..12] あいて(うえ、みぎ→ひだり)、pits[13] あいての ストア
        let pits = Array(14).fill(4), running = true, rafId = null, turn = 0, msg = '', msgUntil = 0, aiAt = 0, anim = [], moves = 0, lastFrom = -1;
        pits[6] = 0; pits[13] = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="mkTurn">あなたのばん</span><span id="mkScore">🟢 0 - 0 🟠</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="mkCanvas"></canvas></div>
          <div class="mg-hint" id="mkHint">したのじぶんのあなをタップ。たねを1つずつみぎまわりにまく。さいごのたねがみぎのじぶんのストアにはいるともう1かい。からのじぶんのあなにおちるとむかいのたねももらえる</div>`;
        const canvas = container.querySelector('#mkCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 200);
        const turnEl = container.querySelector('#mkTurn'), scoreEl = container.querySelector('#mkScore'), hint = container.querySelector('#mkHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { turnEl.textContent = turn === 0 ? 'あなたのばん' : 'あいてのばん…'; scoreEl.textContent = `🟢 ${pits[6]} - ${pits[13]} 🟠`; };
        const SX = 34, GAP = (W - SX * 2) / PITS; const pitPos = (i) => (i < 6 ? { x: SX + (i + 0.5) * GAP, y: H * 0.7 } : i === 6 ? { x: W - SX / 2, y: H / 2 } : i < 13 ? { x: SX + (12 - i + 0.5) * GAP, y: H * 0.3 } : { x: SX / 2, y: H / 2 });
        function sow(p, i) { const b = p.slice(); const who = i < 6 ? 0 : 1; let seeds = b[i]; b[i] = 0; let k = i; const path = []; while (seeds > 0) { k = (k + 1) % 14; if ((who === 0 && k === 13) || (who === 1 && k === 6)) continue; b[k]++; seeds--; path.push(k); } let extra = false, captured = 0; const store = who === 0 ? 6 : 13; if (k === store) extra = true; else if (b[k] === 1 && ((who === 0 && k < 6) || (who === 1 && k >= 7 && k < 13))) { const opp = 12 - k; if (b[opp] > 0) { captured = b[opp] + 1; b[store] += captured; b[opp] = 0; b[k] = 0; } } return { b, extra, captured, path }; }
        const sideEmpty = (b, who) => (who === 0 ? b.slice(0, 6) : b.slice(7, 13)).every((v) => v === 0);
        function finishBoard(b) { const nb = b.slice(); for (let i = 0; i < 6; i++) { nb[6] += nb[i]; nb[i] = 0; } for (let i = 7; i < 13; i++) { nb[13] += nb[i]; nb[i] = 0; } return nb; }
        function evaluate(b) { return (b[13] - b[6]) + (b.slice(7, 13).reduce((a, v) => a + v, 0) - b.slice(0, 6).reduce((a, v) => a + v, 0)) * 0.15; }
        function search(b, who, depth) { if (sideEmpty(b, 0) || sideEmpty(b, 1)) { const f = finishBoard(b); return (f[13] - f[6]) * 3; } if (depth === 0) return evaluate(b); const moves = []; for (let i = who === 0 ? 0 : 7; i < (who === 0 ? 6 : 13); i++) if (b[i] > 0) moves.push(i); if (!moves.length) return evaluate(b); let best = who === 1 ? -Infinity : Infinity; for (const m of moves) { const r = sow(b, m); const v = r.extra ? search(r.b, who, depth - 1) : search(r.b, 1 - who, depth - 1); best = who === 1 ? Math.max(best, v) : Math.min(best, v); } return best; }
        function aiMove() { const opts = []; for (let i = 7; i < 13; i++) if (pits[i] > 0) opts.push(i); if (!opts.length) { end(); return; } let best = opts[0], bv = -Infinity; const depth = difficulty < 0.35 ? 1 : 3; for (const m of opts) { const r = sow(pits, m); let v = (r.extra ? search(r.b, 1, depth) : search(r.b, 0, depth)) + (Math.random() - 0.5) * lerp(2, 0.2, difficulty); if (v > bv) { bv = v; best = m; } } play(best); }
        function play(i) {
          const who = i < 6 ? 0 : 1; const r = sow(pits, i); const now = performance.now(); anim = r.path.map((k, j) => ({ from: pitPos(i), to: pitPos(k), at: now + j * 90 })); lastFrom = i; moves++; sfx('pop');
          setTimeout(() => { if (!running) return; pits = r.b; hud();
            if (r.captured) say(who === 0 ? `🟢 ${r.captured}こゲット!` : `🟠あいてが${r.captured}ことった`, 1000);
            if (sideEmpty(pits, 0) || sideEmpty(pits, 1)) { pits = finishBoard(pits); hud(); end(); return; }
            if (r.extra) { say(who === 0 ? '✨もう1かい!' : '🟠あいてがもう1かい', 900); if (who === 1) aiAt = performance.now() + 700; return; }
            turn = 1 - who; hud(); if (turn === 1) aiAt = performance.now() + 700; }, r.path.length * 90 + 200);
          anim.busyUntil = now + r.path.length * 90 + 200;
        }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || turn !== 0 || (anim.busyUntil && performance.now() < anim.busyUntil)) return; const p = mgPointerPos(canvas, e); for (let i = 0; i < 6; i++) { const q = pitPos(i); if (Math.hypot(p.x - q.x, p.y - q.y) < GAP * 0.48) { if (pits[i] === 0) { say('そのあなはからっぽ', 700); return; } play(i); return; } } });
        function seeds(x, y, n, r) { for (let k = 0; k < n; k++) { const a = k * 2.4, d = Math.min(r * 0.62, 3 + k * 1.6); const sx = x + Math.cos(a) * d, sy = y + Math.sin(a) * d * 0.7; ctx.fillStyle = ['#e63946', '#2a9d8f', '#ffb703', '#8338ec', '#3a86ff'][k % 5]; ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(sx - 1, sy - 1, 1.1, 0, Math.PI * 2); ctx.fill(); } }
        function render(now) {
          if (!ctx) return;
          const wood = ctx.createLinearGradient(0, 0, W, H); wood.addColorStop(0, '#9a6b3f'); wood.addColorStop(1, '#6b4423'); ctx.fillStyle = wood; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo(0, i * H / 10 + 4); ctx.bezierCurveTo(W / 3, i * H / 10 - 6, W * 2 / 3, i * H / 10 + 10, W, i * H / 10); ctx.stroke(); }
          for (let i = 0; i < 14; i++) { const q = pitPos(i); const store = i === 6 || i === 13; const rw = store ? SX * 0.42 : GAP * 0.42, rh = store ? H * 0.42 : GAP * 0.42; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(q.x, q.y + 2, rw, rh, 0, 0, Math.PI * 2); ctx.fill(); const g = ctx.createRadialGradient(q.x, q.y - rh * 0.3, 2, q.x, q.y, Math.max(rw, rh)); g.addColorStop(0, '#3d2814'); g.addColorStop(1, '#5a3a1e'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(q.x, q.y, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
            if (turn === 0 && i < 6 && pits[i] > 0 && running && !(anim.busyUntil && now < anim.busyUntil)) { ctx.strokeStyle = `rgba(120,255,160,${0.4 + 0.3 * Math.sin(now / 200)})`; ctx.lineWidth = 2; ctx.stroke(); }
            if (i === lastFrom) { ctx.strokeStyle = 'rgba(255,220,80,.6)'; ctx.lineWidth = 2; ctx.stroke(); }
            const shown = (anim.busyUntil && now < anim.busyUntil) ? (i === lastFrom ? 0 : pits[i] + anim.filter((a) => a.to === pitPos(i) && false).length) : pits[i];
            seeds(q.x, q.y, Math.min(shown, store ? 24 : 12), Math.min(rw, rh)); ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(shown), q.x, q.y + (store ? rh + 10 : (i < 6 ? rh + 9 : -rh - 9))); }
          for (const a of anim) { const t = clamp((now - a.at) / 180, 0, 1); if (t <= 0 || t >= 1) continue; const x = lerp(a.from.x, a.to.x, t), y = lerp(a.from.y, a.to.y, t) - Math.sin(t * Math.PI) * 30; ctx.fillStyle = '#ffb703'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🟠あいて', W / 2, 10); ctx.fillText('🟢あなた', W / 2, H - 8); ctx.fillText('じぶんの', W - SX / 2, H / 2 - H * 0.42 - 12); ctx.fillText('ストア', W - SX / 2, H / 2 - H * 0.42 - 3);
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(W / 2 - 90, H / 2 - 13, 180, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2); }
        }
        function loop(now) { if (!running) return; if (turn === 1 && aiAt && now >= aiAt) { aiAt = 0; aiMove(); if (!running) return; } render(now); if (now - startTime > TIME_LIMIT_MS) { pits = finishBoard(pits); end(); return; } rafId = requestAnimationFrame(loop); }
        function end() {
          if (!running) return; running = false; cancelAnimationFrame(rafId); hud();
          const me = pits[6], ai = pits[13]; const score = me > ai ? clamp(70 + (me - ai) * 2, 70, 100) : me === ai ? 50 : clamp(45 - (ai - me) * 2, 15, 45);
          say(me > ai ? `🏆 ${me} - ${ai}でかち!` : me === ai ? 'ひきわけ' : `${me} - ${ai}でまけ…`, 2600); turnEl.textContent = 'しゅうりょう'; render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(loop);
      },
    };
  }
  const MANCALA_VARIANTS = [mg('mancala-kalah', makeMancalaGame({ title: 'マンカラ!たねをまいてストアにあつめよう' }))];

  // --- ひこうき ちゃくりく: ▲▼で きしゅを あげさげ、みどりの グライドパスに のって
  //     かっそうろの ⬛の うえに、ゆっくり おりる。3かい ちゃくりく ---
  function makePlaneLandingGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const LANDINGS = 3;
        let running = true, rafId = null, last = null, n = 0, x = 0, alt = 0, vy = 0, pitch = 0, upHeld = false, downHeld = false, drag = null, wind = 0, gust = 0, results = [], phase = 'fly', msg = '', msgUntil = 0, total = 0, camX = 0, flareBonus = false;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="plNo">1/${LANDINGS}かいめ</span><span id="plScore">ごうけい0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="plCanvas"></canvas></div>
          <div class="mg-hint" id="plHint">▲▼か縦ドラッグで機首を上げ下げ。緑の線をめやすに、滑走路の⬛へふわっと降りよう。風で浮き沈みするよ</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="plUp" data-key="up">▲あげる</button><button class="mg-tap-btn mg-hold-btn" id="plDown" data-key="down">▼さげる</button></div>`;
        const canvas = container.querySelector('#plCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 230);
        const noEl = container.querySelector('#plNo'), scoreEl = container.querySelector('#plScore'), hint = container.querySelector('#plHint');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { noEl.textContent = `${Math.min(LANDINGS, n + 1)}/${LANDINGS}かいめ`; scoreEl.textContent = `ごうけい${total}`; };
        bindHeldButton(container.querySelector('#plUp'), (v) => { upHeld = v; });
        bindHeldButton(container.querySelector('#plDown'), (v) => { downHeld = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) {} const p = mgPointerPos(canvas, e); drag = { id: e.pointerId, y: p.y, pitch }; });
        canvas.addEventListener('pointermove', (e) => { if (!drag || e.pointerId !== drag.id) return; const p = mgPointerPos(canvas, e); pitch = clamp(drag.pitch - (p.y - drag.y) / 60, -1, 1); });
        const endDrag = () => { drag = null; }; canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
        // ワールド: x 0..400(m)、かっそうろ 300..400、ちゃくりく ゾーン 310..345。グライドパス: alt = (300 - x) * 0.1 (m)
        const RUN0 = 300, ZONE = [310, 345], SPEED = lerp(26, 32, difficulty);
        const glide = (px) => Math.max(0, (RUN0 + 6 - px) * 0.1);
        function reset() { x = 0; alt = glide(0) + 4; vy = 0; pitch = 0; wind = (Math.random() - 0.5) * lerp(0.6, 1.4, difficulty); phase = 'fly'; flareBonus = false; say(`${n + 1}かいめ: 緑の線にあわせよう`, 1400); }
        reset();
        function update(dt, now) {
          if (phase !== 'fly') return;
          const kp = (upHeld ? 1 : 0) - (downHeld ? 1 : 0); if (kp) pitch = clamp(pitch + kp * dt * 1.8, -1, 1); else if (!drag) pitch += (0 - pitch) * Math.min(1, dt * 0.8);
          gust += ((Math.random() - 0.5) * 2 - gust) * Math.min(1, dt * 0.6);
          const targetVy = pitch * 6 - 2.8 + wind * 0.8 + gust * lerp(0.4, 0.9, difficulty); vy += (targetVy - vy) * Math.min(1, dt * 2.2);
          alt += vy * dt; x += SPEED * dt; camX += (x - camX) * Math.min(1, dt * 6);
          if (alt <= 0) { alt = 0; phase = 'landed'; judge(); return; }
          if (x > 420) { phase = 'landed'; results.push(0); total += 0; say('💦かっそうろをとおりすぎた…やりなおし', 1600); hud(); setTimeout(next, 1800); return; }
          if (alt > 45) { alt = 45; vy = Math.min(vy, 0); }
        }
        function judge() {
          const onRunway = x >= RUN0 && x <= 400; const inZone = x >= ZONE[0] && x <= ZONE[1]; const soft = -vy;
          let pts = 0, text;
          if (!onRunway) { text = '💥かっそうろのそとについた…'; pts = 0; }
          else if (soft > 4.5) { text = `💥かたいちゃくりく(${soft.toFixed(1)}m/s)…`; pts = 10; }
          else { pts = 40 + (inZone ? 30 : 10) + Math.round(clamp((4.5 - soft) / 4.5, 0, 1) * 30); text = pts >= 90 ? `🌟パーフェクトランディング!${pts}` : soft < 2 ? `✨ふわっとちゃくりく!${pts}` : `ちゃくりく${pts}`; }
          results.push(pts); total += pts; sfx(pts >= 70 ? 'coin' : pts > 10 ? 'hit' : 'bad'); hud(); say(text, 1800); setTimeout(next, 2000);
        }
        function next() { if (!running) return; n++; if (n >= LANDINGS) { finish(); return; } hud(); reset(); }
        const sx = (wx) => W * 0.3 + (wx - camX) * 2.2, sy = (a) => H - 40 - a * 3.6;
        function render(now) {
          if (!ctx) return;
          const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5aa9ff'); sky.addColorStop(1, '#cfe9ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 4; i++) { const cx = ((i * 130 - camX * 0.6) % (W + 100) + W + 100) % (W + 100) - 50; ctx.beginPath(); ctx.arc(cx, 30 + i * 18, 12, 0, Math.PI * 2); ctx.arc(cx + 14, 26 + i * 18, 15, 0, Math.PI * 2); ctx.arc(cx + 30, 32 + i * 18, 10, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = '#5faa4a'; ctx.fillRect(0, H - 40, W, 40);
          const r0 = sx(RUN0), r1 = sx(400); ctx.fillStyle = '#4a4a55'; ctx.fillRect(r0, H - 42, r1 - r0, 14); ctx.fillStyle = '#222'; ctx.fillRect(sx(ZONE[0]), H - 42, sx(ZONE[1]) - sx(ZONE[0]), 14); ctx.fillStyle = '#fff'; for (let m = RUN0 + 5; m < 400; m += 10) ctx.fillRect(sx(m), H - 36, 4, 2); ctx.fillStyle = '#ffd23f'; ctx.fillRect(sx(ZONE[0]), H - 42, 2, 14); ctx.fillRect(sx(ZONE[1]), H - 42, 2, 14);
          ctx.strokeStyle = 'rgba(80,220,120,.7)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx(-40), sy(glide(-40))); ctx.lineTo(sx(RUN0 + 6), sy(0)); ctx.stroke(); ctx.setLineDash([]);
          // きしゅ
          const px = sx(x), py = sy(alt); const ang = -clamp(pitch * 0.35 + vy * 0.03, -0.6, 0.6);
          ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, sy(0) - py + 2, 20, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f1faee'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(-14, -2); ctx.lineTo(-22, -14); ctx.lineTo(-16, -14); ctx.lineTo(-8, -2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(10, 10); ctx.lineTo(4, 10); ctx.lineTo(-10, 2); ctx.fill(); ctx.fillStyle = '#457b9d'; ctx.fillRect(6, -5, 8, 3); ctx.rotate(-ang); ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(currentSprite(), 0, -1); ctx.restore();
          // けいき
          ctx.fillStyle = 'rgba(0,0,0,.45)'; mgRoundRect(ctx, 6, 6, 110, 40, 6); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(`たかさ${alt.toFixed(1)}m`, 12, 10); ctx.fillStyle = vy < -4 ? '#ff6b6b' : '#7fe0a0'; ctx.fillText(`こうか${(-vy).toFixed(1)}m/s`, 12, 22); ctx.fillStyle = '#fff'; ctx.fillText(`かぜ${wind > 0.2 ? '⬆' : wind < -0.2 ? '⬇' : '—'} ${Math.abs(wind).toFixed(1)}`, 12, 34);
          const diff = alt - glide(x); ctx.fillStyle = 'rgba(0,0,0,.45)'; mgRoundRect(ctx, W - 26, 10, 16, 80, 5); ctx.fillStyle = Math.abs(diff) < 3 ? '#7fe0a0' : '#ffd23f'; ctx.fillRect(W - 24, 50 - clamp(diff, -8, 8) * 4.5 - 3, 12, 6); ctx.fillStyle = '#fff'; ctx.fillRect(W - 26, 49, 16, 2); ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('目安', W - 18, 92);
          if (now < msgUntil) { ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W / 2 - 100, H / 2 - 40, 200, 26); ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H / 2 - 27); }
        }
        function frame(now) { if (!running) return; if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt, now); if (!running) return; render(now); rafId = requestAnimationFrame(frame); }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId); container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(10 + total / LANDINGS * 0.9), 10, 100);
          say(`おわり!ごうけい${total}てん`, 2600); render(performance.now());
          setTimeout(() => onComplete(score), 1000);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const PLANE_LANDING_VARIANTS = [mg('plane-landing', makePlaneLandingGame({ title: 'ひこうきちゃくりく!ふわっとおりよう' }))];

  // うちゅうの はいけい(ふかい グラデーション + 星雲の もや + またたく 星 +
  // まるい わくせい)。アステロイド/スペースガンナー などで 共通に つかう
  function mgSpaceBackdrop(ctx, W, H, now, opts = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, opts.top || '#070a24'); g.addColorStop(1, opts.bottom || '#120a2e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const blobs = opts.blobs || [[0.2, 0.3, 0.55, 'rgba(120,70,200,.28)'], [0.8, 0.7, 0.6, 'rgba(40,140,220,.22)'], [0.6, 0.15, 0.35, 'rgba(255,110,170,.16)']];
    for (const [nx, ny, nr, col] of blobs) {
      const r = ctx.createRadialGradient(nx * W, ny * H, 0, nx * W, ny * H, nr * W); r.addColorStop(0, col); r.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    }
    if (opts.stars !== false) {
      const n = opts.starCount || (perfLow() ? 18 : 46);
      for (let i = 0; i < n; i++) {
        const h1 = Math.sin(i * 12.9898) * 43758.5453, h2 = Math.sin(i * 78.233) * 12345.678, h3 = Math.sin(i * 39.17) * 9876.54;
        const x = (h1 - Math.floor(h1)) * W, y = (h2 - Math.floor(h2)) * H, k = h3 - Math.floor(h3);
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(now / (500 + k * 900) + i));
        ctx.globalAlpha = tw; ctx.fillStyle = k > 0.8 ? '#ffe9b3' : k > 0.6 ? '#bfe3ff' : '#ffffff'; const sz = k > 0.9 ? 2.2 : 1.3;
        ctx.fillRect(x, y, sz, sz);
      }
      ctx.globalAlpha = 1;
    }
    if (opts.planet) {
      const [px, py, pr, c1, c2] = opts.planet;
      const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr); pg.addColorStop(0, c1); pg.addColorStop(1, c2);
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, pr * 1.7, pr * 0.45, -0.35, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // メッセージを 文字はばに あわせた くろい おびで えがく(バッチ7いこうの 共通)
  function mgMsgBox(ctx, W, text, cy, size = 14) {
    ctx.font = `bold ${size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = Math.min(W - 8, ctx.measureText(text).width + 22);
    ctx.fillStyle = 'rgba(0,0,0,.62)'; mgRoundRect(ctx, W / 2 - tw / 2, cy - 13, tw, 26, 7);
    ctx.fillStyle = '#fff'; ctx.fillText(text, W / 2, cy);
  }
  // ================================================================
  // 新作バッチ7(2026-09-09): ドットイーター / ミサイルコマンド / じんとり
  // ================================================================

  // --- ドットイーター(canvas): めいろの ドットを ぜんぶ たべる。おばけに
  //     つかまらないよう にげ、パワーエサ(⭐)を たべると おばけを たべかえせる ---
  function makeDotEaterGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = 15, DURATION_MS = mgDuration(95000);
        const GHOST_COUNT = difficulty < 0.35 ? 2 : 3;
        const CHASE_P = lerp(0.55, 0.85, difficulty);
        const PLAYER_SPEED = 4.6, GHOST_SPEED = lerp(3.4, 4.3, difficulty), FRIGHT_SPEED = 2.6;
        let running = true, rafId = null, last = null, dots = 0, dotsTotal = 0, eatenGhosts = 0, lives = minigameEase() >= 1 ? 3 : 2, msg = '', msgUntil = 0, frightUntil = 0, caughtAt = 0, cleared = false, swipe = null, mouth = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="deTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="deScore">● 0/0／❤️ 2</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="deCanvas"></canvas></div>
          <div class="mg-hint" id="deHint">十字キーかがめんスワイプですすむ。ドットをぜんぶたべよう。⭐をたべると6びょうおばけをたべかえせる!</div>
          <div class="mg-tilt-dpad"><span></span><button class="mg-tap-btn" id="deUp" data-key="up">▲</button><span></span><button class="mg-tap-btn" id="deLeft" data-key="left">◀</button><button class="mg-tap-btn" id="deDown" data-key="down">▼</button><button class="mg-tap-btn" id="deRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#deCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N;
        const timerEl = container.querySelector('#deTimer'), scoreEl = container.querySelector('#deScore'), hint = container.querySelector('#deHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `● ${dotsTotal - dots}/${dotsTotal}／${'❤️'.repeat(Math.max(0, lives))}`; };
        // めいろ: ループ多めで にげみちを つくる。まんなかは おばけの おうち
        const map = generateMaze(N, N, 16).map((r) => r.split(''));
        for (let y = 6; y <= 8; y++) for (let x = 6; x <= 8; x++) map[y][x] = '.';
        for (let x = 5; x <= 9; x++) { map[5][x] = '.'; map[9][x] = '.'; }
        map[5][7] = '.'; map[4][7] = '.';
        const open = (x, y) => x >= 0 && y >= 0 && x < N && y < N && map[y][x] === '.';
        // ドット: ゆかの ぜんぶ(おばけの おうち いがい)。かどの 4つは パワーエサ
        const dot = Array.from({ length: N }, () => Array(N).fill(0));
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (open(x, y) && !(x >= 6 && x <= 8 && y >= 6 && y <= 8)) { dot[y][x] = 1; dots++; } }
        for (const [x, y] of [[1, 1], [N - 2, 1], [1, N - 2], [N - 2, N - 2]]) { if (open(x, y)) { if (!dot[y][x]) { dot[y][x] = 1; dots++; } dot[y][x] = 2; } }
        dotsTotal = dots;
        const player = { x: 1, y: 1, dir: [0, 0], want: [0, 0] };
        const ghosts = [];
        const GHOST_COLORS = ['#ff5a7a', '#5ad0ff', '#ffb050'];
        for (let i = 0; i < GHOST_COUNT; i++) ghosts.push({ x: 6 + i, y: 7, dir: [0, -1], color: GHOST_COLORS[i], dead: 0, releaseAt: startTime + i * 2500, home: [6 + i, 7] });
        function turnTo(dx, dy) { player.want = [dx, dy]; }
        const bind = (id, dx, dy) => container.querySelector(id).addEventListener('pointerdown', (e) => { e.preventDefault(); turnTo(dx, dy); });
        bind('#deUp', 0, -1); bind('#deDown', 0, 1); bind('#deLeft', -1, 0); bind('#deRight', 1, 0);
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; if (Math.hypot(dx, dy) < 18) return; if (Math.abs(dx) > Math.abs(dy)) turnTo(Math.sign(dx), 0); else turnTo(0, Math.sign(dy)); swipe = null; });
        const endSwipe = () => { swipe = null; }; canvas.addEventListener('pointerup', endSwipe); canvas.addEventListener('pointercancel', endSwipe);
        // マスの まん中に ついた ときだけ まがれる(ぎゃくむきは いつでも)。
        // すすむ さきが かべなら まん中で とまる。1フレームで まん中を
        // とおりこす ぶんは、まん中で いちど とまって はんていし なおす
        function moveEntity(ent, speed, dt, chooser) {
          let step = speed * dt / 1000;
          let guard = 0;
          while (step > 0 && guard++ < 8) {
            const cx = Math.round(ent.x), cy = Math.round(ent.y);
            const atCenter = Math.abs(ent.x - cx) + Math.abs(ent.y - cy) < 1e-6;
            if (atCenter) {
              ent.x = cx; ent.y = cy;
              const want = chooser(ent, cx, cy);
              if (want && (want[0] || want[1]) && open(cx + want[0], cy + want[1])) ent.dir = want;
              if (!(ent.dir[0] || ent.dir[1]) || !open(cx + ent.dir[0], cy + ent.dir[1])) { ent.dir = [0, 0]; return; }
              const mv = Math.min(step, 1);
              ent.x += ent.dir[0] * mv; ent.y += ent.dir[1] * mv; step -= mv;
              if (mv === 1) { ent.x = Math.round(ent.x); ent.y = Math.round(ent.y); } else return;
            } else {
              const want = ent.want;
              if (want && (want[0] || want[1]) && want[0] === -ent.dir[0] && want[1] === -ent.dir[1]) ent.dir = want;
              const tx = ent.dir[0] > 0 ? Math.ceil(ent.x - 1e-9) : ent.dir[0] < 0 ? Math.floor(ent.x + 1e-9) : Math.round(ent.x);
              const ty = ent.dir[1] > 0 ? Math.ceil(ent.y - 1e-9) : ent.dir[1] < 0 ? Math.floor(ent.y + 1e-9) : Math.round(ent.y);
              const d = Math.abs(tx - ent.x) + Math.abs(ty - ent.y);
              if (d < 1e-9) { ent.x = tx; ent.y = ty; continue; }
              const mv = Math.min(step, d);
              ent.x += ent.dir[0] * mv; ent.y += ent.dir[1] * mv; step -= mv;
              if (mv >= d - 1e-9) { ent.x = tx; ent.y = ty; }
            }
          }
        }
        function ghostChoose(g, cx, cy) {
          const now = performance.now();
          const options = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => open(cx + dx, cy + dy) && !(dx === -g.dir[0] && dy === -g.dir[1]));
          if (!options.length) return [-g.dir[0], -g.dir[1]];
          const fright = now < frightUntil && !g.dead;
          let target;
          if (g.dead) target = g.home; else target = [player.x, player.y];
          const score = ([dx, dy]) => Math.hypot(cx + dx - target[0], cy + dy - target[1]);
          if (fright) { options.sort((a, b) => score(b) - score(a)); return Math.random() < 0.7 ? options[0] : options[Math.floor(Math.random() * options.length)]; }
          if (g.dead || Math.random() < CHASE_P) { options.sort((a, b) => score(a) - score(b)); return options[0]; }
          return options[Math.floor(Math.random() * options.length)];
        }
        function resetPositions() {
          player.x = 1; player.y = 1; player.dir = [0, 0]; player.want = [0, 0];
          ghosts.forEach((g, i) => { g.x = g.home[0]; g.y = g.home[1]; g.dir = [0, -1]; g.dead = 0; g.releaseAt = performance.now() + 1200 + i * 1500; });
        }
        function update(now, dt) {
          if (caughtAt) { if (now - caughtAt > 1200) { caughtAt = 0; if (lives <= 0) { finish(); return; } resetPositions(); } return; }
          moveEntity(player, PLAYER_SPEED, dt, (ent) => ent.want);
          mouth += dt * 0.012;
          const px = Math.round(player.x), py = Math.round(player.y);
          if (Math.abs(player.x - px) < 0.3 && Math.abs(player.y - py) < 0.3 && dot[py][px]) {
            const kind = dot[py][px]; dot[py][px] = 0; dots--; sfx(kind === 2 ? 'levelup' : 'tick');
            if (kind === 2) { frightUntil = now + 6000; say('⭐おばけをたべかえせ!', 1200); }
            hud();
            if (dots === 0) { cleared = true; say('🎉ぜんぶたべた!', 2500); finish(); return; }
          }
          for (const g of ghosts) {
            if (now < g.releaseAt) continue;
            const fright = now < frightUntil && !g.dead;
            moveEntity(g, g.dead ? 7 : fright ? FRIGHT_SPEED : GHOST_SPEED, dt, ghostChoose);
            if (g.dead && Math.abs(g.x - g.home[0]) < 0.2 && Math.abs(g.y - g.home[1]) < 0.2) { g.dead = 0; g.releaseAt = now + 1500; }
            if (!g.dead && Math.hypot(g.x - player.x, g.y - player.y) < 0.6) {
              if (fright) { g.dead = 1; eatenGhosts++; sfx('coin'); say(`👻たべた!+${eatenGhosts * 5}`, 900); }
              else { lives--; caughtAt = now; say(lives > 0 ? '💫つかまった…' : '💀つかまった…', 1200); hud(); }
            }
          }
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#0b1230'; ctx.fillRect(0, 0, W, H);
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (map[y][x] === '#') { ctx.fillStyle = '#2843a8'; mgRoundRect(ctx, x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2, 3); ctx.fillStyle = '#4a6be0'; mgRoundRect(ctx, x * CELL + 3, y * CELL + 3, CELL - 6, CELL - 6, 2); }
            else if (dot[y][x] === 1) { ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc((x + 0.5) * CELL, (y + 0.5) * CELL, CELL * 0.11, 0, Math.PI * 2); ctx.fill(); }
            else if (dot[y][x] === 2) { const s = 0.6 + 0.2 * Math.sin(now / 130); ctx.font = `${Math.round(CELL * s)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⭐', (x + 0.5) * CELL, (y + 0.5) * CELL + 1); }
          }
          // おばけ
          for (const g of ghosts) {
            const gx = (g.x + 0.5) * CELL, gy = (g.y + 0.5) * CELL, r = CELL * 0.42;
            const fright = now < frightUntil && !g.dead;
            const blink = fright && frightUntil - now < 1800 && Math.floor(now / 160) % 2 === 0;
            ctx.fillStyle = g.dead ? 'rgba(255,255,255,.25)' : fright ? (blink ? '#fff' : '#3b3bd6') : g.color;
            ctx.beginPath(); ctx.arc(gx, gy - r * 0.15, r, Math.PI, 0); ctx.lineTo(gx + r, gy + r * 0.75);
            for (let i = 0; i < 4; i++) { const fx = gx + r - (i + 0.5) * (r / 2); ctx.lineTo(fx, gy + r * 0.75 - (i % 2 ? 0 : r * 0.3)); }
            ctx.lineTo(gx - r, gy + r * 0.75); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(gx + s * r * 0.38, gy - r * 0.2, r * 0.26, 0, Math.PI * 2); ctx.fill(); }
            ctx.fillStyle = fright ? '#f55' : '#223'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(gx + s * r * 0.38 + g.dir[0] * r * 0.1, gy - r * 0.2 + g.dir[1] * r * 0.1, r * 0.13, 0, Math.PI * 2); ctx.fill(); }
          }
          // プレイヤー
          const px = (player.x + 0.5) * CELL, py = (player.y + 0.5) * CELL, pr = CELL * 0.44;
          const moving = player.dir[0] || player.dir[1];
          const ang = Math.atan2(player.dir[1], player.dir[0] || (moving ? 0 : 1));
          const openAmt = moving ? (0.15 + 0.3 * Math.abs(Math.sin(mouth))) : 0.12;
          ctx.fillStyle = caughtAt && Math.floor((now - caughtAt) / 120) % 2 === 0 ? '#c44' : '#ffd93b';
          ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, pr, ang + openAmt * Math.PI, ang - openAmt * Math.PI + Math.PI * 2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(px + Math.cos(ang - Math.PI / 2) * pr * 0.45 + Math.cos(ang) * pr * 0.1, py + Math.sin(ang - Math.PI / 2) * pr * 0.45 + Math.sin(ang) * pr * 0.1, pr * 0.14, 0, Math.PI * 2); ctx.fill();
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('スタート!', W / 2, H / 2); }
          if (now < msgUntil) mgMsgBox(ctx, W, msg, 29);
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(60, now - last); last = now;
          if (now >= startTime) update(now, dt);
          if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const eatenRatio = (dotsTotal - dots) / Math.max(1, dotsTotal);
          const score = clamp(Math.round(eatenRatio * 68 + eatenGhosts * 5 + (cleared ? 18 : 0) + Math.max(0, lives) * 3), 5, 100);
          if (!cleared) say(lives <= 0 ? `${dotsTotal - dots}こたべた…` : `タイムアップ!${dotsTotal - dots}こたべた`, 2500);
          render(performance.now());
          setTimeout(() => onComplete(score), 1100);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const DOT_EATER_VARIANTS = [mg('dot-eater', makeDotEaterGame({ title: 'ドットイーター!ドットをぜんぶたべておばけからにげろ' }))];

  // --- ミサイルコマンド(canvas): そらを タップして げいげきミサイルを うち、
  //     ばくはつの わで おちてくる ミサイルを けして まちを まもる ---
  function makeMissileCommandGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const WAVES = 3;
        let running = true, rafId = null, last = null, wave = 0, incoming = [], shots = [], booms = [], cities = [], batteries = [], spawnLeft = 0, spawnAt = 0, destroyed = 0, totalIncoming = 0, msg = '', msgUntil = 0, waveEndAt = 0, phase = 'wave', flash = 0;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="mcWave">ウェーブ1/${WAVES}</span><span id="mcScore">💥 0／🏙 6</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="mcCanvas"></canvas></div>
          <div class="mg-hint" id="mcHint">そらをタップするといちばんちかいきちからげいげきミサイルがとぶ。ばくはつのわにミサイルをまきこんでまちをまもれ!きちのだんはウェーブごとにほきゅう</div>`;
        const canvas = container.querySelector('#mcCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 270);
        const GROUND = H - 22;
        const waveEl = container.querySelector('#mcWave'), scoreEl = container.querySelector('#mcScore'), hint = container.querySelector('#mcHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const aliveCities = () => cities.filter((c) => c.alive).length;
        const hud = () => { waveEl.textContent = `ウェーブ${Math.min(WAVES, wave + 1)}/${WAVES}`; scoreEl.textContent = `💥 ${destroyed}／🏙 ${aliveCities()}`; };
        const cityXs = [0.16, 0.27, 0.38, 0.62, 0.73, 0.84];
        cities = cityXs.map((k) => ({ x: k * W, alive: true }));
        batteries = [0.05, 0.5, 0.95].map((k) => ({ x: k * W, ammo: 0, max: 0 }));
        function startWave() {
          phase = 'wave';
          const n = Math.round(lerp(8, 12, difficulty) + wave * 3);
          spawnLeft = n; totalIncoming += n; spawnAt = performance.now() + 600;
          for (const b of batteries) { b.max = Math.round(lerp(8, 6, difficulty) + wave); b.ammo = b.max; }
          say(`ウェーブ${wave + 1}スタート!`, 1200); hud();
        }
        function spawnIncoming(now) {
          const targets = [...cities.filter((c) => c.alive).map((c) => c.x), ...batteries.map((b) => b.x)];
          if (!targets.length) return;
          const tx = targets[Math.floor(Math.random() * targets.length)];
          const sx = Math.random() * W;
          const speed = lerp(22, 34, difficulty) + wave * 5 + Math.random() * 6;
          const dx = tx - sx, dy = GROUND - 0;
          const len = Math.hypot(dx, dy);
          incoming.push({ x: sx, y: 0, sx, sy: 0, vx: dx / len * speed, vy: dy / len * speed, tx, alive: true, born: now });
          // たまに 分裂する ミサイル
          if (wave >= 1 && Math.random() < 0.25) incoming[incoming.length - 1].split = true;
        }
        function fireAt(x, y) {
          if (!running || phase !== 'wave' || y > GROUND - 30) return;
          let best = null, bestD = 1e9;
          for (const b of batteries) { if (b.ammo <= 0) continue; const d = Math.abs(b.x - x); if (d < bestD) { bestD = d; best = b; } }
          if (!best) { say('だんぎれ…つぎのウェーブまでまって', 900); return; }
          best.ammo--;
          const dx = x - best.x, dy = y - (GROUND - 6), len = Math.hypot(dx, dy) || 1, speed = 260;
          shots.push({ x: best.x, y: GROUND - 6, tx: x, ty: y, vx: dx / len * speed, vy: dy / len * speed, sx: best.x, sy: GROUND - 6 });
        }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); fireAt(p.x, p.y); });
        function update(now, dt) {
          const s = dt / 1000;
          if (phase === 'wave') {
            if (spawnLeft > 0 && now >= spawnAt) { spawnIncoming(now); spawnLeft--; spawnAt = now + lerp(1100, 750, difficulty) - wave * 80 + Math.random() * 400; }
            if (spawnLeft === 0 && !incoming.some((m) => m.alive) && !shots.length && !booms.length) { phase = 'between'; waveEndAt = now + 1600; const bonus = batteries.reduce((a, b) => a + b.ammo, 0); say(`ウェーブクリア!のこりだん${bonus}`, 1500); }
          } else if (phase === 'between') {
            if (now >= waveEndAt) { wave++; if (wave >= WAVES) { finish(); return; } startWave(); }
          }
          for (const sh of shots) {
            sh.x += sh.vx * s; sh.y += sh.vy * s;
            if ((sh.vy < 0 && sh.y <= sh.ty) || (sh.vy >= 0 && sh.y >= sh.ty)) { sh.done = true; booms.push({ x: sh.tx, y: sh.ty, r: 4, max: lerp(26, 22, difficulty), born: now, life: 900 }); }
          }
          shots = shots.filter((sh) => !sh.done);
          for (const b of booms) { const t = (now - b.born) / b.life; b.r = t < 0.5 ? b.max * (t / 0.5) : b.max * (1 - (t - 0.5) / 0.5); if (t >= 1) b.done = true; }
          booms = booms.filter((b) => !b.done);
          for (const m of incoming) {
            if (!m.alive) continue;
            m.x += m.vx * s; m.y += m.vy * s;
            if (m.split && m.y > H * 0.35) { m.split = false; for (const k of [-1, 1]) { const targets = cities.filter((c) => c.alive); const tx = targets.length ? targets[Math.floor(Math.random() * targets.length)].x : m.tx; const dx = tx - m.x, dy = GROUND - m.y, len = Math.hypot(dx, dy) || 1, sp = Math.hypot(m.vx, m.vy); incoming.push({ x: m.x, y: m.y, sx: m.x, sy: m.y, vx: dx / len * sp, vy: dy / len * sp, tx, alive: true, born: now }); void k; } totalIncoming += 2; }
            for (const b of booms) { if (Math.hypot(m.x - b.x, m.y - b.y) < b.r) { m.alive = false; destroyed++; sfx('hit'); booms.push({ x: m.x, y: m.y, r: 3, max: 18, born: now, life: 700 }); hud(); break; } }
            if (!m.alive) continue;
            if (m.y >= GROUND) {
              m.alive = false; flash = now;
              const city = cities.find((c) => c.alive && Math.abs(c.x - m.x) < 16);
              if (city) { city.alive = false; say('💥まちがやられた!', 1000); hud(); }
              const bat = batteries.find((b) => Math.abs(b.x - m.x) < 14);
              if (bat && bat.ammo > 0) { bat.ammo = Math.max(0, bat.ammo - 3); say('💥きちがひばくした…だん-3', 1000); }
              booms.push({ x: m.x, y: GROUND, r: 3, max: 16, born: now, life: 600 });
              if (aliveCities() === 0) { finish(); return; }
            }
          }
          incoming = incoming.filter((m) => m.alive || now - m.born < 100);
        }
        function render(now) {
          if (!ctx) return;
          const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05081c'); g.addColorStop(1, '#1a2450');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          if (flash && now - flash < 120) { ctx.fillStyle = 'rgba(255,120,80,.25)'; ctx.fillRect(0, 0, W, H); }
          ctx.fillStyle = '#e8e8f0'; for (let i = 0; i < 26; i++) { const h1 = Math.sin(i * 12.9898) * 43758.5453, h2 = Math.sin(i * 78.233) * 12345.678; const sx = (h1 - Math.floor(h1)) * W, sy = (h2 - Math.floor(h2)) * (GROUND - 60); ctx.globalAlpha = 0.4 + 0.4 * Math.sin(now / 700 + i); ctx.fillRect(sx, sy, 1.5, 1.5); } ctx.globalAlpha = 1;
          ctx.fillStyle = '#3c2f4a'; ctx.fillRect(0, GROUND, W, H - GROUND);
          for (const b of batteries) {
            ctx.fillStyle = '#6b5a7a'; ctx.beginPath(); ctx.moveTo(b.x - 16, GROUND); ctx.lineTo(b.x, GROUND - 14); ctx.lineTo(b.x + 16, GROUND); ctx.closePath(); ctx.fill();
            for (let i = 0; i < b.ammo; i++) { ctx.fillStyle = '#ffd36b'; ctx.fillRect(b.x - 8 + (i % 4) * 4.5, GROUND - 5 - Math.floor(i / 4) * 4, 3, 3); }
          }
          for (const c of cities) {
            if (c.alive) { ctx.fillStyle = '#7bd2ff'; ctx.fillRect(c.x - 9, GROUND - 10, 5, 10); ctx.fillRect(c.x - 3, GROUND - 15, 6, 15); ctx.fillRect(c.x + 4, GROUND - 8, 5, 8); ctx.fillStyle = '#fff6a8'; ctx.fillRect(c.x - 2, GROUND - 12, 2, 2); ctx.fillRect(c.x + 1, GROUND - 8, 2, 2); }
            else { ctx.fillStyle = '#4b3b5a'; ctx.fillRect(c.x - 9, GROUND - 4, 18, 4); }
          }
          ctx.lineWidth = 1.2;
          for (const m of incoming) { if (!m.alive) continue; ctx.strokeStyle = 'rgba(255,90,90,.75)'; ctx.beginPath(); ctx.moveTo(m.sx, m.sy); ctx.lineTo(m.x, m.y); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2); ctx.fill(); }
          for (const sh of shots) { ctx.strokeStyle = 'rgba(120,220,255,.85)'; ctx.beginPath(); ctx.moveTo(sh.sx, sh.sy); ctx.lineTo(sh.x, sh.y); ctx.stroke(); ctx.strokeStyle = '#8ff'; ctx.beginPath(); ctx.moveTo(sh.tx - 4, sh.ty); ctx.lineTo(sh.tx + 4, sh.ty); ctx.moveTo(sh.tx, sh.ty - 4); ctx.lineTo(sh.tx, sh.ty + 4); ctx.stroke(); }
          for (const b of booms) { const t = (now - b.born) / b.life; ctx.fillStyle = `hsla(${40 + t * 300},100%,${70 - t * 20}%,.85)`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); }
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('スタート!', W / 2, H / 2); }
          if (now < msgUntil) mgMsgBox(ctx, W, msg, 29);
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(60, now - last); last = now;
          if (now >= startTime) { if (wave === 0 && totalIncoming === 0 && phase === 'wave' && spawnLeft === 0) startWave(); update(now, dt); }
          if (!running) return;
          render(now);
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const ratio = destroyed / Math.max(1, totalIncoming);
          const score = clamp(Math.round(ratio * 62 + aliveCities() * 6 + (aliveCities() === 6 ? 4 : 0)), 5, 100);
          say(aliveCities() === 0 ? '💥まちがぜんめつ…' : `🎉まもりきった!まち${aliveCities()}/6`, 2500);
          render(performance.now());
          setTimeout(() => onComplete(score), 1200);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const MISSILE_COMMAND_VARIANTS = [mg('missile-command', makeMissileCommandGame({ title: 'ミサイルコマンド!タップでげいげきしてまちをまもれ' }))];

  // --- じんとり(Qix ふう、canvas): ふちを はしり、なかへ せんを ひいて かこむと
  //     その ぶぶんが じぶんの じんち に。うごきまわる ✨に せんを さわられないで ---
  function makeAreaClaimGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const G = 36, DURATION_MS = mgDuration(90000), GOAL = 75;
        const QIX_COUNT = difficulty < 0.5 ? 1 : 2;
        const QIX_SPEED = lerp(6, 9, difficulty);
        let running = true, rafId = null, last = null, lives = 3, claimed = 0, msg = '', msgUntil = 0, held = { l: false, r: false, u: false, d: false }, stepAcc = 0, trail = [], trailStart = null, hitAt = 0, won = false, swipe = null;
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="acTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="acScore">じんち0%／❤️❤️❤️</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="acCanvas"></canvas></div>
          <div class="mg-hint" id="acHint">十字キー(おしっぱなし)でふちをうごき、なかへせんをひいてかこもう。${GOAL}%とればクリア。✨がせんにふれると1ミス</div>
          <div class="mg-tilt-dpad"><span></span><button class="mg-tap-btn mg-hold-btn" id="acUp" data-key="up">▲</button><span></span><button class="mg-tap-btn mg-hold-btn" id="acLeft" data-key="left">◀</button><button class="mg-tap-btn mg-hold-btn" id="acDown" data-key="down">▼</button><button class="mg-tap-btn mg-hold-btn" id="acRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#acCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / G;
        const timerEl = container.querySelector('#acTimer'), scoreEl = container.querySelector('#acScore'), hint = container.querySelector('#acHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `じんち${claimed}%／${'❤️'.repeat(Math.max(0, lives))}`; };
        // 0=まだ 1=じんち(ふちを ふくむ) 2=ひいている せん
        const cell = Array.from({ length: G }, () => Array(G).fill(0));
        for (let i = 0; i < G; i++) { cell[0][i] = cell[G - 1][i] = cell[i][0] = cell[i][G - 1] = 1; }
        const INNER = (G - 2) * (G - 2);
        const player = { x: Math.floor(G / 2), y: G - 1 };
        const qixes = [];
        for (let i = 0; i < QIX_COUNT; i++) { const a = Math.random() * Math.PI * 2; qixes.push({ x: G / 2 + (i ? 6 : -6), y: G / 2 - 4, vx: Math.cos(a) * QIX_SPEED, vy: Math.sin(a) * QIX_SPEED, hue: i ? 300 : 190, tail: [] }); }
        // はいけいの え(じんちに なった ところだけ 見える)
        const PICS = ['🌸', '🍰', '🐳', '🌈', '🎈', '🦋'];
        const pic = PICS[Math.floor(Math.random() * PICS.length)];
        bindHeldButton(container.querySelector('#acLeft'), (v) => { held.l = v; });
        bindHeldButton(container.querySelector('#acRight'), (v) => { held.r = v; });
        bindHeldButton(container.querySelector('#acUp'), (v) => { held.u = v; });
        bindHeldButton(container.querySelector('#acDown'), (v) => { held.d = v; });
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; if (Math.hypot(dx, dy) < 10) return; held = { l: dx < -Math.abs(dy), r: dx > Math.abs(dy), u: dy < -Math.abs(dx), d: dy > Math.abs(dx) }; swipe.x = e.clientX; swipe.y = e.clientY; swipe.moved = true; });
        const endSwipe = () => { if (swipe && swipe.moved) held = { l: false, r: false, u: false, d: false }; swipe = null; }; canvas.addEventListener('pointerup', endSwipe); canvas.addEventListener('pointercancel', endSwipe);
        const inside = (x, y) => x >= 0 && y >= 0 && x < G && y < G;
        function tryStep() {
          let dx = 0, dy = 0;
          if (held.l) dx = -1; else if (held.r) dx = 1; else if (held.u) dy = -1; else if (held.d) dy = 1; else return;
          const nx = player.x + dx, ny = player.y + dy;
          if (!inside(nx, ny)) return;
          const target = cell[ny][nx];
          if (target === 2) return; // じぶんの せんは またげない
          if (target === 1) {
            if (trail.length) { closeTrail(); }
            player.x = nx; player.y = ny; return;
          }
          // target === 0: せんを ひく。せんの となりに すでに せんが あると ゆびが ぬける ので、
          // ひとつ まえの ます いがいの せんに 隣接する ますには 入れない
          for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ax = nx + ox, ay = ny + oy; if (inside(ax, ay) && cell[ay][ax] === 2 && !(ax === player.x && ay === player.y)) return; }
          if (!trail.length) trailStart = { x: player.x, y: player.y };
          cell[ny][nx] = 2; trail.push([nx, ny]); player.x = nx; player.y = ny;
        }
        function closeTrail() {
          // ✨が いる がわは のこし、それ いがいの「0」の りょういきを じんちに する
          const reach = Array.from({ length: G }, () => Array(G).fill(false));
          const stack = [];
          for (const q of qixes) { const qx = clamp(Math.round(q.x), 0, G - 1), qy = clamp(Math.round(q.y), 0, G - 1); if (cell[qy][qx] === 0 && !reach[qy][qx]) { reach[qy][qx] = true; stack.push([qx, qy]); } }
          while (stack.length) { const [x, y] = stack.pop(); for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ax = x + ox, ay = y + oy; if (inside(ax, ay) && cell[ay][ax] === 0 && !reach[ay][ax]) { reach[ay][ax] = true; stack.push([ax, ay]); } } }
          let gained = 0;
          for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { if (cell[y][x] === 2) { cell[y][x] = 1; gained++; } else if (cell[y][x] === 0 && !reach[y][x]) { cell[y][x] = 1; gained++; } }
          trail = []; trailStart = null;
          let count = 0; for (let y = 1; y < G - 1; y++) for (let x = 1; x < G - 1; x++) if (cell[y][x] === 1) count++;
          claimed = Math.round(count / INNER * 100);
          const pct = Math.round(gained / INNER * 100);
          sfx(pct >= 20 ? 'coin' : 'pop'); say(pct >= 20 ? `✨おおきくとった!+${pct}%` : `+${pct}%`, 900); hud();
          if (claimed >= GOAL) { won = true; say('🎉クリア!', 2500); finish(); }
        }
        function loseTrail(now) {
          lives--; hitAt = now;
          for (const [x, y] of trail) cell[y][x] = 0;
          trail = [];
          if (trailStart) { player.x = trailStart.x; player.y = trailStart.y; trailStart = null; }
          say(lives > 0 ? '💫せんにさわられた!' : '💀ミス…', 1000); hud();
          if (lives <= 0) finish();
        }
        function update(now, dt) {
          if (hitAt && now - hitAt < 700) return;
          stepAcc += dt;
          const STEP = 42;
          while (stepAcc >= STEP) { stepAcc -= STEP; tryStep(); if (!running) return; }
          const s = dt / 1000;
          for (const q of qixes) {
            let nx = q.x + q.vx * s, ny = q.y + q.vy * s;
            const cx = clamp(Math.round(nx), 0, G - 1), cy = clamp(Math.round(q.y), 0, G - 1);
            if (cell[cy][cx] !== 0) { q.vx = -q.vx; nx = q.x; }
            const cx2 = clamp(Math.round(q.x), 0, G - 1), cy2 = clamp(Math.round(ny), 0, G - 1);
            if (cell[cy2][cx2] !== 0) { q.vy = -q.vy; ny = q.y; }
            q.x = nx; q.y = ny;
            // すこし ふらふら
            const ang = Math.atan2(q.vy, q.vx) + (Math.random() - 0.5) * 0.25; const sp = Math.hypot(q.vx, q.vy);
            q.vx = Math.cos(ang) * sp; q.vy = Math.sin(ang) * sp;
            q.tail.push([q.x, q.y]); if (q.tail.length > 10) q.tail.shift();
            // せん(2)か、せんを ひいている プレイヤーに ふれたら ミス
            const qx = Math.round(q.x), qy = Math.round(q.y);
            let hit = false;
            for (let oy = -1; oy <= 1 && !hit; oy++) for (let ox = -1; ox <= 1; ox++) { const ax = qx + ox, ay = qy + oy; if (inside(ax, ay) && (cell[ay][ax] === 2 || (trail.length && ax === player.x && ay === player.y))) { hit = true; break; } }
            if (hit && trail.length) { loseTrail(now); return; }
          }
        }
        function render(now) {
          if (!ctx) return;
          // したじ: とった ところに え が 見える
          const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#ffd1e8'); g.addColorStop(0.5, '#fff5c2'); g.addColorStop(1, '#c2f0ff');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.font = `${Math.round(W * 0.6)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pic, W / 2, H / 2 + 8);
          ctx.fillStyle = '#12142a';
          for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { if (cell[y][x] === 0) ctx.fillRect(x * CELL, y * CELL, CELL + 0.5, CELL + 0.5); }
          // ふち(じんちの りんかく)
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { if (cell[y][x] === 1) { let edge = false; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ax = x + ox, ay = y + oy; if (inside(ax, ay) && cell[ay][ax] === 0) { edge = true; break; } } if (edge) ctx.fillRect(x * CELL, y * CELL, CELL, CELL); } }
          ctx.fillStyle = '#ff5aa0';
          for (const [x, y] of trail) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          for (const q of qixes) {
            for (let i = 0; i < q.tail.length; i++) { const [tx, ty] = q.tail[i]; ctx.fillStyle = `hsla(${q.hue},100%,70%,${(i + 1) / q.tail.length * 0.6})`; ctx.beginPath(); ctx.arc((tx + 0.5) * CELL, (ty + 0.5) * CELL, CELL * 0.5, 0, Math.PI * 2); ctx.fill(); }
            ctx.font = `${Math.round(CELL * 2.2)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✨', (q.x + 0.5) * CELL, (q.y + 0.5) * CELL);
          }
          const px = (player.x + 0.5) * CELL, py = (player.y + 0.5) * CELL;
          ctx.fillStyle = hitAt && now - hitAt < 700 && Math.floor(now / 100) % 2 === 0 ? '#c44' : '#ffd93b';
          ctx.beginPath(); ctx.arc(px, py, CELL * 1.1, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(px, py, CELL * 0.45, 0, Math.PI * 2); ctx.fill();
          ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(6, 6, 74, 18); ctx.fillStyle = '#fff'; ctx.fillText(`${claimed}%／${GOAL}%`, 10, 9);
          if (now < startTime) { ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(W / 2 - 80, H / 2 - 14, 160, 28); ctx.fillStyle = '#fff'; ctx.fillText('スタート!', W / 2, H / 2); }
          if (now < msgUntil) mgMsgBox(ctx, W, msg, 43);
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(60, now - last); last = now;
          if (now >= startTime) update(now, dt);
          if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const score = clamp(Math.round(won ? 82 + Math.max(0, lives) * 6 : claimed * 1.05 + Math.max(0, lives) * 2), 5, 100);
          if (!won) say(lives <= 0 ? `${claimed}%とった…` : `タイムアップ!${claimed}%とった`, 2500);
          render(performance.now());
          setTimeout(() => onComplete(score), 1100);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const AREA_CLAIM_VARIANTS = [mg('area-claim', makeAreaClaimGame({ title: 'じんとり!せんをひいてかこんで75%とれ' }))];

  // --- ソリティア(クロンダイク、canvas): タップで カードを えらび、タップで
  //     おき場所を えらぶ。えらんだ カードを もういちど タップすると 台へ ---
  function makeSolitaireGame({ title }) {
    return {
      start(container, onComplete) {
        const DURATION_MS = mgDuration(240000);
        const SUITS = ['♠', '♥', '♦', '♣'], RED = { '♥': true, '♦': true };
        const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        let running = true, rafId = null, stock = [], waste = [], found = [[], [], [], []], tab = [[], [], [], [], [], [], []], sel = null, moves = 0, msg = '', msgUntil = 0, won = false, anim = [];
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="soTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="soScore">🏠 0/52／${'てかず'} 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="soCanvas"></canvas></div>
          <div class="mg-hint" id="soHint">カードをタップしてえらび、おきたい列か右上の台をタップ。えらんだカードをもう1かいタップすると台へ。やまふだはタップでめくる</div>
          <div class="mg-race-controls"><button class="mg-tap-btn" id="soDraw" data-key="action2">🂠めくる</button><button class="mg-tap-btn primary" id="soAuto" data-key="action">⤴台へあげる</button></div>`;
        const canvas = container.querySelector('#soCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 300);
        const timerEl = container.querySelector('#soTimer'), scoreEl = container.querySelector('#soScore'), hint = container.querySelector('#soHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const foundCount = () => found.reduce((a, f) => a + f.length, 0);
        const hud = () => { scoreEl.textContent = `🏠 ${foundCount()}/52／てかず${moves}`; };
        // レイアウト
        const GAP = 4, CW = Math.floor((W - GAP * 8) / 7), CH = Math.round(CW * 1.4), TOP = 6, TAB_Y = TOP + CH + 10, FAN = 15, FAN_DOWN = 6;
        const colX = (i) => GAP + i * (CW + GAP);
        // くばる
        const deck = [];
        for (const s of SUITS) for (let r = 1; r <= 13; r++) deck.push({ s, r, up: false });
        for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
        for (let c = 0; c < 7; c++) { for (let k = 0; k <= c; k++) { const card = deck.pop(); card.up = k === c; tab[c].push(card); } }
        stock = deck;
        const canStackTab = (card, col) => { if (!col.length) return card.r === 13; const top = col[col.length - 1]; return top.up && top.r === card.r + 1 && (RED[top.s] !== RED[card.s]); };
        const canFound = (card, f) => (f.length === 0 ? card.r === 1 : f[f.length - 1].s === card.s && f[f.length - 1].r === card.r - 1);
        const foundIdx = (card) => SUITS.indexOf(card.s);
        function takeSel() {
          // えらんでいる カード(たち)を もとの 場所から はずして かえす
          if (sel.from === 'waste') return [waste.pop()];
          if (sel.from === 'found') return [found[sel.idx].pop()];
          const col = tab[sel.idx]; const cards = col.splice(sel.pos); if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true; return cards;
        }
        function selCards() {
          if (sel.from === 'waste') return [waste[waste.length - 1]];
          if (sel.from === 'found') return [found[sel.idx][found[sel.idx].length - 1]];
          return tab[sel.idx].slice(sel.pos);
        }
        function moveTo(target) {
          const cards = selCards(); if (!cards.length || !cards[0]) { sel = null; return; }
          if (target.kind === 'found') {
            if (cards.length !== 1) { say('1まいずつ台へ', 800); sel = null; return; }
            const fi = foundIdx(cards[0]);
            if (!canFound(cards[0], found[fi])) { say('そのカードはまだ台におけない', 800); sel = null; return; }
            const c = takeSel()[0]; found[fi].push(c); moves++; sel = null; sfx('coin'); hud();
            if (foundCount() === 52) { won = true; say('🎉ぜんぶそろった!', 3000); finish(); }
            return;
          }
          const col = tab[target.idx];
          if (sel.from === 'tab' && sel.idx === target.idx) { sel = null; return; }
          if (!canStackTab(cards[0], col)) { say(col.length ? 'いろちがいで1つ小さいカードだけ' : 'あいた列にはKだけ', 900); sel = null; return; }
          const moved = takeSel(); for (const c of moved) col.push(c); moves++; sel = null; sfx('pop'); hud();
        }
        function draw() {
          if (!running) return;
          sel = null;
          if (!stock.length) { if (!waste.length) return; stock = waste.reverse().map((c) => ({ ...c, up: false })); waste = []; say('やまふだをもどした', 700); moves++; return; }
          const c = stock.pop(); c.up = true; waste.push(c); moves++; sfx('tick'); hud();
        }
        function autoUp() {
          if (!running) return;
          sel = null; let n = 0;
          for (let guard = 0; guard < 60; guard++) {
            let moved = false;
            const tryCard = (getter, remover) => { const c = getter(); if (!c) return false; const fi = foundIdx(c); if (!canFound(c, found[fi])) return false; remover(); found[fi].push(c); n++; return true; };
            if (tryCard(() => waste[waste.length - 1], () => waste.pop())) moved = true;
            for (let i = 0; i < 7; i++) { const col = tab[i]; if (tryCard(() => (col.length && col[col.length - 1].up ? col[col.length - 1] : null), () => { col.pop(); if (col.length) col[col.length - 1].up = true; })) moved = true; }
            if (!moved) break;
          }
          if (n) { moves++; sfx('coin'); say(`${n}まい台へ`, 800); hud(); if (foundCount() === 52) { won = true; say('🎉ぜんぶそろった!', 3000); finish(); } }
          else say('いま台にあげられるカードはない', 800);
        }
        container.querySelector('#soDraw').addEventListener('pointerdown', (e) => { e.preventDefault(); draw(); });
        container.querySelector('#soAuto').addEventListener('pointerdown', (e) => { e.preventDefault(); autoUp(); });
        function hitTest(x, y) {
          if (y < TAB_Y - 4) {
            const i = Math.floor((x - GAP) / (CW + GAP));
            if (i === 0) return { kind: 'stock' };
            if (i === 1) return { kind: 'waste' };
            if (i >= 3 && i <= 6) return { kind: 'found', idx: i - 3 };
            return null;
          }
          const i = clamp(Math.floor((x - GAP) / (CW + GAP)), 0, 6);
          const col = tab[i];
          if (!col.length) return { kind: 'tab', idx: i, pos: 0, empty: true };
          // うえから じゅんに かさなっている。いちばん した(=さいご)の カードいがいは FAN の はばだけ 見えている
          let yy = TAB_Y, pos = -1;
          for (let k = 0; k < col.length; k++) { const h = k === col.length - 1 ? CH : (col[k].up ? FAN : FAN_DOWN); if (y >= yy && y < yy + h) { pos = k; break; } yy += h; }
          if (pos < 0) pos = y >= yy ? col.length - 1 : -1;
          return { kind: 'tab', idx: i, pos };
        }
        canvas.addEventListener('pointerdown', (e) => {
          if (!running) return; e.preventDefault();
          const p = mgPointerPos(canvas, e); const t = hitTest(p.x, p.y); if (!t) { sel = null; return; }
          if (t.kind === 'stock') { draw(); return; }
          if (sel) {
            // おなじ カードを もう1かい → 台へ
            if ((t.kind === 'waste' && sel.from === 'waste') || (t.kind === 'tab' && sel.from === 'tab' && sel.idx === t.idx && t.pos === sel.pos)) { if (selCards().length === 1) moveTo({ kind: 'found' }); else sel = null; return; }
            if (t.kind === 'found') { moveTo({ kind: 'found', idx: t.idx }); return; }
            if (t.kind === 'tab') { moveTo({ kind: 'tab', idx: t.idx }); return; }
            sel = null; return;
          }
          if (t.kind === 'waste') { if (waste.length) sel = { from: 'waste' }; return; }
          if (t.kind === 'found') { if (found[t.idx].length) sel = { from: 'found', idx: t.idx }; return; }
          if (t.kind === 'tab') {
            const col = tab[t.idx]; if (!col.length || t.pos < 0) return;
            if (!col[t.pos].up) { if (t.pos === col.length - 1) { col[t.pos].up = true; } return; }
            sel = { from: 'tab', idx: t.idx, pos: t.pos };
          }
        });
        function drawCard(x, y, card, selected) {
          ctx.fillStyle = 'rgba(0,0,0,.25)'; mgRoundRect(ctx, x + 1, y + 2, CW, CH, 4);
          if (!card.up) { ctx.fillStyle = '#3557b8'; mgRoundRect(ctx, x, y, CW, CH, 4); ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 3; i < CW - 3; i += 6) for (let j = 3; j < CH - 3; j += 6) ctx.fillRect(x + i, y + j, 2, 2); return; }
          ctx.fillStyle = selected ? '#fff3b0' : '#fffdf6'; mgRoundRect(ctx, x, y, CW, CH, 4);
          if (selected) { ctx.strokeStyle = '#ff9800'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, CW - 2, CH - 2); }
          ctx.fillStyle = RED[card.s] ? '#d3283c' : '#1a1a2e';
          ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
          ctx.fillText(RANK_LABEL[card.r], x + 3, y + 2); ctx.fillText(card.s, x + 3, y + 13);
          ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(card.s, x + CW / 2, y + CH * 0.66);
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#1f6b3a'; ctx.fillRect(0, 0, W, H);
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
          const slot = (x, y, label) => { ctx.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1); if (label) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + CW / 2, y + CH / 2); } };
          slot(colX(0), TOP, stock.length ? '' : '↻'); if (stock.length) drawCard(colX(0), TOP, { up: false }, false);
          slot(colX(1), TOP, ''); if (waste.length) drawCard(colX(1), TOP, waste[waste.length - 1], sel && sel.from === 'waste');
          for (let i = 0; i < 4; i++) { slot(colX(3 + i), TOP, SUITS[i]); const f = found[i]; if (f.length) drawCard(colX(3 + i), TOP, f[f.length - 1], sel && sel.from === 'found' && sel.idx === i); }
          for (let i = 0; i < 7; i++) {
            const col = tab[i]; let y = TAB_Y;
            if (!col.length) slot(colX(i), TAB_Y, '');
            for (let k = 0; k < col.length; k++) { const c = col[k]; drawCard(colX(i), y, c, sel && sel.from === 'tab' && sel.idx === i && k >= sel.pos); y += c.up ? FAN : FAN_DOWN; }
          }
          if (now < msgUntil) mgMsgBox(ctx, W, msg, H - 21, 13);
        }
        function frame(now) {
          if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const n = foundCount();
          const remainS = Math.max(0, DURATION_MS - (performance.now() - startTime)) / 1000;
          const score = clamp(Math.round(won ? 90 + Math.min(10, remainS / 12) : 8 + n * 1.6), 5, 100);
          if (!won) say(`タイムアップ!台に${n}まい`, 2500);
          render(performance.now());
          setTimeout(() => onComplete(score), 1200);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const SOLITAIRE_VARIANTS = [mg('solitaire-klondike', makeSolitaireGame({ title: 'ソリティア!4つの台にAからKまでそろえよう' }))];

  // --- ヒット&ブロー(canvas+ボタン): かくされた 4しょくの ならびを あてる。
  //     ヒット=いろも 場所も あたり、ブロー=いろは あるが 場所ちがい ---
  function makeHitBlowGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(150000);
        const COLORS = [{ e: '🔴', c: '#e53957' }, { e: '🟡', c: '#f2c230' }, { e: '🟢', c: '#3fae5a' }, { e: '🔵', c: '#2f7fd6' }, { e: '🟣', c: '#8e44ad' }, { e: '🟠', c: '#f07c1f' }];
        const SLOTS = 4, MAX_TRIES = difficulty < 0.4 ? 10 : 8;
        let running = true, rafId = null, guesses = [], cur = [], msg = '', msgUntil = 0, solved = false, revealAt = 0;
        const startTime = performance.now();
        // こたえ: 6しょくから 4しょく(かぶりなし)
        const pool = [0, 1, 2, 3, 4, 5]; for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        const answer = pool.slice(0, SLOTS);
        container.innerHTML = `
          <div class="mg-header"><span id="hbTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="hbScore">${MAX_TRIES}かいまで</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="hbCanvas"></canvas></div>
          <div class="mg-hint" id="hbHint">こたえは6色のうち4色(おなじいろは2つない)。いろを4つえらんで「けってい」。🎯ヒット=いろも場所もあたり、💨ブロー=いろはあるけど場所ちがい</div>
          <div class="mg-tilt-dpad" id="hbPalette">${COLORS.map((c, i) => `<button class="mg-tap-btn" data-color="${i}">${c.e}</button>`).join('')}</div>
          <div class="mg-race-controls"><button class="mg-tap-btn" id="hbClear" data-key="action2">⌫けす</button><button class="mg-tap-btn primary" id="hbSubmit" data-key="action">けってい</button></div>`;
        const canvas = container.querySelector('#hbCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const timerEl = container.querySelector('#hbTimer'), scoreEl = container.querySelector('#hbScore'), hint = container.querySelector('#hbHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `${guesses.length}/${MAX_TRIES}かい`; };
        container.querySelector('#hbPalette').addEventListener('pointerdown', (e) => {
          const btn = e.target && e.target.closest ? e.target.closest('button[data-color]') : null; if (!btn || !running || solved) return; e.preventDefault();
          const ci = +btn.dataset.color; if (cur.length >= SLOTS) return;
          if (cur.includes(ci)) { say('おなじいろは2つつかえない', 800); return; }
          cur.push(ci);
        });
        container.querySelector('#hbClear').addEventListener('pointerdown', (e) => { e.preventDefault(); if (running) cur.pop(); });
        container.querySelector('#hbSubmit').addEventListener('pointerdown', (e) => { e.preventDefault(); submit(); });
        function judge(g) { let hit = 0, blow = 0; for (let i = 0; i < SLOTS; i++) { if (g[i] === answer[i]) hit++; else if (answer.includes(g[i])) blow++; } return { hit, blow }; }
        function submit() {
          if (!running || solved) return;
          if (cur.length < SLOTS) { say(`あと${SLOTS - cur.length}しょくえらんで`, 800); return; }
          const r = judge(cur); guesses.push({ g: cur.slice(), ...r }); cur = []; sfx(r.hit ? 'hit' : 'tick'); hud();
          if (r.hit === SLOTS) { solved = true; revealAt = performance.now(); say(`🎉せいかい!${guesses.length}かいめであてた`, 3000); finish(); return; }
          say(r.hit === 0 && r.blow === 0 ? '💨ぜんぶちがういろ!それもヒント' : `🎯ヒット${r.hit}／💨ブロー${r.blow}`, 1500);
          if (guesses.length >= MAX_TRIES) { revealAt = performance.now(); say('ざんねん…こたえはこれ', 3000); finish(); }
        }
        function drawPeg(x, y, r, ci, hollow) {
          if (ci == null) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); return; }
          ctx.fillStyle = COLORS[ci].c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
          void hollow;
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#3b2b40'; ctx.fillRect(0, 0, W, H);
          const ROW_H = (H - 34) / MAX_TRIES, PEG = Math.min(9, ROW_H * 0.36), X0 = 22, DX = 26;
          // こたえの 行(かくし)
          ctx.fillStyle = 'rgba(0,0,0,.35)'; mgRoundRect(ctx, 6, 4, W - 12, 26, 6);
          const reveal = revealAt > 0;
          for (let i = 0; i < SLOTS; i++) { const x = X0 + i * DX, y = 17; if (reveal) drawPeg(x, y, PEG, answer[i]); else { ctx.fillStyle = '#5a4a60'; ctx.beginPath(); ctx.arc(x, y, PEG, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, y); } }
          ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(reveal ? 'こたえ' : 'こたえ(かくれている)', X0 + SLOTS * DX + 2, 17);
          for (let k = 0; k < MAX_TRIES; k++) {
            const y = 34 + k * ROW_H + ROW_H / 2;
            const row = guesses[k];
            const isCur = k === guesses.length && !solved;
            if (isCur) { ctx.fillStyle = 'rgba(255,255,255,.1)'; mgRoundRect(ctx, 6, y - ROW_H / 2 + 1, W - 12, ROW_H - 2, 5); }
            ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(String(k + 1), 14, y);
            for (let i = 0; i < SLOTS; i++) { const x = X0 + i * DX; drawPeg(x, y, PEG, row ? row.g[i] : isCur && i < cur.length ? cur[i] : null); }
            if (row) {
              // ヒット=あか、ブロー=しろ の ちいさな ピン
              let px = X0 + SLOTS * DX + 8;
              for (let i = 0; i < SLOTS; i++) { const c = i < row.hit ? '#ff3b5c' : i < row.hit + row.blow ? '#fff' : null; if (c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px + (i % 2) * 10, y - 5 + Math.floor(i / 2) * 10, 3.6, 0, Math.PI * 2); ctx.fill(); } else { ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px + (i % 2) * 10, y - 5 + Math.floor(i / 2) * 10, 3.6, 0, Math.PI * 2); ctx.stroke(); } }
              ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`🎯${row.hit} 💨${row.blow}`, px + 26, y);
            } else if (isCur) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(cur.length < SLOTS ? `あと${SLOTS - cur.length}しょく` : 'けってい!', X0 + SLOTS * DX + 8, y); }
          }
          if (now < msgUntil) mgMsgBox(ctx, W, msg, H / 2, 13);
        }
        function frame(now) {
          if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { revealAt = now; say('タイムアップ!こたえはこれ', 3000); finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const last = guesses[guesses.length - 1];
          const score = clamp(Math.round(solved ? 100 - Math.max(0, guesses.length - 3) * 9 : 18 + (last ? last.hit * 6 + last.blow * 2 : 0)), 5, 100);
          render(performance.now());
          setTimeout(() => onComplete(score), 1600);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const HIT_BLOW_VARIANTS = [mg('hit-blow', makeHitBlowGame({ title: 'ヒット&ブロー!かくれた4しょくのならびをあてろ' }))];

  // --- ルナランダー(canvas、物理): かたむけと ぎゃくふんしゃで ちゃくりくパッドに
  //     やさしく おりる。パッドが せまいほど とくてん ばい ---
  function makeLunarLanderGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const ATTEMPTS = 3, GRAVITY = 20, THRUST = 52, ROT = 150, FUEL_MAX = 100;
        let running = true, rafId = null, last = null, attempt = 0, lander = null, held = { l: false, r: false, t: false }, terrain = [], pads = [], results = [], msg = '', msgUntil = 0, particles = [], nextAt = 0, phase = 'fly';
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="llCount">1/${ATTEMPTS}かいめ</span><span id="llScore">🚀 0pt／⛽ 100</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="llCanvas"></canvas></div>
          <div class="mg-hint" id="llHint">◀▶でかたむけ、🔥でぎゃくふんしゃ。たいらなパッド(×2/×3)に、まっすぐ・ゆっくりおりよう。はやすぎたりななめだとクラッシュ</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="llLeft" data-key="left">◀</button><button class="mg-tap-btn primary mg-hold-btn" id="llThrust" data-key="action">🔥ふんしゃ</button><button class="mg-tap-btn mg-hold-btn" id="llRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#llCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 260);
        const countEl = container.querySelector('#llCount'), scoreEl = container.querySelector('#llScore'), hint = container.querySelector('#llHint');
        const say = (t, ms = 1400) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const total = () => results.reduce((a, b) => a + b, 0);
        const hud = () => { countEl.textContent = `${Math.min(ATTEMPTS, attempt + 1)}/${ATTEMPTS}かいめ`; scoreEl.textContent = `🚀 ${total()}pt／⛽ ${lander ? Math.round(lander.fuel) : FUEL_MAX}`; };
        bindHeldButton(container.querySelector('#llLeft'), (v) => { held.l = v; });
        bindHeldButton(container.querySelector('#llRight'), (v) => { held.r = v; });
        bindHeldButton(container.querySelector('#llThrust'), (v) => { held.t = v; });
        function makeTerrain() {
          terrain = []; pads = [];
          const SEG = 14, n = Math.ceil(W / SEG) + 1;
          let y = H * 0.72;
          const padSlots = [];
          const p1 = 3 + Math.floor(Math.random() * 4), p2 = 9 + Math.floor(Math.random() * 4), p3 = 14 + Math.floor(Math.random() * 3);
          padSlots.push({ at: p1, w: 3, mult: 1 }, { at: p2, w: 2, mult: 2 }, { at: p3, w: 1, mult: 3 });
          for (let i = 0; i < n; i++) {
            const pad = padSlots.find((p) => i >= p.at && i < p.at + p.w);
            if (pad) { if (i === pad.at) { pad.x1 = i * SEG; pad.y = y; } pad.x2 = (i + 1) * SEG; terrain.push([i * SEG, y]); if (i === pad.at + pad.w - 1) { terrain.push([(i + 1) * SEG, y]); pads.push(pad); } continue; }
            terrain.push([i * SEG, y]);
            y = clamp(y + (Math.random() - 0.5) * lerp(26, 40, difficulty), H * 0.5, H * 0.9);
          }
          terrain.push([n * SEG + SEG, y]);
        }
        function groundAt(x) { for (let i = 0; i < terrain.length - 1; i++) { const [x1, y1] = terrain[i], [x2, y2] = terrain[i + 1]; if (x >= x1 && x <= x2) return lerp(y1, y2, (x - x1) / (x2 - x1 || 1)); } return H; }
        function newAttempt() {
          makeTerrain(); phase = 'fly';
          lander = { x: 24, y: 22, vx: lerp(12, 19, difficulty), vy: 0, ang: 0, fuel: FUEL_MAX, thrusting: false };
          held = { l: false, r: false, t: false }; particles = [];
          say(`${attempt + 1}かいめ:ちゃくりくせよ`, 1200); hud();
        }
        function land(now) {
          const g = groundAt(lander.x);
          const pad = pads.find((p) => lander.x - 7 >= p.x1 - 2 && lander.x + 7 <= p.x2 + 2);
          const EZ = minigameEase();
          const slow = Math.abs(lander.vy) < 22 + 8 * EZ && Math.abs(lander.vx) < 14 + 5 * EZ, upright = Math.abs(lander.ang) < 14 + 6 * EZ;
          void g;
          let pts = 0, text;
          if (pad && slow && upright) {
            const soft = clamp(1 - Math.abs(lander.vy) / 22, 0, 1);
            pts = Math.round((10 + soft * 10) * pad.mult) + Math.round(lander.fuel / 10);
            text = `🎉ちゃくりくせいこう!×${pad.mult} ${pts}pt`;
            phase = 'landed'; sfx('coin');
          } else {
            text = !pad ? '💥パッドのそとにおちた…' : !upright ? '💥ななめにぶつかった…' : '💥はやすぎた…クラッシュ';
            phase = 'crash'; sfx('hit');
            for (let i = 0; i < 26; i++) { const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 90; particles.push({ x: lander.x, y: lander.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 1, col: ['#ffb14a', '#ff5a3c', '#ffe27a', '#ccc'][i % 4] }); }
          }
          results.push(pts); say(text, 1800); hud(); nextAt = now + 2000;
        }
        function update(now, dt) {
          const s = dt / 1000;
          if (phase !== 'fly') { if (now >= nextAt) { attempt++; if (attempt >= ATTEMPTS) { finish(); return; } newAttempt(); } return; }
          if (held.l) lander.ang -= ROT * s; if (held.r) lander.ang += ROT * s;
          lander.ang = clamp(lander.ang, -90, 90);
          lander.thrusting = held.t && lander.fuel > 0;
          if (lander.thrusting) {
            const a = (lander.ang - 90) * Math.PI / 180;
            lander.vx += Math.cos(a) * THRUST * s; lander.vy += Math.sin(a) * THRUST * s; lander.fuel = Math.max(0, lander.fuel - 14 * s);
            particles.push({ x: lander.x - Math.cos(a) * 10 + (Math.random() - 0.5) * 4, y: lander.y - Math.sin(a) * 10, vx: -Math.cos(a) * 70 + (Math.random() - 0.5) * 30, vy: -Math.sin(a) * 70 + (Math.random() - 0.5) * 30, life: 0.5, col: Math.random() < 0.5 ? '#ffb14a' : '#ffe27a' });
            if (lander.fuel === 0) say('⛽ねんりょうぎれ!', 1000);
          }
          lander.vy += GRAVITY * s;
          lander.x += lander.vx * s; lander.y += lander.vy * s;
          if (lander.x < 8) { lander.x = 8; lander.vx = Math.abs(lander.vx) * 0.3; } if (lander.x > W - 8) { lander.x = W - 8; lander.vx = -Math.abs(lander.vx) * 0.3; }
          if (lander.y < 6) { lander.y = 6; lander.vy = Math.max(0, lander.vy); }
          const g = groundAt(lander.x);
          if (lander.y + 9 >= g) { lander.y = g - 9; land(now); }
          hud();
        }
        function updateParticles(dt) { const s = dt / 1000; for (const p of particles) { p.x += p.vx * s; p.y += p.vy * s; p.vy += 40 * s; p.life -= s * 1.6; } particles = particles.filter((p) => p.life > 0); }
        function render(now) {
          if (!ctx) return;
          const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#02030d'); g.addColorStop(1, '#1b1b3a');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#fff'; for (let i = 0; i < 30; i++) { const h1 = Math.sin(i * 12.9898) * 43758.5453, h2 = Math.sin(i * 78.233) * 12345.678; ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(now / 900 + i)); ctx.fillRect((h1 - Math.floor(h1)) * W, (h2 - Math.floor(h2)) * (H * 0.55), 1.5, 1.5); } ctx.globalAlpha = 1;
          ctx.fillStyle = '#e8e2f0'; ctx.beginPath(); ctx.arc(W - 36, 34, 14, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c9c1d6'; ctx.beginPath(); ctx.arc(W - 40, 30, 4, 0, Math.PI * 2); ctx.arc(W - 30, 38, 3, 0, Math.PI * 2); ctx.fill();
          // ちけい
          ctx.fillStyle = '#5b5670'; ctx.beginPath(); ctx.moveTo(0, H); for (const [x, y] of terrain) ctx.lineTo(x, y); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#9a93b5'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < terrain.length; i++) { const [x, y] = terrain[i]; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
          for (const p of pads) { ctx.fillStyle = '#4ad9a2'; ctx.fillRect(p.x1, p.y - 3, p.x2 - p.x1, 4); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(`×${p.mult}`, (p.x1 + p.x2) / 2, p.y - 5); }
          for (const p of particles) { ctx.globalAlpha = clamp(p.life, 0, 1); ctx.fillStyle = p.col; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); } ctx.globalAlpha = 1;
          if (lander && phase !== 'crash') {
            // そくど ひょうじ
            const EZ2 = minigameEase(); const vOk = Math.abs(lander.vy) < 22 + 8 * EZ2, hOk = Math.abs(lander.vx) < 14 + 5 * EZ2, aOk = Math.abs(lander.ang) < 14 + 6 * EZ2;
            ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(6, 6, 96, 40);
            ctx.fillStyle = vOk ? '#7dffb0' : '#ff7d7d'; ctx.fillText(`${lander.vy < -1 ? '↑' : '↓'} ${Math.abs(lander.vy).toFixed(0)}${vOk ? ' OK' : 'はやい'}`, 10, 9);
            ctx.fillStyle = hOk ? '#7dffb0' : '#ff7d7d'; ctx.fillText(`↔ ${Math.abs(lander.vx).toFixed(0)}${hOk ? ' OK' : 'はやい'}`, 10, 21);
            ctx.fillStyle = aOk ? '#7dffb0' : '#ff7d7d'; ctx.fillText(`∠ ${Math.abs(lander.ang).toFixed(0)}°${aOk ? ' OK' : 'ななめ'}`, 10, 33);
            ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(W - 14, 60, 8, 80); ctx.fillStyle = lander.fuel > 25 ? '#4ad9a2' : '#ff5a5a'; ctx.fillRect(W - 14, 60 + 80 * (1 - lander.fuel / FUEL_MAX), 8, 80 * lander.fuel / FUEL_MAX);
            ctx.save(); ctx.translate(lander.x, lander.y); ctx.rotate(lander.ang * Math.PI / 180);
            ctx.fillStyle = '#d8dbe6'; ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(-5, -6); ctx.lineTo(5, -6); ctx.lineTo(7, 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#8fb8ff'; ctx.fillRect(-3, -4, 6, 4);
            ctx.strokeStyle = '#aab'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(-9, 9); ctx.moveTo(5, 3); ctx.lineTo(9, 9); ctx.stroke();
            if (lander.thrusting) { ctx.fillStyle = `rgba(255,${160 + Math.random() * 60 | 0},60,.9)`; ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(0, 12 + Math.random() * 8); ctx.lineTo(3, 4); ctx.closePath(); ctx.fill(); }
            ctx.restore();
          }
          if (now < msgUntil) mgMsgBox(ctx, W, msg, H / 2, 13);
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(50, now - last); last = now;
          update(now, dt);
          if (!running) return;
          updateParticles(dt);
          render(now);
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const landed = results.filter((r) => r > 0).length;
          const score = clamp(Math.round(6 + total() * 0.72 + landed * 6), 5, 100);
          say(`おわり!${landed}かいちゃくりく、${total()}pt`, 2500);
          render(performance.now());
          setTimeout(() => onComplete(score), 1400);
        }
        newAttempt();
        rafId = requestAnimationFrame(frame);
        void startTime;
      },
    };
  }
  const LUNAR_LANDER_VARIANTS = [mg('lunar-lander', makeLunarLanderGame({ title: 'ルナランダー!ぎゃくふんしゃでやさしくちゃくりく' }))];

  // ================================================================
  // 新作バッチ8(2026-09-09): 上海 / ビーチバレー / スライドパズル / すごろく / たこやき
  // ================================================================

  // --- 上海(麻雀牌の ペアとり、canvas): つみあがった 牌の うち「うえに なにも
  //     なく、ひだりか みぎが あいている」牌だけ とれる。おなじ 絵を 2つ タップ ---
  function makeShanghaiGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(180000);
        const FACES = ['🌸', '🍀', '🍁', '🌙', '⭐', '🐟', '🐢', '🦋', '🍑', '🍇', '🎐', '🏮', '🐉', '🎋', '🍵', '🪷'];
        let running = true, rafId = null, tiles = [], sel = null, pairs = 0, totalPairs = 0, msg = '', msgUntil = 0, hints = 3, hintPair = null, hintUntil = 0, shuffles = 0, won = false, anim = [];
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="shTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="shScore">🀄 0/0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="shCanvas"></canvas></div>
          <div class="mg-hint" id="shHint">うえに牌がなく、ひだりかみぎがあいている牌だけとれる。おなじ絵の2まいをタップしてけそう。かならずとききれるならびになっている</div>
          <div class="mg-race-controls"><button class="mg-tap-btn" id="shHintBtn" data-key="action2">💡ヒント(3)</button><button class="mg-tap-btn primary" id="shShuffle" data-key="action">🔀まぜる</button></div>`;
        const canvas = container.querySelector('#shCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 236);
        const timerEl = container.querySelector('#shTimer'), scoreEl = container.querySelector('#shScore'), hint = container.querySelector('#shHint'), hintBtn = container.querySelector('#shHintBtn');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `🀄 ${pairs}/${totalPairs}`; hintBtn.textContent = `💡ヒント(${hints})`; };
        // ならび: ハーフ単位の ざひょう(牌は 2×2)。層0: 8×5、層1: 6×3、層2: 4×1、層3: 2×1(中央)
        const TW = 28, TH = 36, LAYER_DX = -3, LAYER_DY = -3;
        const layout = [];
        const addRect = (layer, cols, rows, ox, oy) => { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) layout.push({ layer, x: ox + c * 2, y: oy + r * 2 }); };
        const big = difficulty > 0.45;
        addRect(0, 8, 5, 0, 0);
        addRect(1, 6, 3, 2, 2);
        if (big) { addRect(2, 4, 2, 4, 3); addRect(3, 2, 1, 6, 4); } else { addRect(2, 2, 1, 6, 4); }
        if (layout.length % 2) layout.pop();
        totalPairs = layout.length / 2;
        const OX = (W - 16 * (TW / 2)) / 2 + 6, OY = (H - 5 * TH) / 2 + 6;
        const covers = (a, b) => a.layer === b.layer + 1 && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;
        const sideBlocked = (t, dir) => tiles.some((o) => o.alive && o !== t && o.layer === t.layer && o.x === t.x + dir * 2 && Math.abs(o.y - t.y) < 2);
        const isFree = (t) => t.alive && !tiles.some((o) => o.alive && covers(o, t)) && !(sideBlocked(t, -1) && sideBlocked(t, 1));
        // かならず とききれる ように: ぜんぶ おいた じょうたいから「とれる 2まい」を えらんで おなじ 絵を わりあて、はずしていく(その ぎゃくじゅんが こたえ)
        function deal(positions) {
          tiles = positions.map((p) => ({ ...p, face: null, alive: true }));
          const order = [];
          let k = 0;
          const bag = [];
          for (let i = 0; i < positions.length / 2; i++) bag.push(FACES[i % FACES.length]);
          for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
          let guard = 0;
          while (tiles.some((t) => t.alive) && guard++ < 5000) {
            const free = tiles.filter((t) => isFree(t));
            if (free.length < 2) break;
            const a = free[Math.floor(Math.random() * free.length)];
            let b = free[Math.floor(Math.random() * free.length)];
            if (b === a) { b = free.find((t) => t !== a); }
            a.face = b.face = bag[k++ % bag.length]; a.alive = b.alive = false; order.push(a, b);
          }
          for (const t of tiles) t.alive = true;
        }
        deal(layout);
        const matchable = () => { const free = tiles.filter((t) => isFree(t)); for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) if (free[i].face === free[j].face) return [free[i], free[j]]; return null; };
        function reshuffle(auto) {
          const alive = tiles.filter((t) => t.alive);
          if (alive.length < 2) return;
          const positions = alive.map((t) => ({ layer: t.layer, x: t.x, y: t.y }));
          const dead = tiles.filter((t) => !t.alive);
          deal(positions); tiles = tiles.concat(dead);
          sel = null; shuffles++;
          say(auto ? '🔀とれる牌がなくなったのでまぜた' : '🔀まぜた(とききれるならび)', 1200);
        }
        container.querySelector('#shShuffle').addEventListener('pointerdown', (e) => { e.preventDefault(); if (running) reshuffle(false); });
        hintBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || hints <= 0) return; const p = matchable(); if (!p) { say('いまとれるペアはない。まぜよう', 1000); return; } hints--; hintPair = p; hintUntil = performance.now() + 2500; hud(); });
        const tileRect = (t) => ({ x: OX + t.x * (TW / 2) + t.layer * LAYER_DX, y: OY + t.y * (TH / 2) + t.layer * LAYER_DY, w: TW, h: TH });
        function hitTile(px, py) {
          const sorted = tiles.filter((t) => t.alive).sort((a, b) => b.layer - a.layer || b.y - a.y || b.x - a.x);
          for (const t of sorted) { const r = tileRect(t); if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return t; }
          return null;
        }
        canvas.addEventListener('pointerdown', (e) => {
          if (!running) return; e.preventDefault();
          const p = mgPointerPos(canvas, e); const t = hitTile(p.x, p.y);
          if (!t) { sel = null; return; }
          if (!isFree(t)) { say('その牌はまだとれない(うえかりょうわきがふさがっている)', 1000); return; }
          if (sel === t) { sel = null; return; }
          if (sel && sel.face === t.face) {
            sel.alive = t.alive = false; pairs++; sfx('coin'); hud();
            const r1 = tileRect(sel), r2 = tileRect(t); anim.push({ x: r1.x + TW / 2, y: r1.y + TH / 2, born: performance.now() }, { x: r2.x + TW / 2, y: r2.y + TH / 2, born: performance.now() });
            sel = null; hintPair = null;
            if (!tiles.some((x) => x.alive)) { won = true; say('🎉ぜんぶとった!', 3000); finish(); return; }
            if (!matchable()) reshuffle(true);
            return;
          }
          if (sel) { sfx('bad'); say('ちがう絵…', 600); } else sfx('tick');
          sel = t;
        });
        function drawTile(t, now) {
          const r = tileRect(t);
          const free = isFree(t);
          const isSel = sel === t, isHint = hintPair && now < hintUntil && (hintPair[0] === t || hintPair[1] === t);
          ctx.fillStyle = 'rgba(0,0,0,.35)'; mgRoundRect(ctx, r.x + 3, r.y + 3, r.w, r.h, 4);
          ctx.fillStyle = '#b98a4f'; mgRoundRect(ctx, r.x + 1.5, r.y + 1.5, r.w, r.h, 4);
          ctx.fillStyle = isSel ? '#fff0a8' : isHint ? '#c8ffd4' : free ? '#fffaf0' : '#e2d9c8'; mgRoundRect(ctx, r.x, r.y, r.w, r.h, 4);
          if (isSel || isHint) { ctx.strokeStyle = isSel ? '#ff9800' : '#2ecc71'; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); }
          ctx.font = '17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.globalAlpha = free ? 1 : 0.55; ctx.fillText(t.face, r.x + r.w / 2, r.y + r.h / 2 + 1); ctx.globalAlpha = 1;
        }
        function render(now) {
          if (!ctx) return;
          const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d5c46'); g.addColorStop(1, '#0f3a2c');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          const sorted = tiles.filter((t) => t.alive).sort((a, b) => a.layer - b.layer || a.y - b.y || a.x - b.x);
          for (const t of sorted) drawTile(t, now);
          anim = anim.filter((a) => now - a.born < 500);
          for (const a of anim) { const k = (now - a.born) / 500; ctx.globalAlpha = 1 - k; ctx.font = `${16 + k * 14}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✨', a.x, a.y - k * 20); ctx.globalAlpha = 1; }
          if (now < msgUntil) mgMsgBox(ctx, W, msg, H - 18, 12);
        }
        function frame(now) {
          if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const remainS = Math.max(0, DURATION_MS - (performance.now() - startTime)) / 1000;
          const score = clamp(Math.round(won ? 84 + Math.min(16, remainS / 6) - shuffles * 2 : 6 + pairs / totalPairs * 70 - shuffles * 2), 5, 100);
          if (!won) say(`タイムアップ!${pairs}ペアとった`, 2500);
          render(performance.now());
          setTimeout(() => onComplete(score), 1200);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const SHANGHAI_VARIANTS = [mg('shanghai-tiles', makeShanghaiGame({ title: '上海!おなじ絵の牌を2まいずつとってぜんぶくずせ' }))];

  // --- ビーチバレー(canvas、物理): ◀▶で うごき、ボールに ふれると うけ(たかく
  //     あげる)。アタックボタンを おしながら ふれると あいての コートへ スパイク ---
  function makeBeachVolleyGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const TARGET = 7, DURATION_MS = mgDuration(100000);
        const GRAV = 620, NET_H = 74, PLAYER_R = 13, BALL_R = 8;
        let running = true, rafId = null, last = null, me = 0, cpu = 0, held = { l: false, r: false, a: false }, attackAt = -1e9, ball = null, serveAt = 0, server = 'me', touches = { me: 0, cpu: 0 }, lastTouch = null, lastTouchAt = 0, msg = '', msgUntil = 0, rally = 0, bestRally = 0;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="bvTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="bvScore">わたし0 - 0あいて</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="bvCanvas"></canvas></div>
          <div class="mg-hint" id="bvHint">◀▶でうごいてボールのしたへ。ふれるとたかくあがる(うけ)。🏐アタックをおしながらふれるとあいてのコートへスパイク!さきに${TARGET}てん</div>
          <div class="mg-race-controls"><button class="mg-tap-btn mg-hold-btn" id="bvLeft" data-key="left">◀</button><button class="mg-tap-btn primary mg-hold-btn" id="bvAttack" data-key="action">🏐アタック</button><button class="mg-tap-btn mg-hold-btn" id="bvRight" data-key="right">▶</button></div>`;
        const canvas = container.querySelector('#bvCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 230);
        const GROUND = H - 26, NET_X = W / 2;
        const timerEl = container.querySelector('#bvTimer'), scoreEl = container.querySelector('#bvScore'), hint = container.querySelector('#bvHint');
        const say = (t, ms = 1200) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `わたし${me} - ${cpu}あいて`; };
        const P = { x: W * 0.25, y: GROUND, vy: 0, jumping: false };
        const C = { x: W * 0.75, y: GROUND, vy: 0, jumping: false, think: 0, targetX: W * 0.75, spikeChance: lerp(0.45, 0.8, difficulty), speed: lerp(150, 215, difficulty) };
        bindHeldButton(container.querySelector('#bvLeft'), (v) => { held.l = v; });
        bindHeldButton(container.querySelector('#bvRight'), (v) => { held.r = v; });
        bindHeldButton(container.querySelector('#bvAttack'), (v) => { held.a = v; if (v) { attackAt = performance.now(); if (!P.jumping) { P.jumping = true; P.vy = -300; } } });
        function serve(now) {
          const fromMe = server === 'me';
          ball = { x: fromMe ? W * 0.2 : W * 0.8, y: GROUND - 120, vx: fromMe ? 120 : -120, vy: -280, spin: 0 };
          touches = { me: 0, cpu: 0 }; lastTouch = null; rally = 0; serveAt = 0; void now;
        }
        function point(who, why) {
          if (who === 'me') me++; else cpu++;
          hud(); server = who; ball = null; serveAt = performance.now() + 1400;
          bestRally = Math.max(bestRally, rally);
          say(`${who === 'me' ? '🎉わたしのてん!' : '😣あいてのてん'} ${why}`, 1300);
          if (me >= TARGET || cpu >= TARGET) finish();
        }
        function hitBy(who, pl, now) {
          sfx('pop');
          if (lastTouch === who && now - lastTouchAt < 260) return;
          if (lastTouch !== who) { touches[who] = 0; }
          lastTouch = who; lastTouchAt = now; touches[who]++;
          rally++;
          if (touches[who] > 3) { point(who === 'me' ? 'cpu' : 'me', `(${who === 'me' ? 'わたし' : 'あいて'}が4かいさわった)`); return; }
          const dir = who === 'me' ? 1 : -1;
          const wantSpike = who === 'me' ? (held.a || now - attackAt < 220) : (touches[who] >= 3 || (touches[who] >= 2 && Math.random() < C.spikeChance) || Math.random() < 0.15);
          if (wantSpike) {
            const power = pl.jumping ? 1.15 : 0.95;
            const aim = who === 'me' ? clamp((ball.x - pl.x) / PLAYER_R, -1, 1) : (Math.random() - 0.5) * 1.4;
            ball.vx = dir * lerp(230, 330, (aim + 1) / 2) * power; ball.vy = pl.jumping ? 80 : -120;
            sfx('hit'); say(who === 'me' ? '⚡スパイク!' : '⚡あいてのスパイク!', 500);
          } else {
            ball.vx = dir * lerp(20, 70, Math.random()) + (ball.x - pl.x) * 2; ball.vy = -390;
          }
        }
        function update(now, dt) {
          const s = dt / 1000;
          if (!ball) { if (serveAt && now >= serveAt) serve(now); }
          // プレイヤー
          const spd = 200;
          if (held.l) P.x -= spd * s; if (held.r) P.x += spd * s;
          P.x = clamp(P.x, PLAYER_R, NET_X - PLAYER_R - 4);
          for (const pl of [P, C]) { if (pl.jumping) { pl.vy += GRAV * s; pl.y += pl.vy * s; if (pl.y >= GROUND) { pl.y = GROUND; pl.jumping = false; pl.vy = 0; } } }
          // CPU
          if (ball) {
            if (ball.x > NET_X || ball.vx > 0) {
              // らっかてんを よそう
              let px = ball.x, py = ball.y, vx = ball.vx, vy = ball.vy, t = 0;
              while (py < GROUND - PLAYER_R && t < 3) { vx *= 1; vy += GRAV * 0.016; px += vx * 0.016; py += vy * 0.016; t += 0.016; if (px < NET_X + BALL_R || px > W - BALL_R) vx = -vx; }
              C.targetX = ball.x > NET_X ? clamp(px + (Math.random() - 0.5) * lerp(30, 12, difficulty), NET_X + PLAYER_R + 4, W - PLAYER_R) : W * 0.75;
            } else C.targetX = W * 0.72;
            const dx = C.targetX - C.x; const mv = Math.sign(dx) * Math.min(Math.abs(dx), C.speed * s); C.x += mv;
            if (!C.jumping && ball.x > NET_X && Math.abs(ball.x - C.x) < 30 && ball.y < C.y - 30 && ball.y > C.y - 90 && ball.vy > 0 && touches.cpu >= 1 && Math.random() < 0.5) { C.jumping = true; C.vy = -300; }
          } else C.x += (W * 0.75 - C.x) * 0.05;
          if (!ball) return;
          ball.vy += GRAV * s; ball.x += ball.vx * s; ball.y += ball.vy * s;
          ball.spin += ball.vx * s * 0.05;
          if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * 0.7; }
          if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.7; }
          if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) * 0.5; }
          // ネット
          if (ball.y > GROUND - NET_H - BALL_R && Math.abs(ball.x - NET_X) < BALL_R + 2) {
            if (ball.y < GROUND - NET_H + 4 && ball.vy > 0) { ball.vy = -Math.abs(ball.vy) * 0.4; ball.y = GROUND - NET_H - BALL_R; }
            else { ball.vx = -ball.vx * 0.45; ball.x = NET_X + (ball.x < NET_X ? -1 : 1) * (BALL_R + 3); }
          }
          // プレイヤーに ふれる
          for (const [who, pl] of [['me', P], ['cpu', C]]) {
            const hx = pl.x, hy = pl.y - PLAYER_R - 4;
            if (Math.hypot(ball.x - hx, ball.y - hy) < PLAYER_R + BALL_R) {
              const ang = Math.atan2(ball.y - hy, ball.x - hx); ball.x = hx + Math.cos(ang) * (PLAYER_R + BALL_R + 1); ball.y = hy + Math.sin(ang) * (PLAYER_R + BALL_R + 1);
              hitBy(who, pl, now);
              if (!ball) return;
            }
          }
          if (ball.y >= GROUND - BALL_R) { const side = ball.x < NET_X ? 'me' : 'cpu'; point(side === 'me' ? 'cpu' : 'me', side === 'me' ? '(こちらのコートにおちた)' : '(あいてのコートにおちた)'); }
        }
        function drawPlayer(pl, color, face, flip) {
          ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(pl.x, GROUND + 2, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
          const by = pl.y - PLAYER_R - 4;
          ctx.fillStyle = color; mgRoundRect(ctx, pl.x - 9, by + 6, 18, 20, 6);
          ctx.font = `${PLAYER_R * 2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.save(); if (flip) { ctx.translate(pl.x, 0); ctx.scale(-1, 1); ctx.translate(-pl.x, 0); } ctx.fillText(face, pl.x, by); ctx.restore();
        }
        function render(now) {
          if (!ctx) return;
          const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, '#6fc7ff'); g.addColorStop(1, '#cfefff');
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(W - 34, 30, 14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3aa3e0'; ctx.fillRect(0, GROUND - 40, W, 14); ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 6; i++) ctx.fillRect(((i * 47 + now / 30) % (W + 40)) - 20, GROUND - 38 + (i % 2) * 5, 22, 2);
          ctx.fillStyle = '#f2d59a'; ctx.fillRect(0, GROUND - 26, W, H - GROUND + 26);
          ctx.fillStyle = '#e6c27f'; ctx.fillRect(0, GROUND, W, H - GROUND);
          // ネット
          ctx.fillStyle = '#8a5a2b'; ctx.fillRect(NET_X - 2, GROUND - NET_H, 4, NET_H);
          ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; for (let y = GROUND - NET_H + 4; y < GROUND; y += 6) { ctx.beginPath(); ctx.moveTo(NET_X - 6, y); ctx.lineTo(NET_X + 6, y); ctx.stroke(); }
          ctx.fillStyle = '#fff'; ctx.fillRect(NET_X - 7, GROUND - NET_H - 3, 14, 3);
          drawPlayer(P, '#ff6b9d', currentSprite(), false);
          drawPlayer(C, '#4a90e2', '🐧', true);
          if (ball) {
            ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(ball.x, GROUND + 1, 8 * clamp(1 - (GROUND - ball.y) / 300, 0.4, 1), 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.spin);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffb703'; ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI / 1.5); ctx.lineTo(0, 0); ctx.fill();
            ctx.fillStyle = '#2f7fd6'; ctx.beginPath(); ctx.arc(0, 0, BALL_R, Math.PI, Math.PI * 1.6); ctx.lineTo(0, 0); ctx.fill();
            ctx.restore();
          }
          if (lastTouch) { ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillText(`タッチ${touches[lastTouch]}/3`, lastTouch === 'me' ? W * 0.25 : W * 0.75, 6); }
          if (now < msgUntil) mgMsgBox(ctx, W, msg, 30, 13);
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(40, now - last); last = now;
          update(now, dt);
          if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const won = me > cpu;
          const score = clamp(Math.round(10 + me * 9 + (won ? 22 : 0) - cpu * 2 + Math.min(8, bestRally)), 5, 100);
          say(won ? `🏆かった!${me}-${cpu}` : me === cpu ? `ひきわけ${me}-${cpu}` : `まけた…${me}-${cpu}`, 2500);
          render(performance.now());
          setTimeout(() => onComplete(score), 1400);
        }
        hud(); serveAt = performance.now() + 1200;
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const BEACH_VOLLEY_VARIANTS = [mg('beach-volley', makeBeachVolleyGame({ title: 'ビーチバレー!うけてあげてスパイク、さきに7てん' }))];

  // --- スライドパズル(canvas): 1こ あいた ますに となりの ピースを すべらせて
  //     えを そろえる。3×3(やさしい)/4×4 ---
  function makeSlidePuzzleGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const N = difficulty < 0.45 ? 3 : 4, DURATION_MS = mgDuration(N === 3 ? 90000 : 150000);
        let running = true, rafId = null, board = [], blank = 0, moves = 0, solved = false, msg = '', msgUntil = 0, sliding = null, swipe = null, showPreview = true;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="spTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="spScore">てかず0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="spCanvas"></canvas></div>
          <div class="mg-hint" id="spHint">あいたますのとなりのピースをタップ(かスワイプ)してすべらせる。ひだりうえからじゅんばんにならべてえをかんせいさせよう</div>
          <div class="mg-race-controls"><button class="mg-tap-btn" id="spPeek" data-key="action">👀おてほんを見る</button></div>`;
        const canvas = container.querySelector('#spCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, (w) => w);
        const CELL = W / N;
        const timerEl = container.querySelector('#spTimer'), scoreEl = container.querySelector('#spScore'), hint = container.querySelector('#spHint');
        const say = (t, ms = 1000) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `てかず${moves}`; };
        // え: オフスクリーンに かいて ピースごとに きりだす
        const PICS = [{ bg: ['#ffd6e7', '#c9e7ff'], big: '🐱', small: ['🌸', '⭐', '🎈'] }, { bg: ['#fff1b8', '#ffd08a'], big: '🍰', small: ['🍓', '🍒', '✨'] }, { bg: ['#c8f5d6', '#8fd3ff'], big: '🐳', small: ['🐟', '🫧', '🐚'] }, { bg: ['#e8d6ff', '#ffd6f0'], big: '🦄', small: ['🌈', '⭐', '💫'] }];
        const pic = PICS[Math.floor(Math.random() * PICS.length)];
        const off = typeof document !== 'undefined' && document.createElement ? document.createElement('canvas') : null;
        let octx = null;
        if (off) { off.width = W * 2; off.height = W * 2; octx = off.getContext && off.getContext('2d'); }
        if (octx) {
          octx.scale(2, 2);
          const g = octx.createLinearGradient(0, 0, W, W); g.addColorStop(0, pic.bg[0]); g.addColorStop(1, pic.bg[1]); octx.fillStyle = g; octx.fillRect(0, 0, W, W);
          octx.font = `${Math.round(W * 0.55)}px sans-serif`; octx.textAlign = 'center'; octx.textBaseline = 'middle'; octx.fillText(pic.big, W / 2, W / 2 + 6);
          octx.font = `${Math.round(W * 0.16)}px sans-serif`;
          const spots = [[0.14, 0.14], [0.86, 0.16], [0.16, 0.86], [0.85, 0.85], [0.5, 0.1]];
          spots.forEach(([nx, ny], i) => octx.fillText(pic.small[i % pic.small.length], nx * W, ny * W));
          // ますの ばんごう(ちいさく)
          for (let i = 0; i < N * N - 1; i++) { const cx = (i % N) * CELL, cy = Math.floor(i / N) * CELL; octx.fillStyle = 'rgba(0,0,0,.45)'; octx.beginPath(); octx.arc(cx + 11, cy + 11, 8, 0, Math.PI * 2); octx.fill(); octx.fillStyle = '#fff'; octx.font = 'bold 10px sans-serif'; octx.fillText(String(i + 1), cx + 11, cy + 11.5); octx.font = `${Math.round(W * 0.16)}px sans-serif`; }
        }
        board = Array.from({ length: N * N }, (_, i) => i); blank = N * N - 1;
        // ただしい てじゅんで シャッフル(かならず とける)
        let prev = -1;
        const SHUF = N === 3 ? 60 : 140;
        for (let k = 0; k < SHUF; k++) {
          const bx = blank % N, by = Math.floor(blank / N);
          const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [bx + dx, by + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N).map(([x, y]) => y * N + x).filter((i) => i !== prev);
          const pick = opts[Math.floor(Math.random() * opts.length)];
          board[blank] = board[pick]; board[pick] = N * N - 1; prev = blank; blank = pick;
        }
        const isSolved = () => board.every((v, i) => v === i);
        if (isSolved()) { const a = board[0]; board[0] = board[1]; board[1] = a; }
        function tryMove(idx) {
          if (!running || solved || sliding) return;
          const bx = blank % N, by = Math.floor(blank / N), x = idx % N, y = Math.floor(idx / N);
          if (Math.abs(bx - x) + Math.abs(by - y) !== 1) return;
          sliding = { from: idx, to: blank, val: board[idx], born: performance.now() }; sfx('tick');
          board[blank] = board[idx]; board[idx] = N * N - 1; blank = idx; moves++; hud(); showPreview = false;
          if (isSolved()) { solved = true; say('🎉かんせい!', 3000); finish(); }
        }
        canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); const p = mgPointerPos(canvas, e); swipe = { x: e.clientX, y: e.clientY, id: e.pointerId, idx: Math.floor(p.y / CELL) * N + Math.floor(p.x / CELL) }; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
        canvas.addEventListener('pointermove', (e) => { if (!swipe || e.pointerId !== swipe.id) return; const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; if (Math.hypot(dx, dy) < 22) return; const bx = blank % N, by = Math.floor(blank / N); const src = Math.abs(dx) > Math.abs(dy) ? (by * N + (bx - Math.sign(dx))) : ((by - Math.sign(dy)) * N + bx); const sx = src % N, sy = Math.floor(src / N); if (Math.abs(dx) > Math.abs(dy) ? (bx - Math.sign(dx) >= 0 && bx - Math.sign(dx) < N) : (by - Math.sign(dy) >= 0 && by - Math.sign(dy) < N)) tryMove(src); void sx; void sy; swipe = null; });
        canvas.addEventListener('pointerup', (e) => { if (!swipe || e.pointerId !== swipe.id) return; if (showPreview) { showPreview = false; swipe = null; return; } tryMove(swipe.idx); swipe = null; });
        canvas.addEventListener('pointercancel', () => { swipe = null; });
        container.querySelector('#spPeek').addEventListener('pointerdown', (e) => { e.preventDefault(); showPreview = true; say('おてほん(2びょう)', 2000); setTimeout(() => { showPreview = false; }, 2000); });
        function drawPiece(val, x, y) {
          if (val === N * N - 1) return;
          const sx = (val % N) * CELL, sy = Math.floor(val / N) * CELL;
          if (octx) ctx.drawImage(off, sx * 2, sy * 2, CELL * 2, CELL * 2, x, y, CELL, CELL);
          else { ctx.fillStyle = '#eee'; ctx.fillRect(x, y, CELL, CELL); }
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
          ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#2b2b3a'; ctx.fillRect(0, 0, W, H);
          if (showPreview && octx && !solved) { ctx.globalAlpha = 0.9; ctx.drawImage(off, 0, 0, W, W); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, H / 2 - 14, W, 28); ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👀おてほん—タップではじめる', W / 2, H / 2); return; }
          for (let i = 0; i < N * N; i++) {
            const v = board[i]; if (v === N * N - 1) continue;
            const x = (i % N) * CELL, y = Math.floor(i / N) * CELL;
            if (sliding && sliding.to === i) continue;
            drawPiece(v, x, y);
          }
          if (sliding) {
            const k = clamp((now - sliding.born) / 110, 0, 1);
            const fx = (sliding.from % N) * CELL, fy = Math.floor(sliding.from / N) * CELL, tx = (sliding.to % N) * CELL, ty = Math.floor(sliding.to / N) * CELL;
            drawPiece(sliding.val, lerp(fx, tx, k), lerp(fy, ty, k));
            if (k >= 1) sliding = null;
          }
          if (solved && octx) { ctx.drawImage(off, 0, 0, W, W); }
          if (now < msgUntil) mgMsgBox(ctx, W, msg, H / 2, 13);
        }
        function frame(now) {
          if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const correct = board.filter((v, i) => v === i && v !== N * N - 1).length;
          const remainS = Math.max(0, DURATION_MS - (performance.now() - startTime)) / 1000;
          const score = clamp(Math.round(solved ? 74 + Math.min(26, remainS / (DURATION_MS / 1000) * 40) : 8 + correct / (N * N - 1) * 50), 5, 100);
          if (!solved) say(`タイムアップ!${correct}ピースあっていた`, 2500);
          render(performance.now());
          setTimeout(() => onComplete(score), 1300);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const SLIDE_PUZZLE_VARIANTS = [mg('slide-puzzle', makeSlidePuzzleGame({ title: 'スライドパズル!ピースをすべらせてえをかんせい' }))];

  // --- すごろく(canvas): サイコロは くるくる まわっていて、タップで とめる(タイミング)。
  //     ➕➖⭐💤の ますで いろいろ おこる。CPU 2人と ゴールを きそう ---
  function makeSugorokuGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(150000), COLS = 6, ROWS = 5, LEN = COLS * ROWS;
        let running = true, rafId = null, last = null, turn = 0, phase = 'roll', dieFace = 1, dieTimer = 0, rolling = false, moving = null, msg = '', msgUntil = 0, finished = [], coins = 0, eventAt = 0, pendingEvent = null;
        const startTime = performance.now();
        container.innerHTML = `
          <div class="mg-header"><span id="sgTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="sgScore">💰 0／じゅんい—</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="sgCanvas"></canvas></div>
          <div class="mg-hint" id="sgHint">「🎲とめる」をおすとまわっているサイコロがとまる(ねらってとめよう)。➕はすすむ、➖はもどる、⭐はコイン、💤は1かいやすみ。さきにゴールへ!</div>
          <div class="mg-race-controls"><button class="mg-tap-btn primary" id="sgRoll" data-key="action">🎲とめる</button></div>`;
        const canvas = container.querySelector('#sgCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const timerEl = container.querySelector('#sgTimer'), scoreEl = container.querySelector('#sgScore'), hint = container.querySelector('#sgHint'), rollBtn = container.querySelector('#sgRoll');
        const say = (t, ms = 1300) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const players = [
          { name: 'わたし', emoji: currentSprite(), pos: 0, skip: 0, color: '#ff6b9d', cpu: false },
          { name: 'ペンギン', emoji: '🐧', pos: 0, skip: 0, color: '#4a90e2', cpu: true },
          { name: 'キツネ', emoji: '🦊', pos: 0, skip: 0, color: '#f28c28', cpu: true },
        ];
        const rankOf = () => { const order = [...players].sort((a, b) => b.pos - a.pos); const fin = finished.indexOf(players[0]); return fin >= 0 ? fin + 1 : finished.length + order.filter((p) => !finished.includes(p)).indexOf(players[0]) + 1; };
        const hud = () => { scoreEl.textContent = `💰 ${coins}／じゅんい${rankOf()}い`; };
        // ます: ヘビじゅんに おりかえす みち。ゴールは さいご
        const cells = [];
        for (let i = 0; i < LEN; i++) { const r = Math.floor(i / COLS), c = r % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS); cells.push({ x: c, y: ROWS - 1 - r, kind: 'normal' }); }
        const kinds = ['plus', 'minus', 'star', 'rest', 'star', 'plus', 'minus', 'rest', 'star', 'plus', 'minus'];
        const slots = []; for (let i = 2; i < LEN - 1; i++) slots.push(i);
        for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
        kinds.forEach((k, i) => { cells[slots[i]].kind = k; });
        cells[LEN - 1].kind = 'goal';
        const TRAY = 38, CW = (W - 12) / COLS, CH = (H - 16 - TRAY) / ROWS, OX = 6, OY = 8;
        const cellCenter = (i) => ({ x: OX + cells[i].x * CW + CW / 2, y: OY + cells[i].y * CH + CH / 2 });
        const KIND_ICON = { plus: '➕', minus: '➖', star: '⭐', rest: '💤', goal: '🏁', normal: '' };
        function startRoll() { rolling = true; phase = 'rolling'; dieTimer = 0; }
        function stopRoll(value) {
          sfx('pop');
          rolling = false; dieFace = value; phase = 'move';
          const p = players[turn];
          say(`${p.name}: ${value}`, 700);
          moving = { p, left: value, nextAt: performance.now() + 350 };
        }
        rollBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!running || phase !== 'rolling' || players[turn].cpu) return; stopRoll(dieFace); });
        function applyCell(p, now) {
          const c = cells[p.pos];
          if (c.kind === 'goal') { if (!finished.includes(p)) finished.push(p); say(`🏁 ${p.name}ゴール!${finished.length}い`, 1500); if (p === players[0] || finished.length >= 2) { finish(); return; } }
          else if (c.kind === 'plus') { say(`➕ ${p.name}は2ますすすむ`, 1000); moving = { p, left: 2, nextAt: now + 500, noEvent: true }; return; }
          else if (c.kind === 'minus') { say(`➖ ${p.name}は2ますもどる`, 1000); moving = { p, left: -2, nextAt: now + 500, noEvent: true }; return; }
          else if (c.kind === 'star') { if (p === players[0]) { coins += 3; sfx('coin'); hud(); } say(`⭐ ${p.name}はコイン+3`, 1000); }
          else if (c.kind === 'rest') { p.skip = 1; say(`💤 ${p.name}は1かいやすみ`, 1000); }
          nextTurn(now);
        }
        function nextTurn(now) {
          phase = 'wait'; eventAt = now + 700;
          pendingEvent = () => {
            for (let k = 0; k < 3; k++) {
              turn = (turn + 1) % players.length;
              const p = players[turn];
              if (finished.includes(p)) continue;
              if (p.skip > 0) { p.skip--; say(`💤 ${p.name}はやすみ`, 800); continue; }
              startRoll(); if (p.cpu) eventAt = now + 900 + Math.random() * 600; return;
            }
            finish();
          };
        }
        function update(now, dt) {
          if (rolling) { dieTimer += dt; if (dieTimer > 85) { dieTimer = 0; let f = 1 + Math.floor(Math.random() * 6); if (f === dieFace) f = (f % 6) + 1; dieFace = f; } if (players[turn].cpu && now >= eventAt) { const p = players[turn]; const luck = Math.random() < lerp(0.15, 0.4, difficulty) ? 4 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 6); void p; stopRoll(luck); } return; }
          if (phase === 'move' && moving && now >= moving.nextAt) {
            const m = moving;
            if (m.left === 0) { moving = null; if (m.noEvent && cells[m.p.pos].kind !== 'goal') { nextTurn(now); } else applyCell(m.p, now); return; }
            const dir = Math.sign(m.left); m.p.pos = clamp(m.p.pos + dir, 0, LEN - 1); m.left -= dir; m.nextAt = now + 230; sfx('tick');
            if (m.p.pos === LEN - 1 && dir > 0) { m.left = 0; }
            if (m.p === players[0]) hud();
          }
          if (phase === 'wait' && now >= eventAt && pendingEvent) { const ev = pendingEvent; pendingEvent = null; ev(); }
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#e8f4d8'; ctx.fillRect(0, 0, W, H);
          // みち
          ctx.strokeStyle = '#c5d9a8'; ctx.lineWidth = CW * 0.7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
          for (let i = 0; i < LEN; i++) { const c = cellCenter(i); if (i === 0) ctx.moveTo(c.x, c.y); else ctx.lineTo(c.x, c.y); } ctx.stroke();
          for (let i = 0; i < LEN; i++) {
            const c = cellCenter(i), k = cells[i].kind;
            ctx.fillStyle = k === 'goal' ? '#ffd54a' : k === 'plus' ? '#bff0c8' : k === 'minus' ? '#ffc9c9' : k === 'star' ? '#fff3a8' : k === 'rest' ? '#d9d0ff' : '#ffffff';
            ctx.beginPath(); ctx.arc(c.x, c.y, CW * 0.36, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1; ctx.stroke();
            ctx.font = `${Math.round(CW * 0.4)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            if (KIND_ICON[k]) ctx.fillText(KIND_ICON[k], c.x, c.y + 1); else { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.font = `bold ${Math.round(CW * 0.28)}px sans-serif`; ctx.fillText(String(i), c.x, c.y + 1); }
          }
          // コマ(おなじ ますは ずらす)
          players.forEach((p, i) => {
            const c = cellCenter(p.pos); const same = players.filter((o) => o.pos === p.pos); const k = same.indexOf(p); const off = same.length > 1 ? (k - (same.length - 1) / 2) * 11 : 0;
            const bounce = moving && moving.p === p ? -Math.abs(Math.sin((now - moving.nextAt) / 230 * Math.PI)) * 6 : 0;
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(c.x + off, c.y - 6 + bounce, 9, 0, Math.PI * 2); ctx.fill();
            ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.emoji, c.x + off, c.y - 6 + bounce);
            if (turn === i && running) { ctx.strokeStyle = '#ff9800'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x + off, c.y - 6 + bounce, 11, 0, Math.PI * 2); ctx.stroke(); }
          });
          // サイコロ
          ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, H - TRAY, W, TRAY);
          const dx = W / 2 - 58, dy = H - TRAY / 2;
          ctx.fillStyle = 'rgba(0,0,0,.2)'; mgRoundRect(ctx, dx - 15, dy - 13, 32, 32, 6);
          ctx.fillStyle = rolling ? '#fff' : '#f4f4f4'; mgRoundRect(ctx, dx - 16, dy - 16, 32, 32, 6);
          const pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[dieFace];
          ctx.fillStyle = '#222'; for (const [px, py] of pips) { ctx.beginPath(); ctx.arc(dx + px * 8, dy + py * 8, 3, 0, Math.PI * 2); ctx.fill(); }
          ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#333'; ctx.fillText(`${players[turn].emoji} ${players[turn].name}${rolling && !players[turn].cpu ? ':タップでとめて!' : 'のばん'}`, dx + 24, dy);
          if (now < msgUntil) mgMsgBox(ctx, W, msg, H - TRAY - 14, 12);
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(60, now - last); last = now;
          update(now, dt);
          if (!running) return;
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          rollBtn.disabled = !(phase === 'rolling' && !players[turn].cpu);
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          container.querySelectorAll('button').forEach((b) => { b.disabled = true; });
          const rank = rankOf();
          const score = clamp(Math.round((rank === 1 ? 72 : rank === 2 ? 46 : 26) + coins * 1.5 + players[0].pos / LEN * 6), 5, 100);
          say(rank === 1 ? '🏆 1い!おめでとう' : `${rank}い…つぎはかとう`, 2500);
          hud(); render(performance.now());
          setTimeout(() => onComplete(score), 1400);
        }
        hud(); startRoll();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const SUGOROKU_VARIANTS = [mg('sugoroku-race', makeSugorokuGame({ title: 'すごろく!サイコロをねらってとめてさきにゴール' }))];

  // --- たこやき(canvas、タイミング): 9この あなで やける たこやきを、ちょうど いい
  //     やきぐあいで ひっくりかえし、もういちど ちょうど よく とりだす ---
  function makeTakoyakiGame({ title }) {
    return {
      start(container, onComplete) {
        const difficulty = ageDifficulty();
        const DURATION_MS = mgDuration(60000), N = 3;
        const COOK_MS = lerp(5200, 3600, difficulty);
        let running = true, rafId = null, last = null, holes = [], perfect = 0, good = 0, bad = 0, served = 0, msg = '', msgUntil = 0, pops = [];
        const startTime = performance.now() + MG_ACTION_START_GRACE_MS;
        container.innerHTML = `
          <div class="mg-header"><span id="tkTimer">のこり: ${Math.round(DURATION_MS / 1000)}s</span><span id="tkScore">🐙 0／✨ 0</span></div>
          <div class="mg-title">${title}</div>
          <div class="mg-canvas-wrap"><canvas class="mg-canvas" id="tkCanvas"></canvas></div>
          <div class="mg-hint" id="tkHint">きつねいろ(みどりのゾーン)になったらタップでひっくりかえす。うらもきつねいろでタップしてとりだす。はやいとなま、おそいとこげ!</div>`;
        const canvas = container.querySelector('#tkCanvas');
        const { ctx, W, H } = createMgCanvas(canvas, 250);
        const timerEl = container.querySelector('#tkTimer'), scoreEl = container.querySelector('#tkScore'), hint = container.querySelector('#tkHint');
        const say = (t, ms = 900) => { msg = t; msgUntil = performance.now() + ms; hint.textContent = t; };
        const hud = () => { scoreEl.textContent = `🐙 ${served}／✨ ${perfect}`; };
        const CELL = Math.min(W, H - 16) / N, OX = (W - CELL * N) / 2, OY = (H - CELL * N) / 2 - 2, R = CELL * 0.29;
        for (let i = 0; i < N * N; i++) holes.push({ i, state: 'empty', t: 0, speed: 1, side1: 0, refillAt: startTime + 400 + i * 350 });
        const doneness = (h) => h.t / COOK_MS; // 0.85〜1.05 パーフェクト、0.7〜1.2 OK、<0.7 なま、>1.35 こげ
        const EZ = minigameEase();
        const grade = (d) => (d >= 0.85 - 0.05 * EZ && d <= 1.05 + 0.05 * EZ ? 2 : d >= 0.7 - 0.08 * EZ && d <= 1.2 + 0.08 * EZ ? 1 : 0);
        function tapHole(h, now) {
          if (h.state === 'side1') { const d = doneness(h); sfx('pop'); h.side1 = d; h.state = 'side2'; h.t = 0; h.speed = 0.9 + Math.random() * 0.25; pops.push({ x: h.cx, y: h.cy, text: d < 0.7 ? 'なま…' : d > 1.2 ? 'こげ…' : grade(d) === 2 ? 'いいかえし!' : 'かえした', born: now }); }
          else if (h.state === 'side2') {
            const d = doneness(h); const g = Math.min(grade(h.side1), grade(d));
            served++; if (g === 2) perfect++; else if (g === 1) good++; else bad++;
            pops.push({ x: h.cx, y: h.cy, text: g === 2 ? '✨パーフェクト!' : g === 1 ? '😋おいしい' : d < 0.7 || h.side1 < 0.7 ? '💦なま…' : '💦こげた…', born: now });
            h.state = 'empty'; h.refillAt = now + 700; hud();
          }
        }
        for (const h of holes) { h.cx = OX + (h.i % N) * CELL + CELL / 2; h.cy = OY + Math.floor(h.i / N) * CELL + CELL / 2; }
        canvas.addEventListener('pointerdown', (e) => { if (!running) return; e.preventDefault(); const p = mgPointerPos(canvas, e); const now = performance.now(); if (now < startTime) return; for (const h of holes) { if (Math.hypot(p.x - h.cx, p.y - h.cy) < CELL * 0.48) { tapHole(h, now); break; } } });
        function update(now, dt) {
          for (const h of holes) {
            if (h.state === 'empty') { if (now >= h.refillAt) { h.state = 'side1'; h.t = 0; h.speed = 0.85 + Math.random() * 0.35; } continue; }
            h.t += dt * h.speed;
            if (doneness(h) > 1.4) { bad++; served++; pops.push({ x: h.cx, y: h.cy, text: '🔥まっくろ…', born: now }); h.state = 'empty'; h.refillAt = now + 900; hud(); }
          }
        }
        function colorFor(d) {
          if (d < 0.35) return '#f6e7b3'; if (d < 0.7) return '#f1cf7a'; if (d < 1.05) return '#d99a3c'; if (d < 1.2) return '#b8742a'; if (d < 1.35) return '#7a4a1c'; return '#3a2416';
        }
        function render(now) {
          if (!ctx) return;
          ctx.fillStyle = '#5a3b2a'; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = '#2f2a2a'; mgRoundRect(ctx, OX - 8, OY - 8, CELL * N + 16, CELL * N + 16, 14);
          for (const h of holes) {
            ctx.fillStyle = '#1c1717'; ctx.beginPath(); ctx.arc(h.cx, h.cy, R + 5, 0, Math.PI * 2); ctx.fill();
            if (h.state === 'empty') { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.arc(h.cx, h.cy, R, 0, Math.PI * 2); ctx.fill(); continue; }
            const d = doneness(h);
            ctx.fillStyle = colorFor(d); ctx.beginPath(); ctx.arc(h.cx, h.cy, R, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(h.cx - R * 0.3, h.cy - R * 0.3, R * 0.3, 0, Math.PI * 2); ctx.fill();
            if (h.state === 'side2') { ctx.font = `${Math.round(R * 0.8)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🐙', h.cx, h.cy + 1); }
            // ゆげ/けむり
            if (d > 0.6) { ctx.globalAlpha = 0.35; ctx.fillStyle = d > 1.2 ? '#333' : '#fff'; for (let k = 0; k < 2; k++) { const ph = (now / 600 + k * 0.5 + h.i) % 1; ctx.beginPath(); ctx.arc(h.cx + Math.sin(ph * 6 + k) * 5, h.cy - R - ph * 16, 3 + ph * 3, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; }
            // やきぐあい ゲージ(みどり=ちょうど いい)
            const gw = CELL * 0.8, gx = h.cx - gw / 2, gy = h.cy + R + 5;
            ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(gx, gy, gw, 5);
            ctx.fillStyle = 'rgba(80,220,120,.6)'; ctx.fillRect(gx + gw * 0.7 / 1.4, gy, gw * 0.5 / 1.4, 5);
            ctx.fillStyle = 'rgba(120,255,160,.9)'; ctx.fillRect(gx + gw * 0.85 / 1.4, gy, gw * 0.2 / 1.4, 5);
            ctx.fillStyle = '#fff'; ctx.fillRect(gx + clamp(d / 1.4, 0, 1) * gw - 1, gy - 2, 2, 9);
            ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(h.state === 'side1' ? 'かえす' : 'とる', h.cx, gy + 7);
          }
          pops = pops.filter((p) => now - p.born < 900);
          for (const p of pops) { const k = (now - p.born) / 900; ctx.globalAlpha = 1 - k; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(0,0,0,.6)'; const tw = ctx.measureText(p.text).width + 10; mgRoundRect(ctx, p.x - tw / 2, p.y - 24 - k * 18, tw, 16, 5); ctx.fillStyle = '#fff'; ctx.fillText(p.text, p.x, p.y - 16 - k * 18); ctx.globalAlpha = 1; }
          if (now < startTime) mgMsgBox(ctx, W, 'スタート!', H / 2, 16);
          if (now < msgUntil) mgMsgBox(ctx, W, msg, 18, 12);
        }
        function frame(now) {
          if (!running) return;
          if (last === null) last = now; const dt = Math.min(60, now - last); last = now;
          if (now >= startTime) update(now, dt);
          const remain = Math.max(0, DURATION_MS - (now - startTime)); timerEl.textContent = `のこり: ${Math.ceil(remain / 1000)}s`;
          render(now);
          if (remain <= 0) { finish(); return; }
          rafId = requestAnimationFrame(frame);
        }
        function finish() {
          if (!running) return; running = false; cancelAnimationFrame(rafId);
          const score = clamp(Math.round(6 + perfect * 6 + good * 2.5 - bad * 2), 5, 100);
          say(`おわり!✨${perfect} 😋${good} 💦${bad}`, 2500);
          render(performance.now());
          setTimeout(() => onComplete(score), 1200);
        }
        hud();
        rafId = requestAnimationFrame(frame);
      },
    };
  }
  const TAKOYAKI_VARIANTS = [mg('takoyaki-grill', makeTakoyakiGame({ title: 'たこやきやさん!ちょうどいいやきぐあいでかえしてとれ' }))];

  const MINIGAMES = [
    ...ROAD_GAME_VARIANTS,
    ...STACK_GAME_VARIANTS,
    ...FALLING_BLOCK_VARIANTS,
    ...CRANE_GAME_VARIANTS,
    ...PINBALL_VARIANTS,
    ...HAUNTED_HOUSE_VARIANTS,
    ...SWIPE_THROW_VARIANTS,
    ...BREAKOUT_VARIANTS,
    ...DRAG_DECORATE_VARIANTS,
    ...PERSPECTIVE_3D_VARIANTS,
    ...FIRST_PERSON_DUNGEON_VARIANTS,
    ...ROAD_RACE_VARIANTS,
    ...RHYTHM_HIGHWAY_VARIANTS,
    ...TILT_MAZE_VARIANTS,
    ...SPACE_GUNNER_VARIANTS,
    ...MINI_GOLF_VARIANTS,
    ...REAL_FISHING_VARIANTS,
    ...BASKETBALL_VARIANTS,
    ...PING_PONG_VARIANTS,
    ...CHAIN_PUZZLE_VARIANTS,
    ...STREET_FIGHT_VARIANTS,
    ...FREE_KICK_VARIANTS,
    ...TOWER_DEFENSE_VARIANTS,
    ...ROGUELIKE_VARIANTS,
    ...GRAND_PRIX_VARIANTS,
    ...SKY_SHOOTER_VARIANTS,
    ...JUMP_QUEST_VARIANTS,
    ...PUSH_PUZZLE_VARIANTS,
    ...REVERSI_VARIANTS,
    ...BILLIARDS_VARIANTS,
    ...ANIMAL_SHOGI_VARIANTS,
    ...MINESWEEPER_VARIANTS,
    ...SNAKE_VARIANTS,
    ...BASEBALL_VARIANTS,
    ...RING_FLIGHT_VARIANTS,
    ...BUBBLE_SHOOTER_VARIANTS,
    ...CATAPULT_VARIANTS,
    ...CONNECT_FOUR_VARIANTS,
    ...TWENTY48_VARIANTS,
    ...FROGGER_VARIANTS,
    ...SKI_JUMP_VARIANTS,
    ...AIR_HOCKEY_VARIANTS,
    ...SUBMARINE_VARIANTS,
    ...MATCH_THREE_VARIANTS,
    ...GOMOKU_VARIANTS,
    ...TANK_BATTLE_VARIANTS,
    ...TENNIS_VARIANTS,
    ...PICROSS_VARIANTS,
    ...DARTS_VARIANTS,
    ...HANG_GLIDER_VARIANTS,
    ...BOMBER_VARIANTS,
    ...BLACKJACK_VARIANTS,
    ...PIPE_CONNECT_VARIANTS,
    ...FRUIT_SLICE_VARIANTS,
    ...TRACK_FIELD_VARIANTS,
    ...VOXEL_MINE_VARIANTS,
    ...SUSHI_BELT_VARIANTS,
    ...ASTEROIDS_VARIANTS,
    ...YACHT_DICE_VARIANTS,
    ...LIGHTS_OUT_VARIANTS,
    ...DOODLE_JUMP_VARIANTS,
    ...CURLING_VARIANTS,
    ...JENGA_VARIANTS,
    ...LINE_TRACE_VARIANTS,
    ...CHECKERS_VARIANTS,
    ...MEMORY_CARDS_VARIANTS,
    ...HALFPIPE_VARIANTS,
    ...DOMINO_RUN_VARIANTS,
    ...SUDOKU_VARIANTS,
    ...MANCALA_VARIANTS,
    ...PLANE_LANDING_VARIANTS,
    ...DOT_EATER_VARIANTS,
    ...MISSILE_COMMAND_VARIANTS,
    ...AREA_CLAIM_VARIANTS,
    ...SOLITAIRE_VARIANTS,
    ...HIT_BLOW_VARIANTS,
    ...LUNAR_LANDER_VARIANTS,
    ...SHANGHAI_VARIANTS,
    ...BEACH_VOLLEY_VARIANTS,
    ...SLIDE_PUZZLE_VARIANTS,
    ...SUGOROKU_VARIANTS,
    ...TAKOYAKI_VARIANTS,
  ];

  // MINIGAMES の どの ゲームが どの「しゅるい」(生成もとの make*Game
  // ジェネレーター)に ぞくすかを、オブジェクトの まま ひきなおせる
  // Map として おぼえておく。地域限定あそびが「その しゅるい」を まるごと
  // 地域仕様に おきかえる さいに つかう(下の buildMinigamePool 参照)
  const MINIGAME_CATEGORY_GROUPS = [
    ['road', ROAD_GAME_VARIANTS],
    ['stack', STACK_GAME_VARIANTS],
    ['fallingBlock', FALLING_BLOCK_VARIANTS],
    ['craneGame', CRANE_GAME_VARIANTS],
    ['pinball', PINBALL_VARIANTS],
    ['hauntedHouse', HAUNTED_HOUSE_VARIANTS],
    ['swipeThrow', SWIPE_THROW_VARIANTS],
    ['breakout', BREAKOUT_VARIANTS],
    ['dragDecorate', DRAG_DECORATE_VARIANTS],
    ['perspective3d', PERSPECTIVE_3D_VARIANTS],
    ['firstPersonDungeon', FIRST_PERSON_DUNGEON_VARIANTS],
    ['roadRace', ROAD_RACE_VARIANTS],
    ['rhythmHighway', RHYTHM_HIGHWAY_VARIANTS],
    ['tiltMaze', TILT_MAZE_VARIANTS],
    ['spaceGunner', SPACE_GUNNER_VARIANTS],
    ['miniGolf', MINI_GOLF_VARIANTS],
    ['realFishing', REAL_FISHING_VARIANTS],
    ['basketball', BASKETBALL_VARIANTS],
    ['pingPong', PING_PONG_VARIANTS],
    ['chainPuzzle', CHAIN_PUZZLE_VARIANTS],
    ['streetFight', STREET_FIGHT_VARIANTS],
    ['freeKick', FREE_KICK_VARIANTS],
    ['towerDefense', TOWER_DEFENSE_VARIANTS],
    ['roguelike', ROGUELIKE_VARIANTS],
    ['grandPrix', GRAND_PRIX_VARIANTS],
    ['skyShooter', SKY_SHOOTER_VARIANTS],
    ['jumpQuest', JUMP_QUEST_VARIANTS],
    ['pushPuzzle', PUSH_PUZZLE_VARIANTS],
    ['reversi', REVERSI_VARIANTS],
    ['billiards', BILLIARDS_VARIANTS],
    ['animalShogi', ANIMAL_SHOGI_VARIANTS],
    ['minesweeper', MINESWEEPER_VARIANTS],
    ['snake', SNAKE_VARIANTS],
    ['baseball', BASEBALL_VARIANTS],
    ['ringFlight', RING_FLIGHT_VARIANTS],
    ['bubbleShooter', BUBBLE_SHOOTER_VARIANTS],
    ['catapult', CATAPULT_VARIANTS],
    ['connectFour', CONNECT_FOUR_VARIANTS],
    ['twenty48', TWENTY48_VARIANTS],
    ['frogger', FROGGER_VARIANTS],
    ['skiJump', SKI_JUMP_VARIANTS],
    ['airHockey', AIR_HOCKEY_VARIANTS],
    ['submarine', SUBMARINE_VARIANTS],
    ['matchThree', MATCH_THREE_VARIANTS],
    ['gomoku', GOMOKU_VARIANTS],
    ['tankBattle', TANK_BATTLE_VARIANTS],
    ['tennis', TENNIS_VARIANTS],
    ['picross', PICROSS_VARIANTS],
    ['darts', DARTS_VARIANTS],
    ['hangGlider', HANG_GLIDER_VARIANTS],
    ['bomber', BOMBER_VARIANTS],
    ['blackjack', BLACKJACK_VARIANTS],
    ['pipeConnect', PIPE_CONNECT_VARIANTS],
    ['fruitSlice', FRUIT_SLICE_VARIANTS],
    ['trackField', TRACK_FIELD_VARIANTS],
    ['voxelMine', VOXEL_MINE_VARIANTS],
    ['sushiBelt', SUSHI_BELT_VARIANTS],
    ['asteroids', ASTEROIDS_VARIANTS],
    ['yachtDice', YACHT_DICE_VARIANTS],
    ['lightsOut', LIGHTS_OUT_VARIANTS],
    ['doodleJump', DOODLE_JUMP_VARIANTS],
    ['curling', CURLING_VARIANTS],
    ['jenga', JENGA_VARIANTS],
    ['lineTrace', LINE_TRACE_VARIANTS],
    ['checkers', CHECKERS_VARIANTS],
    ['memoryCards', MEMORY_CARDS_VARIANTS],
    ['halfpipe', HALFPIPE_VARIANTS],
    ['dominoRun', DOMINO_RUN_VARIANTS],
    ['sudoku', SUDOKU_VARIANTS],
    ['mancala', MANCALA_VARIANTS],
    ['planeLanding', PLANE_LANDING_VARIANTS],
    ['dotEater', DOT_EATER_VARIANTS],
    ['missileCommand', MISSILE_COMMAND_VARIANTS],
    ['areaClaim', AREA_CLAIM_VARIANTS],
    ['solitaire', SOLITAIRE_VARIANTS],
    ['hitBlow', HIT_BLOW_VARIANTS],
    ['lunarLander', LUNAR_LANDER_VARIANTS],
    ['shanghai', SHANGHAI_VARIANTS],
    ['beachVolley', BEACH_VOLLEY_VARIANTS],
    ['slidePuzzle', SLIDE_PUZZLE_VARIANTS],
    ['sugoroku', SUGOROKU_VARIANTS],
    ['takoyaki', TAKOYAKI_VARIANTS],
  ];
  const minigameCategoryOf = new Map();
  for (const [category, variants] of MINIGAME_CATEGORY_GROUPS) {
    for (const game of variants) minigameCategoryOf.set(game, category);
  }

  // 地域ごとの あそび。一般プールとは別に地域らしいテーマを足す。
  // 同じ「左右に動いて落下物を拾う」キャッチ系は一般・地域とも抽選から外した。
  // 地域側は釣り・滑走・ロード・積み上げなど、操作感が変わるものだけ残す。
  const REGION_MINIGAMES = {
    home: [],
    city: [
      { category: 'road', game: mg('road-city', makeRoadGame({
        title: 'とかいをはしろう!ラッキーアイテムはキャッチ、しょうがいぶつはよけて',
        goodItems: ['🍩','☕','🎫','💰'], badItems: ['🐦','🚧','🗑️','⚠️'], scene: 'city',
      })) },
    ],
    countryside: [
      { category: 'stack', game: mg('stack-harvest', makeStackGame({
        title: 'いなかのしゅうかくタワー!くずさずつもう',
        blockEmoji: '🌾',
        palette: ['#d6b85a','#af9b4f','#8c7b3f','#e4cf77','#9f8c53','#cab86e','#776638'],
      })) },
    ],
    forest: [
      { category: 'stack', game: mg('stack-acorn', makeStackGame({
        title: 'きのみタワー!たかくつみあげよう',
        blockEmoji: '🌰',
        palette: ['#8a9a5b','#a3b18a','#dad7cd','#588157','#3a5a40','#344e41','#bc6c25'],
      })) },
    ],
    mountain: [
      { category: 'downhill', game: mg('downhill-mountain', randomThemeGame(makeDownhillGame, DOWNHILL_THEMES)) },
    ],
    snow: [
      { category: 'downhill', game: mg('downhill-snow', randomThemeGame(makeDownhillGame, DOWNHILL_THEMES)) },
    ],
    sea: [
      { category: 'fishing', game: mg('fishing-sea', makeRealFishingGame({ title: 'うみでほんかくさかなつり!あわせてまいてつりあげろ' })) },
    ],
    deepsea: [
      { category: 'fishing', game: mg('fishing-deepsea', makeRealFishingGame({ title: 'しんかいフィッシング!なにがかかるかわからない', species: DEEPSEA_FISH, waterTop: '#1d5a8a', waterBottom: '#03122a' })) },
    ],
    river_lake: [
      { category: 'fishing', game: mg('fishing-river', makeRealFishingGame({ title: 'かわ・みずうみでさかなつり!ながれをよもう', species: RIVER_FISH, waterTop: '#5fc0b0', waterBottom: '#1c5a5a' })) },
    ],
    jungle: [
      { category: 'road', game: mg('road-jungle', makeRoadGame({
        title: 'ジャングルをかけぬけろ!くだものはとって、とげとヘビはよけて',
        goodItems: ['🍌','🥭','🥥','⭐'], badItems: ['🐍','🌵','🕸️','⚠️'], scene: 'jungle',
      })) },
    ],
    desert: [
      { category: 'road', game: mg('road-desert', makeRoadGame({
        title: 'さばくをはしろう!オアシスのめぐみはとって、とげはよけて',
        goodItems: ['💧','🍈','⭐','🧢'], badItems: ['🦂','🐍','☠️','🔥'], scene: 'desert',
      })) },
    ],
  };

  // きせつごとの あそび。  // きせつごとの あそび。地域とはちがい、その category を まるごと
  // おきかえるのではなく、いま の きせつのあいだだけ「おまけの あと数種類」
  // として ふつうの プールに くわわる(きせつが すぎれば また 出なくなる)。
  // しょうらい きせつごとに 出現する ゲームを かえたり ふやしたり できる
  // よう、REGION_MINIGAMES と おなじ かたち([{category, game}, ...])で
  // もたせてある
  const SEASONAL_MINIGAMES = {
    // 季節ゲームも「その季節なら遊びたい」ものだけ残す。
    [SEASON.SPRING]: [
      { category: 'stack', game: mg('stack-sakura', makeStackGame({
        title: 'さくらタワー!はなびらをそっとかさねよう',
        blockEmoji: '🌸',
        palette: ['#ffc4d6', '#ffa8c5', '#ff8fb3', '#ffd6e3', '#f9a8d4', '#f472b6', '#fbcfe8'],
      })) },
    ],
    [SEASON.SUMMER]: [
      { category: 'ringFlight', game: mg('ring-flight-summer', makeRingFlightGame({ title: 'なつのうみフライト!ゆうやけのリングをくぐれ', theme: 'summer' })) },
    ],
    [SEASON.AUTUMN]: [
      { category: 'stack', game: mg('stack-leaves', makeStackGame({
        title: 'おちばのやまをたかくつもう!',
        blockEmoji: '🍁',
        palette: ['#c1440e', '#e3843b', '#d4a017', '#a0522d', '#8b5a2b', '#6b4226', '#e08214'],
      })) },
    ],
    [SEASON.WINTER]: [
      { category: 'curling', game: mg('curling-winter', makeCurlingGame({ title: 'ふゆのカーリングたいかい!5こずつでしょうぶ', stoneCount: 5 })) },
    ],
  };

  return { MINIGAMES, MINIGAME_CATEGORY_GROUPS, REGION_MINIGAMES, SEASONAL_MINIGAMES, mg, minigameCategoryOf };
  };
})();
