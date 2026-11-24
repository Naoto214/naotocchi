#!/usr/bin/env node
// Builds the private comparison: the production home renderer beside the proposal overlay.
// usage: node comparisons/home-environment-v1/build.cjs <output-dir>
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const [out] = process.argv.slice(2);
if (!out || path.resolve(out).startsWith(root + path.sep)) throw new Error('Choose an output directory outside the repository.');
const write = (file, data) => { fs.mkdirSync(path.dirname(path.join(out, file)), {recursive:true}); fs.writeFileSync(path.join(out, file), data); };
const unpin = source => source.replace(/(\.mjs)\?v=[0-9a-f-]+/g, '$1');
const proposal = path.join(__dirname, 'proposal');
const modules = fs.readdirSync(root).filter(name => /^home-.*\.mjs$/.test(name));
// The baseline is this checkout's production home; the proposal overlays its four files.
for (const name of modules) write('baseline/' + name, unpin(fs.readFileSync(path.join(root, name), 'utf8')));
for (const name of new Set([...modules, ...fs.readdirSync(proposal).filter(name => name.endsWith('.mjs'))])) {
  const source = fs.existsSync(path.join(proposal, name)) ? path.join(proposal, name) : path.join(root, name);
  write('proposal/' + name, unpin(fs.readFileSync(source, 'utf8')));
}
write('world-scene.js', fs.readFileSync(path.join(root, 'world-scene.js')));
write('compare.mjs', fs.readFileSync(path.join(__dirname, 'compare.mjs')));
for (const name of ['leaf-v1.webp', 'blossom-v1.webp']) write('assets/world/' + name, fs.readFileSync(path.join(root, 'assets/world', name)));
const images = [...fs.readFileSync(path.join(root, 'home-dayparts.mjs'), 'utf8').matchAll(/"(comparisons\/[^"]+\.webp)"/g)].map(m => m[1]);
for (const file of images) write(file, fs.readFileSync(path.join(root, file)));
// Only the particle rules are needed; the page keeps its own layout.
const css = [path.join(root, 'world-scene.css'), path.join(proposal, 'home-dayparts.css')].map(file => fs.readFileSync(file, 'utf8')).join('\n')
  .split('\n').filter(line => /^(\.world-(particle|mote|plankton|firefly|spark|rain|snow|leaf|petal|dust)|\.home-dayparts-fx|\.hfx|@keyframes (world-(drift|twinkle|rain|fall)|hfx-))/.test(line)).join('\n');
const page = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8').replace('<!--INLINE_CSS-->', `<style>\n${css}\n</style>`);
write('page.html', page);
write('index.html', `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0">${page}</body></html>`);
console.log(`${modules.length} modules, ${images.length} paintings → ${out}`);
