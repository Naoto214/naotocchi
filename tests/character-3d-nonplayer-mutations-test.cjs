const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { selectScripts, runScoped } = require('../tools/character-3d/nonplayer-mutations.cjs');

// Wrong mappings, missing preflight validation, or ignoring child failures must fail these checks.
test('clock selects only clock; all existing role mappings stay explicit', () => {
  assert.deepEqual(selectScripts({ keys: ['companion:clock'] }), ['clock-remove-it.cjs']);
  const pairs = [
    ['companion:owl', 'owl'], ['companion:punyu', 'punyu'],
    ['companion:parrot', 'parrot'], ['partner:oasis_cactus', 'cactus'],
  ];
  for (const [key, tool] of pairs) assert.deepEqual(selectScripts({ keys: [key] }), [tool + '-remove-it.cjs']);
});
test('shared wave and mammal tools run once in first-selected order', () => {
  assert.deepEqual(selectScripts({ keys: ['companion:box', 'partner:sunflower_partner', 'companion:box'] }), ['nonplayer-wave-remove-it.cjs']);
  assert.deepEqual(selectScripts({ keys: ['companion:rabbit_friend', 'companion:tanuki', 'companion:squirrel', 'companion:hamster', 'companion:panda', 'companion:clock'] }), ['small-mammal-remove-it.cjs', 'clock-remove-it.cjs']);
});
test('other mammal batch selects its shared mutation tool once', () => {
  assert.deepEqual(selectScripts({ keys: ['otter', 'monkey', 'sheep', 'seal', 'hedgehog'].map(key => 'companion:' + key) }), ['other-mammal-remove-it.cjs']);
});
test('birds and reptiles select their shared mutation tool once', () => {
  assert.deepEqual(selectScripts({ keys: ['bat', 'chicken', 'penguin_friend', 'snail', 'chameleon'].map(key => 'companion:' + key) }), ['birds-reptiles-remove-it.cjs']);
});
test('malformed and unsupported selections fail before spawning any tool', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nonplayer-selection-'));
  let calls = 0;
  try {
    const config = path.join(dir, 'qa.json');
    const invalid = ['{', 'null', '[]', '{}', '{"keys":[]}', '{"keys":"companion:clock"}', '{"keys":[null]}', '{"keys":["companion:clock","unknown:bad"]}', '{"keys":["../clock-remove-it.cjs"]}', '{"keys":["constructor"]}'];
    for (const value of invalid) {
      fs.writeFileSync(config, value);
      assert.throws(() => runScoped(config, path.join(dir, 'out'), () => { calls++; return { status: 0 }; }), /nonplayer mutation/i);
    }
    assert.equal(calls, 0);
    assert.equal(fs.existsSync(path.join(dir, 'out')), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('execution uses Node with fixed paths and stops on child failure', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nonplayer-execution-'));
  try {
    const config = path.join(dir, 'qa.json');
    fs.writeFileSync(config, JSON.stringify({ keys: ['companion:clock', 'companion:owl'] }));
    const calls = [];
    assert.throws(() => runScoped(config, dir, (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 3 };
    }), /clock-remove-it.cjs.*3/);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, process.execPath);
    assert.deepEqual(calls[0].args, [path.resolve(__dirname, '../tools/character-3d/clock-remove-it.cjs')]);
    assert.equal(calls[0].options.shell, undefined);
    assert.ok(fs.existsSync(path.join(dir, 'clock-remove-it.txt')));
    assert.equal(fs.existsSync(path.join(dir, 'owl-remove-it.txt')), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('clock executes alone and box/sunflower execute their shared tool once', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nonplayer-runs-'));
  try {
    const config = path.join(dir, 'qa.json');
    for (const [keys, expected] of [
      [['companion:clock'], ['clock-remove-it.cjs']],
      [['companion:box', 'partner:sunflower_partner'], ['nonplayer-wave-remove-it.cjs']],
    ]) {
      fs.writeFileSync(config, JSON.stringify({ keys }));
      const executed = [];
      runScoped(config, dir, (command, args) => { executed.push(path.basename(args[0])); return { status: 0 }; });
      assert.deepEqual(executed, expected);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
