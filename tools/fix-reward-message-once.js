const fs = require('node:fs');
const path = 'script.js';
let text = fs.readFileSync(path, 'utf8');
const oldLine = "      itemMessage += gotReward ? `／${fun.label}とごほうび1こ、${coins}コインをもらった!` : `／${fun.label}と${coins}コインをもらった!`;";
const newLine = "      itemMessage += `／${fun.label}と${coins}コインをもらった!`;";
if (text.includes(oldLine)) text = text.replace(oldLine, newLine);
// The dedicated reward-trip path no longer exists. Keep ordinary travel logic intact.
text = text.replace(/\bspecialRewardTrip\b/g, 'false');
if (/\bgotReward\b/.test(text)) throw new Error('gotReward reference still remains');
if (/\bspecialRewardTrip\b/.test(text)) throw new Error('specialRewardTrip reference still remains');
fs.writeFileSync(path, text);
