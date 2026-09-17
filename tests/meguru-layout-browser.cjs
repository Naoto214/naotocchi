// めぐるの がめんが きりとられて いない ことを、ほんものの HTML/CSS で たしかめる。
//
// せかい表示(world-mode)では ほんたいが グリッドに なり、めぐるの がめんが 入る
// .screen-frame は その 1行 + overflow:auto に なる。ここに 1px でも はみ出すと
// いちばん したに ある パッドと「もどる」の わくの 下が きりとられ、実機では
// 「わくが 全部 写らず、下が とうめいな ところに かさなる」ように 見える。
// canvas の たかさを きめる ときに ほんたいの max-height しか 見て いなかった ため、
// .screen の よはくと グリッドの すきまの ぶん(13px ほど)を いつも はみ出して いた。
const assert = require('node:assert/strict');
const path = require('node:path');

// overlay の したが どこで きりとられるかを、ブラウザの なかで はかる
function measureMeguru() {
  const overlay = document.getElementById('meguruOverlay');
  if (!overlay || overlay.classList.contains('hidden')) return { open: false };
  const rect = (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; };
  // きりとる はこ(overflow が visible では ない もの)の 内がわの 下端。
  // あいだの はこの よはく(padding/border)も ひく
  let limit = Infinity, extra = 0;
  const clippers = [];
  for (let node = overlay.parentElement; node && node.nodeType === 1 && node !== document.documentElement; node = node.parentElement) {
    const cs = getComputedStyle(node), r = node.getBoundingClientRect();
    const bT = parseFloat(cs.borderTopWidth) || 0, bB = parseFloat(cs.borderBottomWidth) || 0, pB = parseFloat(cs.paddingBottom) || 0;
    if (!/^visible/.test(cs.overflowY || 'visible') && node.clientHeight > 0) {
      const inner = r.top + bT + node.clientHeight - pB - extra;
      clippers.push({ name: node.id || String(node.className).split(' ')[0], overflowY: cs.overflowY, inner, scrollOver: node.scrollHeight - node.clientHeight });
      if (inner < limit) limit = inner;
    }
    extra += pB + bB;
  }
  let childBottom = 0;
  for (const ch of overlay.children) { const b = ch.getBoundingClientRect().bottom; if (b > childBottom) childBottom = b; }
  const pad = document.querySelector('#meguruOverlay .mg-pad');
  const home = document.getElementById('mgrHome');
  const canvas = document.getElementById('mgrCanvas');
  return {
    open: true, world: document.body.classList.contains('world-mode'),
    viewport: innerHeight, limit: Number.isFinite(limit) ? limit : null, childBottom,
    overflow: Number.isFinite(limit) ? childBottom - limit : 0,
    clippers, overlay: rect(overlay),
    canvas: canvas ? rect(canvas) : null, pad: pad ? rect(pad) : null, home: home ? rect(home) : null,
    // canvas と ヒントの あいだに ぽっかり あいた すきまが ないか(ちぢめすぎの しるし)
    gapAfterCanvas: canvas && document.getElementById('mgrHint')
      ? Math.round(document.getElementById('mgrHint').getBoundingClientRect().top - canvas.getBoundingClientRect().bottom) : 0,
  };
}

module.exports = async function (browser, engine, fixtures, baseURL, output, onlyNames) {
  const results = [];
  for (const [name, width, height, fixture] of [
    ['sea', 393, 852, 'world_sea'],
    ['sea-night', 390, 844, 'world_sea_night'],
    ['forest-small', 375, 667, 'world_forest'],
    ['deepsea-short', 360, 640, 'world_deepsea'],
    ['desert-tall', 430, 932, 'world_desert'],
  ]) {
    if (onlyNames && !onlyNames.includes(name)) continue;
    const label = engine + '-meguru-' + name;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    const save = JSON.parse(JSON.stringify(fixtures[fixture]));
    Object.assign(save, { health: 100, energy: 100, hunger: 85, happiness: 90, isSick: false, isSleeping: false });
    await page.addInitScript((s) => localStorage.setItem('naotocchi-save-v1', JSON.stringify(s)), save);
    try {
      await page.goto(baseURL);
      await page.locator('.device.ui-home-active').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('#travelBtn').click();
      await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' });
      await page.locator('#meguruEnterBtn').click();
      await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
      // ならびが おちつく(つぎの フレームで もう いちど 組みなおす)まで まつ。
      // エンジンに よって おそい ことが ある ので、はみ出して いたら もう いちど まつ
      await page.waitForTimeout(700);
      let m = await page.evaluate(measureMeguru);
      if (!m.open || m.overflow > 1) { await page.waitForTimeout(900); m = await page.evaluate(measureMeguru); }
      results.push({ label, ...m });
      assert.equal(m.open, true, label + ': めぐるの がめんが ひらいて いない');
      assert.equal(m.world, true, label + ': せかい表示に なって いない(この しらべ の いみが なくなる)');
      // ① どの きりとる はこにも はみ出して いない
      assert.ok(m.overflow <= 1, label + `: がめんの したが ${Math.round(m.overflow)}px きりとられて いる ` + JSON.stringify(m.clippers));
      for (const c of m.clippers) assert.ok(c.scrollOver <= 1, label + `: ${c.name} が ${c.scrollOver}px スクロールする(下が かくれる)`);
      // ② パッドと「もどる」は わくごと がめんの なかに ある
      for (const [key, el] of [['パッド', m.pad], ['もどる', m.home]]) {
        assert.ok(el, label + `: ${key} が ない`);
        assert.ok(el.bottom <= m.viewport + 1, label + `: ${key} が がめんの 下に ${Math.round(el.bottom - m.viewport)}px はみ出す`);
        assert.ok(el.bottom <= m.limit + 1, label + `: ${key} の わくの 下が ${Math.round(el.bottom - m.limit)}px きりとられる`);
      }
      // ③ ちぢめすぎて canvas と ヒントの あいだに すきまが あいて いない
      // ちぢめすぎると 60〜80px の すきまが あく。エンジンごとの すこしの さは ゆるす
      assert.ok(m.gapAfterCanvas <= 40, label + `: canvas の 下に ${m.gapAfterCanvas}px の すきま(ちぢめすぎ)`);
      assert.ok(m.canvas && m.canvas.height >= 220, label + ': canvas が 小さすぎる ' + (m.canvas && m.canvas.height));
      assert.deepEqual(errors, [], label + ': browser runtime errors');
      console.log('PASS ' + label);
    } catch (error) {
      console.error('FAIL ' + label + ': ' + error.message);
      await page.screenshot({ path: path.join(output, label + '-failure.png') }).catch(() => {});
      throw error;
    } finally { await context.close(); }
  }
  return results;
};
