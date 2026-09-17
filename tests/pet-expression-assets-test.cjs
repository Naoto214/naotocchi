const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const {test} = require('node:test');

const expression = require('../pet-expression.js');
const ROOT = path.join(__dirname, '..');
const PNG_SIGNATURE = Buffer.from([137,80,78,71,13,10,26,10]);
const EXPECTED = Object.freeze({
  'assets/characters/cat/06.png': '8f6beedbfd82135cfc17c24d3aa5ea1869c9344f65b0a21e3950995c5768c6da',
  'assets/characters/expressions/cat/06-happy-v3.png': '475379397e9ab0e89281ce7276e018bf765ca23506223e8ea0058ebf708f3d54',
  'assets/characters/expressions/cat/06-strained.png': '66c8e780bd8365b45676d60c6d4be762a025976694b58963be649b293509c7aa',
  'assets/characters/expressions/cat/06-sulky.png': '72ff579e670c081fe888c26dfee5181fb16d04aab3508ef9c2ad0f2b4a07e0ba',
  'assets/characters/expressions/cat/06-hungry.png': '85eb48deb349bf9c374ad75900694a1f35afb9e3c6d88748320a60c5f1e8105f',
  'assets/characters/expressions/cat/06-sick.png': 'aab6c564c6aa2f235d2209d3c6edba234815cc9494b45f11f03fb9a2a0abd3ff',
  'assets/characters/expressions/cat/06-tired.png': '7748f94642c1c1ddacd5189f3e522e5f095199a77d6dabb6c6ba45a6bec4a36d',
  'assets/characters/expressions/cat/06-weak.png': 'b1f1d0f9bf0ccbb3a54b0982f2999f5750039c7384255afc1fecd5111cc76388',
  'assets/characters/expressions/cat/06-critical.png': '10a4d9a61fd8b898f7a41ab9d7f36681c85656d688cc85584cc0d907f36b0c3d',
  'assets/characters/expressions/cat/06-wantsPlay.png': 'fb36a5a16d7b6ae74857c6f9b7353b416a11566d788b9919a73f1d652800fa21',
  'assets/characters/expressions/cat/06-sleeping-v3.png': '9111630bfa7bed35b9e1f943ecfac450964eba00c4974b725390759f47977303',
});

function inspectPng(relativePath) {
  const data = fs.readFileSync(path.join(ROOT, relativePath));
  assert.deepEqual(data.subarray(0,8), PNG_SIGNATURE, `${relativePath} has the PNG signature`);
  let offset = 8;
  let ihdr;
  const idat = [];
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString('ascii',offset + 4,offset + 8);
    const payload = data.subarray(offset + 8,offset + 8 + length);
    if (type === 'IHDR') ihdr = payload;
    if (type === 'IDAT') idat.push(payload);
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  assert.ok(ihdr, `${relativePath} has IHDR`);
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  assert.deepEqual({width,height,bitDepth,colorType,interlace},
    {width:128,height:128,bitDepth:8,colorType:6,interlace:0},
    `${relativePath} is a non-interlaced 128x128 RGBA PNG`);

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  assert.equal(raw.length,height * (stride + 1),`${relativePath} has complete pixel data`);
  const decoded = Buffer.alloc(height * stride);
  const paeth = (a,b,c) => {
    const p = a + b - c;
    const pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y=0;y<height;y+=1) {
    const filter = raw[y*(stride+1)];
    assert.ok(filter >= 0 && filter <= 4,`${relativePath} uses a known PNG filter`);
    for (let x=0;x<stride;x+=1) {
      const source = raw[y*(stride+1)+1+x];
      const left = x >= bytesPerPixel ? decoded[y*stride+x-bytesPerPixel] : 0;
      const up = y > 0 ? decoded[(y-1)*stride+x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel ? decoded[(y-1)*stride+x-bytesPerPixel] : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
          : filter === 2 ? up
            : filter === 3 ? Math.floor((left+up)/2)
              : paeth(left,up,upperLeft);
      decoded[y*stride+x]=(source+predictor)&255;
    }
  }
  const alpha = new Set();
  let left=width,top=height,right=0,bottom=0;
  for (let i=3;i<decoded.length;i+=4) alpha.add(decoded[i]);
  for (let y=0;y<height;y+=1) for (let x=0;x<width;x+=1) {
    if (decoded[y*stride+x*4+3] === 0) continue;
    left=Math.min(left,x); top=Math.min(top,y); right=Math.max(right,x+1); bottom=Math.max(bottom,y+1);
  }
  return {data,alpha:[...alpha].sort((a,b)=>a-b),bounds:[left,top,right,bottom]};
}

test('the original adult cat stays byte-identical to the approved master', () => {
  const relativePath='assets/characters/cat/06.png';
  const {data}=inspectPng(relativePath);
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),EXPECTED[relativePath]);
});

test('all ten expression assets are distinct approved transparent RGBA PNGs on the original bounds', () => {
  const variants=Object.keys(EXPECTED).filter(file=>file.includes('/expressions/'));
  const hashes=[];
  for (const relativePath of variants) {
    const {data,alpha,bounds}=inspectPng(relativePath);
    const hash=crypto.createHash('sha256').update(data).digest('hex');
    assert.equal(hash,EXPECTED[relativePath],`${relativePath} matches its approved normalized output`);
    assert.deepEqual(alpha,[0,255],`${relativePath} has transparent and opaque pixels only`);
    assert.deepEqual(bounds,[16,8,112,120],`${relativePath} keeps the adult-cat master bounds`);
    hashes.push(hash);
  }
  assert.equal(new Set(hashes).size,10,'the ten expressions are different files');
  assert.ok(hashes.every(hash=>hash!==EXPECTED['assets/characters/cat/06.png']),
    'no expression is a copy of the original portrait');
});

test('every runtime-allowlisted adult-cat expression path exists', () => {
  const base='assets/characters/cat/06.png';
  const expected={
    happy:'assets/characters/expressions/cat/06-happy-v3.png',
    strained:'assets/characters/expressions/cat/06-strained.png',
    sulky:'assets/characters/expressions/cat/06-sulky.png',
    hungry:'assets/characters/expressions/cat/06-hungry.png',
    sick:'assets/characters/expressions/cat/06-sick.png',
    tired:'assets/characters/expressions/cat/06-tired.png',
    weak:'assets/characters/expressions/cat/06-weak.png',
    critical:'assets/characters/expressions/cat/06-critical.png',
    wantsPlay:'assets/characters/expressions/cat/06-wantsPlay.png',
    sleeping:'assets/characters/expressions/cat/06-sleeping-v3.png',
  };
  for (const [face,relativePath] of Object.entries(expected)) {
    assert.equal(expression.assetFor(base,face),relativePath);
    assert.equal(fs.existsSync(path.join(ROOT,relativePath)),true,`${relativePath} exists`);
  }
});

test('kitten expression assets retain the original small stage bounds and transparent canvas', () => {
  const original=inspectPng('assets/characters/cat/03.png');
  assert.deepEqual(original.bounds,[21,28,107,120]);
  const hashes=[];
  for(const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=expression.assetFor('assets/characters/cat/03.png',name);
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('otemba expression assets retain the original small stage bounds and transparent canvas', () => {
  const original=inspectPng('assets/characters/cat/04.png');
  assert.deepEqual(original.bounds,[8,38,120,120]);
  const hashes=[];
  for(const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=expression.assetFor('assets/characters/cat/04.png',name);
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('young expression assets retain the original small stage bounds and transparent canvas', () => {
  const original=inspectPng('assets/characters/cat/05.png');
  assert.deepEqual(original.bounds,[17,15,111,120]);
  const hashes=[];
  for(const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=expression.assetFor('assets/characters/cat/05.png',name);
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('calm expression assets retain the original small stage bounds and transparent canvas', () => {
  const original=inspectPng('assets/characters/cat/07.png');
  assert.deepEqual(original.bounds,[18,14,109,120]);
  const hashes=[];
  for(const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=expression.assetFor('assets/characters/cat/07.png',name);
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('elder expression assets retain the original small stage bounds and transparent canvas', () => {
  const original=inspectPng('assets/characters/cat/08.png');
  assert.deepEqual(original.bounds,[14,22,114,120]);
  const hashes=[];
  for(const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=expression.assetFor('assets/characters/cat/08.png',name);
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('toddler expression assets retain the original small stage bounds and transparent canvas', () => {
  const original=inspectPng('assets/characters/cat/02.png');
  assert.deepEqual(original.bounds,[29,40,99,120]);
  const hashes=[];
  for(const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=expression.assetFor('assets/characters/cat/02.png',name);
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('baby expression assets retain the original small stage bounds and transparent canvas', () => {
  const original=inspectPng('assets/characters/cat/01.png');
  assert.deepEqual(original.bounds,[32,73,96,120]);
  const hashes=[];
  for(const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=expression.assetFor('assets/characters/cat/01.png',name);
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});


test('adult dog expressions are distinct transparent assets with original sprite bounds', () => {
  const original=inspectPng('assets/characters/dog/06.png');
  const hashes=[];
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=`assets/characters/expressions/dog/06-${name}.png`;
    assert.ok(fs.existsSync(path.join(ROOT,file)),name+' asset exists');
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('puppy expressions are distinct transparent assets with original sprite bounds', () => {
  const original=inspectPng('assets/characters/dog/03.png');
  const hashes=[];
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=`assets/characters/expressions/dog/03-${name}.png`;
    assert.ok(fs.existsSync(path.join(ROOT,file)),name+' asset exists');
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('wanpaku expressions are distinct transparent assets with original sprite bounds', () => {
  const original=inspectPng('assets/characters/dog/04.png');
  const hashes=[];
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=`assets/characters/expressions/dog/04-${name}.png`;
    assert.ok(fs.existsSync(path.join(ROOT,file)),name+' asset exists');
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('young dog expressions are distinct transparent assets with original sprite bounds', () => {
  const original=inspectPng('assets/characters/dog/05.png');
  const hashes=[];
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=`assets/characters/expressions/dog/05-${name}.png`;
    assert.ok(fs.existsSync(path.join(ROOT,file)),name+' asset exists');
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('calm dog expressions are distinct transparent assets with original sprite bounds', () => {
  const original=inspectPng('assets/characters/dog/07.png');
  const hashes=[];
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=`assets/characters/expressions/dog/07-${name}.png`;
    assert.ok(fs.existsSync(path.join(ROOT,file)),name+' asset exists');
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('baby dog expressions are distinct transparent assets with original sprite bounds', () => {
  const original=inspectPng('assets/characters/dog/01.png');
  const hashes=[];
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=`assets/characters/expressions/dog/01-${name}.png`;
    assert.ok(fs.existsSync(path.join(ROOT,file)),name+' asset exists');
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('toddler dog expressions are distinct transparent assets with original sprite bounds', () => {
  const original=inspectPng('assets/characters/dog/02.png');
  const hashes=[];
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=`assets/characters/expressions/dog/02-${name}.png`;
    assert.ok(fs.existsSync(path.join(ROOT,file)),name+' asset exists');
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

test('elder dog expressions are distinct transparent assets with original sprite bounds', () => {
  const original=inspectPng('assets/characters/dog/08.png');
  const hashes=[];
  for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
    const file=`assets/characters/expressions/dog/08-${name}.png`;
    assert.ok(fs.existsSync(path.join(ROOT,file)),name+' asset exists');
    const {data,bounds,alpha}=inspectPng(file);
    assert.deepEqual(bounds,original.bounds,name);
    assert.deepEqual(alpha,[0,255],name);
    hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size,10);
  assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
});

for (const species of ['man','woman','penguin','turtle','frog','clownfish','salmon','hermit_crab','jellyfish','starfish']) for(let index=1;index<=8;index++) {
  const stage=String(index).padStart(2,'0');
  test(`${species}/${stage} has ten distinct transparent expressions with original bounds`, () => {
    const original=inspectPng(`assets/characters/${species}/${stage}.png`),hashes=[];
    for (const name of ['happy','strained','sulky','hungry','sick','tired','weak','critical','wantsPlay','sleeping']) {
      const file=`assets/characters/expressions/${species}/${stage}-${name}.png`;
      assert.equal(expression.assetFor(`assets/characters/${species}/${stage}.png`,name),file);
      assert.ok(fs.existsSync(path.join(ROOT,file)),name+' asset exists');
      const {data,bounds,alpha}=inspectPng(file);
      assert.deepEqual(bounds,original.bounds,name);
      assert.deepEqual(alpha,[0,255],name);
      hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
    }
    assert.equal(new Set(hashes).size,10);
    assert.ok(hashes.every(hash=>hash!==crypto.createHash('sha256').update(original.data).digest('hex')));
  });
}
