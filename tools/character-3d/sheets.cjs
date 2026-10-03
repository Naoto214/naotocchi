#!/usr/bin/env node
// Character 3D Pilot: Human QA 用の 比較シート(2D 正本 と 3D を ならべる)を つくる。
//   NODE_PATH=$(npm root -g) node tools/character-3d/sheets.cjs --out docs/qa/character-3d-pilot-2026-10-01
// gallery(character-3d/gallery.html)を headless で うつして、sharp で 2D の 画像と ならべる。静止画 だけ(動きは gallery / めぐる で 見る)
const fs = require('fs'), path = require('path');
const sharp = require(path.join(__dirname, '..', '..', 'node_modules', 'sharp'));
const { shots } = require('./shot.cjs');
const SPEC = require('../../character-3d/spec.js');
const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const OUT = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : path.join(require('os').tmpdir(), 'c3d-sheets'); })();
const ONLY = (() => { const i = args.indexOf('--only'); return i >= 0 ? args[i + 1].split(',') : null; })();
const RAW = path.join(OUT, 'raw'); fs.mkdirSync(RAW, { recursive: true });
const BG = '#efe9dd';
const label = (text, w, h = 30, size = 17) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${BG}"/><text x="${w / 2}" y="${h * 0.7}" font-family="DejaVu Sans, sans-serif" font-size="${size}" text-anchor="middle" fill="#3a2e26">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`);
async function tile(file, w, h, pixel = false) { return sharp(file).resize(w, h, { fit: 'contain', background: BG, kernel: pixel ? 'nearest' : 'lanczos3' }).flatten({ background: BG }).toBuffer(); }
async function grid(cells, cols, cw, ch, title, outFile) {
  const rows = Math.ceil(cells.length / cols), TH = 44, LH = 30;
  const W = cols * cw, H = TH + rows * (ch + LH);
  const comp = [{ input: label(title, W, TH, 20), left: 0, top: 0 }];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]; if (!c) continue;
    const x = (i % cols) * cw, y = TH + Math.floor(i / cols) * (ch + LH);
    comp.push({ input: await tile(c.file, cw - 8, ch - 8, c.pixel), left: x + 4, top: y + 4 });
    comp.push({ input: label(c.label, cw, LH, 15), left: x, top: y + ch });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: BG } }).composite(comp).png().toFile(outFile);
  return path.relative(ROOT, outFile);
}
// gallery の 1 まいを cols 等分して 切りだす(layout=views / stages / emotions / modes は よこ 1 列)
async function split(file, n, prefix) {
  const meta = await sharp(file).metadata(); const w = Math.floor(meta.width / n); const out = [];
  for (let i = 0; i < n; i++) { const f = `${prefix}-${i}.png`; await sharp(file).extract({ left: i * w, top: 0, width: w, height: meta.height }).toFile(f); out.push(f); }
  return out;
}
const ref = (rel) => path.join(ROOT, rel);

(async () => {
  const ids = (ONLY || Object.keys(SPEC.PILOT));
  const made = {};
  // 1) species ごと: 2D 正本 + 3D 正面 / 3/4 / 横 / 後ろ(stage は 04 前後)
  const viewShots = ids.map((id) => { const ks = SPEC.STAGE_KEYS[id]; const s = ks[Math.min(1, ks.length - 1)]; return { id, s, out: path.join(RAW, `${id}-views.png`), q: `id=${id}&stage=${s}&layout=views&view=front&t=0.4&ortho=1&bare=1&el=0.18&emotion=normal`, w: 1600, h: 520 }; });
  await shots(viewShots);
  for (const v of viewShots) {
    const parts = await split(v.out, 4, path.join(RAW, `${v.id}-view`));
    made[`${v.id}-views`] = await grid([{ file: ref(SPEC.referenceAsset(v.id, v.s)), label: `2D original 0${v.s}`, pixel: true }, ...parts.map((f, i) => ({ file: f, label: ['3D front', '3D 3/4', '3D side', '3D back'][i] }))], 5, 300, 300, `${v.id} 0${v.s} — 2D original vs 3D (front / 3/4 / side / back)`, path.join(OUT, `${v.id}-views.png`));
  }
  // 2) stage 01 / 04 / 08 と 5 表情(全 pilot)
  const stageShots = ids.map((id) => ({ id, out: path.join(RAW, `${id}-stages.png`), q: `id=${id}&layout=stages&view=34&t=0.4&ortho=1&bare=1&el=0.18`, w: 400 * SPEC.STAGE_KEYS[id].length, h: 520 }));
  const emoShots = ids.map((id) => { const ks = SPEC.STAGE_KEYS[id]; const s = ks[Math.min(1, ks.length - 1)]; return { id, s, out: path.join(RAW, `${id}-emotions.png`), q: `id=${id}&stage=${s}&layout=emotions&view=front&t=0.4&ortho=1&bare=1&el=0.18`, w: 2000, h: 520 }; });
  await shots([...stageShots, ...emoShots]);
  for (const v of stageShots) {
    const ks = SPEC.STAGE_KEYS[v.id];
    const parts = await split(v.out, ks.length, path.join(RAW, `${v.id}-stage`));
    const cells = [...ks.map((s) => ({ file: ref(SPEC.referenceAsset(v.id, s)), label: `2D 0${s}`, pixel: true })), ...parts.map((f, i) => ({ file: f, label: `3D 0${ks[i]}` }))];
    made[`${v.id}-stages`] = await grid(cells, ks.length, 300, 300, `${v.id} — growth: 2D (top) vs 3D (bottom)`, path.join(OUT, `${v.id}-stages.png`));
  }
  for (const v of emoShots) {
    const parts = await split(v.out, 5, path.join(RAW, `${v.id}-emo`));
    const cells = [...SPEC.PILOT_EMOTIONS.map((e) => ({ file: ref(SPEC.referenceAsset(v.id, v.s, e)), label: `2D ${SPEC.REFERENCE_EXPRESSION[e]}`, pixel: true })), ...parts.map((f, i) => ({ file: f, label: `3D ${SPEC.PILOT_EMOTIONS[i]}` }))];
    made[`${v.id}-emotions`] = await grid(cells, 5, 280, 280, `${v.id} 0${v.s} — Expression PNG (top) vs 3D canonical emotion (bottom)`, path.join(OUT, `${v.id}-emotions.png`));
  }
  // 3) 顔の 方式 A / B / C(3 系統)
  const modeIds = ids.filter((id) => ['dog', 'penguin', 'starfish', 'man'].includes(id));
  const modeShots = [];
  for (const id of modeIds) for (const e of ['normal', 'positive', 'sick']) { const ks = SPEC.STAGE_KEYS[id]; modeShots.push({ id, e, out: path.join(RAW, `${id}-modes-${e}.png`), q: `id=${id}&stage=${ks[Math.min(1, ks.length - 1)]}&layout=modes&view=front&emotion=${e}&t=0.4&ortho=1&bare=1&el=0.18`, w: 1200, h: 460 }); }
  await shots(modeShots);
  const modeCells = [];
  for (const v of modeShots) { const parts = await split(v.out, 3, path.join(RAW, `${v.id}-mode-${v.e}`)); parts.forEach((f, i) => modeCells.push({ file: f, label: `${v.id} ${v.e} · ${['A texture', 'B geometry', 'C hybrid'][i]}` })); }
  if (modeCells.length) made['face-modes'] = await grid(modeCells, 9, 240, 240, 'Face method comparison: A texture atlas / B geometry / C hybrid (geometry eyes + atlas mouth/brows)', path.join(OUT, 'face-modes.png'));
  // 4) 全 pilot の ならび(2D と 3D)
  await shots([{ out: path.join(RAW, 'lineup.png'), q: 'layout=lineup&view=front&t=0.4&ortho=1&bare=1&el=0.18', w: 2400, h: 520 }]);
  const lparts = await split(path.join(RAW, 'lineup.png'), ids.length === Object.keys(SPEC.PILOT).length ? ids.length : Object.keys(SPEC.PILOT).length, path.join(RAW, 'lineup'));
  const lid = Object.keys(SPEC.PILOT);
  made.lineup = await grid([...lid.map((id) => { const ks = SPEC.STAGE_KEYS[id]; return { file: ref(SPEC.referenceAsset(id, ks[Math.min(1, ks.length - 1)])), label: `2D ${id}`, pixel: true }; }), ...lparts.map((f, i) => ({ file: f, label: `3D ${lid[i]}` }))], lid.length, 240, 260, 'All pilot species — 2D original (top) vs 3D (bottom)', path.join(OUT, 'lineup.png'));
  fs.writeFileSync(path.join(OUT, 'sheets.json'), JSON.stringify(made, null, 1));
  fs.rmSync(RAW, { recursive: true, force: true });
  console.log(JSON.stringify(made, null, 1));
})();
