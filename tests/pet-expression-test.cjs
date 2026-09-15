const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

const expression = require('../pet-expression.js');

test('static script exposes the frozen resolver on window', () => {
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../pet-expression.js'),'utf8'),context);
  assert.equal(context.window.NaotocchiPetExpression.resolve({state:'hungry'}),'hungry');
  assert.equal(Object.isFrozen(context.window.NaotocchiPetExpression),true);
});

test('resolve maps every persistent home emotion to its approved face', () => {
  const cases = [
    [{state:'normal',severity:'none'},'normal'],
    [{state:'wantsPlay',severity:'mild'},'wantsPlay'],
    [{state:'hungry',severity:'mild'},'hungry'],
    [{state:'tired',severity:'strong'},'tired'],
    [{state:'sick',severity:'strong'},'sick'],
    [{state:'weak',severity:'mild'},'weak'],
    [{state:'unhappy',severity:'strong'},'sulky'],
  ];
  for (const [emotion,want] of cases) assert.equal(expression.resolve(emotion),want);
});

test('resolve applies temporary, critical, and sleeping precedence', () => {
  assert.equal(expression.resolve({state:'unhappy'},{reaction:'happy'}),'happy');
  assert.equal(expression.resolve({state:'weak',severity:'critical'},{reaction:'happy'}),'critical');
  assert.equal(expression.resolve({state:'unhappy'},{sleeping:true,reaction:'happy'}),'sleeping');
  assert.equal(expression.resolve({state:'unhappy'},{blocked:true,reaction:'happy'}),'normal');
  assert.equal(expression.resolve({state:'unhappy'},{blocked:true,sleeping:true}),'normal');
});

test('resolve safely ignores unknown and malformed values', () => {
  assert.equal(expression.resolve({state:'surprised'}),'normal');
  assert.equal(expression.resolve(null,{reaction:'startled'}),'normal');
  assert.equal(expression.resolve(undefined,undefined),'normal');
});

test('assetFor allowlists adult-cat expression portraits only', () => {
  const base = 'assets/characters/cat/06.png';
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.assetFor(base,'happy'),'assets/characters/expressions/cat/06-happy.png');
  assert.equal(expression.assetFor(base,'strained'),'assets/characters/expressions/cat/06-strained.png');
  assert.equal(expression.assetFor(base,'sulky'),'assets/characters/expressions/cat/06-sulky.png');
  for (const name of ['hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/cat/06-${name}.png`);
  }
  assert.equal(expression.assetFor(base,'startled'),base);
  assert.equal(expression.assetFor(base,'toString'),base);
  assert.equal(expression.assetFor(base,'constructor'),base);
  assert.equal(expression.assetFor(base,'__proto__'),base);
  assert.equal(expression.assetFor('assets/characters/cat/05.png','happy'),'assets/characters/cat/05.png');
  assert.equal(expression.assetFor(null,'happy'),null);
});

test('accentFor returns one static accessible-hidden SVG accent per non-normal adult-cat expression', () => {
  const base = 'assets/characters/cat/06.png';
  const names = ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping'];
  const accents = names.map(name => expression.accentFor(base,name));
  for (const [index,markup] of accents.entries()) {
    const name=names[index];
    assert.match(markup,new RegExp(`class="pet-expression-accent pet-expression-accent--${name}"`),name);
    assert.match(markup,/aria-hidden="true"/,name);
    assert.match(markup,/<svg\b/,name);
    assert.doesNotMatch(markup,/<(?:animate|text)\b/,name);
  }
  assert.equal(new Set(accents).size,names.length);
  assert.equal(expression.accentFor(base,'normal'),'');
  assert.equal(expression.accentFor(base,'unknown'),'');
  assert.equal(expression.accentFor('assets/characters/dog/06.png','happy'),'');
});

test('reactionFor maps every approved semantic event and rejects unknown events', () => {
  const cases = [
    ['play_with','happy'],
    ['play_with_annoyed','sulky'],
    ['overfeed','strained'],
    ['medicine_wrong','strained'],
    ['feed','normal'],
    ['medicine_cure','normal'],
    ['sleep','normal'],
    ['wake','normal'],
    ['court',null],
    [null,null],
  ];
  for (const [event,want] of cases) assert.equal(expression.reactionFor(event),want);
});

test('the frozen API leaves caller-owned values unchanged', () => {
  const emotion = Object.freeze({state:'unhappy',severity:'mild'});
  const options = Object.freeze({sleeping:false,reaction:'happy'});
  const before = JSON.stringify({emotion,options});
  assert.equal(expression.resolve(emotion,options),'happy');
  assert.equal(JSON.stringify({emotion,options}),before);
  assert.equal(Object.isFrozen(expression),true);
});
