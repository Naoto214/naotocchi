import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as animation from '../animation.mjs';
test('compression animation preserves every tile origin and destination',()=>{
 assert.equal(typeof animation.slideMoves,'function');
 const moves=animation.slideMoves([0,1,0,2,0,0,0,0,0],3,'left');
 assert.deepEqual(moves,[{from:1,to:0,value:1},{from:3,to:3,value:2}]);
});
test('board and preview explicitly constrain rows and columns',()=>{
 const css=fs.readFileSync(new URL('../player.css',import.meta.url),'utf8');
 assert.match(css,/grid-template-rows:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/);
 const series=fs.readFileSync(new URL('../../naopoyo/series.css',import.meta.url),'utf8');
 assert.match(series,/grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/);
});
