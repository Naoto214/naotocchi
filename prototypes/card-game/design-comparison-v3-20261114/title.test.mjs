import test from 'node:test';import assert from 'node:assert/strict';
import {titleInfo,escapeHTML} from './title.mjs';
test('Original mode preserves canonical title, with one line in every context',()=>{
 const c={title:'どこにもつながらないかいだん'};
 const t=titleInfo(c,'original');assert.equal(t.text,c.title);assert.equal(t.lines,1);assert.ok(t.size>=4.8);assert.equal(t.exception,true);
});
test('Kanji and ruby are display-only and retain the canonical source',()=>{
 const c={title:'きおくのみずうみ'};assert.equal(titleInfo(c,'kanji').text,'記憶の湖');assert.match(titleInfo(c,'ruby').html,/<rt>きおく<\/rt>/);assert.equal(c.title,'きおくのみずうみ');
});
test('Unmapped names stay unchanged and unsafe characters are escaped',()=>{assert.equal(titleInfo({title:'IX'},'ruby').text,'IX');assert.equal(escapeHTML('<&'), '&lt;&amp;');});
