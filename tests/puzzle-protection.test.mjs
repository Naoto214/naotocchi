import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
test('formal chapter1, archived chapter2 V2 and atlas V2 originals remain unchanged',()=>{
 const manifest=JSON.parse(readFileSync(new URL('docs/naopoyo-100-v1/protected-hashes.json',root)));
 for(const [path,hash]of Object.entries(manifest.sha256))assert.equal(createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex'),hash,path);
});
