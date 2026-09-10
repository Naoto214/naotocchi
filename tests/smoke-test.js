const fs = require('fs');

const source = fs.readFileSync('script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const masterSource = fs.readFileSync('character-world-master.v1.js', 'utf8');
let master;
try {
  master = new Function(masterSource + '\nreturn NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;')();
} catch (e) {
  fail('character-world-master.v1.js syntax/runtime error: ' + e.stack);
}
if (!master) fail('character/world master missing');
if (master.playerSpecies.normal.length !== 22) fail('expected 22 normal player species');
if (master.playerSpecies.rare.length !== 8) fail('expected 8 rare player species');
if (master.companions.normal.length !== 18) fail('expected 18 normal companions');
if (master.companions.rare.length !== 8) fail('expected 8 rare companions');
if (master.partners.length !== 18) fail('expected 18 partners');
if (master.regions.normal.length !== 10) fail('expected 10 normal travel regions');
if (master.regions.special.length !== 2) fail('expected 2 special regions');
if (master.legends.length !== 5) fail('expected 5 legends');
for (const line of [...master.playerSpecies.normal, ...master.playerSpecies.rare]) {
  if (!Array.isArray(line.stages) || line.stages.length !== 8) fail('player species must have 8 stages: ' + line.id);
}
if (master.compatibility.speciesAliases.rabbit) fail('retired rabbit species must not be force-mapped');
if (!master.compatibility.legacyOnlySpecies.includes('rabbit')) fail('retired rabbit species must remain legacy-only');
if (master.compatibility.partnerAliases['neighbor-cat']) fail('retired partner must not be force-mapped');
if (!master.compatibility.legacyOnlyPartners.includes('neighbor-cat')) fail('retired partner must remain legacy-only');

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
  style: {setProperty: noop}, dataset: {}, children: [], innerHTML: '', textContent: '', value: '', disabled: false,
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
global.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1 = master;
global.window.NaotocchiCast = require('../cast-layout.js');
global.window.NaotocchiCastMotion = require('../cast-motion.js');
global.window.NaotocchiEnvironment = require('../world-environment.js');
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

const expose = '\n;globalThis.__NAOTO_SMOKE__={MINIGAMES,REGION_MINIGAMES,SEASONAL_MINIGAMES,MINIGAME_INFO,MINIGAME_GENRE_OF_CATEGORY,minigameCategoryOf};\n';
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

// すべての ゲームが 固定の id を もち、id が かぶらず、「ゲームきろく」
// いちらんに 出す 名前/ジャンルの 表(MINIGAME_INFO/MINIGAME_GENRE_OF_CATEGORY)
// に もれなく のっている ことを たしかめる
const idProblems = [];
const seenIds = new Set();
for (const game of uniqueGames) {
  if (!game.id) { idProblems.push('game without id (category ' + audit.minigameCategoryOf.get(game) + ')'); continue; }
  if (seenIds.has(game.id)) idProblems.push('duplicate id: ' + game.id);
  seenIds.add(game.id);
  const info = audit.MINIGAME_INFO[game.id];
  if (!info || !info.name || !info.emoji) idProblems.push('missing MINIGAME_INFO: ' + game.id);
  const category = audit.minigameCategoryOf.get(game);
  if (!audit.MINIGAME_GENRE_OF_CATEGORY[category]) idProblems.push('missing genre for category ' + category + ' (' + game.id + ')');
}
for (const id of Object.keys(audit.MINIGAME_INFO)) {
  if (!seenIds.has(id)) idProblems.push('MINIGAME_INFO entry without game: ' + id);
}
if (idProblems.length) fail('minigame id/info problems:\n' + idProblems.join('\n'));

console.log('SMOKE TEST OK');
console.log('DOM ids:', new Set(ids).size);
console.log('minigames started:', uniqueGames.length);
console.log('variant collections:', variantRefs.length);
