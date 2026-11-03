// Exact createTouchPad/createPadRow bodies from V5 script.js. Isolated wrapper only.
globalThis.installNaokoroControls = function () {
 const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function createTouchPad(host, opts = {}) {
    const mode = opts.mode || 'vector';
    const stepPx = opts.stepPx || 26;
    const axis = opts.axis || 'xy';
    const sticky = !!opts.sticky;
    const holdMs = opts.holdMs || 110;
    // steps: ゆびを はなすのを またず、うごきの ベクトルで むきが きまった
    // しゅんかんに 1マス。triggerPx = はじめの 1マスに いる うごき(ぶれ よけ)、
    // repeatPx / repeatMs = おなじ むきを つづけて なぞる ときの 2マスめ いこう
    // (みじかい フリック 1かいで 2マス すすまないように おおきめ)
    const triggerPx = opts.triggerPx || 12;
    const repeatPx = opts.repeatPx || 30;
    const repeatMs = opts.repeatMs || 110;
    const PAUSE_MS = 90;      // ゆびが これだけ とまったら つぎの うごきは あたらしい 1入力
    const RECENT_MS = 100;    // むきの 判定に つかう「さいきんの うごき」の まど
    // delta: うごいた px に かける ばいりつ(ゲームごとに たて だけ すこし つよく など)
    const gainX = typeof opts.gainX === 'number' ? opts.gainX : 1;
    const gainY = typeof opts.gainY === 'number' ? opts.gainY : 1;
    // delta の 端グライド: ゆびが パッドの はし(margin px いない か そと)に あって、
    // そちらへ おしつづけている あいだだけ、ゆっくり はじまり ramp ms で speed px/s
    // まで はやくなる うごきを たす。もどす・はなすと すぐ とまる。glide:false で なし
    const glide = mode === 'delta' && opts.glide !== false ? Object.assign({ margin: 14, speed: 260, ramp: 350, backPx: 6 }, opts.glide || {}) : null;
    // vector: むきは「さいごの 1イベントの むき」ではなく、まえの きめてから net で
    // DIR_PX うごいた ぶんの むき。ゆびを とめる ときの 1〜2px の ぶれでは むきが
    // かわらない(ぶれは うちけしあって net が たまらない)。dominant なら 4ほうこうに
    // スナップし、いまの じくを ゆうせん(もう いっぽうの じくが 1.3ばい つよいときだけ かわる)
    const snap4 = !!opts.dominant;
    const DIR_PX_FIRST = 4, DIR_PX = 8, VEC_PAUSE_MS = 120;
    const ZERO = { x: 0, y: 0 };
    const pad = document.createElement('div');
    pad.className = 'mg-pad mg-pad-' + mode + (opts.className ? ' ' + opts.className : '');
    const keys = axis === 'x' ? ['left', 'right'] : axis === 'y' ? ['up', 'down'] : ['left', 'right', 'up', 'down'];
    const hold = mode === 'steps' ? ' data-hold="step"' : '';
    pad.innerHTML = `<span class="mg-pad-label">${escapeHtml(opts.label || (mode === 'steps' ? 'ここを なぞって うごかす(1マスずつ)' : 'ここを なぞって うごかす'))}</span><span class="mg-pad-dot" aria-hidden="true"></span>`
      + keys.map((k) => `<button type="button" class="mg-pad-key" data-key="${k}"${hold} tabindex="-1" aria-hidden="true">${({ left: '◀', right: '▶', up: '▲', down: '▼' })[k]}</button>`).join('');
    if (opts.height) pad.style.minHeight = opts.height + 'px';
    if (opts.before && typeof host.insertBefore === 'function') host.insertBefore(pad, opts.before); else host.appendChild(pad);
    const dot = pad.querySelector('.mg-pad-dot');
    let ptr = null;
    let vec = ZERO, vecUntil = 0, stopTimer = null;
    let glideState = null, glideTimer = null, glideLast = 0;
    const keyHeld = { left: false, right: false, up: false, down: false };
    const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    // ゆびが とまったら(sticky でない とき)むきを 0 に もどして しらせる
    const notifyStop = () => { if (typeof opts.onVector === 'function') opts.onVector(0, 0, 0); };
    const setVec = (x, y) => {
      vec = { x, y }; vecUntil = performance.now() + holdMs;
      if (!sticky) { clearTimeout(stopTimer); stopTimer = setTimeout(() => { if (ptr) notifyStop(); }, holdMs); }
    };
    function keyVector() {
      const x = (keyHeld.right ? 1 : 0) - (keyHeld.left ? 1 : 0), y = (keyHeld.down ? 1 : 0) - (keyHeld.up ? 1 : 0);
      if (!x && !y) return null;
      const n = Math.hypot(x, y); return { x: x / n, y: y / n };
    }
    function vector() {
      const kv = keyVector();
      if (kv) return kv;
      if (ptr && sticky) return vec;
      return vecUntil > performance.now() ? vec : ZERO;
    }
    const held = {
      get left() { return vector().x < -0.4; }, get right() { return vector().x > 0.4; },
      get up() { return vector().y < -0.4; }, get down() { return vector().y > 0.4; },
    };
    const emitStep = (dx, dy) => { if (typeof opts.onStep === 'function') opts.onStep(dx, dy); };
    const emitDelta = (dx, dy) => { if (typeof opts.onDelta === 'function') opts.onDelta(dx * gainX, dy * gainY); };
    // うごきの ベクトルから しゅじく(よこ か たて)と むきを きめる
    const dominant = (x, y) => {
      const ax = Math.abs(x), ay = Math.abs(y);
      if (!ax && !ay) return null;
      return ax >= ay ? [Math.sign(x), 0] : [0, Math.sign(y)];
    };
    const sameDir = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];
    function moveDot(ox, oy) {
      if (!dot || !dot.style) return;
      const r = 22, n = Math.hypot(ox, oy) || 1, k = n > r ? r / n : 1;
      dot.style.transform = `translate(${(ox * k).toFixed(1)}px, ${(oy * k).toFixed(1)}px)`;
    }
    // ---- 端グライド(delta) ----
    function stopGlide() { glideState = null; if (glideTimer) { clearTimeout(glideTimer); glideTimer = null; } }
    function glideTick() {
      glideTimer = null;
      if (!ptr || !glideState || (!glideState.x && !glideState.y)) { glideState = null; return; }
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0, now - glideLast) / 1000); glideLast = now;
      const ramp = Math.min(1, (now - glideState.since) / glide.ramp);
      const v = glide.speed * (0.35 + 0.65 * ramp);
      emitDelta(glideState.x * v * dt, glideState.y * v * dt);
      glideTimer = setTimeout(glideTick, 16);
    }
    function updateGlide(e, dx, dy) {
      if (!glide || !ptr || !ptr.rect) return;
      const r = ptr.rect;
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const edgeX = axis === 'y' ? 0 : px <= glide.margin ? -1 : px >= r.width - glide.margin ? 1 : 0;
      const edgeY = axis === 'x' ? 0 : py <= glide.margin ? -1 : py >= r.height - glide.margin ? 1 : 0;
      // はしに いて、その むきへ おしている(か とまっている)あいだだけ。
      // はんたいへ backPx いじょう もどしたら やめる(1〜2px の ぶれでは やめない)
      let gx = edgeX, gy = edgeY;
      if (glideState) {
        glideState.backX = gx && dx * gx < 0 ? glideState.backX - dx * gx : 0;
        glideState.backY = gy && dy * gy < 0 ? glideState.backY - dy * gy : 0;
        if (glideState.backX >= glide.backPx) gx = 0;
        if (glideState.backY >= glide.backPx) gy = 0;
      } else {
        if (gx && dx * gx < 0) gx = 0;
        if (gy && dy * gy < 0) gy = 0;
      }
      if (!gx && !gy) { if (glideState) stopGlide(); return; }
      const now = performance.now();
      if (!glideState) {
        glideState = { x: gx, y: gy, since: now, backX: 0, backY: 0 };
        glideLast = now;
        glideTimer = setTimeout(glideTick, 16);
      } else {
        if (gx !== glideState.x || gy !== glideState.y) glideState.since = now;
        glideState.x = gx; glideState.y = gy;
      }
    }
    // ---- steps の 判定 ----
    function judgeStep(dx, dy, now) {
      const p = ptr;
      // ゆびが PAUSE_MS いじょう とまっていたら、それまでの うごきは わすれて あたらしい 1入力
      if (now - p.lastMoveAt > PAUSE_MS) { p.accX = 0; p.accY = 0; p.recent.length = 0; p.lastDir = null; }
      p.lastMoveAt = now;
      p.recent.push({ t: now, dx, dy });
      while (p.recent.length && now - p.recent[0].t > RECENT_MS) p.recent.shift();
      let rx = 0, ry = 0;
      for (const m of p.recent) { rx += m.dx; ry += m.dy; }
      p.accX += dx; p.accY += dy;
      // さいきんの うごきの しゅじくが つもった うごきと ちがう(右→上 など)なら、
      // ふるい つもりは すてて さいきんの うごきだけで 判定する
      const rd = dominant(rx, ry), ad = dominant(p.accX, p.accY);
      if (rd && ad && (rd[0] !== ad[0] || rd[1] !== ad[1]) && Math.hypot(rx, ry) >= 4) { p.accX = rx; p.accY = ry; }
      const ax = Math.abs(p.accX), ay = Math.abs(p.accY);
      let dir = dominant(p.accX, p.accY);
      if (!dir) return;
      const big = Math.max(ax, ay), small = Math.min(ax, ay);
      // 45°ちかくは まえの むきの じくを ゆうせん(ヒステリシス)。それでも まよう なら
      // もう すこし うごくまで まつ(need*1.6 うごけば しゅじくで きめる)
      let clear = small <= big * 0.7;
      if (!clear && p.lastDir) {
        const onLast = p.lastDir[0] ? p.accX : p.accY;
        if (Math.abs(onLast) >= triggerPx) { dir = p.lastDir[0] ? [Math.sign(p.accX), 0] : [0, Math.sign(p.accY)]; clear = true; }
      }
      const same = sameDir(dir, p.lastDir);
      const need = same ? repeatPx : triggerPx;
      if (!clear && big >= need * 1.6) clear = true;
      if (big < need || !clear) return;
      if (same && now - p.lastStepAt < repeatMs) return;
      emitStep(dir[0], dir[1]);
      p.lastDir = dir; p.lastStepAt = now; p.stepped = true;
      p.accX = 0; p.accY = 0; p.recent.length = 0;
    }
    pad.addEventListener('pointerdown', (e) => {
      if (e.mgSynthetic) return;
      if (e.preventDefault) e.preventDefault();
      // pointerup が とどかず ptr が のこっていても、あたらしい ゆびで すぐ うごかせる
      if (ptr) { if (ptr.id === e.pointerId) return; release(null); }
      let rect = null;
      try { rect = pad.getBoundingClientRect(); } catch (err) { rect = null; }
      const now = performance.now();
      ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: now, accX: 0, accY: 0, stepped: false, moved: 0, recent: [], lastDir: null, lastStepAt: 0, lastMoveAt: now, segX: 0, segY: 0, rect };
      try { if (e.pointerId != null && pad.setPointerCapture) pad.setPointerCapture(e.pointerId); } catch (err) {}
      pad.classList.add('active');
      moveDot(0, 0);
      if (typeof opts.onPress === 'function') opts.onPress();
    });
    pad.addEventListener('pointermove', (e) => {
      if (!ptr || e.pointerId !== ptr.id) return;
      if (e.preventDefault) e.preventDefault();
      let dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
      ptr.x = e.clientX; ptr.y = e.clientY;
      if (axis === 'x') dy = 0; else if (axis === 'y') dx = 0;
      const d = Math.hypot(dx, dy);
      ptr.moved += d;
      moveDot(e.clientX - ptr.sx, e.clientY - ptr.sy);
      if (mode === 'delta') updateGlide(e, dx, dy);
      if (d < 0.5) return;
      emitDelta(dx, dy);
      if (mode === 'steps') { judgeStep(dx, dy, performance.now()); return; }
      const now = performance.now();
      if (now - ptr.lastMoveAt > VEC_PAUSE_MS) { ptr.segX = 0; ptr.segY = 0; }
      ptr.lastMoveAt = now;
      ptr.segX += dx; ptr.segY += dy;
      const sd = Math.hypot(ptr.segX, ptr.segY);
      const has = vec.x !== 0 || vec.y !== 0;
      if (sd >= (has ? DIR_PX : DIR_PX_FIRST)) {
        let nx = ptr.segX / sd, ny = ptr.segY / sd;
        if (snap4) {
          const ax = Math.abs(nx), ay = Math.abs(ny);
          let useX = ax >= ay;
          if (vec.x && !vec.y && ay < ax * 1.3) useX = true; else if (vec.y && !vec.x && ax < ay * 1.3) useX = false;
          nx = useX ? Math.sign(nx) : 0; ny = useX ? 0 : Math.sign(ny);
        }
        setVec(nx, ny); ptr.segX = 0; ptr.segY = 0;
      } else if (has && dx * vec.x + dy * vec.y > 0) setVec(vec.x, vec.y); // おなじ むきへ うごきつづけている あいだは いきている
      if (typeof opts.onVector === 'function') opts.onVector(vec.x, vec.y, d);
    });
    const release = (e) => {
      if (!ptr || (e && e.pointerId != null && e.pointerId !== ptr.id)) return;
      const p = ptr; ptr = null;
      stopGlide();
      pad.classList.remove('active');
      moveDot(0, 0);
      const dur = performance.now() - p.t0;
      const fx = p.x - p.sx, fy = p.y - p.sy;
      // triggerPx に とどかない ごく みじかい フリックも、はなした ときに 1マス
      if (mode === 'steps' && !p.stepped && Math.hypot(fx, fy) >= 6) {
        if (Math.abs(fx) >= Math.abs(fy) && axis !== 'y') emitStep(Math.sign(fx), 0); else if (axis !== 'x') emitStep(0, Math.sign(fy));
      } else if (p.moved < 6 && dur < 320 && typeof opts.onTap === 'function') opts.onTap();
      vec = ZERO; vecUntil = 0; clearTimeout(stopTimer);
      notifyStop();
      if (typeof opts.onRelease === 'function') opts.onRelease();
    };
    pad.addEventListener('pointerup', release);
    pad.addEventListener('pointercancel', release);
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    // PC の キーボード(合成 pointerdown/up が data-key ボタンに とどく)
    for (const btn of pad.querySelectorAll('.mg-pad-key')) {
      const k = btn.dataset.key;
      btn.addEventListener('pointerdown', (e) => {
        if (e.preventDefault) e.preventDefault();
        if (mode === 'steps') emitStep(DIRS[k][0], DIRS[k][1]);
        else { keyHeld[k] = true; if (typeof opts.onVector === 'function') { const v = keyVector(); if (v) opts.onVector(v.x, v.y, stepPx); } if (mode === 'delta') emitDelta(DIRS[k][0] * stepPx, DIRS[k][1] * stepPx); }
      });
      const up = () => { keyHeld[k] = false; if (typeof opts.onVector === 'function') { const v = keyVector(); opts.onVector(v ? v.x : 0, v ? v.y : 0, 0); } };
      btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up);
    }
    return {
      el: pad, vector, held,
      get active() { return !!ptr; },
      get gliding() { return !!glideState; },
      destroy() { stopGlide(); document.removeEventListener('pointerup', release, true); document.removeEventListener('pointercancel', release, true); if (pad.remove) pad.remove(); },
    };
  }
  // タッチパッドと アクションボタンを よこに ならべる いれもの
  function createPadRow(container, buttonsHTML) {
    const row = document.createElement('div');
    row.className = 'mg-pad-row';
    if (buttonsHTML) row.innerHTML = `<div class="mg-pad-actions">${buttonsHTML}</div>`;
    container.appendChild(row);
    return row;
  }


return {createTouchPad,createPadRow};
};
