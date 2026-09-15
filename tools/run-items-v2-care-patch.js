const fs = require('node:fs');

const path = 'tools/apply-items-v2-care.js';
let text = fs.readFileSync(path, 'utf8');

// The first version removed only the `.classList.remove(...)` suffix and left
// a bare `el.dateMovieScene` token beside the following statement. Replace
// that source line before the guarded patch runs so the entire obsolete line
// is removed instead.
const badSpecialCleanup = "script = script.replace(/\\.classList\\.remove\\('special-reward'\\);\\n/g, '');";
const goodSpecialCleanup = "script = script.replace(/^.*\\.classList\\.remove\\('special-reward'\\);\\n/gm, '');";
if (!text.includes(badSpecialCleanup)) throw new Error('could not locate special-reward cleanup in patcher');
text = text.replace(badSpecialCleanup, goodSpecialCleanup);

const start = "let html = read('index.html');\n";
const end = "if (/rewardItemGrid|ミニゲームなどで、たまにもらえます。デートや旅/.test(html)) throw new Error('retired reward UI remains in index.html');\n";
const a = text.indexOf(start);
const b = text.indexOf(end, a + start.length);
if (a < 0 || b < 0) throw new Error('could not locate guarded index cleanup in patcher');
const replacement = `let html = read('index.html');\nhtml = removeBetween(html,\n'            <div class="theme-section">\\n              <div class="theme-section-title">ごほうび</div>\\n',\n'            <div class="theme-section">\\n              <div class="theme-section-title">みにつけるもの</div>\\n', 'remove reward inventory section');\n`;
text = text.slice(0, a) + replacement + text.slice(b);
fs.writeFileSync(path, text);
require('./apply-items-v2-care.js');
