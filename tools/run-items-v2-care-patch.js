const fs = require('node:fs');

const path = 'tools/apply-items-v2-care.js';
let text = fs.readFileSync(path, 'utf8');
const start = "let html = read('index.html');\n";
const end = "if (/rewardItemGrid|ミニゲームなどで、たまにもらえます。デートや旅/.test(html)) throw new Error('retired reward UI remains in index.html');\n";
const a = text.indexOf(start);
const b = text.indexOf(end, a + start.length);
if (a < 0 || b < 0) throw new Error('could not locate guarded index cleanup in patcher');
const replacement = `let html = read('index.html');\nhtml = removeBetween(html,\n'            <div class="theme-section">\\n              <div class="theme-section-title">ごほうび</div>\\n',\n'            <div class="theme-section">\\n              <div class="theme-section-title">みにつけるもの</div>\\n', 'remove reward inventory section');\n`;
text = text.slice(0, a) + replacement + text.slice(b);
fs.writeFileSync(path, text);
require('./apply-items-v2-care.js');
