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
  assert.equal(expression.assetFor('assets/characters/sakura/01.png','happy'),'assets/characters/sakura/01.png');
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
  assert.equal(expression.accentFor('assets/characters/sakura/02.png','happy'),'');
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
  assert.equal(expression.assetFor('assets/characters/sakura/01.png','happy'),'assets/characters/sakura/01.png');
});

test('calling marks retain the two outlined strokes', () => {
  const kitten=expression.accentFor('assets/characters/cat/03.png','wantsPlay');
  assert.equal((kitten.match(/accent-call/g)||[]).length,2);
  assert.equal((expression.accentFor('assets/characters/cat/06.png','wantsPlay').match(/accent-call/g)||[]).length,2);
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

test('baby stage has ten faces and marks anchored near its left-hand head', () => {
  const base='assets/characters/cat/01.png';
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/cat/01-${name}.png`);
    const mark=expression.accentFor(base,name);
    assert.match(mark,/<g transform=/);
    assert.match(mark,/aria-hidden="true"/);
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.accentFor(base,'normal'),'');
});


test('adult dog supports ten expressions while unsupported species retain base portraits', () => {
  const base='assets/characters/dog/06.png';
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/dog/06-${name}.png`);
    assert.match(expression.accentFor(base,name),/pet-expression-accent/);
    for (const stage of ['01','02','08']) {
      const other=`assets/characters/sakura/${stage}.png`;
      assert.equal(expression.assetFor(other,name),other);
      assert.equal(expression.accentFor(other,name),'');
    }
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.accentFor(base,'normal'),'');
});

test('puppy supports ten expressions while unsupported species retain base portraits', () => {
  const base='assets/characters/dog/03.png';
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/dog/03-${name}.png`);
    assert.match(expression.accentFor(base,name),/pet-expression-accent/);
    for (const stage of ['01','02','08']) {
      const other=`assets/characters/sakura/${stage}.png`;
      assert.equal(expression.assetFor(other,name),other);
      assert.equal(expression.accentFor(other,name),'');
    }
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.accentFor(base,'normal'),'');
});

test('wanpaku supports ten expressions while unsupported species retain base portraits', () => {
  const base='assets/characters/dog/04.png';
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/dog/04-${name}.png`);
    assert.match(expression.accentFor(base,name),/pet-expression-accent/);
    for (const stage of ['01','02','08']) {
      const other=`assets/characters/sakura/${stage}.png`;
      assert.equal(expression.assetFor(other,name),other);
      assert.equal(expression.accentFor(other,name),'');
    }
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.accentFor(base,'normal'),'');
});

test('young dog supports ten expressions while unsupported species retain base portraits', () => {
  const base='assets/characters/dog/05.png';
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/dog/05-${name}.png`);
    assert.match(expression.accentFor(base,name),/pet-expression-accent/);
    for (const stage of ['01','02','08']) {
      const other=`assets/characters/sakura/${stage}.png`;
      assert.equal(expression.assetFor(other,name),other);
      assert.equal(expression.accentFor(other,name),'');
    }
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.accentFor(base,'normal'),'');
});

test('young dog accents follow its upright head and hunger uses a food bowl', () => {
  const base='assets/characters/dog/05.png';
  assert.match(expression.accentFor(base,'hungry'),/M79 18h18l-3 7H82z/);
  assert.doesNotMatch(expression.accentFor(base,'hungry'),/accent-food-eye/);
});

test('calm dog supports ten expressions while unsupported species retain base portraits', () => {
  const base='assets/characters/dog/07.png';
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    assert.equal(expression.assetFor(base,name),`assets/characters/expressions/dog/07-${name}.png`);
    assert.match(expression.accentFor(base,name),/pet-expression-accent/);
    for (const stage of ['01','02','08']) {
      const other=`assets/characters/sakura/${stage}.png`;
      assert.equal(expression.assetFor(other,name),other);
      assert.equal(expression.accentFor(other,name),'');
    }
  }
  assert.equal(expression.assetFor(base,'normal'),base);
  assert.equal(expression.accentFor(base,'normal'),'');
});

test('calm dog accents follow its head and hunger uses a food bowl', () => {
  const base='assets/characters/dog/07.png';
  assert.match(expression.accentFor(base,'hungry'),/M79 18h18l-3 7H82z/);
  assert.doesNotMatch(expression.accentFor(base,'hungry'),/accent-food-eye/);
});

for (const stage of ['01','02','08']) {
  test(`dog ${stage} routes ten expressions with head-relative accents and food bowl`, () => {
    const base=`assets/characters/dog/${stage}.png`;
    for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
      assert.equal(expression.assetFor(base,name),`assets/characters/expressions/dog/${stage}-${name}.png`);
    }
    assert.match(expression.accentFor(base,'hungry'),/M79 18h18l-3 7H82z/);
    assert.doesNotMatch(expression.accentFor(base,'hungry'),/accent-food-eye/);
    assert.equal(expression.assetFor(base,'normal'),base);
    assert.equal(expression.accentFor(base,'normal'),'');
  });
}

for (const species of ['man','woman']) {
  test(`${species} supports all eight stages with ten faces and a rice-bowl hunger mark`, () => {
    for (let stage=1;stage<=8;stage++) {
      const id=String(stage).padStart(2,'0'),base=`assets/characters/${species}/${id}.png`;
      for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
        assert.equal(expression.assetFor(base,name),`assets/characters/expressions/${species}/${id}-${name}.png`);
        assert.match(expression.accentFor(base,name),new RegExp(`pet-expression-accent--${name}`));
      }
      assert.equal(expression.assetFor(base,'normal'),base);
      assert.equal(expression.assetFor(base,'unknown'),base);
      assert.equal(expression.accentFor(base,'normal'),'');
      assert.match(expression.accentFor(base,'hungry'),/accent-rice/);
      assert.doesNotMatch(expression.accentFor(base,'hungry'),/accent-food-eye/);
    }
  });
}

test('sweat follows the face sides instead of the whole body', () => {
  const base='assets/characters/cat/04.png';
  assert.equal(typeof expression.sweatFor,'function');
  const sweat=expression.sweatFor(base,104,104,0);
  assert.ok(sweat.left < 20);
  assert.ok(sweat.right > 25,'right sweat stays near the left-hand head, not the tail');
  assert.ok(sweat.top > 15 && sweat.top < 75);
  assert.equal(expression.sweatFor('assets/characters/sakura/01.png',104,104,0),null);
});

const faceAnchors=require('../tools/expression-face-anchors.json');
const castBounds=require('../cast-bounds.js');
const markCenters={happy:[81,28],strained:[26,22.5],hungry:[83,27],sick:[80.5,25.7],tired:[81,26.5],sulky:[77.5,30],weak:[77.5,24.5],critical:[76.5,24],wantsPlay:[82,13.5],sleeping:[83.5,22.5]};

test('every observed face center lies within its normal sprite bounds',()=>{
 for(const [line,heads] of Object.entries(faceAnchors))for(let index=0;index<heads.length;index++){
  const base=`assets/characters/${line}/${String(index+1).padStart(2,'0')}.png`;
  const [left,top,right,bottom]=castBounds[base].box,[x,y]=heads[index];
  assert.ok(x>=left&&x<=right&&y>=top&&y<=bottom,
    `${line}/${index+1} face center (${x},${y}) is outside [${left},${top},${right},${bottom}]`);
 }
});

for(const [line,heads] of Object.entries(faceAnchors))for(let index=0;index<8;index++) {
 test(`${line}/${index+1} marks follow the approved face-relative directions`,()=>{
  const base=`assets/characters/${line}/${String(index+1).padStart(2,'0')}.png`;
  const face=[heads[index][0]*104/128,heads[index][1]*104/128+104*(128-castBounds[base].box[3])/128];
  for(const [name,center] of Object.entries(markCenters)){
   const svg=expression.accentFor(base,name);
   const match=svg.match(/translate\(([-\d.]+) ([-\d.]+)\)/);
   assert.ok(match,name);
   const x=Number(match[1])+center[0],y=Number(match[2])+center[1];
   assert.ok(y<face[1]-5,name+' is above face');
   if(name==='wantsPlay')assert.ok(Math.abs(x-face[0])<1,name+' is centered above face');
   else if(name==='strained')assert.ok(x<face[0]-5,name+' is upper left');
   else assert.ok(x>face[0]+5,name+' is upper right');
  }
  for(const size of [64,80,104]){
   const sweat=expression.sweatFor(base,size,size,0);
   assert.ok(Object.values(sweat).every(Number.isFinite));
   assert.ok(sweat.left<size*heads[index][0]/128);
   assert.ok(size-sweat.right>size*heads[index][0]/128);
  }
 });
}

test('reviewed side marks read diagonally above the face, not alongside it',()=>{
 const reviewed=require('../tools/expression-placement-review.json').selected;
 for(const [key,states] of Object.entries(reviewed)){
  const [line,stage]=key.split('/'),head=faceAnchors[line][Number(stage)-1],base=`assets/characters/${key}.png`;
  const fx=head[0]*104/128,fy=head[1]*104/128+104*(128-castBounds[base].box[3])/128;
  for(const state of states){
   if(state==='wantsPlay')continue;
   const m=expression.accentFor(base,state).match(/translate\(([-\d.]+) ([-\d.]+)\)/);
   const c=markCenters[state],dx=Number(m[1])+c[0]-fx,up=fy-Number(m[2])-c[1];
   const angle=Math.atan2(up,dx)*180/Math.PI;
   const range=state==='strained'?[115,145]:state==='sick'?[55,80]:[35,65];
   assert.ok(angle>=range[0]&&angle<=range[1],`${key}/${state}: angle ${angle}`);
  }
 }
});

for(const line of ['penguin','turtle','frog','clownfish','salmon','hermit_crab','jellyfish','starfish','coral','butterfly','beetle','stagbeetle','cicada','antlion','dandelion'])for(let i=1;i<=8;i++)test(`${line}/${i} routes ten distinct expressions`,()=>{
 const stage=String(i).padStart(2,'0'),base=`assets/characters/${line}/${stage}.png`;
 const states=['happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping'];
 assert.equal(expression.assetFor(base,'normal'),base);
 for(const state of states){assert.equal(expression.assetFor(base,state),`assets/characters/expressions/${line}/${stage}-${state}.png`);assert.ok(expression.accentFor(base,state).includes('<svg'));}
});

test('frog and clownfish use distinct species-appropriate hunger marks',()=>{
 const frog=expression.accentFor('assets/characters/frog/06.png','hungry');
 const clownfish=expression.accentFor('assets/characters/clownfish/06.png','hungry');
 assert.match(frog,/<ellipse class="accent-food"/,'frog thinks of an insect');
 assert.match(clownfish,/<circle class="accent-food"/,'clownfish thinks of food pellets');
 assert.notEqual(frog,clownfish);
});

for(let i=1;i<=8;i++)test(`salmon/${i} keeps the shared yellow fish hunger mark`,()=>{
 const base=`assets/characters/salmon/${String(i).padStart(2,'0')}.png`;
 const food=svg=>svg.match(/<path class="accent-food"[^>]*>/)?.[0];
 assert.ok(food(expression.accentFor(base,'hungry')));
 assert.equal(food(expression.accentFor(base,'hungry')),food(expression.accentFor('assets/characters/cat/06.png','hungry')));
 assert.equal(expression.accentFor(base,'normal'),'');
 assert.equal(expression.assetFor(base,'unknown'),base);
});

for(let i=1;i<=8;i++)test(`hermit_crab/${i} keeps the shared yellow fish hunger mark`,()=>{
 const base=`assets/characters/hermit_crab/${String(i).padStart(2,'0')}.png`;
 const food=svg=>svg.match(/<path class="accent-food"[^>]*>/)?.[0];
 assert.ok(food(expression.accentFor(base,'hungry')));
 assert.equal(food(expression.accentFor(base,'hungry')),food(expression.accentFor('assets/characters/cat/06.png','hungry')));
 assert.equal(expression.accentFor(base,'normal'),'');
 assert.equal(expression.assetFor(base,'unknown'),base);
});

for(let i=1;i<=8;i++)test(`jellyfish/${i} keeps the shared yellow fish hunger mark`,()=>{
 const base=`assets/characters/jellyfish/${String(i).padStart(2,'0')}.png`;
 const food=svg=>svg.match(/<path class="accent-food"[^>]*>/)?.[0];
 assert.ok(food(expression.accentFor(base,'hungry')));
 assert.equal(food(expression.accentFor(base,'hungry')),food(expression.accentFor('assets/characters/cat/06.png','hungry')));
 assert.equal(expression.accentFor(base,'normal'),'');
 assert.equal(expression.assetFor(base,'unknown'),base);
});

for(let i=1;i<=8;i++)test(`starfish/${i} keeps the shared yellow fish hunger mark`,()=>{
 const base=`assets/characters/starfish/${String(i).padStart(2,'0')}.png`;
 const food=svg=>svg.match(/<path class="accent-food"[^>]*>/)?.[0];
 assert.ok(food(expression.accentFor(base,'hungry')));
 assert.equal(food(expression.accentFor(base,'hungry')),food(expression.accentFor('assets/characters/cat/06.png','hungry')));
 assert.equal(expression.accentFor(base,'normal'),'');
 assert.equal(expression.assetFor(base,'unknown'),base);
});

for(let i=1;i<=8;i++)test(`coral/${i} keeps the shared yellow fish hunger mark`,()=>{
 const base=`assets/characters/coral/${String(i).padStart(2,'0')}.png`;
 const food=svg=>svg.match(/<path class="accent-food"[^>]*>/)?.[0];
 assert.ok(food(expression.accentFor(base,'hungry')));
 assert.equal(food(expression.accentFor(base,'hungry')),food(expression.accentFor('assets/characters/cat/06.png','hungry')));
 assert.equal(expression.accentFor(base,'normal'),'');
 assert.equal(expression.assetFor(base,'unknown'),base);
});

for(let i=1;i<=8;i++)test(`butterfly/${i} keeps the shared yellow fish hunger mark`,()=>{
 const base=`assets/characters/butterfly/${String(i).padStart(2,'0')}.png`;
 const food=svg=>svg.match(/<path class="accent-food"[^>]*>/)?.[0];
 assert.ok(food(expression.accentFor(base,'hungry')));
 assert.equal(food(expression.accentFor(base,'hungry')),food(expression.accentFor('assets/characters/cat/06.png','hungry')));
 assert.equal(expression.accentFor(base,'normal'),'');
 assert.equal(expression.assetFor(base,'unknown'),base);
});

for(let i=1;i<=8;i++)test(`beetle/${i} keeps the shared yellow fish hunger mark`,()=>{
 const base=`assets/characters/beetle/${String(i).padStart(2,'0')}.png`;
 const food=svg=>svg.match(/<path class="accent-food"[^>]*>/)?.[0];
 assert.ok(food(expression.accentFor(base,'hungry')));
 assert.equal(food(expression.accentFor(base,'hungry')),food(expression.accentFor('assets/characters/cat/06.png','hungry')));
 assert.equal(expression.accentFor(base,'normal'),'');
 assert.equal(expression.assetFor(base,'unknown'),base);
});

for(let i=1;i<=8;i++)test(`stagbeetle/${i} keeps the shared yellow fish hunger mark`,()=>{
 const base=`assets/characters/stagbeetle/${String(i).padStart(2,'0')}.png`;
 const food=svg=>svg.match(/<path class="accent-food"[^>]*>/)?.[0];
 assert.ok(food(expression.accentFor(base,'hungry')));
 assert.equal(food(expression.accentFor(base,'hungry')),food(expression.accentFor('assets/characters/cat/06.png','hungry')));
 assert.equal(expression.accentFor(base,'normal'),'');
 assert.equal(expression.assetFor(base,'unknown'),base);
});

for(let i=1;i<=8;i++)test(`cicada/${i} keeps the shared yellow fish hunger mark`,()=>{
 const base=`assets/characters/cicada/${String(i).padStart(2,'0')}.png`;
 const food=svg=>svg.match(/<path class="accent-food"[^>]*>/)?.[0];
 assert.ok(food(expression.accentFor(base,'hungry')));
 assert.equal(food(expression.accentFor(base,'hungry')),food(expression.accentFor('assets/characters/cat/06.png','hungry')));
 assert.equal(expression.accentFor(base,'normal'),'');
 assert.equal(expression.assetFor(base,'unknown'),base);
});
