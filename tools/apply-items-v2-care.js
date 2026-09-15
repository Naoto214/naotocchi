const fs = require('node:fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, text) { fs.writeFileSync(path, text); }
function replaceOnce(text, from, to, label) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 exact match, got ${count}`);
  return text.replace(from, to);
}
function replaceRegexOnce(text, regex, to, label) {
  const matches = [...text.matchAll(new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g'))];
  if (matches.length !== 1) throw new Error(`${label}: expected 1 regex match, got ${matches.length}`);
  return text.replace(regex, to);
}
function removeBetween(text, start, end, label, keepEnd = true) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  if (a < 0 || b < 0 || text.indexOf(start, a + start.length) >= 0) throw new Error(`${label}: markers missing or duplicated`);
  return text.slice(0, a) + (keepEnd ? text.slice(b) : text.slice(b + end.length));
}
function removeWholeTest(text, name) {
  const marker = `test('${name}'`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`missing obsolete test: ${name}`);
  const next = text.indexOf('\ntest(', start + marker.length);
  if (next < 0) return text.slice(0, start).trimEnd() + '\n';
  return text.slice(0, start) + text.slice(next + 1);
}
function updateCatalogBlock(text, id, desc, guard) {
  const startMarker = `  "${id}": {`;
  const start = text.indexOf(startMarker);
  if (start < 0) throw new Error(`catalog block missing: ${id}`);
  const end = text.indexOf('\n  },', start);
  if (end < 0) throw new Error(`catalog block end missing: ${id}`);
  let block = text.slice(start, end + 5);
  block = replaceRegexOnce(block, /"desc": "[^"]*"/, `"desc": "${desc}"`, `${id} desc`);
  block = replaceRegexOnce(block, /"guard": "[^"]*"/, `"guard": "${guard}"`, `${id} guard`);
  return text.slice(0, start) + block + text.slice(end + 5);
}

// ---------------------------------------------------------------------------
// Runtime: replace passive percentage equipment with V2 automation.
// ---------------------------------------------------------------------------
let script = read('script.js');
script = replaceOnce(script,
  '  const MAX_POOP = 4;\n',
  '  const MAX_POOP = 4;\n  const ITEM_AUTO_CARE_DANGER = 25;\n',
  'care danger threshold');

script = replaceOnce(script,
`      for (const k of Object.keys(out)) if (part[k] != null) {
        const coldHunger = k === 'hunger' && isEquipped('scarf') && ((i === 0 && env.weather === 'snow') || (i === 2 && env.season === 'winter'));
        out[k] *= coldHunger && part[k] > 1 ? 1 + (part[k] - 1) / 2 : part[k];
      }
`,
`      for (const k of Object.keys(out)) if (part[k] != null) out[k] *= part[k];
`,
  'remove scarf weather modifier');

script = replaceOnce(script,
`      const hungerFactor = isEquipped('bowtie') ? 0.78 : 1;
      const happinessFactor = isEquipped('ribbon') ? 0.78 : 1;
`, '', 'remove ribbon/bowtie passive factors');
script = replaceOnce(script,
`      if (!state.isSleeping && isEquipped('ribbon') && state.happiness > 60 && state.lifetime.itemProgress.ticks % 100 === 0) itemContextReaction('ribbon','リボンを揺らして、ごきげんな足どりが続いている。');
      const itemEnv = currentEnvironment();
      if (isEquipped('scarf') && (itemEnv.weather === 'snow' || (hasSurfaceSeasons(itemEnv.region) && itemEnv.season === 'winter')) && state.lifetime.itemProgress.ticks % 20 === 0) itemContextReaction('scarf','マフラーにくるまった。寒さで増えるおなかの負担が少し楽になる。');
`, '', 'remove old ribbon/scarf reactions');
script = replaceOnce(script,
`      state.hunger = clamp(state.hunger - 0.35 * sleepFactor * hungerFactor * legendFactor * envMod.hunger, 0, 100);
      state.happiness = clamp(state.happiness - 0.35 * sleepFactor * happinessFactor * legendFactor * envMod.happy, 0, 100);
`,
`      state.hunger = clamp(state.hunger - 0.35 * sleepFactor * legendFactor * envMod.hunger, 0, 100);
      state.happiness = clamp(state.happiness - 0.35 * sleepFactor * legendFactor * envMod.happy, 0, 100);
      if (isEquipped('bowtie') && state.hunger <= ITEM_AUTO_CARE_DANGER) {
        state.hunger = 100;
        itemContextReaction('bowtie', 'おなかが危なくなる前に、自動でごはんを食べてまんたんになった。');
      }
      if (isEquipped('ribbon') && state.happiness <= ITEM_AUTO_CARE_DANGER) {
        state.happiness = 100;
        itemContextReaction('ribbon', 'リボンを揺らして気分転換。ごきげんがまんたんになった。');
      }
`, 'add hunger/happiness automation');

script = replaceOnce(script,
`        const energyFactor = isEquipped('energy1') ? 0.82 : isEquipped('sleepboost1') && state.itemLife.pillowUntil >= state.lifetime.itemProgress.ticks ? 0.5 : 1;
`,
`        const energyFactor = isEquipped('energy1') ? 0.82 : 1;
`, 'remove old pillow fatigue reduction');

script = replaceOnce(script,
`      if (isEquipped('poop1') && state.poopCount >= 3 && ITEM_SYSTEM.ready(state, 'paper')) {
        state.poopCount -= 1;
        ITEM_SYSTEM.cooldown(state, 'paper', 60);
        setMessage('紙がころころ転がって、1個だけお片づけ。次のお手伝いは3分後');
      }
`,
`      if (isEquipped('poop1') && state.poopCount >= 3) {
        state.poopCount = 0;
        itemContextReaction('poop1', 'たまったうんちを、まとめて全部おそうじした。');
      }
`, 'paper auto-cleans all');

script = replaceOnce(script,
`        const sicknessChance = 0.03 * (isEquipped('scarf') ? 0.65 : 1);
`,
`        const sicknessChance = 0.03;
`, 'remove scarf prevention percentage');

script = replaceOnce(script,
`      // as long a losing streak to be fatal
      let healthDelta = 0;
`,
`      if (isEquipped('scarf') && state.isSick) {
        state.isSick = false;
        state.sicknessType = null;
        state.health = clamp(state.health + 20, 0, 100);
        state.energy = clamp(state.energy - 10, 0, 100);
        applyGrowth(8);
        applyDecline(-12);
        recordSicknessCure();
        checkStoryEvents('medicine-cure');
        itemContextReaction('scarf', '病気に気づいて、自動でくすりを使って治した。');
      }

      // as long a losing streak to be fatal
      let healthDelta = 0;
`, 'auto-cure disease equipment');

script = replaceRegexOnce(script,
/  function updateItemEffectTick\(\) \{[\s\S]*?\n  \}\n\n  let sleepRecoveryTimer = null;/,
`  function updateItemEffectTick() {
    if (isEquipped('star') && claimStarReward()) setMessage('星が3つそろった。15コイン!');
  }

  let sleepRecoveryTimer = null;`,
  'remove old pillow tick tracking');

script = replaceRegexOnce(script,
/  function startSleepRecovery\(\) \{[\s\S]*?\n  \}\n\n  const ACTION_RESULT_MESSAGES =/,
`  function startSleepRecovery() {
    stopSleepRecovery();
    if (!state.isSleeping) return;
    if (isEquipped('sleepboost1')) {
      const changed = state.energy < 100;
      state.energy = 100;
      if (changed) itemContextReaction('sleepboost1', 'ふかふかのまくらで、すぐにげんきまんたん。');
      render();
      return;
    }
    if (state.energy < 100) sleepRecoveryTimer = setInterval(recoverSleepStep, 100);
    recoverSleepStep();
  }

  const ACTION_RESULT_MESSAGES =`,
  'pillow immediate max sleep');

script = replaceOnce(script,
`    if (!isEquipped('sleepboost1')) { state.itemLife.pillowUntil = 0; state.itemLife.pillowSleepTicks = 0; }
`, '', 'remove pillow unequip runtime');
script = replaceOnce(script,
`      state.itemLife.pillowSleepTicks = 0;
`, '', 'remove pillow sleep-start counter');
script = replaceOnce(script,
`    if (isEquipped('sleepboost1') && state.itemLife.pillowSleepTicks >= 10 && !(state.itemLife.pillowUntil > state.lifetime.itemProgress.ticks)) {
      state.itemLife.pillowUntil = state.lifetime.itemProgress.ticks + 60;
    }
    state.itemLife.pillowSleepTicks = 0;
`, '', 'remove pillow wake buff');
script = replaceOnce(script,
`        if (item.id === 'poop1' && remaining('paper')) statusText += \`／次のお手伝いまで\${remaining('paper') * 3}秒\`;
`, '', 'remove paper cooldown status');

// ---------------------------------------------------------------------------
// Retired dedicated reward inventory + special reward/ring date route.
// ---------------------------------------------------------------------------
script = replaceRegexOnce(script,
/^    rewardItemGrid: document\.getElementById\('rewardItemGrid'\),\n/m,
'', 'remove reward element map');
script = removeBetween(script,
'  // 未使用のごほうびは永久在庫。デートや旅の出発時に使う。\n',
'  function renderItemOverlay() {', 'remove reward renderer');
script = replaceOnce(script, '    renderRewardItemGrid();\n', '', 'remove reward renderer call');
script = removeBetween(script,
"  el.rewardItemGrid.addEventListener('click', () => {\n",
'  // --- minigames (triggered by the play button) ---', 'remove reward click route');

script = replaceOnce(script,
'  function playOrdinaryDateMovie(plan, partner, traitLine, closing, useReward) {\n',
'  function playOrdinaryDateMovie(plan, partner, traitLine, closing) {\n', 'ordinary date signature');
script = replaceOnce(script,
`    const special = useReward === true;

    // ごほうび使用時は見た目も明確に別物にする。
    el.dateMovieScene.dataset.plan = special ? 'special' : plan.id;
    el.dateMovieScene.classList.toggle('special-reward', special);
    el.dateMoviePlace.textContent = special
      ? \`🎁とくべつなデート・\${plan.label}\`
      : \`\${plan.emoji || '💞'} \${plan.label}\`;
`,
`    el.dateMovieScene.dataset.plan = plan.id;
    el.dateMoviePlace.textContent = \`\${plan.emoji || '💞'} \${plan.label}\`;
`, 'remove special reward date presentation');
script = replaceOnce(script,
`    const extra = hasNaotoItem('naoto_ring')
      ? pickMovieStory('special:ring', book.ring).map(beat => beat.signature ? {...beat, text:ringSecretPhrase(partner)} : beat)
      : special ? pickMovieStory('special:day', book.special) : [];
`,
`    const extra = [];
`, 'remove ring/reward date extras');
script = replaceOnce(script,
`      ...extra,
      special ? 'この日のことが、ひとつ思い出に残った。'
        : state.regionId === 'deepsea' ? pickConversationLine(book.deepseaClosings) : closing,
    ];

    if (special) pushLifeLog('💝', \`とくべつなデートのおもいで: \${partner.label}と\${plan.label}\`);

    const mood = state.regionId === 'deepsea' ? 'deepsea' : special ? 'special' : plan.id;
`,
`      ...extra,
      state.regionId === 'deepsea' ? pickConversationLine(book.deepseaClosings) : closing,
    ];

    const mood = state.regionId === 'deepsea' ? 'deepsea' : plan.id;
`, 'remove special reward date beats');
script = replaceOnce(script,
`    playMovieBeats(beats, {step:special ? 4000 : 3500, kind:special ? 'special' : 'date', theme:mood,
`,
`    playMovieBeats(beats, {step:3500, kind:'date', theme:mood,
`, 'ordinary date movie mode');
script = replaceOnce(script,
'  function goOnDate(plan, useReward) {\n',
'  function goOnDate(plan) {\n', 'remove unused reward date argument');
script = replaceOnce(script,
'    playOrdinaryDateMovie(plan, partner, traitLine, closing, false);\n',
'    playOrdinaryDateMovie(plan, partner, traitLine, closing);\n', 'ordinary date call');
script = replaceRegexOnce(script,
/\n  function ringSecretPhrase\(partner\) \{[\s\S]*?\n  \}\n\n  function ringSecretLine\(partner\) \{[\s\S]*?\n  \}\n/,
'\n', 'remove old ring date phrases');
script = replaceOnce(script,
"    document.getElementById('dateMovieKicker').textContent = kind === 'legend' ? 'でんせつのであい' : kind === 'anniversary' ? 'ふたりのきねんび' : kind === 'special' ? 'とくべつなおもいで' : 'ふたりのじかん';\n",
"    document.getElementById('dateMovieKicker').textContent = kind === 'legend' ? 'でんせつのであい' : kind === 'anniversary' ? 'ふたりのきねんび' : 'ふたりのじかん';\n",
'remove special movie kind');
script = script.replace(/\.classList\.remove\('special-reward', 'anniversary-major'\)/g, ".classList.remove('anniversary-major')");
script = script.replace(/\.classList\.remove\('special-reward'\);\n/g, '');
if (/rewardItemGrid|renderRewardItemGrid|state\.items\.reward|useReward|special:ring|book\.special|ringSecretPhrase|ringSecretLine/.test(script)) {
  throw new Error('retired reward/ring route still present in script.js');
}
write('script.js', script);

let html = read('index.html');
html = replaceRegexOnce(html,
/          <div class="theme-section">\n            <div class="theme-section-title">ごほうび<\/div>\n            <div class="profile-hint">ミニゲームなどで、たまにもらえます。デートや旅のときに1こ使うと、とくべつな思い出に。使うかどうかは、出かけるときに選べます<\/div>\n            <div class="shop-item-grid" id="rewardItemGrid"><\/div>\n          <\/div>\n/,
'', 'remove reward inventory section');
if (/rewardItemGrid|ミニゲームなどで、たまにもらえます。デートや旅/.test(html)) throw new Error('retired reward UI remains in index.html');
write('index.html', html);

let dialogue = read('movie-dialogue.js');
dialogue = replaceRegexOnce(dialogue,
/\n  const special = \[[\s\S]*?\n  \];\n  \/\/ The partner's established phrase is shared with the saved ring memory\.\n  const ringPhrase = \{speaker:'partner', signature:true\};\n  const ring = \[[\s\S]*?\n  \];\n/,
'\n', 'remove retired reward/ring date dialogue pools');
dialogue = replaceOnce(dialogue,
'root.NaotocchiMovieDialogue = {dates, deepsea, partners, special, ring, anniversaries, shared, legends, deepseaClosings};',
'root.NaotocchiMovieDialogue = {dates, deepsea, partners, anniversaries, shared, legends, deepseaClosings};',
'movie dialogue export');
write('movie-dialogue.js', dialogue);

// ---------------------------------------------------------------------------
// Item copy: describe the behavior players actually get in V2.
// ---------------------------------------------------------------------------
let items = read('item-system.js');
items = updateCatalogBlock(items, 'ribbon',
  'ごきげんが危険になったら、自動で100まで回復する。',
  '通常時の自然減を軽くしない。危険域に入った時だけ発動し、手動のじゃれる回数や実績は増やさない。');
items = updateCatalogBlock(items, 'bowtie',
  'おなかが危険になったら、自動で100まで回復する。',
  '通常時の自然減を軽くしない。危険域に入った時だけ発動し、食べすぎ判定や手動のごはん回数は増やさない。');
items = updateCatalogBlock(items, 'poop1',
  'うんちが3個たまったら、全部自動でおそうじする。',
  '自動掃除では成長・掃除回数・掃除実績を加算しない。クールダウンは設けない。');
items = updateCatalogBlock(items, 'scarf',
  '病気になったら、自動でくすりを使って治す。',
  '発病率や季節・天気の負担は補正しない。自動治療は病気だけを対象にし、手動のくすり回数は増やさない。');
items = updateCatalogBlock(items, 'sleepboost1',
  '「ねる」を押すと、すぐげんきが100になる。',
  '睡眠後の時間限定バフは付けない。通常の睡眠状態・睡眠回数・十分に寝た時の成長判定は維持する。');
write('item-system.js', items);

// ---------------------------------------------------------------------------
// Retire old behavior tests; the dedicated V2 contract owns these semantics.
// Keep unrelated reservation/life-limit coverage.
// ---------------------------------------------------------------------------
let careTests = read('tests/item-care-game-test.cjs');
for (const name of [
  'paper removes only one at three with no care reward and sixty tick cooldown',
  'scarf halves only winter and snow added hunger burden',
  'pillow takes thirty seconds sleeping, lasts sixty ticks, ends on unequip',
  'ribbon and bowtie reduce only ordinary decay and free care remains available',
]) careTests = removeWholeTest(careTests, name);
careTests = replaceOnce(careTests,
"test('saved reservations and care cooldowns survive reload and life limits reset',()=>{\n  const {h,s}=setup('poop1');\n  s.poopCount=3;\n  h.api.tick();\n",
"test('saved reservations survive reload and life limits reset',()=>{\n  const {h,s}=setup();\n",
'care reload test setup');
careTests = replaceOnce(careTests,
"  assert.equal(r.lifetime.itemProgress.readyAt.paper,61);\n", '', 'remove paper reload cooldown assertion');
careTests = replaceOnce(careTests,
"  assert.equal(n.api.state().lifetime.itemProgress.readyAt.paper,61);\n", '', 'remove paper new-life cooldown assertion');
write('tests/item-care-game-test.cjs', careTests);

// Strengthen the V2 static cleanup guard to include the retired ring/date pools.
let v2 = read('tests/items-v2-care-automation-test.cjs');
v2 = replaceOnce(v2,
"  const script = fs.readFileSync('script.js', 'utf8');\n  assert.doesNotMatch(html, /rewardItemGrid|ミニゲームなどで、たまにもらえます。デートや旅/);\n  assert.doesNotMatch(script, /rewardItemGrid|renderRewardItemGrid|state\\.items\\.reward/);\n",
"  const script = fs.readFileSync('script.js', 'utf8');\n  const dialogue = fs.readFileSync('movie-dialogue.js', 'utf8');\n  assert.doesNotMatch(html, /rewardItemGrid|ミニゲームなどで、たまにもらえます。デートや旅/);\n  assert.doesNotMatch(script, /rewardItemGrid|renderRewardItemGrid|state\\.items\\.reward|useReward|special:ring|book\\.special|ringSecretPhrase|ringSecretLine/);\n  assert.doesNotMatch(dialogue, /const special =|const ringPhrase =|const ring =/);\n",
'strengthen retired reward/ring audit');
write('tests/items-v2-care-automation-test.cjs', v2);

console.log('Applied Items V2 care automation and retired reward/ring cleanup.');
