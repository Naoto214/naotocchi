const assert=require('node:assert/strict');
const {test}=require('node:test');
const vm=require('node:vm');
const {harness}=require('./helpers/runtime-harness.cjs');
function setup(options){const h=harness(options),s=h.api.state();h.api.ITEM_SYSTEM.normalize(s);Object.assign(s,{happiness:30,energy:30,decline:50});Object.assign(s.lifetime,{timeMode:'day',weatherMode:'sunny',seasonMode:'spring'});vm.runInContext('Math.random=()=>0.99',h.sandbox);return {h,s};}
function choose(h,id,data){const b=h.get('choice');b.dataset=data;b.disabled=false;h.get(id).closest=()=>b;h.dispatch(h.get(id),'click');}
function use(h,id){h.api.ITEM_SYSTEM.grant(h.api.state(),id);h.api.renderItemOverlay();choose(h,'onetimeItemGrid',{itemAction:'use',id});}
function reload(s){return harness({resume:true,storage:{getItem:k=>k==='naotocchi-save-v1'?JSON.stringify(s):null,setItem(){},removeItem(){}}});}
test('bag candy gives eight happiness, no food, and twenty ticks of exclusive taste', () => {
  const {h,s} = setup();
  const hunger = s.hunger;

  use(h, 'fun_candy');

  assert.equal(s.happiness, 38);
  assert.equal(s.hunger, hunger);
  h.api.ITEM_SYSTEM.grant(s, 'fun_candy');
  assert.equal(h.api.useItem('fun_candy'), false);
  assert.equal(s.itemLife.candyUntil, 20);

  s.lifetime.itemProgress.ticks = 20;
  assert.equal(h.api.useItem('fun_candy'), true);
  assert.equal(s.happiness, 46);
});

test('bubbles reach every active companion, fireworks affect only existing partner', () => {
  const {h,s} = setup();
  s.companions = h.api.normalCompanions.slice(0,3).map(c => ({id:c.id,bond:40}));

  use(h, 'fun_bubbles');

  assert.equal(s.happiness, 40);
  assert.deepEqual(Array.from(s.companions, c => c.bond), [50,50,50]);

  s.partner = {...h.api.REGIONS.flatMap(r => r.candidates || [])[0], affection:40};
  use(h, 'fun_fireworks');

  assert.equal(s.happiness, 55);
  assert.equal(s.partner.affection, 55);
  assert.equal(s.lifetime.itemMemories.specials.at(-1).itemId, 'fun_fireworks');
});

test('box literal RNG outcomes and persistent hundred-tick limit have no cash or growth', () => {
  for (const [roll,happy,energy] of [[.1,35,30],[.6,40,30],[.9,30,40]]) {
    let {h,s} = setup();
    vm.runInContext(`Math.random=()=>${roll}`, h.sandbox);
    const cash = s.lifetime.money, growth = s.sodachi;

    use(h, 'fun_surprise');

    assert.equal(s.happiness, happy);
    assert.equal(s.energy, energy);
    assert.equal(s.lifetime.money, cash);
    assert.equal(s.sodachi, growth);

    h = reload(s);
    s = h.api.state();
    h.api.useItem('fun_surprise');

    assert.equal(s.happiness, happy);
    assert.equal(s.energy, energy);
    assert.equal(s.lifetime.itemProgress.readyAt.surprise, 100);

    s.lifetime.itemProgress.ticks = 100;
    vm.runInContext('Math.random=()=>0.1', h.sandbox);
    h.api.useItem('fun_surprise');
    assert.equal(s.happiness, happy+5);
  }
});

test('camera bag route persists frozen visuals and unlimited shots do not farm consumption', () => {
  let {h,s} = setup();

  use(h, 'fun_camera');
  const photo = s.lifetime.itemMemories.photos[0];
  assert.ok(photo.actors[0].asset);
  const oldAsset = photo.actors[0].asset, age = photo.age;
  const used = s.lifetime.consumablesUsed;

  for (let i=0; i<31; i++) h.api.useItem('fun_camera');

  assert.equal(s.lifetime.consumablesUsed, used);
  assert.equal(h.api.itemStock('fun_camera'), 0);
  s.speciesLine = 'cat';
  s.ageTicks += 1000;
  h = reload(s);
  s = h.api.state();
  choose(h, 'itemMemoriesBtn', {});

  assert.ok(h.get('itemMemoriesList').innerHTML.includes(oldAsset));
  assert.equal(s.lifetime.itemMemories.photos[0].age, age);
  assert.equal(s.lifetime.itemMemories.photos.length, 32);
});

test('music bag and saved tune selection play and only heal once per hundred ticks', () => {
  let {h,s} = setup();
  const played = [];
  h.api.audio.playItemTune = id => { played.push(id); return true; };

  use(h, 'fun_musicbox');

  assert.equal(s.decline, 40);
  assert.ok(s.lifetime.itemMemories.tunes.length >= 2);
  const tune = s.lifetime.itemMemories.tunes[0];
  choose(h, 'itemMemoriesList', {memoryAction:'play',key:tune.key,kind:'tunes'});
  assert.ok(played.includes(tune.tuneId));
  assert.equal(s.decline, 40);

  h = reload(s);
  s = h.api.state();
  h.api.useItem('fun_musicbox');
  assert.equal(s.decline, 40);

  s.lifetime.itemProgress.ticks = 100;
  h.api.useItem('fun_musicbox');
  assert.equal(s.decline, 30);
});

test('balloon waits through game and other invitation, then opens one normal invitation', () => {
  const {h,s} = setup();

  use(h, 'fun_balloon');
  assert.ok(s.itemLife.balloon);
  h.api.ITEM_SYSTEM.grant(s, 'fun_balloon');
  assert.equal(h.api.useItem('fun_balloon'), false);

  h.api.startMinigame(h.api.games[0], {intro:false});
  for (let i=0; i<15; i++) h.api.tick();
  assert.ok(s.itemLife.balloon);

  h.api.retireMinigame();
  h.api.setPendingCompanion(h.api.normalCompanions[0].id);
  h.api.tick();
  assert.ok(s.itemLife.balloon);

  h.api.setPendingCompanion(null);
  h.api.setMessage('');
  h.api.closeAllMenuOverlays();
  h.api.tick();

  assert.equal(s.itemLife.balloon, null);
  assert.equal(h.api.itemStock('fun_balloon'), 1);
  assert.equal(h.get('companionInviteOverlay').classList.contains('hidden'), false);
});

test('balloon with no eligible candidate costs nothing', () => {
  const {h,s} = setup();
  s.companions = h.api.normalCompanions.map(c => ({id:c.id,bond:100}));
  h.api.ITEM_SYSTEM.grant(s, 'fun_balloon');

  assert.equal(h.api.useItem('fun_balloon'), false);
  assert.equal(h.api.itemStock('fun_balloon'), 1);
});

test('crown stores seven distinct contextual reactions and legacy tickets are only scenes', () => {
  const {h,s} = setup();
  s.lifetime.ownedNaotoItems = ['naoto_crown'];
  s.lifetime.endingTiersReached = [3];
  const ids = ['fun_candy','fun_bubbles','fun_balloon','fun_fireworks','fun_camera','fun_musicbox','fun_surprise'];

  for (const id of ids) use(h, id);

  assert.equal(new Set(s.lifetime.itemMemories.reactions.map(r => r.itemId)).size, 7);
  assert.equal(new Set(s.lifetime.itemMemories.reactions.map(r => r.text)).size, 7);
  for (const id of ids) assert.ok(s.lifetime.ownedConsumableItems.includes(id));
  assert.equal(h.api.achievements.find(a => a.id === 'consumable-all').condition(s.lifetime,s), true);
  const restored = reload(s).api.state();
  assert.equal(restored.lifetime.itemMemories.reactions.length, 7);

  s.lifetime.itemExtraScenes.fun_surprise = 2;
  const cash = s.lifetime.money, happy = s.happiness, energy = s.energy;
  choose(h, 'onetimeItemGrid', {itemAction:'scene',id:'fun_surprise'});

  assert.equal(s.lifetime.itemExtraScenes.fun_surprise, 1);
  assert.equal(s.lifetime.money, cash);
  assert.equal(s.happiness, happy);
  assert.equal(s.energy, energy);
});

test('shared memory UI escapes stored text, retains single combined ring/date, and shows export failure', async () => {
  const {h,s} = setup();
  h.api.addItemMemory('letters', {key:'letter',text:'<img src=x onerror=x>',partner:{label:'<script>'}});
  h.api.addItemMemory('specials', {key:'date',ringKey:'ring',ringPhrase:'ひみつ',text:'ふたりのひみつ'});

  use(h, 'fun_camera');
  choose(h, 'itemMemoriesBtn', {});

  assert.ok(h.get('itemMemoriesList').innerHTML.includes('&lt;img'));
  assert.ok(!h.get('itemMemoriesList').innerHTML.includes('<img src=x'));
  assert.equal((h.get('itemMemoriesList').innerHTML.match(/ふたりのひみつ/g) || []).length, 1);

  choose(h, 'itemMemoriesList', {memoryAction:'export',kind:'photos',key:s.lifetime.itemMemories.photos[0].key});
  await new Promise(resolve => setImmediate(resolve));
  assert.match(h.get('itemMemoryStatus').textContent, /画像を作れ/);
});

test('real gallery export draws saved assets after growth and offers a PNG download',async()=>{
 let {h,s}=setup({fullDisplay:true});s.partner={...h.api.REGIONS.flatMap(r=>r.candidates||[])[0],affection:40};s.companions=h.api.normalCompanions.slice(0,2).map(c=>({id:c.id,bond:50}));use(h,'fun_camera');
 const snapshot=JSON.parse(JSON.stringify(s.lifetime.itemMemories.photos[0]));assert.equal(snapshot.actors.length,4);s.speciesLine='cat';s.ageTicks+=1000;h=reload(s);s=h.api.state();
 const draws=[],labels=[],formats=[];const create=h.document.createElement;
 h.document.createElement=tag=>{if(tag!=='canvas')return create(tag);return {getContext:()=>({fillRect(){},fillText:t=>labels.push(t),drawImage:img=>draws.push(img.src)}),toDataURL:type=>{formats.push(type);return 'data:image/png;base64,ZmFrZQ==';}};};
 h.sandbox.Image=class{set src(value){this._src=value;this.onload();}get src(){return this._src;}};
 choose(h,'itemMemoriesBtn',{});choose(h,'itemMemoriesList',{memoryAction:'export',kind:'photos',key:snapshot.key});await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(draws,snapshot.actors.map(a=>a.asset));assert.deepEqual(formats,['image/png']);assert.ok(labels.includes(`${snapshot.age}さいの思い出`));assert.equal(h.get('itemMemoryExport').children[1].download,'naotocchi-photo.png');assert.ok(!JSON.stringify(s.lifetime.itemMemories).includes('data:image'));
});
test('actual audio controller is reached from bag and saved tune buttons and respects sound off',()=>{
 const {h,s}=setup();const notes=[];const param=()=>({value:1,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
 const node=()=>({connect(){},start(){},stop(){},disconnect(){},gain:param(),frequency:param(),detune:param(),Q:param()});
 h.sandbox.AudioContext=class{constructor(){this.currentTime=0;this.sampleRate=8;this.state='running';this.destination={};}createGain(){return node();}createBuffer(){return {getChannelData:()=>[]};}createBufferSource(){return node();}createBiquadFilter(){return node();}createOscillator(){const n=node();notes.push(n);return n;}};
 h.dispatch(h.document,'pointerdown');const start=notes.length;use(h,'fun_musicbox');assert.ok(notes.length>=start+8);
 const tune=s.lifetime.itemMemories.tunes.find(t=>t.tuneId==='place:home'),before=notes.length;choose(h,'itemMemoriesBtn',{});choose(h,'itemMemoriesList',{memoryAction:'play',kind:'tunes',key:tune.key});assert.equal(notes.length,before+8);
 s.lifetime.soundSfx=false;h.api.audio.settingsChanged();const muted=notes.length;choose(h,'itemMemoriesList',{memoryAction:'play',kind:'tunes',key:tune.key});assert.equal(notes.length,muted);assert.match(h.get('itemMemoryStatus').textContent,/音が出せません/);
});
test('all effect handlers reach different real scene nodes, including water/day/night and reduced motion',()=>{
 const {h,s}=setup({reducedMotion:true,fullDisplay:true});for(const id of ['fun_candy','fun_bubbles','fun_balloon','fun_fireworks','fun_camera','fun_musicbox','fun_surprise']){use(h,id);const node=h.get('petArea').children.findLast(n=>n.className==='item-experience');assert.equal(node.dataset.effect,id.slice(4));assert.ok(node.innerHTML.length>0);}
 s.regionId='deepsea';use(h,'fun_fireworks');assert.equal(h.get('petArea').children.at(-1).dataset.setting,'water');s.regionId='home';s.lifetime.timeMode='night';use(h,'fun_fireworks');assert.equal(h.get('petArea').children.at(-1).dataset.setting,'sky');h.advance(3100);assert.equal(h.get('petArea').children.filter(n=>n.className==='item-experience'&&n.isConnected).length,0);
});
test('balloon reload retains preparation, later loss of candidates returns unspent stock',()=>{
 let {h,s}=setup();use(h,'fun_balloon');for(let i=0;i<5;i++)h.api.tick();h=reload(s);s=h.api.state();assert.equal(s.itemLife.balloon.readyAt,10);assert.equal(h.api.itemStock('fun_balloon'),1);s.companions=h.api.normalCompanions.map(c=>({id:c.id,bond:100}));h.api.setMessage('');for(let i=0;i<5;i++)h.api.tick();assert.equal(s.itemLife.balloon,null);assert.equal(h.api.itemStock('fun_balloon'),1);
});

test('guest photo keeps saved identity and emoji when the partner later changes',()=>{const {h,s}=setup();s.partner={id:'guest',label:'あの子',emoji:'🐟',originId:'guest-origin-123',guestSnapshot:{speciesLine:'clownfish',stage:2,emoji:'🐟',gender:'female'}};use(h,'fun_camera');const photo=s.lifetime.itemMemories.photos[0];s.partner={id:'different',label:'べつの子',emoji:'🐈'};const again=reload(s);choose(again,'itemMemoriesBtn',{});const saved=again.api.state().lifetime.itemMemories.photos[0];assert.equal(saved.partner.originId,'guest-origin-123');assert.equal(saved.actors[1].emoji,'🐟');assert.equal(saved.actors[1].asset,null);assert.ok(again.get('itemMemoriesList').innerHTML.includes('あの子'));assert.ok(!again.get('itemMemoriesList').innerHTML.includes('べつの子'));});

test('each crown item varies by young/elder age and solo/partner/companion cast', () => {
  const itemIds = ['fun_candy','fun_bubbles','fun_balloon','fun_fireworks','fun_camera','fun_musicbox','fun_surprise'];
  for (const itemId of itemIds) {
    const records = [];
    for (const age of [10,80]) {
      for (const cast of ['solo','partner','companions','partner-companions']) {
        const {h,s} = setup();
        s.lifetime.ownedNaotoItems = ['naoto_crown'];
        s.ageTicks = age * 20;
        if (cast.includes('partner')) s.partner = {...h.api.REGIONS.flatMap(r => r.candidates || [])[0], affection:50};
        if (cast.includes('companions')) s.companions = [{id:h.api.normalCompanions[0].id, bond:50}];

        use(h, itemId);
        const record = s.lifetime.itemMemories.reactions[0];
        assert.equal(record.ageBand, age === 10 ? 'young' : 'elder');
        assert.equal(record.castKind, cast);
        assert.equal(record.itemId, itemId);
        assert.ok(record.variantId.includes(itemId));
        assert.deepEqual(Array.from(record.companionIds), Array.from(s.companions, c => c.id));
        h.advance(2501);
        assert.equal(h.get('speechText').textContent, record.text, `${itemId}: the selected line is actually spoken`);
        records.push(record);
      }
    }
    assert.equal(new Set(records.map(r => r.text)).size, 8, `${itemId}: age and cast change the actual line`);
    assert.equal(new Set(records.map(r => r.key)).size, 8, `${itemId}: variants have distinct persistent identities`);
  }
});

test('crown context uses age boundaries and stable cast identities, deduplicates after reload, and preserves old records', () => {
  let {h,s} = setup();
  s.lifetime.ownedNaotoItems = ['naoto_crown'];
  s.ageTicks = 12 * 20;
  s.companions = h.api.normalCompanions.slice(0,2).map(c => ({id:c.id,bond:50}));
  const old = {key:'crown:fun_camera:legacy-context',itemId:'fun_camera',text:'以前のかんむりの思い出'};
  h.api.addItemMemory('reactions', old);
  use(h,'fun_camera');
  const first = s.lifetime.itemMemories.reactions[1];

  // Same cast, different render order and bonds is the same saved context.
  s.companions.reverse();
  s.companions[0].bond = 80;
  h.api.useItem('fun_camera');
  assert.equal(s.lifetime.itemMemories.reactions.length, 2);
  h = reload(s); s = h.api.state();
  h.api.useItem('fun_camera');
  assert.equal(s.lifetime.itemMemories.reactions.length, 2);
  assert.equal(s.lifetime.itemMemories.reactions[1].key, first.key);

  // The existing fun-dialogue boundary is 13, inside the same visual life stage.
  s.ageTicks = 13 * 20;
  h.api.useItem('fun_camera');
  const adult = s.lifetime.itemMemories.reactions[2];
  assert.equal(adult.stage, first.stage);
  assert.equal(adult.ageBand,'adult');
  assert.notEqual(adult.text, first.text);
  assert.notEqual(adult.key, first.key);

  s.companions[0] = {id:h.api.normalCompanions[2].id,bond:50};
  h.api.useItem('fun_camera');
  assert.equal(s.lifetime.itemMemories.reactions.length, 4);
  assert.notEqual(s.lifetime.itemMemories.reactions[3].key, adult.key);
  s.partner = {id:'guest',label:'あいて',emoji:'🐟',originId:'crown-partner-0001'};
  h.api.useItem('fun_camera');
  const guest = s.lifetime.itemMemories.reactions[4];
  assert.equal(guest.partnerIdentity,'guest-origin:crown-partner-0001');
  s.partner.originId = 'crown-partner-0002';
  h.api.useItem('fun_camera');
  assert.notEqual(s.lifetime.itemMemories.reactions[5].key, guest.key);
  const restored = reload(s).api.state();
  assert.equal(restored.lifetime.itemMemories.reactions.length, 6);
  assert.equal(restored.lifetime.itemMemories.reactions[0].text, old.text);
  assert.equal(restored.lifetime.itemMemories.reactions[0].key, old.key);
});
