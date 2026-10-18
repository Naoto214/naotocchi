#!/usr/bin/env node
// めぐる Resident Expression の 一覧表(contact sheet)。resolver(resident-expression.js)が かえした 画像を そのまま ならべる。
//   node tools/meguru-resident-expression-sheet.cjs <out.png> [--all]
// 画像は 1 まいも つくらない: ならべる だけ。--all は 全住民(ずかん 全コマ + なかま + こいびと)× 5 emotion の 大きな 表
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '..');
const RX = require(path.join(ROOT, 'resident-expression.js'));
const { harness } = require(path.join(ROOT, 'tests/helpers/runtime-harness.cjs'));

const outPath = path.resolve(process.argv[2] || 'test-results/meguru-resident-expression/sheet.png');
const all = process.argv.includes('--all');
const EMOTIONS = ['normal', 'positive', 'dislike', 'sick', 'tired'];

const h = harness({ fullDisplay: true, pinDate: true, clockNow: 1000 });
const s = h.api.state();
Object.assign(s, { stage: 'growing', speciesLine: 'dog', stageIndex: 4, regionId: 'forest' });
s.petKey = `dog:${h.api.currentFormStageIndex()}`;
const SP = h.api.SPECIES;
s.discoveredStages = Array.from(h.api.ALL_LINES).flatMap((line) => (SP[line].stages || []).map((_, i) => `${line}:${i}`));
s.lifetime.companionsRecruited = Array.from(h.api.normalCompanions).map((c) => c.id);
s.lifetime.rareCompanionsRecruited = Array.from(h.api.rareCompanions).map((c) => c.id);
s.lifetime.partnersRecorded = Array.from(h.api.partnerCandidates).map((p) => p.id);
s.companions = []; s.partner = null;
h.api.render();
const residents = h.api.meguruMod.buildRegistry().residents;
// pilot: Home の 基準の ねこ(cat/06)、いぬ、かえる、なかま(たぬき)、こいびと(ねこ社長)
const PILOT = ['form:cat:5', 'form:dog:2', 'form:frog:4', 'companion:tanuki', 'partner:cat_ceo'];
const rows = all ? residents : PILOT.map((k) => residents.find((r) => r.key === k)).filter(Boolean);

(async () => {
  const cell = 128, pad = 6, labelW = 150, headH = 26;
  const W = labelW + EMOTIONS.length * (cell + pad), H = headH + rows.length * (cell + pad);
  const comps = [];
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svgText = (text, w, hh, size = 13, anchor = 'start') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hh}"><text x="${anchor === 'middle' ? w / 2 : 4}" y="${hh / 2 + size / 3}" font-family="sans-serif" font-size="${size}" text-anchor="${anchor}" fill="#333">${esc(text)}</text></svg>`);
  EMOTIONS.forEach((em, i) => comps.push({ input: svgText(em, cell, headH, 14, 'middle'), left: labelW + i * (cell + pad), top: 0 }));
  const manifest = [];
  for (let r = 0; r < rows.length; r++) {
    const res = rows[r];
    const top = headH + r * (cell + pad);
    comps.push({ input: svgText(`${res.kind}:${res.id || `${res.line}/${res.stage}`}`, labelW, cell, 12), left: 0, top });
    for (let i = 0; i < EMOTIONS.length; i++) {
      const o = RX.resolve(res, EMOTIONS[i]);
      manifest.push({ key: res.key, emotion: EMOTIONS[i], expression: o.expression, asset: o.asset, fallback: o.fallback });
      const img = await sharp(path.join(ROOT, o.asset)).resize(cell, cell, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      comps.push({ input: img, left: labelW + i * (cell + pad), top });
      comps.push({ input: svgText(o.expression, cell, 14, 10, 'middle'), left: labelW + i * (cell + pad), top: top + cell - 14 });
    }
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 4, background: '#f4efe6' } }).composite(comps).png().toFile(outPath);
  fs.writeFileSync(outPath.replace(/\.png$/, '.json'), JSON.stringify(manifest, null, 2));
  console.log(`${outPath}: ${rows.length} residents × ${EMOTIONS.length} emotions`);
})().catch((e) => { console.error(e); process.exit(1); });
