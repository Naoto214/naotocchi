// Real browser regression: freeze the production Web Animations, then check
// paint/hit order at the rendered image, not just its DOM/style declarations.
const { chromium } = require(process.env.SLIDE08_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(process.env.PAINT_OUT || path.join(__dirname, '../qa-paint'));
const base = process.env.QA_BASE || 'http://127.0.0.1:8765';
const summary = [];
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] });
  try {
    for (const dir of ['left', 'up', 'right', 'down']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const page = await context.newPage();
      if (process.env.PAINT_SOURCE_DIR) {
        for (const file of ['player.css', 'player.mjs']) {
          await page.route(`**/slide08/${file}`, route => route.fulfill({
            contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript',
            body: fs.readFileSync(path.join(process.env.PAINT_SOURCE_DIR, file), 'utf8'),
          }));
        }
      }
      page.on('pageerror', e => failures.push(e.message));
      await page.goto(base + '/prototypes/slide08/player.html');
      await page.waitForFunction(() => !document.querySelector('#start').disabled);
      await page.click('#start');
      await page.locator('#game').waitFor({ state: 'visible' });
      // Use the existing validated save/restore route, with a deliberately sparse
      // board. No production debug hooks or replacement animation implementation.
      const fixture = await page.evaluate(async dir => {
        const { lines, step } = await import('./engine.mjs');
        const { slideMoves } = await import('./animation.mjs');
        const key = 'naopoyo-slide-player-v1';
        const data = JSON.parse(localStorage.getItem(key));
        const s = data.snapshot;
        const board = Array(36).fill(0), lanes = lines(6, dir);
        board[lanes[0][4]] = 1; board[lanes[0][5]] = 1;
        board[lanes[1][5]] = 2; // First pair -> 02 -> second evolution wave.
        board[lanes[4][3]] = 17;
        s.state.board = board;
        s.previous = null; s.practice = true;
        localStorage.setItem(key, JSON.stringify(data));
        const result = step(s.state, { type: 'slide', dir });
        return { data, moves: slideMoves(board, 6, dir).filter(m => m.from !== m.to), result };
      }, dir);
      assert.ok(fixture.result.valid && fixture.result.waves.length >= 2, 'fixture includes evolution + chain');
      await page.addInitScript(data => localStorage.setItem('naopoyo-slide-player-v1', JSON.stringify(data)), fixture.data);
      await page.reload();
      await page.click('#restore');
      await page.getByRole('button', { name: '再開', exact: true }).click();
      await page.evaluate(async () => {
        await Promise.all([...document.querySelectorAll('#board img')].map(i => i.decode()));
        window.paintAnimations = [];
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (...args) {
          const a = animate.apply(this, args);
          if (this.closest('#board')) { a.pause(); a.currentTime = 0; window.paintAnimations.push(a); }
          return a;
        };
      });
      // Real pointer swipe exercises the input path, in every direction.
      const b = await page.locator('#board').boundingBox();
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      await page.mouse.move(x, y); await page.mouse.down();
      await page.mouse.move(x + ({ left: -60, right: 60 }[dir] || 0), y + ({ up: -60, down: 60 }[dir] || 0), { steps: 5 });
      await page.mouse.up();
      await page.waitForFunction(() => window.paintAnimations.length > 0);
      if (process.env.PAINT_MUTANT) {
        const css = {
          'foreground': '#board .tile { z-index: auto; }',
          'cell-context': '#board button { isolation: isolate; }',
          'cell-clip': '#board button { overflow: hidden; }',
        }[process.env.PAINT_MUTANT];
        assert.ok(css, 'unknown paint mutation');
        await page.addStyleTag({ content: css });
      }
      for (const [name, width, height, time] of [
        ['start', 390, 844, 0], ['middle', 390, 844, 140],
        ['rotated-middle', 844, 390, 140], ['small-middle', 667, 320, 140],
        ['returned-middle', 390, 844, 140], ['end', 390, 844, 279.999],
      ]) {
        await page.setViewportSize({ width, height });
        const result = await page.evaluate(async ({ time, moves }) => {
          for (const a of window.paintAnimations) a.currentTime = time;
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const cells = [...document.querySelector('#board').children];
          const observations = moves.map(({ from, to }) => {
            const img = cells[to].querySelector('img');
            const animation = window.paintAnimations.find(a => a.effect.target === img || a.effect.target.contains(img));
            if (!animation) throw Error(`Missing production animation ${from}->${to} at ${time}ms`);
            const rect = img.getBoundingClientRect(), origin = cells[from].getBoundingClientRect(), dest = cells[to].getBoundingClientRect();
            const progress = animation.effect.getComputedTiming().progress;
            const expected = { x: origin.x + (dest.x - origin.x) * progress, y: origin.y + (dest.y - origin.y) * progress };
            // Enabling hit testing changes no pixels; background occlusion/clipping
            // then produces the same paint ordering at these interior sample points.
            img.style.pointerEvents = 'auto';
            const visible = [.2, .5, .8].every(dx => [.2, .5, .7].every(dy => document.elementFromPoint(rect.x + rect.width * dx, rect.y + rect.height * dy) === img));
            img.style.pointerEvents = '';
            return { from, to, visible, positionError: Math.max(Math.abs(rect.x - expected.x), Math.abs(rect.y - expected.y)), loaded: img.complete && img.naturalWidth > 0 };
          });
          const squares = cells.every(c => { const r = c.getBoundingClientRect(); return Math.abs(r.width - r.height) < 1; });
          return { observations, squares, durations: window.paintAnimations.map(a => a.effect.getTiming().duration) };
        }, { time, moves: fixture.moves });
        await page.screenshot({ path: path.join(out, `${dir}-${name}.png`) });
        // Hit-testing alone cannot see noninteractive opaque backgrounds (.busy
        // disables their pointer events). Compare actual raster pixels with the
        // SAME frame raised above all cells. Correct foreground order is invariant.
        const painted = await page.locator('#board').screenshot();
        await page.evaluate(() => {
          for (const cell of document.querySelector('#board').children) {
            cell.dataset.paintStyle = cell.getAttribute('style') || '';
            Object.assign(cell.style, { isolation: 'auto', overflow: 'visible', zIndex: 'auto', transform: 'none', filter: 'none' });
          }
          for (const img of document.querySelectorAll('#board img')) {
            const visual = img.closest('.tile') || img;
            visual.dataset.paintZ = visual.style.zIndex;
            visual.style.zIndex = '20';
          }
        });
        const foreground = await page.locator('#board').screenshot();
        await page.evaluate(() => {
          for (const cell of document.querySelector('#board').children) {
            cell.setAttribute('style', cell.dataset.paintStyle);
            delete cell.dataset.paintStyle;
          }
          for (const img of document.querySelectorAll('#board img')) {
            const visual = img.closest('.tile') || img;
            visual.style.zIndex = visual.dataset.paintZ;
            delete visual.dataset.paintZ;
          }
        });
        result.paintMatchesForeground = painted.equals(foreground);
        check(result.paintMatchesForeground, `${dir}/${name}: raster differs from unobscured foreground`);
        check(result.squares, `${dir}/${name}: nonsquare cell`);
        check(result.durations.every(d => d === 280), `${dir}/${name}: duration`);
        for (const o of result.observations) {
          check(o.visible, `${dir}/${name}: hidden ${o.from}->${o.to}`);
          check(o.positionError < 1, `${dir}/${name}: resize drift ${o.positionError}`);
          check(o.loaded, `${dir}/${name}: broken image`);
        }
        summary.push({ dir, name, width, height, time, ...result });
      }
      await page.evaluate(() => window.paintAnimations.forEach(a => a.finish()));
      await page.waitForFunction(() => document.querySelector('#board .pulse'));
      // The cell itself must not become a stacking context during evolution.
      const effect = await page.evaluate(() => [...document.querySelectorAll('#board .pulse')].map(c => ({ transform: getComputedStyle(c).transform, filter: getComputedStyle(c).filter })));
      check(effect.every(e => e.transform === 'none' && e.filter === 'none'), `${dir}: evolution traps foreground in cell stacking context`);
      await page.waitForFunction(() => !document.body.classList.contains('busy'));
      const final = await page.evaluate(() => JSON.parse(localStorage.getItem('naopoyo-slide-player-v1')).snapshot.state);
      assert.deepEqual(final, fixture.result.state, 'animation must preserve engine result');
      await page.screenshot({ path: path.join(out, `${dir}-settled.png`) });
      await context.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ summary, failures }, null, 2));
  assert.deepEqual(failures, []);
  console.log(`PASS paint: ${summary.length} frames, four directions, multistep travel, resize/rotation, evolution chains`);
})().catch(e => { console.error(e); process.exit(1); });
