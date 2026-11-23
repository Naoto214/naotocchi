// Check current bytes first. Historical gates can then inspect their original
// input without accepting a different edit to the same file.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const files = require('./approved-notation-v6.json');
const homePins = require('./home-production-pins.json');

function blob(bytes) {
  return crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
}

function verifyCurrent() {
  for (const [file, entry] of Object.entries(files)) {
    assert.equal(blob(restoreDelta(file, fs.readFileSync(file), homePins[file])), entry.after, 'approved V6 bytes: ' + file);
  }
}

function restoreDelta(file, bytes, entry) {
  if (!entry || !bytes || bytes.length < entry.size) return bytes;
  const prefix = bytes.subarray(0, entry.size);
  if (blob(prefix) !== entry.after) return bytes;
  if (entry.before === null) {
    assert.equal(bytes.length, entry.size, 'exact addition: ' + file);
    return null;
  }
  // Apply byte offsets from highest to lowest. Preserve any appended bytes so
  // a historical guard can still detect and reject an unrelated addition.
  let prior = prefix;
  for (const [start, end, previous] of entry.reverse) {
    prior = Buffer.concat([prior.subarray(0, start), Buffer.from(previous), prior.subarray(end)]);
  }
  assert.equal(blob(prior), entry.before, 'restored bytes: ' + file);
  return Buffer.concat([prior, bytes.subarray(entry.size)]);
}

function restoreBytes(file, bytes) {
  const beforeHome = restoreDelta(file, bytes, homePins[file]);
  return restoreDelta(file, beforeHome, files[file]);
}

function restore(file, text) {
  if (!files[file] || text === null) return text;
  const bytes = restoreBytes(file, Buffer.from(text));
  return bytes === null ? null : bytes.toString('utf8');
}

module.exports = {files, verifyCurrent, restore, restoreBytes};
