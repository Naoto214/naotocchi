'use strict';
// お世話の頻度 監査(2026-11-25): 試遊ページを 本物の ブラウザで ひらき、案ごとに
//   1. 起動できるか(script.js の 起動完了フラグ・エラーなし・本番セーブに 書かないか)
//   2. 卵を かえしてから「何もしないで ながめる」N分の あいだに 何が起きるか
// を たしかめ、スクリーンショットを のこす。
//
//   python3 -m http.server 8765 &   (リポジトリの根で)
//   node tools/care-pace/browser-check.cjs --minutes 10 --speed 10 --shots test-results/care-pace
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');

function arg(name, fallback) { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : fallback; }
const BASE = arg('base', 'http://127.0.0.1:8765');
const MINUTES = Number(arg('minutes', 10));
const SPEED = Number(arg('speed', 10));
const SHOTS = arg('shots', 'test-results/care-pace');
const PLANS = (arg('plans', 'current,A,B,C')).split(',');

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  for (const plan of PLANS) {
    const context = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message || e)));
    await page.goto(`${BASE}/comparisons/care-pace-20261125/play.html?plan=${plan}&speed=${SPEED}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__naotocchiBooted === true, null, { timeout: 30000 });
    const booted = await page.evaluate(() => ({ errors: (window.__carePace || {}).errors || [], plan: (window.__carePace || {}).plan }));
    // 卵を あたためて かえす(じゃれる = あたためる)
    for (let i = 0; i < 12; i++) {
      const stage = await page.evaluate(k => (JSON.parse(localStorage.getItem(k) || '{}').stage), `naotocchi-carepace-${plan}-v1`);
      if (stage === 'growing') break;
      await page.evaluate(() => { const b = document.getElementById('playWithBtn'); if (b) b.click(); });
      await page.waitForTimeout(400);
    }
    const read = () => page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k) || '{}'); return { stage: s.stage, ageTicks: s.ageTicks, hunger: s.hunger, happiness: s.happiness, energy: s.energy, poop: s.poopCount, sick: s.isSick, health: s.health, deathMeter: s.deathMeter }; }, `naotocchi-carepace-${plan}-v1`);
    // 案の つまみが じっさいに 反映されて いるか(1分あたりの おなかの へり)を はかる
    const start = await read();
    await page.screenshot({ path: path.join(SHOTS, `${plan}-0min.png`) });
    const timeline = [];
    const stepMs = 60000 / SPEED; // ホーム時間 1分
    // 年齢の 節目の「はじめての発見」ダイアログは 開いている間 時間が止まる(本体の仕様)。
    // 「ながめるだけ」の 検証では「あとで」で閉じる(お世話の タップには 数えない)
    const dismiss = () => page.evaluate(() => { const d = document.getElementById('individualityDialog'); if (d && !d.classList.contains('hidden')) document.getElementById('individualityLater').click(); });
    for (let m = 1; m <= MINUTES; m++) {
      for (let k = 0; k < 4; k++) { await page.waitForTimeout(stepMs / 4); await dismiss(); }
      const s = await read();
      timeline.push({ minute: m, ...s });
      if (s.stage !== 'growing') break;
    }
    await page.screenshot({ path: path.join(SHOTS, `${plan}-${MINUTES}min.png`) });
    const notice = await page.evaluate(() => { const fx = document.querySelector('.care-alert-fx'); const msg = document.getElementById('message'); return { alert: fx && fx.dataset.level || '', kind: fx && fx.dataset.kind || '', message: msg && msg.textContent.trim().slice(0, 60) }; });
    const prodSave = await page.evaluate(() => localStorage.getItem('naotocchi-save-v1'));
    results.push({ plan, booted, start, timeline, notice, wroteProductionSave: prodSave != null, errors });
    console.log(plan, 'boot', JSON.stringify(booted), 'errors', errors.length, 'prodSave', prodSave != null);
    for (const t of timeline) console.log(`  ${plan} ${t.minute}分 おなか${Math.round(t.hunger)} ごきげん${Math.round(t.happiness)} げんき${Math.round(t.energy)} うんち${t.poop} びょうき${t.sick ? '○' : '-'} けんこう${t.health} ${t.stage}`);
    console.log('  notice', JSON.stringify(notice));
    await context.close();
  }
  fs.writeFileSync(path.join(SHOTS, 'browser-check.json'), JSON.stringify(results, null, 1));
  await browser.close();
  const bad = results.filter(r => r.errors.length || r.booted.errors.length || r.wroteProductionSave);
  if (bad.length) { console.error('問題あり:', bad.map(r => r.plan).join(',')); process.exit(1); }
})();
