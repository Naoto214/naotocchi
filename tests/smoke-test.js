const fs = require('fs');

const source = fs.readFileSync('script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function fail(msg) {
  console.error('SMOKE TEST FAILED:', msg);
  process.exit(1);
}

try {
  new Function(source);
} catch (e) {
  fail('script.js syntax error: ' + e.stack);
}

const ids = [...source.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]);
const missingIds = [...new Set(ids.filter(id => !new RegExp('id=["\\\']' + id + '["\\\']').test(html)))];
if (missingIds.length) fail('missing DOM ids: ' + missingIds.join(', '));

const calls = [...source.matchAll(/\b(make[A-Z][A-Za-z0-9_]*)\s*\(/g)].map(m => m[1]);
const declarations = new Set([
  ...[...source.matchAll(/\bfunction\s+(make[A-Z][A-Za-z0-9_]*)\s*\(/g)].map(m => m[1]),
  ...[...source.matchAll(/\bconst\s+(make[A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/g)].map(m => m[1]),
]);
const unresolvedFactories = [...new Set(calls.filter(name => !declarations.has(name)))];
if (unresolvedFactories.length) fail('undefined make* factories: ' + unresolvedFactories.join(', '));

const variantRefs = [...new Set([...source.matchAll(/\b([A-Z][A-Z0-9_]*(?:_VARIANTS|_MINIGAMES|_THEMES))\b/g)].map(m => m[1]))];
const variantDefs = new Set([
  ...[...source.matchAll(/\bconst\s+([A-Z][A-Z0-9_]*(?:_VARIANTS|_MINIGAMES|_THEMES))\s*=/g)].map(m => m[1]),
  ...[...source.matchAll(/\blet\s+([A-Z][A-Z0-9_]*(?:_VARIANTS|_MINIGAMES|_THEMES))\s*=/g)].map(m => m[1]),
]);
const unresolvedVariants = variantRefs.filter(name => !variantDefs.has(name));
if (unresolvedVariants.length) fail('undefined variant collections: ' + unresolvedVariants.join(', '));

const noop = () => {};
let fakeEl;
fakeEl = new Proxy({
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  style: {}, dataset: {}, children: [], innerHTML: '', textContent: '', value: '', disabled: false,
  addEventListener: noop, removeEventListener: noop, appendChild: noop, remove: noop,
  querySelector: () => fakeEl, querySelectorAll: () => [], closest: () => null,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 300 }),
  setAttribute: noop, focus: noop,
}, {
  get: (target, prop) => prop in target ? target[prop] : noop,
  set: (target, prop, value) => { target[prop] = value; return true; },
});

global.document = {
  getElementById: () => fakeEl,
  querySelector: () => fakeEl,
  querySelectorAll: () => [],
  createElement: () => fakeEl,
  addEventListener: noop,
  body: fakeEl,
  documentElement: fakeEl,
  visibilityState: 'visible',
};
global.window = { addEventListener: noop, innerWidth: 390, innerHeight: 844 };
global.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
global.navigator = { userAgent: 'smoke-test', maxTouchPoints: 1 };
global.performance = { now: () => 1000 };
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = noop;
global.setInterval = () => 1;
global.clearInterval = noop;
global.setTimeout = () => 1;
global.clearTimeout = noop;
global.location = { href: 'https://naoto214.github.io/naotocchi/' };
global.crypto = { getRandomValues: a => a };

const expose = '\n;globalThis.__NAOTO_SMOKE__={MINIGAMES,REGION_MINIGAMES,SEASONAL_MINIGAMES};\n';
const instrumented = source.replace(/\}\)\(\);\s*$/, expose + '})();');

try {
  eval(instrumented);
} catch (e) {
  fail('boot runtime error: ' + e.stack);
}

const audit = global.__NAOTO_SMOKE__;
if (!audit) fail('could not expose minigame pools');

const games = [...audit.MINIGAMES];
for (const entries of Object.values(audit.REGION_MINIGAMES)) {
  for (const entry of entries) games.push(entry.game);
}
for (const entries of Object.values(audit.SEASONAL_MINIGAMES)) {
  for (const entry of entries) games.push(entry.game);
}

const uniqueGames = [...new Set(games)];
const failures = [];
for (const game of uniqueGames) {
  try {
    game.start(fakeEl, noop);
  } catch (e) {
    failures.push((game.id || '(regional/seasonal)') + ': ' + e.message);
  }
}
if (failures.length) fail('minigame start failures:\n' + failures.join('\n'));

console.log('SMOKE TEST OK');
console.log('DOM ids:', new Set(ids).size);
console.log('minigames started:', uniqueGames.length);
console.log('variant collections:', variantRefs.length);
