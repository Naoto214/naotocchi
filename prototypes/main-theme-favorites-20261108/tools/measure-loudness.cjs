#!/usr/bin/env node
// お気に入り 6曲の 音量を 測る。Playwright の Chromium で 試聴ページを ひらき、
// OfflineAudioContext で 各曲 1周を 描いて RMS(dB) を 出す。
//   node prototypes/main-theme-favorites-20261108/tools/measure-loudness.cjs
// 出力の MEASURED_RMS と LOUDNESS_DB を favorites.js に 書き写す (原曲データは 変えない)。
'use strict';
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const page = path.resolve(__dirname, '..', 'index.html');
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + page);
  const res = await p.evaluate(async () => {
    const F = window.NAOTOCCHI_FAVORITES, E = window.NAOTOCCHI_THEME_ENGINE_V2, rms = {}, corr = {}, win = {};
    for (const mode of ['melody', 'piano', 'band']) {
      rms[mode] = {}; win[mode] = {};
      for (const f of F.FAVORITES) {
        const buf = await E.renderOffline(f.song, mode, { repeats: 1 }), d = buf.getChannelData(0), sr = buf.sampleRate;
        let q = 0; for (const v of d) q += v * v; rms[mode][f.id] = Math.round(10 * 20 * Math.log10(Math.sqrt(q / d.length))) / 10;
        // 3秒窓の 最大 RMS (いちばん 大きく 聴こえる 場面)
        const n = sr * 3; let best = 0; for (let s = 0; s + n <= d.length; s += sr / 2) { let w = 0; for (let i = s; i < s + n; i++) w += d[i] * d[i]; best = Math.max(best, w / n); }
        win[mode][f.id] = Math.round(10 * 10 * Math.log10(best)) / 10;
      }
      const vals = Object.values(rms[mode]), mean = vals.reduce((a, c) => a + c, 0) / vals.length;
      corr[mode] = Object.fromEntries(Object.entries(rms[mode]).map(([k, v]) => [k, Math.round(10 * (mean - v)) / 10]));
    }
    return { MEASURED_RMS: rms, LOUDNESS_DB: corr, MAX3S_RMS: win };
  });
  console.log(JSON.stringify(res));
  await b.close();
})();
