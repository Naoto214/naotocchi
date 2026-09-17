const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const {harness}=require('./helpers/runtime-harness.cjs');

const root=path.join(__dirname,'..');
const ids=[
  'poop1','sleepboost1','bowtie','ribbon','scarf','travel1','partner1','bond1','gamepass1','star',
  'naoto_charm','naoto_lantern','naoto_ring','naoto_crown',
  'c_coin2','c_life','c_life_charm','c_time_back','c_time_forward','c_transform','c_dex','c_friend',
  'c_rare_friend','c_match','c_egg_normal','c_egg_rare','sticker_pack',
];

test('the unified manifest gives every one of the 27 item identities a dedicated normalized PNG',async()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/items/unified/manifest.json'),'utf8'));
  assert.deepEqual(Object.keys(manifest.items),ids);
  assert.equal(new Set(Object.values(manifest.items)).size,27,'no two semantic items share an asset');
  assert.notEqual(manifest.items.c_time_back,manifest.items.c_time_forward);
  assert.notEqual(manifest.items.c_egg_normal,manifest.items.c_egg_rare);
  for(const [id,relative] of Object.entries(manifest.items)){
    assert.equal(relative,`assets/items/unified/${id}.png`,id);
    const image=sharp(path.join(root,relative));
    const meta=await image.metadata();
    assert.deepEqual([meta.width,meta.height],[128,128],id);
    assert.equal(meta.hasAlpha,true,id);
    const trim=await image.trim({background:{r:0,g:0,b:0,alpha:0}}).toBuffer({resolveWithObject:true});
    const extent=Math.max(trim.info.width,trim.info.height);
    assert.ok(extent>=104&&extent<=112,`${id} visible extent ${extent}`);
  }
});

test('shop, home, consumables and item stickers use semantic unified art',()=>{
  const h=harness();
  Object.assign(h.api.state().lifetime,{ownedShopItems:['ribbon'],equippedItemId:'ribbon',endingTiersReached:[0,1,2,3]});
  h.api.openExclusiveMenu('item');h.api.render();
  for(const id of ids.slice(0,14)) assert.match(
    (id.startsWith('naoto_')?h.get('naotoItemGrid'):h.get('shopItemGrid')).innerHTML,
    new RegExp(`assets/items/unified/${id}\\.png`),id);
  for(const id of ids.slice(14,26)) assert.match(h.get('onetimeItemGrid').innerHTML,new RegExp(`assets/items/unified/${id}\\.png`),id);
  assert.match(h.get('petAccessory').innerHTML,/assets\/items\/unified\/ribbon\.png/);
  assert.match(h.api.stickerById('item:ribbon').visual(),/assets\/items\/unified\/ribbon\.png/);
  h.api.renderStickerOverlay();
  assert.match(h.get('stickerPackBtn').innerHTML,/assets\/items\/unified\/sticker_pack\.png/);
});

test('a unified image failure reveals only its semantic fallback without changing state',()=>{
  const h=harness();h.api.state().lifetime.ownedShopItems=['ribbon'];h.api.state().lifetime.equippedItemId='ribbon';h.api.render();
  const before=JSON.stringify(h.api.state()),failed=h.get('failedEquipment'),other=h.get('otherEquipment');
  const img=h.document.createElement('img');img.tagName='IMG';img.classList.add('item-asset');
  img.closest=selector=>selector==='.item-picture'?failed:null;
  for(const listener of h.document.listeners.filter(e=>e.type==='error'))listener.fn({target:img});
  assert.ok(failed.classList.contains('asset-failed'));
  assert.equal(other.classList.contains('asset-failed'),false);
  assert.match(h.get('petAccessory').innerHTML,/class="icon-fallback"[^>]*>🎀<\/span>/);
  assert.equal(JSON.stringify(h.api.state()),before);
});

test('the unified shop art frame is 40px while the home accessory keeps its inherited frame',()=>{
  const css=fs.readFileSync(path.join(root,'ui-illustrations.css'),'utf8');
  assert.match(css,/\.shop-item-emoji \.item-picture\s*\{[^}]*width:40px[^}]*height:40px/);
  assert.match(css,/#petAccessory \.item-picture\s*\{[^}]*width:1em[^}]*height:1em/);
});
