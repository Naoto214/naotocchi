// Rebuild the owner's candidate from exact shipped files without changing them.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const manifest = require('./native/sources.json');
const repo = path.resolve(__dirname, '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function readNative(name, sourceRoot = repo) {
  const pin = manifest[name];
  if (!pin) throw Error('Unknown native module: ' + name);
  const source = path.resolve(sourceRoot, name);
  const original = fs.readFileSync(source);
  if (sha(original) !== pin.before) throw Error('Unexpected shipped bytes: ' + name);
  if (pin.before === pin.after) return original.toString('utf8');
  const patch = path.join(__dirname, 'native', name + '.patch');
  const candidate = execFileSync('patch',
    ['--batch', '--fuzz=0', '--quiet', '--no-backup-if-mismatch', '--output=-', source, patch]);
  if (sha(candidate) !== pin.after) throw Error('Unexpected reconstructed bytes: ' + name);
  return candidate.toString('utf8');
}

// Native tests import the same source under its original sibling module names.
function writeNative(directory, sourceRoot = repo) {
  fs.mkdirSync(directory, {recursive:true});
  if (fs.readdirSync(directory).length) throw Error('Use an empty directory for native QA');
  for (const name of Object.keys(manifest))
    fs.writeFileSync(path.join(directory, name), readNative(name, sourceRoot));
}

let fixture;
function nativeFixture() {
  if (!fixture) {
    fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'naotocchi-native-test-'));
    process.once('exit', () => fs.rmSync(fixture, {recursive:true, force:true}));
    writeNative(fixture);
  }
  return fixture;
}

if (require.main === module) {
  const [mode, dest, ...rest] = process.argv.slice(2);
  if (mode === '--test-routing' && !dest) {
    const root = nativeFixture();
    const test = 'tests/home-movement-v5-routing-test.cjs';
    fs.mkdirSync(path.join(root, 'tests'));
    fs.copyFileSync(path.join(repo, test), path.join(root, test));
    execFileSync(process.execPath, ['--test', test], {cwd:root, stdio:'inherit'});
  } else if (mode === '--write' && dest && !rest.length) {
    writeNative(path.resolve(dest));
  } else {
    throw Error('Usage: node native-source.cjs --write EMPTY_DIRECTORY | --test-routing');
  }
}
module.exports = {readNative, writeNative, nativeFixture};
