// Character 3D: 方式の 比較(procedural = いまの 方式 / GLB = 同じ model を GLB に した とき)。QA 専用・成果物は repo に 置かない。
//   node tools/character-3d/glb-compare.mjs <three@0.170.0 の package フォルダ> [out.json]
// three の GLTFExporter / GLTFLoader(MIT・同じ r170)を 外から よむ。repo の vendor には 入れない
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { pathToFileURL } from 'node:url';
const PKG = process.argv[2]; const OUT = process.argv[3];
if (!PKG) { console.error('usage: node tools/character-3d/glb-compare.mjs <three-0.170.0/package> [out.json]'); process.exit(2); }
globalThis.FileReader = class { readAsArrayBuffer(b) { b.arrayBuffer().then((r) => { this.result = r; this.onloadend && this.onloadend(); this.onload && this.onload({ target: this }); }); } readAsDataURL(b) { b.arrayBuffer().then((r) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend && this.onloadend(); this.onload && this.onload({ target: this }); }); } };
const { GLTFExporter } = await import(pathToFileURL(path.join(PKG, 'examples/jsm/exporters/GLTFExporter.js')));
const { GLTFLoader } = await import(pathToFileURL(path.join(PKG, 'examples/jsm/loaders/GLTFLoader.js')));
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const rt = await import(pathToFileURL(path.join(ROOT, 'character-3d/runtime.mjs')));
const SPEC = rt.SPEC;
const rows = [];
const exp = new GLTFExporter(), ldr = new GLTFLoader();
for (const id of Object.keys(SPEC.PILOT)) for (const s of SPEC.STAGE_KEYS[id]) {
  const t0 = performance.now(); const tpl = rt.getTemplate(id, s, 'B'); const build = performance.now() - t0;   // B = 顔も 立体(texture なし)で GLB に できる
  const glb = await exp.parseAsync(tpl.rig.root, { binary: true });
  const buf = Buffer.from(glb), gz = zlib.gzipSync(buf).length;
  const p0 = performance.now(); await new Promise((res, rej) => ldr.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), '', res, rej)); const parse = performance.now() - p0;
  rows.push({ key: `${id}:${s}`, tris: Math.round(tpl.tris), proceduralBuildMs: +build.toFixed(1), glbBytes: buf.length, glbGzip: gz, glbParseMs: +parse.toFixed(1) });
}
const srcBytes = ['spec.js', 'geometry.mjs', 'rig.mjs', 'archetypes.mjs', 'animate.mjs', 'runtime.mjs', 'spec-esm.mjs'].reduce((a, f) => a + fs.statSync(path.join(ROOT, 'character-3d', f)).size, 0);
const srcGz = ['spec.js', 'geometry.mjs', 'rig.mjs', 'archetypes.mjs', 'animate.mjs', 'runtime.mjs', 'spec-esm.mjs'].reduce((a, f) => a + zlib.gzipSync(fs.readFileSync(path.join(ROOT, 'character-3d', f))).length, 0);
const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
const res = { rows, totals: { templates: rows.length, glbBytes: sum('glbBytes'), glbGzip: sum('glbGzip'), proceduralCodeBytes: srcBytes, proceduralCodeGzip: srcGz, avgBuildMs: +(sum('proceduralBuildMs') / rows.length).toFixed(1), avgGlbParseMs: +(sum('glbParseMs') / rows.length).toFixed(1) } };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res.totals, null, 1));
for (const r of rows) console.log(r.key.padEnd(14), String(r.tris).padStart(5), 'build', String(r.proceduralBuildMs).padStart(6), 'ms | glb', String((r.glbBytes / 1024).toFixed(0)).padStart(4), 'KB gz', String((r.glbGzip / 1024).toFixed(0)).padStart(4), 'KB parse', r.glbParseMs, 'ms');
