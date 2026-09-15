const fs = require('node:fs');

function edit(path, fn) {
  const before = fs.readFileSync(path, 'utf8');
  const after = fn(before);
  if (after !== before) fs.writeFileSync(path, after);
}

edit('tests/dialogue-test.js', text => {
  const start = '// A browser may suppress native confirm and return false. The reward decision';
  const end = 'for (const accept of [false, true]) {';
  const a = text.indexOf(start);
  const b = text.indexOf(end, a >= 0 ? a : 0);
  if (a >= 0 && b > a) text = text.slice(0, a) + '// Dedicated date reward confirmation was retired with the reward system.\n' + text.slice(b);
  return text;
});

edit('script.js', text => {
  text = text.replace(
    "      itemMessage += gotReward ? `／${fun.label}とごほうび1こ、${coins}コインをもらった!` : `／${fun.label}と${coins}コインをもらった!`;",
    "      itemMessage += `／${fun.label}と${coins}コインをもらった!`;"
  );
  // Dedicated reward travel is gone; retain only the ordinary travel path.
  text = text.replace(/\bspecialRewardTrip\b/g, 'false');
  return text;
});
