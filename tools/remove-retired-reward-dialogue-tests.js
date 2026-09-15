const fs = require('node:fs');

function rewrite(path, fn) {
  const before = fs.readFileSync(path, 'utf8');
  const after = fn(before);
  if (after !== before) fs.writeFileSync(path, after);
}

rewrite('tests/dialogue-test.js', (input) => {
  let text = input;
  const start = '// A browser may suppress native confirm and return false. The reward decision';
  const end = "// Every deep-sea plan's three opening-line branches must reach the final beat";
  const a = text.indexOf(start);
  const b = text.indexOf(end, a >= 0 ? a : 0);
  if (a >= 0 && b > a) {
    const replacement = `// The dedicated \"ごほうび\" date path was retired. Keep the ordinary\n// close/pause helper because the deep-sea date lifecycle below still uses it.\nfunction assertDateReturned(expectedAge, expectedCooldown, label) {\n  assert.equal(getElement('dateOverlay').classList.contains('hidden'), true, label + ': overlay stayed open');\n  assert.equal(getElement('dateMovie').classList.contains('hidden'), true, label + ': movie stayed visible');\n  assert.equal(getElement('dateChooser').classList.contains('hidden'), false, label + ': chooser not reset');\n  const count = captions.length;\n  advance(35000);\n  assert.equal(captions.length, count, label + ': captions continued after close');\n  api.loop();\n  assert.equal(api.getState().ageTicks, expectedAge + 1, label + ': care clock did not resume');\n  assert.equal(api.getState().dateCooldownTicks, expectedCooldown - 1, label + ': cooldown did not resume');\n}\n\n`;
    text = text.slice(0, a) + replacement + text.slice(b);
  }
  text = text.replace(
    /console\.log\('DATE LIFECYCLE TEST OK:[^\n]*\);/,
    "console.log('DATE LIFECYCLE TEST OK: ordinary dates, skip/close, pause/resume/cooldown and complete deep-sea branches.');"
  );
  text = text.replace(
    /api\.getState\(\)\.items\.reward = 1;\napi\.goOnDate\(api\.DATE_PLANS\[0\]\);\nassert\.match\(getElement\('dateRewardPlan'\)\.textContent, \/となりまちのロボット\/\);\nassert\.equal\(api\.getState\(\)\.partner\.label, 'となりまちの ロボット', 'date prompt rewrote the saved partner'\);\n/,
    "assert.equal(api.getState().partner.label, 'となりまちの ロボット', 'ordinary profile/date display rewrote the saved partner');\n"
  );
  text = text.replace(
    "console.log('WHOLE-TEXT TEST OK: 248 descriptions; 40 ordinary stories; 10 deep-sea plans; special rewards and skip; 36 anniversary lines; 7 items; event memories; 18 first encounters.');",
    "console.log('WHOLE-TEXT TEST OK: 248 descriptions; 40 ordinary stories; 10 deep-sea plans; ordinary date skip/close; 36 anniversary lines; event memories; 18 first encounters.');"
  );
  return text;
});

rewrite('item-memories.js', (text) => text.replace(
  /^\/\/ Retired legacy-only branches in script\.js are permanently disabled\.\n\/\/ Dedicated reward inventory\/UI\/grants\/consumption and the old ring phrase path are removed from behavior\.\nvar gotReward = false;\nvar specialRewardTrip = false;\nvar firstRingPhrase = false;\n\n/,
  ''
));

rewrite('script.js', (input) => {
  let text = input;
  text = text.replace(
    /\n    const special = false;\n    if \(firstRingPhrase\) \{\n      addItemMemory\('specials', itemMemorySnapshot\(ringKey, firstRingPhrase, \{event:'ring'\}\)\);\n    \}\n/,
    '\n'
  );
  text = text.replace(
    '    playOrdinaryDateMovie(plan, partner, traitLine, closing, special);',
    '    playOrdinaryDateMovie(plan, partner, traitLine, closing, false);'
  );
  text = text.replace(
    "      apply: () => { state.oneTimeBoosts.greatReward = true; return { message: '大成功のおまもりをにぎった。実点70以上で、ごほうび1個とせいちょう28' }; } },",
    "      apply: () => { state.oneTimeBoosts.greatReward = true; return { message: '大成功のおまもりをにぎった。実点70以上で、せいちょう28' }; } },"
  );
  text = text.replace(
    '    const spammedTravel = !specialRewardTrip && !travelGuaranteed && state.travelStreak > travelSpamThreshold();',
    '    const spammedTravel = !travelGuaranteed && state.travelStreak > travelSpamThreshold();'
  );
  text = text.replace(
    /    const travelMemory = specialRewardTrip \|\| travelGuaranteed \? addItemMemory\('specials',itemMemorySnapshot\(`travel:\$\{\+\+state\.lifetime\.itemProgress\.sceneSerial\}`, `\$\{region\.label\}で、いつもよりゆっくりすごした。\$\{reaction\}`, \{event:specialRewardTrip \? 'special-travel' : 'travel-detour',choiceId:choice\?\.scene\?\.id \|\| null\}\)\) : null;/,
    "    const travelMemory = travelGuaranteed ? addItemMemory('specials',itemMemorySnapshot(`travel:${++state.lifetime.itemProgress.sceneSerial}`, `${region.label}で、いつもよりゆっくりすごした。${reaction}`, {event:'travel-detour',choiceId:choice?.scene?.id || null})) : null;"
  );
  text = text.replace(
    /      if \(specialRewardTrip\) \{\n        pushLifeLog\('🎁', `とくべつな旅のおもいで: \$\{region\.label\}`\);\n        setMessage\(`🎁 \$\{region\.emoji\} \$\{region\.label\}で、いつもよりゆっくりすごした。\$\{reaction\}`\);\n      \} else \{\n        setMessage\(spammedTravel/,
    '      {\n        setMessage(spammedTravel'
  );
  return text;
});

rewrite('item-system.js', (input) => {
  let text = input.replace(
    /,?\s*itemluck2\s*:\s*'itemluck1'\s*,\s*itemluck3\s*:\s*'itemluck1'\s*/,
    ''
  );
  text = text.replace(
    'p.ticks = count(p.ticks); p.cloverMisses = count(p.cloverMisses);',
    "p.ticks = count(p.ticks); delete p.cloverMisses;"
  );
  return text;
});

const production = {
  'item-system.js': fs.readFileSync('item-system.js', 'utf8'),
  'script.js': fs.readFileSync('script.js', 'utf8'),
  'index.html': fs.readFileSync('index.html', 'utf8'),
  'item-memories.js': fs.readFileSync('item-memories.js', 'utf8'),
};
const forbidden = [
  'dateRewardConfirm', 'dateRewardUseBtn', 'dateRewardSkipBtn', 'dateRewardBackBtn',
  'itemSceneRewardActions', 'itemSceneRewardUseBtn', 'itemSceneRewardSkipBtn',
  "CATALOG.reward", "ITEM_SYSTEM.grant(state, 'reward')", "ITEM_SYSTEM.take(state, 'reward')",
  "ITEM_SYSTEM.stock(state,'reward')", "ITEM_SYSTEM.stock(state, 'reward')",
  'itemluck1', 'itemluck2', 'itemluck3', 'firstRingPhrase', 'specialRewardTrip', 'gotReward'
];
for (const [path, text] of Object.entries(production)) {
  for (const needle of forbidden) {
    if (text.includes(needle)) throw new Error(`retired reward production reference remains in ${path}: ${needle}`);
  }
}
