const fs = require('node:fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, text) { fs.writeFileSync(path, text); }
function requiredReplace(text, search, replacement, label) {
  if (!text.includes(search)) throw new Error(`missing expected ${label}`);
  return text.replace(search, replacement);
}
function requiredRegex(text, regex, replacement, label) {
  if (!regex.test(text)) throw new Error(`missing expected ${label}`);
  regex.lastIndex = 0;
  return text.replace(regex, replacement);
}

let items = read('item-system.js');
items = requiredRegex(items, /\n  "itemluck1": \{[\s\S]*?\n  \},(?=\n  "c_coin2")/, '', 'clover catalog block');
items = requiredRegex(items, /\n  "reward": \{[\s\S]*?\n  \},(?=\n  "naoto_charm")/, '', 'reward catalog block');
items = items
  .replace('ゲームのごほうびと失敗の判定に10点プラス。記録はそのまま。', 'ゲームの失敗判定に10点プラス。記録はそのまま。')
  .replace('次のゲームのごほうびと失敗の判定に25点プラス。記録はそのまま。', '次のゲームの失敗判定に25点プラス。記録はそのまま。')
  .replace('次の実点70以上で、ごほうび1個とせいちょう28。2ばい中は56。実点70未満なら発動を待つ。', '次の実点70以上で、せいちょう28。2ばい中は56。実点70未満なら発動を待つ。')
  .replace('クローバー等と重なってもごほうびは合計1個。', '')
  .replace(' 旧ごほうび保管箱ロジックへは戻さない。', '');
write('item-system.js', items);

let html = read('index.html');
html = requiredRegex(html, /\n\s*<div class="date-reward-actions" id="itemSceneRewardActions">[\s\S]*?<\/div>(?=\n\s*<button type="button" class="date-cancel-btn" id="itemSceneCancelBtn")/, '', 'item-scene reward actions');
html = requiredRegex(html, /\n\s*<div[^>]*id="dateRewardConfirm"[\s\S]*?<\/div>\s*(?=\n\s*<div[^>]*id="dateMovie")/, '\n', 'date reward confirmation');
write('index.html', html);

let script = read('script.js');
script = script
  .replace(/\n\s*dateRewardConfirm: document\.getElementById\('dateRewardConfirm'\),\n\s*dateRewardPlan: document\.getElementById\('dateRewardPlan'\),\n\s*dateRewardTitle: document\.getElementById\('dateRewardTitle'\),\n\s*dateRewardCount: document\.getElementById\('dateRewardCount'\),\n\s*dateRewardUseBtn: document\.getElementById\('dateRewardUseBtn'\),\n\s*dateRewardSkipBtn: document\.getElementById\('dateRewardSkipBtn'\),\n\s*dateRewardBackBtn: document\.getElementById\('dateRewardBackBtn'\),/g, '')
  .replace(/\n\s*itemSceneRewardActions: document\.getElementById\('itemSceneRewardActions'\),\n\s*itemSceneRewardUseBtn: document\.getElementById\('itemSceneRewardUseBtn'\),\n\s*itemSceneRewardSkipBtn: document\.getElementById\('itemSceneRewardSkipBtn'\),/g, '')
  .replace(/\n\s*\{ id: 'itemluck1', label: 'よつばのクローバー',[^\n]*\},/g, '')
  .replace(/,itemluck1:'clover'/g, '')
  .replace(/\n\s*if \(item\.id === 'itemluck1'\)[^\n]*;/g, '')
  .replace(/\n\s*itemluck1:[^\n]*,/g, '')
  .replace(/\n\s*\['itemluck1'[^\n]*\],?/g, '')
  .replace(/\n\s*el\.dateRewardConfirm\.classList\.add\('hidden'\);/g, '')
  .replace(/\n\s*el\.itemSceneRewardActions\.classList\.add\('hidden'\);/g, '')
  .replace(/\n\s*el\.itemSceneRewardUseBtn\.addEventListener[^\n]*\);/g, '')
  .replace(/\n\s*el\.itemSceneRewardSkipBtn\.addEventListener[^\n]*\);/g, '')
  .replace(/\n\s*el\.dateRewardUseBtn\.addEventListener[\s\S]*?el\.dateRewardConfirm\.addEventListener\('keydown',[\s\S]*?\n\s*\}\);/g, '')
  .replace(/\n\s*function confirmDateReward\([\s\S]*?\n\s*\}\n\n\s*function returnToDateChoices\([\s\S]*?\n\s*\}/g, '')
  .replace(/\n\s*\/\/ Native dialogs may be suppressed[\s\S]*?\n\s*}\n\s*pendingDatePlan = null;/g, '\n    pendingDatePlan = null;')
  .replace(/\n\s*const special = useReward === true && ITEM_SYSTEM\.take\(state, 'reward'\);[\s\S]*?\n\s*} else if \(firstRingPhrase\) \{/g, '\n    const special = false;\n    if (firstRingPhrase) {')
  .replace(/\n\s*const special = useReward === true;\n\n\s*\/\/ ごほうび使用時は見た目も明確に別物にする。[\s\S]*?\n\s*el\.dateMoviePlace\.textContent = special[^\n]*;/g, "\n    const special = false;\n    el.dateMovieScene.dataset.plan = plan.id;\n    el.dateMovieScene.classList.remove('special-reward');")
  .replace(/\n\s*\/\/ 旧回復ごほうびは在庫をそのまま大量変換せず、まとめて最大2個の新ごほうびへ。[\s\S]*?merged\.items\.reward = \(Number\(merged\.items\.reward\) \|\| 0\) \+ Math\.min\(2, Math\.ceil\(oldRewardCount \/ 5\)\);/g, "\n      if (!merged.items || typeof merged.items !== 'object') merged.items = {};\n      ['candy','dogfood','catfood','udon','curry','hotpot','shoulder','hug','kiss','reward'].forEach((id) => { delete merged.items[id]; });")
  .replace(/\n\s*\/\/ ={10,}\n\s*\/\/ 日常ステータスは[\s\S]*?const RECOVERY_ITEMS = \[[\s\S]*?\n\s*\];/g, '')
  .replace(/\n\s*\{ id: 'reward', label: ITEM_SYSTEM\.CATALOG\.reward\.label,[^\n]*\},/g, '')
  .replace(/\n\s*if \(age % 10 === 0 && Math\.random\(\) < 0\.25\) \{\n\s*ITEM_SYSTEM\.grant\(state, 'reward'\);\n\s*setMessage\(`🎁 \$\{age\}さい。どこからかごほうびが1ことどいた!`\);\n\s*emotePet\('love'\);\n\s*\} else if \(age % 5 === 0\) \{/g, '\n    if (age % 5 === 0) {')
  .replace(/\n\s*const reward = ITEM_SYSTEM\.stock\(state,'reward'\);\n\s*el\.itemSceneRewardActions\.classList\.toggle\('hidden',!reward\);\n\s*el\.itemSceneRewardUseBtn\.textContent = `ごほうびを1こつかう（\$\{reward\}こ）`;\n\s*el\.itemSceneRewardSkipBtn\.textContent = 'つかわずにでかける';\n\s*if \(!reward\) pendingItemScene\.reward = false;/g, '')
  .replace("if (!pending || pending.reward === null || (pending.choices.length && pending.choice === null)) return false;", "if (!pending || (pending.choices.length && pending.choice === null)) return false;")
  .replace(/ \|\| \(pending\.reward && !ITEM_SYSTEM\.stock\(state,'reward'\)\)/g, '')
  .replace('return travelToRegion(region,{reward:pending.reward,scene});', 'return travelToRegion(region,{scene});')
  .replace(/ITEM_SYSTEM\.stock\(state,'reward'\) \|\| /g, '')
  .replace(/\n\s*const specialRewardTrip = choice\?\.reward === true && ITEM_SYSTEM\.take\(state,'reward'\);\n\s*if \(specialRewardTrip\) recordItemUse\('reward'\);/g, '')
  .replace(/\n\s*const cloverGreat = equipped\('itemluck1'\) && rawScore >= 70;\n\s*const randomReward = Math\.random\(\) < 0\.12;\n\s*const gotReward = special \|\| \(cloverGreat && progress\.cloverMisses >= 5\) \|\| randomReward;\n\s*if \(gotReward\) \{\n\s*ITEM_SYSTEM\.grant\(state, 'reward'\);\n\s*progress\.cloverMisses = 0;\n\s*\} else if \(cloverGreat\) progress\.cloverMisses \+= 1;/g, '')
  .replace(/\s*\|\| gotReward/g, '')
  .replace(/\n\s*if \(gotReward\) itemMessage \+= '／ごほうび1こ';/g, '')
  .replace(/ごほうび判定と失敗判定/g, '失敗判定')
  .replace(/ごほうびと失敗の判定/g, '失敗の判定')
  .replace(/、ごほうび1こ＋せいちょう28/g, '、せいちょう28')
  .replace(/\n\s*el\.itemSceneRewardUseBtn,\s*el\.itemSceneRewardSkipBtn,?/g, '');

// Remove obsolete reward-only date confirmation branch leftovers if present.
script = script.replace(/\n\s*el\.dateReward[^\n]*;/g, '');
script = script.replace(/\n\s*recordItemUse\('reward'\);/g, '');
script = script.replace(/\n\s*const specialRewardTrip[^\n]*;/g, '');

const forbidden = [
  /ITEM_SYSTEM\.(?:grant|stock|take)\(state,\s*['"]reward['"]/, /itemSceneReward/, /dateReward/, /cloverMisses/, /itemluck1/, /CATALOG\.reward/
];
for (const re of forbidden) if (re.test(script)) throw new Error(`reward cleanup incomplete in script: ${re}`);
if (/"reward"\s*:\s*\{/.test(items) || /"itemluck1"\s*:\s*\{/.test(items)) throw new Error('reward cleanup incomplete in item-system');
if (/itemSceneReward|dateReward/.test(html)) throw new Error('reward cleanup incomplete in index');
write('script.js', script);
