#!/usr/bin/env node
// 試聴ページの 全曲の 音量を 測り、曲間の 音量補正 loudness.js を 書き出す。
//   node prototypes/bgm-survey-20261108/tools/measure-loudness.cjs
// Playwright の Chromium で index.html を ひらき、OfflineAudioContext で 各曲 1周を 描いて RMS(dB) を 出す。
// 補正値は「その モードの 全曲平均」に そろえる dB。「ゲームの 音」は ピアノの 平均に そろえる。曲データは 変えない。
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const dir = path.resolve(__dirname, '..');
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(dir, 'index.html'));
  const res = await p.evaluate(async () => {
    const C = window.NAOTOCCHI_BGM_CATALOG, E = window.NAOTOCCHI_BGM_ENGINE, rms = {};
    for (const mode of ['melody', 'piano', 'band', 'game']) {
      rms[mode] = {};
      for (const x of C.CATALOG) {
        if (mode === 'game' && !x.gameSound) continue;
        const buf = await E.renderOffline(x.song, mode, { repeats: 1 }), d = buf.getChannelData(0);
        let q = 0; for (const v of d) q += v * v; rms[mode][x.id] = Math.round(100 * 20 * Math.log10(Math.sqrt(q / d.length))) / 100;
      }
    }
    return rms;
  });
  await b.close();
  const mean = (o) => { const v = Object.values(o); return v.reduce((a, c) => a + c, 0) / v.length; };
  const gain = {};
  for (const mode of Object.keys(res)) { const target = mean(res[mode === 'game' ? 'piano' : mode]); gain[mode] = Object.fromEntries(Object.entries(res[mode]).map(([k, v]) => [k, Math.round(10 * (target - v)) / 10])); }
  const spread = Object.fromEntries(Object.entries(res).map(([m, o]) => { const v = Object.values(o); return [m, Math.round(10 * (Math.max(...v) - Math.min(...v))) / 10]; }));
  fs.writeFileSync(path.join(dir, 'loudness.js'), `// 曲間の 音量補正 (tools/measure-loudness.cjs が 生成)。rms は 補正前の 1周 RMS (dB)、gain は 再生時に かける dB。\nwindow.NAOTOCCHI_BGM_LOUDNESS = ${JSON.stringify({ rms: res, gain, spreadBeforeDb: spread })};\n`);
  console.log('spread before correction (dB):', JSON.stringify(spread));
  console.log('gain range (dB):', JSON.stringify(Object.fromEntries(Object.entries(gain).map(([m, o]) => [m, [Math.min(...Object.values(o)), Math.max(...Object.values(o))]]))));
})();
