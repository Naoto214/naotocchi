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
  assert.equal(expression.assetFor(base,'happy'),'assets/characters/expressions/cat/06-happy-v3.png');
  assert.equal(expression.assetFor(base,'strained'),'assets/characters/expressions/cat/06-strained.png');
  assert.equal(expression.assetFor(base,'sulky'),'assets/characters/expressions/cat/06-sulky.png');
  for (const name of ['hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/cat/06-${name}${name === 'sleeping' ? '-v3' : ''}.png`);
  }
  assert.equal(expression.assetFor(base,'startled'),base);
  assert.equal(expression.assetFor(base,'toString'),base);
  assert.equal(expression.assetFor(base,'constructor'),base);
  assert.equal(expression.assetFor(base,'__proto__'),base);
  assert.equal(expression.assetFor('assets/characters/cat/01.png','happy'),'assets/characters/cat/01.png');
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

test('sleeping uses three rising Z marks without a font or animation dependency', () => {
  const markup = expression.accentFor('assets/characters/cat/06.png','sleeping');
  assert.equal((markup.match(/class="accent-sleep-z"/g) || []).length,3);
  assert.doesNotMatch(markup, /accent-breath|<text\b|<animate\b/);
});

test('line-only state marks have a separate outline beneath their colored strokes', () => {
  for (const state of ['strained','sick','weak','critical','wantsPlay','sleeping']) {
    const markup=expression.accentFor('assets/characters/cat/06.png',state);
    assert.match(markup,/class="[^"]+ accent-outline"/,state);
    assert.doesNotMatch(markup,/<filter|<animate/,state);
  }
});

test('kitten stage supports all ten expressions while other cat stages keep their base art', () => {
  const base='assets/characters/cat/03.png';
  for(const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/cat/03-${name}.png`);
    assert.match(expression.accentFor(base,name),/pet-expression-accent/);
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.assetFor(base,'__proto__'),base);
  assert.equal(expression.accentFor(base,'constructor'),'');
  assert.equal(expression.assetFor('assets/characters/cat/01.png','happy'),'assets/characters/cat/01.png');
});

test('kitten and adult calling marks follow their respective heads', () => {
  const kitten=expression.accentFor('assets/characters/cat/03.png','wantsPlay');
  assert.match(kitten,/<g transform="translate\(-14 12\)">/);
  assert.equal((kitten.match(/accent-call/g)||[]).length,2);
  assert.match(expression.accentFor('assets/characters/cat/06.png','wantsPlay'),/translate\(-12 7\)/);
  assert.doesNotMatch(expression.accentFor('assets/characters/cat/03.png','hungry'),/<g transform/);
});

test('otemba stage has ten faces and marks anchored near its left-hand head', () => {
  const base='assets/characters/cat/04.png';
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/cat/04-${name}.png`);
    const mark=expression.accentFor(base,name);
    assert.match(mark,/<g transform=/);
    assert.match(mark,/aria-hidden="true"/);
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.accentFor(base,'normal'),'');
});

test('otemba discomfort mark sits slightly closer to its head', () => {
  assert.match(expression.accentFor('assets/characters/cat/04.png','strained'),/translate\(0 9\)/);
  assert.doesNotMatch(expression.accentFor('assets/characters/cat/06.png','strained'),/transform=/);
});

test('young stage has ten faces and marks anchored near its left-hand head', () => {
  const base='assets/characters/cat/05.png';
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/cat/05-${name}.png`);
    const mark=expression.accentFor(base,name);
    assert.match(mark,/<g transform=/);
    assert.match(mark,/aria-hidden="true"/);
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.accentFor(base,'normal'),'');
});

test('young cat silver and orange marks sit closer to the head without moving other stages', () => {
  assert.match(expression.accentFor('assets/characters/cat/05.png','strained'),/translate\(10 -7\)/);
  assert.match(expression.accentFor('assets/characters/cat/05.png','wantsPlay'),/translate\(-26 2\)/);
  assert.match(expression.accentFor('assets/characters/cat/05.png','hungry'),/translate\(-12 -4\)/);
  assert.match(expression.accentFor('assets/characters/cat/03.png','wantsPlay'),/translate\(-14 12\)/);
  assert.match(expression.accentFor('assets/characters/cat/04.png','strained'),/translate\(0 9\)/);
});

test('calm stage has ten faces and marks anchored near its left-hand head', () => {
  const base='assets/characters/cat/07.png';
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/cat/07-${name}.png`);
    const mark=expression.accentFor(base,name);
    assert.match(mark,/<g transform=/);
    assert.match(mark,/aria-hidden="true"/);
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.accentFor(base,'normal'),'');
});

test('elder stage has ten faces and marks anchored near its left-hand head', () => {
  const base='assets/characters/cat/08.png';
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/cat/08-${name}.png`);
    const mark=expression.accentFor(base,name);
    assert.match(mark,/<g transform=/);
    assert.match(mark,/aria-hidden="true"/);
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.accentFor(base,'normal'),'');
});

test('toddler stage has ten faces and marks anchored near its left-hand head', () => {
  const base='assets/characters/cat/02.png';
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/cat/02-${name}.png`);
    const mark=expression.accentFor(base,name);
    assert.match(mark,/<g transform=/);
    assert.match(mark,/aria-hidden="true"/);
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.accentFor(base,'normal'),'');
});
