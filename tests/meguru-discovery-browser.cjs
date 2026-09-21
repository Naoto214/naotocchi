// めぐるの「みつけた しらせ」を、ほんものの HTML/CSS で iPhone の おおきさ ぶん しらべる。
//
// ここで みるのは 2つ:
//   ① しらせが がめんから はみ出して いない / ほかの ボタンに かぶって いない
//   ② しらせと した の そうさ せつめいが まざって 見えない(しらせの あいだ は よわめる)
// しらべる ばめんは、ふつうの ばしょ・おおきな めじるし・ひみつ・いちどに いくつも・
// 2かいめ・あるいて いる とき・その ばの ボタンが 出て いる とき の 7つ。
const assert = require('node:assert/strict');
const path = require('node:path');

// しらせの はこ と まわりの ならびを ブラウザの なかで はかる
function measure() {
  const ov = document.getElementById('meguruOverlay');
  const toast = document.getElementById('mgrFoundToast');
  const card = toast && toast.querySelector('.mgr-found-card');
  const hint = document.getElementById('mgrHint');
  const canvas = document.getElementById('mgrCanvas');
  const mapBtn = document.getElementById('mgrMap');
  const act = document.getElementById('mgrTalk');
  const banner = document.getElementById('mgrBanner');
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
  const visible = (e) => !!e && !e.classList.contains('hidden') && e.getClientRects().length > 0;
  const overlap = (a, b) => (!a || !b ? 0 : Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)));
  const tr = r(card), cv = r(canvas), mb = r(mapBtn);
  const title = document.getElementById('mgrFoundTitle');
  const sub = document.getElementById('mgrFoundSub');
  return {
    shown: visible(toast),
    title: title ? title.textContent : '', sub: sub ? sub.textContent : '',
    cls: toast ? toast.className : '',
    bannerShown: visible(banner), bannerText: banner ? banner.textContent : '',
    actShown: visible(act), actText: act ? act.textContent : '',
    hintQuiet: !!hint && hint.classList.contains('mgr-hint-quiet'),
    hintText: hint ? hint.textContent : '',
    hintOpacity: hint ? Number(getComputedStyle(hint).opacity) : 1,
    toasts: document.querySelectorAll('#meguruOverlay .mgr-found:not(.hidden)').length,
    pageOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    // canvas の そと へ どれだけ 出て いるか(+ が はみ出し)
    out: tr && cv ? { left: cv.left - tr.left, right: tr.right - cv.right, top: cv.top - tr.top, bottom: tr.bottom - cv.bottom } : null,
    viewportOut: tr ? { left: -tr.left, right: tr.right - innerWidth, bottom: tr.bottom - innerHeight, top: -tr.top } : null,
    mapOverlap: overlap(tr, mb),
    actOverlap: overlap(tr, r(act)),
    hintOverlap: overlap(tr, r(hint)),
    padOverlap: overlap(tr, r(document.querySelector('#meguruOverlay .mg-pad'))),
    // もじが きられて いない(2ぎょうまで。それ いじょうは CSS が つめる)
    titleClipped: title ? title.scrollHeight - title.clientHeight > 1 : false,
    subClipped: sub ? sub.scrollWidth - sub.clientWidth > 1 : false,
    overlayScroll: ov ? ov.scrollHeight - ov.clientHeight : 0,
  };
}

// その スポットの まんなかへ 立って、しらせが 出る まで フレームを すすめる
async function goTo(page, spotId) {
  return page.evaluate(async (id) => {
    const run = window.__meguruRun;
    const q = run.world.spots.find((s) => s.id === id);
    if (!q) return false;
    run.setPlayer(q.x, q.z);
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      if (!document.getElementById('mgrFoundToast').classList.contains('hidden')) return true;
    }
    return false;
  }, spotId);
}
// いま たまって いる しらせを ぜんぶ 出しきる
const drain = (page) => page.evaluate(async () => {
  const run = window.__meguruRun;
  for (let i = 0; i < 900; i++) {
    const info = run.foundInfo();
    if (!info.now && !info.queue.length && !info.banner) return true;
    await new Promise((r) => requestAnimationFrame(r));
  }
  return false;
});

module.exports = async function (browser, engine, fixtures, baseURL, output, onlyNames) {
  const results = [];
  for (const [name, width, height] of [
    ['iphone-390', 390, 844],
    ['iphone-375', 375, 667],
    ['android-360', 360, 640],
  ]) {
    if (onlyNames && !onlyNames.includes(name)) continue;
    const label = engine + '-meguru-discovery-' + name;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e)));
    const save = JSON.parse(JSON.stringify(fixtures.world_forest));
    Object.assign(save, { health: 100, energy: 100, hunger: 85, happiness: 90, isSick: false, isSleeping: false });
    // まっさらな たんさく から はじめる(「はじめて 見つけた」を 出させる)
    save.lifetime.meguru = { visits: 0, talkCount: 0, met: {}, talks: {}, spots: {}, zones: {}, paths: {}, marks: {}, world: { regions: [], links: [] } };
    await page.addInitScript((s) => localStorage.setItem('naotocchi-save-v1', JSON.stringify(s)), save);
    try {
      await page.goto(baseURL);
      await page.locator('.device.ui-home-active').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('#travelBtn').click();
      await page.locator('#meguruEnterBtn').waitFor({ state: 'visible' });
      await page.locator('#meguruEnterBtn').click();
      await page.locator('#mgrCanvas').waitFor({ state: 'visible' });
      await page.waitForTimeout(800);
      await drain(page);                                     // はじまりの しらせを 出しきる

      const check = (m, tag) => {
        const at = `${label} / ${tag}`;
        assert.equal(m.shown, true, at + ': しらせが 出て いない');
        assert.equal(m.toasts, 1, at + ': しらせは いつも 1つ(いまは ' + m.toasts + ')');
        assert.ok(m.title.length > 0, at + ': なにを 見つけたか が ない');
        for (const [edge, px] of Object.entries(m.out)) assert.ok(px <= 1, at + `: しらせが え の ${edge} へ ${Math.round(px)}px はみ出す`);
        for (const [edge, px] of Object.entries(m.viewportOut)) assert.ok(px <= 1, at + `: しらせが がめんの ${edge} へ ${Math.round(px)}px はみ出す`);
        assert.ok(m.pageOverflowX <= 0, at + `: よこに ${m.pageOverflowX}px はみ出す`);
        assert.equal(m.mapOverlap, 0, at + ': ちず ボタンに かぶる');
        assert.equal(m.actOverlap, 0, at + ': その ばの ボタンに かぶる');
        assert.equal(m.hintOverlap, 0, at + ': そうさ せつめいに かぶる');
        assert.equal(m.padOverlap, 0, at + ': なぞる パッドに かぶる');
        assert.equal(m.titleClipped, false, at + ': しらせの もじが きられて いる');
        assert.equal(m.subClipped, false, at + ': そえた もじが きられて いる');
        assert.ok(m.overlayScroll <= 1, at + `: がめんが ${m.overlayScroll}px スクロールする`);
        // しらせの あいだ は した の そうさ せつめいを よわめる(まざらない)
        assert.equal(m.hintQuiet, true, at + ': そうさ せつめいを よわめて いない');
        assert.ok(m.hintOpacity < 0.6, at + ': そうさ せつめいが よわまって いない(' + m.hintOpacity + ')');
        assert.ok(m.hintText.length > 0, at + ': そうさ せつめいを けして しまって いる');
        results.push({ label, tag, title: m.title, sub: m.sub, cls: m.cls, out: m.out, hintOpacity: m.hintOpacity });
      };

      // ① ふつうの ばしょ
      assert.equal(await goTo(page, 'bright2'), true, label + ': ふつうの ばしょの しらせが 出ない');
      let m = await measure2(page);
      check(m, 'ふつうの spot');
      assert.equal(m.title, 'ひだまりを みつけた', label + ': ' + m.title);
      assert.equal(m.sub, 'ちずに きろくした');
      assert.ok(/mgr-found-spot/.test(m.cls) && !/mgr-found-strong/.test(m.cls), label + ': ふつうは つよい えんしゅつに しない');
      await page.screenshot({ path: path.join(output, label + '-1-spot.png') });
      await drain(page);

      // ② おおきな めじるし(landmark)+ いちどに いくつも
      assert.equal(await goTo(page, 'great'), true, label + ': landmark の しらせが 出ない');
      const info = await page.evaluate(() => window.__meguruRun.foundInfo());
      assert.ok(info.now && info.queue.length >= 1, label + ': いちどに いくつも 見つけた ばめんに なって いない');
      assert.equal(info.now.kind, 'landmark', label + ': つよい ものから 出す(いまは ' + info.now.kind + ')');
      m = await measure2(page);
      check(m, '同時発見/landmark');
      assert.equal(m.title, 'おおきなきを みつけた！');
      assert.ok(/mgr-found-strong/.test(m.cls), label + ': landmark は すこし つよく');
      await page.screenshot({ path: path.join(output, label + '-2-landmark.png') });
      // かさならない: つぎの しらせに かわっても 出て いるのは いつも 1つ
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(400);
        const k = await page.evaluate(() => document.querySelectorAll('#meguruOverlay .mgr-found:not(.hidden)').length);
        assert.ok(k <= 1, label + ': しらせが 2つ かさなった');
      }
      await drain(page);

      // ③ ひみつ
      assert.equal(await goTo(page, 'hiddenpond'), true, label + ': ひみつの しらせが 出ない');
      m = await measure2(page);
      // ひみつの あとに 地区の しらせが つづく ことが ある ので、ひみつが 出て いる ところで みる
      if (!/mgr-found-secret/.test(m.cls)) { await page.waitForTimeout(2600); m = await measure2(page); }
      check(m, 'secret');
      assert.ok(/mgr-found-secret/.test(m.cls), label + ': ひみつ せんようの 見た目 ' + m.cls);
      assert.equal(m.title, 'ひみつのばしょを みつけた！');
      assert.ok(m.sub.startsWith('かくれたいけ'), label + ': なまえは あとから ' + m.sub);
      await page.screenshot({ path: path.join(output, label + '-3-secret.png') });
      await drain(page);

      // ④ あるいて いる あいだ に 出ても じゃま しない
      const walked = await page.evaluate(async () => {
        const run = window.__meguruRun;
        const key = document.querySelector('#meguruOverlay .mg-pad-key[data-key="down"]');
        const press = () => key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
        const release = () => key.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
        const frame = () => new Promise((r) => requestAnimationFrame(r));
        // パッドの むきは カメラ しだい。まず「なにも ない ところ」で どちらへ すすむかを はかる
        run.setPlayer(0, run.world.len * 0.5);
        for (let i = 0; i < 6; i++) await frame();
        const a = { x: run.player.x, z: run.player.z };
        press(); for (let i = 0; i < 18; i++) await frame(); release();
        const d = { x: run.player.x - a.x, z: run.player.z - a.z };
        const n = Math.hypot(d.x, d.z) || 1;
        const u = { x: d.x / n, z: d.z / n };
        // はかる あいだ に 見つけた ぶんは ぜんぶ 出しきって から はじめる
        for (let i = 0; i < 900; i++) { const inf = run.foundInfo(); if (!inf.now && !inf.queue.length && !inf.banner) break; await frame(); }
        // まだ 見つけて いない ばしょの てまえに 立ち、そこへ むかって あるく
        const seen = new Set(run.sim.mapData().spots.map((s) => s.id));
        const q = run.world.spots.find((s) => !seen.has(s.id) && !s.secret
          && Math.abs(s.x - u.x * 300) < run.world.halfW * 0.9 && s.z > 400 && s.z < run.world.len - 400);
        if (!q) return { sawToast: false, moved: 0, why: 'つぎの ばしょが ない' };
        run.setPlayer(q.x - u.x * 300, q.z - u.z * 300);
        for (let i = 0; i < 4; i++) await frame();
        const z0 = run.player.z, x0 = run.player.x;
        const visible = () => !document.getElementById('mgrFoundToast').classList.contains('hidden');
        press();
        let sawToast = false, towed = false;
        for (let i = 0; i < 260; i++) { await frame(); if (visible()) { sawToast = true; break; } }
        const moved = Math.hypot(run.player.x - x0, run.player.z - z0);
        // ここで みたいのは「あるいて いる さいちゅうに しらせが 出ても じゃま しない」こと。
        // どの むきへ どれだけ すすむかは えんじん(カメラ・フレームの ながさ)で かわる ので、
        // まだ たどりつけて いない ときは ゆびを はなさない まま ばしょへ つれて いく。
        // **ゆびは おしたまま** なので「あるきながら はっけんする」ばめんは くずれない
        if (!sawToast) {
          towed = true;
          run.setPlayer(q.x, q.z);
          for (let i = 0; i < 60; i++) { await frame(); if (visible()) { sawToast = true; break; } }
        }
        return { sawToast, moved, towed, spot: q.id };
      });
      assert.equal(walked.sawToast, true, label + ': あるいて いる あいだ に しらせが 出ない ' + (walked.why || ''));
      // どれだけ すすんだかは えんじん しだい なので ここでは しばらない。
      // 「ゆびを おして いる あいだ ほんとうに あるけて いる」かは、
      // しらせが 出て いる あいだ の うごき(下の kept)で かならず みる
      if (walked.towed) console.log('  note ' + label + ': あるきだけでは とどかなかった ので ばしょへ つれて いった (moved ' + Math.round(walked.moved) + 'px)');
      m = await measure2(page);
      check(m, '歩行中');
      const kept = await page.evaluate(async () => {
        const run = window.__meguruRun; const p0 = { x: run.player.x, z: run.player.z };
        for (let i = 0; i < 40; i++) await new Promise((r) => requestAnimationFrame(r));
        const out = Math.hypot(run.player.x - p0.x, run.player.z - p0.z);
        document.querySelector('#meguruOverlay .mg-pad-key[data-key="down"]').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
        return out;
      });
      // ここが この ばめんの かなめ: しらせが 出て いる あいだ も ゆびで あるけて いる
      assert.ok(kept > 10, label + ': しらせの あいだ あるけなく なって いる(' + Math.round(kept) + 'px)');
      await page.screenshot({ path: path.join(output, label + '-4-walking.png') });
      await drain(page);

      // ⑤ その ばの ボタン(はなす)が 出て いる とき
      const withAct = await page.evaluate(async () => {
        const run = window.__meguruRun;
        const a = run.world.residents[0];
        const q = run.world.spots.find((s) => s.id === 'sunspot') || run.world.spots[3];
        run.setPlayer(q.x, q.z);
        a.x = q.x; a.z = q.z + 20;
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => requestAnimationFrame(r));
          a.x = run.player.x; a.z = run.player.z + 20;
          if (!document.getElementById('mgrFoundToast').classList.contains('hidden')) break;
        }
        return { act: !document.getElementById('mgrTalk').classList.contains('hidden') };
      });
      m = await measure2(page);
      if (m.shown) {
        check(m, 'contextボタン + 下部ヘルプ');
        assert.equal(withAct.act, true, label + ': その ばの ボタンが 出て いない');
        assert.equal(m.actOverlap, 0, label + ': しらせが「はなす」に かぶる');
        await page.screenshot({ path: path.join(output, label + '-5-context.png') });
      }
      await drain(page);

      // ⑥ 2かいめ は 出ない
      await page.evaluate(async () => {
        const run = window.__meguruRun;
        run.setPlayer(run.world.halfW * 0.9, run.world.len * 0.2);
        for (let i = 0; i < 90; i++) await new Promise((r) => requestAnimationFrame(r));
      });
      await drain(page);
      const again = await page.evaluate(async () => {
        const run = window.__meguruRun;
        for (const id of ['bright2', 'great', 'hiddenpond']) {
          const q = run.world.spots.find((s) => s.id === id);
          run.setPlayer(q.x, q.z);
          for (let i = 0; i < 40; i++) await new Promise((r) => requestAnimationFrame(r));
        }
        const info = run.foundInfo();
        return { shown: !document.getElementById('mgrFoundToast').classList.contains('hidden'),
          queue: info.queue.length, quiet: document.getElementById('mgrHint').classList.contains('mgr-hint-quiet') };
      });
      assert.equal(again.shown, false, label + ': 2かいめ に また「みつけた」が 出る');
      assert.equal(again.queue, 0, label + ': 2かいめ の しらせを ためて いる');
      assert.equal(again.quiet, false, label + ': そうさ せつめいが よわまった まま');
      await page.screenshot({ path: path.join(output, label + '-6-revisit.png') });

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
// しらせが 出た すぐ あとは そうさ せつめいが まだ うすく なりきって いない
// (0.18s の フェード)。おちついて から はかる
const measure2 = async (page) => { await page.waitForTimeout(280); return page.evaluate(measure); };
