const fs = require('node:fs');
const path = 'tests/dialogue-test.js';
let text = fs.readFileSync(path, 'utf8');

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

fs.writeFileSync(path, text);
