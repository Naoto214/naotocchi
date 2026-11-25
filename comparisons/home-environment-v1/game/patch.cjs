// Shared by the local server and the package build: the few substitutions that let the shipped
// home run on a fixture save and load either the production or the proposed environment renderer.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', '..'), here = path.join(__dirname, '..');
function replace(text, anchor, change) {
  if (text.split(anchor).length !== 2) throw new Error('Missing or duplicate production anchor ' + anchor);
  return text.replace(anchor, () => change);
}
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const KEY = 'naotocchi-save-v1', FIXTURE = 'naotocchi-environment-fixture';
const patched = {
  'index.html'() {
    const seed = fs.readFileSync(path.join(here, 'fixture.json'), 'utf8').replaceAll('<', '\\u003c');
    const html = read('index.html').replaceAll(KEY, FIXTURE);
    return replace(html, '<script src="cast-bounds.js', `<script id="env-seed" type="application/json">${seed}</script><script src="env/fixture.js"></script><script src="env/panel.js"></script>\n  <script src="cast-bounds.js`);
  },
  'script.js': () => read('script.js').replaceAll(KEY, FIXTURE),
  'home-production-diorama.js'() {
    const source = read('home-production-diorama.js');
    const anchor = source.match(/import\('\.\/home-production-world\.mjs\?v=[0-9a-f]+'\)/);
    if (!anchor) throw new Error('Unknown world import');
    return replace(source, anchor[0], `import(env.NaotocchiEnvCompare.fx==='A'?'./home-production-world.mjs':'./env/proposal/home-production-world.mjs')`);
  }
};
// Maps a request path to file contents, or null when the path is outside the package.
function resolve(url) {
  const name = decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\/+/, '') || 'index.html';
  if (name.includes('..')) return null;
  if (patched[name]) return Buffer.from(patched[name]());
  let file = path.join(root, name);
  if (name.startsWith('env/proposal/')) {
    const local = path.join(here, 'proposal', name.slice(13));
    file = fs.existsSync(local) ? local : path.join(root, name.slice(13));
  } else if (name.startsWith('env/')) file = path.join(__dirname, name.slice(4));
  return fs.existsSync(file) && fs.statSync(file).isFile() ? fs.readFileSync(file) : null;
}
module.exports = {resolve};
