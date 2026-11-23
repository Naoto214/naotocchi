// Reconstruct main (384730f1) for older byte-level scopes. Keep appended
// or unrelated bytes in the result so the original guards still reject them.
const delta = require('./home-v14-scope-delta.json');
function restore(file, text) {
  const blocks = delta[file];
  if (!blocks || text === null) return text;
  if (!blocks.every(([after]) => text.includes(after) && text.indexOf(after) === text.lastIndexOf(after))) return text;
  for (const [after, before] of blocks) text = text.replace(after, () => before);
  return text;
}
function restoreBytes(file, bytes) {
  if (!delta[file] || bytes === null) return bytes;
  const text = bytes.toString('utf8');
  // Retain even malformed trailing bytes for the downstream approval guards.
  if (!Buffer.from(text).equals(bytes)) return bytes;
  return Buffer.from(restore(file, text));
}
module.exports = { restore, restoreBytes };
