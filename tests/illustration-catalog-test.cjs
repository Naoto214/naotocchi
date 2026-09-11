const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {harness}=require('./helpers/runtime-harness.cjs');

test('every shipped UI/game emoji has an illustrated display definition',()=>{
  const h=harness({fullDisplay:true});
  const tokens=h.sandbox.NaotocchiDisplayIllustrations.tokens;
  const sources=['index.html','script.js','games.js'];
  const all=[...new Set(sources.flatMap(file=>tokens(fs.readFileSync(file,'utf8'))))];
  const missing=all.filter(key=>!h.api.displayCatalog.resolve(key));
  assert.deepEqual(missing,[],'unmapped symbols: '+missing.join(' '));
  for(const key of all) {
    const d=h.api.displayCatalog.resolve(key);
    if(d.asset) assert.ok(fs.existsSync(d.asset),key+' '+d.asset);
    if(d.svg) assert.doesNotMatch(d.svg,/<text\b|<script\b|onload=/);
    if(d.frame) assert.ok(d.frame.every(Number.isFinite),key+' crop');
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
