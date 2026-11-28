'use strict';
// お世話の頻度 監査 VERSION 3 の 追加確認: なかま26人+こいびと(最大人数)での きずなと 暮らし。
//   node tools/care-pace/relations-26.cjs <出力ファイル>
// 現行と V3 を、5つの プレイヤー像 × 40生涯ずつ 比べる(simulate-v2.cjs の c26p)。
const fs = require('node:fs');
const { spawnJob, summarize } = require('./simulate-v2.cjs');

const N = 40, CHUNK = 10;
const mean = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null;
const pct = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const out = {};
for (const plan of ['current', 'V3']) {
  out[plan] = {};
  for (const persona of ['casual', 'keeper', 'affection', 'viewer', 'beginner']) {
    const rows = [];
    for (let f = 0; f < N; f += CHUNK) rows.push(...spawnJob(plan, `life:${persona}:${f}:${CHUNK}:c26p`));
    const sum = summarize(rows);
    const rel = rows.map(r => r.rel);
    const minBond = rel.map(r => r.minBond).filter(v => v != null);
    const aff = rel.map(r => r.partnerAffection).filter(v => v != null);
    out[plan][persona] = {
      lives: rows.length,
      departuresMean: mean(rel.map(r => r.departures)), departuresMax: Math.max(...rel.map(r => r.departures)),
      livesWithDeparture: +(rel.filter(r => r.departures > 0).length / rows.length).toFixed(2),
      companionsLeftMean: mean(rel.map(r => r.companionsLeft)),
      breakupRate: mean(rel.map(r => r.breakup)),
      minBondAtEnd: { mean: mean(minBond), p10: pct(minBond, 0.1) },
      partnerAffectionAtEnd: { mean: mean(aff), p10: pct(aff, 0.1) },
      relTapsPerLife: mean(rel.map(r => r.relTaps)),
      carePer10: sum.carePer10.mean, noticesPer10: sum.noticesPer10.mean,
      deathRate: sum.deathRate, sicknessesPerLife: sum.sicknesses.mean, sodachi: sum.sodachi && sum.sodachi.mean, clearRate: sum.clearRate,
    };
    process.stderr.write(`${plan} ${persona} ${JSON.stringify(out[plan][persona])}\n`);
  }
}
fs.writeFileSync(process.argv[2], JSON.stringify({ name: 'relations-26', result: out }, null, 1));
