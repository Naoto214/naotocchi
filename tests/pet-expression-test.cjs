const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

const expression = require('../pet-expression.js');

test('static script exposes the frozen resolver on window', () => {
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../pet-expression.js'),'utf8'),context);
  assert.equal(context.window.NaotocchiPetExpression.resolve({state:'hungry'}),'strained');
  assert.equal(Object.isFrozen(context.window.NaotocchiPetExpression),true);
});

test('resolve maps every persistent home emotion to its approved face', () => {
  const cases = [
    [{state:'normal',severity:'none'},'normal'],
    [{state:'wantsPlay',severity:'mild'},'normal'],
    [{state:'hungry',severity:'mild'},'strained'],
    [{state:'tired',severity:'strong'},'strained'],
    [{state:'sick',severity:'strong'},'strained'],
    [{state:'weak',severity:'mild'},'strained'],
    [{state:'unhappy',severity:'strong'},'sulky'],
  ];
  for (const [emotion,want] of cases) assert.equal(expression.resolve(emotion),want);
});

test('resolve applies temporary, critical, and sleeping precedence', () => {
  assert.equal(expression.resolve({state:'unhappy'},{reaction:'happy'}),'happy');
  assert.equal(expression.resolve({state:'weak',severity:'critical'},{reaction:'happy'}),'strained');
  assert.equal(expression.resolve({state:'unhappy'},{sleeping:true,reaction:'happy'}),'normal');
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
  assert.equal(expression.assetFor(base,'startled'),base);
  assert.equal(expression.assetFor('assets/characters/cat/05.png','happy'),'assets/characters/cat/05.png');
  assert.equal(expression.assetFor(null,'happy'),null);
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
