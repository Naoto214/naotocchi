// Reconstruct main (9539e462) for older byte-level scopes. Keep appended
// or unrelated bytes in the result so the original guards still reject them.
const delta = require('./home-v14-scope-delta.json');
function restore(file, text) {
  const blocks = delta[file];
  if (!blocks || text === null) return text;
  if (!blocks.every(([after]) => text.includes(after) && text.indexOf(after) === text.lastIndexOf(after))) return text;
  for (const [after, before] of blocks) text = text.replace(after, () => before);
  return text;
}
module.exports = { restore };
