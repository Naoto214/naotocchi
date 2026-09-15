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
  'assets/characters/expressions/cat/06-happy.png': '98c1b745b65ce17aaace98cc210de623f238563f4bbcab59bd0afebfb60074f8',
  'assets/characters/expressions/cat/06-strained.png': '66c8e780bd8365b45676d60c6d4be762a025976694b58963be649b293509c7aa',
  'assets/characters/expressions/cat/06-sulky.png': '72ff579e670c081fe888c26dfee5181fb16d04aab3508ef9c2ad0f2b4a07e0ba',
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
  for (let i=3;i<decoded.length;i+=4) alpha.add(decoded[i]);
  return {data,alpha:[...alpha].sort((a,b)=>a-b)};
}

test('the original adult cat stays byte-identical to the approved master', () => {
  const relativePath='assets/characters/cat/06.png';
  const {data}=inspectPng(relativePath);
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),EXPECTED[relativePath]);
});

test('all three expression assets are distinct approved transparent RGBA PNGs', () => {
  const variants=Object.keys(EXPECTED).filter(file=>file.includes('/expressions/'));
  const hashes=[];
  for (const relativePath of variants) {
    const {data,alpha}=inspectPng(relativePath);
    const hash=crypto.createHash('sha256').update(data).digest('hex');
    assert.equal(hash,EXPECTED[relativePath],`${relativePath} matches its approved normalized output`);
    assert.deepEqual(alpha,[0,255],`${relativePath} has transparent and opaque pixels only`);
    hashes.push(hash);
  }
  assert.equal(new Set(hashes).size,3,'the three expressions are different files');
  assert.ok(hashes.every(hash=>hash!==EXPECTED['assets/characters/cat/06.png']),
    'no expression is a copy of the original portrait');
});

test('every runtime-allowlisted adult-cat expression path exists', () => {
  const base='assets/characters/cat/06.png';
  const expected={
    happy:'assets/characters/expressions/cat/06-happy.png',
    strained:'assets/characters/expressions/cat/06-strained.png',
    sulky:'assets/characters/expressions/cat/06-sulky.png',
  };
  for (const [face,relativePath] of Object.entries(expected)) {
    assert.equal(expression.assetFor(base,face),relativePath);
    assert.equal(fs.existsSync(path.join(ROOT,relativePath)),true,`${relativePath} exists`);
  }
});
