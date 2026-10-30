const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {harness}=require('./helpers/runtime-harness.cjs');

// Extended_Pictographic differs between Unicode versions for plain text symbols:
// ★ U+2605 and ♡ U+2661 are in it under Unicode 16 (Node <= 22.22) and not under
// Unicode 17 (Node >= 22.23). The runtime leaves an unmapped token as plain text,
// so a single code point that is not an emoji (Emoji=No, stable across versions)
// needs no illustration. Every emoji, modifier, flag, keycap or join still must.
const textSymbol=key=>[...key].length===1 && !/\p{Emoji}/u.test(key);
const unmapped=(keys,resolve)=>keys.filter(key=>!resolve(key) && !textSymbol(key));

test('every shipped UI/game emoji has an illustrated display definition',()=>{
  const h=harness({fullDisplay:true});
  const tokens=h.sandbox.NaotocchiDisplayIllustrations.tokens;
  const sources=fs.readdirSync('.',{withFileTypes:true})
    .filter(entry=>entry.isFile() && /\.(?:js|css|html)$/.test(entry.name))
    .map(entry=>entry.name).sort();
  const all=[...new Set(sources.flatMap(file=>tokens(fs.readFileSync(file,'utf8'))))];
  const missing=unmapped(all,key=>h.api.displayCatalog.resolve(key));
  assert.deepEqual(missing,[],'unmapped symbols: '+missing.join(' '));
  for(const key of all) {
    const d=h.api.displayCatalog.resolve(key);
    if(!d) continue;
    if(d.asset) assert.ok(fs.existsSync(d.asset),key+' '+d.asset);
    if(d.svg) assert.doesNotMatch(d.svg,/<text\b|<script\b|onload=/);
    if(d.frame) assert.ok(d.frame.every(Number.isFinite),key+' crop');
  }
});

test('the unmapped-symbol check gives the same result whether or not ★ ♡ are tokens (Unicode 16 and 17)',()=>{
  const h=harness({fullDisplay:true});
  const resolve=key=>h.api.displayCatalog.resolve(key);
  const shipped=['⭐','♥','♠','☰'];
  assert.deepEqual(unmapped([...shipped,'★','♡'],resolve),[],'Unicode 16 tokenisation');
  assert.deepEqual(unmapped(shipped,resolve),[],'Unicode 17 tokenisation');
  assert.equal(resolve('★'),null);assert.equal(resolve('♡'),null);
  // Still strict: an unmapped emoji, joined glyph, flag or emoji-style variant is reported.
  for(const key of ['👩🏽‍🚀','🇦🇶','★️','🦤']) {
    assert.equal(resolve(key),null,key);
    assert.deepEqual(unmapped([key],resolve),[key],key);
  }
});

test('the exact actor and generic game props are separate, and saves stay untouched',()=>{
  const h=harness({fullDisplay:true});
  Object.assign(h.api.state(),{speciesLine:'starfish',ageTicks:1000});
  const before=JSON.stringify(h.api.state());
  assert.match(h.api.displayCatalog.resolve('\uE000').asset,/starfish\//);
  assert.equal(h.api.displayCatalog.resolve('⭐').icon,'star_badge');
  assert.notEqual(h.api.displayCatalog.resolve('🔴').svg,h.api.displayCatalog.resolve('🟡').svg);
  assert.notEqual(h.api.displayCatalog.resolve('♠').svg,h.api.displayCatalog.resolve('♥').svg);
  assert.equal(h.api.displayCatalog.resolve('👩🏽‍🚀'),null,'unknown joined glyph stays whole');
  assert.equal(JSON.stringify(h.api.state()),before);
});
