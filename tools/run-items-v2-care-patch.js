const fs = require('node:fs');

const path = 'movie.css';
let css = fs.readFileSync(path, 'utf8');
const before = css;
const retired = [
  "[data-theme='special'] .movie-backdrop {background-image:url('assets/world/memory_lake-v1.webp');filter:brightness(.62) sepia(.25)}\n",
  "[data-theme='special'] .movie-light {background:radial-gradient(ellipse at 50% 45%,#fddca34d,transparent 60%),linear-gradient(140deg,#dd9adb33,transparent,#ffe6ae33)}\n",
  "[data-theme='special'] .movie-atmosphere i {width:5px;height:8px;border-radius:80% 0;background:#fbe0b7;animation:movie-confetti var(--speed) var(--delay) ease-in-out infinite}\n",
];
for (const line of retired) {
  const count = css.split(line).length - 1;
  if (count !== 1) throw new Error(`expected exactly one retired special-date CSS rule, got ${count}: ${line.slice(0, 48)}`);
  css = css.replace(line, '');
}
if (css === before) throw new Error('retired special-date CSS cleanup made no change');
if (/data-theme=['"]special['"]|special-reward/.test(css)) throw new Error('retired special-date CSS still remains');
fs.writeFileSync(path, css);
console.log('Removed the retired special-date CSS rules.');
