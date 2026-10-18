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
      CUE_MS: 600,       // 指示の 文字が 大きく 出ている じかん(この あいだも そうさは うけつける)
      RESULT_MS: 520,    // ○/× を 見せる じかん
      FINAL_MS: 2200,    // さいごの けっかを 見せる じかん
      LEVEL_EVERY: 4,    // なんゲームごとに レベルが あがるか
      MAX_LEVEL: 6,
      TIME_SHRINK: 0.07, // レベルが 1 あがるごとに せいげん時間が へる わりあい
      SPEED_UP: 0.14,    // レベルが 1 あがるごとに うごきが はやくなる わりあい
      SCORE_PER_CLEAR: 5,
      SOLO_TOTAL: 10,        // 「1本ずつ」は 10かい(1つ 10てん)
      SOLO_LEVEL_EVERY: 2,   // 「1本ずつ」は 2かいごとに レベルが あがる
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
        const sp = (125 + 20 * g.extra) * g.speed; let t = 0;
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
          onTap(x, y) { if (hit(x, y, m.x, m.y, m.r + 16)) { sfx('pop'); g.win(); } else { sfx('tap'); } },
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
          // うんちの うえを なぞった きょり(px)で けす(その場で こすっても、おうふくしても OK)
          onDrag(x, y, dx, dy) {
            trail.push({ x, y, life: 0.4 });
            const d = Math.hypot(dx, dy);
            for (const p of poops) if (!p.gone && hit(x, y, p.x, p.y, 36)) { p.hp -= d / 45; if (!p.rubbed) { p.rubbed = true; sfx('whoosh'); } if (p.hp <= 0) { p.gone = true; sfx('pop'); } }
            if (poops.every((p) => p.gone)) g.win();
          },
          target() { const p = poops.find((q) => !q.gone); return p ? { kind: 'drag', x: p.x - 34, y: p.y, to: { x: p.x + 34, y: p.y }, repeat: true } : null; },
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
          // どこを おしても 💊が ゆびに つく(ちいさな 💊を ねらわなくて いい)
          onPress(x, y) { pill.held = true; pill.x = x; pill.y = y; },
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
        let rubbed = 0, done = false; const hearts = []; const needPx = need * 55;
        return {
          update(dt) { for (const h of hearts) { h.y -= 40 * dt; h.life -= dt; } while (hearts.length && hearts[0].life <= 0) hearts.shift(); },
          draw(ctx) { bg(ctx, W, H, '#fff0f5', '#ffe0ea'); glyph(ctx, sprite(), me.x, me.y, 64); glyph(ctx, '🖐️', me.x + 50, me.y - 40, 26, 0.8); for (const h of hearts) glyph(ctx, '💗', h.x, h.y, 22, clamp(h.life, 0, 1)); if (ctx) { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(W * 0.2, H * 0.12, W * 0.6, 14); ctx.fillStyle = '#ff7eb6'; ctx.fillRect(W * 0.2, H * 0.12, W * 0.6 * clamp(rubbed / needPx, 0, 1), 14); } },
          // キャラの うえを なぞった きょり(px)で すすむ。むきは とわない
          onDrag(x, y, dx, dy) { if (done) return; if (!hit(x, y, me.x, me.y, 66)) return; const before = Math.floor(rubbed / 55); rubbed += Math.hypot(dx, dy); if (Math.floor(rubbed / 55) > before) { hearts.push({ x, y: y - 20, life: 0.8 }); sfx('tap'); } if (rubbed >= needPx) { done = true; sfx('love'); g.win(); } },
          target() { return { kind: 'drag', x: me.x - 55, y: me.y, to: { x: me.x + 55, y: me.y }, repeat: true }; },
        };
      } });

    // 16. おせ! — ボタンが みどりに なったら おす(あかで おすと ×)
    def({ id: 'button', cue: 'みどりでおせ！', say: 'みどりでおせ', dur: 3800, uses: ['tap'], motif: 'ボタン',
      create(g) {
        const W = g.W, H = g.H;
        const goAt = rnd(0.8, 2.0) / g.speed; let t = 0, done = false, flick = 0;
        const flickers = g.feint ? [goAt - rnd(0.35, 0.6)] : [];
        const state = () => (t >= goAt ? 'go' : flickers.some((f) => t >= f && t < f + 0.12) ? 'fake' : 'wait');
        return {
          update(dt) { t += dt; },
          draw(ctx) { const s = state(); bg(ctx, W, H, '#f3f3f3', '#dcdcdc'); if (ctx) { ctx.fillStyle = s === 'go' ? '#3ec96b' : s === 'fake' ? '#ffd23f' : '#e5484d'; ctx.beginPath(); ctx.arc(W / 2, H * 0.48, 78, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s === 'go' ? 'GO!' : 'まて', W / 2, H * 0.48); } glyph(ctx, sprite(), W / 2, H * 0.86, 40); },
          onTap() { if (done) return; done = true; if (state() === 'go') { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } },
          target() { return { kind: 'tap', x: W / 2, y: H * 0.48, ready: state() === 'go' }; },
        };
      } });

    // 17. けせ! — ろうそくの ひを ぜんぶ タップ
    def({ id: 'flames', cue: 'けせ！', say: 'けせ', dur: 3800, uses: ['tap'], motif: 'たんじょうび',
      create(g) {
        const W = g.W, H = g.H;
        const n = 3 + Math.min(2, g.extra + (g.level >= 3 ? 1 : 0));
        const cands = []; for (let i = 0; i < n; i++) cands.push({ x: W * ((i + 0.5) / n), y: H * (0.42 + (i % 2) * 0.08), lit: true, relit: g.feint && i === 0 ? rnd(1.2, 1.8) : 0 });
        let t = 0;
        return {
          update(dt) { t += dt; for (const c of cands) if (c.relit && !c.lit && t >= c.relit) { c.lit = true; c.relit = 0; sfx('notify'); } },
          draw(ctx) { bg(ctx, W, H, '#fff0f5', '#ffe0ea'); glyph(ctx, '🎂', W / 2, H * 0.72, 96); for (const c of cands) { glyph(ctx, '🕯️', c.x, c.y + 18, 30); if (c.lit) glyph(ctx, '🔥', c.x, c.y - 14, 30); } glyph(ctx, sprite(), W * 0.85, H * 0.9, 36); },
          onTap(x, y) { for (const c of cands) if (c.lit && hit(x, y, c.x, c.y - 14, 30)) { c.lit = false; sfx('whoosh'); } if (cands.every((c) => !c.lit && !c.relit)) { sfx('good'); g.win(); } },
          target() { const c = cands.find((k) => k.lit); return c ? { kind: 'tap', x: c.x, y: c.y - 14, repeat: true } : { kind: 'tap', x: W / 2, y: H / 2, ready: false }; },
        };
      } });

    // 18. あつめろ! — かごを うごかして コインを うけとめる(need こ)
    def({ id: 'coins', cue: 'あつめろ！', say: 'あつめろ', dur: 4200, uses: ['drag'], motif: 'コイン',
      create(g) {
        const W = g.W, H = g.H;
        const need = 3; const basket = { x: W / 2, y: H * 0.84, w: 70 };
        const coins = []; let t = 0, spawnAt = 0.2, got = 0, spawned = 0;
        const gap = lerp(0.55, 0.36, (g.level - 1) / (RULES.MAX_LEVEL - 1));
        return {
          update(dt) {
            t += dt;
            // いい コインは need+3 こ かならず おちてくる。💩は それに まぜて おとす(レベル 3 から)
            if (t >= spawnAt && spawned < need + 3) { spawnAt = t + gap; const bad = g.feint && spawned >= 2 && Math.random() < 0.3; if (!bad) spawned++; coins.push({ x: rnd(36, W - 36), y: -16, vy: (220 + 30 * g.extra) * g.speed, bad }); }
            for (const c of coins) c.y += c.vy * dt;
            for (const c of coins) if (!c.done && Math.abs(c.x - basket.x) < basket.w / 2 + 10 && Math.abs(c.y - basket.y) < 18) { c.done = true; if (c.bad) { sfx('bad'); g.lose(); return; } got++; sfx('coin'); if (got >= need) { g.win(); return; } }
            while (coins.length && coins[0].y > H + 30) coins.shift();
          },
          draw(ctx) { bg(ctx, W, H, '#fff9dd', '#ffeeb0'); if (ctx) { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(W * 0.2, H * 0.1, W * 0.6, 12); ctx.fillStyle = '#ffb703'; ctx.fillRect(W * 0.2, H * 0.1, W * 0.6 * clamp(got / need, 0, 1), 12); } for (const c of coins) if (!c.done) glyph(ctx, c.bad ? '💩' : '🪙', c.x, c.y, 30); glyph(ctx, '🧺', basket.x, basket.y + 8, 52); glyph(ctx, sprite(), basket.x, basket.y - 34, 34); },
          onPress(x) { basket.x = clamp(x, 30, W - 30); },
          onDrag(x, y, dx) { basket.x = clamp(basket.x + dx * 1.3, 30, W - 30); },
          target() { const c = coins.filter((k) => !k.done && !k.bad && k.y < basket.y).sort((a, b) => b.y - a.y)[0]; let x = c ? c.x : basket.x; for (const b of coins) if (b.bad && !b.done && b.y > basket.y - 140 && b.y < basket.y + 18 && Math.abs(b.x - x) < 50) x = b.x < W / 2 ? b.x + 70 : b.x - 70; return { kind: 'follow', x: clamp(x, 30, W - 30), y: basket.y }; },
        };
      } });

    // 19. とまれ! — がけの てまえ(みどり)で タップして とまる
    def({ id: 'cliff', cue: 'とまれ！', say: 'とまれ', dur: 3600, uses: ['tap'], motif: 'ダウンヒル',
      create(g) {
        const W = g.W, H = g.H;
        const edge = W * 0.78, zone = lerp(70, 44, (g.level - 1) / (RULES.MAX_LEVEL - 1));
        const me = { x: 30, v: (150 + 30 * g.extra) * g.speed }; let done = false, fell = false;
        return {
          update(dt) { if (done) { if (fell) me.y = (me.y || 0) + 300 * dt; return; } me.x += me.v * dt; if (me.x >= edge) { done = true; fell = true; sfx('bad'); g.lose(); } },
          draw(ctx) { bg(ctx, W, H, '#e6f7ff', '#ffffff'); if (ctx) { ctx.fillStyle = '#9ad48a'; ctx.fillRect(0, H * 0.62, edge, H * 0.38); ctx.fillStyle = '#6fd37a'; ctx.fillRect(edge - zone, H * 0.62, zone, 8); ctx.fillStyle = '#7a4f2a'; ctx.fillRect(0, H * 0.62 + 8, edge, 6); } glyph(ctx, '⛰️', W * 0.9, H * 0.55, 40); glyph(ctx, sprite(), me.x, H * 0.62 - 22 + (me.y || 0), 44); },
          onTap() { if (done) return; done = true; if (me.x >= edge - zone) { sfx('good'); g.win(); } else { sfx('bad'); g.lose(); } },
          target() { return { kind: 'tap', x: W / 2, y: H / 2, ready: !done && me.x >= edge - zone + 6 }; },
        };
      } });

    // 20. なげろ! — うごく かごが まうえに きたら、うえへ スワイプ
    def({ id: 'throw', cue: 'なげろ！', say: 'なげろ', dur: 4000, uses: ['swipe'], motif: 'バスケ',
      create(g) {
        const W = g.W, H = g.H;
        const hoop = { x: W * 0.2, y: H * 0.22, v: (120 + 30 * g.extra) * g.speed, dir: 1 };
        const me = { x: W / 2, y: H * 0.82 }; let ball = null, done = false;
        return {
          // なげた しゅんかんの ずれで きめる(ボールが とどくまでに かごは うごくので、その あいだは とわない)
          update(dt) { hoop.x += hoop.v * hoop.dir * dt; if (hoop.x > W - 40) { hoop.x = W - 40; hoop.dir = -1; } if (hoop.x < 40) { hoop.x = 40; hoop.dir = 1; } if (ball) { ball.y -= 700 * dt; ball.x += (hoop.x - ball.x) * Math.min(1, dt * 6); if (ball.y <= hoop.y) { done = true; if (ball.ok) { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } ball = null; } } },
          draw(ctx) { bg(ctx, W, H, '#fff4e0', '#ffe1b8'); glyph(ctx, '🧺', hoop.x, hoop.y, 46); if (ball) glyph(ctx, '🏀', ball.x, ball.y, 30); glyph(ctx, sprite(), me.x, me.y, 44); if (ctx) { ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(me.x, me.y - 30); ctx.lineTo(me.x, hoop.y + 20); ctx.stroke(); ctx.setLineDash([]); } },
          onSwipe(dir) { if (done || ball) return; if (dir !== 'up') { done = true; sfx('bad'); g.lose(); return; } ball = { x: me.x, y: me.y - 30, ok: Math.abs(hoop.x - me.x) <= 34 }; sfx('whoosh'); },
          target() { return { kind: 'swipe', dir: 'up', ready: !ball && Math.abs(hoop.x - me.x) <= 22 }; },
        };
      } });

    // 21. n かい たたけ! — ちょうど n かい タップして、それいじょう おさない
    def({ id: 'knock', cue: 'たたけ！', say: 'たたけ', dur: 3600, uses: ['tap'], survive: true, motif: 'ノック',
      create(g) {
        const W = g.W, H = g.H;
        const n = 2 + Math.floor(Math.random() * (2 + Math.min(2, g.extra))); let taps = 0, over = false;
        return {
          cue: `${n}かい たたけ！`, say: `${n}かい たたけ`,
          draw(ctx) { bg(ctx, W, H, '#f6efe4', '#e6d3b8'); glyph(ctx, '🚪', W / 2, H * 0.5, 120); if (ctx) { ctx.fillStyle = over ? '#e5484d' : '#333'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${taps}／${n}`, W / 2, H * 0.14); } glyph(ctx, sprite(), W * 0.82, H * 0.86, 40); },
          onTap() { taps++; sfx(taps > n ? 'bad' : 'hit'); if (taps > n) { over = true; g.lose(); } },
          onTimeout() { return taps === n; },
          target() { return { kind: 'tap', x: W / 2, y: H / 2, times: n }; },
        };
      } });

    // 22. まて! — なにも さわらない(さわったら ×)
    def({ id: 'wait', cue: 'まて！', say: 'まて', dur: 3400, uses: ['none'], survive: true, motif: 'おあずけ',
      create(g) {
        const W = g.W, H = g.H;
        const food = pick(foods()); let t = 0;
        const tease = g.feint ? rnd(0.9, 1.6) : 99;
        return {
          update(dt) { t += dt; },
          draw(ctx) { bg(ctx, W, H, '#f1f5ff', '#dde6ff'); glyph(ctx, food, W / 2, H * 0.4 + (t > tease ? Math.sin(t * 12) * 6 : 0), 56); if (ctx && t > tease) { ctx.fillStyle = '#e5484d'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('いまだ…?', W / 2, H * 0.2); } glyph(ctx, sprite(), W / 2, H * 0.78, 48); glyph(ctx, '🤤', W / 2 + 30, H * 0.78 - 26, 22); },
          onPress() { sfx('bad'); g.lose(); },
          target() { return { kind: 'none' }; },
        };
      } });

    // 23. にげろ! — おばけが きた ほうこうと はんたいへ スワイプ
    def({ id: 'flee', cue: 'にげろ！', say: 'にげろ', dur: 3400, uses: ['swipe'], motif: 'おばけ屋敷',
      create(g) {
        const W = g.W, H = g.H;
        const from = pick(['left', 'right', 'up', 'down']);
        const OPP = { left: 'right', right: 'left', up: 'down', down: 'up' };
        const gp = { left: [30, H / 2], right: [W - 30, H / 2], up: [W / 2, 40], down: [W / 2, H - 40] }[from];
        let done = false, t = 0;
        return {
          update(dt) { t += dt; },
          draw(ctx) { bg(ctx, W, H, '#2b2540', '#4a3f6b'); glyph(ctx, '👻', gp[0] + Math.sin(t * 6) * 4, gp[1], 52); glyph(ctx, sprite(), W / 2, H / 2, 48); glyph(ctx, '💦', W / 2 + 30, H / 2 - 28, 22); },
          onSwipe(dir) { if (done) return; done = true; if (dir === OPP[from]) { sfx('whoosh'); g.win(); } else { sfx('bad'); g.lose(); } },
          target() { return { kind: 'swipe', dir: OPP[from] }; },
        };
      } });

    // 24. たたけ! — あなから 出てくる うんちを タップ(need かい)
    def({ id: 'mole', cue: 'でたらたたけ！', say: 'でたらたたけ', dur: 4200, uses: ['tap'], motif: 'もぐらたたき',
      create(g) {
        const W = g.W, H = g.H;
        const holes = [[0.2, 0.4], [0.5, 0.4], [0.8, 0.4], [0.35, 0.68], [0.65, 0.68]].map(([nx, ny]) => ({ x: nx * W, y: ny * H }));
        const need = 2 + Math.min(1, g.extra); let hits = 0, t = 0, mole = null, nextAt = 0.3, lastBad = false;
        const up = lerp(0.9, 0.55, (g.level - 1) / (RULES.MAX_LEVEL - 1));
        return {
          // 🌷(おとり)は 2かい つづけて 出さない(たたく チャンスが へりすぎないように)
          update(dt) { t += dt; if (!mole && t >= nextAt) { const bad = g.feint && !lastBad && Math.random() < 0.2; lastBad = bad; mole = { h: pick(holes), until: t + up, bad }; } if (mole && t >= mole.until) { mole = null; nextAt = t + 0.2; } },
          draw(ctx) { bg(ctx, W, H, '#e8f5d8', '#c9e5b0'); for (const h of holes) glyph(ctx, '🕳️', h.x, h.y + 8, 44); if (mole) glyph(ctx, mole.bad ? '🌷' : '💩', mole.h.x, mole.h.y - 8, 40); if (ctx) { ctx.fillStyle = '#333'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${hits}／${need}`, W / 2, H * 0.12); } glyph(ctx, sprite(), W * 0.85, H * 0.9, 34); },
          onTap(x, y) { if (mole && hit(x, y, mole.h.x, mole.h.y - 8, 34)) { if (mole.bad) { sfx('bad'); g.lose(); return; } hits++; sfx('hit'); mole = null; nextAt = t + 0.2; if (hits >= need) { sfx('good'); g.win(); } } },
          target() { return mole && !mole.bad ? { kind: 'tap', x: mole.h.x, y: mole.h.y - 8, repeat: true } : { kind: 'tap', x: W / 2, y: H / 2, ready: false }; },
        };
      } });

    // 25. きれ! — とんでくる くだものを、ゆびで なぞって きる
    def({ id: 'slice', cue: 'きれ！', say: 'きれ', dur: 4000, uses: ['drag'], motif: 'フルーツ',
      create(q) {
        const W = q.W, H = q.H;
        const fruits = []; let t = 0, cut = 0; const need = 1 + Math.min(2, q.extra + (q.level >= 3 ? 1 : 0));
        const times = []; for (let i = 0; i < need; i++) times.push(0.5 + i * 0.9);
        return {
          update(dt) { t += dt; while (times.length && t >= times[0]) { times.shift(); fruits.push({ x: rnd(60, W - 60), y: H + 20, vy: -(360 + 20 * q.extra), vx: rnd(-30, 30), ch: pick(['🍉', '🍎', '🍊', '🍌']), cut: false }); } for (const f of fruits) { f.vy += 420 * dt; f.y += f.vy * dt; f.x += f.vx * dt; } },
          draw(ctx) { bg(ctx, W, H, '#fff5ee', '#ffe3d0'); for (const f of fruits) glyph(ctx, f.cut ? '💥' : f.ch, f.x, f.y, 46, f.cut ? 0.6 : 1); glyph(ctx, sprite(), W * 0.15, H * 0.9, 36); glyph(ctx, '🔪', W * 0.15 + 26, H * 0.9 - 20, 22); },
          onDrag(x, y, dx, dy) { if (Math.hypot(dx, dy) < 2) return; for (const f of fruits) if (!f.cut && hit(x, y, f.x, f.y, 36)) { f.cut = true; cut++; sfx('whoosh'); if (cut >= need) { sfx('good'); q.win(); } } },
          target() { const f = fruits.find((k) => !k.cut && k.y < H); return f ? { kind: 'drag', x: f.x - 40, y: f.y, to: { x: f.x + 40, y: f.y }, repeat: true } : { kind: 'drag', x: W / 2, y: H / 2, to: { x: W / 2 + 10, y: H / 2 }, repeat: true }; },
        };
      } });

    // 26. まもれ! — とんでくる うんちを、とどく まえに タップ(時間切れ = せいこう)
    def({ id: 'guard', cue: 'まもれ！', say: 'まもれ', dur: 4200, uses: ['tap'], survive: true, motif: 'ミサイル',
      create(g) {
        const W = g.W, H = g.H;
        const me = { x: W * 0.2, y: H * 0.6 }; const shots = []; let t = 0, nextAt = 0.4;
        const gap = lerp(1.0, 0.6, (g.level - 1) / (RULES.MAX_LEVEL - 1)); const sp = (110 + 20 * g.extra) * g.speed;
        return {
          update(dt) { t += dt; if (t >= nextAt) { nextAt = t + gap; shots.push({ x: W + 20, y: me.y + rnd(-60, 60), vx: -sp }); } for (const s of shots) s.x += s.vx * dt; for (const s of shots) if (!s.hit && hit(s.x, s.y, me.x, me.y, 34)) { sfx('hit'); g.lose(); return; } while (shots.length && (shots[0].hit || shots[0].x < -30)) shots.shift(); },
          draw(ctx) { bg(ctx, W, H, '#ffeaea', '#ffd0d0'); for (const s of shots) if (!s.hit) glyph(ctx, '💩', s.x, s.y, 34); glyph(ctx, sprite(), me.x, me.y, 48); glyph(ctx, '🛡️', me.x + 34, me.y, 26); },
          onTap(x, y) { for (const s of shots) if (!s.hit && hit(x, y, s.x, s.y, 34)) { s.hit = true; sfx('pop'); return; } },
          target() { const s = shots.find((k) => !k.hit); return s ? { kind: 'tap', x: s.x, y: s.y, repeat: true } : { kind: 'tap', x: W / 2, y: H / 2, ready: false }; },
        };
      } });

    // 27. つめろ! — ごはんを おべんとうばこへ ドラッグ(ぜんぶ)
    def({ id: 'bento', cue: 'つめろ！', say: 'つめろ', dur: 4200, uses: ['drag'], motif: 'おべんとう',
      create(g) {
        const W = g.W, H = g.H;
        const box = { x: W / 2, y: H * 0.26 };
        const n = 2 + Math.min(2, g.extra); const list = shuffle(foods()).slice(0, n);
        const items = list.map((ch, i) => ({ ch, x: W * ((i + 0.5) / n), y: H * 0.78, held: false, done: false }));
        if (g.feint) items.push({ ch: '💩', x: W * 0.5, y: H * 0.56, held: false, done: false, bad: true });
        let held = null;
        return {
          draw(ctx) { bg(ctx, W, H, '#fff8e6', '#f7e6c4'); glyph(ctx, '🍱', box.x, box.y, 70); ring(ctx, box.x, box.y, 48, 'rgba(0,0,0,.25)', 2); for (const it of items) if (!it.done) glyph(ctx, it.ch, it.x, it.y, it.held ? 46 : 40); glyph(ctx, sprite(), W * 0.85, H * 0.9, 34); },
          onPress(x, y) { held = items.filter((it) => !it.done).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] || null; if (held && Math.hypot(held.x - x, held.y - y) > 70) held = null; if (held) held.held = true; },
          onDrag(x, y) { if (!held) return; held.x = x; held.y = y; if (hit(x, y, box.x, box.y, 46)) { if (held.bad) { sfx('bad'); g.lose(); return; } held.done = true; held.held = false; held = null; sfx('pop'); if (items.every((it) => it.done || it.bad)) { sfx('good'); g.win(); } } },
          onRelease() { if (held) held.held = false; held = null; },
          target() { const it = items.find((k) => !k.done && !k.bad); return it ? { kind: 'drag', x: it.x, y: it.y, to: { x: box.x, y: box.y }, repeat: true } : null; },
        };
      } });

    // 28. まわせ! — ゆびで まるを かく(1しゅう)
    def({ id: 'spin', cue: 'まわせ！', say: 'まわせ', dur: 4000, uses: ['drag'], motif: 'へんしん',
      create(g) {
        const W = g.W, H = g.H;
        const c = { x: W / 2, y: H * 0.5 }; const need = Math.PI * 2 * (1 + 0.5 * Math.min(2, g.extra));
        let ang = 0, last = null, done = false;
        return {
          draw(ctx) { bg(ctx, W, H, '#eefaff', '#d3f0ff'); ring(ctx, c.x, c.y, 90, 'rgba(0,0,0,.12)', 10); if (ctx) { ctx.save(); ctx.strokeStyle = '#3aa0ff'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(c.x, c.y, 90, -Math.PI / 2, -Math.PI / 2 + Math.min(Math.PI * 2, Math.abs(ang) / need * Math.PI * 2)); ctx.stroke(); ctx.restore(); } glyph(ctx, sprite(), c.x, c.y, 52 + Math.abs(ang) * 3); glyph(ctx, '🔄', c.x + 60, c.y - 60, 24); },
          onPress(x, y) { last = Math.atan2(y - c.y, x - c.x); },
          onDrag(x, y) { if (done) return; const a = Math.atan2(y - c.y, x - c.x); if (last != null) { let d = a - last; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; if (Math.abs(d) < 1) ang += d; } last = a; if (Math.abs(ang) >= need) { done = true; sfx('levelup'); g.win(); } },
          onRelease() { last = null; },
          target() { return { kind: 'spin', x: c.x, y: c.y, r: 70 }; },
        };
      } });

    // 29. もちあげろ! — うえへ なぞって だっこ
    def({ id: 'lift', cue: 'もちあげろ！', say: 'もちあげろ', dur: 3600, uses: ['drag'], motif: 'だっこ',
      create(g) {
        const W = g.W, H = g.H;
        const need = 200 + 50 * g.extra + 30 * (g.level - 1); let lifted = 0, done = false;
        return {
          draw(ctx) { bg(ctx, W, H, '#fff3f8', '#ffe2ef'); const k = clamp(lifted / need, 0, 1); glyph(ctx, '🙌', W / 2, H * 0.86 - k * H * 0.3, 44); glyph(ctx, sprite(), W / 2, H * 0.72 - k * H * 0.38, 56); if (ctx) { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(W * 0.2, H * 0.1, W * 0.6, 12); ctx.fillStyle = '#ff8fb8'; ctx.fillRect(W * 0.2, H * 0.1, W * 0.6 * k, 12); } },
          onDrag(x, y, dx, dy) { if (done) return; if (dy < 0) lifted -= dy; if (lifted >= need) { done = true; sfx('love'); g.win(); } },
          target() { return { kind: 'drag', x: W / 2, y: H * 0.9, to: { x: W / 2, y: H * 0.15 }, repeat: true }; },
        };
      } });

    // 30. くすぐれ! — おなかを 5かい タップ(はずすと かぞえない)
    def({ id: 'tickle', cue: 'くすぐれ！', say: 'くすぐれ', dur: 3600, uses: ['tap'], motif: 'じゃれる',
      create(g) {
        const W = g.W, H = g.H;
        const need = 5 + 2 * g.extra; const me = { x: W / 2, y: H * 0.55, vx: g.level >= 4 ? 70 * g.speed : 0 };
        let taps = 0, wig = 0;
        return {
          update(dt) { me.x += me.vx * dt; if (me.x < 70 || me.x > W - 70) me.vx = -me.vx; wig = Math.max(0, wig - dt * 6); },
          draw(ctx) { bg(ctx, W, H, '#fffbe6', '#fff0b3'); glyph(ctx, sprite(), me.x + Math.sin(wig * 40) * wig * 6, me.y, 76); ring(ctx, me.x, me.y + 18, 30, 'rgba(255,140,180,.7)', 3); if (ctx) { ctx.fillStyle = '#333'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${taps}／${need}`, W / 2, H * 0.12); } if (wig > 0.5) glyph(ctx, '😆', me.x + 40, me.y - 40, 26); },
          onTap(x, y) { if (hit(x, y, me.x, me.y + 18, 40)) { taps++; wig = 1; sfx('pop'); if (taps >= need) { sfx('love'); g.win(); } } },
          target() { return { kind: 'tap', x: me.x, y: me.y + 18, repeat: true }; },
        };
      } });

    // 31. バランス! — あたまの うえの ボールが おちないように、なぞって ささえる(時間切れ = せいこう)
    def({ id: 'balance', cue: 'バランス！', say: 'バランス', dur: 4200, uses: ['drag'], survive: true, motif: 'かたむき迷路',
      create(g) {
        const W = g.W, H = g.H;
        const me = { x: W / 2, y: H * 0.7 }; let off = 0, vel = 0, t = 0;
        const wind = (60 + 25 * g.extra) * g.speed;
        return {
          update(dt) { t += dt; vel += (Math.sin(t * 2.3) + Math.sin(t * 5.1) * 0.5) * wind * dt + off * 1.4 * dt; off += vel * dt; if (Math.abs(off) > 62) { sfx('bad'); g.lose(); } },
          draw(ctx) { bg(ctx, W, H, '#f0fff4', '#d6f5e0'); glyph(ctx, sprite(), me.x, me.y, 56); glyph(ctx, '🏀', me.x + off, me.y - 52 + Math.abs(off) * 0.15, 34); ring(ctx, me.x, me.y - 52, 64, 'rgba(0,0,0,.12)', 2); },
          onPress(x) { const d = x - me.x; if (Math.abs(d) < 120) { me.x = x; off -= d; } },
          onDrag(x, y, dx) { me.x = clamp(me.x + dx * 1.2, 30, W - 30); off -= dx * 1.2; },
          target() { return { kind: 'follow', x: me.x + off * 0.9, y: me.y }; },
        };
      } });

    // 32. あかは?/きいろは?… — いわれた いろの ものを タップ
    def({ id: 'color', cue: 'いろは？', say: 'いろ', dur: 3600, uses: ['tap'], motif: 'ずかん',
      create(g) {
        const W = g.W, H = g.H;
        const COLORS = [['あかは？', 'あかは', '🍎'], ['きいろは？', 'きいろは', '🍋'], ['みどりは？', 'みどりは', '🥦'], ['あおは？', 'あおは', '🫐'], ['むらさきは？', 'むらさきは', '🍇']];
        const n = 3 + Math.min(2, g.extra + (g.level >= 3 ? 1 : 0));
        const set = shuffle(COLORS).slice(0, n); const want = pick(set);
        const items = set.map((c, i) => ({ c, x: W * (0.18 + 0.64 * (i % 3) / 2), y: H * (0.32 + 0.3 * Math.floor(i / 3)) }));
        let done = false;
        return {
          cue: want[0], say: want[1],
          draw(ctx) { bg(ctx, W, H, '#fffaf0', '#fff0d6'); for (const it of items) { ring(ctx, it.x, it.y, 36, 'rgba(255,255,255,.9)', 3); glyph(ctx, it.c[2], it.x, it.y, 44); } glyph(ctx, sprite(), W / 2, H * 0.88, 36); },
          onTap(x, y) { if (done) return; for (const it of items) if (hit(x, y, it.x, it.y, 40)) { done = true; if (it.c === want) { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } return; } },
          target() { const it = items.find((k) => k.c === want); return { kind: 'tap', x: it.x, y: it.y }; },
        };
      } });

    // 33. いくつ? — ほしが 出て きえる。かずを タップ
    def({ id: 'count', cue: 'いくつ？', say: 'いくつ', dur: 4200, uses: ['tap'], motif: 'ほし',
      create(g) {
        const W = g.W, H = g.H;
        const n = 2 + Math.floor(Math.random() * (2 + Math.min(2, g.extra)));
        const stars = []; for (let i = 0; i < n; i++) stars.push({ x: rnd(40, W - 40), y: rnd(50, H * 0.5) });
        const SHOW = lerp(1.1, 0.7, (g.level - 1) / (RULES.MAX_LEVEL - 1)); let t = 0, done = false;
        const choices = shuffle([n, n + 1, Math.max(1, n - 1)]).map((v, i) => ({ v, x: W * ((i + 0.5) / 3), y: H * 0.8 }));
        return {
          update(dt) { t += dt; },
          draw(ctx) { bg(ctx, W, H, '#1c2340', '#2f3b6b'); if (t < SHOW) for (const s of stars) glyph(ctx, '⭐', s.x, s.y, 34); else glyph(ctx, '☁️', W / 2, H * 0.3, 90, 0.8); for (const c of choices) { if (ctx) { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(c.x, c.y, 30, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#223'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(c.v), c.x, c.y); } } },
          onTap(x, y) { if (done) return; for (const c of choices) if (hit(x, y, c.x, c.y, 34)) { done = true; if (c.v === n) { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } return; } },
          target() { const c = choices.find((k) => k.v === n); return { kind: 'tap', x: c.x, y: c.y }; },
        };
      } });

    // 34. おおきいほう! — 2つの うち おおきい ほうを タップ
    def({ id: 'bigger', cue: 'おおきいほう！', say: 'おおきいほう', dur: 3400, uses: ['tap'], motif: 'ごはん',
      create(g) {
        const W = g.W, H = g.H;
        const ch = pick(foods()); const ratio = lerp(1.7, 1.25, (g.level - 1) / (RULES.MAX_LEVEL - 1));
        const bigLeft = Math.random() < 0.5;
        const items = [{ x: W * 0.28, y: H * 0.48, s: bigLeft ? 56 * ratio : 56, big: bigLeft }, { x: W * 0.72, y: H * 0.48, s: bigLeft ? 56 : 56 * ratio, big: !bigLeft }];
        let done = false;
        return {
          draw(ctx) { bg(ctx, W, H, '#fff7e8', '#ffe8c8'); for (const it of items) glyph(ctx, ch, it.x, it.y, it.s); glyph(ctx, sprite(), W / 2, H * 0.86, 40); },
          onTap(x, y) { if (done) return; for (const it of items) if (hit(x, y, it.x, it.y, it.s * 0.7)) { done = true; if (it.big) { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } return; } },
          target() { const it = items.find((k) => k.big); return { kind: 'tap', x: it.x, y: it.y }; },
        };
      } });

    // 35. ちがうの! — ひとつだけ ちがう ものを タップ
    def({ id: 'odd', cue: 'ちがうの！', say: 'ちがうの', dur: 4000, uses: ['tap'], motif: 'まちがいさがし',
      create(g) {
        const W = g.W, H = g.H;
        const PAIRS = [['🐶', '🐺'], ['🍎', '🍅'], ['🌸', '🌺'], ['🐱', '🐯'], ['🍋', '🍌'], ['🐟', '🐠'], ['🌙', '🌛'], ['🐰', '🐹']];
        const [a, b] = pick(PAIRS); const cols = 3, rows = 2 + Math.min(1, g.extra + (g.level >= 3 ? 1 : 0));
        const oddIdx = Math.floor(Math.random() * cols * rows);
        const cells = []; for (let i = 0; i < cols * rows; i++) cells.push({ x: W * (0.2 + 0.3 * (i % cols)), y: H * (0.22 + 0.56 * Math.floor(i / cols) / Math.max(1, rows - 1)), ch: i === oddIdx ? b : a, odd: i === oddIdx });
        let done = false;
        return {
          draw(ctx) { bg(ctx, W, H, '#f4f0ff', '#e2d8ff'); for (const c of cells) glyph(ctx, c.ch, c.x, c.y, 44); glyph(ctx, sprite(), W / 2, H * 0.9, 32); },
          onTap(x, y) { if (done) return; for (const c of cells) if (hit(x, y, c.x, c.y, 34)) { done = true; if (c.odd) { sfx('pop'); g.win(); } else { sfx('bad'); g.lose(); } return; } },
          target() { const c = cells.find((k) => k.odd); return { kind: 'tap', x: c.x, y: c.y }; },
        };
      } });

    // 36. じゅんばんに! — 1→2→3 の ふうせんを じゅんに タップ
    def({ id: 'order', cue: 'じゅんばんに！', say: 'じゅんばんに', dur: 4200, uses: ['tap'], motif: 'ふうせん',
      create(g) {
        const W = g.W, H = g.H;
        const n = 3 + Math.min(1, g.extra); const spots = shuffle([[0.2, 0.3], [0.5, 0.25], [0.8, 0.35], [0.35, 0.6], [0.7, 0.62]]).slice(0, n);
        const balls = spots.map(([nx, ny], i) => ({ x: nx * W, y: ny * H, n: i + 1, done: false, wob: Math.random() * 6 }));
        let next = 1, done = false;
        return {
          update(dt) { for (const b of balls) b.wob += dt * 2; },
          draw(ctx) { bg(ctx, W, H, '#e8f7ff', '#cbeaff'); for (const b of balls) if (!b.done) { const y = b.y + Math.sin(b.wob) * 4; glyph(ctx, '🎈', b.x, y, 52); if (ctx) { ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.n), b.x, y - 8); } } glyph(ctx, sprite(), W / 2, H * 0.88, 36); },
          onTap(x, y) { if (done) return; for (const b of balls) if (!b.done && hit(x, y, b.x, b.y, 34)) { if (b.n === next) { b.done = true; next++; sfx('pop'); if (next > n) { done = true; sfx('good'); g.win(); } } else { done = true; sfx('bad'); g.lose(); } return; } },
          target() { const b = balls.find((k) => k.n === next); return b ? { kind: 'tap', x: b.x, y: b.y, repeat: true } : { kind: 'tap', x: W / 2, y: H / 2, ready: false }; },
        };
      } });

    // 37. おさえろ! — はこの ふたを おしっぱなしで おさえる(はなしたら ×、時間切れ = せいこう)
    def({ id: 'holdlid', cue: 'おさえろ！', say: 'おさえろ', dur: 3800, uses: ['hold'], survive: true, motif: 'びっくりばこ',
      create(g) {
        const W = g.W, H = g.H;
        let holding = false, t = 0, shake = 0;
        return {
          update(dt) { t += dt; shake = holding ? Math.sin(t * 30) * 3 * g.speed : 0; },
          draw(ctx) { bg(ctx, W, H, '#fff4f4', '#ffdede'); glyph(ctx, '🎁', W / 2 + shake, H * 0.52, 96); glyph(ctx, holding ? '🤚' : '👆', W / 2, H * 0.52 - 70, 34); glyph(ctx, sprite(), W * 0.82, H * 0.88, 36); if (ctx && !holding && t > 0.4) { ctx.fillStyle = '#e5484d'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('おさえて!', W / 2, H * 0.15); } },
          onPress() { holding = true; },
          onRelease() { if (holding) { holding = false; sfx('bad'); g.lose(); } },
          onTimeout() { return holding; },
          target() { return { kind: 'hold', x: W / 2, y: H / 2, release: false }; },
        };
      } });

    // 38. かさ! — あめが ふりはじめたら うえへ スワイプ(はやすぎても ×)
    def({ id: 'umbrella', cue: 'あめがきたらかさ！', say: 'あめがきたらかさ', dur: 4200, uses: ['swipe'], motif: 'てんき',
      create(g) {
        const W = g.W, H = g.H;
        const rainAt = rnd(0.9, 2.2); let t = 0, done = false; const drops = [];
        const me = { x: W / 2, y: H * 0.78 };
        return {
          update(dt) { t += dt; if (t >= rainAt && drops.length < 12) drops.push({ x: rnd(W * 0.3, W * 0.7), y: H * 0.22 }); for (const d of drops) d.y += (260 + 30 * g.extra) * g.speed * dt; for (const d of drops) if (!done && d.y >= me.y - 30) { done = true; sfx('bad'); g.lose(); } },
          draw(ctx) { bg(ctx, W, H, t >= rainAt ? '#b9c6d6' : '#cfe9ff', '#f4f9ff'); glyph(ctx, t >= rainAt ? '🌧️' : '☁️', W / 2, H * 0.16, 70); for (const d of drops) glyph(ctx, '💧', d.x, d.y, 20); glyph(ctx, sprite(), me.x, me.y, 46); if (done && drops.length === 0) glyph(ctx, '☂️', me.x, me.y - 46, 50); },
          onSwipe(dir) { if (done) return; done = true; if (dir === 'up' && t >= rainAt) { drops.length = 0; sfx('good'); g.win(); } else { sfx('bad'); g.lose(); } },
          target() { return { kind: 'swipe', dir: 'up', ready: t >= rainAt + 0.05 }; },
        };
      } });

    // 39. とれ! — はしる キャラが わくに はいったら タップ(しゃしん)
    def({ id: 'shutter', cue: 'とれ！', say: 'とれ', dur: 3800, uses: ['tap'], motif: 'アルバム',
      create(g) {
        const W = g.W, H = g.H;
        const frame = { x: W / 2, w: lerp(90, 60, (g.level - 1) / (RULES.MAX_LEVEL - 1)) };
        const me = { x: -30, v: (170 + 30 * g.extra) * g.speed, dir: 1 }; let done = false, flash = 0;
        const inFrame = () => Math.abs(me.x - frame.x) <= frame.w / 2;
        return {
          update(dt) { if (done) { flash = Math.max(0, flash - dt * 3); return; } me.x += me.v * me.dir * dt; if (me.x > W + 30) { me.dir = -1; } if (me.x < -30 && me.dir < 0) { me.dir = 1; } },
          draw(ctx) { bg(ctx, W, H, '#fdfbe6', '#f5efc4'); if (ctx) { ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.strokeRect(frame.x - frame.w / 2, H * 0.32, frame.w, H * 0.42); ctx.setLineDash([]); } glyph(ctx, sprite(), me.x, H * 0.55, 46); glyph(ctx, '📷', W * 0.85, H * 0.15, 34); if (flash > 0 && ctx) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); } },
          onTap() { if (done) return; done = true; flash = 1; if (inFrame()) { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } },
          target() { return { kind: 'tap', x: W / 2, y: H / 2, ready: inFrame() && Math.abs(me.x - frame.x) < frame.w / 2 - 12 }; },
        };
      } });

    // 40. わけろ! — ごはんは ひだりへ、うんちは みぎへ スワイプ(2〜3こ)
    def({ id: 'sort', cue: 'ごはんはひだり！', say: 'ごはんはひだり', dur: 4200, uses: ['swipe'], motif: 'おかたづけ',
      create(g) {
        const W = g.W, H = g.H;
        const n = 2 + Math.min(1, g.extra); const queue = []; for (let i = 0; i < n; i++) queue.push(Math.random() < 0.5 ? { ch: pick(foods()), food: true } : { ch: '💩', food: false });
        let cur = queue.shift(), done = 0, fly = null;
        return {
          update(dt) { if (fly) { fly.x += fly.vx * dt; if (fly.x < -40 || fly.x > W + 40) fly = null; } },
          draw(ctx) { bg(ctx, W, H, '#f3fff0', '#dcf5d0'); glyph(ctx, '🍽️', W * 0.14, H * 0.5, 48); glyph(ctx, '🗑️', W * 0.86, H * 0.5, 48); if (cur) glyph(ctx, cur.ch, W / 2, H * 0.5, 54); if (fly) glyph(ctx, fly.ch, fly.x, H * 0.5, 44); glyph(ctx, sprite(), W / 2, H * 0.86, 40); if (ctx) { ctx.fillStyle = '#333'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${done}／${n}`, W / 2, H * 0.14); } },
          onSwipe(dir) { if (!cur) return; const ok = (dir === 'left' && cur.food) || (dir === 'right' && !cur.food); if (!ok) { sfx('bad'); g.lose(); cur = null; return; } fly = { ch: cur.ch, x: W / 2, vx: dir === 'left' ? -600 : 600 }; sfx('whoosh'); done++; cur = queue.shift() || null; if (done >= n) { sfx('good'); g.win(); } },
          target() { return cur ? { kind: 'swipe', dir: cur.food ? 'left' : 'right', repeat: true } : { kind: 'swipe', dir: 'left', ready: false }; },
        };
      } });

    // 41. リズム! — おちてくる おんぷが せんに かさなったら タップ(2〜3かい)
    def({ id: 'rhythm', cue: 'リズム！', say: 'リズム', dur: 4200, uses: ['tap'], motif: 'リズムハイウェイ',
      create(g) {
        const W = g.W, H = g.H;
        const line = H * 0.72; const n = 2 + Math.min(1, g.extra); const sp = (200 + 30 * g.extra) * g.speed;
        const notes = []; for (let i = 0; i < n; i++) notes.push({ y: line - sp * (0.7 + i * 0.75), x: W * (0.3 + 0.2 * i), hit: false, missed: false });
        let hits = 0;
        return {
          update(dt) { for (const nt of notes) { nt.y += sp * dt; if (!nt.hit && !nt.missed && nt.y > line + 26) { nt.missed = true; sfx('bad'); g.lose(); } } },
          draw(ctx) { bg(ctx, W, H, '#1a1830', '#3b2f63'); if (ctx) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(20, line); ctx.lineTo(W - 20, line); ctx.stroke(); } for (const nt of notes) if (!nt.hit) glyph(ctx, '🎵', nt.x, nt.y, 34); glyph(ctx, sprite(), W / 2, H * 0.88, 40); },
          onTap() { const nt = notes.find((k) => !k.hit && !k.missed && Math.abs(k.y - line) <= 26); if (nt) { nt.hit = true; hits++; sfx('coin'); if (hits >= n) { sfx('good'); g.win(); } } else { sfx('tap'); } },
          target() { const nt = notes.find((k) => !k.hit && !k.missed); return { kind: 'tap', x: W / 2, y: H / 2, ready: !!nt && Math.abs(nt.y - line) <= 14, repeat: true }; },
        };
      } });

    // 42. なぞれ! — ●を じゅんばんに なぞって つなぐ
    def({ id: 'trace', cue: 'なぞれ！', say: 'なぞれ', dur: 4200, uses: ['drag'], motif: 'ラインレース',
      create(g) {
        const W = g.W, H = g.H;
        const n = 3 + Math.min(1, g.extra); const pts = []; for (let i = 0; i < n; i++) pts.push({ x: W * (0.18 + 0.64 * i / (n - 1)), y: H * (i % 2 ? 0.3 : 0.62) });
        let next = 0, done = false; const trail = [];
        return {
          draw(ctx) { bg(ctx, W, H, '#fffdf2', '#f7f1d4'); if (ctx) { ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 6; ctx.setLineDash([6, 8]); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.setLineDash([]); if (trail.length > 1) { ctx.strokeStyle = '#ff8fb8'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); } } pts.forEach((p, i) => { ring(ctx, p.x, p.y, 22, i < next ? '#6fd37a' : i === next ? '#ff8fb8' : 'rgba(0,0,0,.3)', 5); }); glyph(ctx, sprite(), pts[Math.max(0, next - 1)].x, pts[Math.max(0, next - 1)].y - 34, 34); },
          onDrag(x, y) { if (done) return; trail.push({ x, y }); if (trail.length > 60) trail.shift(); const p = pts[next]; if (p && hit(x, y, p.x, p.y, 30)) { next++; sfx('pop'); if (next >= n) { done = true; sfx('good'); g.win(); } } },
          onRelease() { trail.length = 0; },
          target() { const a = pts[Math.max(0, next - 1)], b = pts[next]; return b ? { kind: 'drag', x: next ? a.x : b.x - 20, y: next ? a.y : b.y, to: { x: b.x, y: b.y }, repeat: true } : null; },
        };
      } });

    // 43. おしだせ! — みぎへ なぞって はこを はたまで おす
    def({ id: 'pushbox', cue: 'おしだせ！', say: 'おしだせ', dur: 3800, uses: ['drag'], motif: '倉庫番',
      create(g) {
        const W = g.W, H = g.H;
        const box = { x: W * 0.3 }; const goal = W * 0.8; const need = goal - box.x; let done = false;
        return {
          draw(ctx) { bg(ctx, W, H, '#f6f0e6', '#e6d9c4'); if (ctx) { ctx.fillStyle = '#b07a4a'; ctx.fillRect(0, H * 0.66, W, H * 0.34); } glyph(ctx, '🚩', goal + 30, H * 0.56, 40); glyph(ctx, '📦', box.x, H * 0.58, 56); glyph(ctx, sprite(), box.x - 52, H * 0.58, 44); },
          onDrag(x, y, dx) { if (done) return; if (dx > 0) box.x = Math.min(goal, box.x + dx * 0.9 * (1 - 0.1 * Math.min(3, g.extra))); if (box.x >= goal) { done = true; sfx('good'); g.win(); } },
          target() { return { kind: 'drag', x: W * 0.15, y: H * 0.58, to: { x: W * 0.95, y: H * 0.58 }, repeat: true }; },
        };
      } });

    // 44. つれ! — うきが しずんだら うえへ スワイプ(はやすぎると にげる)
    def({ id: 'fish', cue: 'ひいたら つれ！', say: 'ひいたらつれ', dur: 4200, uses: ['swipe'], motif: 'つり',
      create(g) {
        const W = g.W, H = g.H;
        const biteAt = rnd(0.9, 2.4); const window = lerp(0.9, 0.55, (g.level - 1) / (RULES.MAX_LEVEL - 1));
        let t = 0, done = false;
        const biting = () => t >= biteAt && t <= biteAt + window;
        return {
          update(dt) { t += dt; if (!done && t > biteAt + window) { done = true; sfx('bad'); g.lose(); } },
          draw(ctx) { bg(ctx, W, H, '#e0f4ff', '#79c3ea'); if (ctx) { ctx.fillStyle = '#3aa0d8'; ctx.fillRect(0, H * 0.5, W, H * 0.5); } glyph(ctx, sprite(), W * 0.22, H * 0.36, 46); glyph(ctx, '🎣', W * 0.36, H * 0.3, 40); const dip = biting() ? 18 : Math.sin(t * 3) * 3; glyph(ctx, '🔴', W * 0.62, H * 0.5 + dip, 22); if (biting()) glyph(ctx, '❗', W * 0.62, H * 0.5 - 40, 34); if (t > biteAt + window && done) glyph(ctx, '🐟', W * 0.85, H * 0.7, 34); },
          onSwipe(dir) { if (done) return; done = true; if (dir === 'up' && biting()) { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } },
          target() { return { kind: 'swipe', dir: 'up', ready: biting() && t >= biteAt + 0.05 }; },
        };
      } });

    // 45. つめ! — ゆれる ブロックが したの タワーの うえに きたら タップ
    def({ id: 'stack', cue: 'つめ！', say: 'つめ', dur: 3800, uses: ['tap'], motif: 'つみあげタワー',
      create(g) {
        const W = g.W, H = g.H;
        const tol = lerp(34, 18, (g.level - 1) / (RULES.MAX_LEVEL - 1)); const sp = (1.6 + 0.3 * g.extra) * g.speed;
        let t = 0, done = false, dropped = null;
        const bx = () => W / 2 + Math.sin(t * sp) * W * 0.34;
        return {
          update(dt) { t += dt; if (dropped) { dropped.y += 500 * dt; } },
          draw(ctx) { bg(ctx, W, H, '#fff3e0', '#ffe0b3'); glyph(ctx, '🟫', W / 2, H * 0.8, 60); glyph(ctx, '🟫', W / 2, H * 0.66, 60); if (dropped) glyph(ctx, '🟧', dropped.x, Math.min(dropped.y, H * 0.52), 60); else glyph(ctx, '🟧', bx(), H * 0.22, 60); glyph(ctx, sprite(), W * 0.85, H * 0.88, 34); },
          onTap() { if (done) return; done = true; const x = bx(); dropped = { x, y: H * 0.22 }; if (Math.abs(x - W / 2) <= tol) { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } },
          target() { return { kind: 'tap', x: W / 2, y: H / 2, ready: Math.abs(bx() - W / 2) <= tol * 0.5 }; },
        };
      } });

    // 46. おなじの! — 4まいの なかの おなじ 2まいを タップ
    def({ id: 'pair', cue: 'おなじの！', say: 'おなじの', dur: 4000, uses: ['tap'], motif: 'しんけいすいじゃく',
      create(g) {
        const W = g.W, H = g.H;
        const pool = shuffle(['🍎', '🐶', '🚗', '⭐', '🌸', '🎵', '🐟', '🎈']); const same = pool[0];
        const faces = shuffle([same, same, pool[1], pool[2]]).map((ch, i) => ({ ch, x: W * (0.2 + 0.6 * (i % 2)), y: H * (0.3 + 0.36 * Math.floor(i / 2)), picked: false }));
        let picked = 0, done = false;
        return {
          draw(ctx) { bg(ctx, W, H, '#f0f8ff', '#dbeeff'); for (const f of faces) { ring(ctx, f.x, f.y, 40, f.picked ? '#6fd37a' : 'rgba(255,255,255,.9)', 4); glyph(ctx, f.ch, f.x, f.y, 46); } glyph(ctx, sprite(), W / 2, H * 0.9, 30); },
          onTap(x, y) { if (done) return; for (const f of faces) if (!f.picked && hit(x, y, f.x, f.y, 42)) { if (f.ch !== same) { done = true; sfx('bad'); g.lose(); return; } f.picked = true; picked++; sfx('pop'); if (picked >= 2) { done = true; sfx('good'); g.win(); } return; } },
          target() { const f = faces.find((k) => k.ch === same && !k.picked); return f ? { kind: 'tap', x: f.x, y: f.y, repeat: true } : { kind: 'tap', x: W / 2, y: H / 2, ready: false }; },
        };
      } });

    // 47. どっち? — こいびと(なかま)が かくれた ドアを、いれかわりの あとで タップ
    def({ id: 'doors', cue: 'どっち？', say: 'どっち', dur: 4400, uses: ['tap'], motif: 'こいびと・なかま',
      create(g) {
        const W = g.W, H = g.H;
        const who = partner() || pick(companions());
        const doors = [{ x: W * 0.3 }, { x: W * 0.7 }]; let at = Math.floor(Math.random() * 2);
        const swaps = 1 + Math.min(2, g.extra + (g.level >= 3 ? 1 : 0)); let t = 0, phase = 'show', swapT = 0, swapsLeft = swaps, done = false, anim = 0;
        const SHOW = 0.8;
        return {
          update(dt) { t += dt; if (phase === 'show' && t >= SHOW) { phase = 'swap'; swapT = t; } if (phase === 'swap') { anim = (t - swapT) / (0.45 / g.speed); if (anim >= 1) { at = 1 - at; swapsLeft--; swapT = t; anim = 0; if (swapsLeft <= 0) phase = 'pick'; } } },
          draw(ctx) { bg(ctx, W, H, '#fff0f6', '#ffd9e8'); const k = phase === 'swap' ? Math.sin(anim * Math.PI) : 0; const xs = phase === 'swap' ? [doors[0].x + (doors[1].x - doors[0].x) * anim, doors[1].x - (doors[1].x - doors[0].x) * anim] : [doors[0].x, doors[1].x]; xs.forEach((x, i) => glyph(ctx, '🚪', x, H * 0.5 - k * 20 * (i ? -1 : 1), 84)); if (phase === 'show') glyph(ctx, who, doors[at].x, H * 0.5, 44); if (phase === 'pick') glyph(ctx, '❓', W / 2, H * 0.2, 36); glyph(ctx, sprite(), W / 2, H * 0.88, 36); },
          onTap(x, y) { if (done || phase !== 'pick') return; for (let i = 0; i < 2; i++) if (hit(x, y, doors[i].x, H * 0.5, 50)) { done = true; if (i === at) { sfx('love'); g.win(); } else { sfx('bad'); g.lose(); } return; } },
          target() { return { kind: 'tap', x: doors[at].x, y: H * 0.5, ready: phase === 'pick' }; },
        };
      } });

    // 48. そっとはこべ! — ゆっくり なぞって ベッドまで(はやいと おこす)
    def({ id: 'sneak', cue: 'そっとはこべ！', say: 'そっとはこべ', dur: 4400, uses: ['drag'], motif: 'ねる',
      create(g) {
        const W = g.W, H = g.H;
        const me = { x: W * 0.18, y: H * 0.55, held: false }; const bed = { x: W * 0.82, y: H * 0.55 };
        const maxSpeed = lerp(1.1, 0.7, (g.level - 1) / (RULES.MAX_LEVEL - 1)); let lastT = 0, done = false, woke = false;
        return {
          draw(ctx) { bg(ctx, W, H, '#1e2140', '#3a3f6e'); glyph(ctx, '🛏️', bed.x, bed.y, 60); glyph(ctx, '👻', W / 2, H * 0.2, 44, woke ? 1 : 0.35); glyph(ctx, sprite(), me.x, me.y, 46); glyph(ctx, '💤', me.x + 26, me.y - 30, 20); if (ctx) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ゆっくり…', W / 2, H * 0.88); } },
          onPress(x, y) { me.held = true; lastT = performance.now(); },
          onDrag(x, y, dx, dy) { if (done || !me.held) return; const now = performance.now(); const ms = Math.max(8, now - lastT); lastT = now; const v = Math.hypot(dx, dy) / ms; if (v > maxSpeed && Math.hypot(dx, dy) > 6) { done = true; woke = true; sfx('bad'); g.lose(); return; } me.x = clamp(me.x + dx, 20, W - 20); me.y = clamp(me.y + dy, 20, H - 20); if (hit(me.x, me.y, bed.x, bed.y, 34)) { done = true; sfx('sleep'); g.win(); } },
          onRelease() { me.held = false; },
          target() { return { kind: 'drag', x: me.x, y: me.y, to: { x: bed.x, y: bed.y }, slow: true, repeat: true }; },
        };
      } });

    // 49. ふけ! — うえへ スワイプで はねを ふきあげ、おちないように(時間切れ = せいこう)
    def({ id: 'feather', cue: 'ふけ！', say: 'ふけ', dur: 4000, uses: ['swipe'], survive: true, motif: 'かぜ',
      create(g) {
        const W = g.W, H = g.H;
        const f = { x: W / 2, y: H * 0.35, vy: 0 }; const grav = (90 + 20 * g.extra) * g.speed; let t = 0;
        return {
          update(dt) { t += dt; f.vy += grav * dt; f.y += f.vy * dt; f.x = W / 2 + Math.sin(t * 2) * 40; if (f.y >= H * 0.86) { sfx('bad'); g.lose(); } },
          draw(ctx) { bg(ctx, W, H, '#f0fbff', '#d9f2ff'); glyph(ctx, '🪶', f.x, f.y, 44); glyph(ctx, sprite(), W / 2, H * 0.9, 44); glyph(ctx, '💨', W / 2 + 34, H * 0.9 - 30, 22, clamp(-f.vy / 200, 0, 1)); },
          onSwipe(dir) { if (dir === 'up') { f.vy = -190; sfx('whoosh'); } },
          target() { return { kind: 'swipe', dir: 'up', ready: f.vy > 40 || f.y > H * 0.55, repeat: true }; },
        };
      } });

    // 50. はれは?/あめは?/ゆきは? — てんきに あう ものを タップ
    def({ id: 'weather', cue: 'てんきは？', say: 'てんき', dur: 3600, uses: ['tap'], motif: 'てんき',
      create(g) {
        const W = g.W, H = g.H;
        const KINDS = [['はれは？', 'はれは', '🕶️', '☀️'], ['あめは？', 'あめは', '☂️', '🌧️'], ['ゆきは？', 'ゆきは', '🧣', '❄️']];
        const want = pick(KINDS);
        const items = shuffle(KINDS).map((k, i) => ({ k, x: W * ((i + 0.5) / 3), y: H * 0.6 }));
        let done = false;
        return {
          cue: want[0], say: want[1],
          draw(ctx) { bg(ctx, W, H, '#eef8ff', '#d7ecff'); glyph(ctx, want[3], W / 2, H * 0.22, 70); for (const it of items) { ring(ctx, it.x, it.y, 38, 'rgba(255,255,255,.9)', 3); glyph(ctx, it.k[2], it.x, it.y, 44); } glyph(ctx, sprite(), W / 2, H * 0.9, 32); },
          onTap(x, y) { if (done) return; for (const it of items) if (hit(x, y, it.x, it.y, 42)) { done = true; if (it.k === want) { sfx('coin'); g.win(); } else { sfx('bad'); g.lose(); } return; } },
          target() { const it = items.find((k) => k.k === want); return { kind: 'tap', x: it.x, y: it.y }; },
        };
      } });

    // ---- ランナー(1ラン = RULES.TOTAL ゲーム or ライフ 0 まで) ----
    // opts.only: その 1本だけを くりかえす「1本ずつ」モード(id 'quick-solo'、10かい、2かいごとに レベル)
    function makeQuickRun(opts = {}) {
      const only = opts.only ? GAMES.find((g) => g.id === opts.only) : null;
      const TOTAL = opts.total || (only ? RULES.SOLO_TOTAL : RULES.TOTAL);
      const LEVEL_EVERY = opts.levelEvery || (only ? RULES.SOLO_LEVEL_EVERY : RULES.LEVEL_EVERY);
      const PER_CLEAR = 100 / TOTAL;
      return {
        id: only ? 'quick-solo' : 'quick-run', noIntro: true, quickGameId: only ? only.id : null,
        start(container, onComplete) {
          let running = true, rafId = null, last = null;
          let lives = RULES.LIVES, cleared = 0, index = 0, combo = 0, maxCombo = 0, level = 1;
          let phase = 'idle', phaseUntil = 0, cur = null, game = null, def = null, limit = 0, startedAt = 0, pending = null;
          const recent = []; const plays = {}; const clears = {};
          container.innerHTML = `
            <div class="mg-header qk-header"><span id="qkLives">${'❤️'.repeat(lives)}</span><span id="qkCount">✔ 0／${TOTAL}</span><span id="qkLevel">Lv1</span></div>
            <div class="qk-timebar"><span class="qk-timefill" id="qkTime"></span></div>
            <div class="mg-canvas-wrap qk-wrap"><canvas class="mg-canvas" id="qkCanvas"></canvas><div class="qk-cue hidden" id="qkCue"></div><div class="qk-flash hidden" id="qkFlash"></div><div class="qk-final hidden" id="qkFinal"></div></div>
            <div class="mg-hint qk-hint" id="qkHint">${only ? escapeHtml(only.cue) + '（' + escapeHtml(only.motif) + '）を' + TOTAL + 'かい。' : 'みじかい指示のとおりに、すぐそうさ!'}3回しっぱいでおわり</div>
          `;
          const canvas = container.querySelector('#qkCanvas');
          const { ctx, W, H } = S.createMgCanvas(canvas, 300, { grow: true, maxGrow: 1.7 });
          const livesEl = container.querySelector('#qkLives'), countEl = container.querySelector('#qkCount'), levelEl = container.querySelector('#qkLevel');
          const timeEl = container.querySelector('#qkTime'), cueEl = container.querySelector('#qkCue'), flashEl = container.querySelector('#qkFlash'), finalEl = container.querySelector('#qkFinal'), hintEl = container.querySelector('#qkHint');
          const hud = () => { livesEl.textContent = '❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(RULES.LIVES - Math.max(0, lives)); countEl.textContent = `✔ ${cleared}／${TOTAL}`; levelEl.textContent = `Lv${level}`; };
          const show = (el, html) => { if (!el) return; if (html != null) el.innerHTML = html; el.classList.remove('hidden'); };
          const hide = (el) => { if (el) el.classList.add('hidden'); };

          function pickNext() {
            if (only) return only;
            const pool = GAMES.filter((g) => !recent.includes(g.id));
            const g = pick(pool.length ? pool : GAMES);
            recent.push(g.id); if (recent.length > Math.min(3, GAMES.length - 1)) recent.shift();
            return g;
          }
          function beginGame() {
            def = pickNext();
            level = Math.min(RULES.MAX_LEVEL, 1 + Math.floor(index / LEVEL_EVERY));
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
            // こえが 出る ときは チャイムを かさねない(ことばの あたまが きこえなくなる)
            if (!voice(String(game.say || def.say), { question: /[？?]$/.test(String(game.cue || def.cue)) })) sfx('notify');
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
            const score = clamp(Math.round(cleared * PER_CLEAR), 0, 100);
            const stats = { cleared, total: TOTAL, maxCombo, level, lives, plays, clears, score, solo: only ? only.id : null };
            if (typeof S.onRunEnd === 'function') S.onRunEnd(stats);
            const perfect = cleared >= TOTAL;
            show(finalEl, `<div class="qk-final-title">${perfect ? '👑パーフェクト!' : lives <= 0 ? '💦ここまで!' : '🏁おしまい!'}</div><div class="qk-final-big">✔ ${cleared}<small>／${TOTAL}</small></div><div class="qk-final-sub">さいだい${maxCombo}れんぞく／Lv${level}まで</div>`);
            sfx(perfect ? 'fanfare' : cleared >= TOTAL / 2 ? 'clear' : 'fail');
            setTimeout(() => onComplete(score, `${only ? only.cue.replace(/[！!]/g, '') : 'クイック'}${cleared}こクリア（さいだい${maxCombo}れんぞく）`), RULES.FINAL_MS);
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
              if (pending == null && el >= limit) judge(game.onTimeout ? !!game.onTimeout() : !!def.survive);
            } else if (phase === 'result') {
              if (now >= phaseUntil) {
                hide(flashEl);
                if (lives <= 0 || index >= TOTAL) { finishRun(); return; }
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
