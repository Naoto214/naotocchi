const fs = require('node:fs');
const path = 'script.js';
let text = fs.readFileSync(path, 'utf8');
const oldLine = "      itemMessage += gotReward ? `／${fun.label}とごほうび1こ、${coins}コインをもらった!` : `／${fun.label}と${coins}コインをもらった!`;";
const newLine = "      itemMessage += `／${fun.label}と${coins}コインをもらった!`;";
if (!text.includes(oldLine)) throw new Error('expected old reward result message not found');
text = text.replace(oldLine, newLine);
if (/\bgotReward\b/.test(text)) throw new Error('gotReward reference still remains');
fs.writeFileSync(path, text);
