// Real-browser illustration audit, called by home-layout-browser.cjs in CI.
// Saves use the existing fixture format. Navigation and games use shipped UI;
// the only injected UI is a catalog of source glyphs under the real observer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const LIFE_LOG = [
  {age:0, icon:'🥚', text:'たまごがやってきた'},
  {age:0, icon:'🏠', text:'おうちでくらしはじめた'},
  {age:1, icon:'👶', text:'よちよちになった!'},
  {age:2, icon:'💊', text:'かぜがなおった'},
  {age:4, icon:'🌙', text:'よるはゆっくりねむった'},
  {age:5, icon:'🧒', text:'子どもになった!'},
  {age:8, icon:'🧒', text:'てんごくへたびだった'},
];

function scene(fixtures, stage, past) {
  const save = JSON.parse(JSON.stringify(fixtures.alone));
  Object.assign(save, {stage, speciesLine:'woman', stageIndex:2, ageTicks:160,
    sodachi:38, maxSodachi:38, health:90, hunger:90, energy:100, happiness:90,
    growth:0, decline:0, deathMeter:0, dying:false, dyingTicks:0,
    isSleeping:false, isSick:false, sicknessType:null, totalSicknessCount:1,
    gender:'female', partner:null, companions:[], regionId:'home', infinite:false,
    transformOptions:null, savedAt:Date.now(),
    lifeLog:JSON.parse(JSON.stringify(stage === 'dead' ? LIFE_LOG : LIFE_LOG.slice(0, -1))),
  });
  Object.assign(save.lifetime, {timeMode:'night', weatherMode:'sunny', seasonMode:'autumn',
    minigameRecords:{'pinball-physics':{best:92,last:84}},
    minigamePlayCounts:{'pinball-physics':4}, pastLives:past ? [past] : [],
  });
  return save;
}

function sourceCorpus() {
  const root = path.resolve(__dirname, '..');
  // Every shipped root script/style/page, including the separate symbol art
  // modules. Test fixtures and documentation are deliberately not UI sources.
  const files = fs.readdirSync(root, {withFileTypes:true})
    .filter(file => file.isFile() && /\.(?:js|css|html)$/.test(file.name))
    .map(file => file.name).sort();
  return {files, text:files.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')};
}

function installCanvasAudit() {
  const audit = globalThis.__displayCanvasAudit = {phase:'boot', raw:[], fills:{}, draws:{}};
  const prototype = globalThis.CanvasRenderingContext2D?.prototype;
  if (!prototype) return;
  const fillText = prototype.fillText, drawImage = prototype.drawImage;
  prototype.fillText = function(text, ...args) {
    const id = this.canvas?.id || '(offscreen)', value = String(text);
    audit.fills[id] = (audit.fills[id] || 0) + 1;
    const tokens = globalThis.NaotocchiDisplayIllustrations?.tokens;
    const raw = tokens ? tokens(value) : /[\uE000\u20E3]|\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value);
    if ((Array.isArray(raw) ? raw.length : raw) && audit.raw.length < 100) {
      if (!audit.raw.some(entry => entry.phase === audit.phase && entry.canvas === id && entry.text === value)) {
        audit.raw.push({phase:audit.phase, canvas:id, text:value});
      }
    }
    return fillText.call(this, text, ...args);
  };
  prototype.drawImage = function(...args) {
    const id = this.canvas?.id || '(offscreen)';
    audit.draws[id] = (audit.draws[id] || 0) + 1;
    return drawImage.apply(this, args);
  };
}

async function settle(page) {
  // Two paints allow both the display observer and subsequent image/layout
  // updates to finish; no game clocks or rendering functions are replaced.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function visibleEmoji(page, selector = '#device') {
  return page.evaluate(selector => {
    const root = document.querySelector(selector);
    if (!root) throw Error('Missing audit root: ' + selector);
    const tokenize = globalThis.NaotocchiDisplayIllustrations?.tokens;
    if (!tokenize) throw Error('Display tokenizer was not loaded');
    const misses = [], styles = new WeakMap();
    const styleOf = element => {
      if (!styles.has(element)) styles.set(element, getComputedStyle(element));
      return styles.get(element);
    };
    const hidden = element => {
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const style = styleOf(ancestor);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse'
          || Number(style.opacity) === 0 || style.contentVisibility === 'hidden') return true;
      }
      return false;
    };
    const painted = (rect, element) => {
      let left = Math.max(0, rect.left), right = Math.min(innerWidth, rect.right);
      let top = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom);
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const style = styleOf(ancestor), clip = ancestor.getBoundingClientRect();
        if (/^(auto|scroll|hidden|clip)$/.test(style.overflowX)) { left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
        if (/^(auto|scroll|hidden|clip)$/.test(style.overflowY)) { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
      }
      return right - left > .1 && bottom - top > .1;
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode());) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,textarea,input,option,canvas') || hidden(parent)) continue;
      let offset = 0;
      for (const token of tokenize(node.nodeValue)) {
        const index = node.nodeValue.indexOf(token, offset); offset = index + token.length;
        const range = document.createRange(); range.setStart(node, index); range.setEnd(node, offset);
        if ([...range.getClientRects()].some(rect => painted(rect, parent))) {
          misses.push({token, parent:parent.id || parent.className || parent.tagName, text:node.nodeValue.slice(0, 120)});
        }
      }
    }
    return misses;
  }, selector);
}

async function loadedImages(page, selector) {
  await page.waitForFunction(selector => [...document.querySelectorAll(selector + ' img')].every(image => image.complete), selector);
  const broken = await page.locator(selector + ' img').evaluateAll(images => images
    .filter(image => !(image.naturalWidth > 0 && image.naturalHeight > 0))
    .map(image => image.currentSrc || image.src));
  assert.deepEqual(broken, [], selector + ': illustration images must load');
}

module.exports = async function checkAllDisplay(browser, engine, fixtures, baseURL, output) {
  fs.mkdirSync(output, {recursive:true});
  const results = [], errors = [], started = Date.now();
  const corpus = sourceCorpus();
  let lifeCode, past;
  async function contextFor(save) {
    const context = await browser.newContext({viewport:{width:390,height:844}, deviceScaleFactor:1, reducedMotion:'reduce'});
    const page = await context.newPage();
    page.setDefaultTimeout(4500); page.setDefaultNavigationTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(installCanvasAudit);
    await page.addInitScript(save => localStorage.setItem('naotocchi-save-v1', JSON.stringify(save)), save);
    return {context,page};
  }
  async function audit(page, phase, selector = '#device', screenshot = false) {
    await settle(page);
    const missing = await visibleEmoji(page, selector);
    results.push({phase, visibleEmoji:missing});
    assert.deepEqual(missing, [], engine + ' ' + phase + ': visible text still contains emoji');
    assert.deepEqual(errors, [], engine + ' ' + phase + ': browser runtime errors');
    if (screenshot) await page.screenshot({path:path.join(output, engine + '-display-' + phase + '.png')});
  }
  async function menu(page, button, overlay) {
    await page.locator('#menuBtn').click();
    await page.locator(button).click();
    await page.locator(overlay).waitFor({state:'visible'});
  }

  try {
    const dead = await contextFor(scene(fixtures, 'dead'));
    try {
      await dead.page.goto(baseURL);
      // The real render opens this automatically for a dead save.
      await dead.page.locator('#lifeCardOverlay').waitFor({state:'visible'});
      await dead.page.evaluate(() => document.fonts.ready);
      await loadedImages(dead.page, '#lifeCardBody');
      assert.equal(await dead.page.locator('#lifeCardBody .lifecard-title img[src$="/woman/03.png"]').count(), 1,
        'life card keeps the exact final woman/03 portrait');
      assert.ok(await dead.page.locator('#lifeCardBody [data-care-icon="medicine"]').count() > 0,
        'medicine timeline entry uses the medicine illustration');
      assert.match(await dead.page.locator('#lifeCardBody').textContent(), /ピンボール.*92/);
      await audit(dead.page, 'life-card', '#device', true);
      await dead.page.locator('#lifeCardCodeBtn').click();
      lifeCode = await dead.page.locator('#lifeCardCodeText').inputValue();
      assert.match(lifeCode, /^NTL1\.[A-Za-z0-9_-]+$/, 'real copy-code button creates a life code');
      past = JSON.parse(Buffer.from(lifeCode.slice(5), 'base64url').toString('utf8'));
      assert.equal(past.line, 'woman'); assert.equal(past.age, 8);
      assert.deepEqual(past.log, LIFE_LOG, 'code retains all original timeline data');
      await audit(dead.page, 'life-card-code');
    } catch (error) {
      await dead.page.screenshot({path:path.join(output, engine + '-display-life-card-failure.png')}).catch(() => {});
      throw error;
    } finally { await dead.context.close(); }

    const alive = await contextFor(scene(fixtures, 'growing', {...past, code:lifeCode}));
    const page = alive.page;
    try {
      await page.goto(baseURL); await page.locator('.device.ui-home-active').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await audit(page, 'home');

      await menu(page, '#gamesBtn', '#achOverlay');
      await audit(page, 'games', '#device', true);
      assert.ok(await page.locator('#gameListGrid .game-cell[data-game-id]').count() >= 80, 'full game list is populated');
      const headings = page.locator('#gameListGrid .game-section-title');
      assert.equal(await headings.count(), 6, 'all six game genres are rendered');
      for (let index = 0; index < await headings.count(); index++) {
        await headings.nth(index).scrollIntoViewIfNeeded(); await audit(page, 'genre-' + index);
      }
      for (const sort of ['unplayed','low','high','genre']) {
        await page.locator('#gameListGrid .game-list-sort[data-sort="' + sort + '"]').click();
        await audit(page, 'games-sort-' + sort);
        await page.locator('#gameListGrid').evaluate(element => { element.scrollTop = element.scrollHeight; });
        await audit(page, 'games-sort-' + sort + '-end');
      }
      await page.locator('#achTabs [data-tab="ach"]').click(); await audit(page, 'achievements');
      await page.locator('#achTabs [data-tab="games"]').click(); await audit(page, 'games-tab');
      await page.locator('#achCloseBtn').click();

      await page.locator('#profileBtn').click(); await audit(page, 'profile');
      await page.locator('#profileTimeline').scrollIntoViewIfNeeded(); await audit(page, 'timeline', '#device', true);
      await page.locator('#profilePastLives .past-life summary').click();
      await loadedImages(page, '#profilePastLives');
      assert.equal(await page.locator('#profilePastLives summary img[src$="/woman/03.png"]').count(), 1);
      await audit(page, 'past-life', '#device', true);
      await page.locator('#lifeCodeInput').fill(lifeCode); await page.locator('#lifeCodeViewBtn').click();
      await page.locator('#lifeCodeView').waitFor({state:'visible'});
      await page.locator('#lifeCodeView').scrollIntoViewIfNeeded(); await audit(page, 'imported-life-card');
      await page.locator('#profileCloseBtn').click();

      await menu(page, '#worldBtn', '#worldOverlay'); await audit(page, 'world', '#device', true);
      for (const id of ['timeModeGrid','seasonModeGrid','weatherModeGrid','gameLengthGrid','locationRefreshBtn']) {
        await page.locator('#' + id).scrollIntoViewIfNeeded(); await audit(page, 'world-' + id);
      }
      await page.locator('#worldCloseBtn').click();

      await menu(page, '#stickerBtn', '#stickerOverlay');
      for (const id of ['home','travel','friends','memory']) {
        await page.locator('#stickerPageTabs [data-page="' + id + '"]').click();
        assert.equal(await page.locator('#stickerBoard').getAttribute('data-page'), id);
        await audit(page, 'stickers-' + id, '#device', id === 'memory');
      }
      await page.locator('#stickerFilter [data-filter="scenery"]').click();
      await audit(page, 'sticker-scenery'); await page.locator('#stickerCloseBtn').click();

      await page.locator('#commBtn').click(); await audit(page, 'communication', '#device', true);
      await page.locator('#makeCodeBtn').click();
      assert.ok((await page.locator('#myCodeBox').inputValue()).length > 30, 'communication code is generated by its real button');
      await audit(page, 'communication-code');
      await page.locator('#openDuelBtn').click(); await audit(page, 'duel-home');
      await page.locator('#duelCloseBtn').click(); await page.locator('#commCloseBtn').click();

      const glyphs = await page.evaluate(text => [...new Set([...NaotocchiDisplayIllustrations.tokens(text), '\uE000'])], corpus.text);
      assert.ok(glyphs.length > 200, 'catalog covers the full shipped source inventory');
      await page.evaluate(glyphs => {
        const section = document.createElement('section'); section.id = 'displayCatalogAudit';
        section.setAttribute('aria-label', 'Illustration catalog');
        Object.assign(section.style, {position:'fixed', inset:'12px', zIndex:'100000', overflow:'auto',
          display:'grid', gridTemplateColumns:'repeat(10, 1em)', gridAutoRows:'1em', alignContent:'start',
          gap:'8px', padding:'12px', background:'#fffaf0', color:'#443b36', fontSize:'26px', lineHeight:'1',
          boxSizing:'border-box', margin:'0'});
        for (const glyph of glyphs) {
          const cell = document.createElement('span'); cell.className = 'display-catalog-cell';
          cell.style.cssText = 'display:block;width:1em;height:1em;font-size:inherit;line-height:1';
          cell.textContent = glyph; section.appendChild(cell);
        }
        document.getElementById('device').appendChild(section);
      }, glyphs);
      await settle(page); await loadedImages(page, '#displayCatalogAudit');
      const catalog = await page.locator('#displayCatalogAudit').evaluate(section => ({
        text:section.textContent,
        cells:[...section.children].map(cell => {
          const icons = cell.querySelectorAll('.display-icon'), icon = icons[0], em = parseFloat(getComputedStyle(cell).fontSize);
          const rect = icon?.getBoundingClientRect();
          const oversized = [...cell.querySelectorAll('img,svg')].some(image => {
            const r = image.getBoundingClientRect(); return r.width > em + 1 || r.height > em + 1;
          });
          return {glyph:cell.textContent, count:icons.length, em, width:rect?.width, height:rect?.height, oversized};
        }),
      }));
      assert.equal(catalog.text, glyphs.join(''), 'catalog decoration preserves exact source text');
      const invalid = catalog.cells.filter(cell => cell.count !== 1 || !(cell.width > 0 && cell.height > 0)
        || cell.width > cell.em + 1 || cell.height > cell.em + 1 || cell.oversized);
      assert.deepEqual(invalid, [], 'each known source glyph renders in its original 1em box');
      results.push({phase:'catalog-inventory', files:corpus.files, count:glyphs.length});
      await audit(page, 'catalog', '#displayCatalogAudit', true);
      await page.locator('#displayCatalogAudit').evaluate(section => section.remove());

      for (const [id, canvas, control] of [
        ['road-themed','lrCanvas','lrLeft'], ['slide-puzzle','spCanvas','spPeek'],
        ['race-3d','rcCanvas','rcAccel'], ['jump-quest','jqCanvas','jqJump'],
      ]) {
        await page.evaluate(id => { globalThis.__displayCanvasAudit.phase = id; }, id);
        await menu(page, '#gamesBtn', '#achOverlay');
        await page.locator('#gameListGrid .game-list-sort[data-sort="genre"]').click();
        await page.locator('#gameListGrid .game-cell[data-game-id="' + id + '"]').click();
        await page.locator('#minigameOverlay').waitFor({state:'visible'});
        if (await page.locator('#mgIntroStart').isVisible()) {
          await audit(page, id + '-intro'); await page.locator('#mgIntroStart').click();
        }
        await page.locator('#' + canvas).waitFor({state:'visible'});
        // Held controls remain down across the app's brief action-start grace.
        await page.locator('#' + control).click({delay:800});
        await page.waitForFunction(canvas => globalThis.__displayCanvasAudit.draws[canvas] > 0, canvas);
        await audit(page, id, '#device', id === 'slide-puzzle' || id === 'race-3d');
        await page.locator('#mgHelpBtn').click(); await audit(page, id + '-help');
        await page.locator('#mgHelpCloseBtn').click();
        await page.locator('#mgQuitBtn').click(); await page.locator('#mgQuitYesBtn').click();
        await page.locator('.device.ui-home-active').waitFor();
      }
      const canvas = await page.evaluate(() => globalThis.__displayCanvasAudit);
      results.push({phase:'canvas', ...canvas});
      assert.deepEqual(canvas.raw, [], 'native fillText must never receive raw emoji, including offscreen puzzle art');
      assert.ok(canvas.draws['(offscreen)'] > 0, 'slide picture actually paints illustrated assets into its offscreen canvas');
      assert.deepEqual(errors, [], engine + ': browser runtime errors');
      console.log('PASS ' + engine + '-all-display (' + glyphs.length + ' source glyphs)');
    } catch (error) {
      results.push({phase:'failure', message:error.message});
      const canvas = await page.evaluate(() => globalThis.__displayCanvasAudit).catch(() => null);
      if (canvas) results.push({phase:'canvas-at-failure', ...canvas});
      await page.screenshot({path:path.join(output, engine + '-display-failure.png')}).catch(() => {});
      throw error;
    } finally { await alive.context.close(); }
  } finally {
    fs.writeFileSync(path.join(output, engine + '-display-audit.json'), JSON.stringify({
      durationMs:Date.now() - started, results, pageErrors:errors,
    }, null, 2));
  }
};
