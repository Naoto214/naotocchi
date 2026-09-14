// なおとっち — クイックモード(ちょう みじかい ゲームを つぎつぎ あそぶ)。
// script.js(本体)から installNaotocchiQuick(S) で よびだされる。
// 「よけろ!」「たべろ!」などの みじかい 指示(文字+こえ)→ すぐ ゲーム(3〜6びょう)
// → ○/× の はんてい → すぐ つぎ、を くりかえす。ふつうの ミニゲーム(games.js)
// とは べつの あそびで、本体からは 1つの ゲーム(id 'quick-run')として あつかわれる
// (startMinigame/finishMinigame/やめるバー/きろく を そのまま つかう)。
// S: sfx(name), voice(text), clamp, lerp, escapeHtml, createMgCanvas, currentSprite(),
//    partnerEmoji(), companionEmojis(), foodEmojis(), seasonId(), onRunEnd(stats)
(() => {
  'use strict';
  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  root.installNaotocchiQuick = function installNaotocchiQuick(S) {
    const sfx = typeof S.sfx === 'function' ? S.sfx : () => {};
    const voice = typeof S.voice === 'function' ? S.voice : () => {};
    const clamp = S.clamp || ((v, a, b) => Math.min(b, Math.max(a, v)));
    const lerp = S.lerp || ((a, b, t) => a + (b - a) * t);
    const escapeHtml = S.escapeHtml || ((s) => String(s));
    const sprite = () => (typeof S.currentSprite === 'function' ? S.currentSprite() : '🐣');
    const partner = () => (typeof S.partnerEmoji === 'function' ? S.partnerEmoji() : null);
    const companions = () => { const c = typeof S.companionEmojis === 'function' ? S.companionEmojis() : []; return c && c.length ? c : ['🐇', '🐿️', '🦋']; };
    const foods = () => { const f = typeof S.foodEmojis === 'function' ? S.foodEmojis() : []; return f && f.length ? f : ['🍙', '🍎', '🍰', '🍜']; };
    const season = () => (typeof S.seasonId === 'function' ? S.seasonId() : 'spring');
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    // ---- ルール(数字は ここだけで かえられる) ----
    const RULES = {
      LIVES: 3,          // しっぱいできる かいすう(3かい しっぱいで おわり)
      TOTAL: 20,         // 1ランで あそぶ ゲームの かず(ぜんぶ できたら 100てん)
      CUE_MS: 650,       // 指示の 文字が 大きく 出ている じかん(この あいだも そうさは うけつける)
      RESULT_MS: 520,    // ○/× を 見せる じかん
      FINAL_MS: 2200,    // さいごの けっかを 見せる じかん
      LEVEL_EVERY: 4,    // なんゲームごとに レベルが あがるか
      MAX_LEVEL: 6,
      TIME_SHRINK: 0.07, // レベルが 1 あがるごとに せいげん時間が へる わりあい
      SPEED_UP: 0.14,    // レベルが 1 あがるごとに うごきが はやくなる わりあい
      SCORE_PER_CLEAR: 5,
    };

    // ---- キャラ・ものの え(ぜんぶ 絵文字の fillText) ----
    function glyph(ctx, ch, x, y, size, alpha) {
      if (!ctx) return;
      ctx.save();
      if (alpha != null) ctx.globalAlpha = alpha;
      ctx.font = `${Math.round(size)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ch, x, y + size * 0.05);
      ctx.restore();
    }
    function bg(ctx, W, H, top, bottom) {
      if (!ctx) return;
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    function ring(ctx, x, y, r, color, w) {
      if (!ctx) return;
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    const hit = (x, y, ox, oy, r) => Math.hypot(x - ox, y - oy) <= r;

    // ---- ゲーム(1つ 3〜6びょう)。それぞれ:
    //  cue: 指示の 文字、say: こえ、dur: せいげん時間(ms、レベルで みじかくなる)
    //  survive: true なら 時間切れ = せいこう(よける・まもる 系)
    //  create(g) → { update(dt, t), draw(ctx), onTap(x,y), onDrag(x,y,dx,dy), onSwipe(dir), onPress(x,y), onRelease(x,y) }
    //  g: { W, H, level, speed, extra, feint, win(), lose(), t: keisoku }
    const GAMES = [];
    const def = (game) => { GAMES.push(game); return game; };

    // 1. たべろ! — ごはんを タップ。うんちや いしを おすと しっぱい
    def({ id: 'eat', cue: 'たべろ！', say: 'たべろ', dur: 3600, uses: ['tap'], motif: 'ごはん',
      create(g) {
        const W = g.W, H = g.H;
        const n = 2 + g.extra + (g.feint ? 1 : 0);
        const items = []; const food = pick(foods());
        const spots = shuffle([[0.2, 0.32], [0.5, 0.28], [0.8, 0.32], [0.3, 0.62], [0.7, 0.62], [0.5, 0.78]]).slice(0, n);
        spots.forEach(([nx, ny], i) => items.push({ x: nx * W, y: ny * H, ch: i === 0 ? food : pick(['💩', '🪨', '🧦']), good: i === 0, r: 34, vx: g.level >= 4 ? rnd(-40, 40) * g.speed : 0 }));
        let done = false;
        return {
          update(dt) { for (const it of items) { it.x = clamp(it.x + it.vx * dt, 40, W - 40); if (it.x <= 40 || it.x >= W - 40) it.vx = -it.vx; } },
          draw(ctx) { bg(ctx, W, H, '#fff6e5', '#ffe2c4'); glyph(ctx, sprite(), W / 2, H * 0.9, 44); for (const it of items) { ring(ctx, it.x, it.y, it.r + 4, 'rgba(255,255,255,.8)', 3); glyph(ctx, it.ch, it.x, it.y, 46); } },
          onTap(x, y) { if (done) return; for (const it of items) if (hit(x, y, it.x, it.y, it.r + 6)) { done = true; if (it.good) { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } return; } },
          target() { const it = items.find((i) => i.good); return { kind: 'tap', x: it.x, y: it.y }; },
        };
      } });

    // 2. よけろ! — おちてくる うんちを、なぞって よける(時間切れ = せいこう)
    def({ id: 'dodge', cue: 'よけろ！', say: 'よけろ', dur: 4200, uses: ['drag'], survive: true, motif: 'うんち',
      create(g) {
        const W = g.W, H = g.H;
        const me = { x: W / 2, y: H * 0.86, r: 22 };
        const rocks = []; let spawnAt = 0.15; let t = 0;
        const gap = lerp(0.62, 0.34, (g.level - 1) / (RULES.MAX_LEVEL - 1));
        return {
          update(dt, now) {
            t += dt;
            if (t >= spawnAt) { spawnAt = t + gap; const x = g.feint && Math.random() < 0.35 ? me.x + rnd(-18, 18) : rnd(30, W - 30); rocks.push({ x, y: -20, vy: (240 + 40 * g.extra) * g.speed, ch: pick(['💩', '💩', '🪨', '🥥']) }); }
            for (const r of rocks) r.y += r.vy * dt;
            for (const r of rocks) if (hit(r.x, r.y, me.x, me.y, me.r + 14)) { sfx('hit'); g.lose(); return; }
            while (rocks.length && rocks[0].y > H + 30) rocks.shift();
          },
          draw(ctx) { bg(ctx, W, H, '#dff1ff', '#f7fbff'); if (ctx) { ctx.fillStyle = '#9ad48a'; ctx.fillRect(0, H * 0.93, W, H * 0.07); } for (const r of rocks) glyph(ctx, r.ch, r.x, r.y, 34); glyph(ctx, sprite(), me.x, me.y, 44); },
          onDrag(x, y, dx) { me.x = clamp(me.x + dx * 1.3, 24, W - 24); },
          onPress(x) { me.x = clamp(x, 24, W - 24); },
          target() { const near = rocks.filter((r) => r.y > -40 && r.y < me.y + 10); let x = me.x; for (const r of near) if (Math.abs(r.x - x) < 46) x = r.x < W / 2 ? r.x + 70 : r.x - 70; return { kind: 'follow', x: clamp(x, 24, W - 24), y: me.y }; },
        };
      } });

    // 3. つかまえろ! — にげまわる なかまを タップ
    def({ id: 'catch', cue: 'つかまえろ！', say: 'つかまえろ', dur: 4000, uses: ['tap'], motif: 'なかま',
      create(g) {
        const W = g.W, H = g.H;
        const ch = pick(companions());
        const m = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 26, turnAt: 0 };
        const sp = (150 + 25 * g.extra) * g.speed; let t = 0;
        const decoys = g.feint ? [{ x: rnd(40, W - 40), y: rnd(60, H - 60), ch: pick(['🍂', '🪨', '🧸']) }] : [];
        return {
          update(dt) {
            t += dt;
            if (t >= m.turnAt) { const a = rnd(0, Math.PI * 2); m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp; m.turnAt = t + rnd(0.25, 0.6); }
            m.x += m.vx * dt; m.y += m.vy * dt;
            if (m.x < 34 || m.x > W - 34) { m.vx = -m.vx; m.x = clamp(m.x, 34, W - 34); }
            if (m.y < 34 || m.y > H - 34) { m.vy = -m.vy; m.y = clamp(m.y, 34, H - 34); }
          },
          draw(ctx) { bg(ctx, W, H, '#eaffdf', '#c9efb6'); for (const d of decoys) glyph(ctx, d.ch, d.x, d.y, 38); glyph(ctx, ch, m.x, m.y, 46); glyph(ctx, sprite(), 36, H - 36, 36); },
          onTap(x, y) { if (hit(x, y, m.x, m.y, m.r + 10)) { sfx('pop'); g.win(); } else { sfx('tap'); } },
          target() { return { kind: 'tap', x: m.x, y: m.y }; },
        };
      } });

    // 4. れんだ! — へんしんメーターを タップで ためる
    def({ id: 'mash', cue: 'れんだ！', say: 'れんだ', dur: 3400, uses: ['tap'], motif: 'へんしん',
      create(g) {
        const W = g.W, H = g.H;
        const need = 9 + 3 * g.extra + Math.round(2 * (g.level - 1));
        let taps = 0, glow = 0;
        return {
          update(dt) { glow = Math.max(0, glow - dt * 4); },
          draw(ctx) {
            bg(ctx, W, H, '#f1e5ff', '#e2ccff');
            if (ctx) { const bw = W * 0.7, bx = (W - bw) / 2, by = H * 0.2; ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(bx, by, bw, 18); ctx.fillStyle = '#c07bff'; ctx.fillRect(bx, by, bw * clamp(taps / need, 0, 1), 18); ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${Math.min(taps, need)}/${need}`, W / 2, by + 9); }
            glyph(ctx, '✨', W / 2, H * 0.58, 30 + glow * 40, 0.35 + glow * 0.6);
            glyph(ctx, sprite(), W / 2, H * 0.58, 56 + glow * 10);
          },
          onTap() { taps++; glow = 1; sfx('tap'); if (taps >= need) { sfx('levelup'); g.win(); } },
          target() { return { kind: 'tap', x: W / 2, y: H * 0.58, repeat: true }; },
        };
      } });

    // 5. そうじしろ! — うんちの うえを なぞって ふきとる
    def({ id: 'clean', cue: 'そうじしろ！', say: 'そうじしろ', dur: 4200, uses: ['drag'], motif: 'おせわ',
      create(g) {
        const W = g.W, H = g.H;
        const n = Math.min(4, 2 + g.extra + (g.level >= 3 ? 1 : 0));
        const poops = shuffle([[0.25, 0.3], [0.7, 0.28], [0.5, 0.55], [0.22, 0.72], [0.75, 0.74]]).slice(0, n).map(([nx, ny]) => ({ x: nx * W, y: ny * H, hp: 2, gone: false }));
        const trail = [];
        return {
          update(dt) { for (const p of trail) p.life -= dt; while (trail.length && trail[0].life <= 0) trail.shift(); },
          draw(ctx) { bg(ctx, W, H, '#fff3d6', '#f3dcae'); for (const p of trail) glyph(ctx, '✨', p.x, p.y, 16, clamp(p.life * 2, 0, 1)); for (const p of poops) if (!p.gone) glyph(ctx, '💩', p.x, p.y, 42, p.hp >= 2 ? 1 : 0.55); glyph(ctx, sprite(), W - 36, H - 36, 36); },
          onDrag(x, y) {
            trail.push({ x, y, life: 0.4 });
            for (const p of poops) if (!p.gone && hit(x, y, p.x, p.y, 30)) { if (!p.touching) { p.touching = true; p.hp--; sfx('whoosh'); if (p.hp <= 0) { p.gone = true; sfx('pop'); } } } else p.touching = false;
            if (poops.every((p) => p.gone)) g.win();
          },
          onRelease() { for (const p of poops) p.touching = false; },
          target() { const p = poops.find((q) => !q.gone); return p ? { kind: 'drag', x: p.x - 34, y: p.y, to: { x: p.x + 34, y: p.y } } : null; },
        };
      } });


    // 6. とめろ! — うごく しるしが みどりの まんなかに きたら タップ(たこやきの やきかげん)
    def({ id: 'stop', cue: 'とめろ！', say: 'とめろ', dur: 3800, uses: ['tap'], motif: 'たこやき',
      create(g) {
        const W = g.W, H = g.H;
        const half = lerp(0.11, 0.06, (g.level - 1) / (RULES.MAX_LEVEL - 1));
        let p = 0, dir = 1; const sp = (0.9 + 0.15 * g.extra) * g.speed; let done = false;
        const inZone = () => Math.abs(p - 0.5) <= half;
        return {
          update(dt) { if (done) return; p += dir * sp * dt; if (p >= 1) { p = 1; dir = -1; } if (p <= 0) { p = 0; dir = 1; } },
          draw(ctx) {
            bg(ctx, W, H, '#fff1dc', '#f7d9b0');
            if (ctx) { const bx = W * 0.12, bw = W * 0.76, by = H * 0.3; ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(bx, by, bw, 22); ctx.fillStyle = '#6fd37a'; ctx.fillRect(bx + bw * (0.5 - half), by, bw * half * 2, 22); ctx.fillStyle = '#ff5a5a'; ctx.fillRect(bx + bw * p - 3, by - 6, 6, 34); }
            glyph(ctx, '🐙', W / 2, H * 0.62, 54, inZone() ? 1 : 0.55); glyph(ctx, sprite(), W * 0.8, H * 0.85, 40);
          },
          onTap() { if (done) return; done = true; if (inZone()) { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } },
          target() { return { kind: 'tap', x: W / 2, y: H / 2, ready: inZone() }; },
        };
      } });

    // 7. うえへ!/みぎへ!… — いわれた むきへ スワイプ。レベル 3 からは「ぎゃくへ!」(やじるしの はんたい)
    def({ id: 'swipe', cue: 'スワイプ！', say: 'スワイプ', dur: 3200, uses: ['swipe'], motif: 'スキージャンプ',
      create(g) {
        const W = g.W, H = g.H;
        const DIRS = { up: ['うえへ！', 'うえへ', '⬆️'], down: ['したへ！', 'したへ', '⬇️'], left: ['ひだりへ！', 'ひだりへ', '⬅️'], right: ['みぎへ！', 'みぎへ', '➡️'] };
        const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
        const shown = pick(Object.keys(DIRS));
        const feint = g.feint && Math.random() < 0.45;
        const want = feint ? OPP[shown] : shown;
        let done = false;
        return {
          cue: feint ? 'ぎゃくへ！' : DIRS[shown][0], say: feint ? 'ぎゃくへ' : DIRS[shown][1],
          draw(ctx) { bg(ctx, W, H, feint ? '#ffe3e3' : '#e3f0ff', '#ffffff'); glyph(ctx, DIRS[shown][2], W / 2, H * 0.42, 96); glyph(ctx, sprite(), W / 2, H * 0.8, 46); },
          onSwipe(dir) { if (done) return; done = true; if (dir === want) { sfx('whoosh'); g.win(); } else { sfx('bad'); g.lose(); } },
          target() { return { kind: 'swipe', dir: want }; },
        };
      } });

    // 8. くすり! — 💊 を びょうきの キャラまで ドラッグ
    def({ id: 'medicine', cue: 'くすりをのませろ！', say: 'くすり', dur: 4200, uses: ['drag'], motif: '病気',
      create(g) {
        const W = g.W, H = g.H;
        const pet = { x: W / 2, y: H * 0.3, vx: g.level >= 3 ? 60 * g.speed : 0 };
        const pill = { x: W * 0.5, y: H * 0.82, held: false };
        let done = false;
        return {
          update(dt) { pet.x += pet.vx * dt; if (pet.x < 50 || pet.x > W - 50) pet.vx = -pet.vx; },
          draw(ctx) { bg(ctx, W, H, '#eef3ff', '#dbe4f7'); glyph(ctx, sprite(), pet.x, pet.y, 52); glyph(ctx, '🤒', pet.x + 24, pet.y - 22, 22); ring(ctx, pet.x, pet.y, 44, 'rgba(120,150,255,.6)', 3); glyph(ctx, '💊', pill.x, pill.y, pill.held ? 48 : 42); },
          onPress(x, y) { if (hit(x, y, pill.x, pill.y, 44)) pill.held = true; },
          onDrag(x, y) { if (pill.held) { pill.x = x; pill.y = y; if (!done && hit(x, y, pet.x, pet.y, 46)) { done = true; sfx('good'); g.win(); } } },
          onRelease() { pill.held = false; },
          target() { return { kind: 'drag', x: pill.x, y: pill.y, to: { x: pet.x, y: pet.y } }; },
        };
      } });

    // 9. さがせ! — にたものの なかから じぶんを タップ
    def({ id: 'find', cue: 'さがせ！', say: 'さがせ', dur: 4000, uses: ['tap'], motif: 'ずかん',
      create(g) {
        const W = g.W, H = g.H;
        const me = sprite();
        const pool = ['🐣', '🐥', '🐤', '🐔', '🐧', '🦆', '🐸', '🐢', '🐹', '🐰', '🐻', '🐼', '🦊', '🐱', '🐶', '🐷'].filter((e) => e !== me);
        const cols = 3, rows = 2 + Math.min(2, g.extra + (g.level >= 3 ? 1 : 0));
        const cells = []; const meIdx = Math.floor(Math.random() * cols * rows);
        for (let i = 0; i < cols * rows; i++) cells.push({ x: W * (0.2 + 0.3 * (i % cols)), y: H * (0.18 + 0.66 * (Math.floor(i / cols) / Math.max(1, rows - 1)) + (rows === 2 ? 0.08 : 0)), ch: i === meIdx ? me : pick(pool), me: i === meIdx, wob: Math.random() * 6 });
        let done = false;
        return {
          update(dt) { for (const c of cells) c.wob += dt * 3; },
          draw(ctx) { bg(ctx, W, H, '#fdf6ff', '#eadcff'); for (const c of cells) glyph(ctx, c.ch, c.x, c.y + Math.sin(c.wob) * 3, 44); },
          onTap(x, y) { if (done) return; for (const c of cells) if (hit(x, y, c.x, c.y, 36)) { done = true; if (c.me) { sfx('pop'); g.win(); } else { sfx('bad'); g.lose(); } return; } },
          target() { const c = cells.find((k) => k.me); return { kind: 'tap', x: c.x, y: c.y }; },
        };
      } });

    // 10. ためろ! — おしっぱなしで ちからを ため、みどりで はなす(ジャンプの ちから)
    def({ id: 'charge', cue: 'ためて…はなせ！', say: 'ためて、はなせ', dur: 4200, uses: ['hold'], motif: 'ジャンプクエスト',
      create(g) {
        const W = g.W, H = g.H;
        const lo = 0.62, hi = lerp(0.9, 0.78, (g.level - 1) / (RULES.MAX_LEVEL - 1));
        let fill = 0, holding = false, done = false, jumpY = 0;
        const rate = (0.55 + 0.1 * g.extra) * g.speed;
        return {
          update(dt) { if (holding && !done) { fill += rate * dt; if (fill >= 1) { done = true; sfx('bad'); g.lose(); } } if (done && jumpY < 60) jumpY += dt * 240; },
          draw(ctx) {
            bg(ctx, W, H, '#e8fff1', '#c8f2d8');
            if (ctx) { const bx = W * 0.15, bw = W * 0.7, by = H * 0.22; ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(bx, by, bw, 20); ctx.fillStyle = '#6fd37a'; ctx.fillRect(bx + bw * lo, by, bw * (hi - lo), 20); ctx.fillStyle = '#ffb347'; ctx.fillRect(bx, by + 4, bw * clamp(fill, 0, 1), 12); }
            glyph(ctx, sprite(), W / 2, H * 0.72 - jumpY, 52 + fill * 10); glyph(ctx, holding ? '💪' : '👆', W / 2 + 40, H * 0.72 - 30, 24);
          },
          onPress() { if (!done) holding = true; },
          onRelease() { if (done || !holding) return; holding = false; done = true; if (fill >= lo && fill <= hi) { sfx('jump'); g.win(); } else { sfx('bad'); g.lose(); } },
          target() { return { kind: 'hold', x: W / 2, y: H / 2, release: fill >= (lo + hi) / 2 }; },
        };
      } });

    // 11. こいびとは?/なかまは? — 3にんの なかから こいびと(いなければ なかま)を タップ
    def({ id: 'partner', cue: 'こいびとは？', say: 'こいびとは', dur: 3600, uses: ['tap'], motif: 'こいびと・なかま',
      create(g) {
        const W = g.W, H = g.H;
        const pe = partner(); const comps = companions();
        const answer = pe || pick(comps);
        const decoyPool = ['🐻', '🦊', '🐱', '🐶', '🐰', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸'].filter((e) => e !== answer);
        const n = 3 + (g.level >= 4 ? 1 : 0);
        const faces = shuffle([answer, ...shuffle(decoyPool).slice(0, n - 1)]).map((ch, i) => ({ ch, x: W * ((i + 0.5) / n), y: H * 0.45, ans: ch === answer }));
        let done = false;
        return {
          cue: pe ? 'こいびとは？' : 'なかまは？', say: pe ? 'こいびとは' : 'なかまは',
          draw(ctx) { bg(ctx, W, H, '#ffeaf3', '#ffd6e6'); for (const f of faces) { ring(ctx, f.x, f.y, 34, 'rgba(255,255,255,.9)', 3); glyph(ctx, f.ch, f.x, f.y, 44); } glyph(ctx, sprite(), W / 2, H * 0.82, 44); glyph(ctx, pe ? '💕' : '🤝', W / 2 + 30, H * 0.82 - 28, 22); },
          onTap(x, y) { if (done) return; for (const f of faces) if (hit(x, y, f.x, f.y, 40)) { done = true; if (f.ans) { sfx('love'); g.win(); } else { sfx('bad'); g.lose(); } return; } },
          target() { const f = faces.find((k) => k.ans); return { kind: 'tap', x: f.x, y: f.y }; },
        };
      } });

    // 12. はるは?/なつは?… — その きせつの ものを タップ
    def({ id: 'season', cue: 'きせつは？', say: 'きせつ', dur: 3600, uses: ['tap'], motif: '世界・季節',
      create(g) {
        const W = g.W, H = g.H;
        const SEASONS = { spring: ['はるは？', 'はるは', '🌸'], summer: ['なつは？', 'なつは', '🌻'], autumn: ['あきは？', 'あきは', '🍁'], winter: ['ふゆは？', 'ふゆは', '⛄'] };
        const keys = Object.keys(SEASONS);
        const cur = SEASONS[season()] ? season() : pick(keys);
        const want = Math.random() < 0.6 ? cur : pick(keys);
        const items = shuffle(keys).map((k, i) => ({ k, ch: SEASONS[k][2], x: W * (0.2 + 0.6 * (i % 2)), y: H * (0.3 + 0.36 * Math.floor(i / 2)) }));
        let done = false;
        return {
          cue: SEASONS[want][0], say: SEASONS[want][1],
          draw(ctx) { bg(ctx, W, H, '#f2fbff', '#dcefff'); for (const it of items) { ring(ctx, it.x, it.y, 38, 'rgba(255,255,255,.9)', 3); glyph(ctx, it.ch, it.x, it.y, 46); } glyph(ctx, sprite(), W / 2, H * 0.9, 34); },
          onTap(x, y) { if (done) return; for (const it of items) if (hit(x, y, it.x, it.y, 44)) { done = true; if (it.k === want) { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } return; } },
          target() { const it = items.find((k) => k.k === want); return { kind: 'tap', x: it.x, y: it.y }; },
        };
      } });

    // 13. とべ! — ころがってくる いわを、タップで ジャンプして こえる(時間切れ = せいこう)
    def({ id: 'jump', cue: 'とべ！', say: 'とべ', dur: 3600, uses: ['tap'], survive: true, motif: 'ジャンプ',
      create(g) {
        const W = g.W, H = g.H;
        const ground = H * 0.8; const me = { x: W * 0.28, y: ground, vy: 0, air: false };
        const rocks = []; let t = 0; const n = 1 + Math.min(2, g.extra + (g.level >= 3 ? 1 : 0));
        const times = []; for (let i = 0; i < n; i++) times.push(0.9 + i * 1.1 + rnd(-0.1, 0.1));
        const sp = (220 + 30 * g.extra) * g.speed;
        return {
          update(dt) {
            t += dt;
            while (times.length && t >= times[0]) { times.shift(); rocks.push({ x: W + 30, y: ground + 4 }); }
            for (const r of rocks) r.x -= sp * dt;
            if (me.air) { me.vy += 1400 * dt; me.y += me.vy * dt; if (me.y >= ground) { me.y = ground; me.air = false; me.vy = 0; } }
            for (const r of rocks) if (hit(r.x, r.y, me.x, me.y, 30)) { sfx('hit'); g.lose(); return; }
            while (rocks.length && rocks[0].x < -40) rocks.shift();
          },
          draw(ctx) { bg(ctx, W, H, '#e0f7ff', '#ffffff'); if (ctx) { ctx.fillStyle = '#9ad48a'; ctx.fillRect(0, ground + 22, W, H - ground - 22); } for (const r of rocks) glyph(ctx, '🪨', r.x, r.y, 40); glyph(ctx, sprite(), me.x, me.y, 46); },
          onTap() { if (!me.air) { me.air = true; me.vy = -520; sfx('jump'); } },
          target() { const near = rocks.some((r) => r.x - me.x > 20 && r.x - me.x < 110); return { kind: 'tap', x: W / 2, y: H / 2, ready: near && !me.air }; },
        };
      } });

    // 14. ひっぱれ! — したへ なぞって ひっこぬく
    def({ id: 'pull', cue: 'ひっぱれ！', say: 'ひっぱれ', dur: 3800, uses: ['drag'], motif: 'しゅうかく',
      create(g) {
        const W = g.W, H = g.H;
        const need = 240 + 60 * g.extra + 40 * (g.level - 1);
        let pulled = 0, done = false;
        return {
          draw(ctx) { bg(ctx, W, H, '#f4ffe8', '#d7f0c2'); if (ctx) { ctx.fillStyle = '#b07a4a'; ctx.fillRect(0, H * 0.55, W, H * 0.45); } const k = clamp(pulled / need, 0, 1); glyph(ctx, '🥕', W / 2, H * 0.6 - k * H * 0.25, 60); glyph(ctx, sprite(), W / 2 + 60, H * 0.42 - k * 20, 44); if (ctx) { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(W * 0.2, H * 0.12, W * 0.6, 14); ctx.fillStyle = '#ff9f43'; ctx.fillRect(W * 0.2, H * 0.12, W * 0.6 * k, 14); } },
          onDrag(x, y, dx, dy) { if (done) return; if (dy > 0) pulled += dy; if (pulled >= need) { done = true; sfx('pop'); g.win(); } },
          target() { return { kind: 'drag', x: W / 2, y: H * 0.25, to: { x: W / 2, y: H * 0.95 }, repeat: true }; },
        };
      } });

    // 15. なでろ! — キャラの うえを いったりきたり なぞる
    def({ id: 'pet', cue: 'なでろ！', say: 'なでろ', dur: 3800, uses: ['drag'], motif: 'おせわ',
      create(g) {
        const W = g.W, H = g.H;
        const me = { x: W / 2, y: H * 0.55 };
        const need = 4 + g.extra + (g.level >= 3 ? 1 : 0);
        let strokes = 0, lastDir = 0, over = false, done = false; const hearts = [];
        return {
          update(dt) { for (const h of hearts) { h.y -= 40 * dt; h.life -= dt; } while (hearts.length && hearts[0].life <= 0) hearts.shift(); },
          draw(ctx) { bg(ctx, W, H, '#fff0f5', '#ffe0ea'); glyph(ctx, sprite(), me.x, me.y, 64); glyph(ctx, '🖐️', me.x + 50, me.y - 40, 26, 0.8); for (const h of hearts) glyph(ctx, '💗', h.x, h.y, 22, clamp(h.life, 0, 1)); if (ctx) { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(W * 0.2, H * 0.12, W * 0.6, 14); ctx.fillStyle = '#ff7eb6'; ctx.fillRect(W * 0.2, H * 0.12, W * 0.6 * clamp(strokes / need, 0, 1), 14); } },
          onDrag(x, y, dx) { if (done) return; const on = hit(x, y, me.x, me.y, 60); if (on && Math.abs(dx) > 0.5) { const d = Math.sign(dx); if (d !== lastDir) { lastDir = d; strokes++; hearts.push({ x: x, y: y - 20, life: 0.8 }); sfx('tap'); if (strokes >= need) { done = true; sfx('love'); g.win(); } } } over = on; },
          // ゆびを はなして また なぞれば、おなじ むきでも 1かいに かぞえる
          onRelease() { lastDir = 0; },
          target() { return { kind: 'drag', x: me.x - 55, y: me.y, to: { x: me.x + 55, y: me.y }, repeat: true }; },
        };
      } });

    // ---- ランナー(1ラン = RULES.TOTAL ゲーム or ライフ 0 まで) ----
    function makeQuickRun() {
      return {
        id: 'quick-run', noIntro: true,
        start(container, onComplete) {
          let running = true, rafId = null, last = null;
          let lives = RULES.LIVES, cleared = 0, index = 0, combo = 0, maxCombo = 0, level = 1;
          let phase = 'idle', phaseUntil = 0, cur = null, game = null, def = null, limit = 0, startedAt = 0, pending = null;
          const recent = []; const plays = {}; const clears = {};
          container.innerHTML = `
            <div class="mg-header qk-header"><span id="qkLives">${'❤️'.repeat(lives)}</span><span id="qkCount">✔ 0／${RULES.TOTAL}</span><span id="qkLevel">Lv1</span></div>
            <div class="qk-timebar"><span class="qk-timefill" id="qkTime"></span></div>
            <div class="mg-canvas-wrap qk-wrap"><canvas class="mg-canvas" id="qkCanvas"></canvas><div class="qk-cue hidden" id="qkCue"></div><div class="qk-flash hidden" id="qkFlash"></div><div class="qk-final hidden" id="qkFinal"></div></div>
            <div class="mg-hint qk-hint" id="qkHint">みじかい指示のとおりに、すぐそうさ!3回しっぱいでおわり</div>
          `;
          const canvas = container.querySelector('#qkCanvas');
          const { ctx, W, H } = S.createMgCanvas(canvas, 300, { grow: true, maxGrow: 1.7 });
          const livesEl = container.querySelector('#qkLives'), countEl = container.querySelector('#qkCount'), levelEl = container.querySelector('#qkLevel');
          const timeEl = container.querySelector('#qkTime'), cueEl = container.querySelector('#qkCue'), flashEl = container.querySelector('#qkFlash'), finalEl = container.querySelector('#qkFinal'), hintEl = container.querySelector('#qkHint');
          const hud = () => { livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(RULES.LIVES - Math.max(0, lives)); countEl.textContent = `✔ ${cleared}／${RULES.TOTAL}`; levelEl.textContent = `Lv${level}`; };
          const show = (el, html) => { if (!el) return; if (html != null) el.innerHTML = html; el.classList.remove('hidden'); };
          const hide = (el) => { if (el) el.classList.add('hidden'); };

          function pickNext() {
            const pool = GAMES.filter((g) => !recent.includes(g.id));
            const g = pick(pool.length ? pool : GAMES);
            recent.push(g.id); if (recent.length > Math.min(3, GAMES.length - 1)) recent.shift();
            return g;
          }
          function beginGame() {
            def = pickNext();
            level = Math.min(RULES.MAX_LEVEL, 1 + Math.floor(index / RULES.LEVEL_EVERY));
            const k = level - 1;
            limit = Math.round(def.dur * Math.max(0.6, 1 - RULES.TIME_SHRINK * k));
            pending = null;
            cur = { W, H, level, speed: 1 + RULES.SPEED_UP * k, extra: Math.floor(k / 2), feint: level >= 3, win: () => judge(true), lose: () => judge(false) };
            game = def.create(cur);
            run.current = { game, def, cue: game.cue || def.cue, level, limit, startedAt: performance.now() };
            plays[def.id] = (plays[def.id] || 0) + 1;
            startedAt = performance.now();
            phase = 'play'; phaseUntil = startedAt + RULES.CUE_MS;
            hud();
            show(cueEl, escapeHtml(game.cue || def.cue));
            cueEl.classList.remove('pop'); void (cueEl.offsetWidth); cueEl.classList.add('pop');
            hintEl.textContent = (game.cue || def.cue) + '（' + def.motif + '）';
            sfx('notify');
            voice(game.say || def.say);
          }
          function judge(ok) {
            if (phase !== 'play' || pending != null) return;
            pending = ok;
            index++;
            if (ok) { cleared++; combo++; maxCombo = Math.max(maxCombo, combo); clears[def.id] = (clears[def.id] || 0) + 1; sfx('good'); }
            else { lives--; combo = 0; sfx('bad'); }
            hud();
            hide(cueEl);
            show(flashEl, ok ? '<span class="qk-ok">○</span><small>できた!</small>' : '<span class="qk-ng">✕</span><small>しっぱい…</small>');
            flashEl.classList.toggle('ng', !ok); flashEl.classList.toggle('ok', ok);
            phase = 'result'; phaseUntil = performance.now() + RULES.RESULT_MS;
          }
          function finishRun() {
            phase = 'final'; running = false; if (rafId) cancelAnimationFrame(rafId);
            hide(cueEl); hide(flashEl);
            const score = clamp(cleared * RULES.SCORE_PER_CLEAR, 0, 100);
            const stats = { cleared, total: RULES.TOTAL, maxCombo, level, lives, plays, clears, score };
            if (typeof S.onRunEnd === 'function') S.onRunEnd(stats);
            const perfect = cleared >= RULES.TOTAL;
            show(finalEl, `<div class="qk-final-title">${perfect ? '👑パーフェクト!' : lives <= 0 ? '💦ここまで!' : '🏁おしまい!'}</div><div class="qk-final-big">✔ ${cleared}<small>／${RULES.TOTAL}</small></div><div class="qk-final-sub">さいだい${maxCombo}れんぞく／Lv${level}まで</div>`);
            sfx(perfect ? 'fanfare' : cleared >= 10 ? 'clear' : 'fail');
            setTimeout(() => onComplete(score, `⚡クイック ${cleared}こクリア（さいだい${maxCombo}れんぞく）`), RULES.FINAL_MS);
          }
          // ---- そうさ(タップ・なぞる・スワイプ・おす/はなす を ここで 1かい だけ 判定) ----
          let ptr = null;
          const run = { current: null }; if (typeof S.debugHook === 'function') S.debugHook(run);
          if (this && typeof this === 'object') this._run = run; // テスト/けんしょう よう
          const pos = (e) => { const r = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: W, height: H }; const sx = W / (r.width || W), sy = H / (r.height || H); return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy }; };
          const active = () => phase === 'play' && pending == null && game;
          // タップだけの ゲームは おした しゅんかんに はんのう する(はなすのを またない)。
          // なぞる/スワイプも つかう ゲームは、はなした ときに「うごかしていなければ タップ」
          const tapOnDown = () => game.onTap && !game.onDrag && !game.onSwipe;
          canvas.addEventListener('pointerdown', (e) => {
            if (e.preventDefault) e.preventDefault();
            if (!active()) return;
            const p = pos(e); ptr = { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, t0: performance.now(), moved: 0, swiped: false, tapped: false };
            try { if (canvas.setPointerCapture && e.pointerId != null) canvas.setPointerCapture(e.pointerId); } catch (err) {}
            if (game.onPress) game.onPress(p.x, p.y);
            if (tapOnDown()) { ptr.tapped = true; game.onTap(p.x, p.y); }
          });
          canvas.addEventListener('pointermove', (e) => {
            if (!ptr || e.pointerId !== ptr.id) return;
            if (e.preventDefault) e.preventDefault();
            const p = pos(e); const dx = p.x - ptr.x, dy = p.y - ptr.y; ptr.x = p.x; ptr.y = p.y; ptr.moved += Math.hypot(dx, dy);
            if (!active()) return;
            if (game.onDrag) game.onDrag(p.x, p.y, dx, dy);
            if (game.onSwipe && !ptr.swiped) { const fx = p.x - ptr.sx, fy = p.y - ptr.sy; if (Math.hypot(fx, fy) >= 28) { ptr.swiped = true; game.onSwipe(Math.abs(fx) >= Math.abs(fy) ? (fx > 0 ? 'right' : 'left') : (fy > 0 ? 'down' : 'up')); } }
          });
          const up = (e) => {
            if (!ptr || (e && e.pointerId != null && e.pointerId !== ptr.id)) return;
            const p = ptr; ptr = null;
            if (!active()) return;
            if (game.onRelease) game.onRelease(p.x, p.y);
            if (game.onTap && !p.tapped && p.moved < 14 && performance.now() - p.t0 < 350) game.onTap(p.x, p.y);
          };
          canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

          function frame(now) {
            if (!running) return;
            if (last === null) last = now; const dt = Math.min(0.05, (now - last) / 1000); last = now;
            if (phase === 'idle') { beginGame(); }
            else if (phase === 'play') {
              if (now >= phaseUntil && !cueEl.classList.contains('hidden')) hide(cueEl);
              const el = now - startedAt;
              if (timeEl) timeEl.style.width = `${clamp(100 - el / limit * 100, 0, 100)}%`;
              if (game.update) game.update(dt, now);
              if (pending == null && el >= limit) judge(!!def.survive);
            } else if (phase === 'result') {
              if (now >= phaseUntil) {
                hide(flashEl);
                if (lives <= 0 || index >= RULES.TOTAL) { finishRun(); return; }
                beginGame();
              }
            }
            if (game && game.draw) game.draw(ctx);
            rafId = requestAnimationFrame(frame);
          }
          hud();
          hide(flashEl); hide(finalEl); hide(cueEl);
          rafId = requestAnimationFrame(frame);
        },
      };
    }
    return { QUICK_GAMES: GAMES, QUICK_RULES: RULES, makeQuickRun };
  };
})();
