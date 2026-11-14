import test from 'node:test';import assert from 'node:assert/strict';
import {classificationLabel,auxiliaryName} from './labels.mjs';
import {CATALOG} from '../full-catalog.mjs';
test('All main cards lose only their own circled stage, without mutating catalog',()=>{
 const before=JSON.stringify(CATALOG);let count=0;
 for(const c of Object.values(CATALOG)){if(c.type==='main'){count++;assert.equal(classificationLabel(c),c.attribute);assert.equal(classificationLabel(c,'reference'),'メイン · '+c.attribute);assert(!/[①-⑧]$/.test(auxiliaryName(c)));assert.equal(auxiliaryName(c)+String.fromCodePoint(0x245f+c.stage),c.name);}else{assert.equal(classificationLabel(c),classificationLabel(c,'reference'));assert.equal(auxiliaryName(c),'');}}
 assert(count>0);assert.equal(JSON.stringify(CATALOG),before);
});
test('An unrelated name suffix is not removed',()=>assert.equal(auxiliaryName({type:'main',name:'名前2',stage:2}),'名前2'));
