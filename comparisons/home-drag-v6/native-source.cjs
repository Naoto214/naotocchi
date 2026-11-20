const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {digest} = require('../home-finish-v5/native-hooks.cjs');
const previous = require('../home-finish-v5/native-source.cjs');
const pins = require('./native/sources.json');

function applyChange(name, original) {
  const pin = pins[name];
  if (!pin || digest(original) !== pin.before) throw Error('Unexpected V5 input: ' + name);
  if (pin.before === pin.after) return original;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'home-drag-source-'));
  try {
    const input = path.join(temporary, name);
    fs.writeFileSync(input, original);
    const result = execFileSync('patch', [
      '--batch', '--fuzz=0', '--no-backup-if-mismatch', '--quiet', '--output=-', input,
      path.join(__dirname, 'native', name + '.patch'),
    ], {encoding:'utf8', maxBuffer:16 * 1024 * 1024});
    if (digest(result) !== pin.after) throw Error('Unexpected V6 output: ' + name);
    return result;
  } finally {
    fs.rmSync(temporary, {recursive:true, force:true});
  }
}

function readNative(name) {
  if (name !== 'home-production-model.js') throw Error('Expected the resident model');
  return applyChange(name, previous.readNative(name));
}

module.exports = {applyChange, readNative};
